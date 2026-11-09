"use client";

import { m, useAnimate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { HEALTH_LABEL, type Health } from "@/modules/mascot/domain/health";
import type { Mood } from "@/modules/mascot/domain/mood";
import { useMascotStore } from "@/stores/mascot-store";
import { useSettingsStore } from "@/stores/settings-store";

import { playOink } from "./oink-sound";
import {
  Backdrop,
  Brows,
  Coin,
  CoverHooves,
  Eyes,
  Head,
  Hearts,
  Hungry,
  Mouth,
  Snout,
  Sparkles,
  Tears,
  Zzz,
} from "./pig-parts";
import { SpeechBubble } from "./speech-bubble";
import { useBlink } from "./use-blink";
import { useEyeFollow } from "./use-eye-follow";

const TAP_LINES: Record<Health, string[]> = {
  thriving: [
    "Oink oink! 💗",
    "I'm so full of savings!",
    "Best. Budget. Ever.",
    "Hehe, that tickles",
  ],
  healthy: ["Oink!", "Hi there!", "Got any snacks?", "Saving is my cardio", "Every peso counts!"],
  thin: ["My tummy's rumbling…", "Maybe skip the milk tea?", "A little less spending, please?"],
  famished: ["So hungry… 🥺", "Can we save a bit today?", "Feed me with savings, please…"],
};

const MOOD_LABEL: Record<Mood, string> = {
  happy: "happy",
  worried: "a little worried",
  sad: "sad",
  celebrating: "celebrating",
  sleeping: "sleeping",
  munch: "munching a coin",
};

const LONG_PRESS_MS = 450;
const STROKE_DISTANCE = 260;
const BUBBLE_MS = 4000;

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

type PigProps = {
  mood?: Mood;
  health?: Health;
  size?: number;
  coverEyes?: boolean;
  interactive?: boolean;
  listen?: boolean;
  name?: string;
  className?: string;
  onSay?: ((text: string) => void) | undefined;
};

export function Pig({
  mood: moodProp,
  health = "healthy",
  size = 160,
  coverEyes = false,
  interactive = true,
  listen = false,
  name = "Oink",
  className,
  onSay,
}: PigProps) {
  const storeMood = useMascotStore((s) => s.mood);
  const mood = moodProp ?? storeMood;

  const reduced = useReducedMotion() ?? false;
  const finePointer = useMediaQuery("(pointer: fine)");
  const animated = !reduced;

  const svgRef = useRef<SVGSVGElement>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const eyes = useEyeFollow(svgRef, animated && !coverEyes && mood !== "sleeping");
  const blinking = useBlink(mood !== "sleeping" && !coverEyes);

  const dragX = useMotionValue(0);
  const tilt = useTransform(dragX, [-120, 120], [-18, 18]);

  const [petting, setPetting] = useState(false);
  const [bubble, setBubble] = useState<{ key: number; text: string } | null>(null);

  const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const petTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragged = useRef(false);
  const stroke = useRef({ distance: 0, last: 0 });

  const say = (text: string) => {
    if (onSay) {
      onSay(text);
      return;
    }
    clearTimeout(bubbleTimer.current);
    setBubble({ key: Date.now(), text });
    bubbleTimer.current = setTimeout(() => {
      setBubble(null);
    }, BUBBLE_MS);
  };

  useEffect(() => {
    if (!listen) return;
    return useMascotStore.subscribe((state, prev) => {
      const msg = state.message;
      if (!msg || msg === prev.message) return;
      if (onSay) {
        onSay(msg.text);
        return;
      }
      clearTimeout(bubbleTimer.current);
      setBubble({ key: msg.id, text: msg.text });
      bubbleTimer.current = setTimeout(() => {
        setBubble(null);
      }, BUBBLE_MS);
    });
  }, [listen, onSay]);

  useEffect(() => {
    if (!animated) return;
    let timer: ReturnType<typeof setTimeout>;
    const twitch = () => {
      timer = setTimeout(
        () => {
          const side = Math.random() > 0.5 ? "left" : "right";
          void animate(
            `[data-ear="${side}"]`,
            { rotate: side === "left" ? [0, -14, 6, 0] : [0, 14, -6, 0] },
            { duration: 0.45 },
          );
          twitch();
        },
        4000 + Math.random() * 5000,
      );
    };
    twitch();
    return () => {
      clearTimeout(timer);
    };
  }, [animated, animate]);

  useEffect(
    () => () => {
      clearTimeout(pressTimer.current);
      clearTimeout(petTimer.current);
      clearTimeout(bubbleTimer.current);
    },
    [],
  );

  const feedback = () => {
    const { haptics, sound } = useSettingsStore.getState();
    if (haptics && "vibrate" in navigator) navigator.vibrate(12);
    if (sound) playOink();
  };

  const tap = () => {
    feedback();
    say(mood === "sleeping" ? "Zzz... huh? Oh hi!" : (pick(TAP_LINES[health]) ?? "Oink!"));
    if (!animated) return;
    void animate(scope.current, { y: [0, -16, 0], scaleY: [1, 0.92, 1.05, 1] }, { duration: 0.45 });
    void animate("[data-snout]", { scaleX: [1, 1.18, 0.94, 1] }, { duration: 0.35 });
  };

  const startPetting = (linger = 1400) => {
    clearTimeout(petTimer.current);
    if (!petting) {
      feedback();
      say("Hehe~ 💗");
    }
    setPetting(true);
    petTimer.current = setTimeout(() => {
      setPetting(false);
    }, linger);
  };

  const onPointerDown = () => {
    dragged.current = false;
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      pressTimer.current = undefined;
      startPetting(60_000);
    }, LONG_PRESS_MS);
  };

  const onPointerUp = () => {
    const wasShortPress = pressTimer.current !== undefined;
    clearTimeout(pressTimer.current);
    pressTimer.current = undefined;
    if (petting) {
      startPetting(900);
      return;
    }
    if (wasShortPress && !dragged.current) tap();
  };

  const onPointerCancel = () => {
    clearTimeout(pressTimer.current);
    pressTimer.current = undefined;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.buttons !== 0) return;
    const now = performance.now();
    const s = stroke.current;
    if (now - s.last > 400) s.distance = 0;
    s.distance += Math.hypot(e.movementX, e.movementY);
    s.last = now;
    if (s.distance > STROKE_DISTANCE) {
      s.distance = 0;
      startPetting();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tap();
    }
  };

  const loop = { repeat: Infinity, ease: "easeInOut" } as const;
  const showSparkles = mood === "celebrating";
  const label = `${name} the pig is ${MOOD_LABEL[mood]}${health === "healthy" ? "" : ` and ${HEALTH_LABEL[health].toLowerCase()}`}.${interactive ? " Press to say hi." : ""}`;

  return (
    <div className={cn("relative inline-flex", className)} style={{ width: size, height: size }}>
      {!onSay && (
        <SpeechBubble
          text={bubble?.text ?? null}
          bubbleKey={bubble?.key ?? 0}
          onDismiss={() => {
            setBubble(null);
          }}
        />
      )}
      <m.div
        className={cn(
          "size-full touch-manipulation rounded-full outline-offset-4 select-none",
          interactive && "cursor-pointer",
        )}
        style={{ x: dragX, rotate: tilt }}
        drag={interactive && finePointer && animated}
        dragSnapToOrigin
        dragElastic={0.35}
        dragTransition={{ bounceStiffness: 380, bounceDamping: 12 }}
        onDragStart={() => {
          dragged.current = true;
          clearTimeout(pressTimer.current);
          pressTimer.current = undefined;
        }}
        onDragEnd={() => {
          say("Wheee!");
        }}
        {...(interactive
          ? {
              role: "button",
              tabIndex: 0,
              "aria-label": label,
              onPointerDown,
              onPointerUp,
              onPointerCancel,
              onPointerLeave: onPointerCancel,
              onPointerMove,
              onKeyDown,
              onContextMenu: (e: React.MouseEvent) => {
                e.preventDefault();
              },
            }
          : { role: "img", "aria-label": label })}
      >
        <div ref={scope} className="size-full" style={{ transformOrigin: "50% 100%" }}>
          <m.div
            className="size-full"
            animate={
              animated && mood === "celebrating"
                ? { y: [0, -10, 0] }
                : animated && mood === "sad"
                  ? { y: 3 }
                  : { y: 0 }
            }
            transition={mood === "celebrating" ? { ...loop, duration: 0.6 } : { duration: 0.4 }}
          >
            <svg
              ref={svgRef}
              viewBox="0 0 200 200"
              className="size-full overflow-visible text-fg-muted"
              aria-hidden
            >
              <Backdrop health={health} animated={animated} />

              <m.g
                style={{ originY: 1 }}
                animate={
                  animated && mood !== "celebrating"
                    ? { scaleY: [1, health === "famished" ? 1.012 : 1.025, 1] }
                    : {}
                }
                transition={{
                  ...loop,
                  duration: mood === "sleeping" || health === "famished" ? 4.2 : 3.2,
                }}
              >
                <Head health={health} petting={petting} />
                <Brows mood={mood} />
                <Eyes
                  mood={mood}
                  health={health}
                  squint={petting || coverEyes}
                  blinking={blinking}
                  x={eyes.x}
                  y={eyes.y}
                />
                <Snout />
                <Mouth mood={mood} health={health} />
                {mood === "sad" && <Tears still={!animated} />}
                <CoverHooves show={coverEyes} />
              </m.g>

              {health === "famished" && mood !== "sleeping" && <Hungry still={!animated} />}
              {health === "thriving" && mood !== "sleeping" && <Hearts still={!animated} />}
              {mood === "sleeping" && <Zzz still={!animated} />}
              {showSparkles && <Sparkles still={!animated} />}
              {mood === "munch" && <Coin still={!animated} />}
            </svg>
          </m.div>
        </div>
      </m.div>
    </div>
  );
}
