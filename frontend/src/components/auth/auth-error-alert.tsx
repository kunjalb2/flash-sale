import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthErrorAlertProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function AuthErrorAlert({ message, onDismiss, className }: AuthErrorAlertProps) {
  if (!message) return null;

  return (
    <Alert
      variant="destructive"
      className={cn(
        "animate-in fade-in slide-in-from-top-2",
        "border-destructive/50 bg-destructive/5",
        className
      )}
    >
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-sm font-medium">{message}</AlertDescription>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto -mr-1.5 -my-1.5 h-6 w-6 opacity-50 hover:opacity-100"
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Dismiss</span>
        </Button>
      )}
    </Alert>
  );
}
