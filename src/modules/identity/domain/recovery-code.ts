export const RECOVERY_CODE_COUNT = 8;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GROUP = 5;

export function generateRecoveryCode(randomBytes: (size: number) => Uint8Array) {
  const bytes = randomBytes(GROUP * 2);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, GROUP)}-${chars.slice(GROUP)}`;
}

export function normalizeRecoveryCode(input: string) {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length !== GROUP * 2) return null;
  return `${raw.slice(0, GROUP)}-${raw.slice(GROUP)}`;
}
