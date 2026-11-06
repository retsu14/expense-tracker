"use client";

import { AnimatePresence, motion } from "motion/react";

type SpeechBubbleProps = {
  text: string | null;
  bubbleKey: number;
  onDismiss: () => void;
};

export function SpeechBubble({ text, bubbleKey, onDismiss }: SpeechBubbleProps) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2"
    >
      <AnimatePresence mode="wait">
        {text && (
          <motion.button
            key={bubbleKey}
            type="button"
            onClick={onDismiss}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="pointer-events-auto relative max-w-56 cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-2 text-center font-brand text-body-sm font-medium whitespace-nowrap text-fg shadow-lg"
          >
            {text}
            <span
              aria-hidden
              className="absolute top-full left-1/2 -mt-1.5 size-3 -translate-x-1/2 rotate-45 border-r border-b border-border bg-surface-2"
            />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
