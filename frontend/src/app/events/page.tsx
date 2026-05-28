"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Filter, Grid, List, X, SlidersHorizontal, Sparkles, Calendar, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Shell } from "@/components/layout/shell";
import { EventCard } from "@/components/events/event-card";
import { useApiQuery } from "@/hooks/use-api";
import type { Event, PaginatedResponse } from "@/types";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 12;

interface EventFilters {
  search: string;
  category: string;
  date: string;
  price: string;
  sort: string;
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "concert", label: "Concerts" },
  { value: "sports", label: "Sports" },
  { value: "theater", label: "Theater" },
  { value: "comedy", label: "Comedy" },
  { value: "festival", label: "Festivals" },
];

const dateOptions = [
  { value: "all", label: "Any Date" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "upcoming", label: "Upcoming" },
];

const priceOptions = [
  { value: "all", label: "Any Price" },
  { value: "0-25", label: "Under $25" },
  { value: "25-50", label: "$25 - $50" },
  { value: "50-100", label: "$50 - $100" },
  { value: "100+", label: "$100+" },
];

const sortOptions = [
  { value: "date-asc", label: "Date (Earliest)" },
  { value: "date-desc", label: "Date (Latest)" },
  { value: "price-asc", label: "Price (Low to High)" },
  { value: "price-desc", label: "Price (High to Low)" },
  { value: "popular", label: "Most Popular" },
];

export default function EventsPage() {
  const [filters, setFilters] = useState<EventFilters>({
    search: "",
    category: "all",
    date: "all",
    price: "all",
    sort: "date-asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: paginatedData, isLoading, error, refetch } = useApiQuery<PaginatedResponse<Event>>(
    ["events"],
    "/events"
  );

  const events = paginatedData?.items || [];

  const filteredAndSortedEvents = useMemo(() => {
    if (!events) return [];

    let result = events.filter((event) => {
      const matchesSearch =
        filters.search === "" ||
        event.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        event.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        event.venue.toLowerCase().includes(filters.search.toLowerCase());

      const matchesCategory = filters.category === "all" || event.description.toLowerCase().includes(filters.category.toLowerCase());

      const eventDate = new Date(event.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const monthEnd = new Date(today);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      let matchesDate = true;
      if (filters.date === "today") {
        matchesDate = eventDate.toDateString() === today.toDateString();
      } else if (filters.date === "week") {
        matchesDate = eventDate >= today && eventDate <= weekEnd;
      } else if (filters.date === "month") {
        matchesDate = eventDate >= today && eventDate <= monthEnd;
      } else if (filters.date === "upcoming") {
        matchesDate = eventDate >= today;
      }

      let matchesPrice = true;
      if (filters.price === "0-25") {
        matchesPrice = event.price_per_ticket < 25;
      } else if (filters.price === "25-50") {
        matchesPrice = event.price_per_ticket >= 25 && event.price_per_ticket < 50;
      } else if (filters.price === "50-100") {
        matchesPrice = event.price_per_ticket >= 50 && event.price_per_ticket < 100;
      } else if (filters.price === "100+") {
        matchesPrice = event.price_per_ticket >= 100;
      }

      return matchesSearch && matchesCategory && matchesDate && matchesPrice;
    });

    result.sort((a, b) => {
      switch (filters.sort) {
        case "date-asc":
          return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        case "date-desc":
          return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
        case "price-asc":
          return a.price_per_ticket - b.price_per_ticket;
        case "price-desc":
          return b.price_per_ticket - a.price_per_ticket;
        case "popular":
          return (b.total_tickets - b.available_tickets) - (a.total_tickets - a.available_tickets);
        default:
          return 0;
      }
    });

    return result;
  }, [events, filters]);

  const totalPages = Math.ceil(filteredAndSortedEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = filteredAndSortedEvents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const activeFiltersCount = [
    filters.search,
    filters.category !== "all" && filters.category,
    filters.date !== "all" && filters.date,
    filters.price !== "all" && filters.price,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "all",
      date: "all",
      price: "all",
      sort: "date-asc",
    });
    setCurrentPage(1);
  };

  return (
    <Shell>
      <div className="flex-1">
        {/* Hero Section */}
        <section className="border-b bg-muted/30">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Discover amazing events</span>
              </div>
              <h1 className="font-display text-display-md md:text-display-lg font-semibold tracking-tight">
                Find Your Next Experience
              </h1>
              <p className="text-body-lg text-muted-foreground">
                From concerts to comedy shows, discover and book tickets to exclusive events near you.
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events, venues, or artists..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value });
                    setCurrentPage(1);
                  }}
                  variant="filled"
                  className="pl-12 h-12 text-base"
                />
              </div>

              {/* Quick Stats */}
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span>{events.length} events available</span>
                </div>
                <div className="h-1 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Multiple venues</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="container py-8 md:py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters - Desktop */}
            <aside className="hidden lg:block w-64 shrink-0 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </h3>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground px-2">Category</h4>
                  <div className="space-y-0.5">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => {
                          setFilters({ ...filters, category: cat.value });
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                          filters.category === cat.value
                            ? "bg-muted/80 text-foreground font-semibold border-l-2 border-primary pl-2.5"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        )}
                      >
                        <span>{cat.label}</span>
                        {filters.category === cat.value && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground px-2">Date</h4>
                  <div className="space-y-0.5">
                    {dateOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setFilters({ ...filters, date: opt.value });
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                          filters.date === opt.value
                            ? "bg-muted/80 text-foreground font-semibold border-l-2 border-primary pl-2.5"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        )}
                      >
                        <span>{opt.label}</span>
                        {filters.date === opt.value && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground px-2">Price</h4>
                  <div className="space-y-0.5">
                    {priceOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setFilters({ ...filters, price: opt.value });
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                          filters.price === opt.value
                            ? "bg-muted/80 text-foreground font-semibold border-l-2 border-primary pl-2.5"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        )}
                      >
                        <span>{opt.label}</span>
                        {filters.price === opt.value && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Events Grid */}
            <div className="flex-1 space-y-6">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{filteredAndSortedEvents.length}</span> events
                  </p>
                  {activeFiltersCount > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <Badge variant="outline" size="sm">{activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""}</Badge>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Mobile Filter Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="lg:hidden"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="primary" size="sm" className="ml-2">{activeFiltersCount}</Badge>
                    )}
                  </Button>

                  {/* View Mode Toggle */}
                  <div className="hidden sm:flex items-center border rounded-lg p-1 bg-muted/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "h-8 w-8 p-0",
                        viewMode === "grid" && "bg-background shadow-sm"
                      )}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "h-8 w-8 p-0",
                        viewMode === "list" && "bg-background shadow-sm"
                      )}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Sort Dropdown */}
                  <select
                    value={filters.sort}
                    onChange={(e) => {
                      setFilters({ ...filters, sort: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filters */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg">
                  <span className="text-xs font-medium text-muted-foreground">Active:</span>
                  {filters.search && (
                    <Badge variant="outline" removable size="sm" onRemove={() => {
                      setFilters({ ...filters, search: "" });
                      setCurrentPage(1);
                    }}>
                      "{filters.search}"
                    </Badge>
                  )}
                  {filters.category !== "all" && (
                    <Badge variant="outline" removable size="sm" onRemove={() => {
                      setFilters({ ...filters, category: "all" });
                      setCurrentPage(1);
                    }}>
                      {categories.find((c) => c.value === filters.category)?.label}
                    </Badge>
                  )}
                  {filters.date !== "all" && (
                    <Badge variant="outline" removable size="sm" onRemove={() => {
                      setFilters({ ...filters, date: "all" });
                      setCurrentPage(1);
                    }}>
                      {dateOptions.find((d) => d.value === filters.date)?.label}
                    </Badge>
                  )}
                  {filters.price !== "all" && (
                    <Badge variant="outline" removable size="sm" onRemove={() => {
                      setFilters({ ...filters, price: "all" });
                      setCurrentPage(1);
                    }}>
                      {priceOptions.find((p) => p.value === filters.price)?.label}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
                    Clear all
                  </Button>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} variant="card" />
                  ))}
                </div>
              )}

              {/* Error State */}
              {error && <ErrorState onRetry={() => refetch()} />}

              {/* Empty State */}
              {!isLoading && !error && filteredAndSortedEvents.length === 0 && (
                <div className="py-16">
                  <EmptyState
                    icon={Calendar}
                    title="No events found"
                    description={activeFiltersCount > 0
                      ? "We couldn't find any events matching your filters. Try adjusting your search criteria."
                      : "Check back later for new events and exciting experiences."
                    }
                    action={activeFiltersCount > 0 ? {
                      label: "Clear Filters",
                      onClick: clearFilters,
                      variant: "outline",
                    } : undefined}
                  />
                </div>
              )}

              {/* Events Grid */}
              {!isLoading && !error && filteredAndSortedEvents.length > 0 && (
                <>
                  <div className={cn(
                    "grid gap-6",
                    viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-1"
                  )}>
                    {paginatedEvents.map((event, i) => (
                      <div key={event.id} className="stagger-in" style={{ animationDelay: `${i * 50}ms` }}>
                        <EventCard event={event} layout={viewMode} />
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Mobile Filters Sheet */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
            <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-background shadow-xl slide-in-right overflow-y-auto">
              <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowMobileFilters(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 space-y-6">
                {/* Categories */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Category</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <Button
                        key={cat.value}
                        variant={filters.category === cat.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({ ...filters, category: cat.value })}
                        className="justify-start"
                      >
                        {cat.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Date</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {dateOptions.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={filters.date === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({ ...filters, date: opt.value })}
                        className="justify-start"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Price</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {priceOptions.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={filters.price === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({ ...filters, price: opt.value })}
                        className="justify-start"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-background border-t p-4 flex gap-3">
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Clear All
                </Button>
                <Button onClick={() => setShowMobileFilters(false)} className="flex-1">
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}