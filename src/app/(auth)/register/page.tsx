import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";
import { FormAlert } from "@/components/forms/form-alert";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { deleted } = await searchParams;
  return (
    <>
      {deleted && (
        <div className="mb-6">
          <FormAlert tone="info">Your account was deleted. Oink will miss you! 🐷</FormAlert>
        </div>
      )}
      <RegisterForm />
      <p className="mt-6 text-center text-body-sm text-fg-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-fg underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
