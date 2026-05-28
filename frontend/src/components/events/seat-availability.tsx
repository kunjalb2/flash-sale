"use client";

import { useState } from "react";
import { Ticket as TicketIcon, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Ticket } from "@/types";

interface SeatAvailabilityProps {
  tickets: Ticket[];
  selectedTickets: string[];
  maxSelection?: number;
  onSelectionChange: (selectedIds: string[]) => void;
  className?: string;
}

const seatTypeColors = {
  general: "bg-slate-100 border-slate-300 hover:border-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600",
  vip: "bg-amber-50 border-amber-300 hover:border-amber-400 dark:bg-amber-950/30 dark:border-amber-700 dark:hover:border-amber-600",
  premium: "bg-purple-50 border-purple-300 hover:border-purple-400 dark:bg-purple-950/30 dark:border-purple-700 dark:hover:border-purple-600",
};

const seatTypeLabels = {
  general: "Standard",
  vip: "VIP",
  premium: "Premium",
};

export function SeatAvailability({
  tickets,
  selectedTickets,
  maxSelection = 5,
  onSelectionChange,
  className,
}: SeatAvailabilityProps) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  const availableTickets = tickets.filter((t) => t.status === "available");
  const reservedTickets = tickets.filter((t) => t.status === "reserved");
  const soldTickets = tickets.filter((t) => t.status === "sold");

  const isMaxSelected = selectedTickets.length >= maxSelection;
  const canSelectMore = !isMaxSelected;

  const toggleSeat = (seatId: string) => {
    const newSelection = selectedTickets.includes(seatId)
      ? selectedTickets.filter((id) => id !== seatId)
      : [...selectedTickets, seatId];

    onSelectionChange(newSelection);
  };

  const getSeatStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return null;
      case "reserved":
        return <Clock className="h-3 w-3" />;
      case "sold":
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <XCircle className="h-3 w-3" />;
    }
  };

  const getSeatStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Available";
      case "reserved":
        return "Reserved";
      case "sold":
        return "Sold";
      default:
        return status;
    }
  };

  const selectedTotal = tickets
    .filter((t) => selectedTickets.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0);

  if (availableTickets.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted mb-4">
          <XCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No tickets available</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          All tickets for this event have been reserved or sold.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700" />
            <span className="text-muted-foreground">Available ({availableTickets.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-200 dark:bg-amber-800" />
            <span className="text-muted-foreground">Reserved ({reservedTickets.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-200 dark:bg-emerald-800" />
            <span className="text-muted-foreground">Sold ({soldTickets.length})</span>
          </div>
        </div>
        <Badge variant={isMaxSelected ? "secondary" : "default"}>
          {selectedTickets.length}/{maxSelection} selected
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {availableTickets.map((ticket) => {
          const isSelected = selectedTickets.includes(ticket.id);
          const seatColorClass = seatTypeColors[ticket.seat_type as keyof typeof seatTypeColors] || seatTypeColors.general;

          return (
            <button
              key={ticket.id}
              onClick={() => toggleSeat(ticket.id)}
              onMouseEnter={() => setHoveredSeat(ticket.id)}
              onMouseLeave={() => setHoveredSeat(null)}
              disabled={!canSelectMore && !isSelected}
              className={cn(
                "relative group p-4 rounded-xl border-2 text-left transition-all duration-200",
                seatColorClass,
                isSelected
                  ? "ring-2 ring-offset-2 ring-offset-background ring-foreground shadow-md"
                  : "hover:shadow-sm",
                !canSelectMore && !isSelected && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <TicketIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Seat {ticket.seat_number}</span>
                  </div>
                  {ticket.section && (
                    <p className="text-xs text-muted-foreground">
                      Section {ticket.section}
                      {ticket.row && `, Row ${ticket.row}`}
                    </p>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {seatTypeLabels[ticket.seat_type as keyof typeof seatTypeLabels]}
                  </Badge>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-display text-lg font-semibold">
                    {formatCurrency(ticket.price)}
                  </p>
                  {getSeatStatusIcon(ticket.status)}
                </div>
              </div>

              {hoveredSeat === ticket.id && !isSelected && (
                <div className="absolute inset-0 rounded-xl bg-foreground/5 flex items-center justify-center">
                  <span className="text-sm font-medium bg-background px-3 py-1.5 rounded-lg shadow-sm">
                    {canSelectMore ? "Click to select" : "Max selection reached"}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedTickets.length > 0 && (
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-display text-2xl font-bold">
                {formatCurrency(selectedTotal)}
              </p>
            </div>
            <Button size="lg" className="min-w-[140px]">
              Continue to checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
