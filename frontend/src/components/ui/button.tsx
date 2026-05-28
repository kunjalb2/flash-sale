import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-1 hover:bg-foreground/90 hover:shadow-2 active:bg-foreground/95 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-1 hover:bg-destructive/90 hover:shadow-2 active:bg-destructive/95 active:scale-[0.98]",
        secondary:
          "bg-muted text-foreground shadow-1 hover:bg-muted/90 hover:shadow-2 active:bg-muted/95 active:scale-[0.98]",
        ghost: "hover:bg-muted hover:text-foreground active:bg-muted/80",
        link: "text-foreground underline-offset-4 hover:underline focus:underline",
        success:
          "bg-success text-success-foreground shadow-1 hover:bg-success/90 hover:shadow-2 active:bg-success/95 active:scale-[0.98]",
        warning:
          "bg-warning text-warning-foreground shadow-1 hover:bg-warning/90 hover:shadow-2 active:bg-warning/95 active:scale-[0.98]",
        outline:
          "border border-input bg-background shadow-1 hover:bg-accent hover:text-accent-foreground hover:shadow-2 active:bg-accent/80 active:scale-[0.98]",
      },
      size: {
        xs: "h-7 px-2 text-xs",
        sm: "h-9 px-3 text-sm rounded-sm",
        md: "h-10 px-4 text-sm rounded-md",
        lg: "h-12 px-6 text-base rounded-md",
        xl: "h-14 px-8 text-lg rounded-md",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-sm",
        "icon-lg": "h-12 w-12 rounded-md",
      },
      state: {
        default: "",
        loading: "",
        success: "",
        error: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      state: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  success?: boolean;
  successText?: string;
  error?: boolean;
  errorText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      success = false,
      successText,
      error = false,
      errorText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const isLoading = loading && !success && !error;
    const isDisabled = disabled || isLoading;

    const getState = () => {
      if (isLoading) return "loading";
      if (success) return "success";
      if (error) return "error";
      return "default";
    };

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, state: getState(), className }),
          isLoading && "cursor-not-allowed",
          success && "bg-success text-success-foreground",
          error && "bg-destructive text-destructive-foreground"
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {success && !isLoading && <CheckCircle2 className="h-4 w-4" />}
            {error && !isLoading && <AlertCircle className="h-4 w-4" />}
            {isLoading && loadingText ? loadingText : success && successText ? successText : error && errorText ? errorText : children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };