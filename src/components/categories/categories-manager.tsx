"use client";

import { Archive, ArchiveRestore, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { CategoryIcon, ICONS } from "@/components/ledger/category-icon";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Segmented } from "@/components/ui/segmented";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  type Category,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type CategoryIcon as IconName,
  type CategoryKind,
} from "@/modules/ledger/domain/category";
import type { Template } from "@/modules/ledger/domain/template";
import {
  archiveCategoryAction,
  createCategoryAction,
  deleteTemplateAction,
  updateCategoryAction,
} from "@/modules/ledger/presentation/actions";

type Editing = { mode: "new"; kind: CategoryKind } | { mode: "edit"; category: Category } | null;

export function CategoriesManager({
  categories,
  templates,
}: {
  categories: Category[];
  templates: Template[];
}) {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, startTransition] = useTransition();
  const list = categories.filter((c) => c.kind === kind);
  const byId = new Map(categories.map((c) => [c.id, c]));

  const toggleArchive = (c: Category) => {
    startTransition(async () => {
      const res = await archiveCategoryAction(c.id, !c.archived);
      if (res.ok) toast.success(c.archived ? `${c.name} restored` : `${c.name} archived`);
      else toast.error(res.error.message);
    });
  };

  const removeTemplate = (t: Template) => {
    startTransition(async () => {
      const res = await deleteTemplateAction(t.id);
      if (res.ok) toast.success(`Removed "${t.name}"`);
      else toast.error(res.error.message);
    });
  };

  return (
    <div className="grid max-w-2xl grid-cols-1 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Category type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "expense", label: "Expenses" },
            { value: "income", label: "Income" },
          ]}
          className="w-full sm:w-72"
        />
        <Button
          onClick={() => {
            setEditing({ mode: "new", kind });
          }}
        >
          <Plus aria-hidden />
          New category
        </Button>
      </div>

      <Card className="p-0 md:p-0">
        <ul className="divide-y divide-border">
          {list.map((c) => (
            <li
              key={c.id}
              className={cn("flex items-center gap-3 px-4 py-3", c.archived && "opacity-55")}
            >
              <CategoryIcon icon={c.icon} color={c.color} />
              <span className="flex-1 font-medium">
                {c.name}
                {c.archived && <span className="ml-2 text-caption text-fg-muted">Archived</span>}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${c.name}`}
                onClick={() => {
                  setEditing({ mode: "edit", category: c });
                }}
              >
                <Pencil aria-hidden />
              </Button>
              {!c.system && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  aria-label={c.archived ? `Restore ${c.name}` : `Archive ${c.name}`}
                  onClick={() => {
                    toggleArchive(c);
                  }}
                >
                  {c.archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favorites</CardTitle>
        </CardHeader>
        {templates.length === 0 ? (
          <p className="text-body-sm text-fg-muted">
            Tick &ldquo;Save as favorite&rdquo; when adding a transaction.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {templates.map((t) => {
              const cat = byId.get(t.categoryId);
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Star className="size-4 shrink-0 text-warning" aria-hidden />
                  <span className="flex-1">
                    <span className="font-medium">{t.name}</span>
                    <span className="block text-caption font-normal text-fg-muted">
                      {cat?.name ?? "—"} · {formatPeso(t.amount)}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    aria-label={`Remove favorite ${t.name}`}
                    onClick={() => {
                      removeTemplate(t);
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title={editing?.mode === "edit" ? "Edit category" : "New category"}
      >
        {editing && (
          <CategoryForm
            category={editing.mode === "edit" ? editing.category : null}
            kind={editing.mode === "edit" ? editing.category.kind : editing.kind}
            onDone={() => {
              setEditing(null);
            }}
          />
        )}
      </ResponsiveModal>
    </div>
  );
}

function CategoryForm({
  category,
  kind,
  onDone,
}: {
  category: Category | null;
  kind: CategoryKind;
  onDone: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState<IconName>(category?.icon ?? "circle-dollar-sign");
  const [color, setColor] = useState<string>(category?.color ?? CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const input = { name, icon, color, kind };
      const res = category
        ? await updateCategoryAction(category.id, input)
        : await createCategoryAction(input);
      if (!res.ok) {
        setError(res.error.fieldErrors?.name?.[0] ?? res.error.message);
        return;
      }
      toast.success(category ? "Category updated" : "Category added");
      onDone();
    });
  };

  return (
    <form
      className="grid grid-cols-1 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size="lg" />
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="cat-name">Name</Label>
          <Input
            id="cat-name"
            value={name}
            maxLength={30}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </div>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <fieldset>
        <legend className="mb-2 text-body-sm font-medium">Icon</legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {CATEGORY_ICONS.map((i) => {
            const Icon = ICONS[i];
            return (
              <button
                key={i}
                type="button"
                aria-label={i.replace(/-/g, " ")}
                aria-pressed={icon === i}
                onClick={() => {
                  setIcon(i);
                }}
                className={cn(
                  "flex size-11 cursor-pointer items-center justify-center rounded-md border",
                  icon === i
                    ? "border-accent bg-surface-2"
                    : "border-transparent hover:bg-surface-2",
                )}
              >
                {Icon && <Icon className="size-5" aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-body-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => {
                setColor(c);
              }}
              className={cn(
                "size-10 cursor-pointer rounded-full border-2",
                color === c ? "border-fg" : "border-transparent",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </fieldset>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : category ? "Save changes" : "Add category"}
      </Button>
    </form>
  );
}
