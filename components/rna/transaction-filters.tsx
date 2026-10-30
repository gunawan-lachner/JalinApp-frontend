"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Minus,
  Filter,
  X,
  Search,
  RefreshCw,
  Database,
  AlertCircle,
  Calendar,
  Clock,
  ChevronDown,
  Code,
  Copy,
  Download,
  Loader2,
} from "lucide-react";
import type { ConnectionProfile } from "@/lib/types";

interface DynamicFilter {
  field: string;
  operator: string;
  value: string;
}

interface TransactionFiltersProps {
  connectionProfiles: ConnectionProfile[];
  selectedConnection: string;
  onConnectionChange: (connection: string) => void;

  dateStart: string;
  dateEnd: string;
  onDateStartChange: (date: string) => void;
  onDateEndChange: (date: string) => void;

  dynamicFilters: DynamicFilter[];
  onAddFilter: () => void;
  onRemoveFilter: (index: number) => void;
  onUpdateFilter: (
    index: number,
    key: keyof DynamicFilter,
    value: string
  ) => void;

  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearch: () => void;
  onClearFilters: () => void;

  showFilters: boolean;
  onToggleFilters: () => void;
  showColumnManager: boolean;
  onToggleColumnManager: () => void;

  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onClearError: () => void;

  searchResults: {
    total: number;
    totalPages: number;
    executionTime: number;
    query: string;
  } | null;

  pageSize: number;
  onPageSizeChange: (size: number) => void;

  onGlobalSearch: (term: string) => void;

  columnFilters: Record<string, string>;
  onColumnFilter: (key: string, value: string) => void;
  onClearColumnFilters: () => void;

  filterFields: Array<{ label: string; value: string }>;
  filterOperators: Array<{ label: string; value: string }>;

  queryInfo?: {
    executedSql?: string;
    executionTime?: number;
    error?: string | null;
  };
  showQuerySection?: boolean;
  onToggleQuerySection?: () => void;

  resultCodeFilter: string;
  onResultCodeFilterChange: (value: string) => void;
  transactionStatusFilter: string;
  onTransactionStatusFilterChange: (value: string) => void;

  onExport?: (data: any, format: string) => void;
  getViewData?: () => any;
  messageTypeFilter?: string;
  onMessageTypeFilterChange?: (value: string) => void;
}

function isActiveDynamicFilter(f: DynamicFilter): boolean {
  return (
    f.operator === "IS_EMPTY" ||
    f.operator === "IS_NOT_EMPTY" ||
    (f.value || "").trim() !== ""
  );
}

export function TransactionFilters({
  connectionProfiles,
  selectedConnection,
  onConnectionChange,
  dateStart,
  dateEnd,
  onDateStartChange,
  onDateEndChange,
  dynamicFilters,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilter,
  searchTerm,
  onSearchTermChange,
  onSearch,
  onClearFilters,
  showFilters,
  onToggleFilters,
  isLoading,
  error,
  onRetry,
  onClearError,
  searchResults,
  onGlobalSearch,
  filterFields,
  filterOperators,
  queryInfo,
  showQuerySection = false,
  onToggleQuerySection,
  resultCodeFilter,
  onResultCodeFilterChange,
  transactionStatusFilter,
  onTransactionStatusFilterChange,
}: TransactionFiltersProps) {
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  const activeFilterCount =
    dynamicFilters.filter(isActiveDynamicFilter).length +
    (resultCodeFilter !== "all" ? 1 : 0) +
    (transactionStatusFilter !== "all" ? 1 : 0);

  const hasActiveFilter =
    activeFilterCount > 0 || searchTerm.trim() !== "";

  const copyQuery = () => {
    if (queryInfo?.executedSql) {
      navigator.clipboard.writeText(queryInfo.executedSql);
    }
  };

  const downloadQuery = () => {
    if (queryInfo?.executedSql) {
      const blob = new Blob([queryInfo.executedSql], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rna_query_${new Date().toISOString().split("T")[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const openPicker = (el: HTMLInputElement | null) => {
    if (!el) return;
    if ("showPicker" in el && typeof (el as any).showPicker === "function") {
      (el as any).showPicker();
    } else {
      el.focus();
      el.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label>Connection Profile</Label>
          <Select
            value={selectedConnection}
            onValueChange={onConnectionChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih profile DB" />
            </SelectTrigger>
            <SelectContent>
              {connectionProfiles?.map((profile, index) => (
                <SelectItem key={index} value={profile.name}>
                  {profile.name}
                  {profile.database ? ` (${profile.database})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Pencarian cepat</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                onSearchTermChange(e.target.value);
                onGlobalSearch(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedConnection && !isLoading) {
                  onSearch();
                }
              }}
              placeholder="Cari trx id / pan / ..."
              className="pl-9 font-mono text-sm"
              disabled={!selectedConnection}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onSearch}
            disabled={isLoading || !selectedConnection}
            className="flex-1 md:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Cari Transactions
          </Button>
          <Button type="button" variant="outline" onClick={onToggleFilters}>
            <Filter className="h-4 w-4 mr-1.5" />
            Filter
            {activeFilterCount > 0 && (
              <Badge className="ml-1.5 h-5 min-w-5 px-1.5 bg-blue-600">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Filter transactions
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tanggal, status, result code, dan filter dinamis (=, !=, LIKE,
                …)
              </p>
            </div>
            <div className="flex gap-2">
              {hasActiveFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-gray-600"
                  onClick={onClearFilters}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={onAddFilter}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Filter
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Start Date</Label>
              <div className="relative">
                <Input
                  ref={startDateInputRef}
                  type="datetime-local"
                  value={dateStart.replace(" ", "T")}
                  onChange={(e) =>
                    onDateStartChange(e.target.value.replace("T", " "))
                  }
                  className="h-8 text-xs pr-9 hide-native-picker"
                />
                <button
                  type="button"
                  onClick={() => openPicker(startDateInputRef.current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-blue-600"
                >
                  <Calendar className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">End Date</Label>
              <div className="relative">
                <Input
                  ref={endDateInputRef}
                  type="datetime-local"
                  value={dateEnd.replace(" ", "T")}
                  onChange={(e) =>
                    onDateEndChange(e.target.value.replace("T", " "))
                  }
                  className="h-8 text-xs pr-9 hide-native-picker"
                />
                <button
                  type="button"
                  onClick={() => openPicker(endDateInputRef.current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-blue-600"
                >
                  <Calendar className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Result Code</Label>
              <Select
                value={resultCodeFilter}
                onValueChange={onResultCodeFilterChange}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="0">Success (0)</SelectItem>
                  <SelectItem value="61">Approved (61)</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Transaction Status</Label>
              <Select
                value={transactionStatusFilter}
                onValueChange={onTransactionStatusFilterChange}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="1">Success (1)</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {dynamicFilters.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Filter className="h-7 w-7 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Belum ada filter dinamis</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {dynamicFilters.map((filter, index) => {
                const needsValue =
                  filter.operator !== "IS_EMPTY" &&
                  filter.operator !== "IS_NOT_EMPTY";
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200"
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Select
                        value={filter.field}
                        onValueChange={(value) =>
                          onUpdateFilter(index, "field", value)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filterFields.map((field) => (
                            <SelectItem
                              key={field.value}
                              value={field.value}
                              className="text-xs"
                            >
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator}
                        onValueChange={(value) =>
                          onUpdateFilter(index, "operator", value)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs font-mono">
                          <SelectValue placeholder="Operator..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOperators.map((op) => (
                            <SelectItem
                              key={op.value}
                              value={op.value}
                              className="text-xs font-mono"
                            >
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        value={filter.value}
                        onChange={(e) =>
                          onUpdateFilter(index, "value", e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            selectedConnection &&
                            !isLoading
                          ) {
                            onSearch();
                          }
                        }}
                        placeholder={needsValue ? "Nilai..." : "—"}
                        disabled={!needsValue}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 hover:bg-red-50 hover:border-red-200"
                      onClick={() => onRemoveFilter(index)}
                    >
                      <Minus className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              onClick={onSearch}
              disabled={isLoading || !selectedConnection}
              className="h-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Search className="h-3.5 w-3.5 mr-1.5" />
              )}
              Cari dengan Filter
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-7 px-3 bg-white text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearError}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {queryInfo &&
        (queryInfo.executedSql || queryInfo.error) &&
        onToggleQuerySection && (
          <div className="flex justify-center">
            <Button
              onClick={onToggleQuerySection}
              variant="outline"
              size="sm"
              className="h-7 px-2 rounded-full bg-white border-gray-300 hover:bg-gray-50 shadow-sm text-xs"
            >
              <Code className="h-3 w-3 mr-1 text-gray-600" />
              <span className="text-gray-700 font-medium">SQL</span>
              {queryInfo.executionTime && (
                <Badge
                  variant="secondary"
                  className="ml-1 bg-blue-100 text-blue-700 text-xs px-1 py-0 h-3 text-[10px]"
                >
                  {queryInfo.executionTime.toFixed(2)}s
                </Badge>
              )}
              <ChevronDown
                className={`h-3 w-3 ml-1 text-gray-500 transition-transform duration-200 ${
                  showQuerySection ? "rotate-180" : ""
                }`}
              />
            </Button>
          </div>
        )}

      {queryInfo &&
        (queryInfo.executedSql || queryInfo.error) &&
        onToggleQuerySection &&
        showQuerySection && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {queryInfo.executionTime && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-gray-600">
                      <span className="font-medium text-blue-700">
                        {queryInfo.executionTime.toFixed(3)}s
                      </span>
                    </span>
                  </div>
                )}
                {searchResults && (
                  <div className="flex items-center space-x-1">
                    <Database className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs text-gray-600">
                      <span className="font-medium text-blue-700">
                        {searchResults.total.toLocaleString()}
                      </span>{" "}
                      rows
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyQuery}
                  className="h-7 px-2 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQuery}
                  className="h-7 px-2 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>

            {queryInfo.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                  {queryInfo.error}
                </pre>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-slate-100 whitespace-pre-wrap font-mono leading-relaxed">
                  {queryInfo.executedSql || "No query available"}
                </pre>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
