# Dolphin Anty export

The generator now prioritizes Dolphin Anty. Each result has a separate address
and a Factor X display name. No authentication, cookies, ownership claim or
tracking is added to a public proxy.

- Address: `http://8.8.8.8:8080` (example only).
- Name: `Factor X | HTTP | 8.8.8.8:8080`.
- TXT download contains only addresses, one per line. It is not a named-profile
  import file and does not install proxies in Dolphin automatically.
- HTTP, SOCKS4 and SOCKS5 use the documented input syntax. HTTPS is omitted,
  not silently converted; select a supported protocol in the generator.
- Add the address using Dolphin's Proxy screen and test the connection there.
  Edit the saved proxy to set its display name separately. Bulk profile editing
  may require a paid Dolphin plan; this flow does not require bulk editing.
- Mihomo remains available in an optional, collapsed section.

Official references:
- https://docs.dolphin-anty.com/en/working-with-proxies/how-to-add-a-proxy-in-dolphin-anty
- https://docs.dolphin-anty.com/en/working-with-proxies/editing-and-sharing-proxies-in-dolphin-anty

Validation: export unit tests cover protocol handling, labels separate from
credentials, deduplication and invalid inputs. `npx tsx scripts/check-dolphin-export.ts`
checks real production generation, freshness and exported address syntax without
printing addresses or credentials. This is not a test inside the Dolphin desktop
application. That requires an installed, authenticated client; no result is claimed
for that environment.

Operational limitations remain: free public proxies can fail after testing or
work differently from a user's network; quotas and source availability limit yield.
Rate limiting is per server instance, not distributed protection. Vercel Hobby
must not be represented as licensed for commercial agency use. No paid worker
or hosting subscription is created by these changes.
