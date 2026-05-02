"use client";

import { useMemo } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { WidgetRef } from "@/server/schemas/widget";
import { useQueryInstant } from "@/hooks/useQueryInstant";
import { parseValue } from "@/widgets/promql/instant-helpers";

type Row = Record<string, string>;

export function PromTable({ widget }: { widget: WidgetRef }) {
  const expr = widget.query?.expr ?? "";
  const { data, isLoading, error } = useQueryInstant(expr);

  const { columns, rows } = useMemo<{ columns: ColumnDef<Row>[]; rows: Row[] }>(
    () => {
      const results = data?.data.result ?? [];
      if (results.length === 0) return { columns: [], rows: [] };

      const labelKeys = new Set<string>();
      for (const r of results) {
        for (const k of Object.keys(r.metric)) {
          if (k !== "__name__") labelKeys.add(k);
        }
      }
      const sortedLabels = [...labelKeys].sort();

      const columns: ColumnDef<Row>[] = [
        ...sortedLabels.map<ColumnDef<Row>>((key) => ({
          accessorKey: key,
          header: key,
          cell: (info) => {
            const v = info.getValue() as string | undefined;
            return <>{v ?? ""}</>;
          },
        })),
        {
          accessorKey: "__value",
          header: "Value",
          cell: (info) => {
            const v = info.getValue() as string;
            const parsed = parseValue(v);
            return <>{parsed === null ? "—" : parsed.toFixed(3)}</>;
          },
        },
      ];

      const rows: Row[] = results.map((r) => {
        const row: Row = {};
        for (const k of sortedLabels) row[k] = r.metric[k] ?? "";
        row.__value = r.value[1];
        return row;
      });

      return { columns, rows };
    },
    [data],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!expr) {
    return (
      <div className="text-muted-foreground text-sm">
        No query — select this widget and add a PromQL expression.
      </div>
    );
  }
  if (isLoading) return <div className="text-muted-foreground">loading…</div>;
  if (error) {
    return (
      <div className="text-red-400 text-sm">Query failed: {error.message}</div>
    );
  }
  if (rows.length === 0) {
    return <div className="text-muted-foreground text-sm">No samples.</div>;
  }

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
