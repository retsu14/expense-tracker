import type { Session } from "./session";
import type { User } from "./user";

export type NewUser = Pick<User, "id" | "username" | "passwordHash" | "displayName">;

export type UserRepository = {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  usernameExists(username: string): Promise<boolean>;
  create(user: NewUser): Promise<User>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  updateProfile(id: string, patch: { displayName?: string; pigName?: string }): Promise<User>;
  updateAvatar(id: string, avatarKey: string | null): Promise<void>;
  delete(id: string): Promise<void>;
};

export type SessionRepository = {
  create(session: Session): Promise<void>;
  findWithUser(id: string): Promise<{ session: Session; user: User } | null>;
  listByUser(userId: string): Promise<Session[]>;
  update(id: string, patch: { expiresAt?: Date; lastSeenAt?: Date }): Promise<void>;
  delete(id: string): Promise<void>;
  deleteForUser(userId: string, id: string): Promise<boolean>;
  deleteAllForUser(userId: string, exceptId?: string): Promise<void>;
};

export type RecoveryCodeRepository = {
  replaceAll(userId: string, codeHashes: string[]): Promise<void>;
  consume(userId: string, codeHash: string): Promise<boolean>;
  countRemaining(userId: string): Promise<number>;
};

export type PasswordHasher = {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
};

export type TokenService = {
  generateToken(): string;
  hashToken(token: string): string;
  randomBytes(size: number): Uint8Array;
};

export type RateLimiter = {
  hit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; retryAfterMs: number }>;
  reset(key: string): Promise<void>;
};

export type MediaStorage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(
    key: string,
  ): Promise<{ body: ReadableStream<Uint8Array>; contentType: string; size: number } | null>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): Promise<string>;
};
