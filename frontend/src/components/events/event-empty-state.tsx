import { Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventEmptyStateProps {
  isFiltered: boolean;
  onClearFilters?: () => void;
}

export function EventEmptyState({ isFiltered, onClearFilters }: EventEmptyStateProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          {isFiltered ? (
            <Search className="h-10 w-10 text-muted-foreground" />
          ) : (
            <Calendar className="h-10 w-10 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {isFiltered ? "No events found" : "No events available"}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {isFiltered
              ? "Try adjusting your search or filters to find what you're looking for."
              : "We're working on bringing you amazing events. Check back soon!"}
          </p>
        </div>

        {isFiltered && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
