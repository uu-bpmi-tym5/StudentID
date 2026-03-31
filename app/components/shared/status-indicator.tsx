import { cn } from "@/lib/utils";

type StatusVariant = "online" | "offline" | "warning" | "error";

interface StatusIndicatorProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
  pulse?: boolean;
}

const variantStyles: Record<StatusVariant, string> = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  warning: "bg-warning",
  error: "bg-destructive",
};

/**
 * Small colored dot for indicating status, inspired by hardware LEDs.
 */
export function StatusIndicator({
  variant,
  label,
  className,
  pulse = variant === "online",
}: StatusIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          variantStyles[variant],
          pulse && "pulse-online"
        )}
      />
      {label && (
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </span>
  );
}

