"use client";

import { FileUp, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { formatPeso } from "@/lib/money";
import {
  type DateFormat,
  guessMapping,
  mapRows,
  parseCsv,
  type SignMode,
} from "@/modules/ledger/domain/csv-import";
import { importTransactionsAction } from "@/modules/ledger/presentation/actions";

const MAX_BYTES = 2 * 1024 * 1024;
const BATCH = 100;

type Result = { imported: number; duplicates: number; failed: { line: number; message: string }[] };

export function ImportWizard({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [date, setDate] = useState(0);
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState<number | null>(null);
  const [category, setCategory] = useState<number | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>("ymd");
  const [sign, setSign] = useState<SignMode>("negative_is_expense");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const header = rows[0] ?? [];
  const columns = header.map((h, i) => (hasHeader && h ? h : `Column ${i + 1}`));
  const mapped = useMemo(
    () => mapRows(rows, { date, amount, note, category, dateFormat, sign }, hasHeader),
    [rows, date, amount, note, category, dateFormat, sign, hasHeader],
  );

  const onFile = async (file: File) => {
    setError(null);
    setResult(null);
    if (file.size > MAX_BYTES) {
      setError("That file is too big. Keep it under 2 MB.");
      return;
    }
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) {
      setError("That file doesn't look like a CSV with transactions.");
      return;
    }
    const guess = guessMapping(parsed[0] ?? []);
    setRows(parsed);
    setFileName(file.name);
    setDate(guess.date ?? 0);
    setAmount(guess.amount ?? 1);
    setNote(guess.note ?? null);
    setCategory(guess.category ?? null);
    const sample = parsed[1]?.[guess.date ?? 0] ?? "";
    setDateFormat(/^\d{4}/.test(sample) ? "ymd" : "dmy");
  };

  const run = async () => {
    setError(null);
    const total: Result = { imported: 0, duplicates: 0, failed: [] };
    setProgress(0);
    for (let i = 0; i < mapped.parsed.length; i += BATCH) {
      const res = await importTransactionsAction({
        accountId,
        rows: mapped.parsed.slice(i, i + BATCH),
      });
      if (!res.ok) {
        setError(res.error.message);
        setProgress(null);
        return;
      }
      total.imported += res.data.imported;
      total.duplicates += res.data.duplicates;
      total.failed.push(...res.data.failed);
      setProgress(Math.min(mapped.parsed.length, i + BATCH));
    }
    setProgress(null);
    setResult(total);
    toast.success(`Imported ${total.imported} transactions 🐷`);
  };

  const colSelect = (
    id: string,
    label: string,
    value: number | null,
    onChange: (v: number | null) => void,
    optional = false,
  ) => (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={value ?? ""}
        onChange={(e) => {
          onChange(e.target.value === "" ? null : Number(e.target.value));
        }}
      >
        {optional && <option value="">— None —</option>}
        {columns.map((c, i) => (
          <option key={i} value={i}>
            {c}
          </option>
        ))}
      </NativeSelect>
    </div>
  );

  if (result) {
    return (
      <Card className="grid max-w-xl gap-4">
        <h2 className="text-h2">Import complete</h2>
        <ul className="grid gap-1 text-body-sm">
          <li>✅ {result.imported} imported</li>
          {result.duplicates > 0 && (
            <li>↩️ {result.duplicates} already imported before (skipped)</li>
          )}
          {result.failed.length > 0 && <li>⚠️ {result.failed.length} couldn&apos;t be imported</li>}
        </ul>
        {result.failed.length > 0 && (
          <ul className="max-h-40 overflow-auto text-caption text-expense">
            {result.failed.map((f) => (
              <li key={f.line}>
                Line {f.line}: {f.message}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/activity">See transactions</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setResult(null);
              setRows([]);
              setFileName("");
            }}
          >
            Import another
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid max-w-3xl grid-cols-1 gap-4">
      <Card className="grid gap-3">
        <label
          htmlFor="csv-file"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-8 text-center hover:border-fg-muted"
        >
          <FileUp className="size-8 text-fg-muted" aria-hidden />
          <span className="font-semibold">{fileName || "Choose a CSV file"}</span>
          <span className="text-caption text-fg-muted">
            Exports from banks, GCash, Maya or Google Sheets. Max 2 MB.
          </span>
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        {error && <FormAlert>{error}</FormAlert>}
      </Card>

      {rows.length > 0 && (
        <>
          <Card className="grid gap-4">
            <h2 className="text-h3">Match the columns</h2>
            <label className="flex items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => {
                  setHasHeader(e.target.checked);
                }}
                className="size-5 accent-(--accent)"
              />
              First row is a header
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {colSelect("map-date", "Date", date, (v) => {
                setDate(v ?? 0);
              })}
              {colSelect("map-amount", "Amount", amount, (v) => {
                setAmount(v ?? 0);
              })}
              {colSelect("map-note", "Description", note, setNote, true)}
              {colSelect("map-category", "Category (optional)", category, setCategory, true)}
              <div className="grid gap-1.5">
                <Label htmlFor="map-format">Date format</Label>
                <NativeSelect
                  id="map-format"
                  value={dateFormat}
                  onChange={(e) => {
                    setDateFormat(e.target.value as DateFormat);
                  }}
                >
                  <option value="ymd">2026-03-25</option>
                  <option value="dmy">25/03/2026 (day first)</option>
                  <option value="mdy">03/25/2026 (month first)</option>
                </NativeSelect>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="map-sign">Amounts</Label>
                <NativeSelect
                  id="map-sign"
                  value={sign}
                  onChange={(e) => {
                    setSign(e.target.value as SignMode);
                  }}
                >
                  <option value="negative_is_expense">
                    Negative = spending, positive = income
                  </option>
                  <option value="all_expense">All are spending</option>
                  <option value="all_income">All are income</option>
                </NativeSelect>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="map-wallet">Import into wallet</Label>
                <NativeSelect
                  id="map-wallet"
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                  }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <p className="text-caption text-fg-muted">
              Categories are matched by name; anything else goes to &ldquo;Other&rdquo;. Importing
              the same file again won&apos;t create duplicates.
            </p>
          </Card>

          <Card className="grid gap-3">
            <h2 className="text-h3">
              Preview · {mapped.parsed.length} ready
              {mapped.errors.length > 0 && `, ${mapped.errors.length} skipped`}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead className="text-left text-caption text-fg-muted">
                  <tr>
                    <th scope="col" className="py-2">
                      Date
                    </th>
                    <th scope="col" className="py-2">
                      Description
                    </th>
                    <th scope="col" className="py-2">
                      Category
                    </th>
                    <th scope="col" className="py-2 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mapped.parsed.slice(0, 8).map((r) => (
                    <tr key={r.key}>
                      <td className="py-2 whitespace-nowrap">{r.date}</td>
                      <td className="max-w-48 truncate py-2">{r.note || "—"}</td>
                      <td className="py-2 text-fg-muted">{r.category || "Other"}</td>
                      <td
                        className={
                          r.kind === "income"
                            ? "py-2 text-right text-income tabular"
                            : "py-2 text-right tabular"
                        }
                      >
                        {formatPeso(r.kind === "income" ? r.amount : -r.amount, { sign: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mapped.errors.length > 0 && (
              <details className="text-caption">
                <summary className="flex cursor-pointer items-center gap-1 text-warning">
                  <TriangleAlert className="size-3.5" aria-hidden /> {mapped.errors.length} rows
                  will be skipped
                </summary>
                <ul className="mt-2 grid gap-0.5 text-fg-muted">
                  {mapped.errors.slice(0, 20).map((e) => (
                    <li key={e.line}>
                      Line {e.line}: {e.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <Button
              size="lg"
              disabled={mapped.parsed.length === 0 || progress !== null || !accountId}
              onClick={() => void run()}
            >
              {progress !== null
                ? `Importing… ${progress}/${mapped.parsed.length}`
                : `Import ${mapped.parsed.length} transactions`}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
