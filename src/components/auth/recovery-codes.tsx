"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function RecoveryCodesList({ codes, username }: { codes: string[]; username: string }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Recovery codes copied");
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.error("Couldn't copy. Please write them down.");
    }
  };

  const download = () => {
    const body = `Oink recovery codes for @${username}\nEach code works once. Keep them somewhere safe.\n\n${text}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `oink-recovery-codes-${username}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-3">
      <ol className="grid grid-cols-2 gap-2 rounded-md border border-border bg-bg p-3 font-mono text-body-sm tabular">
        {codes.map((code) => (
          <li key={code} className="rounded-sm bg-surface-2 px-2 py-1.5 text-center tracking-wider">
            {code}
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="secondary" onClick={download}>
          <Download aria-hidden />
          Download
        </Button>
      </div>
    </div>
  );
}
