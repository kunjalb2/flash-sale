import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends React.ComponentProps<typeof Input> {
  label: string;
  error?: string;
  showStrength?: boolean;
  containerClassName?: string;
}

export function PasswordInput({
  label,
  error,
  showStrength = false,
  containerClassName,
  id,
  value = "",
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const strength = showStrength ? getPasswordStrength(String(value || "")) : null;

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={cn(
            "text-sm font-medium transition-colors",
            error ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
        </Label>
        {showStrength && strength && (
          <span
            className={cn(
              "text-xs font-medium transition-colors",
              strength.score <= 1 ? "text-destructive" : strength.score <= 2 ? "text-yellow-600" : "text-green-600"
            )}
          >
            {strength.label}
          </span>
        )}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "h-11 pr-10 transition-all duration-200",
            "focus:ring-2 focus:ring-offset-0",
            error
              ? "border-destructive focus:ring-destructive/20"
              : "focus:ring-primary/20"
          )}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full w-10 rounded-none hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
      {showStrength && strength && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all duration-300",
                strength.score <= 1
                  ? "w-1/3 bg-destructive"
                  : strength.score <= 2
                    ? "w-2/3 bg-yellow-500"
                    : "w-full bg-green-500"
              )}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">{strength.hint}</p>
        </div>
      )}
    </div>
  );
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  hint: string;
} | null {
  if (!password) return null;

  let score = 0;
  const hints: string[] = [];

  if (password.length >= 8) score += 1;
  else hints.push("Use 8+ characters");

  if (/[A-Z]/.test(password)) score += 1;
  else hints.push("Add uppercase letters");

  if (/[a-z]/.test(password)) score += 1;
  else hints.push("Add lowercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else hints.push("Add numbers");

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else hints.push("Add special characters");

  const maxScore = 3;
  const normalizedScore = Math.min(Math.floor((score / 5) * 3) + (password.length >= 8 ? 1 : 0), maxScore);

  return {
    score: normalizedScore,
    label: normalizedScore <= 1 ? "Weak" : normalizedScore <= 2 ? "Fair" : "Strong",
    hint: hints.length > 0 ? hints[0] : "Great password!",
  };
}
