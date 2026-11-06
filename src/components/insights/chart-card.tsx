"use client";

import { ChartColumn, Table } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  chart: ReactNode;
  table: ReactNode;
  className?: string;
  legend?: ReactNode;
};

export function ChartCard({ title, subtitle, chart, table, legend, className }: ChartCardProps) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card className={cn("grid min-w-0 gap-3", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-h3">{title}</h2>
          {subtitle && <p className="text-caption font-normal text-fg-muted">{subtitle}</p>}
        </div>
        <div
          className="flex shrink-0 rounded-sm border border-border p-0.5"
          role="group"
          aria-label={`${title} view`}
        >
          {(["chart", "table"] as const).map((v) => {
            const Icon = v === "chart" ? ChartColumn : Table;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                aria-label={v === "chart" ? "Chart view" : "Table view"}
                onClick={() => {
                  setView(v);
                }}
                className={cn(
                  "flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-fg-muted",
                  view === v && "bg-surface-2 text-fg",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </header>
      {legend && view === "chart" && (
        <div className="flex flex-wrap gap-4 text-caption">{legend}</div>
      )}
      {view === "chart" ? chart : <div className="max-h-80 overflow-auto">{table}</div>}
    </Card>
  );
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-fg-muted">
      <span className="size-2.5 rounded-[3px]" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-body-sm">
      <thead className="sticky top-0 bg-surface text-left text-caption text-fg-muted">
        <tr>
          {head.map((h, i) => (
            <th key={h} scope="col" className={cn("py-2 font-medium", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={cn("py-2", j > 0 && "text-right tabular")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
