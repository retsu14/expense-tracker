import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  expired: "Your session ended. Please sign in again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const notice = params.expired ? NOTICES.expired : undefined;

  return (
    <>
      <h1 className="text-h1-sm">Welcome back</h1>
      <p className="mt-1 mb-6 text-body-sm text-fg-muted">Sign in to keep your piggy bank happy.</p>
      <LoginForm next={next} notice={notice} />
      <p className="mt-6 text-center text-body-sm text-fg-muted">
        New here?{" "}
        <Link href="/register" className="font-semibold text-fg underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
