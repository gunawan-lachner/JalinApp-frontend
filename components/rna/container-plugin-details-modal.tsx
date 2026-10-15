"use client";

import type React from "react";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Copy,
  Search,
  RefreshCw,
  Server,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Check,
} from "lucide-react";
import type { ContainerPlugin } from "@/lib/types";

interface ContainerPluginDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pluginData: ContainerPlugin | null;
  isLoading: boolean;
  error: string | null;
}

export function ContainerPluginDetailsModal({
  isOpen,
  onClose,
  pluginData,
  isLoading,
  error,
}: ContainerPluginDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const exportData = (
    data: any,
    format: "json" | "csv" | "txt",
    filename: string
  ) => {
    let content = "";
    let mimeType = "";
    let extension = "";

    switch (format) {
      case "json":
        content = JSON.stringify(data, null, 2);
        mimeType = "application/json";
        extension = "json";
        break;
      case "csv":
        if (Array.isArray(data)) {
          const headers = Object.keys(data[0] || {}).join(",");
          const rows = data
            .map((row) =>
              Object.values(row)
                .map((val) => `"${val}"`)
                .join(",")
            )
            .join("\n");
          content = `${headers}\n${rows}`;
        } else {
          const entries = Object.entries(data);
          content =
            "Field,Value\n" +
            entries.map(([key, value]) => `"${key}","${value}"`).join("\n");
        }
        mimeType = "text/csv";
        extension = "csv";
        break;
      case "txt":
        content =
          typeof data === "string" ? data : JSON.stringify(data, null, 2);
        mimeType = "text/plain";
        extension = "txt";
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${
      new Date().toISOString().split("T")[0]
    }.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/Id/g, "ID")
      .replace(/Url/g, "URL")
      .replace(/Api/g, "API");
  };

  const getStatusInfo = (status: string) => {
    const lowerStatus = status?.toLowerCase();
    if (
      lowerStatus === "active" ||
      lowerStatus === "running" ||
      lowerStatus === "enabled"
    ) {
      return {
        color: "bg-green-100 text-green-700 border-green-200",
        icon: CheckCircle,
      };
    }
    if (
      lowerStatus === "inactive" ||
      lowerStatus === "stopped" ||
      lowerStatus === "disabled"
    ) {
      return { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle };
    }
    if (lowerStatus === "pending" || lowerStatus === "loading") {
      return {
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: AlertCircle,
      };
    }
    return {
      color: "bg-gray-100 text-gray-700 border-gray-200",
      icon: Settings,
    };
  };

  const OverviewTab = ({ data, onCopy, onExport }: any) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [copiedAll, setCopiedAll] = useState(false);

    if (!data)
      return (
        <div className="p-6 text-center text-gray-500">
          No plugin data available
        </div>
      );

    const filteredData = Object.entries(data).filter(
      ([key, value]) =>
        key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const copyAllData = () => {
      const text = filteredData
        .map(([key, value]) => `${formatFieldName(key)}: ${value}`)
        .join("\n");
      onCopy(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    };

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search plugin fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 w-64 rounded-lg border-gray-300"
              />
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {filteredData.length} fields
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyAllData}
              className="rounded-lg text-xs bg-transparent"
            >
              {copiedAll ? (
                <Check className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copiedAll ? "Copied" : "Copy All"}
            </Button>
            <Select
              onValueChange={(format) =>
                onExport(Object.fromEntries(filteredData), format)
              }
            >
              <SelectTrigger className="w-24 h-8 rounded-lg text-xs">
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap">
                    Field
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap">
                    Value
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200 w-16 whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map(([key, value]) => {
                  const formattedKey = formatFieldName(key);
                  const statusInfo = key.toLowerCase().includes("status")
                    ? getStatusInfo(String(value))
                    : null;
                  const cellKey = `${key}-${value}`;
                  const isCopied = copiedCell === cellKey;

                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 whitespace-nowrap">
                        {formattedKey}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm text-gray-800 border-r border-gray-200 cursor-context-menu transition-colors ${
                          isCopied ? "bg-green-100" : ""
                        }`}
                        onContextMenu={(e) =>
                          handleCellRightClick(e, String(value), cellKey)
                        }
                        title="Right-click to copy"
                      >
                        <div className="flex items-center space-x-2">
                          {statusInfo ? (
                            <div className="flex items-center space-x-2">
                              <Badge
                                className={`${statusInfo.color} rounded-full flex items-center space-x-1`}
                              >
                                <statusInfo.icon className="h-3 w-3" />
                                <span>{String(value)}</span>
                              </Badge>
                            </div>
                          ) : key.toLowerCase().includes("date") ||
                            key.toLowerCase().includes("time") ? (
                            <div className="bg-blue-50 px-2 py-1 rounded-md font-mono text-xs whitespace-nowrap">
                              {new Date(String(value)).toLocaleString()}
                            </div>
                          ) : key.toLowerCase().includes("id") ||
                            key.toLowerCase().includes("uuid") ? (
                            <div className="font-mono bg-gray-50 px-2 py-1 rounded-md text-xs">
                              {String(value)}
                            </div>
                          ) : key.toLowerCase().includes("url") ||
                            key.toLowerCase().includes("endpoint") ? (
                            <div className="font-mono bg-purple-50 text-purple-800 px-2 py-1 rounded-md text-xs break-all">
                              {String(value)}
                            </div>
                          ) : (
                            <span className="whitespace-pre-wrap">
                              {String(value)}
                            </span>
                          )}
                          {isCopied && (
                            <span className="ml-2 text-xs text-green-600 font-medium">
                              Copied!
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onCopy(String(value));
                            setCopiedCell(cellKey);
                            setTimeout(() => setCopiedCell(null), 1500);
                          }}
                          className="h-6 w-6 p-0 rounded-md hover:bg-gray-100"
                        >
                          {isCopied ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const RawJsonTab = ({ data, onCopy, onExport }: any) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [copiedAll, setCopiedAll] = useState(false);

    const jsonString = JSON.stringify(data || {}, null, 2);
    const filteredJson = searchTerm
      ? jsonString
          .split("\n")
          .filter((line) =>
            line.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .join("\n")
      : jsonString;

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search JSON..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-8 w-64 rounded-lg border-gray-300 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onCopy(filteredJson);
                setCopiedAll(true);
                setTimeout(() => setCopiedAll(false), 1500);
              }}
              className="rounded-lg text-xs bg-transparent"
            >
              {copiedAll ? (
                <Check className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copiedAll ? "Copied" : "Copy JSON"}
            </Button>
            <Select onValueChange={(format) => onExport(data, format)}>
              <SelectTrigger className="w-24 h-8 rounded-lg text-xs">
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col min-h-0">
          <div className="bg-gray-900 rounded-lg p-4 flex-1 overflow-hidden">
            <pre className="text-green-400 text-xs font-mono whitespace-pre h-full overflow-auto">
              {filteredJson}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  const handleCellRightClick = (
    e: React.MouseEvent,
    value: string,
    cellKey: string
  ) => {
    e.preventDefault();
    navigator.clipboard.writeText(value);
    setCopiedCell(cellKey);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  if (!pluginData && !isLoading && !error) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-32px)] h-[calc(100vh-32px)] max-w-none max-h-none overflow-hidden rounded-2xl border-0 shadow-2xl p-0 mx-auto flex flex-col">
        <DialogHeader className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl p-3">
                <Server className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-800">
                  Container Plugin Details
                </DialogTitle>
                {pluginData && (
                  <p className="text-sm text-gray-500 mt-1">
                    Plugin ID: {pluginData.id || "N/A"} • Status:{" "}
                    {(pluginData as any).status || "Unknown"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-gray-600">Loading plugin details...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-600 font-medium">Error: {error}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && pluginData && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="border-b border-gray-200 px-6 flex-shrink-0">
              <nav className="flex space-x-8" aria-label="Tabs">
                {[
                  { id: "overview", name: "Overview", icon: Activity },
                  { id: "rawjson", name: "Raw JSON", icon: Database },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-all duration-200 flex items-center space-x-2`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1 min-h-0">
              {activeTab === "overview" && (
                <OverviewTab
                  data={pluginData}
                  onCopy={(data: string) => navigator.clipboard.writeText(data)}
                  onExport={(data: any, format: any) =>
                    exportData(data, format, "plugin-overview")
                  }
                />
              )}

              {activeTab === "rawjson" && (
                <RawJsonTab
                  data={pluginData}
                  onCopy={(data: string) => navigator.clipboard.writeText(data)}
                  onExport={(data: any, format: any) =>
                    exportData(data, format, "plugin-raw-json")
                  }
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
