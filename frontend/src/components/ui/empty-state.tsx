import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: {
    icon: "h-8 w-8",
    title: "text-base",
    description: "text-sm",
  },
  md: {
    icon: "h-12 w-12",
    title: "text-lg",
    description: "text-sm",
  },
  lg: {
    icon: "h-16 w-16",
    title: "text-xl",
    description: "text-base",
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const Icon = icon;
  const sizeClass = sizeClasses[size];
  
  const isComponent =
    typeof Icon === "function" ||
    (typeof Icon === "object" && Icon !== null && ("$$typeof" in Icon || "render" in Icon));
  
  const IconComponent = Icon as any;

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center space-y-4", className)}>
      {Icon && (
        <div className={cn(
          "flex items-center justify-center rounded-full bg-muted/50",
          sizeClass.icon
        )}>
          {isComponent ? <IconComponent className="h-1/2 w-1/2 text-muted-foreground" /> : Icon}
        </div>
      )}
      <div className="space-y-2 max-w-md">
        <h3 className={cn("font-semibold text-foreground", sizeClass.title)}>{title}</h3>
        {description && <p className={cn("text-muted-foreground", sizeClass.description)}>{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button variant={action.variant} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const errorMessage = typeof error === "string" ? error : error?.message;
  const displayDescription = description || errorMessage || "Please try again later.";

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center space-y-4", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <svg
          className="h-8 w-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{displayDescription}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}