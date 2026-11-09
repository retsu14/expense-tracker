"use client";

import { Brain, Check, Download, Loader2, PlugZap, Trash2, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  isValidOllamaName,
  normalizeOllamaUrl,
  OLLAMA_MODELS,
  SPEED_LABEL,
  type Speed,
  WEBLLM_MODELS,
  webllmId,
} from "@/modules/assistant/domain/models";
import {
  deleteModel,
  type OllamaTag,
  ollamaStatus,
  pullModel,
  type PullProgress,
} from "@/modules/assistant/infrastructure/ollama";
import {
  cancelLoad,
  isModelCached,
  LoadCancelled,
  type LoadProgress,
  loadModel,
  removeModel,
  webgpuStatus,
} from "@/modules/assistant/infrastructure/webllm";
import { useAssistantStore } from "@/stores/assistant-store";

import { isAbort } from "./use-assistant";

function ModelRow({
  title,
  meta,
  note,
  speed,
  recommended,
  active,
  children,
}: {
  title: string;
  meta: string;
  note?: string;
  speed?: Speed;
  recommended?: boolean | undefined;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center",
        active ? "border-accent bg-surface-2" : "border-border",
      )}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {title}
          {recommended && (
            <span className="rounded-full bg-pig/20 px-2 py-0.5 text-caption text-fg">
              Recommended
            </span>
          )}
          {speed && <span className="text-caption text-fg-muted">{SPEED_LABEL[speed]}</span>}
        </p>
        <p className="text-caption text-fg-muted tabular">{meta}</p>
        {note && <p className="text-body-sm text-fg-muted">{note}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </li>
  );
}

function ConfirmRemove({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => {
      setArmed(false);
    }, 4000);
    return () => {
      clearTimeout(t);
    };
  }, [armed]);
  return (
    <Button
      variant={armed ? "destructive" : "ghost"}
      size={armed ? "sm" : "icon"}
      aria-label={armed ? `Confirm remove ${label}` : `Remove ${label}`}
      onClick={() => {
        if (armed) onConfirm();
        else setArmed(true);
      }}
    >
      {armed ? "Remove?" : <Trash2 aria-hidden />}
    </Button>
  );
}

function Progress({
  value,
  text,
  onCancel,
}: {
  value: number;
  text: string;
  onCancel: () => void;
}) {
  return (
    <div className="grid w-full gap-1.5 sm:w-56">
      <div className="flex items-center gap-2">
        <ProgressBar value={value * 100} status="goal" label="Download progress" />
        <Button variant="ghost" size="icon" aria-label="Cancel download" onClick={onCancel}>
          <X aria-hidden />
        </Button>
      </div>
      <p className="line-clamp-2 text-caption text-fg-muted" aria-live="polite">
        {text}
      </p>
    </div>
  );
}

function WebllmPanel() {
  const active = useAssistantStore((s) => s.webllmModel);
  const update = useAssistantStore((s) => s.update);
  const [gpu, setGpu] = useState<"checking" | "ok" | "unsupported" | "no-adapter">("checking");
  const [f16, setF16] = useState(true);
  const [cached, setCached] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<{ id: string; p: LoadProgress } | null>(null);

  useEffect(() => {
    void webgpuStatus().then(async (s) => {
      setGpu(s.state);
      setF16(s.f16);
      const pairs = await Promise.all(
        WEBLLM_MODELS.map(async (m) => {
          const id = webllmId(m, s.f16);
          return [id, await isModelCached(id)] as const;
        }),
      );
      setCached(Object.fromEntries(pairs));
    });
  }, []);

  const install = async (id: string) => {
    setBusy({ id, p: { progress: 0, text: "Starting download…" } });
    try {
      await loadModel(id, (p) => {
        setBusy({ id, p });
      });
      setCached((c) => ({ ...c, [id]: true }));
      update({ webllmModel: id });
      toast.success("Brain installed! 🧠🐷", { description: "Works offline from now on." });
    } catch (e) {
      if (e instanceof LoadCancelled) toast("Download cancelled");
      else
        toast.error("Couldn't load this model", {
          description: e instanceof Error ? e.message.slice(0, 160) : "Try a smaller one.",
        });
      if (!(e instanceof LoadCancelled)) await removeModel(id).catch(() => undefined);
      setCached((c) => ({ ...c, [id]: false }));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    await removeModel(id);
    setCached((c) => ({ ...c, [id]: false }));
    if (active === id) update({ webllmModel: null });
    toast("Model removed", { description: "Storage freed." });
  };

  if (gpu === "checking")
    return (
      <p className="flex items-center gap-2 text-body-sm text-fg-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Checking your device…
      </p>
    );

  return (
    <div className="grid gap-3">
      {gpu !== "ok" ? (
        <p className="flex gap-2 rounded-md bg-warning/15 p-3 text-body-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            This browser can&apos;t run on-device AI. Try <strong>Ollama</strong> instead.
          </span>
        </p>
      ) : (
        <p className="text-body-sm text-fg-muted">Downloads once, then works offline. Use Wi-Fi.</p>
      )}
      <ul className="grid gap-2">
        {WEBLLM_MODELS.map((m) => {
          const id = webllmId(m, f16);
          const isCached = cached[id] === true;
          const isActive = active === id && isCached;
          const loadingThis = busy?.id === id;
          return (
            <ModelRow
              key={id}
              title={m.label}
              meta={`~${formatBytes(m.downloadMB * 1e6)} download · ${formatBytes((f16 ? m.vramMB : m.vramF32MB) * 1e6)} GPU memory`}
              note={m.note}
              speed={m.speed}
              recommended={m.recommended}
              active={isActive}
            >
              {loadingThis ? (
                <Progress value={busy.p.progress} text={busy.p.text} onCancel={cancelLoad} />
              ) : isCached ? (
                <>
                  {isActive ? (
                    <span className="flex items-center gap-1 text-body-sm font-medium">
                      <Check className="size-4 text-income" aria-hidden /> In use
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        update({ webllmModel: id });
                      }}
                    >
                      Use
                    </Button>
                  )}
                  <ConfirmRemove label={m.label} onConfirm={() => void remove(id)} />
                </>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={gpu !== "ok" || busy !== null}
                  onClick={() => void install(id)}
                >
                  <Download aria-hidden /> Download
                </Button>
              )}
            </ModelRow>
          );
        })}
      </ul>
    </div>
  );
}

const installedName = (tags: OllamaTag[], name: string) =>
  tags.find((t) => t.name === name || t.name === `${name}:latest`)?.name ?? null;

function OllamaPanel() {
  const url = useAssistantStore((s) => s.ollamaUrl);
  const active = useAssistantStore((s) => s.ollamaModel);
  const update = useAssistantStore((s) => s.update);
  const [draftUrl, setDraftUrl] = useState(url);
  const [status, setStatus] = useState<
    | { state: "checking" }
    | { state: "fail" }
    | { state: "ok"; version: string; models: OllamaTag[] }
  >({ state: "checking" });
  const [pull, setPull] = useState<{ name: string; p: PullProgress } | null>(null);
  const [custom, setCustom] = useState("");
  const abort = useRef<AbortController | null>(null);

  const check = useCallback(async (base: string) => {
    setStatus({ state: "checking" });
    const res = await ollamaStatus(base, AbortSignal.timeout(4000));
    setStatus(
      res.ok ? { state: "ok", version: res.version, models: res.models } : { state: "fail" },
    );
    return res;
  }, []);

  useEffect(() => {
    let live = true;
    void ollamaStatus(url, AbortSignal.timeout(4000)).then((res) => {
      if (live)
        setStatus(
          res.ok ? { state: "ok", version: res.version, models: res.models } : { state: "fail" },
        );
    });
    return () => {
      live = false;
    };
  }, [url]);

  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );

  const connect = () => {
    const base = normalizeOllamaUrl(draftUrl);
    if (!base) {
      toast.error("Enter a valid address, like http://localhost:11434");
      return;
    }
    setDraftUrl(base);
    if (base === url) void check(base);
    else update({ ollamaUrl: base, ollamaModel: null });
  };

  const get = async (name: string) => {
    const ctrl = new AbortController();
    abort.current = ctrl;
    setPull({ name, p: { status: "Starting…" } });
    try {
      await pullModel(
        url,
        name,
        (p) => {
          setPull({ name, p });
        },
        ctrl.signal,
      );
      const res = await check(url);
      const tag = res.ok ? installedName(res.models, name) : null;
      if (tag) update({ ollamaModel: tag });
      setCustom("");
      toast.success(`${name} is ready! 🧠🐷`);
    } catch (e) {
      if (isAbort(e)) toast("Download cancelled");
      else
        toast.error("Download failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setPull(null);
      abort.current = null;
    }
  };

  const remove = async (name: string) => {
    try {
      await deleteModel(url, name);
      if (active === name) update({ ollamaModel: null });
      toast("Model removed from Ollama");
      await check(url);
    } catch (e) {
      toast.error("Couldn't remove", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const pullProgress = (name: string) =>
    pull?.name === name ? (
      <Progress
        value={pull.p.total ? (pull.p.completed ?? 0) / pull.p.total : 0}
        text={
          pull.p.total
            ? `${pull.p.status} · ${formatBytes(pull.p.completed ?? 0)} of ${formatBytes(pull.p.total)}`
            : pull.p.status
        }
        onCancel={() => abort.current?.abort()}
      />
    ) : null;

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const models = status.state === "ok" ? status.models : [];
  const curated = OLLAMA_MODELS.filter((m) => !installedName(models, m.name));

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          connect();
        }}
      >
        <Label htmlFor="ollama-url">Ollama address</Label>
        <div className="flex gap-2">
          <Input
            id="ollama-url"
            value={draftUrl}
            onChange={(e) => {
              setDraftUrl(e.target.value);
            }}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
          />
          <Button type="submit" variant="secondary" disabled={status.state === "checking"}>
            <PlugZap aria-hidden /> Connect
          </Button>
        </div>
        <p className="text-caption text-fg-muted" aria-live="polite">
          {status.state === "checking"
            ? "Connecting…"
            : status.state === "ok"
              ? `Connected · Ollama ${status.version}`
              : "Not connected"}
        </p>
      </form>

      {status.state === "fail" && (
        <div className="grid gap-2 rounded-md bg-surface-2 p-3 text-body-sm">
          <p className="font-medium">Can&apos;t reach Ollama. Quick fix:</p>
          <ol className="list-decimal space-y-1 pl-5 text-fg-muted">
            <li>
              Install it from{" "}
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                ollama.com
              </a>{" "}
              and open it.
            </li>
            <li>Make sure the address above matches (default port 11434).</li>
            {!/^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin) && (
              <li>
                Allow this site: set{" "}
                <code className="rounded bg-surface px-1">OLLAMA_ORIGINS={origin}</code> and restart
                Ollama.
              </li>
            )}
          </ol>
        </div>
      )}

      {status.state === "ok" && (
        <>
          <section className="grid gap-2" aria-labelledby="ollama-installed">
            <h3 id="ollama-installed" className="text-body-sm font-semibold">
              Installed models
            </h3>
            {models.length === 0 ? (
              <p className="text-body-sm text-fg-muted">None yet. Download one below.</p>
            ) : (
              <ul className="grid gap-2">
                {models.map((m) => (
                  <ModelRow
                    key={m.name}
                    title={m.name}
                    meta={m.cloud ? "Cloud · runs on Ollama's servers" : formatBytes(m.size)}
                    active={active === m.name}
                  >
                    {active === m.name ? (
                      <span className="flex items-center gap-1 text-body-sm font-medium">
                        <Check className="size-4 text-income" aria-hidden /> In use
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          update({ ollamaModel: m.name });
                        }}
                      >
                        Use
                      </Button>
                    )}
                    <ConfirmRemove label={m.name} onConfirm={() => void remove(m.name)} />
                  </ModelRow>
                ))}
              </ul>
            )}
            {models.some((m) => m.cloud) && (
              <p className="text-caption text-fg-muted">
                Cloud models aren&apos;t private. Prefer a local one.
              </p>
            )}
          </section>

          <section className="grid gap-2" aria-labelledby="ollama-get">
            <h3 id="ollama-get" className="text-body-sm font-semibold">
              Get a model
            </h3>
            <ul className="grid gap-2">
              {curated.map((m) => (
                <ModelRow
                  key={m.name}
                  title={m.label}
                  meta={`${m.name} · ${String(m.sizeGB)} GB · ${String(m.ramGB)} GB+ RAM`}
                  note={m.note}
                  speed={m.speed}
                  recommended={m.recommended}
                >
                  {pullProgress(m.name) ?? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pull !== null}
                      onClick={() => void get(m.name)}
                    >
                      <Download aria-hidden /> Download
                    </Button>
                  )}
                </ModelRow>
              ))}
            </ul>
            <form
              className="grid gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!isValidOllamaName(custom)) {
                  toast.error("Enter a model name like qwen2.5:7b");
                  return;
                }
                void get(custom.trim());
              }}
            >
              <Label htmlFor="ollama-custom">Other model</Label>
              <div className="flex gap-2">
                <Input
                  id="ollama-custom"
                  placeholder="e.g. qwen2.5:7b"
                  value={custom}
                  onChange={(e) => {
                    setCustom(e.target.value);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={pull !== null}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={pull !== null || !custom.trim()}
                >
                  Download
                </Button>
              </div>
              {pull && !OLLAMA_MODELS.some((m) => m.name === pull.name) && pullProgress(pull.name)}
            </form>
          </section>
        </>
      )}
    </div>
  );
}

export function AiSettings({ pigName }: { pigName: string }) {
  const mounted = useMounted();
  const enabled = useAssistantStore((s) => s.enabled);
  const provider = useAssistantStore((s) => s.provider);
  const update = useAssistantStore((s) => s.update);

  if (!mounted) return <div className="h-14" aria-hidden />;

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-surface-2">
            <Brain className="size-5" aria-hidden />
          </span>
          <div>
            <Label htmlFor="ai-enabled">Smart {pigName}</Label>
            <p className="text-caption font-normal text-fg-muted">
              Optional. Runs privately on your device.
            </p>
          </div>
        </div>
        <Switch
          id="ai-enabled"
          checked={enabled}
          onCheckedChange={(on) => {
            update({ enabled: on });
          }}
        />
      </div>
      {enabled && (
        <>
          <Segmented
            label="Where the AI runs"
            value={provider}
            onChange={(p) => {
              update({ provider: p });
            }}
            options={[
              { value: "webllm", label: "This browser" },
              { value: "ollama", label: "Ollama" },
            ]}
          />
          {provider === "webllm" ? <WebllmPanel /> : <OllamaPanel />}
        </>
      )}
    </div>
  );
}
