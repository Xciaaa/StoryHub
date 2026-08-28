const fs = require('fs');
const path = require('path');
const { query } = require('./db');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await query(statement);
        console.log(`[migration] applied: ${file}`);
      } catch (err) {
        console.error(`[migration] failed: ${file}`, err.message);
      }
    }
  }
}

module.exports = { runMigrations };
