"use client";

import { useState, useMemo } from "react";
import { Plus, MoreHorizontal, Edit, Trash2, Eye, Archive, Download, TrendingUp, Calendar, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useApiQuery } from "@/hooks/use-api";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/hooks/use-api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { adminService } from "@/services/admin";
import type { Event, Column } from "@/types";
import Link from "next/link";

interface EventStats {
  totalEvents: number;
  activeEvents: number;
  totalTickets: number;
  totalRevenue: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  description?: string;
}) {
  return (
    <Card variant="flat" className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-2">
          <Badge variant={trend.positive ? "success" : "destructive"} size="sm" dot>
            {trend.value}
          </Badge>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
    </Card>
  );
}

export default function AdminEventsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", "20");
    if (search) params.set("search", search);
    if (statusFilter === "active") params.set("is_active", "true");
    if (statusFilter === "inactive") params.set("is_active", "false");
    return params.toString();
  }, [page, search, statusFilter]);

  const { data, isLoading, refetch } = useApiQuery<{
    items: Event[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }>(["admin-events", queryParams], `/events?${queryParams}`);

  const { data: stats } = useApiQuery<EventStats>(
    ["admin-events-stats"],
    "/admin/events/stats"
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/events/${deleteId}`);
      toast({ title: "Success", description: "Event deleted successfully" });
      refetch();
      setDeleteId(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast({ variant: "destructive", title: "Error", description: error.response?.data?.detail || "Failed to delete event" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => api.delete(`/events/${id}`)));
      toast({ title: "Success", description: `${ids.length} event${ids.length > 1 ? "s" : ""} deleted successfully` });
      setSelectedIds([]);
      refetch();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete events" });
    }
  };

  const handleBulkArchive = async (ids: string[]) => {
    setArchiveLoading(true);
    try {
      await Promise.all(ids.map(id => api.patch(`/events/${id}`, { is_active: false })));
      toast({ title: "Success", description: `${ids.length} event${ids.length > 1 ? "s" : ""} archived successfully` });
      setSelectedIds([]);
      refetch();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: "Failed to archive events" });
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleExport = (ids: string[]) => {
    // This would be implemented with a proper export endpoint
    const eventsToExport = data?.items.filter(e => ids.includes(e.id)) || [];
    const csvContent = [
      "ID,Title,Venue,Date,Total Tickets,Available Tickets,Price,Status",
      ...eventsToExport.map(e =>
        `${e.id},"${e.title}","${e.venue}",${e.event_date},${e.total_tickets},${e.available_tickets},${e.price_per_ticket},${e.is_active ? "Active" : "Inactive"}`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `events-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<Event>[] = [
    {
      key: "title",
      header: "Event",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-muted">
              <img src={row.image_url} alt={row.title} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-lg bg-muted shrink-0 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium line-clamp-1">{row.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{row.venue}</p>
          </div>
        </div>
      ),
    },
    {
      key: "event_date",
      header: "Date",
      cell: (row) => <span className="text-sm">{formatDate(row.event_date)}</span>,
      sortable: true,
    },
    {
      key: "tickets",
      header: "Tickets",
      cell: (row) => (
        <div className="space-y-1">
          <span className="text-sm font-medium">{row.available_tickets}</span>
          <span className="text-xs text-muted-foreground"> / {row.total_tickets}</span>
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: `${(row.available_tickets / row.total_tickets) * 100}%`
              }}
            />
          </div>
        </div>
      ),
      className: "text-right",
    },
    {
      key: "revenue",
      header: "Revenue",
      cell: (row) => {
        const revenue = (row.total_tickets - row.available_tickets) * row.price_per_ticket;
        return <span className="text-sm font-medium">{formatCurrency(revenue)}</span>;
      },
      className: "text-right",
    },
    {
      key: "price",
      header: "Price",
      cell: (row) => <span className="text-sm font-medium">{formatCurrency(row.price_per_ticket)}</span>,
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.is_active ? "active" : "inactive"} />,
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
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/admin/events/${row.id}`} className="flex items-center gap-2">
                <Eye className="h-4 w-4" /> View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/admin/events/${row.id}?edit=true`} className="flex items-center gap-2">
                <Edit className="h-4 w-4" /> Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/events/${row.id}`} className="flex items-center gap-2" target="_blank">
                <Eye className="h-4 w-4" /> View Public Page
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteId(row.id)}
              className="cursor-pointer text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm font-semibold tracking-tight">Events</h1>
          <p className="text-muted-foreground mt-1">Manage your events and track sales performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/reports" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Reports
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/events/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-4">
          <StatCard
            title="Total Events"
            value={stats.totalEvents}
            icon={Calendar}
            trend={{ value: "+12%", positive: true }}
            description="All time"
          />
          <StatCard
            title="Active Events"
            value={stats.activeEvents}
            icon={Clock}
            description="Currently live"
          />
          <StatCard
            title="Total Tickets Sold"
            value={stats.totalTickets.toLocaleString()}
            icon={TrendingUp}
            trend={{ value: "+18%", positive: true }}
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            trend={{ value: "+24%", positive: true }}
          />
        </div>
      )}

      {/* Events Table */}
      <Card variant="default" className="p-6">
        <DataTable
          columns={columns}
          data={data?.items || []}
          total={data?.total || 0}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          searchPlaceholder="Search events by title, venue..."
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          filters={
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={(val) => { setDateRange(val); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          isLoading={isLoading}
          emptyMessage="No events found"
          emptyAction={
            <Button asChild>
              <Link href="/admin/events/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create Your First Event
              </Link>
            </Button>
          }
          keyExtractor={(row) => row.id}
          selectable
          onSelectRows={setSelectedIds}
          bulkActions={[
            {
              label: "Archive",
              icon: Archive,
              onClick: handleBulkArchive,
              variant: "outline",
            },
            {
              label: "Delete",
              icon: Trash2,
              onClick: handleBulkDelete,
              variant: "destructive",
            },
          ]}
          exportable
          onExport={handleExport}
        />
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone. Events with existing bookings cannot be deleted."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}