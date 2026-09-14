import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";

// SQLite (file-based, embedded) is used for this local/demo deployment: zero
// external services to stand up, single-digit-ms reads for a ~300-row table,
// and trivial to seed from the bundled CSV. It is not the production choice
// on serverless hosts (see README "Data Storage" section for the Postgres
// migration path) since serverless function instances don't share a
// filesystem — but the repository/query layer below is written so swapping
// the driver later doesn't touch calling code.
const DB_PATH = path.join(process.cwd(), "data", "app.db");
const CSV_PATH = path.join(process.cwd(), "data", "leads.csv");

let db: Database.Database | null = null;

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    // Minimal CSV parser sufficient for our quoted-field dataset.
    const values: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else cur += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { values.push(cur); cur = ""; }
        else cur += c;
      }
    }
    values.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row;
  });
}

function seed(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY,
      company_name TEXT NOT NULL,
      industry TEXT NOT NULL,
      sub_industry TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      website TEXT,
      phone TEXT,
      contact_email TEXT,
      employee_count INTEGER NOT NULL,
      estimated_revenue INTEGER NOT NULL,
      founded_year INTEGER NOT NULL,
      linkedin_url TEXT,
      growth_signals TEXT,
      source TEXT,
      description TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
    CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);

    CREATE TABLE IF NOT EXISTS saved_leads (
      lead_id INTEGER PRIMARY KEY REFERENCES leads(id),
      saved_at TEXT NOT NULL,
      notes TEXT
    );
  `);

  const { count } = database.prepare("SELECT COUNT(*) as count FROM leads").get() as { count: number };
  if (count > 0) return;

  const rows = parseCsv(readFileSync(CSV_PATH, "utf-8"));
  const insert = database.prepare(`
    INSERT INTO leads (id, company_name, industry, sub_industry, city, state, website, phone,
      contact_email, employee_count, estimated_revenue, founded_year, linkedin_url,
      growth_signals, source, description)
    VALUES (@id, @company_name, @industry, @sub_industry, @city, @state, @website, @phone,
      @contact_email, @employee_count, @estimated_revenue, @founded_year, @linkedin_url,
      @growth_signals, @source, @description)
  `);
  const insertMany = database.transaction((items: Record<string, string>[]) => {
    for (const r of items) {
      insert.run({
        ...r,
        employee_count: Number(r.employee_count),
        estimated_revenue: Number(r.estimated_revenue),
        founded_year: Number(r.founded_year),
      });
    }
  });
  insertMany(rows);
}

export function getDb(): Database.Database {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  seed(db); // idempotent: only inserts rows if the table is empty
  return db;
}
