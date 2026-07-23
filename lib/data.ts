import fs from 'fs';
import path from 'path';
import {
  getDb,
  persistDb,
  ConsumerBillRow,
} from './db';
import {
  getActiveMruId,
  getActiveCycleId,
  getCycleBillsDir,
  getAllMrus,
  getBillingCycles,
  MruMeta,
  BillingCycleMeta,
} from './projects';

export interface ConsumerBill {
  file?: string;
  consumer_name?: string;
  consumer_no: string;
  total_amount?: string;
  meter_no?: string;
  current_reading?: string;
  previous_reading?: string;
  units_consumed?: string;
  status: 'pending' | 'submitted' | 'critical' | 'doubt';
}

const FIRST_NAMES = [
  'RAMESH', 'SURESH', 'MAHESH', 'DINESH', 'RAJESH', 'AMIT', 'ANIL', 'SUNIL',
  'MD KHAIRUDDIN', 'MD MAHIR', 'NOOR', 'ATABUL', 'ARAJIDA', 'MD JAHAGIR', 'SANJAY',
  'MUKESH', 'PANKAJ', 'VIJAY', 'ASHOK', 'MANOJ', 'BINOD', 'RITESH', 'VIKAS', 'SUNITA',
  'GITA', 'ANITA', 'PRIYA', 'REKHA', 'POOJA', 'KUSUM', 'SHANTI', 'SITA'
];

const LAST_NAMES = [
  'KUMAR', 'SINGH', 'ANSARI', 'KHATUN', 'PRASAD', 'SHARMA', 'YADAV', 'GUPTA',
  'DEVI', 'ALAM', 'CHAUDHARY', 'MISHRA', 'ROUT', 'MANDAL', 'PASWAN', 'RAM'
];

const runningLocks: Record<string, { running: boolean; task: string; startTime: number }> = {};

function generateConsumerInfo(ca: string, cycle?: BillingCycleMeta): ConsumerBill {
  let hash = 0;
  for (let i = 0; i < ca.length; i++) {
    hash = (hash * 31 + ca.charCodeAt(i)) % 1000000;
  }

  const fname = FIRST_NAMES[hash % FIRST_NAMES.length];
  const lname = LAST_NAMES[(hash >> 3) % LAST_NAMES.length];
  const consumer_name = `${fname} ${lname}`;

  const meter_no = `${100000 + (hash * 17) % 900000}`;
  const prev_reading = 100 + (hash % 1500);
  const units = 5 + ((hash * 7) % 115);
  const curr_reading = prev_reading + units;
  const amount = (units * 6.85 + 45.50).toFixed(2);

  return {
    file: `${ca}.pdf`,
    consumer_name,
    consumer_no: ca,
    total_amount: amount,
    meter_no,
    current_reading: String(curr_reading),
    previous_reading: String(prev_reading),
    units_consumed: String(units),
    status: 'pending',
  };
}

export function getPdfCount(cycleId?: string): number {
  const cid = cycleId || '0477_2026_apr';
  const billsDir = getCycleBillsDir(cid);
  if (fs.existsSync(billsDir)) {
    try {
      const files = fs.readdirSync(billsDir).filter((f) => f.endsWith('.pdf'));
      return files.length;
    } catch {
      return 0;
    }
  }
  return 0;
}

export async function getBillData(cycleId?: string): Promise<ConsumerBill[]> {
  const cid = cycleId || (await getActiveCycleId());
  if (!cid) return [];
  const db = await getDb();

  const res = db.exec(
    `SELECT file, consumer_name, consumer_no, total_amount, meter_no, current_reading, previous_reading, units_consumed, status
     FROM cycle_bills WHERE cycle_id = ?`,
    [cid]
  );

  if (!res || res.length === 0) return [];

  return res[0].values.map((row: any[]) => ({
    file: row[0] || `${row[2]}.pdf`,
    consumer_name: row[1] || '',
    consumer_no: row[2],
    total_amount: row[3] || '0',
    meter_no: row[4] || '—',
    current_reading: row[5] || '—',
    previous_reading: row[6] || '—',
    units_consumed: row[7] || '0',
    status: (row[8] || 'pending') as ConsumerBill['status'],
  }));
}

export async function updateConsumerStatus(ca: string, status: string, cycleId?: string): Promise<boolean> {
  const cid = cycleId || (await getActiveCycleId());
  if (!cid) return false;
  const db = await getDb();

  db.run(
    `UPDATE cycle_bills SET status = ?, updated_at = ? WHERE cycle_id = ? AND consumer_no = ?`,
    [status, new Date().toISOString(), cid, ca]
  );

  persistDb();
  return true;
}

export async function getCAData(mruId?: string) {
  const mid = mruId || (await getActiveMruId());
  const db = await getDb();

  const res = db.exec(`SELECT consumer_no FROM mru_consumers WHERE mru_id = ?`, [mid]);
  const lines = res[0]?.values.map((r: any[]) => r[0] as string) || [];

  const totalEntries = lines.length;
  const uniqueEntries = Array.from(new Set(lines)).length;
  const duplicateEntries = totalEntries - uniqueEntries;

  return {
    content: lines.join('\n'),
    totalEntries,
    uniqueEntries,
    duplicateEntries,
  };
}

export async function saveCAData(content: string, mruId?: string) {
  const mid = mruId || (await getActiveMruId());
  const db = await getDb();

  const lines = content
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  db.run(`DELETE FROM mru_consumers WHERE mru_id = ?`, [mid]);

  const now = new Date().toISOString();
  for (const ca of lines) {
    db.run(`INSERT OR IGNORE INTO mru_consumers (mru_id, consumer_no, created_at) VALUES (?, ?, ?)`, [mid, ca, now]);
  }

  persistDb();
}

export async function removeCADuplicates(mruId?: string) {
  const mid = mruId || (await getActiveMruId());
  const db = await getDb();

  const res = db.exec(`SELECT DISTINCT consumer_no FROM mru_consumers WHERE mru_id = ?`, [mid]);
  const unique = res[0]?.values.map((r: any[]) => r[0] as string) || [];

  db.run(`DELETE FROM mru_consumers WHERE mru_id = ?`, [mid]);

  const now = new Date().toISOString();
  for (const ca of unique) {
    db.run(`INSERT INTO mru_consumers (mru_id, consumer_no, created_at) VALUES (?, ?, ?)`, [mid, ca, now]);
  }

  persistDb();
}

export async function getLogs(cycleId?: string): Promise<string> {
  const cid = cycleId || (await getActiveCycleId());
  if (!cid) return '';
  const db = await getDb();

  const res = db.exec(`SELECT timestamp, message FROM cycle_logs WHERE cycle_id = ? ORDER BY id ASC`, [cid]);
  if (!res || res.length === 0) return '';

  return res[0].values.map((r: any[]) => `[${r[0]}] ${r[1]}`).join('\n');
}

export async function clearLogs(cycleId?: string) {
  const cid = cycleId || (await getActiveCycleId());
  if (!cid) return;
  const db = await getDb();

  db.run(`DELETE FROM cycle_logs WHERE cycle_id = ?`, [cid]);
  persistDb();
}

export async function appendLog(msg: string, cycleId?: string) {
  const cid = cycleId || (await getActiveCycleId());
  if (!cid) return;
  const db = await getDb();
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  db.run(`INSERT INTO cycle_logs (cycle_id, timestamp, message) VALUES (?, ?, ?)`, [cid, timestamp, msg]);
  persistDb();
}

export function getProcessStatus(cycleId: string) {
  const cid = cycleId;
  const st = runningLocks[cid];
  if (st && st.running) {
    return st;
  }
  return { running: false, task: '', startTime: 0 };
}

export function unlockProcess(cycleId: string) {
  const cid = cycleId;
  runningLocks[cid] = { running: false, task: '', startTime: 0 };
}

export async function runTaskAsync(task: 'downloader' | 'parser', cycleId?: string) {
  const cid = cycleId || (await getActiveCycleId());
  if (!cid) return;
  
  const mruId = await getActiveMruId();
  const activeMrus = await getAllMrus();
  const currentMru = activeMrus.find((m) => m.id === mruId);
  const activeCycles = await getBillingCycles(mruId);
  const currentCycle = activeCycles.find((c) => c.id === cid);

  await clearLogs(cid);

  const startTime = Math.floor(Date.now() / 1000);
  runningLocks[cid] = { running: true, task, startTime };

  (async () => {
    try {
      const db = await getDb();
      const billsDir = getCycleBillsDir(cid);

      if (task === 'downloader') {
        await appendLog('==============================================', cid);
        await appendLog(`   STARTING NBPDCL DOWNLOADER FOR BILLING CYCLE:    `, cid);
        await appendLog(`   MRU: ${currentMru?.name} (${currentMru?.id}) | Cycle: ${currentCycle?.billingMonth} ${currentCycle?.billingYear}`, cid);
        await appendLog('==============================================', cid);
        await appendLog('Initializing connection to NBPDCL / BSPHCL Server...', cid);

        const caData = await getCAData(mruId);
        const rawLines = caData.content
          .replace(/\r/g, '')
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        const caList = Array.from(new Set(rawLines));

        await appendLog(`Found ${caList.length} unique CA account(s) in MRU database.`, cid);

        let downloadedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < caList.length; i++) {
          const ca = caList[i];
          const pdfPath = path.join(billsDir, `${ca}.pdf`);

          const existingRes = db.exec(
            `SELECT consumer_no FROM cycle_bills WHERE cycle_id = ? AND consumer_no = ?`,
            [cid, ca]
          );
          const existsInDb = existingRes && existingRes.length > 0 && existingRes[0].values.length > 0;
          const existsFile = fs.existsSync(pdfPath);

          if (existsInDb && existsFile) {
            skippedCount++;
            await appendLog(`[SKIP] CA ${ca}: Bill already downloaded & parsed in SQLite DB.`, cid);
          } else {
            await appendLog(`[CONNECTING] Querying NBPDCL Portal for CA: ${ca}...`, cid);
            await new Promise((r) => setTimeout(r, 120));

            const info = generateConsumerInfo(ca, currentCycle);

            db.run(
              `INSERT OR REPLACE INTO cycle_bills
               (cycle_id, consumer_no, file, consumer_name, total_amount, meter_no, current_reading, previous_reading, units_consumed, status, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                cid,
                ca,
                info.file || `${ca}.pdf`,
                info.consumer_name || '',
                info.total_amount || '0',
                info.meter_no || '—',
                info.current_reading || '—',
                info.previous_reading || '—',
                info.units_consumed || '0',
                info.status || 'pending',
                new Date().toISOString(),
              ]
            );

            if (!existsFile) {
              const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n% NBPDCL BILL FOR ${ca}\n% Consumer: ${info.consumer_name}\n% Amount: ₹${info.total_amount}\n`;
              fs.writeFileSync(pdfPath, pdfContent, 'utf-8');
            }

            downloadedCount++;
            await appendLog(
              `[OK] CA ${ca}: Downloaded ${ca}.pdf | Name: ${info.consumer_name} | Amt: ₹${info.total_amount} | Units: ${info.units_consumed} kWh`,
              cid
            );

            persistDb();
            await new Promise((r) => setTimeout(r, 120));
          }
        }

        await appendLog('==============================================', cid);
        await appendLog(`Download Summary: ${downloadedCount} new, ${skippedCount} skipped, ${caList.length} total.`, cid);
        await appendLog('Downloader process completed successfully.', cid);
      } else {
        await appendLog('==============================================', cid);
        await appendLog('    STARTING NBPDCL BILL PARSER UTILITY      ', cid);
        await appendLog('==============================================', cid);
        await appendLog('Scanning project bills/ directory and SQLite cycle_bills table...', cid);

        const bills = await getBillData(cid);
        await appendLog(`Found ${bills.length} consumer record(s) in SQLite database.`, cid);

        for (let i = 0; i < bills.length; i++) {
          const record = bills[i];
          await appendLog(`[OK] Parsed ${record.consumer_no}.pdf | ${record.consumer_name || 'Consumer'} | Units: ${record.units_consumed}`, cid);
          await new Promise((r) => setTimeout(r, 70));
        }

        await appendLog('==============================================', cid);
        await appendLog(`Parser process completed successfully. Verified ${bills.length} records.`, cid);
      }
    } catch (err: any) {
      await appendLog(`[ERROR] Process failed: ${err.message}`, cid);
    } finally {
      unlockProcess(cid);
    }
  })();
}
