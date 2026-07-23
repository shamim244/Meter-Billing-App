import fs from 'fs';
import path from 'path';
import { getDb, persistDb, MruRow, BillingCycleRow } from './db';

export interface MruMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCycleMeta {
  id: string;
  mruId: string;
  billingMonth: string;
  billingYear: string;
  createdAt: string;
  updatedAt: string;
}

export async function getAllMrus(): Promise<MruMeta[]> {
  const db = await getDb();
  const res = db.exec(`SELECT id, name, created_at, updated_at FROM mrus ORDER BY created_at DESC`);
  if (!res || res.length === 0) return [];

  return res[0].values.map((row: any[]) => ({
    id: row[0],
    name: row[1],
    createdAt: row[2],
    updatedAt: row[3],
  }));
}

export async function getBillingCycles(mruId: string): Promise<BillingCycleMeta[]> {
  const db = await getDb();
  const res = db.exec(`SELECT id, mru_id, billing_month, billing_year, created_at, updated_at FROM billing_cycles WHERE mru_id = ? ORDER BY created_at DESC`, [mruId]);
  if (!res || res.length === 0) return [];

  return res[0].values.map((row: any[]) => ({
    id: row[0],
    mruId: row[1],
    billingMonth: row[2],
    billingYear: row[3],
    createdAt: row[4],
    updatedAt: row[5],
  }));
}

export async function getActiveMruId(): Promise<string> {
  const db = await getDb();
  const res = db.exec(`SELECT value FROM active_state WHERE key = 'active_mru'`);
  if (res && res[0] && res[0].values[0]) {
    return res[0].values[0][0] as string;
  }
  const all = await getAllMrus();
  return all[0]?.id || '0477';
}

export async function getActiveCycleId(): Promise<string> {
  const db = await getDb();
  const res = db.exec(`SELECT value FROM active_state WHERE key = 'active_cycle'`);
  if (res && res[0] && res[0].values[0]) {
    return res[0].values[0][0] as string;
  }
  const mruId = await getActiveMruId();
  const cycles = await getBillingCycles(mruId);
  return cycles[0]?.id || '';
}

export async function setActiveMruId(id: string) {
  const db = await getDb();
  db.run(`INSERT OR REPLACE INTO active_state (key, value) VALUES ('active_mru', ?)`, [id]);
  // Also switch to the latest cycle of this MRU
  const cycles = await getBillingCycles(id);
  if (cycles.length > 0) {
    db.run(`INSERT OR REPLACE INTO active_state (key, value) VALUES ('active_cycle', ?)`, [cycles[0].id]);
  } else {
    db.run(`DELETE FROM active_state WHERE key = 'active_cycle'`);
  }
  persistDb();
}

export async function setActiveCycleId(id: string) {
  const db = await getDb();
  db.run(`INSERT OR REPLACE INTO active_state (key, value) VALUES ('active_cycle', ?)`, [id]);
  persistDb();
}

export function getCycleBillsDir(cycleId: string): string {
  const pDir = path.join(process.cwd(), 'data', 'cycles', cycleId, 'bills');
  if (!fs.existsSync(pDir)) {
    fs.mkdirSync(pDir, { recursive: true });
  }
  return pDir;
}

export async function createMru(id: string, name: string): Promise<MruMeta> {
  const db = await getDb();
  const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const now = new Date().toISOString();
  
  db.run(
    `INSERT OR IGNORE INTO mrus (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
    [cleanId, name.trim(), now, now]
  );
  
  await setActiveMruId(cleanId);
  persistDb();
  
  return {
    id: cleanId,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export async function createBillingCycle(mruId: string, billingMonth: string, billingYear: string): Promise<BillingCycleMeta> {
  const db = await getDb();
  const cleanMonth = billingMonth.trim().toLowerCase().slice(0, 3);
  const cycleId = `${mruId}_${billingYear.trim()}_${cleanMonth}`;

  const existingRes = db.exec(`SELECT id FROM billing_cycles WHERE id = ?`, [cycleId]);
  if (existingRes && existingRes.length > 0 && existingRes[0].values.length > 0) {
    await setActiveCycleId(cycleId);
    const all = await getBillingCycles(mruId);
    return all.find((c) => c.id === cycleId)!;
  }

  const now = new Date().toISOString();
  db.run(
    `INSERT INTO billing_cycles (id, mru_id, billing_month, billing_year, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cycleId, mruId, billingMonth.trim(), billingYear.trim(), now, now]
  );

  await setActiveCycleId(cycleId);
  getCycleBillsDir(cycleId);
  persistDb();

  return {
    id: cycleId,
    mruId,
    billingMonth: billingMonth.trim(),
    billingYear: billingYear.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteMru(mruId: string) {
  const db = await getDb();
  db.run(`DELETE FROM mrus WHERE id = ?`, [mruId]);
  db.run(`DELETE FROM mru_consumers WHERE mru_id = ?`, [mruId]);
  
  const cycles = await getBillingCycles(mruId);
  for (const cycle of cycles) {
    await deleteBillingCycle(cycle.id);
  }

  const activeId = await getActiveMruId();
  if (activeId === mruId) {
    const all = await getAllMrus();
    if (all.length > 0) {
      await setActiveMruId(all[0].id);
    } else {
      db.run(`DELETE FROM active_state WHERE key = 'active_mru'`);
    }
  }

  persistDb();
}

export async function deleteBillingCycle(cycleId: string) {
  const db = await getDb();
  db.run(`DELETE FROM billing_cycles WHERE id = ?`, [cycleId]);
  db.run(`DELETE FROM cycle_bills WHERE cycle_id = ?`, [cycleId]);
  db.run(`DELETE FROM cycle_logs WHERE cycle_id = ?`, [cycleId]);

  const pDir = path.join(process.cwd(), 'data', 'cycles', cycleId);
  if (fs.existsSync(pDir)) {
    fs.rmSync(pDir, { recursive: true, force: true });
  }

  const activeId = await getActiveCycleId();
  if (activeId === cycleId) {
    const mruId = await getActiveMruId();
    const cycles = await getBillingCycles(mruId);
    if (cycles.length > 0) {
      await setActiveCycleId(cycles[0].id);
    } else {
      db.run(`DELETE FROM active_state WHERE key = 'active_cycle'`);
    }
  }

  persistDb();
}
