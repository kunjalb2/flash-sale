"use client";

import { useParams } from "next/navigation";
import { Calendar, MapPin, Clock, Ticket, ArrowLeft, Share2, Info, Users, Download, Star, StarHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shell } from "@/components/layout/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { EventCard } from "@/components/events/event-card";
import { ChatWidget } from "@/components/chat/chat-widget";
import Link from "next/link";
import { useApiQuery } from "@/hooks/use-api";
import type { Event, PaginatedResponse } from "@/types";
import { formatDate, formatDateTime, formatCurrency, formatTime } from "@/lib/utils";

interface StatProps {
  icon: React.ElementType;
  label: string;
  value: string | React.ReactNode;
  subtext?: string;
}

function Stat({ icon: Icon, label, value, subtext }: StatProps) {
  return (
    <Card variant="flat" className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="font-medium text-sm">{value}</p>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
      </div>
    </Card>
  );
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-warning text-warning" />
      ))}
      {hasHalf && <StarHalf className="h-4 w-4 fill-warning text-warning" />}
      {Array.from({ length: 5 - fullStars - (hasHalf ? 1 : 0) }).map((_, i) => (
        <Star key={i} className="h-4 w-4 text-muted-foreground/30" />
      ))}
      <span className="ml-1.5 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function EventDetailsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const { data: event, isLoading, error, refetch } = useApiQuery<Event>(
    ["event", eventId],
    `/events/${eventId}`
  );

  const { data: allEventsData, isLoading: isLoadingSimilar } = useApiQuery<PaginatedResponse<Event>>(
    ["events"],
    "/events"
  );

  if (isLoading) {
    return (
      <Shell>
        <div className="container py-8">
          <div className="space-y-6">
            <Skeleton variant="card" />
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton variant="text" lines={3} />
              <Skeleton variant="text" lines={3} />
              <Skeleton variant="text" lines={3} />
              <Skeleton variant="text" lines={3} />
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (error || !event) {
    return (
      <Shell>
        <div className="container py-8">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </Shell>
    );
  }

  const isSoldOut = event.available_tickets === 0;
  const isSaleEnded = new Date(event.sale_end_date) < new Date();
  const isSaleNotStarted = new Date(event.sale_start_date) > new Date();
  const ticketsRemaining = Math.max(0, event.available_tickets);
  const ticketsSold = event.total_tickets - event.available_tickets;
  const availabilityPercentage = Math.round((ticketsRemaining / event.total_tickets) * 100);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} at ${event.venue}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error occurred
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleAddToCalendar = () => {
    const startDate = new Date(event.event_date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hours

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.venue}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell>
      <div className="container py-8 md:py-12">
        <Button variant="ghost" asChild className="mb-6 -ml-3">
          <Link href="/events" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to events
          </Link>
        </Button>

        <div className="space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {isSoldOut && <Badge variant="destructive">Sold Out</Badge>}
                  {isSaleEnded && !isSoldOut && <Badge variant="secondary">Sale Ended</Badge>}
                  {isSaleNotStarted && !isSoldOut && !isSaleEnded && <Badge variant="outline">Coming Soon</Badge>}
                  {event.is_active && !isSoldOut && !isSaleEnded && !isSaleNotStarted && (
                    <Badge variant="success">Available</Badge>
                  )}
                  {isEndingSoon(event.sale_end_date) && !isSoldOut && (
                    <Badge variant="warning">Ending Soon</Badge>
                  )}
                </div>

                <h1 className="font-display text-display-sm font-semibold tracking-tight max-w-3xl">
                  {event.title}
                </h1>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{event.venue}</span>
                  <span>•</span>
                  <StarRating rating={4.5} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  <span className="sr-only">Share event</span>
                </Button>
              </div>
            </div>

            <p className="text-body-lg text-muted-foreground max-w-3xl leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Hero Image */}
          {event.image_url && (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-muted shadow-1">
              <img
                src={event.image_url}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Info Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={Calendar}
              label="Date & Time"
              value={formatDate(event.event_date)}
              subtext={formatTime(event.event_date)}
            />
            <Stat
              icon={MapPin}
              label="Location"
              value={event.venue}
              subtext={event.address}
            />
            <Stat
              icon={Users}
              label="Availability"
              value={isSoldOut ? "Sold out" : `${ticketsRemaining} tickets`}
              subtext={isSoldOut ? `${ticketsSold} of ${event.total_tickets} sold` : `${availabilityPercentage}% remaining`}
            />
            <Stat
              icon={Clock}
              label="Sale Period"
              value={formatDate(event.sale_start_date)}
              subtext={`to ${formatDate(event.sale_end_date)}`}
            />
          </div>

          <Separator />

          {/* What's Included */}
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-h2 font-semibold tracking-tight mb-2">What&apos;s Included</h2>
              <p className="text-muted-foreground">Everything you need for this event</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Ticket, label: "Admission to the event" },
                { icon: Users, label: "Access to all areas" },
                { icon: Info, label: "Event program" },
                { icon: Star, label: "VIP perks" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* About the Venue */}
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-h2 font-semibold tracking-tight mb-2">About the Venue</h2>
              <p className="text-muted-foreground">Hosted at {event.venue}</p>
            </div>

            <Card variant="flat" className="p-6">
              <p className="text-muted-foreground leading-relaxed">
                {event.venue} offers an exceptional experience with modern amenities, comfortable seating, and excellent acoustics. Located at {event.address}, it&apos;s easily accessible by public transportation.
              </p>
            </Card>
          </div>

          <Separator />

          {/* Similar Events */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-h2 font-semibold tracking-tight mb-2">Similar Events</h2>
                <p className="text-muted-foreground">You might also like</p>
              </div>
              <Button variant="ghost" asChild>
                <Link href="/events" className="flex items-center gap-2">
                  View all
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Link>
              </Button>
            </div>

            {isLoadingSimilar ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="card" />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allEventsData?.items
                  .filter((e) => e.id !== eventId)
                  .slice(0, 3)
                  .map((similarEvent, i) => (
                    <div key={similarEvent.id} className="stagger-in" style={{ animationDelay: `${i * 50}ms` }}>
                      <EventCard event={similarEvent} />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Booking Panel */}
        <Card variant="elevated" className="fixed bottom-0 left-0 right-0 md:sticky md:top-20 md:rounded-xl z-40 shadow-4 md:shadow-1">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <div className="flex items-center gap-3 flex-1">
                {event.image_url && (
                  <div className="hidden sm:block h-12 w-12 rounded-lg overflow-hidden shrink-0">
                    <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-1">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(event.price_per_ticket)} per ticket</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddToCalendar}
                  className="hidden md:flex"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Add to Calendar
                </Button>

                <Button
                  className="flex-1 md:flex-none h-10 md:h-11 px-6"
                  disabled={isSoldOut || isSaleEnded || isSaleNotStarted}
                  asChild
                  size="lg"
                >
                  <Link href={`/events/${event.id}/reserve`}>
                    {isSaleNotStarted
                      ? "Sale Not Started"
                      : isSoldOut
                      ? "Sold Out"
                      : isSaleEnded
                      ? "Sale Ended"
                      : "Reserve Tickets"}
                  </Link>
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-3 md:mt-4">
              Secure payment powered by Stripe • {ticketsRemaining} tickets remaining
            </p>
          </CardContent>
        </Card>
      </div>

      <ChatWidget eventId={eventId} />
    </Shell>
  );
}

function isEndingSoon(saleEndDate: string): boolean {
  const now = Date.now();
  const end = new Date(saleEndDate).getTime();
  const hoursRemaining = (end - now) / (1000 * 60 * 60);
  return hoursRemaining > 0 && hoursRemaining < 48;
}