"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
  showIcon?: boolean;
  variant?: "default" | "compact" | "inline";
}

export function CountdownTimer({
  expiresAt,
  onExpire,
  className,
  showIcon = true,
  variant = "default",
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const distance = expiry - now;

      if (distance < 0) {
        setIsExpired(true);
        setTimeLeft(0);
        onExpire?.();
      } else {
        setTimeLeft(distance);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const isWarning = timeLeft < 60000 && timeLeft > 0;
  const isCritical = timeLeft < 30000 && timeLeft > 0;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-sm",
          isWarning && !isExpired && "text-amber-600 dark:text-amber-500",
          isCritical && !isExpired && "text-red-600 dark:text-red-500",
          isExpired && "text-muted-foreground",
          className
        )}
      >
        {showIcon && <Clock className="h-3.5 w-3.5" />}
        {isExpired ? (
          <span>Expired</span>
        ) : (
          <span>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "font-mono",
          isWarning && !isExpired && "text-amber-600 dark:text-amber-500",
          isCritical && !isExpired && "text-red-600 dark:text-red-500",
          isExpired && "text-muted-foreground",
          className
        )}
      >
        {isExpired ? "Expired" : `${minutes}:${seconds.toString().padStart(2, "0")}`}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
        isWarning && !isExpired && "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20",
        isCritical && !isExpired && "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
        !isWarning && !isCritical && !isExpired && "border-muted/50 bg-muted/50",
        isExpired && "border-muted bg-muted/30",
        className
      )}
    >
      {showIcon && (
        <Clock
          className={cn(
            "h-4 w-4",
            isWarning && !isExpired && "text-amber-600 dark:text-amber-500",
            isCritical && !isExpired && "text-red-600 dark:text-red-500",
            !isWarning && !isCritical && !isExpired && "text-muted-foreground",
            isExpired && "text-muted-foreground/50"
          )}
        />
      )}
      <div className="flex items-center gap-0.5">
        <span
          className={cn(
            "font-mono text-lg font-semibold",
            isWarning && !isExpired && "text-amber-700 dark:text-amber-400",
            isCritical && !isExpired && "text-red-700 dark:text-red-400",
            !isWarning && !isCritical && !isExpired && "text-foreground",
            isExpired && "text-muted-foreground"
          )}
        >
          {minutes.toString().padStart(2, "0")}
        </span>
        <span
          className={cn(
            "text-muted-foreground",
            isExpired && "text-muted-foreground/50"
          )}
        >
          :
        </span>
        <span
          className={cn(
            "font-mono text-lg font-semibold",
            isWarning && !isExpired && "text-amber-700 dark:text-amber-400",
            isCritical && !isExpired && "text-red-700 dark:text-red-400",
            !isWarning && !isCritical && !isExpired && "text-foreground",
            isExpired && "text-muted-foreground"
          )}
        >
          {seconds.toString().padStart(2, "0")}
        </span>
      </div>
      <span
        className={cn(
          "text-xs text-muted-foreground",
          isExpired && "text-muted-foreground/50"
        )}
      >
        {isExpired ? "reservation expired" : "remaining"}
      </span>
    </div>
  );
}
