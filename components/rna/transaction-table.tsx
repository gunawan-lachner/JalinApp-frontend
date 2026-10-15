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
  X,
  Settings,
  GripVertical,
} from "lucide-react";
import type { Transaction } from "@/lib/api";

interface Column {
  key: string;
  label: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

interface TransactionTableProps {
  transactions: Transaction[];
  selectedRows: Set<number>;
  onRowSelect: (index: number) => void;
  onRowSelectAll: (selectAll: boolean) => void;
  onRowDoubleClick: (transaction: Transaction) => void;
  onContextMenu: (
    e: React.MouseEvent,
    rowIndex: number,
    cellKey?: string,
    cellValue?: string
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
}

const defaultColumns: Column[] = [
  {
    key: "Trx ID",
    label: "Trx ID",
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "TID",
    label: "TID",
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "UUID",
    label: "UUID",
    width: 200,
    minWidth: 150,
    maxWidth: 300,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "RRN",
    label: "RRN",
    width: 120,
    minWidth: 100,
    maxWidth: 180,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Card Number",
    label: "Card Number",
    width: 150,
    minWidth: 120,
    maxWidth: 200,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Procode",
    label: "Procode",
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Amount",
    label: "Amount",
    width: 120,
    minWidth: 100,
    maxWidth: 180,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "RC Host",
    label: "RC Host",
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Result",
    label: "Result",
    width: 80,
    minWidth: 60,
    maxWidth: 120,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "RC EFTS",
    label: "RC EFTS",
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Result Desc",
    label: "Result Desc",
    width: 150,
    minWidth: 120,
    maxWidth: 250,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Acq ID",
    label: "Acq ID",
    width: 80,
    minWidth: 60,
    maxWidth: 120,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Acquier Name",
    label: "Acquier Name",
    width: 150,
    minWidth: 120,
    maxWidth: 250,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Iss ID",
    label: "Iss ID",
    width: 80,
    minWidth: 60,
    maxWidth: 120,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Issuer Name",
    label: "Issuer Name",
    width: 150,
    minWidth: 120,
    maxWidth: 250,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Gateway ID",
    label: "Gateway ID",
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Gateway Name",
    label: "Gateway Name",
    width: 150,
    minWidth: 120,
    maxWidth: 250,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Principal Code",
    label: "Principal Code",
    width: 120,
    minWidth: 100,
    maxWidth: 180,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Msg Class",
    label: "Msg Class",
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Msg Class Description",
    label: "Msg Class Desc",
    width: 150,
    minWidth: 120,
    maxWidth: 250,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Msg Type",
    label: "Msg Type",
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Msg Type Description",
    label: "Msg Type Desc",
    width: 150,
    minWidth: 120,
    maxWidth: 250,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Trx Status",
    label: "Trx Status",
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Trx Status Description",
    label: "Trx Status Desc",
    width: 150,
    minWidth: 120,
    maxWidth: 250,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Ref UUID",
    label: "Ref UUID",
    width: 200,
    minWidth: 150,
    maxWidth: 300,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Reversal Tries",
    label: "Reversal Tries",
    width: 120,
    minWidth: 100,
    maxWidth: 180,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Date n Time",
    label: "Date & Time",
    width: 150,
    minWidth: 120,
    maxWidth: 200,
    resizable: true,
    sortable: true,
    filterable: true,
  },
  {
    key: "Date n Time Time Out",
    label: "Timeout",
    width: 150,
    minWidth: 120,
    maxWidth: 200,
    resizable: true,
    sortable: true,
    filterable: true,
  },
];

// Cache key for storing column configuration
const COLUMN_CONFIG_KEY = "rna_transaction_columns_config";

// Helper functions for column configuration persistence
const saveColumnConfig = (columns: Column[]) => {
  if (typeof window !== "undefined") {
    const config = columns.map((col) => ({
      key: col.key,
      width: col.width,
      order: columns.findIndex((c) => c.key === col.key),
    }));
    localStorage.setItem(COLUMN_CONFIG_KEY, JSON.stringify(config));
    console.log("💾 Column configuration saved:", config);
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
    console.log("📂 Loading saved column configuration:", config);

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
    console.error("❌ Failed to load column configuration:", error);
    return defaultColumns;
  }
};

const getTransactionValue = (
  transaction: Transaction,
  columnKey: string
): any => {
  // First try the exact column key
  let value = transaction[columnKey as keyof Transaction];

  if (value !== undefined && value !== null) {
    return value;
  }

  // Map column keys to actual property names
  const propertyMap: Record<string, string> = {
    "Trx ID": "trx_id",
    UUID: "uuid",
    Amount: "amount",
    TID: "tid",
    RRN: "rrn",
    "Card Number": "card_number",
    Procode: "procode",
    "RC Host": "rc_host",
    Result: "result",
    "RC EFTS": "rc_efts",
    "Result Desc": "result_desc",
    "Acq ID": "acq_id",
    "Acquier Name": "acquier_name",
    "Iss ID": "iss_id",
    "Issuer Name": "issuer_name",
    "Gateway ID": "gateway_id",
    "Gateway Name": "gateway_name",
    "Principal Code": "principal_code",
    "Msg Class": "msg_class",
    "Msg Class Description": "msg_class_description",
    "Msg Type": "msg_type",
    "Msg Type Description": "msg_type_description",
    "Trx Status": "trx_status",
    "Trx Status Description": "trx_status_description",
    "Ref UUID": "ref_uuid",
    "Reversal Tries": "reversal_tries",
    "Date n Time": "date_n_time",
    "Date n Time Time Out": "date_n_time_time_out",
  };

  // Try the mapped property name
  const mappedKey = propertyMap[columnKey];
  if (mappedKey) {
    value = transaction[mappedKey as keyof Transaction];
  }

  return value !== undefined && value !== null ? value : "";
};

export function TransactionTable({
  transactions,
  selectedRows,
  onRowSelect,
  onRowSelectAll,
  onRowDoubleClick,
  onContextMenu,
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
}: TransactionTableProps) {
  const [columns, setColumns] = useState<Column[]>(() =>
    loadColumnConfig(defaultColumns)
  );
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<number | null>(null);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Column resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeData, setResizeData] = useState<{
    columnIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Get visible columns (needs to be before resize handlers)
  const visibleColumns = columns.filter((col) => !hiddenColumns.has(col.key));

  // Improved column resizing handlers
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

  // Format functions
  const formatAmount = (amount: number) => {
    if (amount === 0) return "Rp0.00";
    return `Rp${(amount / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const day = days[date.getUTCDay()];
      const dayNum = String(date.getUTCDate()).padStart(2, "0");
      const month = months[date.getUTCMonth()];
      const year = date.getUTCFullYear();
      const hours = String(date.getUTCHours()).padStart(2, "0");
      const minutes = String(date.getUTCMinutes()).padStart(2, "0");
      const seconds = String(date.getUTCSeconds()).padStart(2, "0");

      return `${day}, ${dayNum} ${month} ${year} ${hours}:${minutes}:${seconds} GMT`;
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (result: number) => {
    if (result === 0 || result === 61)
      return "bg-green-100 text-green-700 border-green-200";
    if (result > 0 && result < 10)
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  // Filtering logic
  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue.trim()) {
        filtered = filtered.filter((transaction) => {
          const cellValue = String(
            getTransactionValue(transaction, columnKey) || ""
          ).toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      }
    });

    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();

  // Apply sorting to filtered data
  const getSortedTransactions = () => {
    if (!sortConfig) return filteredTransactions;

    return [...filteredTransactions].sort((a, b) => {
      const aValue = getTransactionValue(a, sortConfig.key);
      const bValue = getTransactionValue(b, sortConfig.key);

      // Handle different data types
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      // Handle dates
      if (sortConfig.key.includes("Date")) {
        const aDate = new Date(String(aValue)).getTime();
        const bDate = new Date(String(bValue)).getTime();
        return sortConfig.direction === "asc" ? aDate - bDate : bDate - aDate;
      }

      // Handle strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sortedAndFilteredTransactions = getSortedTransactions();

  const getOriginalIndex = (filteredIndex: number) => {
    const filteredTransaction = sortedAndFilteredTransactions[filteredIndex];
    return transactions.findIndex(
      (t) => t["Trx ID"] === filteredTransaction["Trx ID"]
    );
  };

  // Column drag and drop handlers
  const handleColumnDragStart = (e: React.DragEvent, columnIndex: number) => {
    setDraggedColumn(columnIndex);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.outerHTML);

    // Add visual feedback
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = "0.5";
    dragImage.style.transform = "rotate(5deg)";
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  };

  const handleColumnDragOver = (e: React.DragEvent, columnIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnIndex);
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleColumnDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedColumn === null || draggedColumn === dropIndex) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const newColumns = [...visibleColumns];
    const draggedCol = newColumns[draggedColumn];

    // Remove dragged column and insert at new position
    newColumns.splice(draggedColumn, 1);
    newColumns.splice(dropIndex, 0, draggedCol);

    // Update the full columns array maintaining hidden columns
    const updatedColumns = [...columns];
    const visibleKeys = newColumns.map((col) => col.key);

    // Rebuild columns array with new order
    const newFullColumns = [
      ...newColumns,
      ...updatedColumns.filter((col) => hiddenColumns.has(col.key)),
    ];

    setColumns(newFullColumns);

    // Save the new configuration to localStorage
    saveColumnConfig(newFullColumns);

    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Pagination helpers
  const getPageNumbers = () => {
    const { currentPage, totalPages } = paginationState;
    const maxVisiblePages = 5;
    const pages: (number | string)[] = [];

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        endPage = Math.min(4, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        startPage = Math.max(totalPages - 3, 2);
      }

      if (startPage > 2) pages.push("...");
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      if (endPage < totalPages - 1) pages.push("...");
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  // Column manager component
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
          <X className="h-4 w-4" />
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
                onCheckedChange={() => onColumnVisibilityChange(col.key)}
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
              console.log("💾 Current layout saved manually");
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
              console.log("🔄 Column configuration reset to defaults");
            }}
            className="flex-1 text-xs"
          >
            Reset Layout
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {sortedAndFilteredTransactions.length}
            {sortedAndFilteredTransactions.length !== transactions.length && (
              <span className="text-blue-500">/{transactions.length}</span>
            )}{" "}
            transactions
          </Badge>
          {selectedRows.size > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {selectedRows.size} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="rounded-lg text-xs bg-transparent"
            >
              <Settings className="h-3 w-3 mr-1" />
              Columns ({visibleColumns.length})
            </Button>
            {showColumnManager && <ColumnManager />}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div
        className="w-full overflow-x-auto border border-gray-200 rounded-2xl"
        ref={tableRef}
      >
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
                      selectedRows.size === transactions.length &&
                      transactions.length > 0
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
                    className={`border-r border-gray-200 px-3 py-2 bg-gray-50 relative group select-none ${
                      dragOverColumn === index ? "bg-blue-100" : ""
                    } ${draggedColumn === index ? "opacity-50" : ""} ${
                      isResizing && resizeData?.columnIndex === index
                        ? "bg-blue-50"
                        : ""
                    }`}
                    style={{
                      width: `${col.width}px`,
                      minWidth: `${col.minWidth || 60}px`,
                      maxWidth: `${col.maxWidth || 400}px`,
                    }}
                    draggable={!isResizing}
                    onDragStart={(e) =>
                      !isResizing && handleColumnDragStart(e, index)
                    }
                    onDragOver={(e) =>
                      !isResizing && handleColumnDragOver(e, index)
                    }
                    onDragLeave={
                      !isResizing ? handleColumnDragLeave : undefined
                    }
                    onDrop={(e) => !isResizing && handleColumnDrop(e, index)}
                  >
                    <div className="space-y-1">
                      {/* Column Header with Sort */}
                      <div className="flex items-center justify-between pr-2">
                        <div
                          className="flex items-center space-x-1 cursor-pointer hover:text-blue-600 flex-1"
                          onClick={() =>
                            col.sortable && !isResizing && onSort(col.key)
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
                        {col.resizable && (
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
                          value={columnFilters[col.key] || ""}
                          onChange={(e) =>
                            onColumnFilter(col.key, e.target.value)
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

            <tbody className="divide-y divide-gray-200">
              {sortedAndFilteredTransactions.map((transaction, index) => {
                const globalIndex =
                  (paginationState.currentPage - 1) * paginationState.pageSize +
                  index;
                const isSelected = selectedRows.has(globalIndex);

                return (
                  <tr
                    key={index}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50 border-l-4 border-blue-400" : ""
                    }`}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        onRowSelect(globalIndex);
                      } else if (e.shiftKey && selectedRows.size > 0) {
                        const selectedIndices = Array.from(selectedRows).sort(
                          (a, b) => a - b
                        );
                        const lastSelected =
                          selectedIndices[selectedIndices.length - 1];
                        const start = Math.min(lastSelected, globalIndex);
                        const end = Math.max(lastSelected, globalIndex);
                        for (let i = start; i <= end; i++) {
                          onRowSelect(i);
                        }
                      } else {
                        onRowSelect(globalIndex);
                      }
                    }}
                    onDoubleClick={() => onRowDoubleClick(transaction)}
                    onContextMenu={(e) => {
                      // Only trigger if not clicking on a specific cell
                      if ((e.target as HTMLElement).tagName === "TR") {
                        onContextMenu(e, globalIndex);
                      }
                    }}
                  >
                    {/* Select Cell */}
                    <td
                      className="px-3 py-2 border-r border-gray-200"
                      style={{ width: "48px" }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onRowSelect(globalIndex)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>

                    {/* Index Cell */}
                    <td
                      className="px-3 py-2 border-r border-gray-200"
                      style={{ width: "64px" }}
                    >
                      <span className="text-xs text-gray-800">
                        {globalIndex + 1}
                      </span>
                    </td>

                    {/* Dynamic Cells */}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-2 border-r border-gray-200"
                        style={{
                          width: `${col.width}px`,
                          minWidth: `${col.minWidth || 60}px`,
                          maxWidth: `${col.maxWidth || 400}px`,
                        }}
                        onContextMenu={(e) => {
                          const cellValue = String(
                            getTransactionValue(transaction, col.key) || ""
                          );
                          console.log(
                            `🖱️ Right clicking on cell: ${col.key} = "${cellValue}"`
                          );
                          onContextMenu(e, globalIndex, col.key, cellValue);
                        }}
                      >
                        <div className="truncate">
                          {col.key === "Amount" ? (
                            <div
                              className={`px-2 py-1 rounded-md text-xs text-right font-medium ${
                                getTransactionValue(transaction, col.key) === 0
                                  ? "bg-gray-100"
                                  : "bg-green-50 text-green-800"
                              }`}
                            >
                              {formatAmount(
                                getTransactionValue(
                                  transaction,
                                  col.key
                                ) as number
                              )}
                            </div>
                          ) : col.key === "Result" ? (
                            <div className="text-center">
                              <Badge
                                className={`${getStatusColor(
                                  getTransactionValue(
                                    transaction,
                                    col.key
                                  ) as number
                                )} rounded-full text-xs`}
                              >
                                {String(
                                  getTransactionValue(transaction, col.key)
                                )}
                              </Badge>
                            </div>
                          ) : col.key === "Trx Status" ? (
                            <div className="text-center">
                              <Badge
                                className={`${
                                  getTransactionValue(transaction, col.key) ===
                                  1
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                } rounded-full text-xs`}
                              >
                                {String(
                                  getTransactionValue(transaction, col.key)
                                )}
                              </Badge>
                            </div>
                          ) : col.key.includes("Date") ? (
                            <div className="bg-blue-50 px-2 py-1 rounded-md text-xs">
                              {formatDate(
                                String(
                                  getTransactionValue(transaction, col.key)
                                )
                              )}
                            </div>
                          ) : col.key.includes("ID") ||
                            col.key.includes("UUID") ? (
                            <div className="font-mono bg-gray-50 px-2 py-1 rounded-md text-xs">
                              {String(
                                getTransactionValue(transaction, col.key)
                              )}
                            </div>
                          ) : (
                            <span
                              className="text-xs text-gray-800"
                              title={String(
                                getTransactionValue(transaction, col.key)
                              )}
                            >
                              {String(
                                getTransactionValue(transaction, col.key)
                              )}
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

      {/* Pagination */}
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
    </div>
  );
}
