export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_REFRESH_MS = 15 * 24 * 60 * 60 * 1000;
export const SESSION_TOUCH_MS = 60 * 60 * 1000;

export type Session = {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  lastSeenAt: Date;
  userAgent: string | null;
};

export function isExpired(session: Session, now: Date) {
  return session.expiresAt.getTime() <= now.getTime();
}

export function shouldRefresh(session: Session, now: Date) {
  return session.expiresAt.getTime() - now.getTime() < SESSION_REFRESH_MS;
}

export function shouldTouch(session: Session, now: Date) {
  return now.getTime() - session.lastSeenAt.getTime() > SESSION_TOUCH_MS;
}

export function newExpiry(now: Date) {
  return new Date(now.getTime() + SESSION_TTL_MS);
}
