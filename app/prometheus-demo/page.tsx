"use client";

import { useMemo } from "react";
import * as echarts from "echarts/core";
import { LineChart as EchartsLineSeries } from "echarts/charts";
import { AppShell } from "@/components/AppShell";
import { EchartsWidget } from "@/components/widgets/EchartsWidget";
import { WidgetFrame } from "@/components/widgets/WidgetFrame";
import { useQueryRange } from "@/hooks/useQueryRange";
import { buildLineOption } from "@/widgets/promql/line-option";

echarts.use([EchartsLineSeries]);

const DEMO_EXPR = "scrape_duration_seconds";

export default function PrometheusDemoPage() {
  const { data, isLoading, error } = useQueryRange(DEMO_EXPR);

  const option = useMemo(() => (data ? buildLineOption(data) : null), [data]);
  const empty = data !== undefined && data.data.result.length === 0;

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-semibold">Prometheus demo</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Query <code className="rounded bg-muted px-1">{DEMO_EXPR}</code> over the
        last 1h, refetched every 15s.
      </p>
      <div style={{ width: 800, height: 400 }}>
        <WidgetFrame title={DEMO_EXPR}>
          {isLoading && <div className="text-muted-foreground">loading…</div>}
          {error && <div className="text-red-400">Error: {error.message}</div>}
          {!isLoading && !error && empty && (
            <div className="text-muted-foreground">
              No samples yet — Prometheus may still be starting up. Refresh in a moment.
            </div>
          )}
          {option && !empty && <EchartsWidget option={option} />}
        </WidgetFrame>
      </div>
    </AppShell>
  );
}
