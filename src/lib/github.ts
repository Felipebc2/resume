import { cacheLife } from "next/cache";
import { profile } from "@/content/profile";
import type { Stat } from "@/content/stats";

const user = profile.links.github.split("/").pop();
const get = (url: string) => fetch(url, { signal: AbortSignal.timeout(5000) });

export function parseContributions(html: string) {
  const n = html.match(/([\d,]+)\s+contributions?\s+in the last year/)?.[1];
  return n ? Number(n.replace(/,/g, "")) : undefined;
}

const publicRepos = (path: string) =>
  get(`https://api.github.com/${path}`)
    .then((r) => r.json() as Promise<{ public_repos?: number }>)
    .then((u) => u.public_repos ?? NaN);

/** Live GitHub numbers, refreshed once a day. A failed fetch leaves the key out, so the static value in stats.ts shows. */
export async function getGithubStats(): Promise<
  Partial<Record<Stat["key"], number>>
> {
  "use cache";
  cacheLife("days");
  const [contributions, repos] = await Promise.all([
    get(`https://github.com/users/${user}/contributions`)
      .then((r) => r.text())
      .then(parseContributions)
      .catch(() => undefined),
    Promise.all(
      [`users/${user}`, ...profile.repoOrgs.map((o) => `orgs/${o}`)].map(
        publicRepos,
      ),
    )
      .then((ns) => ns.reduce((a, b) => a + b))
      .then((n) => (Number.isNaN(n) ? undefined : n))
      .catch(() => undefined),
  ]);
  return { contributions, repos };
}
