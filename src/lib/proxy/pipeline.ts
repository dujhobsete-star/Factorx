import pLimit from "p-limit";
import type { CheckResult, ProxyCandidate, ProxyChecker } from "./types";

export async function checkCandidates(
  candidates: ProxyCandidate[],
  checker: ProxyChecker,
  concurrency: number,
  approvalTarget = Number.POSITIVE_INFINITY,
): Promise<Array<{ candidate: ProxyCandidate; result: CheckResult }>> {
  const limit = pLimit(concurrency);
  const results: Array<{ candidate: ProxyCandidate; result: CheckResult }> = [];
  let approved = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < candidates.length && approved < approvalTarget) {
      const candidate = candidates[cursor++];
      const result = await checker.check(candidate);
      results.push({ candidate, result });
      if (result.success) approved++;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, () => limit(worker)));
  return results;
}
