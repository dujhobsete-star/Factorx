import { db } from "../src/lib/db";
import { runMaintenance } from "../src/lib/proxy/maintenance";
import { RealProxyChecker } from "../src/lib/proxy/checker";
import { createProductionSource } from "../src/lib/proxy/providers";

async function main() {
  const result = await runMaintenance(createProductionSource(), new RealProxyChecker());
  if (result.skipped) console.log(JSON.stringify({ scope: "maintenance", event: "skipped", reason: result.reason }));
}

main()
  .catch((error) => {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "UNKNOWN";
    const message = error instanceof Error ? error.message.split("\n").map((line) => line.trim()).filter(Boolean).at(-1)?.slice(0, 300) : "unknown";
    console.error(JSON.stringify({ scope: "maintenance", event: "fatal", code, error: message }));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
