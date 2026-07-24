import { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

export interface MruRow {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCycleRow {
  id: string;
  mruId: string;
  billingMonth: string;
  billingYear: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumerBillRow {
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

const DB_PATH = path.join('/tmp', 'data', 'nbpdcl.sqlite');

let dbInstance: Database | null = null;
let sqlEngine: any = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!sqlEngine) {
    try {
      // Use eval("require") to bypass Webpack module wrapping which breaks Emscripten's 'exports' variable
      const initSqlJs = require('sql.js');
      const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
      if (fs.existsSync(wasmPath)) {
        const wasmBuffer = fs.readFileSync(wasmPath);
        const wasmBinary = wasmBuffer.buffer.slice(
          wasmBuffer.byteOffset,
          wasmBuffer.byteOffset + wasmBuffer.byteLength
        );
        sqlEngine = await initSqlJs({ wasmBinary });
      } else {
        sqlEngine = await initSqlJs();
      }
    } catch (err) {
      console.error('Failed to initialize sql.js WASM engine:', err);
      throw err;
    }
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const filebuffer = fs.readFileSync(DB_PATH);
      dbInstance = new sqlEngine.Database(filebuffer);
    } catch {
      dbInstance = new sqlEngine.Database();
    }
  } else {
    dbInstance = new sqlEngine.Database();
  }

  initTables(dbInstance!);
  return dbInstance!;
}

export function persistDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database', err);
  }
}

function initTables(db: Database) {
  // New Architecture
  db.run(`
    CREATE TABLE IF NOT EXISTS mrus (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mru_consumers (
      mru_id TEXT NOT NULL,
      consumer_no TEXT NOT NULL,
      consumer_name TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (mru_id, consumer_no)
    );

    CREATE TABLE IF NOT EXISTS billing_cycles (
      id TEXT PRIMARY KEY,
      mru_id TEXT NOT NULL,
      billing_month TEXT NOT NULL,
      billing_year TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cycle_bills (
      cycle_id TEXT NOT NULL,
      consumer_no TEXT NOT NULL,
      file TEXT,
      consumer_name TEXT,
      total_amount TEXT,
      meter_no TEXT,
      current_reading TEXT,
      previous_reading TEXT,
      units_consumed TEXT,
      status TEXT DEFAULT 'pending',
      updated_at TEXT NOT NULL,
      PRIMARY KEY (cycle_id, consumer_no)
    );

    CREATE TABLE IF NOT EXISTS cycle_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      message TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS active_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default MRU and Cycle if empty
  const res = db.exec(`SELECT COUNT(*) as cnt FROM mrus`);
  const count = res[0]?.values[0]?.[0] || 0;

  if (Number(count) === 0) {
    const defaultMru = {
      id: '0477',
      name: 'Gerua',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    db.run(
      `INSERT INTO mrus (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [defaultMru.id, defaultMru.name, defaultMru.createdAt, defaultMru.updatedAt]
    );

    const defaultCycle = {
      id: '0477_2026_apr',
      mru_id: '0477',
      billingMonth: 'April',
      billingYear: '2026',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.run(
      `INSERT INTO billing_cycles (id, mru_id, billing_month, billing_year, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        defaultCycle.id,
        defaultCycle.mru_id,
        defaultCycle.billingMonth,
        defaultCycle.billingYear,
        defaultCycle.createdAt,
        defaultCycle.updatedAt,
      ]
    );

    db.run(`INSERT OR REPLACE INTO active_state (key, value) VALUES ('active_mru', ?)`, [defaultMru.id]);
    db.run(`INSERT OR REPLACE INTO active_state (key, value) VALUES ('active_cycle', ?)`, [defaultCycle.id]);

    persistDb();
  }
}
