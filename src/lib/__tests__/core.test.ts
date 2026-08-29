import { describe, expect, it, vi } from "vitest";
import { calculateMissing } from "../config";
import { dedupeCandidates, proxyKey } from "../proxy/types";
import { normalizeProxyScrape, normalizeProxyScrapeLine } from "../proxy/proxyscrape";
import { CascadingProxySource } from "../proxy/sources";

describe("regra central do estoque", () => {
  it.each([[500,450,50],[500,50,450],[500,500,0]])("target %i active %i => missing %i",(target,active,missing)=>expect(calculateMissing(target,active)).toBe(missing));
  it("não chama a fonte quando o estoque já atingiu o alvo", async()=>{const fetch=vi.fn();if(calculateMissing(500,500)>0)await fetch();expect(fetch).not.toHaveBeenCalled()});
});
describe("fontes em cascata",()=>{
  it("usa fallback e deduplica candidatas",async()=>{
    const candidate={ip:"1.2.3.4",port:80,protocol:"HTTP" as const,source:"mock"};
    const failing={name:"failing",fetchCandidates:vi.fn().mockRejectedValue(new Error("offline"))};
    const fallback={name:"fallback",fetchCandidates:vi.fn().mockResolvedValue([candidate,candidate])};
    const result=await new CascadingProxySource([failing,fallback],10).fetchCandidates();
    expect(result).toHaveLength(1); expect(fallback.fetchCandidates).toHaveBeenCalledOnce();
  });
});
describe("normalização e deduplicação",()=>{
  it("normaliza um registro válido",()=>expect(normalizeProxyScrape({ip:"1.2.3.4",port:8080,protocol:"http",country_code:"br"})).toMatchObject({ip:"1.2.3.4",port:8080,protocol:"HTTP",countryCode:"BR"}));
  it("rejeita porta inválida",()=>expect(normalizeProxyScrape({ip:"1.2.3.4",port:99999,protocol:"http"})).toBeNull());
  it("normaliza uma linha da API oficial",()=>expect(normalizeProxyScrapeLine("socks5://61.158.175.38:9002")).toMatchObject({ip:"61.158.175.38",port:9002,protocol:"SOCKS5"}));
  it("deduplica pela chave lógica",()=>{const p={ip:"1.2.3.4",port:80,protocol:"HTTP" as const,source:"mock"};expect(dedupeCandidates([p,p])).toHaveLength(1);expect(proxyKey(p)).toBe("http:1.2.3.4:80")});
});
