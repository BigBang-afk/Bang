// Deletes the local database. It is recreated (with demo data unless
// SEED_DEMO_DATA=false) the next time the app starts.
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "leads.db");
for (const suffix of ["", "-wal", "-shm"]) {
  const file = dbPath + suffix;
  if (fs.existsSync(file)) fs.rmSync(file);
}
console.log(`Database reset: ${dbPath}\nRestart the app (npm run dev) to recreate it.`);
