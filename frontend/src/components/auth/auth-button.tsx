import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
}

export function AuthButton({
  loading,
  loadingText = "Loading...",
  children,
  disabled,
  className,
  ...props
}: AuthButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn(
        "h-11 text-sm font-medium transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-offset-0",
        loading && "cursor-not-allowed opacity-70",
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
