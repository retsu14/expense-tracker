import { AuthPig } from "@/components/auth/auth-pig";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <AuthPig />
        <div className="mt-2 rounded-xl border border-border bg-surface p-6 md:p-8">{children}</div>
      </div>
    </main>
  );
}
