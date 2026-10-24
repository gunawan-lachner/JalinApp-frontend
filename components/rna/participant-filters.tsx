"use client";

import { useState } from "react";
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
  X,
  Search,
  RefreshCw,
  Database,
  AlertCircle,
  Clock,
  ChevronDown,
  Code,
  Copy,
  Download,
  Filter,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import type { ConnectionProfile, ParticipantDynamicFilter } from "@/lib/types";

const FILTER_FIELDS: Array<{ label: string; value: string }> = [
  { label: "ID", value: "id" },
  { label: "Ext ID", value: "ext_id" },
  { label: "Type", value: "participant_type" },
  { label: "Name", value: "name" },
  { label: "Container Plugin", value: "container_plugin_name" },
  { label: "Network Type", value: "network_type" },
  { label: "Active", value: "active" },
  { label: "Display on UI", value: "display_on_ui" },
  { label: "Comments", value: "comments" },
];

const FILTER_OPERATORS: Array<{ label: string; value: string }> = [
  { label: "=", value: "=" },
  { label: "!=", value: "!=" },
  { label: ">", value: ">" },
  { label: "<", value: "<" },
  { label: ">=", value: ">=" },
  { label: "<=", value: "<=" },
  { label: "LIKE", value: "LIKE" },
  { label: "NOT LIKE", value: "NOT LIKE" },
  { label: "starts with", value: "STARTS_WITH" },
  { label: "ends with", value: "ENDS_WITH" },
  { label: "is empty", value: "IS_EMPTY" },
  { label: "is not empty", value: "IS_NOT_EMPTY" },
];

interface ParticipantFiltersProps {
  connectionProfiles: ConnectionProfile[];
  selectedConnection: string;
  onConnectionChange: (connection: string) => void;

  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  dynamicFilters: ParticipantDynamicFilter[];
  onAddFilter: () => void;
  onRemoveFilter: (index: number) => void;
  onUpdateFilter: (
    index: number,
    key: keyof ParticipantDynamicFilter,
    value: string
  ) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  activeFilterCount: number;

  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onClearError: () => void;

  searchResults: {
    total_rows: number;
    page: number;
    page_size: number;
    execution_time?: number;
    error?: string | null;
    executed_sql?: string;
  } | null;

  pageSize: number;
  onPageSizeChange: (size: number) => void;

  queryInfo?: {
    executedSql?: string;
    executionTime?: number;
    error?: string | null;
  };
  showQuerySection?: boolean;
  onToggleQuerySection?: () => void;
}

export function ParticipantFilters({
  connectionProfiles,
  selectedConnection,
  onConnectionChange,
  searchTerm,
  onSearchTermChange,
  dynamicFilters,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilter,
  onSearch,
  onClearFilters,
  activeFilterCount,
  isLoading,
  error,
  onRetry,
  onClearError,
  searchResults,
  queryInfo,
  showQuerySection = false,
  onToggleQuerySection,
}: ParticipantFiltersProps) {
  const [showFilters, setShowFilters] = useState(true);
  const hasActiveFilter = activeFilterCount > 0 || searchTerm.trim() !== "";

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
      link.download = `rna_participant_query_${
        new Date().toISOString().split("T")[0]
      }.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedConnection && !isLoading) {
                  onSearch();
                }
              }}
              placeholder="Cari name / id / type..."
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
            Cari Participant
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
          >
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
                Filter participant
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Operator: =, !=, &gt;, &lt;, &gt;=, &lt;=, LIKE, starts/ends
                with, …
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
                onClick={() => {
                  onAddFilter();
                  setShowFilters(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Filter
              </Button>
            </div>
          </div>

          {dynamicFilters.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Filter className="h-7 w-7 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Belum ada filter</p>
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
                          {FILTER_FIELDS.map((field) => (
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
                          {FILTER_OPERATORS.map((op) => (
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
                        {searchResults.total_rows.toLocaleString()}
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
