import { randomInt } from "node:crypto";
import { db } from "../src/lib/db";

async function main() {
  const port = randomInt(20_000, 60_000);
  let id: string | undefined;

  try {
    const created = await db.proxy.create({
      data: {
        ip: "192.0.2.1",
        port,
        protocol: "HTTP",
        source: "factorx_crud_check",
        status: "PENDING",
      },
    });
    id = created.id;

    const found = await db.proxy.findUniqueOrThrow({ where: { id } });
    if (found.status !== "PENDING") throw new Error("read_validation_failed");

    const updated = await db.proxy.update({
      where: { id },
      data: {
        status: "ACTIVE",
        successfulChecks: { increment: 1 },
        lastCheckedAt: new Date(),
        lastSuccessfulCheckAt: new Date(),
      },
    });
    if (updated.status !== "ACTIVE") throw new Error("update_validation_failed");

    await db.proxy.delete({ where: { id } });
    id = undefined;
    console.log(JSON.stringify({ ok: true, create: true, read: true, update: true, delete: true }));
  } finally {
    if (id) await db.proxy.deleteMany({ where: { id } });
  }
}

main()
  .catch((error) => {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "UNKNOWN";
    console.error(JSON.stringify({ ok: false, code, error: "crud_check_failed" }));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
