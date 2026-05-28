"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  // Booking statuses
  reserved: { label: "Reserved", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  expired: { label: "Expired", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
  // Payment statuses
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  processing: { label: "Processing", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  succeeded: { label: "Succeeded", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  refunded: { label: "Refunded", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
  refund_pending: { label: "Refund Pending", className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
  // Ticket statuses
  available: { label: "Available", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  sold: { label: "Sold", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  // User status
  active: { label: "Active", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  if (!config) {
    return <Badge className={className}>{status}</Badge>;
  }

  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
