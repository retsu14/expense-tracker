"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMounted } from "@/lib/use-mounted";
import { useSettingsStore } from "@/stores/settings-store";

const rows = [
  { key: "sound", label: "Oink sounds", hint: "Oink when you tap the pig." },
  { key: "haptics", label: "Haptics", hint: "Vibrate on tap." },
] as const;

export function MascotSettings() {
  const mounted = useMounted();
  const settings = useSettingsStore();

  return (
    <div className="divide-y divide-border">
      {rows.map(({ key, label, hint }) => (
        <div
          key={key}
          className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
        >
          <div>
            <Label htmlFor={`setting-${key}`}>{label}</Label>
            <p id={`setting-${key}-hint`} className="text-caption font-normal text-fg-muted">
              {hint}
            </p>
          </div>
          <Switch
            id={`setting-${key}`}
            aria-describedby={`setting-${key}-hint`}
            checked={mounted && settings[key]}
            onCheckedChange={(value) => {
              settings.update({ [key]: value });
            }}
          />
        </div>
      ))}
    </div>
  );
}
