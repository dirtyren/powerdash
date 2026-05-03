"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDashboards } from "@/hooks/useDashboards";
import { useUiStore } from "@/stores/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const pathname = usePathname();
  const { data: dashboards } = useDashboards();

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "border-border bg-card border-r transition-all",
          sidebarOpen ? "w-64" : "w-14",
        )}
      >
        <div className="flex h-12 border-b border-border">
          <button
            onClick={toggle}
            className="h-12 w-12 hover:bg-muted text-sm"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            ≡
          </button>
          {sidebarOpen && (
            <Link
              href="/"
              className="flex-1 px-3 flex items-center hover:bg-muted text-sm font-medium"
            >
              PowerDash
            </Link>
          )}
        </div>
        {sidebarOpen && (
          <nav className="p-2" aria-label="Dashboards">
            <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              Dashboards
            </div>
            {!dashboards ? (
              <div className="px-2 py-1 text-xs text-muted-foreground">Loading…</div>
            ) : dashboards.length === 0 ? (
              <div className="px-2 py-1 text-xs text-muted-foreground">
                No dashboards yet
              </div>
            ) : (
              <ul>
                {dashboards.map((d) => {
                  const href = `/dashboards/${d.id}` as Route;
                  const active =
                    pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
                  return (
                    <li key={d.id}>
                      <Link
                        href={href}
                        className={cn(
                          "block rounded px-2 py-1 text-sm truncate",
                          active
                            ? "bg-muted font-medium"
                            : "hover:bg-muted/50 text-muted-foreground",
                        )}
                      >
                        {d.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
        )}
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
