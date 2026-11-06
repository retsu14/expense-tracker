import { describe, expect, it, vi } from "vitest";

import { processQueue, type QueuedTransaction } from "./offline-queue";

const item = (key: string, extra: Partial<QueuedTransaction> = {}): QueuedTransaction => ({
  key,
  userId: "u",
  input: { amount: "100" },
  label: key,
  amount: 10000,
  kind: "expense",
  createdAt: 1,
  ...extra,
});

describe("processQueue", () => {
  it("removes synced items, flags rejected ones and stops on network errors", async () => {
    const remove = vi.fn(() => Promise.resolve());
    const add = vi.fn(() => Promise.resolve());
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, retry: false, message: "Pick a wallet." })
      .mockResolvedValueOnce({ ok: false, retry: true, message: "offline" });

    const res = await processQueue([item("a"), item("b"), item("c"), item("d")], send, {
      remove,
      add,
    });

    expect(res).toEqual({ synced: 1, failed: 1 });
    expect(remove).toHaveBeenCalledWith("a");
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ key: "b", error: "Pick a wallet." }),
    );
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("skips items already marked with an error", async () => {
    const send = vi.fn();
    await processQueue([item("x", { error: "bad" })], send, {
      remove: () => Promise.resolve(),
      add: () => Promise.resolve(),
    });
    expect(send).not.toHaveBeenCalled();
  });
});
