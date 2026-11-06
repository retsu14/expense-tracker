"use client";

import { motion, type MotionValue } from "motion/react";

import type { Mood } from "@/modules/mascot/domain/mood";

const INK = "#2b1d22";
const DEEP = "#8a3f52";
const EYES = [74, 126] as const;
const loop = { repeat: Infinity, ease: "easeInOut" } as const;

type EyesProps = {
  mood: Mood;
  squint: boolean;
  blinking: boolean;
  x: MotionValue<number>;
  y: MotionValue<number>;
};

export function Eyes({ mood, squint, blinking, x, y }: EyesProps) {
  if (mood === "sleeping") {
    return (
      <g stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none">
        {EYES.map((cx) => (
          <path key={cx} d={`M${cx - 8} 98 Q${cx} 105 ${cx + 8} 98`} />
        ))}
      </g>
    );
  }

  if (squint || mood === "celebrating") {
    return (
      <g stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none">
        {EYES.map((cx) => (
          <path key={cx} d={`M${cx - 8} 101 Q${cx} 90 ${cx + 8} 101`} />
        ))}
      </g>
    );
  }

  return (
    <motion.g style={{ x, y }}>
      {EYES.map((cx) => (
        <motion.g key={cx} animate={{ scaleY: blinking ? 0.1 : 1 }} transition={{ duration: 0.08 }}>
          <ellipse cx={cx} cy={98} rx={7} ry={9} fill={INK} />
          <circle cx={cx + 2.5} cy={94.5} r={2.6} fill="#fff" />
          <circle cx={cx - 2.5} cy={102} r={1.2} fill="#fff" opacity={0.7} />
        </motion.g>
      ))}
    </motion.g>
  );
}

export function Brows({ mood }: { mood: Mood }) {
  if (mood !== "worried" && mood !== "sad") return null;
  const tilt = mood === "sad" ? 8 : 5;
  return (
    <g stroke={INK} strokeWidth={3} strokeLinecap="round">
      <path d={`M63 ${84 + tilt} L83 ${84 - tilt / 2}`} />
      <path d={`M117 ${84 - tilt / 2} L137 ${84 + tilt}`} />
    </g>
  );
}

export function Mouth({ mood }: { mood: Mood }) {
  const stroke = { stroke: DEEP, strokeWidth: 3, strokeLinecap: "round", fill: "none" } as const;
  switch (mood) {
    case "worried":
      return <path d="M88 147 Q94 143 100 147 Q106 151 112 147" {...stroke} />;
    case "sad":
      return <path d="M90 151 Q100 142 110 151" {...stroke} />;
    case "celebrating":
      return (
        <g>
          <path d="M87 142 Q100 162 113 142 Z" fill={DEEP} />
          <path d="M93 151 Q100 157 107 151 Q100 148 93 151 Z" fill="#e8879e" />
        </g>
      );
    case "sleeping":
      return <ellipse cx={100} cy={147} rx={3} ry={3.5} fill={DEEP} />;
    case "munch":
      return (
        <motion.ellipse
          cx={100}
          cy={147}
          rx={7}
          fill={DEEP}
          initial={{ ry: 2 }}
          animate={{ ry: [2, 6, 2] }}
          transition={{ ...loop, duration: 0.35 }}
        />
      );
    case "happy":
      return <path d="M89 143 Q100 153 111 143" {...stroke} />;
  }
}

export function Tears({ still }: { still: boolean }) {
  return (
    <g fill="#9cc9e8">
      {EYES.map((cx, i) => (
        <motion.path
          key={cx}
          d={`M${cx} 108 q-4 6 0 9 q4 -3 0 -9 Z`}
          initial={{ y: 0, opacity: 0 }}
          animate={still ? { y: 4, opacity: 1 } : { y: [0, 22], opacity: [0, 1, 0] }}
          transition={still ? { duration: 0 } : { ...loop, duration: 1.4, delay: i * 0.6 }}
        />
      ))}
    </g>
  );
}

export function Zzz({ still }: { still: boolean }) {
  return (
    <g fill="currentColor" className="font-brand" fontWeight={600}>
      {[0, 1].map((i) => (
        <motion.text
          key={i}
          x={150 + i * 14}
          y={58 - i * 16}
          fontSize={18 - i * 4}
          initial={{ opacity: still ? 0.8 : 0, y: 0 }}
          animate={still ? {} : { opacity: [0, 1, 0], y: [8, -10] }}
          transition={{ ...loop, duration: 2.4, delay: i * 1.2 }}
        >
          z
        </motion.text>
      ))}
    </g>
  );
}

const SPARKLES = [
  [30, 50],
  [170, 44],
  [22, 128],
  [178, 120],
] as const;

export function Sparkles({ still }: { still: boolean }) {
  return (
    <g fill="#e3b96a">
      {SPARKLES.map(([cx, cy], i) => (
        <motion.path
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
    <motion.g
      initial={{ y: still ? 0 : -110, opacity: still ? 1 : 0 }}
      animate={still ? {} : { y: [-110, 0, 4], opacity: [0, 1, 0] }}
      transition={{ ...loop, duration: 1.6, times: [0, 0.75, 1], repeatDelay: 0.3 }}
    >
      <circle cx={100} cy={22} r={11} fill="#e3b96a" stroke="#b8862f" strokeWidth={2} />
      <text
        x={100}
        y={27}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill="#7a5517"
        fontFamily="sans-serif"
      >
        ₱
      </text>
    </motion.g>
  );
}

export function CoverHooves({ show }: { show: boolean }) {
  return (
    <g>
      {EYES.map((cx, i) => (
        <motion.g
          key={cx}
          initial={false}
          animate={show ? { y: 0, opacity: 1 } : { y: 70, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22, delay: i * 0.04 }}
        >
          <rect
            x={cx - 15}
            y={88}
            width={30}
            height={40}
            rx={14}
            fill="var(--pig)"
            stroke="#e8879e"
            strokeWidth={2}
          />
          <path
            d={`M${cx - 15} 98 Q${cx - 15} 86 ${cx - 6} 86 L${cx} 93 L${cx + 6} 86 Q${cx + 15} 86 ${cx + 15} 98 Z`}
            fill="#e8879e"
          />
        </motion.g>
      ))}
    </g>
  );
}
