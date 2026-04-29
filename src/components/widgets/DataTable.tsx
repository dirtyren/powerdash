"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useWidgetData } from "@/hooks/useWidgetData";

type Row = Record<string, string | number | null>;

export function DataTable({ widgetId, title }: { widgetId: string; title: string }) {
  const { data, isLoading, error } = useWidgetData(widgetId);

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    if (!data || data.kind !== "table") return [];
    return data.columns.map((c) => ({
      accessorKey: c.key,
      header: c.label,
      cell: (info) => {
        const v = info.getValue() as string | number | null;
        return <>{v == null ? "" : String(v)}</>;
      },
    }));
  }, [data]);

  const rows: Row[] = data && data.kind === "table" ? data.rows : [];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-muted-foreground">…</div>}
        {error && <div className="text-sm text-red-400">error</div>}
        {data && data.kind === "table" && (
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-border text-muted-foreground border-b text-left">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-2 py-2 font-medium">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-border/50 border-b">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
