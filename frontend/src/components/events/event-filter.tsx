import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface EventFilters {
  search: string;
  category: string;
  date: string;
  price: string;
}

interface EventFilterProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  className?: string;
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

export function EventFilter({ filters, onFiltersChange, className }: EventFilterProps) {
  const hasActiveFilters =
    filters.search || filters.category !== "all" || filters.date !== "all" || filters.price !== "all";

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      category: "all",
      date: "all",
      price: "all",
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.category}
          onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.date}
          onValueChange={(value) => onFiltersChange({ ...filters, date: value })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.price}
          onValueChange={(value) => onFiltersChange({ ...filters, price: value })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <button
                onClick={() => onFiltersChange({ ...filters, search: "" })}
                className="hover:bg-secondary/80 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.category !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {categories.find((c) => c.value === filters.category)?.label}
              <button
                onClick={() => onFiltersChange({ ...filters, category: "all" })}
                className="hover:bg-secondary/80 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.date !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {dateOptions.find((d) => d.value === filters.date)?.label}
              <button
                onClick={() => onFiltersChange({ ...filters, date: "all" })}
                className="hover:bg-secondary/80 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.price !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {priceOptions.find((p) => p.value === filters.price)?.label}
              <button
                onClick={() => onFiltersChange({ ...filters, price: "all" })}
                className="hover:bg-secondary/80 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
