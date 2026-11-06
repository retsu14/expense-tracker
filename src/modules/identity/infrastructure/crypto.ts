import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { hash, verify } from "@node-rs/argon2";

import type { PasswordHasher, TokenService } from "@/modules/identity/domain/ports";

const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 };

export const argon2Hasher: PasswordHasher = {
  hash: (password) => hash(password, ARGON2_OPTIONS),
  verify: async (digest, password) => {
    try {
      return await verify(digest, password);
    } catch {
      return false;
    }
  },
};

export const cryptoTokens: TokenService = {
  generateToken: () => randomBytes(32).toString("base64url"),
  hashToken: (token) => createHash("sha256").update(token).digest("hex"),
  randomBytes: (size) => new Uint8Array(randomBytes(size)),
};
