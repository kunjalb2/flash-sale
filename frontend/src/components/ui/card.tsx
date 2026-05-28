import * as React from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "elevated" | "flat" | "interactive" | "borderless";
type CardSize = "sm" | "md" | "lg" | "none";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: CardSize;
  hover?: boolean;
}

const cardVariants = {
  default: "border shadow-1 bg-card text-card-foreground",
  elevated: "border-0 shadow-2 bg-card text-card-foreground",
  flat: "border border-border/50 bg-muted/30 text-card-foreground",
  interactive: "border shadow-1 bg-card text-card-foreground cursor-pointer hover:shadow-2 hover:-translate-y-0.5 transition-all duration-200",
  borderless: "border-0 shadow-none bg-transparent text-foreground",
};

const cardSizes = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  none: "p-0",
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", size = "md", hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl",
        cardVariants[variant],
        cardSizes[size],
        hover && "hover:shadow-2 hover:-translate-y-0.5 transition-all duration-200",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, noPadding, ...props }, ref) => (
    <div ref={ref} className={cn(!noPadding && "pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "center" | "right" | "space-between";
  noPadding?: boolean;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, align = "space-between", noPadding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        !noPadding && "pt-6",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        align === "left" && "justify-start",
        "flex items-center",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };