"use client";

import { m, type MotionValue } from "motion/react";

import type { Health } from "@/modules/mascot/domain/health";
import type { Mood } from "@/modules/mascot/domain/mood";

const INK = "#2b1d22";
const DEEP = "#8a3f52";
const BLUSH = "#e8879e";
const RIB = "#d9748d";
export const EYE_Y = 88;
const EYES = [76, 124] as const;
const loop = { repeat: Infinity, ease: "easeInOut" } as const;
const morph = { type: "spring", stiffness: 140, damping: 18 } as const;

export const SHAPE: Record<
  Health,
  {
    head: [number, number];
    body: [number, number];
    cheek: number;
    droop: number;
    leg: number;
    eye: number;
    tone: string;
  }
> = {
  thriving: {
    head: [68, 59],
    body: [66, 40],
    cheek: 1.3,
    droop: 0,
    leg: 16,
    eye: 1.08,
    tone: "var(--pig)",
  },
  healthy: {
    head: [62, 56],
    body: [50, 33],
    cheek: 1,
    droop: 0,
    leg: 14,
    eye: 1,
    tone: "var(--pig)",
  },
  thin: {
    head: [55, 55],
    body: [38, 30],
    cheek: 0.7,
    droop: 50,
    leg: 10,
    eye: 0.95,
    tone: "#efb2c0",
  },
  famished: {
    head: [50, 54],
    body: [28, 28],
    cheek: 0.45,
    droop: 108,
    leg: 7,
    eye: 0.88,
    tone: "#e9c2cb",
  },
};

export function Backdrop({ health, animated }: { health: Health; animated: boolean }) {
  const s = SHAPE[health];
  const [brx, bry] = s.body;
  const tail =
    health === "famished"
      ? "M0 0 q9 5 7 18"
      : health === "thin"
        ? "M0 0 q12 0 11 -10 q-2 -6 -7 -2"
        : "M0 0 q14 -4 12 -15 q-2 -8 -9 -4 q-6 5 2 9 q9 3 14 -6";
  return (
    <>
      <m.ellipse
        cx={100}
        cy={190}
        ry={6}
        fill="currentColor"
        opacity={0.18}
        initial={false}
        animate={{ rx: brx + 14 }}
        transition={morph}
      />
      <m.g initial={false} animate={{ x: 100 + brx - 3, y: 146 }} transition={morph}>
        <m.path
          d={tail}
          fill="none"
          stroke={BLUSH}
          strokeWidth={4.5}
          strokeLinecap="round"
          style={{ originX: 0, originY: 1 }}
          animate={animated && health !== "famished" ? { rotate: [0, 14, -6, 0] } : {}}
          transition={{ ...loop, duration: health === "thriving" ? 0.6 : 0.9, repeatDelay: 1.6 }}
        />
      </m.g>
      {[-1, 1].map((side) => (
        <m.rect
          key={side}
          y={166}
          height={22}
          fill={BLUSH}
          initial={false}
          animate={{
            x: 100 + side * brx * 0.45 - s.leg / 2,
            width: s.leg,
            rx: s.leg / 2,
          }}
          transition={morph}
        />
      ))}
      <m.ellipse
        cx={100}
        cy={148}
        fill={s.tone}
        initial={false}
        animate={{ rx: brx, ry: bry }}
        transition={morph}
      />
      <m.ellipse
        cx={100}
        cy={155}
        fill="#fff"
        opacity={0.22}
        initial={false}
        animate={{ rx: brx * 0.6, ry: bry * 0.55 }}
        transition={morph}
      />
      {health === "thriving" && (
        <path
          d="M100 160 c-3 -4 -9 -2 -7 3 c1 3 7 7 7 7 s6 -4 7 -7 c2 -5 -4 -7 -7 -3 Z"
          fill={BLUSH}
          opacity={0.8}
        />
      )}
      {(health === "thin" || health === "famished") &&
        [0, 1, 2].slice(0, health === "thin" ? 2 : 3).map((i) => (
          <g
            key={i}
            stroke={RIB}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            opacity={health === "thin" ? 0.45 : 0.75}
          >
            <path d={`M${100 - brx * 0.78} ${139 + i * 8} q${brx * 0.2} 4 ${brx * 0.38} 1`} />
            <path d={`M${100 + brx * 0.78} ${139 + i * 8} q${-brx * 0.2} 4 ${-brx * 0.38} 1`} />
          </g>
        ))}
    </>
  );
}

function Ear({ side, health }: { side: -1 | 1; health: Health }) {
  const s = SHAPE[health];
  const [hrx, hry] = s.head;
  return (
    <m.g
      initial={false}
      animate={{ x: 100 + side * hrx * 0.58, y: 88 - hry * 0.78 }}
      transition={morph}
    >
      <g
        data-ear={side < 0 ? "left" : "right"}
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      >
        <m.g
          initial={false}
          style={{ originX: 0.5, originY: 0.85 }}
          animate={{ rotate: side * (18 + s.droop) }}
          transition={morph}
        >
          <path d="M-15 6 C-19 -16 -11 -34 2 -33 C14 -31 17 -14 15 6 Z" fill={s.tone} />
          <path d="M-8 2 C-10 -12 -6 -24 1 -23 C8 -22 10 -11 8 2 Z" fill={BLUSH} />
        </m.g>
      </g>
    </m.g>
  );
}

export function Head({ health, petting }: { health: Health; petting: boolean }) {
  const s = SHAPE[health];
  const [hrx, hry] = s.head;
  const thinish = health === "thin" || health === "famished";
  return (
    <>
      <Ear side={-1} health={health} />
      <Ear side={1} health={health} />
      <m.ellipse
        cx={100}
        cy={88}
        fill={s.tone}
        initial={false}
        animate={{ rx: hrx, ry: hry }}
        transition={morph}
      />
      <m.ellipse
        cy={52}
        rx={16}
        ry={8}
        fill="#fff"
        opacity={0.3}
        initial={false}
        animate={{ cx: 100 - hrx * 0.45 }}
        transition={morph}
        transform={`rotate(-24 ${String(100 - hrx * 0.45)} 52)`}
      />
      <path
        d={health === "famished" ? "M97 33 q-2 -9 5 -12" : "M94 34 q-5 -12 6 -14 q10 -1 5 9"}
        fill="none"
        stroke={BLUSH}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {[-1, 1].map((side) => (
        <m.ellipse
          key={side}
          cy={108}
          fill={BLUSH}
          initial={false}
          animate={{
            cx: 100 + side * hrx * 0.66,
            rx: 11 * s.cheek,
            ry: 7 * s.cheek,
            opacity: petting ? 0.95 : health === "thriving" ? 0.75 : 0.5,
          }}
          transition={morph}
        />
      ))}
      {thinish && (
        <g
          stroke={RIB}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          opacity={health === "thin" ? 0.4 : 0.7}
        >
          {EYES.map((cx) => (
            <path key={cx} d={`M${cx - 9} ${EYE_Y + 15} q9 5 18 0`} />
          ))}
        </g>
      )}
    </>
  );
}

export function Snout() {
  return (
    <g data-snout style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
      <ellipse cx={100} cy={112} rx={22} ry={15} fill={BLUSH} />
      <ellipse cx={93} cy={106} rx={7} ry={3} fill="#fff" opacity={0.25} />
      <ellipse cx={92} cy={113} rx={3.8} ry={5.4} fill={DEEP} />
      <ellipse cx={108} cy={113} rx={3.8} ry={5.4} fill={DEEP} />
    </g>
  );
}

type EyesProps = {
  mood: Mood;
  health: Health;
  squint: boolean;
  blinking: boolean;
  x: MotionValue<number>;
  y: MotionValue<number>;
};

export function Eyes({ mood, health, squint, blinking, x, y }: EyesProps) {
  if (mood === "sleeping") {
    return (
      <g stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none">
        {EYES.map((cx) => (
          <path key={cx} d={`M${cx - 8} ${EYE_Y} Q${cx} ${EYE_Y + 7} ${cx + 8} ${EYE_Y}`} />
        ))}
      </g>
    );
  }

  if (squint || mood === "celebrating") {
    return (
      <g stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none">
        {EYES.map((cx) => (
          <path key={cx} d={`M${cx - 8} ${EYE_Y + 3} Q${cx} ${EYE_Y - 8} ${cx + 8} ${EYE_Y + 3}`} />
        ))}
      </g>
    );
  }

  const k = SHAPE[health].eye;
  return (
    <m.g style={{ x, y }}>
      {EYES.map((cx) => (
        <m.g
          key={cx}
          style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
          animate={{ scaleY: blinking ? 0.1 : 1 }}
          transition={{ duration: 0.08 }}
        >
          <ellipse cx={cx} cy={EYE_Y} rx={8.5 * k} ry={10.5 * k} fill={INK} />
          <circle cx={cx + 3} cy={EYE_Y - 4} r={3.2 * k} fill="#fff" />
          <circle cx={cx - 3} cy={EYE_Y + 4} r={1.5 * k} fill="#fff" opacity={0.8} />
        </m.g>
      ))}
    </m.g>
  );
}

export function Brows({ mood }: { mood: Mood }) {
  if (mood !== "worried" && mood !== "sad") return null;
  const tilt = mood === "sad" ? 8 : 5;
  const y = EYE_Y - 15;
  return (
    <g stroke={INK} strokeWidth={3} strokeLinecap="round">
      <path d={`M65 ${y + tilt} L85 ${y - tilt / 2}`} />
      <path d={`M115 ${y - tilt / 2} L135 ${y + tilt}`} />
    </g>
  );
}

export function Mouth({ mood, health }: { mood: Mood; health: Health }) {
  const stroke = { stroke: DEEP, strokeWidth: 3, strokeLinecap: "round", fill: "none" } as const;
  if (mood === "happy" && health === "thriving") mood = "celebrating";
  switch (mood) {
    case "worried":
      return <path d="M88 135 Q94 131 100 135 Q106 139 112 135" {...stroke} />;
    case "sad":
      return <path d="M90 139 Q100 130 110 139" {...stroke} />;
    case "celebrating":
      return (
        <g>
          <path d="M87 130 Q100 149 113 130 Z" fill={DEEP} />
          <path d="M93 139 Q100 145 107 139 Q100 136 93 139 Z" fill={BLUSH} />
        </g>
      );
    case "sleeping":
      return <ellipse cx={100} cy={135} rx={3} ry={3.5} fill={DEEP} />;
    case "munch":
      return (
        <m.ellipse
          cx={100}
          cy={135}
          rx={7}
          fill={DEEP}
          initial={{ ry: 2 }}
          animate={{ ry: [2, 6, 2] }}
          transition={{ ...loop, duration: 0.35 }}
        />
      );
    case "happy":
      return <path d="M89 131 Q100 141 111 131" {...stroke} />;
  }
}

export function Tears({ still }: { still: boolean }) {
  return (
    <g fill="#9cc9e8">
      {EYES.map((cx, i) => (
        <m.path
          key={cx}
          d={`M${cx} ${EYE_Y + 10} q-4 6 0 9 q4 -3 0 -9 Z`}
          initial={{ y: 0, opacity: 0 }}
          animate={still ? { y: 4, opacity: 1 } : { y: [0, 22], opacity: [0, 1, 0] }}
          transition={still ? { duration: 0 } : { ...loop, duration: 1.4, delay: i * 0.6 }}
        />
      ))}
    </g>
  );
}

export function Hungry({ still }: { still: boolean }) {
  return (
    <g>
      <g>
        <path
          d="M14 176 h40 q-3 14 -20 14 q-17 0 -20 -14 Z"
          fill="var(--surface-2)"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeOpacity={0.5}
        />
        <ellipse cx={34} cy={176} rx={20} ry={3.5} fill="currentColor" opacity={0.25} />
      </g>
      <m.path
        d="M156 50 q-5 8 0 11 q5 -3 0 -11 Z"
        fill="#9cc9e8"
        initial={{ opacity: still ? 1 : 0 }}
        animate={still ? {} : { opacity: [0, 1, 0], y: [0, 10] }}
        transition={{ ...loop, duration: 1.8, repeatDelay: 1 }}
      />
      <m.text
        x={128}
        y={168}
        fontSize={11}
        fontWeight={700}
        fill="currentColor"
        className="font-brand"
        initial={{ opacity: still ? 0.8 : 0 }}
        animate={still ? {} : { opacity: [0, 1, 1, 0], x: [128, 130, 126, 128] }}
        transition={{ ...loop, duration: 2.2, repeatDelay: 1.4 }}
      >
        grr…
      </m.text>
    </g>
  );
}

const HEARTS = [
  { x: 40, y: 46, delay: 0 },
  { x: 162, y: 38, delay: 1.1 },
];

export function Hearts({ still }: { still: boolean }) {
  if (still) return null;
  return (
    <g fill={BLUSH}>
      {HEARTS.map(({ x, y, delay }) => (
        <m.path
          key={x}
          d={`M${x} ${y} c-3 -4 -9 -2 -7 3 c1 3 7 7 7 7 s6 -4 7 -7 c2 -5 -4 -7 -7 -3 Z`}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], y: [6, -14] }}
          transition={{ ...loop, duration: 2.4, delay, repeatDelay: 2.2 }}
        />
      ))}
    </g>
  );
}

export function Zzz({ still }: { still: boolean }) {
  return (
    <g fill="currentColor" className="font-brand" fontWeight={600}>
      {[0, 1].map((i) => (
        <m.text
          key={i}
          x={150 + i * 14}
          y={40 - i * 16}
          fontSize={18 - i * 4}
          initial={{ opacity: still ? 0.8 : 0, y: 0 }}
          animate={still ? {} : { opacity: [0, 1, 0], y: [8, -10] }}
          transition={{ ...loop, duration: 2.4, delay: i * 1.2 }}
        >
          z
        </m.text>
      ))}
    </g>
  );
}

const SPARKLES = [
  [28, 46],
  [172, 40],
  [22, 124],
  [178, 116],
] as const;

export function Sparkles({ still }: { still: boolean }) {
  return (
    <g fill="#e3b96a">
      {SPARKLES.map(([cx, cy], i) => (
        <m.path
          key={`${cx}-${cy}`}
          d={`M${cx} ${cy - 9} L${cx + 2.5} ${cy - 2.5} L${cx + 9} ${cy} L${cx + 2.5} ${cy + 2.5} L${cx} ${cy + 9} L${cx - 2.5} ${cy + 2.5} L${cx - 9} ${cy} L${cx - 2.5} ${cy - 2.5} Z`}
          initial={{ scale: still ? 1 : 0 }}
          animate={still ? {} : { scale: [0, 1.1, 0], rotate: [0, 45] }}
          transition={{ ...loop, duration: 1.2, delay: i * 0.25 }}
        />
      ))}
    </g>
  );
}

export function Coin({ still }: { still: boolean }) {
  return (
    <m.g
      initial={{ y: still ? 0 : -110, opacity: still ? 1 : 0 }}
      animate={still ? {} : { y: [-110, 0, 4], opacity: [0, 1, 0] }}
      transition={{ ...loop, duration: 1.6, times: [0, 0.75, 1], repeatDelay: 0.3 }}
    >
      <circle cx={100} cy={20} r={11} fill="#e3b96a" stroke="#b8862f" strokeWidth={2} />
      <text
        x={100}
        y={25}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill="#7a5517"
        fontFamily="sans-serif"
      >
        ₱
      </text>
    </m.g>
  );
}

export function CoverHooves({ show }: { show: boolean }) {
  return (
    <g>
      {EYES.map((cx, i) => (
        <m.g
          key={cx}
          initial={false}
          animate={show ? { y: 0, opacity: 1 } : { y: 70, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22, delay: i * 0.04 }}
        >
          <rect
            x={cx - 15}
            y={EYE_Y - 10}
            width={30}
            height={40}
            rx={14}
            fill="var(--pig)"
            stroke={BLUSH}
            strokeWidth={2}
          />
          <path
            d={`M${cx - 15} ${EYE_Y} Q${cx - 15} ${EYE_Y - 12} ${cx - 6} ${EYE_Y - 12} L${cx} ${EYE_Y - 5} L${cx + 6} ${EYE_Y - 12} Q${cx + 15} ${EYE_Y - 12} ${cx + 15} ${EYE_Y} Z`}
            fill={BLUSH}
          />
        </m.g>
      ))}
    </g>
  );
}
