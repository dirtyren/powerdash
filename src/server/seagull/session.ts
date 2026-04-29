import { cookies } from "next/headers";

const SEAGULL_COOKIE_NAMES = ["SEAGULLSESSID", "PHPSESSID"] as const;

export async function forwardedCookieHeader(): Promise<string | undefined> {
  const jar = await cookies();
  const pairs: string[] = [];
  for (const name of SEAGULL_COOKIE_NAMES) {
    const c = jar.get(name);
    if (c) pairs.push(`${c.name}=${c.value}`);
  }
  return pairs.length > 0 ? pairs.join("; ") : undefined;
}
