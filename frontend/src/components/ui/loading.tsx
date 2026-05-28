import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
}

const loadingSizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", loadingSizes[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({ message = "Loading...", className }: PageLoadingProps) {
  return (
    <div className={cn("flex min-h-[400px] items-center justify-center", className)}>
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

interface InlineLoadingProps {
  size?: "sm" | "md";
  className?: string;
}

export function InlineLoading({ size = "sm", className }: InlineLoadingProps) {
  return <LoadingSpinner size={size} className={cn("h-full", className)} />;
}

interface ButtonLoadingProps {
  size?: "sm" | "md";
  className?: string;
}

export function ButtonLoading({ size = "sm", className }: ButtonLoadingProps) {
  return <LoadingSpinner size={size} className={className} />;
}