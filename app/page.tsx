"use client";

import Link from "next/link";
import type { Route } from "next";
import { AppShell } from "@/components/AppShell";
import { useDashboards } from "@/hooks/useDashboards";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { data, isLoading, error } = useDashboards();

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboards</h1>
        <Link href={"/dashboards/new" as Route}>
          <Button>New Dashboard</Button>
        </Link>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-red-400">Failed to load dashboards: {error.message}</p>}
      {data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((d) => (
            <Link key={d.id} href={`/dashboards/${d.id}` as Route} className="block">
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle>{d.owner}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{d.name}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
