import { afterEach, expect, it, vi } from "vitest";
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.resetModules();});
it("isolates failed sources, caches candidates for five minutes, then refreshes",async()=>{
  let now=1000000;vi.spyOn(Date,"now").mockImplementation(()=>now);
  const fetch=vi.fn(async(url:string)=>{
    if(url.includes("proxyscrape"))throw new Error("offline");
    if(url.includes("relayglass"))return new Response("http://8.8.8.8:8080\nhttp://127.0.0.1:80");
    return new Response(JSON.stringify([{ip:"8.8.8.8",port:8080,protocol:"HTTP"}]),{headers:{"content-type":"application/json"}});
  });
  vi.stubGlobal("fetch",fetch);
  const {loadCandidates}=await import("../proxy/on-demand");
  const first=await loadCandidates();
  expect(first.candidates).toHaveLength(1);expect(first.reports[0].count).toBe(0);
  await loadCandidates();expect(fetch).toHaveBeenCalledTimes(4);
  now+=300001;await loadCandidates();expect(fetch).toHaveBeenCalledTimes(8);
});
it("coalesces simultaneous refreshes and recovers after total source failure",async()=>{
  let now=1000000;vi.spyOn(Date,"now").mockImplementation(()=>now);
  const fetch=vi.fn().mockRejectedValue(new Error("offline"));vi.stubGlobal("fetch",fetch);
  const {loadCandidates}=await import("../proxy/on-demand");
  const results=await Promise.all([loadCandidates(),loadCandidates()]);
  expect(results[0].candidates).toHaveLength(0);expect(fetch).toHaveBeenCalledTimes(4);
  now+=15001;
  fetch.mockImplementation(async()=>new Response("http://8.8.8.8:8080"));
  expect((await loadCandidates()).candidates).toHaveLength(1);
});
