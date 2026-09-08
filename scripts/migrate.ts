/**
 * Aplica as migrations pendentes de `src/lib/db/migrations` no banco Turso configurado
 * em TURSO_DATABASE_URL/TURSO_AUTH_TOKEN.
 *
 * Migrations já aplicadas ficam registradas em `_migrations`, então rodar este script de
 * novo é seguro (idempotente) — só o que ainda não rodou é executado.
 *
 * Uso: npm run db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDbClient } from "../src/lib/db/client";

const MIGRATIONS_DIR = join(__dirname, "..", "src", "lib", "db", "migrations");

async function main() {
  const db = getDbClient();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = new Set(
    (await db.execute("SELECT name FROM _migrations")).rows.map((row) => String(row.name)),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const pending = files.filter((file) => !applied.has(file));

  if (pending.length === 0) {
    console.log("Nenhuma migration pendente.");
    return;
  }

  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`Aplicando ${file}...`);
    await db.executeMultiple(sql);
    await db.execute({ sql: "INSERT INTO _migrations (name) VALUES (?)", args: [file] });
  }

  console.log(`${pending.length} migration(s) aplicada(s).`);
}

main()
  .catch((error) => {
    console.error("Falha ao aplicar migrations:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
