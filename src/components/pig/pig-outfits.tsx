"use client";

import { AnimatePresence, m } from "motion/react";

import type { Health } from "@/modules/mascot/domain/health";
import type { Outfit } from "@/modules/mascot/domain/milestones";

import { SHAPE } from "./pig-parts";

const GOLD = "#f2b84b";
const GOLD_DEEP = "#9a6414";
const GOLD_LIGHT = "#fde3a1";
const loop = { repeat: Infinity, ease: "easeInOut" } as const;
const morph = { type: "spring", stiffness: 140, damping: 18 } as const;
const drop = { type: "spring", stiffness: 260, damping: 11 } as const;

// luminance mapped onto a warm gold ramp
export const GOLD_MATRIX =
  "0.384 0.755 0.141 0 0  0.306 0.602 0.112 0 0  0.126 0.248 0.046 0 0  0 0 0 1 0";

export const TRICKS: Record<Outfit, { keyframes: Record<string, number[]>; duration: number }> = {
  sprout: { keyframes: { scale: [1, 1.35, 0.9, 1], rotate: [0, -10, 8, 0] }, duration: 0.7 },
  bandana: { keyframes: { rotate: [0, -8, 8, -5, 0] }, duration: 0.6 },
  coin: { keyframes: { rotate: [0, 360], scale: [1, 1.2, 1] }, duration: 0.8 },
  shades: { keyframes: { y: [0, 9, 9, 0] }, duration: 0.9 },
  grad: { keyframes: { y: [0, -70, 0], rotate: [0, 360, 720] }, duration: 0.9 },
  crown: { keyframes: { y: [0, -14, 0], scale: [1, 1.15, 1] }, duration: 0.55 },
  royal: { keyframes: { y: [0, -14, 0], rotate: [0, -8, 8, 0] }, duration: 0.7 },
  golden: { keyframes: { y: [0, -16, 0], scale: [1, 1.25, 1] }, duration: 0.6 },
};

const HAT = new Set<Outfit>(["sprout", "grad", "crown", "royal", "golden"]);
const NECK = new Set<Outfit>(["bandana", "coin"]);

function Star({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const k = r * 0.3;
  return (
    <path
      d={`M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`}
      fill={fill}
    />
  );
}

function Crown({ animated }: { animated: boolean }) {
  return (
    <g>
      <path
        d="M72 10 L68 -18 L84 -4 L100 -26 L116 -4 L132 -18 L128 10 Z"
        fill={GOLD}
        stroke={GOLD_DEEP}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M72 4 H128" stroke={GOLD_DEEP} strokeWidth={1.5} opacity={0.5} />
      {[
        { cx: 100, cy: -2, r: 4.2, fill: "#e0565b" },
        { cx: 84, cy: 2, r: 2.8, fill: "#4c8fe0" },
        { cx: 116, cy: 2, r: 2.8, fill: "#4c8fe0" },
      ].map((g, i) => (
        <m.circle
          key={g.cx}
          {...g}
          animate={animated ? { opacity: [1, 0.35, 1] } : {}}
          transition={{ ...loop, duration: 1.2, delay: i * 0.35 }}
        />
      ))}
    </g>
  );
}

function Hat({ outfit, animated }: { outfit: Outfit; animated: boolean }) {
  switch (outfit) {
    case "sprout":
      return (
        <m.g
          style={{ originX: 0.5, originY: 1 }}
          animate={animated ? { rotate: [-7, 7, -7] } : {}}
          transition={{ ...loop, duration: 2.6 }}
        >
          <path d="M100 6 V-16" stroke="#4d7a1f" strokeWidth={4} strokeLinecap="round" />
          <path d="M100 -13 c-18 -2 -22 -16 -20 -20 c12 0 20 8 20 20 Z" fill="#9ccc5a" />
          <path d="M100 -13 c16 -4 20 -18 18 -22 c-12 0 -18 10 -18 22 Z" fill="#6aa232" />
        </m.g>
      );
    case "grad":
      return (
        <g>
          <path d="M76 0 V12 Q100 24 124 12 V0" fill="#3a3a3f" />
          <path d="M54 -6 L100 -24 L146 -6 L100 12 Z" fill="#25252a" />
          <circle cx={100} cy={-6} r={3} fill={GOLD} />
          <m.g
            style={{ originX: 0, originY: 0 }}
            animate={animated ? { rotate: [-10, 12, -10] } : {}}
            transition={{ ...loop, duration: 2.2 }}
          >
            <path d="M100 -6 L144 -4 V20" stroke={GOLD} strokeWidth={2.5} fill="none" />
            <rect x={140} y={18} width={8} height={10} rx={3} fill={GOLD} />
          </m.g>
        </g>
      );
    case "crown":
    case "royal":
      return <Crown animated={animated} />;
    case "golden":
      return (
        <m.ellipse
          cx={100}
          cy={-24}
          rx={30}
          ry={8}
          fill="none"
          stroke={GOLD}
          strokeWidth={5}
          animate={animated ? { y: [0, -5, 0] } : {}}
          transition={{ ...loop, duration: 2.4 }}
        />
      );
    default:
      return null;
  }
}

function Neck({ outfit, animated }: { outfit: Outfit; animated: boolean }) {
  if (outfit === "bandana")
    return (
      <g>
        <path d="M60 -8 Q100 12 140 -8 L134 4 Q100 20 66 4 Z" fill="#e05252" />
        <m.path
          d="M88 2 L100 28 L112 2 Z"
          fill="#a83232"
          style={{ originX: 0.5, originY: 0 }}
          animate={animated ? { rotate: [-5, 5, -5], scaleY: [1, 1.06, 1] } : {}}
          transition={{ ...loop, duration: 1.8 }}
        />
        {[74, 100, 126].map((x) => (
          <circle key={x} cx={x} cy={x === 100 ? 8 : 2} r={1.6} fill="#fde8e8" />
        ))}
      </g>
    );
  return (
    <g>
      <path d="M66 -8 Q100 14 134 -8" stroke={GOLD_DEEP} strokeWidth={2.5} fill="none" />
      <m.g
        style={{ originX: 0.5, originY: 0 }}
        animate={animated ? { rotate: [-12, 12, -12] } : {}}
        transition={{ ...loop, duration: 2 }}
      >
        <path d="M100 3 V8" stroke={GOLD_DEEP} strokeWidth={2.5} />
        <circle cx={100} cy={20} r={13} fill={GOLD} stroke={GOLD_DEEP} strokeWidth={2.4} />
        <text
          x={100}
          y={26}
          textAnchor="middle"
          fontSize={17}
          fontWeight={700}
          fill="#6e4710"
          fontFamily="sans-serif"
        >
          ₱
        </text>
        <m.path
          d="M92 13 l3 -3"
          stroke="#fff"
          strokeWidth={2.4}
          strokeLinecap="round"
          animate={animated ? { opacity: [0, 0, 1, 0] } : { opacity: 0.7 }}
          transition={{ ...loop, duration: 2.6 }}
        />
      </m.g>
    </g>
  );
}

function Shades({ animated }: { animated: boolean }) {
  return (
    <m.g
      animate={animated ? { y: [0, 0, 4, 4, 0] } : {}}
      transition={{ ...loop, duration: 5, times: [0, 0.6, 0.68, 0.85, 1] }}
    >
      <path
        d="M62 82 L52 76 M138 82 L148 76"
        stroke="#25252a"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <rect x={60} y={77} width={32} height={21} rx={9} fill="#25252a" />
      <rect x={108} y={77} width={32} height={21} rx={9} fill="#25252a" />
      <path d="M92 84 H108" stroke="#25252a" strokeWidth={4} />
      <path
        d="M66 83 l9 -3 M114 83 l9 -3"
        stroke="#9a9aa2"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </m.g>
  );
}

// worn on the head group, so it breathes with the pig
export function OutfitFront({
  outfit,
  health,
  animated,
}: {
  outfit: Outfit | null;
  health: Health;
  animated: boolean;
}) {
  const [, hry] = SHAPE[health].head;
  const anchor = outfit && HAT.has(outfit) ? 88 - hry : 88 + hry - 4;
  return (
    <AnimatePresence initial={false}>
      {outfit && (
        <m.g
          key={outfit}
          initial={animated ? { y: -120, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
          transition={drop}
        >
          <g data-trick style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
            {outfit === "shades" ? (
              <Shades animated={animated} />
            ) : (
              <m.g initial={false} animate={{ y: anchor }} transition={morph}>
                {NECK.has(outfit) ? (
                  <Neck outfit={outfit} animated={animated} />
                ) : (
                  <Hat outfit={outfit} animated={animated} />
                )}
              </m.g>
            )}
          </g>
        </m.g>
      )}
    </AnimatePresence>
  );
}

export function OutfitBack({ outfit, animated }: { outfit: Outfit | null; animated: boolean }) {
  if (outfit !== "royal") return null;
  return (
    <m.g
      initial={animated ? { opacity: 0, scaleY: 0.4 } : false}
      animate={{ opacity: 1, scaleY: 1 }}
      style={{ originY: 0 }}
    >
      <m.path
        d="M60 118 Q34 156 46 190 H154 Q166 156 140 118 Q100 132 60 118 Z"
        fill="#5b45b8"
        style={{ originX: 0.5, originY: 0 }}
        animate={animated ? { scaleX: [1, 1.06, 1] } : {}}
        transition={{ ...loop, duration: 3 }}
      />
      <path d="M60 118 Q100 132 140 118" stroke={GOLD} strokeWidth={4} fill="none" />
      {[70, 100, 130].map((x) => (
        <circle key={x} cx={x} cy={x === 100 ? 160 : 150} r={2.4} fill={GOLD_LIGHT} opacity={0.8} />
      ))}
    </m.g>
  );
}

const GLINTS = [
  { x: 30, y: 60, r: 6, d: 0 },
  { x: 172, y: 92, r: 5, d: 0.9 },
  { x: 158, y: 28, r: 4, d: 1.6 },
  { x: 40, y: 150, r: 4.5, d: 2.3 },
];

export function GoldenGlints({ animated }: { animated: boolean }) {
  return (
    <g>
      {GLINTS.map((g) => (
        <m.g
          key={g.x}
          style={{ originX: 0.5, originY: 0.5 }}
          initial={{ opacity: animated ? 0 : 0.8, scale: animated ? 0.3 : 1 }}
          animate={animated ? { opacity: [0, 1, 0], scale: [0.3, 1, 0.3], rotate: [0, 45] } : {}}
          transition={{ ...loop, duration: 1.6, delay: g.d, repeatDelay: 1.2 }}
        >
          <Star x={g.x} y={g.y} r={g.r} fill={GOLD} />
        </m.g>
      ))}
    </g>
  );
}

const BURST = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  return { x: Math.cos(a) * 92, y: Math.sin(a) * 78, r: i % 2 ? 5 : 8, pink: i % 3 === 0 };
});

// coins rain onto the pig, then sparkles burst from the new item
export function UnlockFx() {
  return (
    <g pointerEvents="none">
      {[-14, -7, 0, 7, 14].map((dx, i) => (
        <m.g
          key={dx}
          initial={{ y: -150, opacity: 0 }}
          animate={{ y: [-150, 0, 0], opacity: [1, 1, 0], scale: [1, 1, 0.4] }}
          transition={{ duration: 0.6, delay: i * 0.13, times: [0, 0.8, 1], ease: "easeIn" }}
        >
          <circle cx={100 + dx} cy={30} r={9} fill={GOLD} stroke={GOLD_DEEP} strokeWidth={2} />
        </m.g>
      ))}
      {BURST.map((b, i) => (
        <m.g
          key={i}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
          animate={{ x: b.x, y: b.y, opacity: [0, 1, 0], scale: 1, rotate: 90 }}
          transition={{ duration: 0.85, delay: 1.75, ease: [0.2, 0.8, 0.3, 1] }}
        >
          <Star x={100} y={60} r={b.r} fill={b.pink ? "#f4a7b9" : GOLD} />
        </m.g>
      ))}
    </g>
  );
}

const CROP: Record<Outfit, string> = {
  sprout: "72 -6 56 48",
  bandana: "56 128 88 44",
  coin: "62 128 76 50",
  shades: "48 66 104 40",
  grad: "50 4 102 60",
  crown: "62 2 76 44",
  royal: "62 2 76 44",
  golden: "64 -4 72 26",
};

// the item on its own, for hints and badges
export function OutfitArt({ outfit, className }: { outfit: Outfit; className?: string }) {
  return (
    <svg viewBox={CROP[outfit]} className={className} aria-hidden>
      <OutfitFront outfit={outfit} health="healthy" animated={false} />
    </svg>
  );
}
