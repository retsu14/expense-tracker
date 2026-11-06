"use client";

import { useEffect, useState } from "react";

export function useBlink(enabled: boolean) {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(
        () => {
          setBlinking(true);
          timer = setTimeout(() => {
            setBlinking(false);
            schedule();
          }, 130);
        },
        2200 + Math.random() * 3800,
      );
    };

    schedule();
    return () => {
      clearTimeout(timer);
    };
  }, [enabled]);

  return blinking;
}
