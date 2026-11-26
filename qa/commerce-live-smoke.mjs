// Production endpoint smoke test. Does not create orders, payments or sessions.
import { requireLiveUrl } from "./live-targets.mjs";
const base = requireLiveUrl("ROMANO_FUNCTIONS_BASE_URL");
const services = ["romano-admin", "romano-order", "romano-payment"];
for (const slug of services) {
  const response = await fetch(`${base}/${slug}/health`, { signal:AbortSignal.timeout(20000) });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.data?.status !== "ok") {
    throw new Error(`${slug} live health failed: ${response.status}`);
  }
  console.log(`${slug}: healthy (${response.status})`);
}
const unauthorized = await fetch(`${base}/romano-admin/admin/branches`, {
  headers: { Origin:"https://untrusted.example" },
  signal:AbortSignal.timeout(20000)
});
if (unauthorized.status !== 401 && unauthorized.status !== 403) {
  throw new Error(`Unauthenticated branch access was not blocked: ${unauthorized.status}`);
}
console.log("Unauthenticated admin route: denied");
