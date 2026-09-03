import { describe, expect, it } from "vitest";
import { buildNamedProfile, dolphinEntries, proxyAddress } from "../proxy/export";
const http={ip:"8.8.8.8",port:8080,protocol:"HTTP"};
describe("compatible Factor X names",()=>{
  it("exports Dolphin names separately from documented address formats",()=>{
    const entries=dolphinEntries([http,{...http,protocol:"SOCKS4"},{...http,protocol:"SOCKS5"},http]);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({name:"Factor X | HTTP | 8.8.8.8:8080",address:"http://8.8.8.8:8080"});
    expect(entries[1].address).toBe("socks4://8.8.8.8:8080");
    expect(entries[2].address).toBe("socks5://8.8.8.8:8080");
    for(const entry of entries){expect(entry.address).not.toMatch(/Factor|@/);expect(new URL(entry.address).password).toBe("");}
  });
  it("does not reinterpret HTTPS or allow malformed Dolphin entries",()=>{
    expect(dolphinEntries([{...http,protocol:"HTTPS"},{...http,ip:"1.2.3.999"},{...http,ip:"host\nname"},{...http,port:0},{...http,port:65536}])).toEqual([]);
    expect(dolphinEntries([])).toEqual([]);
  });
  it("preserves plain copy without fake credentials or labels",()=>{
    expect(proxyAddress(http)).toBe("http://8.8.8.8:8080");
    expect(proxyAddress(http,false)).toBe("8.8.8.8:8080");
  });
  it("exports documented HTTP and SOCKS5 fields with unique names",()=>{
    const result=buildNamedProfile([http,{...http,protocol:"SOCKS5"},http]);
    const profile=JSON.parse(result.text);
    expect(result.count).toBe(2);
    expect(profile.proxies[0]).toEqual({name:"Factor X | HTTP | 8.8.8.8:8080",type:"http",server:"8.8.8.8",port:8080});
    expect(profile.proxies[1].type).toBe("socks5");
    expect(profile["proxy-groups"][0].proxies).toEqual(profile.proxies.map((p:{name:string})=>p.name));
    expect(profile["allow-lan"]).toBe(false);
    expect(result.text).not.toMatch(/username|password|skip-cert-verify/);
  });
  it("does not reinterpret unsupported protocols",()=>{
    const result=buildNamedProfile([{...http,protocol:"HTTPS"},{...http,protocol:"SOCKS4"}]);
    expect(result).toEqual({text:"",count:0,omitted:2});
  });
  it("rejects invalid host, injection and port",()=>{
    expect(buildNamedProfile([{...http,ip:'bad\nname: injected'},{...http,ip:"999.0.0.1"},{...http,port:0},{...http,port:65536}]).count).toBe(0);
  });
  it("returns no unusable empty profile",()=>expect(buildNamedProfile([]).text).toBe(""));
});
