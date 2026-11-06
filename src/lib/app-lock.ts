const ITERATIONS = 150_000;
const key = (userId: string) => `oink-lock:${userId}`;
const UNLOCK_KEY = "oink-unlocked-at";
export const RELOCK_MS = 5 * 60_000;

type Stored = { salt: string; hash: string; iterations: number };

const toB64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(
    String.fromCharCode(
      ...new Uint8Array(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)),
    ),
  );
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    256,
  );
  return toB64(bits);
}

export function isValidPin(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

export function hasPin(userId: string) {
  try {
    return localStorage.getItem(key(userId)) !== null;
  } catch {
    return false;
  }
}

export async function setPin(userId: string, pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const stored: Stored = {
    salt: toB64(salt),
    hash: await derive(pin, salt, ITERATIONS),
    iterations: ITERATIONS,
  };
  localStorage.setItem(key(userId), JSON.stringify(stored));
  markUnlocked();
}

export async function verifyPin(userId: string, pin: string) {
  const raw = localStorage.getItem(key(userId));
  if (!raw) return true;
  const stored = JSON.parse(raw) as Stored;
  const hash = await derive(pin, fromB64(stored.salt), stored.iterations);
  return hash === stored.hash;
}

export function clearPin(userId: string) {
  localStorage.removeItem(key(userId));
  sessionStorage.removeItem(UNLOCK_KEY);
}

export function markUnlocked() {
  try {
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
}

export function needsUnlock(userId: string) {
  if (!hasPin(userId)) return false;
  try {
    const at = Number(sessionStorage.getItem(UNLOCK_KEY) ?? "0");
    return Date.now() - at > RELOCK_MS;
  } catch {
    return true;
  }
}
