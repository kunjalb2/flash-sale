"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search, X, Download, Trash2, Archive, MoreHorizontal, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import type { Column } from "@/types";

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  keyExtractor: (row: T) => string;
  selectable?: boolean;
  onSelectRows?: (selectedIds: string[]) => void;
  bulkActions?: Array<{
    label: string;
    icon?: React.ElementType;
    onClick: (selectedIds: string[]) => void;
    variant?: "default" | "destructive" | "outline" | "ghost";
  }>;
  exportable?: boolean;
  onExport?: (selectedIds: string[]) => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string, direction: "asc" | "desc") => void;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filters,
  isLoading = false,
  emptyMessage = "No data found",
  emptyAction,
  keyExtractor,
  selectable = false,
  onSelectRows,
  bulkActions,
  exportable = false,
  onExport,
  sortColumn,
  sortDirection,
  onSort,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize);
  const [localSearch, setLocalSearch] = useState(searchValue);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const clearSearch = () => {
    setLocalSearch("");
    if (onSearchChange) {
      onSearchChange("");
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
    onSelectRows?.(Array.from(newSelected));
    setSelectAll(newSelected.size === data.length);
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    const newSelected = newSelectAll ? new Set(data.map(keyExtractor)) : new Set();
    setSelectedRows(newSelected);
    onSelectRows?.(Array.from(newSelected));
    setSelectAll(newSelectAll);
  };

  const handleBulkAction = (action: typeof bulkActions[number]) => {
    if (selectedRows.size === 0) {
      toast({ title: "No items selected", description: "Please select at least one item to perform this action." });
      return;
    }

    action.onClick(Array.from(selectedRows));
    setSelectedRows(new Set());
    setSelectAll(false);
  };

  const handleExport = () => {
    const idsToExport = selectedRows.size > 0 ? Array.from(selectedRows) : data.map(keyExtractor);
    onExport?.(idsToExport);
    toast({ title: "Export started", description: "Your data is being prepared for download." });
  };

  const handleSort = (columnKey: string) => {
    if (!onSort) return;

    if (sortColumn === columnKey) {
      onSort(columnKey, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSort(columnKey, "asc");
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const hasBulkActions = bulkActions && bulkActions.length > 0;

  return (
    <div className="space-y-4">
      {/* Header with search, filters, and actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
          {onSearchChange && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {localSearch && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {filters && <div className="flex items-center gap-2 flex-wrap">{filters}</div>}
        </div>

        <div className="flex items-center gap-2">
          {exportable && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Bulk actions bar */}
      {hasBulkActions && selectedRows.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border slide-in-bottom">
          <span className="text-sm font-medium">
            {selectedRows.size} item{selectedRows.size !== 1 ? "s" : ""} selected
          </span>
          <div className="h-4 w-px bg-border" />
          {bulkActions.map((action, i) => (
            <Button
              key={i}
              variant={action.variant || "default"}
              size="sm"
              onClick={() => handleBulkAction(action)}
            >
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => { setSelectedRows(new Set()); setSelectAll(false); }}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden shadow-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.className,
                    onSort && "cursor-pointer hover:bg-muted/50 transition-colors"
                  )}
                  onClick={() => onSort && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {getSortIcon(col.key)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {selectable && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-5 w-full max-w-[120px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <p className="text-muted-foreground">{emptyMessage}</p>
                    {emptyAction}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => {
                const rowId = keyExtractor(row);
                return (
                  <TableRow
                    key={rowId}
                    className={cn(
                      "transition-colors hover:bg-muted/50",
                      selectedRows.has(rowId) && "bg-muted/80"
                    )}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(rowId)}
                          onCheckedChange={() => handleSelectRow(rowId)}
                          aria-label={`Select row ${i + 1}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={String(pageSize)} onValueChange={(val) => {
                // This would need to be handled by parent
                window.location.href = `?size=${val}`;
              }}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-9 h-9"
                    onClick={() => onPageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}