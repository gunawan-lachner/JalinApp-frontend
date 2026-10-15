"use client";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import type { ConnectionProfile } from "@/lib/types";

interface DynamicFilter {
  field: string;
  operator: string;
  value: string;
}

interface ParticipantFiltersProps {
  // Connection state
  connectionProfiles: ConnectionProfile[];
  selectedConnection: string;
  onConnectionChange: (connection: string) => void;

  // Search and controls
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  onSearch: () => void;
  onClearFilters: () => void;

  // API state
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onClearError: () => void;

  // Results
  searchResults: {
    total_rows: number;
    page: number;
    page_size: number;
    execution_time?: number;
    error?: string | null;
    executed_sql?: string; // Added for executed SQL query
  } | null;

  // Page size
  pageSize: number;
  onPageSizeChange: (size: number) => void;

  // Query display props
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
  typeFilter,
  onTypeFilterChange,
  onSearch,
  onClearFilters,
  isLoading,
  error,
  onRetry,
  onClearError,
  searchResults,
  pageSize,
  onPageSizeChange,
  queryInfo,
  showQuerySection = false,
  onToggleQuerySection,
}: ParticipantFiltersProps) {
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
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-7 px-3 rounded-lg bg-white text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Retry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearError}
                className="h-7 w-7 p-0 rounded-lg"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Connection & Page Size Cards - Side by Side */}
      <div className="flex gap-6 mb-6">
        {/* Connection Card */}
        <Card className="flex-1 shadow-sm border-0 bg-white rounded-3xl">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <Database className="h-6 w-6 text-blue-600" />
              <span>Connection</span>
            </h2>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Connection
              </Label>
              <Select
                value={selectedConnection}
                onValueChange={onConnectionChange}
              >
                <SelectTrigger className="w-full rounded-2xl">
                  <SelectValue placeholder="Select connection" />
                </SelectTrigger>
                <SelectContent>
                  {connectionProfiles?.map((profile, index) => (
                    <SelectItem key={index} value={profile.name}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Page Size Card */}
        <Card className="w-64 shadow-sm border-0 bg-white rounded-3xl flex-shrink-0">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <Database className="h-6 w-6 text-blue-600" />
              <span>Page Size</span>
            </h2>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Results per Page
              </Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(Number(value))}
              >
                <SelectTrigger className="w-full rounded-2xl">
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
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters Card */}
      <Card className="shadow-sm border-0 bg-white rounded-3xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Search Bar and Type Filter - First Row */}
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search participants..."
                    className="pl-10 rounded-xl"
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Type
                </Label>
                <Select value={typeFilter} onValueChange={onTypeFilterChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ACQ">ACQ</SelectItem>
                    <SelectItem value="ISS">ISS</SelectItem>
                    <SelectItem value="REN">REN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
            <Button
              onClick={onClearFilters}
              variant="outline"
              className="h-10 px-4 text-sm rounded-2xl"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={onSearch}
              disabled={isLoading || !selectedConnection}
              className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-2xl"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SQL Query Toggle Button - Similar to Transaction Routing */}
      {queryInfo &&
        (queryInfo.executedSql || queryInfo.error) &&
        onToggleQuerySection && (
          <div className="flex justify-center">
            <Button
              onClick={onToggleQuerySection}
              variant="outline"
              size="sm"
              className="h-7 px-2 rounded-full bg-white border-gray-300 hover:bg-gray-50 shadow-sm transition-all duration-200 text-xs"
            >
              <Code className="h-3 w-3 mr-1 text-gray-600" />
              <span className="text-gray-700 font-medium">SQL</span>
              {queryInfo.executionTime && (
                <Badge
                  variant="secondary"
                  className="ml-1 bg-green-100 text-green-700 text-xs px-1 py-0 h-3 text-[10px]"
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

      {/* SQL Query Expandable Card - Similar to Transaction Routing */}
      {queryInfo &&
        (queryInfo.executedSql || queryInfo.error) &&
        onToggleQuerySection &&
        showQuerySection && (
          <Card className="shadow-sm border-0 bg-white rounded-3xl animate-in slide-in-from-top-2 duration-200">
            <CardContent className="p-6 space-y-4">
              {/* Query Statistics */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {queryInfo.executionTime && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-gray-600">
                        <span className="font-medium text-green-700">
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
                    className="h-7 px-2 rounded-lg text-xs bg-white/70"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadQuery}
                    className="h-7 px-2 rounded-lg text-xs bg-white/70"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>

              {/* SQL Query Display */}
              {queryInfo.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="bg-red-100 rounded-full p-1">
                      <Code className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-red-800">
                      Query Error
                    </span>
                  </div>
                  <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                    {queryInfo.error}
                  </pre>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="bg-slate-700 rounded-md p-1">
                        <Code className="h-3 w-3 text-slate-300" />
                      </div>
                      <span className="text-xs font-medium text-slate-300">
                        Executed SQL Query
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  <pre className="text-sm text-slate-100 whitespace-pre-wrap font-mono leading-relaxed">
                    {queryInfo.executedSql
                      ? queryInfo.executedSql
                      : "No query available"}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
