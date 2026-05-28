"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shell } from "@/components/layout/shell";
import Link from "next/link";
import { useApiQuery, useApiMutation } from "@/hooks/use-api";
import { AuthGuard } from "@/guards/auth-guard";
import { apiClient } from "@/lib/api-client";
import type { Event, Ticket, PaginatedResponse } from "@/types";
import { CountdownTimer } from "@/components/events/countdown-timer";
import { SeatAvailability } from "@/components/events/seat-availability";
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton";
import { EventErrorState } from "@/components/events/event-error-state";
import { formatCurrency } from "@/lib/utils";
import { paymentService } from "@/services/payment";

const MAX_TICKETS = 5;

export default function ReserveTicketsPage() {
  return (
    <AuthGuard>
      <ReserveTicketsPageContent />
    </AuthGuard>
  );
}

function ReserveTicketsPageContent() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationExpiresAt, setReservationExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { data: event, isLoading: loadingEvent, error: eventError, refetch: refetchEvent } = useApiQuery<Event>(
    ["event", eventId],
    `/events/${eventId}`
  );

  const { data: tickets, isLoading: loadingTickets } = useApiQuery<PaginatedResponse<Ticket>>(
    ["event-tickets", eventId],
    `/events/${eventId}/tickets?status=available`,
    { enabled: !!event }
  );

  const reserveMutation = useApiMutation(
    async (data: { event_id: string; ticket_count: number }) => {
      return await apiClient.post<{ id: string; expires_at: string }>("/reservations", data);
    },
    {
      onSuccess: (data) => {
        setReservationId(data.id);
        setReservationExpiresAt(data.expires_at);
        setError(null);
      },
      onError: (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : "Failed to create reservation. Please try again.";
        setError(errorMessage);
      },
    }
  );

  const checkoutMutation = useApiMutation(
    async (bookingId: string) => {
      const successUrl = `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/checkout/cancel?booking_id=${bookingId}`;

      return await paymentService.createCheckoutSession({
        booking_id: bookingId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
    },
    {
      onSuccess: async (checkoutSession) => {
        setIsRedirecting(true);
        setTimeout(() => {
          window.location.href = checkoutSession.checkout_url;
        }, 100);
      },
      onError: (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : "Failed to create checkout session. Please try again.";
        setError(errorMessage);
        setIsRedirecting(false);
      },
    }
  );

  const isLoading = loadingEvent || loadingTickets;

  // Don't redirect on available_tickets === 0 during initial load
  // This prevents unnecessary redirects on page refresh
  useEffect(() => {
    if (event && event.available_tickets === 0 && reservationId) {
      router.push(`/events/${eventId}`);
    }
  }, [event, eventId, router, reservationId]);

  if (isLoading) {
    return (
      <Shell>
        <div className="container py-8">
          <EventDetailSkeleton />
        </div>
      </Shell>
    );
  }

  if (eventError || !event) {
    return (
      <Shell>
        <div className="container py-8">
          <EventErrorState onRetry={() => refetchEvent()} />
        </div>
      </Shell>
    );
  }

  const handleReserveTickets = async () => {
    if (selectedTickets.length === 0) {
      setError("Please select at least one ticket.");
      return;
    }

    setError(null);

    await reserveMutation.mutateAsync({
      event_id: eventId,
      ticket_count: selectedTickets.length,
    });
  };

  const handleProceedToCheckout = async () => {
    if (!reservationId) return;

    setError(null);
    setIsRedirecting(true);

    await checkoutMutation.mutateAsync(reservationId);
  };

  const handleCancelReservation = async () => {
    if (!reservationId) return;

    try {
      await apiClient.post(`/reservations/${reservationId}/cancel`);
      setReservationId(null);
      setReservationExpiresAt(null);
    } catch (err) {
      setError("Failed to cancel reservation. Please try again.");
    }
  };

  const handleReservationExpired = () => {
    setReservationId(null);
    setReservationExpiresAt(null);
    setSelectedTickets([]);
    setError("Your reservation has expired. Please select tickets again.");
  };

  return (
    <Shell>
      <div className="container py-8 md:py-12 max-w-6xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href={`/events/${eventId}`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to event
          </Link>
        </Button>

        <div className="mb-8 space-y-4">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Reserve Tickets
          </h1>
          <p className="text-muted-foreground text-lg">
            {event.title} • {event.venue}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {reservationId && reservationExpiresAt ? (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-amber-900 dark:text-amber-100">
                        Tickets Reserved
                      </CardTitle>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Complete your purchase before timer expires
                      </p>
                    </div>
                    <CountdownTimer
                      expiresAt={reservationExpiresAt}
                      onExpire={handleReservationExpired}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleProceedToCheckout}
                      disabled={isRedirecting || checkoutMutation.isPending}
                      className="flex-1"
                      size="lg"
                    >
                      {isRedirecting || checkoutMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          Proceed to Checkout
                          <Lock className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelReservation}
                      disabled={isRedirecting || checkoutMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Secure payment powered by Stripe
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Select Your Seats</CardTitle>
                </CardHeader>
                <CardContent>
                  {tickets?.items && tickets.items.length > 0 ? (
                    <SeatAvailability
                      tickets={tickets.items}
                      selectedTickets={selectedTickets}
                      maxSelection={MAX_TICKETS}
                      onSelectionChange={setSelectedTickets}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No tickets available at this time.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <AlertCircle className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium line-clamp-2">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.venue}</p>
                    </div>
                  </div>
                </div>

                {selectedTickets.length > 0 && (
                  <>
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tickets</span>
                        <span>{selectedTickets.length} x {formatCurrency(event.price_per_ticket)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span className="font-display text-lg">
                          {formatCurrency(selectedTickets.length * event.price_per_ticket)}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={handleReserveTickets}
                      disabled={selectedTickets.length === 0 || reserveMutation.isPending}
                      className="w-full h-12"
                      size="lg"
                    >
                      {reserveMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Reserving...
                        </>
                      ) : (
                        `Reserve ${selectedTickets.length} Ticket${selectedTickets.length !== 1 ? "s" : ""}`
                      )}
                    </Button>
                  </>
                )}

                {reservationId && (
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reservation ID</span>
                      <span className="font-mono text-xs">{reservationId.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>Tickets reserved successfully</span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  Secure payment powered by Stripe
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
