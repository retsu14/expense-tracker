import type { NextRequest } from "next/server";

import { exportTransactions } from "@/modules/analytics/application/analytics.use-cases";
import { getCurrentUser } from "@/modules/identity/presentation/dal";
import { analyticsDeps } from "@/shared/container";
import { csvRow } from "@/shared/csv";
import { isYmd } from "@/shared/kernel/time";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  const range = { from: isYmd(from) ? from : null, to: isYmd(to) ? to : null };
  const { rows, tz } = await exportTransactions(analyticsDeps(), user.id, range);

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const lines = [
    csvRow(["Date", "Type", "Amount (PHP)", "Wallet", "To wallet", "Category", "Note", "Tags"]),
    ...rows.map((r) =>
      csvRow([
        date.format(r.occurredAt).replace(",", ""),
        r.kind,
        (r.kind === "expense" ? -r.amount : r.amount) / 100,
        r.account,
        r.toAccount,
        r.category,
        r.note,
        r.tags.join(" "),
      ]),
    ),
  ];

  const name = `oink-transactions-${range.from ?? "all"}${range.to ? `-to-${range.to}` : ""}.csv`;
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
