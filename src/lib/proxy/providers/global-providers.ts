import { EndpointProvider } from "./base";

export class MonosansProvider extends EndpointProvider { name="monosans"; protected endpoints=[{url:"https://raw.githubusercontent.com/monosans/proxy-list/main/proxies.json",format:"json" as const,countryFilter:"BR"}]; }
export class ProxmintProvider extends EndpointProvider { name="proxmint"; protected endpoints=[{url:"https://raw.githubusercontent.com/proxmint/free-proxy-list/main/proxies/all.json",format:"json" as const,countryFilter:"BR"}]; }
export class GProxyProvider extends EndpointProvider { name="gproxy"; protected endpoints=[{url:"https://raw.githubusercontent.com/gproxynet/free-proxy-list/main/proxies.json",format:"json" as const,countryFilter:"BR"}]; }
export class HProxyProvider extends EndpointProvider { name="hproxy-br"; protected endpoints=[{url:"https://raw.githubusercontent.com/hproxy-com/free-proxy-list/main/by-country/BR.txt",format:"text" as const,protocol:"HTTP" as const,countryReported:"BR"}]; }
export class JetKaiProvider extends EndpointProvider { name="jetkai"; protected endpoints=[
  {url:"https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt",format:"text" as const,protocol:"HTTP" as const},
  {url:"https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-https.txt",format:"text" as const,protocol:"HTTPS" as const},
  {url:"https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-socks4.txt",format:"text" as const,protocol:"SOCKS4" as const},
  {url:"https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-socks5.txt",format:"text" as const,protocol:"SOCKS5" as const},
]; }
export class PrxChkProvider extends EndpointProvider { name="prxchk"; protected endpoints=[
  {url:"https://raw.githubusercontent.com/prxchk/proxy-list/main/http.txt",format:"text" as const,protocol:"HTTP" as const},
  {url:"https://raw.githubusercontent.com/prxchk/proxy-list/main/socks4.txt",format:"text" as const,protocol:"SOCKS4" as const},
  {url:"https://raw.githubusercontent.com/prxchk/proxy-list/main/socks5.txt",format:"text" as const,protocol:"SOCKS5" as const},
]; }
export class StormsiaProvider extends EndpointProvider { name="stormsia"; protected endpoints=[{url:"https://stormsia.github.io/proxy-list/proxies.json",format:"json" as const,countryFilter:"BR"}]; }
