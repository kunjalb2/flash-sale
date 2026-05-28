import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthInputProps extends React.ComponentProps<typeof Input> {
  label: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export function AuthInput({
  label,
  error,
  helperText,
  containerClassName,
  id,
  ...props
}: AuthInputProps) {
  return (
    <div className={cn("space-y-2", containerClassName)}>
      <Label
        htmlFor={id}
        className={cn(
          "text-sm font-medium transition-colors",
          error ? "text-destructive" : "text-foreground"
        )}
      >
        {label}
      </Label>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        className={cn(
          "h-11 transition-all duration-200",
          "focus:ring-2 focus:ring-offset-0",
          error
            ? "border-destructive focus:ring-destructive/20"
            : "focus:ring-primary/20"
        )}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${id}-helper`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}
