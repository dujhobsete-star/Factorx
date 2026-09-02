import { afterEach, describe, expect, it, vi } from "vitest";
import { EndpointProvider, type ProviderEndpoint } from "../proxy/providers/base";
import { dedupeCandidates } from "../proxy/types";

class FixtureProvider extends EndpointProvider {
  name="fixture";
  constructor(protected endpoints: ProviderEndpoint[]){super()}
}
afterEach(()=>vi.unstubAllGlobals());

describe("providers",()=>{
  it("normaliza JSON parcialmente inválido e filtra BR",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({proxies:[{ip:"1.2.3.4",port:8080,protocol:"http",country:"br"},{ip:"bad",port:0,protocol:"http",country:"br"},{ip:"5.6.7.8",port:1080,protocol:"socks5",country:"us"}]}),{status:200,headers:{"content-type":"application/json"}})));
    const result=await new FixtureProvider([{url:"https://fixture.test/list",format:"json",countryFilter:"BR"}]).fetchCandidates();
    expect(result).toHaveLength(1);expect(result[0]).toMatchObject({ip:"1.2.3.4",countryReported:"BR"});
  });
  it("tolera uma URL quebrada quando outra funciona",async()=>{
    const fetch=vi.fn().mockResolvedValueOnce(new Response("",{status:500})).mockResolvedValueOnce(new Response("1.2.3.4:80\ninválida",{status:200}));vi.stubGlobal("fetch",fetch);
    const result=await new FixtureProvider([{url:"https://fixture.test/fail",format:"text",protocol:"HTTP"},{url:"https://fixture.test/ok",format:"text",protocol:"HTTP"}]).fetchCandidates();expect(result).toHaveLength(1);
  });
  it("preserva atribuição multi-source na deduplicação",()=>{
    const rows=[{ip:"1.2.3.4",port:80,protocol:"HTTP" as const,source:"one"},{ip:"1.2.3.4",port:80,protocol:"HTTP" as const,source:"two"}];
    expect(dedupeCandidates(rows)[0].sources).toEqual(["one","two"]);
  });
});
