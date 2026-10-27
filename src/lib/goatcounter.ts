import { cacheLife } from "next/cache";

/**
 * GoatCounter site code (MYCODE in MYCODE.goatcounter.com). Unset = no tracking and no counter.
 *
 * To turn the header visitor counter on:
 * 1. Create a site at https://www.goatcounter.com and pick its code.
 * 2. In that site's settings, enable "Allow adding visitor counts on your website"
 *    (off by default; without it /counter/TOTAL.json refuses the request and the counter stays hidden).
 * 3. Set GOATCOUNTER_CODE=<code> in Vercel (Project → Settings → Environment Variables) and redeploy.
 *    For local testing put it in .env.local; count.js skips localhost by default.
 */
const raw = process.env.GOATCOUNTER_CODE?.trim();
export const goatcounterCode =
  raw && /^[a-z0-9-]+$/i.test(raw) ? raw : undefined;

/** GoatCounter returns counts as formatted strings ("1,234"). */
export function parseCount(s: string | undefined) {
  const digits = s?.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}

/** Site-wide visitor total. GoatCounter itself caches it for up to 4h, so refreshing hourly is plenty. */
export async function getVisitors() {
  "use cache";
  cacheLife("hours");
  if (!goatcounterCode) return undefined;
  return fetch(
    `https://${goatcounterCode}.goatcounter.com/counter/TOTAL.json`,
    {
      signal: AbortSignal.timeout(5000),
    },
  )
    .then((r) => (r.ok ? r.json() : {}))
    .then((j: { count?: string }) => parseCount(j.count))
    .catch(() => undefined);
}
