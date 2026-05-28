import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Lock, Mail, Search, User } from "lucide-react";

type InputVariant = "default" | "filled" | "underline";
type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  error?: string;
  helperText?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftIconClick?: () => void;
  onRightIconClick?: () => void;
  onValueChange?: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const inputVariants = {
  default: "border border-input bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  filled: "border border-transparent bg-muted focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-input",
  underline: "border-b-2 border-input border-t-0 border-x-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-ring",
};

const inputSizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      variant = "default",
      size = "md",
      label,
      error,
      helperText,
      showCharacterCount,
      maxLength,
      leftIcon,
      rightIcon,
      onLeftIconClick,
      onRightIconClick,
      onValueChange,
      inputRef,
      value,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const internalRef = React.useRef<HTMLInputElement>(null);
    const effectiveRef = inputRef || internalRef;

    const isPassword = type === "password";
    const isError = !!error;
    const isSuccess = !isError && !!value && props.required;

    const togglePassword = () => setShowPassword(!showPassword);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onValueChange) {
        onValueChange(e.target.value);
      }
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const currentLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              "block text-sm font-medium mb-1.5 transition-colors",
              isError && "text-destructive",
              isSuccess && "text-success"
            )}
          >
            {label}
            {props.required && <span className="text-muted-foreground ml-0.5">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <button
              type="button"
              onClick={onLeftIconClick}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors",
                onLeftIconClick && "hover:text-foreground cursor-pointer",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              disabled={disabled || !onLeftIconClick}
              tabIndex={-1}
            >
              {leftIcon}
            </button>
          )}

          <input
            type={isPassword && showPassword ? "text" : type}
            className={cn(
              "flex w-full rounded-md transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              inputVariants[variant],
              inputSizes[size],
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              isError && "border-destructive focus-visible:ring-destructive",
              isSuccess && "border-success focus-visible:ring-success",
              className
            )}
            ref={(node) => {
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
              if (effectiveRef.current) {
                effectiveRef.current = node;
              }
            }}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
            disabled={disabled}
            {...props}
          />

          {rightIcon && (
            <button
              type="button"
              onClick={onRightIconClick || (isPassword ? togglePassword : undefined)}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors",
                (onRightIconClick || isPassword) && "hover:text-foreground cursor-pointer",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              disabled={disabled}
              tabIndex={-1}
            >
              {rightIcon}
            </button>
          )}

          {isPassword && !rightIcon && (
            <button
              type="button"
              onClick={togglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={disabled}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}

          {isSuccess && !isPassword && !rightIcon && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
          )}

          {isError && !rightIcon && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
          )}
        </div>

        {(helperText || error || (showCharacterCount && maxLength)) && (
          <div className="flex items-start justify-between mt-1.5">
            <p className={cn("text-xs", isError ? "text-destructive" : "text-muted-foreground")}>
              {error || helperText}
            </p>
            {showCharacterCount && maxLength && (
              <p className={cn("text-xs", currentLength > maxLength && "text-destructive", "text-muted-foreground")}>
                {currentLength}/{maxLength}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

// Convenience input components with icons
export const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "leftIcon">>((props, ref) => (
  <Input {...props} ref={ref} leftIcon={<Search className="h-4 w-4" />} />
));
SearchInput.displayName = "SearchInput";

export const EmailInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "leftIcon" | "type">>((props, ref) => (
  <Input {...props} ref={ref} type="email" leftIcon={<Mail className="h-4 w-4" />} />
));
EmailInput.displayName = "EmailInput";

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type">>((props, ref) => (
  <Input {...props} ref={ref} type="password" />
));
PasswordInput.displayName = "PasswordInput";

export const UsernameInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "leftIcon" | "type">>((props, ref) => (
  <Input {...props} ref={ref} type="text" leftIcon={<User className="h-4 w-4" />} />
));
UsernameInput.displayName = "UsernameInput";

export { Input };