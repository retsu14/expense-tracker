"use client";

import { useMotionValue, useSpring } from "motion/react";
import { type RefObject, useEffect } from "react";

const MAX_X = 5;
const MAX_Y = 4;
const REACH = 240;

export function useEyeFollow(target: RefObject<Element | null>, enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 260, damping: 22 });
  const y = useSpring(rawY, { stiffness: 260, damping: 22 });

  useEffect(() => {
    if (!enabled) {
      rawX.set(0);
      rawY.set(0);
      return;
    }

    let idle: ReturnType<typeof setTimeout> | undefined;

    const onMove = (e: PointerEvent) => {
      const el = target.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.45);
      const reach = Math.min(1, Math.hypot(dx, dy) / REACH);
      const angle = Math.atan2(dy, dx);
      rawX.set(Math.cos(angle) * MAX_X * reach);
      rawY.set(Math.sin(angle) * MAX_Y * reach);
      clearTimeout(idle);
      idle = setTimeout(() => {
        rawX.set(0);
        rawY.set(0);
      }, 4000);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      clearTimeout(idle);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, [enabled, target, rawX, rawY]);

  return { x, y };
}
