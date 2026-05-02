"use client";

import type { WidgetRef } from "@/server/schemas/widget";
import { PieLike } from "@/components/widgets/promql/PromPie";

export function PromDonut({ widget }: { widget: WidgetRef }) {
  return <PieLike widget={widget} radius={["40%", "70%"]} />;
}
