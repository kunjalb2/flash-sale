import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Page transition wrapper
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 duration-300",
        className
      )}
    >
      {children}
    </div>
  );
}

// List item staggered animation
export function ListItemAnimation({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4",
        className
      )}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Modal/Dialog animation
export function ModalAnimation({
  children,
  isOpen,
  className,
}: {
  children: ReactNode;
  isOpen: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        isOpen
          ? "animate-in fade-in zoom-in-95 duration-200"
          : "animate-out fade-out zoom-out-95 duration-150",
        className
      )}
    >
      {children}
    </div>
  );
}

// Dropdown animation
export function DropdownAnimation({
  children,
  isOpen,
  className,
}: {
  children: ReactNode;
  isOpen: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        isOpen
          ? "animate-in fade-in slide-in-from-top-2 duration-150"
          : "animate-out fade-out slide-out-to-top-2 duration-100",
        className
      )}
    >
      {children}
    </div>
  );
}

// Card hover effect with subtle lift
export function CardHover({
  children,
  className,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        !disabled && "hover:-translate-y-0.5 hover:shadow-2 active:scale-[0.99]",
        disabled && "opacity-50",
        className
      )}
    >
      {children}
    </div>
  );
}

// Pulse animation for live indicators
export function Pulse({
  children,
  className,
  intensity = "medium",
}: {
  children: ReactNode;
  className?: string;
  intensity?: "subtle" | "medium" | "strong";
}) {
  const intensityClasses = {
    subtle: "pulse-subtle",
    medium: "pulse-subtle",
    strong: "pulse-subtle",
  };

  return (
    <div className={cn(intensityClasses[intensity], className)}>
      {children}
    </div>
  );
}

// Shake animation for errors
export function Shake({
  children,
  trigger,
  className,
}: {
  children: ReactNode;
  trigger: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        trigger && "animate-[shake_0.5s_ease-in-out]",
        className
      )}
    >
      {children}
    </div>
  );
}