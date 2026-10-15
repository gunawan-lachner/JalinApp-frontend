"use client";

import type React from "react";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  GripVertical,
} from "lucide-react";
import type { BinRoutingRoute } from "@/lib/types";

interface Column {
  key: keyof BinRoutingRoute | "actions" | string;
  label: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

interface RouteTableProps {
  routes: BinRoutingRoute[];
  selectedRows: Set<number>;
  onRowSelect: (index: number) => void;
  onRowSelectAll: (selectAll: boolean) => void;
  onRightClick?: (
    e: React.MouseEvent,
    rowIndex: number,
    cell?: { key: string; value: string }
  ) => void;
  sortConfig: { key: string; direction: "asc" | "desc" } | null;
  onSort: (key: string) => void;
  columnFilters: Record<string, string>;
  onColumnFilter: (key: string, value: string) => void;
  hiddenColumns: Set<string>;
  onColumnVisibilityChange: (columnKey: string) => void;
  paginationState: {
    currentPage: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isPaginationLoading: boolean;
  onDelete: (route: BinRoutingRoute) => void;
  onRowDoubleClick?: (route: BinRoutingRoute) => void;
  hidePagination?: boolean;
}

const defaultColumns: Column[] = [
  {
    key: "id",
    label: "ID",
    width: 80,
    minWidth: 60,
    maxWidth: 120,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "priority",
    label: "Priority",
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "match_status",
    label: "Match Status",
    width: 140,
    minWidth: 120,
    maxWidth: 200,
    resizable: true,
    sortable: true,
    filterable: true,
  },

  {
    key: "acq_name",
    label: "Acquirer",
    width: 220,
    minWidth: 160,
    maxWidth: 320,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "bin_details_id",
    label: "BIN Details ID",
    width: 140,
    minWidth: 120,
    maxWidth: 200,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "bin_lower",
    label: "BIN Lower",
    width: 120,
    minWidth: 100,
    maxWidth: 180,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "bin_upper",
    label: "BIN Upper",
    width: 120,
    minWidth: 100,
    maxWidth: 180,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "bin_holder_name",
    label: "BIN Holder Name",
    width: 240,
    minWidth: 160,
    maxWidth: 360,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "gateway_name",
    label: "Gateway",
    width: 200,
    minWidth: 150,
    maxWidth: 300,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "iss_name",
    label: "Issuer / Participant",
    width: 260,
    minWidth: 180,
    maxWidth: 360,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "container_plugin_name",
    label: "Container Plugin",
    width: 220,
    minWidth: 150,
    maxWidth: 320,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "rule",
    label: "Rule",
    width: 160,
    minWidth: 120,
    maxWidth: 240,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "description",
    label: "Description",
    width: 240,
    minWidth: 160,
    maxWidth: 360,
    resizable: true,
    sortable: true,
    filterable: true,
  },
];

// Cache key for storing column configuration
const COLUMN_CONFIG_KEY = "rna_routes_columns_config";

// Helper functions for column configuration persistence - matching transaction table
const saveColumnConfig = (columns: Column[]) => {
  if (typeof window !== "undefined") {
    const config = columns.map((col) => ({
      key: col.key,
      width: col.width,
      order: columns.findIndex((c) => c.key === col.key),
    }));
    localStorage.setItem(COLUMN_CONFIG_KEY, JSON.stringify(config));
  }
};

const loadColumnConfig = (defaultColumns: Column[]): Column[] => {
  if (typeof window === "undefined") return defaultColumns;

  try {
    const savedConfig = localStorage.getItem(COLUMN_CONFIG_KEY);
    if (!savedConfig) return defaultColumns;

    const config = JSON.parse(savedConfig) as Array<{
      key: string;
      width: number;
      order: number;
    }>;

    // Create a map of saved configurations
    const configMap = new Map(config.map((c) => [c.key, c]));

    // Apply saved widths to default columns
    const updatedColumns = defaultColumns.map((col) => {
      const saved = configMap.get(col.key);
      return {
        ...col,
        width: saved?.width || col.width,
      };
    });

    // Sort columns by saved order
    const orderedColumns = [...updatedColumns].sort((a, b) => {
      const aSaved = configMap.get(a.key);
      const bSaved = configMap.get(b.key);
      const aOrder = aSaved?.order ?? 999;
      const bOrder = bSaved?.order ?? 999;
      return aOrder - bOrder;
    });

    return orderedColumns;
  } catch (error) {
    return defaultColumns;
  }
};

export function RouteTable({
  routes,
  selectedRows,
  onRowSelect,
  onRowSelectAll,
  onRightClick,
  sortConfig,
  onSort,
  columnFilters,
  onColumnFilter,
  hiddenColumns,
  onColumnVisibilityChange,
  paginationState,
  onPageChange,
  onPageSizeChange,
  isPaginationLoading,
  onDelete,
  onRowDoubleClick,
  hidePagination = false,
}: RouteTableProps) {
  const [columns, setColumns] = useState<Column[]>(() =>
    loadColumnConfig(defaultColumns)
  );
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<number | null>(null);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<number | null>(null);

  // Column resizing state - matching working pattern from transaction-table
  const [isResizing, setIsResizing] = useState(false);
  const [resizeData, setResizeData] = useState<{
    columnIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Get visible columns (needs to be before resize handlers)
  const visibleColumns = columns.filter((col) => !hiddenColumns.has(col.key));

  // Improved column resizing handlers (exact pattern from transaction-table)
  const startResize = useCallback(
    (e: React.MouseEvent, columnIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = visibleColumns[columnIndex].width;

      setIsResizing(true);
      setResizeData({ columnIndex, startX, startWidth });

      // Add cursor style to body
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [visibleColumns]
  );

  const handleResize = useCallback(
    (e: MouseEvent) => {
      if (!resizeData || !isResizing) return;

      const deltaX = e.clientX - resizeData.startX;
      const col = visibleColumns[resizeData.columnIndex];
      const newWidth = Math.max(
        col.minWidth || 60,
        Math.min(col.maxWidth || 800, resizeData.startWidth + deltaX)
      );

      // Update column width
      const newColumns = [...columns];
      const columnKey = visibleColumns[resizeData.columnIndex].key;
      const fullColumnIndex = newColumns.findIndex((c) => c.key === columnKey);

      if (fullColumnIndex !== -1) {
        newColumns[fullColumnIndex] = {
          ...newColumns[fullColumnIndex],
          width: newWidth,
        };
        setColumns(newColumns);
      }
    },
    [resizeData, isResizing, columns, visibleColumns]
  );

  const stopResize = useCallback(() => {
    if (isResizing && resizeData) {
      // Save configuration when resize ends
      saveColumnConfig(columns);
    }

    setIsResizing(false);
    setResizeData(null);

    // Reset cursor
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [isResizing, resizeData, columns]);

  // Effect for mouse events during resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResize);

      return () => {
        document.removeEventListener("mousemove", handleResize);
        document.removeEventListener("mouseup", stopResize);
      };
    }
  }, [isResizing, handleResize, stopResize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const getFilteredRoutes = () => {
    let filtered = [...routes];
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue?.trim()) {
        filtered = filtered.filter((route: any) => {
          const cellValue = String(
            route[columnKey as keyof BinRoutingRoute] ?? ""
          ).toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      }
    });
    return filtered;
  };

  const filteredRoutes = getFilteredRoutes();

  const getSortedRoutes = () => {
    if (!sortConfig) return filteredRoutes;
    return [...filteredRoutes].sort((a: any, b: any) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
      const aStr = String(aValue ?? "").toLowerCase();
      const bStr = String(bValue ?? "").toLowerCase();
      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sortedAndFilteredRoutes = getSortedRoutes();

  // Compute simple status counters
  const statusCounts = (() => {
    const counts = { s0: 0, s1: 0, s2: 0, s3: 0 };
    for (const r of routes as any[]) {
      const s = Number((r && r.match_status) ?? 0);
      if (s === 1) counts.s1++;
      else if (s === 2) counts.s2++;
      else if (s === 3) counts.s3++;
      else counts.s0++;
    }
    return counts;
  })();

  // Column manager
  const ColumnManager = () => (
    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 z-50 w-80">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">Manage Columns</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowColumnManager(false)}
          className="h-6 w-6 p-0"
        >
          <XIcon />
        </Button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {columns.map((col) => (
          <div
            key={col.key}
            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
          >
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={!hiddenColumns.has(col.key)}
                onCheckedChange={() =>
                  onColumnVisibilityChange(String(col.key))
                }
                className="h-4 w-4"
              />
              <span className="text-sm">{col.label}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <span>{col.width}px</span>
              <GripVertical className="h-3 w-3 cursor-move" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Save current configuration
              saveColumnConfig(columns);
            }}
            className="flex-1 text-xs"
          >
            Save Layout
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Reset to default column configuration
              setColumns(defaultColumns);
              // Clear saved configuration
              if (typeof window !== "undefined") {
                localStorage.removeItem(COLUMN_CONFIG_KEY);
              }
            }}
            className="flex-1 text-xs"
          >
            Reset Layout
          </Button>
        </div>
      </div>
    </div>
  );

  const handleColumnDragStart = (e: React.DragEvent, columnIndex: number) => {
    if (isResizing) {
      e.preventDefault();
      return;
    }
    setDraggedColumn(columnIndex);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.outerHTML);
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = "0.5";
    dragImage.style.transform = "rotate(5deg)";
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  };

  const handleColumnDragOver = (e: React.DragEvent, columnIndex: number) => {
    if (isResizing) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnIndex);
  };

  const handleColumnDragLeave = () => {
    if (isResizing) return;
    setDragOverColumn(null);
  };

  const handleColumnDrop = (e: React.DragEvent, dropIndex: number) => {
    if (isResizing) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === dropIndex) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    const newColumns = [...visibleColumns];
    const draggedCol = newColumns[draggedColumn];
    newColumns.splice(draggedColumn, 1);
    newColumns.splice(dropIndex, 0, draggedCol);

    const updatedColumns = [...columns];
    const otherColumns = newColumns.filter((col) => col.key !== "actions");
    const newFullColumns = [
      ...otherColumns,
      ...updatedColumns.filter((col) => hiddenColumns.has(col.key)),
    ];
    setColumns(newFullColumns);
    saveColumnConfig(newFullColumns);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const getPageNumbers = () => {
    const { currentPage, totalPages } = paginationState;
    const maxVisiblePages = 5;
    const pages: (number | string)[] = [];
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3) endPage = Math.min(4, totalPages - 1);
      else if (currentPage >= totalPages - 2)
        startPage = Math.max(totalPages - 3, 2);
      if (startPage > 2) pages.push("...");
      for (let i = startPage; i <= endPage; i++) pages.push(i);
      if (endPage < totalPages - 1) pages.push("...");
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  const handleDelete = (route: BinRoutingRoute) => {
    onDelete(route);
    setOpenDeleteDialog(null);
  };

  return (
    <div className="space-y-4">
      {/* Table Controls (match ParticipantTable) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {sortedAndFilteredRoutes.length}
            {sortedAndFilteredRoutes.length !== routes.length && (
              <span className="text-blue-500">/{routes.length}</span>
            )}{" "}
            routes
          </Badge>
          {selectedRows.size > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {selectedRows.size} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Status legend counters */}
          <div className="hidden sm:flex items-center space-x-1">
            <Badge
              variant="secondary"
              className="bg-gray-100 text-gray-700"
              title="0: no match"
            >
              0: {statusCounts.s0}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700"
              title="1: rule + gateway match"
            >
              1: {statusCounts.s1}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-700"
              title="2: rule match + BIN-valid gateway"
            >
              2: {statusCounts.s2}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-red-100 text-red-700"
              title="3: rule match but gateway mismatch"
            >
              3: {statusCounts.s3}
            </Badge>
          </div>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="text-xs bg-transparent rounded-2xl"
              title="Manage Columns"
            >
              <Settings className="h-3 w-3 mr-1" />
              Columns ({visibleColumns.length})
            </Button>
            {showColumnManager && <ColumnManager />}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="overflow-auto"
          style={{ maxHeight: "calc(100vh - 400px)" }}
        >
          <table
            className="border-collapse"
            style={{
              tableLayout: "fixed",
              width: `${
                48 +
                64 +
                visibleColumns.reduce((sum, col) => sum + col.width, 0)
              }px`,
            }}
          >
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {/* Select Column */}
                <th
                  className="px-3 py-2 text-left border-r border-gray-200 bg-gray-50"
                  style={{ width: "48px" }}
                >
                  <Checkbox
                    checked={
                      selectedRows.size === routes.length && routes.length > 0
                    }
                    onCheckedChange={(checked) => onRowSelectAll(!!checked)}
                  />
                </th>
                {/* Index Column */}
                <th
                  className="px-3 py-2 text-left border-r border-gray-200 bg-gray-50"
                  style={{ width: "64px" }}
                >
                  <span className="text-xs font-medium text-gray-700">#</span>
                </th>
                {/* Dynamic Columns */}
                {visibleColumns.map((col, index) => (
                  <th
                    key={col.key}
                    className={`border-r border-gray-200 px-3 py-2 bg-gray-50 relative group select-none transition-colors ${
                      dragOverColumn === index ? "bg-blue-100" : ""
                    } ${draggedColumn === index ? "opacity-50" : ""}`}
                    style={{
                      width: `${col.width}px`,
                      minWidth: `${col.minWidth || 72}px`,
                      maxWidth: col.maxWidth ? `${col.maxWidth}px` : undefined,
                    }}
                    draggable={!isResizing}
                    onDragStart={(e) =>
                      !isResizing && handleColumnDragStart(e, index)
                    }
                    onDragOver={(e) => handleColumnDragOver(e, index)}
                    onDragLeave={handleColumnDragLeave}
                    onDrop={(e) => handleColumnDrop(e, index)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between pr-2">
                        <div
                          className="flex items-center space-x-1 cursor-pointer hover:text-blue-600 flex-1"
                          onClick={() =>
                            col.sortable && onSort(String(col.key))
                          }
                        >
                          <GripVertical className="h-3 w-3 text-gray-400 cursor-move" />
                          <span className="text-xs font-medium text-gray-700 select-none truncate">
                            {col.label}
                            {isResizing &&
                              resizeData?.columnIndex === index && (
                                <span className="ml-1 text-blue-600">
                                  ({col.width}px)
                                </span>
                              )}
                          </span>
                          {sortConfig?.key === col.key && (
                            <div className="text-blue-600">
                              {sortConfig.direction === "asc" ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </div>
                          )}
                        </div>
                        {/* Improved Resize Handle */}
                        {col.resizable !== false && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500 bg-transparent group-hover:bg-blue-300 transition-colors z-10 flex items-center justify-center"
                            onMouseDown={(e) => startResize(e, index)}
                            title={`Resize ${col.label} column`}
                          >
                            <div className="w-0.5 h-4 bg-gray-400 group-hover:bg-blue-600 transition-colors" />
                          </div>
                        )}
                      </div>

                      {/* Column Filter */}
                      {col.filterable && (
                        <Input
                          placeholder="Filter..."
                          className="h-4 px-1 text-[9px] font-medium text-gray-700 rounded border-gray-300 placeholder:text-gray-400"
                          value={columnFilters[String(col.key)] || ""}
                          onChange={(e) =>
                            onColumnFilter(String(col.key), e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          disabled={isResizing}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {routes.map((route, rowIndex) => {
                const isSelected = selectedRows.has(rowIndex);
                return (
                  <tr
                    key={rowIndex}
                    className={(() => {
                      const s = Number((route as any).match_status ?? 0);
                      const base =
                        s === 1
                          ? "bg-green-50 hover:bg-green-100"
                          : s === 2
                          ? "bg-yellow-50 hover:bg-yellow-100"
                          : s === 3
                          ? "bg-red-50 hover:bg-red-100"
                          : "bg-gray-50 hover:bg-gray-100";
                      const sel = isSelected ? " ring-1 ring-blue-300" : "";
                      return `cursor-pointer transition-colors ${base}${sel}`;
                    })()}
                    onDoubleClick={() => onRowDoubleClick?.(route)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      // Select row on right-click if not already selected
                      if (!isSelected) {
                        onRowSelect(rowIndex);
                      }
                      let cell: { key: string; value: string } | undefined;
                      const td = (e.target as HTMLElement)?.closest("td");
                      const keyAttr =
                        td?.getAttribute("data-colkey") || undefined;
                      if (keyAttr) {
                        const value = String((route as any)[keyAttr] ?? "");
                        cell = { key: keyAttr, value };
                      }
                      onRightClick?.(e, rowIndex, cell);
                    }}
                  >
                    <td
                      className="px-3 py-2 border-r border-gray-200"
                      style={{ width: "48px" }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onRowSelect(rowIndex)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td
                      className="px-3 py-2 border-r border-gray-200"
                      style={{ width: "64px" }}
                    >
                      <span className="text-xs text-gray-800">
                        {hidePagination
                          ? rowIndex + 1
                          : (paginationState.currentPage - 1) *
                              paginationState.pageSize +
                            rowIndex +
                            1}
                      </span>
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-2 border-r border-gray-200"
                        style={{
                          width: `${col.width}px`,
                          minWidth: `${col.minWidth || 60}px`,
                          maxWidth: col.maxWidth
                            ? `${col.maxWidth}px`
                            : undefined,
                        }}
                        data-colkey={String(col.key)}
                      >
                        <div className="truncate">
                          {col.key === "id" ||
                          col.key === "bin_details_id" ||
                          col.key === "container_plugin_name" ? (
                            <div className="font-mono bg-gray-50 px-2 py-1 rounded-md text-xs">
                              {String(route[col.key] ?? "")}
                            </div>
                          ) : col.key === "match_status" ? (
                            (() => {
                              const status = (route as any).match_status as
                                | number
                                | undefined;
                              const reason = (route as any).status_reason as
                                | string
                                | undefined;
                              if (status === 1) {
                                return (
                                  <Badge
                                    variant="secondary"
                                    className="bg-green-100 text-green-700"
                                    title={reason || "1: rule + gateway match"}
                                  >
                                    1: rule + gateway match
                                  </Badge>
                                );
                              }
                              if (status === 2) {
                                return (
                                  <Badge
                                    variant="secondary"
                                    className="bg-yellow-100 text-yellow-700"
                                    title={
                                      reason ||
                                      "2: rule match + BIN-valid gateway"
                                    }
                                  >
                                    2: rule match + BIN-valid gateway
                                  </Badge>
                                );
                              }
                              if (status === 3) {
                                return (
                                  <Badge
                                    variant="secondary"
                                    className="bg-red-100 text-red-700"
                                    title={
                                      reason ||
                                      "3: rule match but gateway mismatch"
                                    }
                                  >
                                    3: rule match but gateway mismatch
                                  </Badge>
                                );
                              }
                              return (
                                <Badge
                                  variant="secondary"
                                  className="bg-gray-100 text-gray-700"
                                  title={reason || "0: no match"}
                                >
                                  0: no match
                                </Badge>
                              );
                            })()
                          ) : (
                            <span
                              className="text-xs text-gray-800"
                              title={String((route as any)[col.key] ?? "")}
                            >
                              {String((route as any)[col.key] ?? "")}
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination (match ParticipantTable) */}
      {!hidePagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {Math.min(
                  (paginationState.currentPage - 1) * paginationState.pageSize +
                    1,
                  paginationState.totalRows
                )}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(
                  paginationState.currentPage * paginationState.pageSize,
                  paginationState.totalRows
                )}
              </span>{" "}
              of{" "}
              <span className="font-medium">
                {paginationState.totalRows.toLocaleString()}
              </span>{" "}
              results
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-sm text-gray-600">Per page:</Label>
              <Select
                value={paginationState.pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(Number(value))}
                disabled={isPaginationLoading}
              >
                <SelectTrigger className="w-20 h-8 rounded-lg text-sm">
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

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(paginationState.currentPage - 1)}
              disabled={paginationState.currentPage <= 1 || isPaginationLoading}
              className="rounded-lg text-sm bg-transparent"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {getPageNumbers().map((pageNum, index) => (
                <div key={index}>
                  {pageNum === "..." ? (
                    <span className="px-3 py-1 text-gray-500 text-sm">...</span>
                  ) : (
                    <Button
                      variant={
                        pageNum === paginationState.currentPage
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        typeof pageNum === "number" && onPageChange(pageNum)
                      }
                      disabled={isPaginationLoading}
                      className={`w-10 h-8 rounded-lg text-sm ${
                        pageNum === paginationState.currentPage
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-transparent hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(paginationState.currentPage + 1)}
              disabled={
                paginationState.currentPage >= paginationState.totalPages ||
                isPaginationLoading
              }
              className="rounded-lg text-sm bg-transparent"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="text-gray-500">
      <path
        fill="currentColor"
        d="M18.3 5.71L12 12.01l6.3 6.29-1.41 1.41L10.59 13.4 4.3 19.71 2.89 18.3l6.29-6.29-6.3-6.3L4.3 4.3l6.29 6.3 6.29-6.3z"
      />
    </svg>
  );
}
