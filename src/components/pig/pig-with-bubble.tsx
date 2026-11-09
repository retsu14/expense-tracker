"use client";

import { AnimatePresence, m } from "motion/react";
import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Pig } from "./pig";

const SHOW_MS = 5000;

type Message = { key: number; text: string };

export function useSpeech() {
  const [message, setMessage] = useState<Message | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage({ key: Date.now(), text });
    timer.current = setTimeout(() => {
      setMessage(null);
    }, SHOW_MS);
  }, []);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setMessage(null);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  return { message, say, dismiss };
}

export function SpeechSlot({
  message,
  onDismiss,
  tail = "top",
  className,
}: {
  message: Message | null;
  onDismiss: () => void;
  tail?: "top" | "left" | "auto";
  className?: string;
}) {
  return (
    <div aria-live="polite" className={cn("flex", className)}>
      <AnimatePresence mode="wait">
        {message && (
          <m.button
            key={message.key}
            type="button"
            onClick={onDismiss}
            initial={{ opacity: 0, scale: 0.94, ...(tail === "left" ? { x: -6 } : { y: -6 }) }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={cn(
              "relative max-w-full cursor-pointer rounded-xl border border-border bg-surface-2 px-3 py-2 font-brand text-body-sm font-medium text-fg shadow-md",
              tail === "top" && "mt-1.5 text-center text-balance",
              tail === "left" && "ml-1.5 text-left",
              tail === "auto" &&
                "mt-1.5 text-center text-balance @3xs:mt-0 @3xs:ml-1.5 @3xs:text-left",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute size-3 rotate-45 border-border bg-surface-2",
                tail === "left"
                  ? "top-4 right-full -mr-1.5 border-b border-l"
                  : "bottom-full left-1/2 -mb-1.5 -translate-x-1/2 border-t border-l",
                tail === "auto" &&
                  "@3xs:top-4 @3xs:right-full @3xs:bottom-auto @3xs:left-auto @3xs:mr-[-0.375rem] @3xs:mb-0 @3xs:translate-x-0 @3xs:border-t-0 @3xs:border-b",
              )}
            />
            <span className="line-clamp-3">{message.text}</span>
          </m.button>
        )}
      </AnimatePresence>
    </div>
  );
}

type Props = Omit<ComponentProps<typeof Pig>, "onSay"> & { bubbleClassName?: string };

export function PigWithBubble({ bubbleClassName, className, ...pig }: Props) {
  const { message, say, dismiss } = useSpeech();
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Pig {...pig} onSay={say} />
      <SpeechSlot
        message={message}
        onDismiss={dismiss}
        className={cn("h-14 w-full max-w-[17rem] items-start justify-center", bubbleClassName)}
      />
    </div>
  );
}
