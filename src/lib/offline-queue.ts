export type QueuedTransaction = {
  key: string;
  userId: string;
  input: Record<string, unknown>;
  label: string;
  amount: number;
  kind: "expense" | "income" | "transfer";
  createdAt: number;
  error?: string;
};

const DB_NAME = "oink-offline";
const STORE = "transactions";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error ?? new Error("IndexedDB unavailable"));
    };
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error ?? new Error("IndexedDB request failed"));
    };
    tx.oncomplete = () => {
      db.close();
    };
  });
}

export const offlineQueue = {
  async add(item: QueuedTransaction) {
    await run("readwrite", (s) => s.put(item));
  },
  async enqueue(item: Omit<QueuedTransaction, "createdAt">) {
    await run("readwrite", (s) => s.put({ ...item, createdAt: Date.now() }));
  },
  async list(userId: string) {
    const all = await run<QueuedTransaction[]>(
      "readonly",
      (s) => s.getAll() as IDBRequest<QueuedTransaction[]>,
    );
    return all.filter((i) => i.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
  },
  async remove(key: string) {
    await run("readwrite", (s) => s.delete(key));
  },
};

export type SendResult = { ok: true } | { ok: false; retry: boolean; message: string };

export async function processQueue(
  items: QueuedTransaction[],
  send: (item: QueuedTransaction) => Promise<SendResult>,
  store: {
    remove: (key: string) => Promise<void>;
    add: (item: QueuedTransaction) => Promise<void>;
  },
) {
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    if (item.error) continue;
    const res = await send(item);
    if (res.ok) {
      await store.remove(item.key);
      synced++;
    } else if (res.retry) {
      break;
    } else {
      await store.add({ ...item, error: res.message });
      failed++;
    }
  }
  return { synced, failed };
}

export function isNetworkError(e: unknown) {
  return (
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (e instanceof TypeError && /fetch|network|load failed/i.test(e.message))
  );
}
