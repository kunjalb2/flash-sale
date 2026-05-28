"use client";

import { useState } from "react";
import { MoreHorizontal, Eye, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useApiQuery } from "@/hooks/use-api";
import { useToast } from "@/components/ui/use-toast";
import { adminService } from "@/services/admin";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { AdminBooking, AdminBookingDetail, Column } from "@/types";

function BookingDetailDialog({
  booking,
  open,
  onOpenChange,
}: {
  booking: AdminBookingDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>Full booking information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Booking ID</p>
              <p className="font-mono text-xs">{booking.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge status={booking.status} />
            </div>
            <div>
              <p className="text-muted-foreground">Tickets</p>
              <p className="font-medium">{booking.ticket_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium">{formatCurrency(booking.total_amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reserved At</p>
              <p>{formatDateTime(booking.reserved_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p>{formatDateTime(booking.created_at)}</p>
            </div>
          </div>

          {booking.user_info && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">User</h4>
                <div className="text-sm">
                  <p>{booking.user_info.full_name}</p>
                  <p className="text-muted-foreground">{booking.user_info.email}</p>
                </div>
              </div>
            </>
          )}

          {booking.event_info && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Event</h4>
                <div className="text-sm">
                  <p>{booking.event_info.title}</p>
                  <p className="text-muted-foreground">{booking.event_info.venue} &middot; {formatDateTime(booking.event_info.event_date)}</p>
                </div>
              </div>
            </>
          )}

          {booking.payment_info && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Payment</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>{" "}
                    {formatCurrency(booking.payment_info.amount)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <StatusBadge status={booking.payment_info.status} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBookingsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedBooking, setSelectedBooking] = useState<AdminBookingDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("size", "20");
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const { data, isLoading, refetch } = useApiQuery<{
    items: AdminBooking[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }>(["admin-bookings", String(page), statusFilter], `/admin/bookings?${queryParams.toString()}`);

  const handleViewDetail = async (booking: AdminBooking) => {
    try {
      const detail = await adminService.getBooking(booking.id);
      setSelectedBooking(detail);
      setDetailOpen(true);
    } catch {
      toast({ title: "Failed to load booking details", variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setActionLoading(true);
    try {
      await adminService.cancelBooking(cancelId);
      toast({ title: "Booking cancelled successfully" });
      refetch();
      setCancelId(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast({ title: error.response?.data?.detail || "Failed to cancel booking", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundId) return;
    setActionLoading(true);
    try {
      await adminService.refundBooking(refundId);
      toast({ title: "Refund initiated successfully" });
      refetch();
      setRefundId(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast({ title: error.response?.data?.detail || "Failed to refund booking", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<AdminBooking>[] = [
    {
      key: "id",
      header: "ID",
      cell: (row) => <span className="font-mono text-xs">{row.id.slice(0, 8)}...</span>,
    },
    {
      key: "user",
      header: "User",
      cell: (row) => <span className="text-sm">{row.user_email || "Unknown"}</span>,
    },
    {
      key: "event",
      header: "Event",
      cell: (row) => <span className="text-sm line-clamp-1">{row.event_title || "Unknown"}</span>,
    },
    {
      key: "tickets",
      header: "Tickets",
      cell: (row) => row.ticket_count,
      className: "text-center",
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => <span className="font-medium">{formatCurrency(row.total_amount)}</span>,
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "date",
      header: "Date",
      cell: (row) => <span className="text-sm text-muted-foreground">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewDetail(row)} className="cursor-pointer">
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            {(row.status === "reserved" || row.status === "confirmed") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCancelId(row.id)} className="cursor-pointer">
                  <XCircle className="h-4 w-4 mr-2" /> Cancel Booking
                </DropdownMenuItem>
              </>
            )}
            {row.status === "confirmed" && (
              <DropdownMenuItem onClick={() => setRefundId(row.id)} className="cursor-pointer">
                <RotateCcw className="h-4 w-4 mr-2" /> Refund
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage ticket bookings and reservations</p>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        filters={
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        }
        isLoading={isLoading}
        emptyMessage="No bookings found"
        keyExtractor={(row) => row.id}
      />

      <BookingDetailDialog booking={selectedBooking} open={detailOpen} onOpenChange={setDetailOpen} />

      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Cancel Booking"
        description="Are you sure you want to cancel this booking? This will release the reserved tickets."
        confirmLabel="Cancel Booking"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={!!refundId}
        onOpenChange={(open) => !open && setRefundId(null)}
        title="Refund Booking"
        description="Are you sure you want to initiate a refund for this booking? The payment status will be set to refund pending."
        confirmLabel="Initiate Refund"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleRefund}
      />
    </div>
  );
}
