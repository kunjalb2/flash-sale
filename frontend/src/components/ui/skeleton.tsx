import { cn } from "@/lib/utils";

type SkeletonVariant = "default" | "text" | "title" | "button" | "avatar" | "card" | "card-hover" | "image";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  lines?: number;
}

const skeletonVariants: Record<SkeletonVariant, string> = {
  default: "rounded-md bg-muted",
  text: "h-4 rounded bg-muted w-full",
  title: "h-6 rounded bg-muted w-1/2",
  button: "h-10 rounded-full bg-muted w-24",
  avatar: "h-10 w-10 rounded-full bg-muted",
  card: "rounded-xl bg-muted space-y-3 p-6",
  "card-hover": "rounded-xl bg-muted space-y-3 p-6 hover:shadow-2 transition-shadow duration-200",
  image: "aspect-video w-full rounded-lg bg-muted",
};

function Skeleton({ className, variant = "default", lines, ...props }: SkeletonProps) {
  if (variant === "card" || variant === "card-hover") {
    return (
      <div className={cn(skeletonVariants[variant], className)} {...props}>
        <div className="aspect-video w-full rounded-lg bg-muted shimmer" />
        <div className="space-y-2 pt-3">
          <div className="h-6 rounded bg-muted w-3/4" />
          <div className="h-4 rounded bg-muted w-1/2" />
          <div className="space-y-2 pt-2">
            <div className="h-4 rounded bg-muted w-full" />
            <div className="h-4 rounded bg-muted w-2/3" />
          </div>
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <div className="h-4 rounded bg-muted w-20" />
              <div className="h-6 rounded bg-muted w-16" />
            </div>
          </div>
          <div className="h-10 rounded bg-muted w-full" />
        </div>
      </div>
    );
  }

  if (lines && (variant === "text" || variant === "default")) {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 rounded bg-muted shimmer",
              i === lines - 1 ? "w-2/3" : "w-full"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        skeletonVariants[variant],
        (variant === "text" || variant === "title" || variant === "image") && "shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };