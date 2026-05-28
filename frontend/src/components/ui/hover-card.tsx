import * as React from "react";
import { cn } from "@/lib/utils";

interface HoverCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
}

const HoverCard = React.forwardRef<HTMLDivElement, HoverCardProps>(
  ({ children, className, delay = 200, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout>();

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

    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </div>
    );
  }
);
HoverCard.displayName = "HoverCard";

interface HoverCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  show: boolean;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}

const HoverCardContent = React.forwardRef<HTMLDivElement, HoverCardContentProps>(
  ({ children, className, show, align = "center", side = "bottom", ...props }, ref) => {
    if (!show) return null;

    const alignmentClasses = {
      start: "left-0",
      center: "left-1/2 -translate-x-1/2",
      end: "right-0",
    };

    const sideClasses = {
      top: "bottom-full mb-2",
      bottom: "top-full mt-2",
      left: "right-full mr-2",
      right: "left-full ml-2",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 px-3 py-2 text-sm bg-background border rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-150",
          alignmentClasses[align],
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardContent };