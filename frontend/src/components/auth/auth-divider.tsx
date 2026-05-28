import { cn } from "@/lib/utils";

interface AuthDividerProps {
  text: string;
  className?: string;
}

export function AuthDivider({ text, className }: AuthDividerProps) {
  return (
    <div className={cn("relative my-6", className)}>
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/60" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}
