import type { RefreshIntervalMs } from "@/contexts/RefreshIntervalContext";

export function resolveRefetchInterval(
  explicit: number | null | undefined,
  ctx: RefreshIntervalMs,
): number | false {
  const effective = explicit !== undefined ? explicit : ctx;
  return effective ?? false;
}
