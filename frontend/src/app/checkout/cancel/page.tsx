"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircle, ArrowRight, Loader2, RefreshCw, Calendar, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shell } from "@/components/layout/shell";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface EventDetails {
  id: string;
  title: string;
  venue: string;
  event_date: string;
  price_per_ticket: number;
  available_tickets: number;
  image_url: string | null;
}

export default function CheckoutCancelPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("booking_id");

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiClient.get<{ event: EventDetails } & { id: string }>(`/reservations/bookings/${bookingId}`);
        if (data.event) {
          setEvent(data.event);
        } else {
          setError("Event not found.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event details");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [bookingId]);

  const handleRetryReservation = () => {
    if (event) {
      router.push(`/events/${event.id}/reserve`);
    } else {
      router.push("/events");
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="container py-16 max-w-2xl">
          <div className="flex flex-col items-center justify-center space-y-6">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Loading...</h2>
              <p className="text-muted-foreground">Please wait</p>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="container py-8 md:py-16 max-w-3xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Payment Cancelled
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Your payment was cancelled. Your reservation has been released and you can try again.
              </p>
            </div>
          </div>

          {event && (
            <Card>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Ticket className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">{event.venue}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
                        <p className="font-medium">{formatDateTime(event.event_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Ticket className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Availability</p>
                        <p className="font-medium">{event.available_tickets} tickets available</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Price per ticket</p>
                      <p className="font-display text-2xl font-bold">
                          {formatCurrency(event.price_per_ticket)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="text-center p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Button onClick={handleRetryReservation} className="h-12" size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" asChild className="h-12" size="lg">
              <Link href="/events">Browse Other Events</Link>
            </Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
