"use client";

import { Users, Ticket, DollarSign, Calendar, TrendingUp, ArrowRight, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiQuery } from "@/hooks/use-api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/status-badge";
import type { DashboardStats, EventPerformance, RecentActivityItem, RevenueDataPoint, RevenueResponse } from "@/types";
import Link from "next/link";

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No revenue data available
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-48">
        {data.map((point, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1"
            title={`${point.date}: ${formatCurrency(point.revenue)}`}
          >
            <div
              className="w-full bg-primary/80 rounded-t-sm min-h-[2px] transition-all hover:bg-primary"
              style={{ height: `${(point.revenue / maxRevenue) * 160}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {data.length > 0 && <span>{data[0].date}</span>}
        {data.length > 1 && <span>{data[data.length - 1].date}</span>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useApiQuery<DashboardStats>(
    ["admin-stats"],
    "/admin/dashboard/stats"
  );

  const { data: revenue } = useApiQuery<RevenueResponse>(
    ["admin-revenue"],
    "/admin/dashboard/revenue?period=daily"
  );

  const { data: performance } = useApiQuery<{ items: EventPerformance[] }>(
    ["admin-performance"],
    "/admin/dashboard/events-performance?limit=5"
  );

  const { data: activity } = useApiQuery<{ items: RecentActivityItem[]; total: number }>(
    ["admin-activity"],
    "/admin/dashboard/recent-activity?limit=10"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your platform performance</p>
      </div>

      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats?.total_revenue || 0)}
            icon={DollarSign}
            subtitle={`${stats?.confirmed_bookings || 0} confirmed bookings`}
          />
          <StatCard
            title="Total Bookings"
            value={stats?.total_bookings || 0}
            icon={Ticket}
            subtitle={`${stats?.recent_bookings_count || 0} in last 24h`}
          />
          <StatCard
            title="Active Events"
            value={stats?.active_events || 0}
            icon={Calendar}
            subtitle={`${stats?.total_events || 0} total events`}
          />
          <StatCard
            title="Total Users"
            value={stats?.total_users || 0}
            icon={Users}
            subtitle={`${stats?.recent_users_count || 0} in last 24h`}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Revenue Overview</CardTitle>
              <span className="text-sm text-muted-foreground">Last 30 days</span>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenue?.data || []} />
            {revenue && revenue.data.length > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                Total: {formatCurrency(revenue.total)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Events</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/events" className="flex items-center gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {performance?.items && performance.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.items.map((event) => (
                    <TableRow key={event.event_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{event.venue}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {event.sold_tickets}/{event.total_tickets}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(event.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No event data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/bookings" className="flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activity?.items && activity.items.length > 0 ? (
            <div className="space-y-3">
              {activity.items.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-start gap-3 py-2 border-b last:border-0"
                >
                  <div className="mt-0.5">
                    {item.type === "booking" && <Ticket className="h-4 w-4 text-blue-500" />}
                    {item.type === "registration" && <Users className="h-4 w-4 text-green-500" />}
                    {item.type === "payment" && <DollarSign className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                  </div>
                  {item.amount != null && (
                    <span className="text-sm font-medium whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No recent activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
