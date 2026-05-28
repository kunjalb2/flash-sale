"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Calendar, Ticket, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shell } from "@/components/layout/shell";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface BookingDetails {
  id: string;
  event: {
    id: string;
    title: string;
    venue: string;
    event_date: string;
  };
  ticket_count: number;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!sessionId) {
        setError("No checkout session found.");
        setLoading(false);
        return;
      }

      try {
        const data = await apiClient.get<{ items: BookingDetails[] }>("/reservations");
        if (data.items && data.items.length > 0) {
          const bookingData = data.items[0];
          // Ensure event details are loaded
          if (bookingData.event) {
            setBooking(bookingData);
          } else {
            setError("Booking event details not found.");
          }
        } else {
          setError("No booking found.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [sessionId]);

  if (loading) {
    return (
      <Shell>
        <div className="container py-16 max-w-2xl">
          <div className="flex flex-col items-center justify-center space-y-6">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Processing your payment...</h2>
              <p className="text-muted-foreground">Please wait while we confirm your booking</p>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (error || !booking) {
    return (
      <Shell>
        <div className="container py-16 max-w-2xl">
          <Card className="p-12 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-6" />
            <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">
              {error || "We couldn't load your booking details."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link href="/bookings">View My Bookings</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/events">Browse Events</Link>
              </Button>
            </div>
          </Card>
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
              <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Payment Successful
              </h1>
              <p className="text-muted-foreground text-lg">
                Your tickets have been booked successfully
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    <div className="h-full w-full flex items-center justify-center">
                      <Ticket className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-lg">{booking.event.title}</h3>
                    <p className="text-sm text-muted-foreground">{booking.event.venue}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
                      <p className="font-medium">{formatDateTime(booking.event.event_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Ticket className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Tickets</p>
                      <p className="font-medium">{booking.ticket_count} ticket{booking.ticket_count > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total paid</p>
                      <p className="text-xs text-muted-foreground">Booking ID: {booking.id.slice(0, 8)}...</p>
                    </div>
                    <p className="font-display text-3xl font-bold">
                      {formatCurrency(booking.total_amount)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Button asChild className="h-12" size="lg">
              <Link href="/bookings" className="flex items-center justify-center gap-2">
                View My Bookings
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-12" size="lg">
              <Link href="/events">Browse More Events</Link>
            </Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
