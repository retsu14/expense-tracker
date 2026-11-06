"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MOODS, type Mood } from "@/modules/mascot/domain/mood";

import { Pig } from "./pig";

export function PigPlayground() {
  const [mood, setMood] = useState<Mood>("happy");
  const [coverEyes, setCoverEyes] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="flex min-h-96 items-center justify-center pt-16">
        <Pig mood={mood} size={240} coverEyes={coverEyes} />
      </Card>
      <Card className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-body-sm font-medium">Mood</legend>
          <div className="grid grid-cols-2 gap-2">
            {MOODS.map((m) => (
              <Button
                key={m}
                size="sm"
                variant={m === mood ? "primary" : "secondary"}
                aria-pressed={m === mood}
                onClick={() => {
                  setMood(m);
                }}
              >
                {m}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center justify-between">
          <Label htmlFor="cover-eyes">Cover eyes (password)</Label>
          <Switch id="cover-eyes" checked={coverEyes} onCheckedChange={setCoverEyes} />
        </div>
        <ul className="list-disc space-y-1 pl-5 text-body-sm text-fg-muted">
          <li>Move the pointer: eyes follow</li>
          <li>Tap: bounce, snout wiggle, oink</li>
          <li>Long-press or stroke: blush</li>
          <li>Drag (mouse): wobble back</li>
        </ul>
      </Card>
    </div>
  );
}
