"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Shield, Zap, TrendingUp, Users, Clock, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api";
import type { Event, PaginatedResponse } from "@/types";
import { cn, formatDate, formatTime } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, trend, size = "lg" }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  size?: "sm" | "lg";
}) {
  return (
    <Card variant="flat" className={cn("hover:-translate-y-0.5 hover:shadow-md transition-all duration-300", size === "lg" ? "p-6" : "p-4")}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center rounded-xl bg-background border border-border/50 shadow-sm shrink-0",
          size === "lg" ? "h-12 w-12" : "h-10 w-10"
        )}>
          <Icon className={cn("text-foreground/70", size === "lg" ? "h-5.5 w-5.5" : "h-5 w-5")} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate">{label}</p>
          <p className={cn("font-display font-bold leading-tight mt-0.5", size === "lg" ? "text-2xl" : "text-lg")}>{value}</p>
        </div>
        {trend && (
          <Badge variant={trend.positive ? "success" : "destructive"} size="sm" dot className="shrink-0 ml-1">
            {trend.value}
          </Badge>
        )}
      </div>
    </Card>
  );
}

function FeaturedEventCard({ event }: { event: Event }) {
  const isSoldOut = event.available_tickets === 0;
  const isEndingSoon = new Date(event.sale_end_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <Link href={`/events/${event.id}`} className="group block h-full">
      <Card variant="default" size="none" hover className="overflow-hidden h-full flex flex-col">
        <div className="relative aspect-[16/9] overflow-hidden bg-muted shrink-0">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Calendar className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          <div className="absolute top-3 right-3 flex gap-2">
            {isSoldOut && (
              <Badge variant="destructive">Sold Out</Badge>
            )}
            {isEndingSoon && !isSoldOut && (
              <Badge variant="warning">Ending Soon</Badge>
            )}
          </div>
        </div>

        <CardContent className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1.5 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{event.venue}</span>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(event.event_date)}</span>
            </div>
            <span className="font-semibold text-sm text-foreground">${event.price_per_ticket}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActivityTicker({ activities }: { activities?: string[] }) {
  return (
    <div className="border-t border-b bg-muted/30 py-3">
      <div className="container">
        <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-success pulse-subtle" />
            Live Activity
          </span>
          {activities?.length ? (
            activities.map((activity, i) => (
              <span key={i} className="text-sm text-muted-foreground whitespace-nowrap stagger-in" style={{ animationDelay: `${i * 100}ms` }}>
                {activity}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">5 tickets sold in the last 2 minutes</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: eventsData, isLoading } = useApiQuery<PaginatedResponse<Event>>(
    ["events", "featured"],
    "/events?limit=4&is_active=true"
  );

  const featuredEvents = eventsData?.items?.slice(0, 4) || [];

  return (
    <Shell>
      <div className="flex-1">
        {/* Hero Section */}
        <section className="container py-16 md:py-24 lg:py-32">
          <div className="mx-auto max-w-3xl text-center space-y-8 animate-in">
            <div className="inline-flex items-center rounded-full border border-success/30 bg-success/5 px-4 py-1.5 text-xs font-semibold text-success uppercase tracking-wider">
              <span className="relative mr-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
              </span>
              Live ticket sales in progress
            </div>
            <h1 className="font-display text-display-md md:text-display-lg font-semibold tracking-tight">
              Premium Events, Secured Tickets
            </h1>
            <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
              Discover exclusive events with real-time inventory and seamless checkout. Join thousands securing their spots today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild className="h-12 px-8">
                <Link href="/events" className="flex items-center gap-2">
                  Browse Events
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8">
                <Link href="/auth/register">Get Started</Link>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-8">
              <StatCard
                icon={Calendar}
                label="Events Listed"
                value="150+"
                size="sm"
              />
              <StatCard
                icon={Users}
                label="Happy Attendees"
                value="10K+"
                size="sm"
              />
              <StatCard
                icon={CheckCircle2}
                label="Success Rate"
                value="99.9%"
                size="sm"
              />
            </div>
          </div>
        </section>

        {/* Live Activity Ticker */}
        <ActivityTicker />

        {/* Featured Events */}
        <section className="container py-16 md:py-24">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Featured Events</h2>
              <p className="text-muted-foreground mt-1">Don't miss these upcoming experiences</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/events" className="flex items-center gap-2">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="card" />
              ))}
            </div>
          ) : featuredEvents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {featuredEvents.map((event, i) => (
                <div key={event.id} className="stagger-in" style={{ animationDelay: `${i * 100}ms` }}>
                  <FeaturedEventCard event={event} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No featured events at this time</p>
            </div>
          )}
        </section>

        {/* Value Proposition */}
        <section className="border-t bg-muted/50">
          <div className="container py-16 md:py-24">
            <div className="text-center mb-12">
              <h2 className="font-display text-display-sm font-semibold tracking-tight mb-4">
                Why Choose SeatFlow?
              </h2>
              <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
                Premium ticket booking designed for peace of mind
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <Card variant="flat" className="p-8 text-center space-y-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:bg-muted/40">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-background border border-border/50 shadow-sm text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-semibold text-lg tracking-tight">Lightning Fast</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Sub-second response times ensure you never miss a ticket. Our distributed system handles thousands of concurrent reservations.
                  </p>
                </div>
              </Card>

              <Card variant="flat" className="p-8 text-center space-y-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:bg-muted/40">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-background border border-border/50 shadow-sm text-primary">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-semibold text-lg tracking-tight">Secure Payments</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Industry-standard encryption with Stripe integration. Your transactions and personal information are always protected.
                  </p>
                </div>
              </Card>

              <Card variant="flat" className="p-8 text-center space-y-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:bg-muted/40">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-background border border-border/50 shadow-sm text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-semibold text-lg tracking-tight">Exclusive Events</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Access premium events with flash-sale pricing. Early access for registered members and personalized recommendations.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container py-16 md:py-24">
          <Card variant="elevated" className="p-8 md:p-12 text-center space-y-6 max-w-3xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Ready to secure your spot?
            </h2>
            <p className="text-body-lg text-muted-foreground">
              Join thousands of event-goers who trust SeatFlow for their ticketing needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button size="lg" asChild className="h-12 px-8">
                <Link href="/auth/register" className="flex items-center gap-2">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8">
                <Link href="/events">Browse Events</Link>
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </Shell>
  );
}