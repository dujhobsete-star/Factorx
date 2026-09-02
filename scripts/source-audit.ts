import { createProviders } from "../src/lib/proxy/providers";
import { dedupeCandidates } from "../src/lib/proxy/types";

async function main() {
  const results = [];
  for (const provider of createProviders()) {
    const started = Date.now();
    try {
      const candidates = await provider.fetchCandidates();
      results.push({ source: provider.name, status: "OPERATIONAL", parsed: candidates.length, unique: dedupeCandidates(candidates).length, brReported: candidates.filter((item) => item.countryReported === "BR" || item.countryCode === "BR").length, durationMs: Date.now() - started });
    } catch (error) {
      results.push({ source: provider.name, status: "UNAVAILABLE", parsed: 0, unique: 0, brReported: 0, durationMs: Date.now() - started, error: error instanceof Error ? error.message.slice(0, 160) : "UNKNOWN" });
    }
  }
  console.log(JSON.stringify(results));
}
main().catch(() => { console.error(JSON.stringify({ ok: false, error: "source_audit_failed" })); process.exitCode = 1; });
