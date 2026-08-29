import { runMaintenance } from "../src/lib/proxy/maintenance";
import { RealProxyChecker } from "../src/lib/proxy/checker";
import { ProxyScrapeSource } from "../src/lib/proxy/proxyscrape";
import { createFallbackSources } from "../src/lib/proxy/sources";
await runMaintenance(createFallbackSources(new ProxyScrapeSource()), new RealProxyChecker());
