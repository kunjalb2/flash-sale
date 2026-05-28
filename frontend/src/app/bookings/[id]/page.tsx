"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Ticket,
  Download,
  CreditCard,
  MapPin,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AuthGuard } from "@/guards/auth-guard";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CountdownTimer } from "@/components/events/countdown-timer";
import { useToast } from "@/components/ui/use-toast";

import { apiClient } from "@/lib/api-client";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { paymentService } from "@/services/payment";

interface BookingEvent {
  id: string;
  title: string;
  venue: string;
  event_date: string;
  price_per_ticket: number;
  available_tickets: number;
  image_url?: string;
}

interface BookingDetail {
  id: string;
  user_id: string;
  event_id: string;
  ticket_count: number;
  total_amount: number;
  status: string;
  reserved_at: string;
  expires_at?: string;
  event: BookingEvent | null;
  created_at: string;
  updated_at: string;
}

export default function BookingDetailPage() {
  return (
    <AuthGuard>
      <BookingDetailContent />
    </AuthGuard>
  );
}

function BookingDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await apiClient.get<BookingDetail>(
          `/reservations/bookings/${bookingId}`,
        );
        setBooking(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const handleDownloadTickets = async () => {
    setDownloading(true);
    try {
      const response = await apiClient.get<Blob>(
        `/reservations/${bookingId}/tickets`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(response);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tickets-${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({
        title: "Download Failed",
        description: "Failed to download tickets.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleCancelBooking = async () => {
    setCancelling(true);
    try {
      await apiClient.post(`/reservations/${bookingId}/cancel`, {});
      toast({ title: "Booking Cancelled", description: "Your booking has been cancelled." });
      setBooking((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
    } catch {
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel booking.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handleCompletePayment = async () => {
    setRedirecting(true);
    try {
      const session = await paymentService.createCheckoutSession({
        booking_id: bookingId,
        success_url: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/bookings`,
      });
      window.location.href = session.checkout_url;
    } catch {
      setRedirecting(false);
      toast({
        title: "Payment Failed",
        description: "Failed to initiate payment.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default">Confirmed</Badge>;
      case "reserved":
        return <Badge variant="secondary">Reserved</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "expired":
        return <Badge variant="outline">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="container py-8 max-w-3xl">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Shell>
    );
  }

  if (error || !booking) {
    return (
      <Shell>
        <div className="container py-8 max-w-3xl">
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Booking not found</h3>
            <p className="text-muted-foreground mb-6">
              {error || "We couldn't load this booking."}
            </p>
            <Button asChild>
              <Link href="/bookings">Back to Bookings</Link>
            </Button>
          </Card>
        </div>
      </Shell>
    );
  }

  const isPast = new Date(booking.event?.event_date || "") < new Date();
  const isUpcoming = !isPast;

  return (
    <Shell>
      <div className="container py-8 max-w-3xl">
        <div className="space-y-6">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
              <Link href="/bookings" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Bookings
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Booking Details
              </h1>
              {getStatusBadge(booking.status)}
            </div>
          </div>

          {/* Reservation Expiry Countdown */}
          {booking.status === "reserved" && booking.expires_at && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Complete your payment</p>
                    <p className="text-sm text-muted-foreground">
                      Your reservation will expire soon
                    </p>
                  </div>
                  <CountdownTimer
                    expiresAt={booking.expires_at}
                    variant="default"
                    showIcon={true}
                    onExpire={() =>
                      setBooking((prev) =>
                        prev ? { ...prev, status: "expired" } : prev,
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold text-lg">
                    {booking.event?.title}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDateTime(booking.event?.event_date || "")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <p>{booking.event?.venue}</p>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Ticket className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tickets</p>
                    <p className="font-medium">
                      {booking.ticket_count} ticket
                      {booking.ticket_count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reserved</p>
                    <p className="font-medium">
                      {formatDateTime(booking.reserved_at)}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-xs text-muted-foreground">
                    Booking ID: {booking.id}
                  </p>
                </div>
                <p className="font-display text-2xl font-bold">
                  {formatCurrency(booking.total_amount)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {isUpcoming && booking.status === "reserved" && (
              <>
                <Button onClick={handleCompletePayment} disabled={redirecting}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {redirecting ? "Redirecting..." : "Complete Payment"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling..." : "Cancel Booking"}
                </Button>
              </>
            )}

            {booking.status === "confirmed" && (
              <Button
                variant="outline"
                onClick={handleDownloadTickets}
                disabled={downloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Downloading..." : "Download Tickets"}
              </Button>
            )}

            {booking.event && (
              <Button variant="outline" asChild>
                <Link href={`/events/${booking.event.id}`}>
                  View Event
                </Link>
              </Button>
            )}
          </div>

          <ConfirmDialog
            open={showCancelDialog}
            onOpenChange={setShowCancelDialog}
            title="Cancel Booking"
            description="Are you sure you want to cancel this booking? This action cannot be undone."
            confirmLabel="Cancel Booking"
            variant="destructive"
            loading={cancelling}
            onConfirm={handleCancelBooking}
          />
        </div>
      </div>
    </Shell>
  );
}
