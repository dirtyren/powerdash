"use client";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggle = useUiStore((s) => s.toggleSidebar);
  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "border-border bg-card border-r transition-all",
          sidebarOpen ? "w-64" : "w-14",
        )}
      >
        <button
          onClick={toggle}
          className="border-border hover:bg-muted h-12 w-full border-b text-sm"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? "‹ Davinci" : "≡"}
        </button>
        <nav className="text-muted-foreground p-4 text-sm">{sidebarOpen ? "Dashboards" : null}</nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
