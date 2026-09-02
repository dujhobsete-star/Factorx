import { describe, expect, it, vi } from "vitest";
import { validateOnDemand } from "../proxy/on-demand";
import { isPublicIPv4 } from "../proxy/public-ip";
import type { ProxyCandidate } from "../proxy/types";
const candidates: ProxyCandidate[] = Array.from({length:80},(_,i)=>({ip:`8.8.4.${i+1}`,port:8000,protocol:"HTTP",source:"test"}));
describe("on demand",()=>{
  it("stops at the requested count without extra checks",async()=>{
    const checker={check:vi.fn(async()=>({success:true,latencyMs:20}))};
    const result=await validateOnDemand([...candidates,candidates[0]],{limit:10},checker,new AbortController().signal);
    expect(result.count).toBe(10);expect(checker.check).toHaveBeenCalledTimes(10);expect(result.partial).toBe(false);
  });
  it("never returns failed proxies and reports shortage",async()=>{
    const result=await validateOnDemand(candidates.slice(0,3),{limit:10},{check:async()=>({success:false})},new AbortController().signal);
    expect(result.count).toBe(0);expect(result.partial).toBe(true);expect(result.tested).toBe(3);
  });
  it("caps at 50 and deduplicates",async()=>{
    const result=await validateOnDemand([...candidates,...candidates],{limit:100},{check:async()=>({success:true})},new AbortController().signal);
    expect(result.count).toBe(50);expect(new Set(result.proxies.map(p=>p.id)).size).toBe(50);
  });
  it("reported BR is not enough",async()=>{
    const result=await validateOnDemand([{...candidates[0],countryReported:"BR"}],{limit:1,country:"BR"},{check:async()=>({success:true,countryVerified:"US"})},new AbortController().signal);
    expect(result.count).toBe(0);
  });
  it("requires verified BR and requested latency",async()=>{
    const result=await validateOnDemand(candidates.slice(0,2),{limit:2,country:"BR",quality:"EXCELLENT"},{check:async()=>({success:true,countryVerified:"BR",latencyMs:200})},new AbortController().signal);
    expect(result.count).toBe(2);expect(result.proxies.every(p=>p.brVerified)).toBe(true);
  });
  it("does not start checks after cancellation",async()=>{
    const c=new AbortController();c.abort();const check=vi.fn();
    const result=await validateOnDemand(candidates,{limit:1},{check},c.signal);
    expect(check).not.toHaveBeenCalled();expect(result.timedOut).toBe(true);
  });
  it("never exceeds the candidate test budget",async()=>{
    const many=Array.from({length:700},(_,i)=>({...candidates[0],port:10000+i}));
    const result=await validateOnDemand(many,{limit:23},{check:async()=>({success:false})},new AbortController().signal);
    expect(result.tested).toBe(600);
  });
  it("filters protocol and tolerates checker exceptions",async()=>{
    const check=vi.fn(async()=>{throw new Error("offline")});
    const result=await validateOnDemand(candidates,{limit:1,protocol:"SOCKS5"},{check},new AbortController().signal);
    expect(result.tested).toBe(0);expect(check).not.toHaveBeenCalled();
    const failed=await validateOnDemand(candidates.slice(0,1),{limit:1},{check},new AbortController().signal);
    expect(failed.count).toBe(0);
  });
  it.each(["127.0.0.1","10.1.2.3","169.254.169.254","172.16.0.1","192.168.1.1","100.64.0.1","0.0.0.0","224.0.0.1","::1","example.com","198.18.0.1"])("rejects unsafe destination %s",ip=>expect(isPublicIPv4(ip)).toBe(false));
});
