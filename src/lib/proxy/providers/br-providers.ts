import { EndpointProvider } from "./base";

export class ProxyScrapeBrProvider extends EndpointProvider { name="proxyscrape-br"; protected endpoints=[{url:"https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies/countries/BR/data.json",format:"json" as const,countryReported:"BR"}]; }
export class RelayglassBrProvider extends EndpointProvider { name="relayglass-br"; protected endpoints=[{url:"https://raw.githubusercontent.com/relayglass/free-proxy-list/main/countries/BR/BR.json",format:"json" as const,countryReported:"BR"}]; }
export class ProxiflyBrProvider extends EndpointProvider { name="proxifly-br"; protected endpoints=[{url:"https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/countries/BR/data.json",format:"json" as const,countryReported:"BR"}]; }
export class IPLocateBrProvider extends EndpointProvider { name="iplocate-br"; protected endpoints=[{url:"https://raw.githubusercontent.com/iplocate/free-proxy-list/main/countries/BR/proxies.txt",format:"text" as const,countryReported:"BR"}]; }
export class FineProxyBrProvider extends EndpointProvider { name="fineproxy-br"; protected endpoints=[{url:"https://fineproxy.org/wp-json/fineproxy/v1/free-proxies/br",format:"json" as const,countryReported:"BR"}]; }
export class DatabayBrProvider extends EndpointProvider { name="databay-br"; protected endpoints=[
  {url:"https://cdn.jsdelivr.net/gh/databay-labs/free-proxy-list@master/by-country/br/http.txt",format:"text" as const,protocol:"HTTP" as const,countryReported:"BR"},
  {url:"https://cdn.jsdelivr.net/gh/databay-labs/free-proxy-list@master/by-country/br/socks4.txt",format:"text" as const,protocol:"SOCKS4" as const,countryReported:"BR"},
  {url:"https://cdn.jsdelivr.net/gh/databay-labs/free-proxy-list@master/by-country/br/socks5.txt",format:"text" as const,protocol:"SOCKS5" as const,countryReported:"BR"},
]; }
