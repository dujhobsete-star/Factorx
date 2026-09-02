import { generateOnDemand } from "../src/lib/proxy/on-demand";
async function main() {
  const started=Date.now();
  const result=await generateOnDemand({limit:10},new AbortController().signal);
  console.log(JSON.stringify({count:result.count,requested:result.requested,tested:result.tested,partial:result.partial,seconds:(Date.now()-started)/1000,sources:result.sources}));
}
main().catch(()=>{console.error("On-demand check failed");process.exitCode=1;});
