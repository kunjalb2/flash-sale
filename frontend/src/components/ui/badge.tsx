import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground hover:bg-muted/80",
        primary: "bg-foreground text-background hover:bg-foreground/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        success: "bg-success/10 text-success hover:bg-success/20",
        warning: "bg-warning/10 text-warning hover:bg-warning/20",
        info: "bg-info/10 text-info hover:bg-info/20",
        outline: "text-foreground border border-input hover:bg-muted",
        ghost: "text-foreground hover:bg-muted/50",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      dot: {
        true: "pl-1.5",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      dot: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean;
  onRemove?: () => void;
  dot?: boolean;
  dotColor?: string;
}

function Badge({ className, variant, size, removable, onRemove, dot, dotColor, children, ...props }: BadgeProps) {
  const colors: Record<string, string> = {
    default: "bg-muted-foreground",
    primary: "bg-background",
    secondary: "bg-secondary-foreground",
    destructive: "bg-destructive",
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
    outline: "bg-foreground",
    ghost: "bg-foreground",
  };

  return (
    <div className={cn(badgeVariants({ variant, size, dot }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor || colors[variant || "default"])} />}
      {children}
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export { Badge, badgeVariants };