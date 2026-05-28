"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Ticket, ArrowRight, Bell, Search, Settings, HelpCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Shell } from "@/components/layout/shell";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useApiQuery } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { cn, formatDateTime, formatCurrency } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  description?: string;
}

function StatCard({ title, value, icon: Icon, trend, description }: StatCardProps) {
  return (
    <Card variant="default" hover className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {trend && (
          <Badge variant={trend.positive ? "success" : "destructive"} size="sm" dot>
            {trend.value}
          </Badge>
        )}
      </div>
    </Card>
  );
}

interface ActivityItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  time: string;
  variant?: "default" | "success" | "warning" | "error";
}

function ActivityItem({ icon: Icon, title, description, time, variant = "default" }: ActivityItemProps) {
  const variantColors = {
    default: "bg-muted",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", variantColors[variant])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, variant = "default" }: {
  icon: React.ElementType;
  label: string;
  href: string;
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <Button variant={variant} asChild className="w-full justify-start h-auto py-3 px-4">
      <Link href={href} className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const { data: bookings, isLoading } = useApiQuery(
    ["bookings"],
    "/bookings"
  );

  const upcomingBookings = bookings?.filter((booking: any) => {
    const eventDate = new Date(booking.event?.event_date || "");
    return eventDate > new Date();
  }) || [];

  const pastBookings = bookings?.filter((booking: any) => {
    const eventDate = new Date(booking.event?.event_date || "");
    return eventDate <= new Date();
  }) || [];

  const totalSpent = bookings?.reduce((sum: number, booking: any) => sum + booking.total_price, 0) || 0;
  const totalTickets = bookings?.reduce((sum: number, booking: any) => sum + booking.quantity, 0) || 0;

  const hasBookings = (bookings?.length || 0) > 0;

  const getGreetingName = () => {
    const name = user?.full_name?.split(" ")[0];
    return name || "there";
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="container py-8">
          <div className="space-y-6">
            <Skeleton variant="title" />
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
            <Skeleton variant="title" />
            <div className="space-y-4">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-display-sm font-semibold tracking-tight">
              {greeting}, {getGreetingName()}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Here&apos;s what&apos;s happening with your bookings
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link href="/profile">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        {!hasBookings ? (
          /* New User State */
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <Card variant="flat" className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Ticket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Welcome to SeatFlow!</h3>
                  <p className="text-muted-foreground mt-1">
                    You&apos;re all set up. Start exploring events and book your first ticket.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link href="/events">
                    Browse Events
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </Card>

              <Card variant="flat" className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Stay Updated</h3>
                  <p className="text-muted-foreground mt-1">
                    Get notified about new events and exclusive offers.
                  </p>
                </div>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/profile">
                    Manage Preferences
                  </Link>
                </Button>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card variant="flat" className="p-6">
              <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickAction
                  icon={Search}
                  label="Find Events"
                  href="/events"
                  variant="outline"
                />
                <QuickAction
                  icon={HelpCircle}
                  label="Get Help"
                  href="/help"
                  variant="outline"
                />
              </div>
            </Card>
          </div>
        ) : (
          /* Existing User State */
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid gap-6 md:grid-cols-3">
              <StatCard
                title="Total Bookings"
                value={bookings?.length || 0}
                icon={Ticket}
                trend={{ value: "+12%", positive: true }}
                description="This month"
              />
              <StatCard
                title="Upcoming Events"
                value={upcomingBookings.length}
                icon={Calendar}
                description="Next 30 days"
              />
              <StatCard
                title="Total Spent"
                value={formatCurrency(totalSpent)}
                icon={TrendingUp}
                trend={{ value: "+8%", positive: true }}
                description="All time"
              />
            </div>

            {/* Quick Actions */}
            <Card variant="flat" className="p-6">
              <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickAction
                  icon={Search}
                  label="Browse Events"
                  href="/events"
                  variant="outline"
                />
                <QuickAction
                  icon={Clock}
                  label="My Bookings"
                  href="/bookings"
                  variant="outline"
                />
                <QuickAction
                  icon={Ticket}
                  label="Upcoming Events"
                  href="/bookings?filter=upcoming"
                  variant="outline"
                />
                <QuickAction
                  icon={HelpCircle}
                  label="Get Help"
                  href="/help"
                  variant="outline"
                />
              </div>
            </Card>

            {/* Upcoming Events */}
            {upcomingBookings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display text-h2 font-semibold tracking-tight">Upcoming Events</h2>
                    <p className="text-muted-foreground text-sm">Your next {upcomingBookings.length} event{upcomingBookings.length > 1 ? "s" : ""}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/bookings" className="flex items-center gap-2">
                      View all
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {upcomingBookings.slice(0, 4).map((booking: any, i) => (
                    <Link key={booking.id} href={`/bookings/${booking.id}`}>
                      <Card variant="interactive" className="stagger-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1 min-w-0">
                              <h3 className="font-semibold line-clamp-1">{booking.event?.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDateTime(booking.event?.event_date || "")}
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Ticket className="h-3.5 w-3.5" />
                                  <span>{booking.quantity} ticket{booking.quantity > 1 ? "s" : ""}</span>
                                </div>
                                <Separator orientation="vertical" className="h-4" />
                                <span className={cn(
                                  "text-xs font-medium px-2 py-0.5 rounded-full",
                                  booking.payment_status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                                )}>
                                  {booking.payment_status === "completed" ? "Paid" : "Pending"}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold">{formatCurrency(booking.total_price)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-h2 font-semibold tracking-tight">Recent Activity</h2>
                  <p className="text-muted-foreground text-sm">Your latest actions</p>
                </div>
              </div>

              <Card variant="flat" className="p-2">
                <div className="space-y-1">
                  {upcomingBookings.slice(0, 5).map((booking: any, i) => (
                    <ActivityItem
                      key={booking.id}
                      icon={Ticket}
                      title="Booking Confirmed"
                      description={`${booking.event?.title} • ${booking.quantity} ticket${booking.quantity > 1 ? "s" : ""}`}
                      time={formatDateTime(booking.created_at || "")}
                      variant="success"
                    />
                  ))}

                  {upcomingBookings.length === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Need Help */}
            <Card variant="flat" className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Need help with your bookings?</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Our support team is here to assist you
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/help">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Get Help
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Shell>
  );
}