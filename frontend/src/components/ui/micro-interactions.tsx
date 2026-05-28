import React from "react";
import { cn } from "@/lib/utils";

// Hover lift effect with subtle shadow increase
export function withHoverLift<T extends { className?: string }>(
  Component: React.ComponentType<T>
) {
  return (props: T) => (
    <Component
      {...props}
      className={cn(
        "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-2",
        props.className
      )}
    />
  );
}

// Press effect for buttons/interactive elements
export function withPressEffect<T extends { className?: string }>(
  Component: React.ComponentType<T>
) {
  return (props: T) => (
    <Component
      {...props}
      className={cn(
        "active:scale-[0.98] active:duration-100 transition-transform",
        props.className
      )}
    />
  );
}

// Ripple effect for buttons
export function Ripple({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute inset-0 rounded-md bg-foreground/10 animate-in fade-in",
        className
      )}
    />
  );
}

// Focus ring that follows element
export const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Smooth fade-in animation with delay support
export function FadeIn({
  children,
  delay = 0,
  duration = 200,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("animate-in fade-in", className)}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Staggered list animation
export function StaggerList({
  children,
  delay = 50,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {React.Children.map(children, (child, i) => (
        <FadeIn key={i} delay={i * delay}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}

// Magnetic button effect (subtle movement towards cursor)
export function MagneticButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Subtle movement (10% of distance max)
    setPosition({ x: x * 0.1, y: y * 0.1 });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={ref}
      className={cn(
        "relative transition-transform duration-300 ease-out will-change-transform",
        className
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
}

// Progress bar with smooth animation
export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false,
}: {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full bg-foreground transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-background">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// Shimmer effect for loading
export function Shimmer({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "subtle" | "strong";
}) {
  const variants = {
    default: "from-background via-muted to-background",
    subtle: "from-background via-muted/50 to-background",
    strong: "from-background via-muted/80 to-background",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 -translate-x-full bg-gradient-to-r shimmer",
          variants[variant]
        )}
      />
    </div>
  );
}

// Tooltip with smooth animation
export function Tooltip({
  content,
  children,
  side = "top",
  delay = 200,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-2.5 py-1 text-xs font-medium text-background bg-foreground rounded-md shadow-lg animate-in fade-in zoom-in-95",
            positionClasses[side]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// Skeleton with shimmer
export function ShimmerSkeleton({
  className,
  width,
  height,
  rounded = "md",
}: {
  className?: string;
  width?: string;
  height?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}) {
  const roundedClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  return (
    <div
      className={cn(
        "bg-muted shimmer",
        roundedClasses[rounded],
        className
      )}
      style={{ width, height }}
    />
  );
}