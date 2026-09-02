import { db } from "../src/lib/db";

async function main() {
  const [database, active, total, migrations] = await Promise.all([
    db.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`,
    db.proxy.count({ where: { status: "ACTIVE" } }),
    db.proxy.count(),
    db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`
  ]);
  console.log(JSON.stringify({ ok: true, database: database[0]?.database, activeProxies: active, totalProxies: total, appliedMigrations: Number(migrations[0]?.count ?? 0) }));
}

main().catch((error) => {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "UNKNOWN";
  const message = error instanceof Error
    ? error.message
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.includes("DATABASE_URL") && !line.includes("postgresql://") && !line.startsWith("Invalid `"))
        .at(-1)
    : undefined;
  console.error(JSON.stringify({ ok: false, code, error: message ?? "database_check_failed" }));
  process.exitCode = 1;
}).finally(() => db.$disconnect());
