import { DatabayBrProvider, FineProxyBrProvider, IPLocateBrProvider, ProxiflyBrProvider, ProxyScrapeBrProvider, RelayglassBrProvider } from "./br-providers";
import { GProxyProvider, HProxyProvider, JetKaiProvider, MonosansProvider, ProxmintProvider, PrxChkProvider, StormsiaProvider } from "./global-providers";
import { ProgressiveSourceAggregator } from "./aggregator";

export function createProviders() {
  return [
    new RelayglassBrProvider(), new DatabayBrProvider(), new ProxyScrapeBrProvider(), new ProxiflyBrProvider(), new IPLocateBrProvider(), new FineProxyBrProvider(),
    new StormsiaProvider(), new MonosansProvider(), new ProxmintProvider(), new GProxyProvider(), new HProxyProvider(), new JetKaiProvider(), new PrxChkProvider(),
  ];
}
export function createProductionSource() {
  return new ProgressiveSourceAggregator(createProviders());
}
