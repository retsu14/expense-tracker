import Image from "next/image";

import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  src: string | null;
  size?: number;
  className?: string;
};

export function Avatar({ name, src, size = 36, className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-pig/80 font-semibold text-[#2b1d22]",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
