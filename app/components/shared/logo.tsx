import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * StudentID logo — an abstract NFC tap icon rendered as a geometric mark.
 * Uses the primary amber accent to evoke hardware indicator lights.
 */
export function Logo({ className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-sm bg-primary",
        sizes[size],
        className
      )}
    >
      {/* Signal arcs representing NFC */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[60%] w-[60%]"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="6"
          width="10"
          height="14"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.8"
          className="text-primary-foreground"
        />
        <path
          d="M16 8.5c1.2 1 2 2.5 2 4.25S17.2 15.5 16 16.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="text-primary-foreground"
        />
        <path
          d="M19 6c1.8 1.5 3 3.8 3 6.5s-1.2 5-3 6.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="text-primary-foreground opacity-60"
        />
      </svg>
    </div>
  );
}

export function LogoWithText({
  className,
  size = "md",
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={size} />
      <span className="font-heading text-lg font-bold tracking-tight">
        Student<span className="text-primary">ID</span>
      </span>
    </div>
  );
}

