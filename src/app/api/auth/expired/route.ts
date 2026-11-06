import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/modules/identity/presentation/session-cookie";

export async function GET(request: NextRequest) {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login?expired=1", request.url));
}
