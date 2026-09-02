import { CronJob } from "cron";
import { config } from "../src/lib/config";
import { db } from "../src/lib/db";
import { RealProxyChecker } from "../src/lib/proxy/checker";
import { runMaintenance } from "../src/lib/proxy/maintenance";
import { createProductionSource } from "../src/lib/proxy/providers";

const source = createProductionSource(); const checker = new RealProxyChecker(); let stopping = false;
async function execute() { if (!stopping) return runMaintenance(source, checker); }
async function executeScheduled() { try { await execute(); } catch (error) { console.error(JSON.stringify({ scope:"worker",event:"maintenance_failed",error:error instanceof Error ? error.message.split("\n").filter(Boolean).at(-1)?.slice(0,300):"unknown" })); } }

async function recoverStaleJobs(){await db.maintenanceJob.updateMany({ where:{status:"RUNNING",startedAt:{lt:new Date(Date.now()-2*60*60_000)}},data:{status:"FAILED",finishedAt:new Date(),error:"worker_recovered_stale_job"} })}
const cron = new CronJob(config.PROXY_MAINTENANCE_CRON,executeScheduled,null,true,config.APP_TIMEZONE);
const queueTimer = setInterval(async()=>{
  const job=await db.maintenanceJob.findFirst({where:{status:"PENDING"},orderBy:{createdAt:"asc"}});if(!job)return;
  await db.maintenanceJob.update({where:{id:job.id},data:{status:"RUNNING",startedAt:new Date()}});
  try{await execute();await db.maintenanceJob.update({where:{id:job.id},data:{status:"COMPLETED",finishedAt:new Date()}})}catch(error){await db.maintenanceJob.update({where:{id:job.id},data:{status:"FAILED",finishedAt:new Date(),error:error instanceof Error?error.message.split("\n").filter(Boolean).at(-1)?.slice(0,300):"unknown"}})}
},15_000);
async function shutdown(){if(stopping)return;stopping=true;cron.stop();clearInterval(queueTimer);await db.$disconnect();process.exit(0)}
process.once("SIGTERM",()=>{void shutdown()});process.once("SIGINT",()=>{void shutdown()});
console.log(JSON.stringify({scope:"worker",event:"ready",timezone:config.APP_TIMEZONE,cron:config.PROXY_MAINTENANCE_CRON}));
recoverStaleJobs().catch(()=>console.error(JSON.stringify({scope:"worker",event:"recovery_failed"})));
