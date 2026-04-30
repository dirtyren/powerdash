"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import type { WidgetRef } from "@/server/schemas/widget";
import { useWidgetDataOrSample } from "@/hooks/useWidgetDataOrSample";
import { TABLE_SAMPLE } from "@/widgets/adapters/table";

type Row = Record<string, string | number | null>;

export function DataTable({ widget }: { widget: WidgetRef }) {
  const { data, isLoading } = useWidgetDataOrSample(widget.id, TABLE_SAMPLE);

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    if (data.kind !== "table") return [];
    return data.columns.map((c) => ({
      accessorKey: c.key,
      header: c.label,
      cell: (info) => {
        const v = info.getValue() as string | number | null;
        return <>{v == null ? "" : String(v)}</>;
      },
    }));
  }, [data]);

  const rows: Row[] = data.kind === "table" ? data.rows : [];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <div className="text-muted-foreground">…</div>;
  if (data.kind !== "table") return null;

  return (
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
  );
}
