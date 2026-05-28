import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventErrorStateProps {
  onRetry?: () => void;
}

export function EventErrorState({ onRetry }: EventErrorStateProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Unable to load events
          </h2>
          <p className="text-muted-foreground">
            Something went wrong while fetching the events. Please try again later.
          </p>
        </div>

        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
