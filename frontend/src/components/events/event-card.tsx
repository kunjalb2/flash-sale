import { Calendar, Clock, MapPin, Ticket, Heart, HeartOff, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatDate, formatTime, formatCurrency } from "@/lib/utils";
import type { Event } from "@/types";

interface EventCardProps {
  event: Event;
  className?: string;
  layout?: "grid" | "list";
  onWishlistToggle?: (eventId: string) => void;
  isWishlisted?: boolean;
}

export function EventCard({ event, className, layout = "grid", onWishlistToggle, isWishlisted }: EventCardProps) {
  const isSoldOut = event.available_tickets === 0;
  const isEndingSoon = new Date(event.sale_end_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  const isSellingFast = event.available_tickets < event.total_tickets * 0.1 && event.available_tickets > 0;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle?.(event.id);
  };

  if (layout === "list") {
    return (
      <article
        className={cn(
          "group relative overflow-hidden rounded-2xl border bg-card transition-all duration-500 hover:shadow-3",
          className
        )}
      >
        <Link href={`/events/${event.id}`} className="absolute inset-0 z-0">
          <span className="sr-only">View {event.title}</span>
        </Link>

        <div className="flex flex-col sm:flex-row">
          <div className="relative aspect-video sm:aspect-[4/3] w-full sm:w-56 overflow-hidden bg-muted shrink-0">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                <Sparkles className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}

            <div className="absolute top-3 left-3 right-3 flex justify-between">
              <div className="flex gap-1.5">
                {isSoldOut && (
                  <Badge variant="destructive" size="sm" className="backdrop-blur-sm">Sold Out</Badge>
                )}
                {isEndingSoon && !isSoldOut && (
                  <Badge variant="warning" size="sm" className="backdrop-blur-sm">Ending Soon</Badge>
                )}
                {isSellingFast && !isSoldOut && !isEndingSoon && (
                  <Badge variant="warning" size="sm" className="backdrop-blur-sm bg-orange-500/90 text-white border-0">Selling Fast</Badge>
                )}
              </div>
              {onWishlistToggle && (
                <button
                  onClick={handleWishlistClick}
                  className={cn(
                    "p-2 rounded-full backdrop-blur-md transition-all duration-300",
                    isWishlisted
                      ? "bg-destructive/90 text-white hover:bg-destructive"
                      : "bg-black/20 text-white hover:bg-black/40"
                  )}
                >
                  {isWishlisted ? (
                    <HeartOff className="h-4 w-4" />
                  ) : (
                    <Heart className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="relative z-10 flex-1 p-5 sm:p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="line-clamp-2 font-display text-lg font-semibold leading-snug tracking-tight group-hover:text-foreground/80 transition-colors">
                  {event.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {event.venue}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(event.event_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(event.event_date)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  isSoldOut ? "text-destructive" : "text-muted-foreground"
                )}>
                  <Ticket className="h-4 w-4" />
                  <span>{isSoldOut ? "Sold out" : `${event.available_tickets} available`}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-display text-2xl font-semibold tracking-tight">
                  {formatCurrency(event.price_per_ticket)}
                </span>
                <Button
                  variant={isSoldOut ? "secondary" : "default"}
                  size="md"
                  disabled={isSoldOut}
                  asChild
                  className={cn(
                    "h-10 px-5",
                    !isSoldOut && "hover:scale-105 transition-transform"
                  )}
                >
                  <Link href={`/events/${event.id}`}>
                    {isSoldOut ? "Sold Out" : "View"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card transition-all duration-500 hover:shadow-3 hover:-translate-y-1 flex flex-col h-full",
        className
      )}
    >
      <Link href={`/events/${event.id}`} className="absolute inset-0 z-0">
        <span className="sr-only">View {event.title}</span>
      </Link>

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted shrink-0">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
            <Sparkles className="h-20 w-20 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
          <div className="flex gap-1.5 flex-wrap">
            {isSoldOut && (
              <Badge variant="destructive" size="sm" className="backdrop-blur-sm">Sold Out</Badge>
            )}
            {isEndingSoon && !isSoldOut && (
              <Badge variant="warning" size="sm" className="backdrop-blur-sm">Ending Soon</Badge>
            )}
            {isSellingFast && !isSoldOut && !isEndingSoon && (
              <Badge variant="warning" size="sm" className="backdrop-blur-sm bg-orange-500/90 text-white border-0">Selling Fast</Badge>
            )}
          </div>
          {onWishlistToggle && (
            <button
              onClick={handleWishlistClick}
              className={cn(
                "p-2 rounded-full backdrop-blur-md transition-all duration-300 z-20 relative",
                isWishlisted
                  ? "bg-destructive/90 text-white hover:bg-destructive"
                  : "bg-black/20 text-white hover:bg-black/40"
              )}
            >
              {isWishlisted ? (
                <HeartOff className="h-4 w-4" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="flex items-center gap-2.5 text-white/90 text-xs font-medium backdrop-blur-md bg-black/45 rounded-full px-3 py-1.5 w-fit border border-white/10 shadow-sm">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(event.event_date)}</span>
            <span className="text-white/40">·</span>
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(event.event_date)}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-5 flex flex-col flex-1 justify-between gap-4">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug tracking-tight group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1.5 mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{event.venue}</span>
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t mt-auto">
          <div className="flex items-center justify-between">
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
              isSoldOut ? "text-destructive" : "text-muted-foreground"
            )}>
              <Ticket className="h-3.5 w-3.5" />
              <span>{isSoldOut ? "Sold out" : `${event.available_tickets} available`}</span>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              {formatCurrency(event.price_per_ticket)}
            </span>
          </div>

          <Button
            variant={isSoldOut ? "secondary" : "default"}
            className="w-full h-10 text-xs font-semibold uppercase tracking-wider relative z-20"
            disabled={isSoldOut}
            asChild
          >
            <Link href={`/events/${event.id}`}>
              {isSoldOut ? "Sold Out" : "View Event"}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}