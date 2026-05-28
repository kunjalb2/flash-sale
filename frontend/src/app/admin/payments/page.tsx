"use client";

import { useState } from "react";
import { MoreHorizontal, Eye, ExternalLink } from "lucide-react";
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
import { useApiQuery } from "@/hooks/use-api";
import { useToast } from "@/components/ui/use-toast";
import { adminService } from "@/services/admin";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { AdminPayment, Column } from "@/types";

function PaymentDetailDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: AdminPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>Full payment information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Payment ID</p>
              <p className="font-mono text-xs">{payment.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge status={payment.status} />
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="text-lg font-bold">{formatCurrency(payment.amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Currency</p>
              <p className="uppercase">{payment.currency}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Method</p>
              <p className="capitalize">{payment.payment_method}</p>
            </div>
            <div>
              <p className="text-muted-foreground">User</p>
              <p>{payment.user_email || "Unknown"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Event</p>
              <p className="line-clamp-1">{payment.event_title || "Unknown"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p>{formatDateTime(payment.created_at)}</p>
            </div>
          </div>

          {payment.paid_at && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Paid At</p>
                  <p>{formatDateTime(payment.paid_at)}</p>
                </div>
                {payment.refunded_at && (
                  <div>
                    <p className="text-muted-foreground">Refunded At</p>
                    <p>{formatDateTime(payment.refunded_at)}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {payment.stripe_receipt_url && (
            <>
              <Separator />
              <a
                href={payment.stripe_receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Stripe Receipt
              </a>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPaymentsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("size", "20");
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const { data, isLoading } = useApiQuery<{
    items: AdminPayment[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }>(["admin-payments", String(page), statusFilter], `/admin/payments?${queryParams.toString()}`);

  const handleViewDetail = async (payment: AdminPayment) => {
    try {
      const detail = await adminService.getPayment(payment.id);
      setSelectedPayment(detail);
      setDetailOpen(true);
    } catch {
      toast({ title: "Failed to load payment details", variant: "destructive" });
    }
  };

  const columns: Column<AdminPayment>[] = [
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
      key: "amount",
      header: "Amount",
      cell: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span>,
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "method",
      header: "Method",
      cell: (row) => <span className="capitalize text-sm">{row.payment_method}</span>,
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
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-1">View and manage payment transactions</p>
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
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refund_pending">Refund Pending</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        }
        isLoading={isLoading}
        emptyMessage="No payments found"
        keyExtractor={(row) => row.id}
      />

      <PaymentDetailDialog payment={selectedPayment} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
