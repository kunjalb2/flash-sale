"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Ticket,
  Download,
  ExternalLink,
  CreditCard,
  Eye,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Shell } from "@/components/layout/shell";
import { AuthGuard } from "@/guards/auth-guard";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CountdownTimer } from "@/components/events/countdown-timer";
import { useToast } from "@/components/ui/use-toast";

import { apiClient } from "@/lib/api-client";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { paymentService } from "@/services/payment";

interface Booking {
  id: string;
  user_id: string;
  event_id: string;
  ticket_count: number;
  total_amount: number;
  status: "reserved" | "confirmed" | "cancelled" | "expired";
  reserved_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  receipt_url?: string;
  event: {
    id: string;
    title: string;
    venue: string;
    event_date: string;
    price_per_ticket: number;
    available_tickets: number;
    total_tickets: number;
    sale_end_date: string;
    is_active: boolean;
    image_url?: string;
  };
}

function BookingCardSkeleton() {
  return (
    <div className="rounded-3xl border bg-card/40 flex flex-col md:flex-row w-full animate-pulse overflow-hidden">
      {/* Cover Image Skeleton */}
      <div className="w-full md:w-44 h-32 md:h-auto bg-muted shrink-0" />

      {/* Ticket Details Skeleton */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between gap-6 relative md:border-r-2 md:border-dashed md:border-border/60">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-3/4" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <Skeleton className="h-4 w-1/3" />
      </div>

      {/* Pricing & Actions Skeleton */}
      <div className="w-full md:w-56 p-6 md:p-8 flex flex-col justify-between items-stretch md:items-center bg-muted/5 shrink-0 self-stretch gap-6">
        <div className="space-y-2 md:w-full md:flex md:flex-col md:items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-2 w-full">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  onDelete,
  onStatusChange,
  showActions = true,
}: {
  booking: Booking;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Booking["status"]) => void;
  showActions?: boolean;
}) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isPast = new Date(booking.event?.event_date || "") < new Date();
  const isUpcoming = !isPast;
  const isEventStillAvailable = booking.event?.is_active &&
    new Date(booking.event?.sale_end_date || "") > new Date() &&
    booking.event?.available_tickets > 0;

  const handleDownloadTickets = async () => {
    setDownloading(true);
    try {
      const response = await apiClient.get<Blob>(
        `/reservations/${booking.id}/tickets`,
        { responseType: "blob" },
      );

      const url = window.URL.createObjectURL(response);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tickets-${booking.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download tickets. Please ensure your booking is confirmed.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleCancelBooking = async () => {
    setCancelling(true);
    try {
      await apiClient.post(`/reservations/${booking.id}/cancel`, {});
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled.",
      });
      onStatusChange(booking.id, "cancelled");
    } catch (error) {
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel booking. Please try again.",
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
        booking_id: booking.id,
        success_url: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/bookings`,
      });
      window.location.href = session.checkout_url;
    } catch (error) {
      setRedirecting(false);
      toast({
        title: "Payment Failed",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    switch (booking.status) {
      case "confirmed":
        return (
          <Badge
            variant="success"
            dot={true}
            dotColor="bg-emerald-500"
            className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-semibold uppercase tracking-wider text-[10px]"
          >
            Confirmed
          </Badge>
        );
      case "reserved":
        return (
          <Badge
            variant="warning"
            dot={true}
            dotColor="bg-amber-500"
            className="bg-amber-500/10 text-amber-700 border border-amber-500/20 font-semibold uppercase tracking-wider text-[10px]"
          >
            Reserved
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="destructive"
            dot={true}
            dotColor="bg-rose-500"
            className="bg-rose-500/10 text-rose-700 border border-rose-500/20 font-semibold uppercase tracking-wider text-[10px]"
          >
            Cancelled
          </Badge>
        );
      case "expired":
        return (
          <Badge
            variant="default"
            dot={true}
            dotColor="bg-neutral-400"
            className="bg-neutral-500/10 text-neutral-600 border border-neutral-500/20 font-semibold uppercase tracking-wider text-[10px]"
          >
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border bg-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:border-border/80 flex flex-col md:flex-row w-full">
      {/* 1. Left Section: Cover Image */}
      {booking.event?.image_url ? (
        <div className="relative w-full md:w-44 h-32 md:h-auto overflow-hidden bg-muted shrink-0">
          <img
            src={booking.event.image_url}
            alt={booking.event.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/50 to-transparent md:hidden" />
        </div>
      ) : (
        <div className="relative w-full md:w-44 h-32 md:h-auto overflow-hidden bg-gradient-to-br from-muted/50 to-muted shrink-0 flex items-center justify-center">
          <Ticket className="h-12 w-12 text-muted-foreground/20" />
        </div>
      )}

      {/* 2. Middle Section: Ticket Details */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between gap-6 relative md:border-r-2 md:border-dashed md:border-border/60 border-b-2 border-dashed border-border/60 md:border-b-0">
        {/* Ticket Punchouts (circles) for authentic ticket look */}
        <div className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-background border border-border z-10" />
        <div className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-background border border-border z-10 md:hidden" />
        <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-background border border-border z-10 hidden md:block" />

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                Ticket Stub #{booking.id.slice(0, 8).toUpperCase()}
              </span>
              <h3 className="font-display text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                {booking.event?.title}
              </h3>
            </div>
            <div className="shrink-0">{getStatusBadge()}</div>
          </div>

          {booking.status === "reserved" && booking.expires_at && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-warning/5 border border-warning/20 text-warning text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
              </span>
              <span className="font-semibold uppercase tracking-wider text-[10px] text-warning-foreground">Expires in:</span>
              <CountdownTimer
                expiresAt={booking.expires_at}
                variant="compact"
                showIcon={false}
                onExpire={() => onStatusChange(booking.id, "expired")}
              />
            </div>
          )}

          {booking.status === "expired" && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/10 border border-muted/20 text-muted-foreground text-xs font-medium">
              <XCircle className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider text-[10px]">Reservation expired</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2 text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <div className="p-1.5 rounded-lg bg-muted/50 border border-border/30">
                <Calendar className="h-4 w-4 text-muted-foreground/80" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Date & Time</span>
                <span className="font-medium text-foreground text-xs">
                  {formatDateTime(booking.event?.event_date || "")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-muted-foreground">
              <div className="p-1.5 rounded-lg bg-muted/50 border border-border/30">
                <Ticket className="h-4 w-4 text-muted-foreground/80" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Quantity</span>
                <span className="font-medium text-foreground text-xs">
                  {booking.ticket_count} ticket{booking.ticket_count > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/40 pt-4 mt-auto">
          <span className="font-medium">{booking.event?.venue}</span>
        </div>
      </div>

      {/* 3. Right Section: Pricing and Actions */}
      {showActions && (
        <div className="w-full md:w-56 p-6 md:p-8 flex flex-col justify-between items-stretch md:items-center bg-muted/10 md:bg-muted/5 shrink-0 self-stretch gap-6 md:text-center">
          <div className="space-y-1.5 md:w-full md:flex md:flex-col md:items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
              Total Amount
            </span>
            <p className="text-2xl font-black tracking-tight text-foreground">
              {formatCurrency(booking.total_amount)}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            {/* Reserved + Upcoming: Pay Now & Cancel */}
            {isUpcoming && booking.status === "reserved" && (
              <>
                <Button
                  className="w-full justify-center text-xs font-semibold uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-sm"
                  onClick={handleCompletePayment}
                  disabled={redirecting}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {redirecting ? "Paying..." : "Pay Now"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-center text-xs font-semibold uppercase tracking-wider text-destructive hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={cancelling}
                >
                  Cancel Reservation
                </Button>
              </>
            )}

            {/* Confirmed + Upcoming: Download Tickets */}
            {isUpcoming && booking.status === "confirmed" && (
              <Button
                variant="outline"
                className="w-full justify-center text-xs font-semibold uppercase tracking-wider hover:scale-[1.02] transition-transform"
                onClick={handleDownloadTickets}
                disabled={downloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Downloading..." : "Get Tickets"}
              </Button>
            )}

            {/* Expired + Event Still Available: Book Again */}
            {booking.status === "expired" && isEventStillAvailable && (
              <Button
                variant="default"
                className="w-full justify-center text-xs font-semibold uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-sm"
                asChild
              >
                <Link href={`/events/${booking.event_id}`}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Book Again
                </Link>
              </Button>
            )}

            {/* Expired + Event Sold Out/Ended: Disabled Book Again */}
            {booking.status === "expired" && !isEventStillAvailable && (
              <Button
                variant="secondary"
                className="w-full justify-center text-xs font-semibold uppercase tracking-wider"
                disabled
              >
                <XCircle className="h-4 w-4 mr-2" />
                Not Available
              </Button>
            )}

            {/* Cancelled: Browse Events */}
            {booking.status === "cancelled" && (
              <Button
                variant="outline"
                className="w-full justify-center text-xs font-semibold uppercase tracking-wider"
                asChild
              >
                <Link href="/events">
                  Browse Events
                </Link>
              </Button>
            )}

            {/* View Details - Always shown except cancelled */}
            {booking.status !== "cancelled" && (
              <Button
                variant="ghost"
                className="w-full justify-center text-xs font-semibold uppercase tracking-wider hover:bg-muted"
                asChild
              >
                <Link href={`/bookings/${booking.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Details
                </Link>
              </Button>
            )}

            {/* Receipt Link - Only if receipt_url exists */}
            {booking.receipt_url && booking.status !== "reserved" && (
              <Button
                variant="ghost"
                className="w-full justify-center text-xs font-semibold uppercase tracking-wider hover:bg-muted"
                asChild
              >
                <a
                  href={booking.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Receipt
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Reservation"
        description="Are you sure you want to cancel this reservation? Any unpaid tickets will be returned to the ticket pool."
        confirmLabel="Cancel Reservation"
        variant="destructive"
        loading={cancelling}
        onConfirm={handleCancelBooking}
      />
    </div>
  );
}

export default function BookingsPage() {
  return (
    <AuthGuard>
      <BookingsPageContent />
    </AuthGuard>
  );
}

function BookingsPageContent() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "cancelled" | "past">("upcoming");
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [upcomingStatusFilter, setUpcomingStatusFilter] = useState<"all" | "reserved" | "confirmed" | "expired">("all");

  const fetchBookings = useCallback(async () => {
    try {
      const data = await apiClient.get<{ items: Booking[] }>("/reservations");
      setBookings(data.items || []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load bookings",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const doFetch = async () => {
      if (!isMounted) return;
      await fetchBookings();
    };

    doFetch();

    const interval = setInterval(() => {
      if (isMounted) doFetch();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchBookings]);

  const handleDelete = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  const handleStatusChange = (id: string, newStatus: Booking["status"]) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)),
    );
  };

  // Filter bookings by event date and status
  const getUpcomingBookings = () => {
    const now = new Date();
    return bookings.filter((booking) => {
      const eventDate = new Date(booking.event?.event_date || "");
      const isUpcomingEvent = eventDate > now;

      if (!isUpcomingEvent || booking.status === "cancelled") return false;

      if (upcomingStatusFilter === "all") return true;
      return booking.status === upcomingStatusFilter;
    });
  };

  const getCancelledBookings = () => {
    return bookings.filter((booking) => booking.status === "cancelled");
  };

  const getPastBookings = () => {
    const now = new Date();
    return bookings.filter((booking) => {
      const eventDate = new Date(booking.event?.event_date || "");
      const isPastEvent = eventDate <= now;
      const isCancelled = booking.status === "cancelled";
      return isPastEvent && !isCancelled;
    });
  };

  const upcomingBookings = getUpcomingBookings();
  const cancelledBookings = getCancelledBookings();
  const pastBookings = getPastBookings();

  return (
    <Shell>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            My Bookings
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage your ticket purchases
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "upcoming" | "cancelled" | "past")}
          className="space-y-6"
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            {/* Status filter for upcoming bookings */}
            {upcomingBookings.length > 0 && (
              <div className="flex items-center justify-between">
                <Select value={upcomingStatusFilter} onValueChange={(v: any) => setUpcomingStatusFilter(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                <BookingCardSkeleton />
                <BookingCardSkeleton />
                <BookingCardSkeleton />
              </div>
            )}

            {!loading && upcomingBookings.length === 0 && (
              <Card className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  No upcoming bookings
                </h3>
                <p className="text-muted-foreground mb-6">
                  {upcomingStatusFilter === "expired"
                    ? "No expired reservations found"
                    : "Explore our events and book your tickets"}
                </p>
                {upcomingStatusFilter !== "expired" && (
                  <Button asChild>
                    <Link href="/events">Browse Events</Link>
                  </Button>
                )}
              </Card>
            )}

            {!loading && upcomingBookings.length > 0 && (
              <div className="grid gap-4">
                {upcomingBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {loading && (
              <div className="space-y-4">
                <BookingCardSkeleton />
                <BookingCardSkeleton />
                <BookingCardSkeleton />
              </div>
            )}

            {!loading && cancelledBookings.length === 0 && (
              <Card className="p-12 text-center">
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  No cancelled bookings
                </h3>
                <p className="text-muted-foreground">
                  Your cancelled bookings will appear here for audit purposes
                </p>
              </Card>
            )}

            {!loading && cancelledBookings.length > 0 && (
              <div className="grid gap-4">
                {cancelledBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {loading && (
              <div className="space-y-4">
                <BookingCardSkeleton />
                <BookingCardSkeleton />
                <BookingCardSkeleton />
              </div>
            )}

            {!loading && pastBookings.length === 0 && (
              <Card className="p-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  No past bookings
                </h3>
                <p className="text-muted-foreground">
                  Your past ticket purchases will appear here
                </p>
              </Card>
            )}

            {!loading && pastBookings.length > 0 && (
              <div className="grid gap-4">
                {pastBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <Card className="p-6 mt-4 border-destructive bg-destructive/5">
            <p className="text-destructive text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={fetchBookings}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </Card>
        )}
      </div>
    </Shell>
  );
}