import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { buildNamedProfile } from "../src/lib/proxy/export";
async function main() {
  const binary=process.argv[2];
  if(!binary)throw new Error("Provide the official Mihomo binary path");
  const response=await fetch("https://factorx-lime.vercel.app/api/proxies?limit=5",{signal:AbortSignal.timeout(65000)});
  if(!response.ok)throw new Error("Public generation failed");
  const data=await response.json();
  const exported=buildNamedProfile(data.proxies);
  if(!exported.count)throw new Error("No compatible proxies returned");
  const directory=mkdtempSync(join(tmpdir(),"factorx-profile-"));
  const file=join(directory,"factor-x-mihomo.yaml");
  writeFileSync(file,exported.text);
  // Test configuration only: never start the daemon or change system proxy settings.
  execFileSync(binary,["-t","-d",directory,"-f",file],{stdio:"pipe",timeout:30000});
  console.log(JSON.stringify({mihomoConfigValid:true,exported:exported.count,omitted:exported.omitted,realGenerationCount:data.count}));
}
main().catch(()=>{console.error("Named profile validation failed");process.exitCode=1;});
