export const SESSION_COOKIE = "oink_session";
export const SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export const sessionCookieOptions = () =>
  ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  }) as const;
