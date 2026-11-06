import { passwordStrength } from "@/modules/identity/domain/password";
import { cn } from "@/lib/utils";

const LABELS = ["Too weak", "Weak", "Okay", "Good", "Strong"] as const;
const COLORS = ["bg-expense", "bg-expense", "bg-warning", "bg-income", "bg-income"] as const;

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return <span>At least 8 characters.</span>;
  const score = passwordStrength(password);
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full", i <= score ? COLORS[score] : "bg-border")}
          />
        ))}
      </div>
      <span className="w-16 text-right">{LABELS[score]}</span>
    </div>
  );
}
