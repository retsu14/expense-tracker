import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-body-sm text-fg-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-fg underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
