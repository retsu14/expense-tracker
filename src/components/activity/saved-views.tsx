"use client";

import { Bookmark, BookmarkPlus, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { cn } from "@/lib/utils";
import type { SavedFilter } from "@/modules/ledger/domain/ports";
import {
  filterToParams,
  isFiltered,
  type TransactionFilter,
} from "@/modules/ledger/domain/transaction-query";
import { deleteSavedFilterAction, saveFilterAction } from "@/modules/ledger/presentation/actions";

export function SavedViews({ views, filter }: { views: SavedFilter[]; filter: TransactionFilter }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const current = filterToParams(filter).toString();
  const canSave =
    isFiltered(filter) && !views.some((v) => new URLSearchParams(v.params).toString() === current);

  if (views.length === 0 && !canSave) return null;

  const save = () => {
    startTransition(async () => {
      const res = await saveFilterAction({
        name,
        params: Object.fromEntries(filterToParams(filter)),
      });
      if (!res.ok) {
        toast.error(res.error.fieldErrors?.name?.[0] ?? res.error.message);
        return;
      }
      toast.success(`Saved view "${name}"`);
      setNaming(false);
      setName("");
    });
  };

  const remove = (v: SavedFilter) => {
    startTransition(async () => {
      const res = await deleteSavedFilterAction(v.id);
      if (res.ok) toast.success(`Removed "${v.name}"`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Saved views">
      {views.map((v) => {
        const qs = new URLSearchParams(v.params).toString();
        const active = qs === current;
        return (
          <span
            key={v.id}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border text-body-sm",
              active ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface",
            )}
          >
            <Link
              href={`/activity?${qs}`}
              className="inline-flex items-center gap-1.5 py-1.5 pr-1 pl-3"
            >
              <Bookmark className="size-3.5" aria-hidden />
              {v.name}
            </Link>
            <button
              type="button"
              aria-label={`Remove view ${v.name}`}
              disabled={pending}
              onClick={() => {
                remove(v);
              }}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full opacity-70 hover:opacity-100"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        );
      })}
      {canSave && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setNaming(true);
          }}
        >
          <BookmarkPlus aria-hidden />
          Save view
        </Button>
      )}
      <ResponsiveModal open={naming} onOpenChange={setNaming} title="Save this view">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="view-name">Name</Label>
            <Input
              id="view-name"
              autoFocus
              maxLength={30}
              placeholder="Grab rides"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
            />
          </div>
          <Button type="submit" disabled={pending || !name.trim()}>
            Save view
          </Button>
        </form>
      </ResponsiveModal>
    </div>
  );
}
