import { Ticket } from "lucide-react";
import Link from "next/link";

interface AuthLogoProps {
  variant?: "default" | "compact";
}

export function AuthLogo({ variant = "default" }: AuthLogoProps) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3 transition-opacity hover:opacity-80">
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-foreground text-background transition-all duration-300",
          "group-hover:scale-105",
          variant === "default" ? "h-12 w-12" : "h-10 w-10"
        )}
      >
        <Ticket className={cn(variant === "default" ? "h-6 w-6" : "h-5 w-5")} strokeWidth={2} />
      </div>
      <div className={cn("font-display", variant === "default" ? "space-y-0.5" : "")}>
        <span className="text-lg font-semibold tracking-tight">SeatFlow</span>
        {variant === "default" && (
          <p className="text-xs text-muted-foreground">Premium Ticket Booking</p>
        )}
      </div>
    </Link>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
