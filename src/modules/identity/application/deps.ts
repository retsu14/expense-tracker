import type {
  MediaStorage,
  PasswordHasher,
  RateLimiter,
  RecoveryCodeRepository,
  SessionRepository,
  TokenService,
  UserRepository,
} from "@/modules/identity/domain/ports";
import type { Clock } from "@/shared/kernel/clock";

export type IdentityDeps = {
  users: UserRepository;
  sessions: SessionRepository;
  recoveryCodes: RecoveryCodeRepository;
  hasher: PasswordHasher;
  tokens: TokenService;
  rateLimiter: RateLimiter;
  storage: MediaStorage;
  clock: Clock;
  newId: () => string;
};

export type RequestMeta = {
  ip: string;
  userAgent: string | null;
};
