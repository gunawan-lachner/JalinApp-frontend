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
  CreditCard,
  Settings,
  Route,
  FileText,
  Database,
  Copy,
  Search,
  RefreshCw,
  Check,
  ListFilter,
  Pencil,
  Mail,
  ChevronDown,
  Server,
} from "lucide-react";
import type { Transaction } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  transactionDetails: {
    attributes: any[];
    endpoints: any[];
    graylog: any[];
    graylogError?: string | null;
  };
  isLoading: boolean;
}

export function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
  transactionDetails,
  isLoading,
}: TransactionDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const formatAmount = (amount: number) => {
    if (amount === 0) return "Rp0.00";
    return `Rp${(amount / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false, // Use 24-hour format
      });
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

  // Helper function to export tab data
  const exportTabData = (
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
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]).join(",");
          const rows = data
            .map((row) =>
              Object.values(row)
                .map((val) => `"${val}"`)
                .join(",")
            )
            .join("\n");
          content = `${headers}\n${rows}`;
        } else {
          content = "No data available";
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

  const handleCellRightClick = (
    e: React.MouseEvent,
    value: string,
    cellId: string
  ) => {
    e.preventDefault(); // Prevent default context menu
    navigator.clipboard.writeText(value);
    setCopiedCell(cellId);
    setTimeout(() => setCopiedCell(null), 1500); // Clear feedback after 1.5s
  };

  // Transaction Details Tab Component
  const TransactionDetailsTab = ({ transaction, onCopy, onExport }: any) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [copiedAll, setCopiedAll] = useState(false);

    if (!transaction)
      return (
        <div className="p-6 text-center text-gray-500">
          No transaction data available
        </div>
      );

    const filteredData = Object.entries(transaction).filter(
      ([key, value]) =>
        key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const copyAllData = () => {
      const text = filteredData
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
      onCopy(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    };

    return (
      <div className="flex flex-col h-full">
        {/* Tab Header with Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transaction fields..."
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

        {/* Transaction Details Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-[calc(95vh-250px)]">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                      Field
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                      Value
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200 w-16">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map(([key, value], index) => {
                    const cellId = `cell-${index}`;
                    const isCopied = copiedCell === cellId;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                          {key}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-gray-800 border-r border-gray-200 cursor-context-menu transition-colors ${
                            isCopied ? "bg-green-50" : ""
                          }`}
                          onContextMenu={(e) =>
                            handleCellRightClick(e, String(value), cellId)
                          }
                          title="Right-click to copy"
                        >
                          <div className="flex items-center space-x-2">
                            {key === "Amount" ? (
                              <div className="bg-green-50 text-green-800 px-2 py-1 rounded-md font-medium">
                                {formatAmount(value as number)}
                              </div>
                            ) : key === "Result" ? (
                              <Badge
                                className={`${getStatusColor(
                                  value as number
                                )} rounded-full`}
                              >
                                {String(value)}
                              </Badge>
                            ) : key.includes("Date") ? (
                              <div className="bg-blue-50 px-2 py-1 rounded-md font-mono text-xs">
                                {formatDate(String(value))}
                              </div>
                            ) : key.includes("ID") || key.includes("UUID") ? (
                              <div className="font-mono bg-gray-50 px-2 py-1 rounded-md text-xs">
                                {String(value)}
                              </div>
                            ) : (
                              <span className="break-all">{String(value)}</span>
                            )}
                            {isCopied && (
                              <Badge className="bg-green-100 text-green-700 text-xs animate-in fade-in">
                                Copied!
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onCopy(String(value));
                              setCopiedCell(cellId);
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
      </div>
    );
  };

  // Message Cell Component with expandable functionality and ISO 8583 parsing
  const MessageCell = ({ message }: { message: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const isISO8583 = message.includes("DE-");

    if (isISO8583) {
      // Parse ISO 8583 message
      const deFields = message
        .split("\t")
        .filter((field) => field.includes("DE-"));
      const maxFieldsToShow = isExpanded ? deFields.length : 10;
      const displayFields = deFields.slice(0, maxFieldsToShow);

      return (
        <div className="font-mono text-xs w-full">
          <div className="space-y-1">
            {displayFields.map((field, index) => {
              const [deNumber, value] = field.split("=");
              return (
                <div key={index} className="flex items-start">
                  <span className="text-blue-600 font-semibold mr-2 min-w-[60px]">
                    {deNumber}
                  </span>
                  <span className="text-gray-800 break-all">{value}</span>
                </div>
              );
            })}
          </div>
          {deFields.length > 10 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
            >
              {isExpanded
                ? `Show less (${deFields.length - 10} more hidden)`
                : `Show all ${deFields.length} fields`}
            </button>
          )}
        </div>
      );
    }

    // Original logic for non-ISO messages
    const isLongMessage = message.length > 150;
    const displayMessage =
      isExpanded || !isLongMessage
        ? message
        : message.substring(0, 150) + "...";

    return (
      <div className="font-mono text-xs bg-gray-50 px-2 py-1 rounded-md w-full">
        <div className="break-words whitespace-pre-wrap" title={message}>
          {displayMessage}
        </div>
        {isLongMessage && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    );
  };

  // Generic Data Tab Component
  const DataTab = ({
    data,
    loading,
    title,
    icon: Icon,
    onCopy,
    onExport,
  }: any) => {
    // Handle the endpoint response structure with "endpoints" wrapper
    let safeData: any[] = [];

    if (title === "Endpoint Data") {
      // For endpoint data, extract from the "endpoints" wrapper
      if (data && typeof data === "object" && Array.isArray(data.endpoints)) {
        safeData = data.endpoints;
      } else if (Array.isArray(data)) {
        safeData = data;
      }
    } else {
      // For other data types, use existing logic
      safeData = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.attributes)
        ? (data as any).attributes
        : [];
    }

    const [searchTerm, setSearchTerm] = useState("");
    const [copiedAll, setCopiedAll] = useState(false);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">
              Loading {title.toLowerCase()}...
            </span>
          </div>
        </div>
      );
    }

    if (!safeData || safeData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No {title.toLowerCase()} available</p>
          </div>
        </div>
      );
    }

    const filteredData = safeData.filter((item: any) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    // Define column order and responsive widths based on the tab title
    const getColumnConfig = () => {
      if (title === "Attributes" && filteredData.length > 0) {
        return {
          keys: ["id", "field", "content"],
          labels: {
            id: "id",
            field: "field",
            content: "content",
          },
          widths: {
            id: "w-40 min-w-[150px]", // Wider
            field: "w-64 min-w-[220px]", // Wider
            content: "w-64 min-w-[200px]", // Less wide
          },
        };
      } else if (title === "Endpoint Data" && filteredData.length > 0) {
        return {
          keys: [
            "id",
            "dt",
            "msg_direction", // Original key
            "request_response", // Original key
            "participant_id", // Original key
            "worker_id",
            "state",
            "uuid",
            "message",
          ],
          labels: {
            id: "id",
            dt: "dt",
            msg_direction: "direction", // New label
            request_response: "response", // New label
            participant_id: "part_id", // New label
            worker_id: "worker_id",
            state: "state",
            uuid: "uuid",
            message: "message",
          },
          widths: {
            id: "w-20 min-w-[100px]", // Wider
            dt: "w-32 min-w-[180px]", // Wider
            msg_direction: "w-20 min-w-[110px]", // Wider
            request_response: "w-20 min-w-[110px]", // Wider
            participant_id: "w-16 min-w-[110px]", // Wider
            worker_id: "w-20 min-w-[100px]", // Wider
            state: "w-12 min-w-[100px]", // Wider
            uuid: "w-56 min-w-[200px]", // Wider
            message: "w-64 min-w-[200px] max-w-[280px]", // Slightly wider, but still responsive
          },
        };
      } else {
        return {
          keys: filteredData.length > 0 ? Object.keys(filteredData[0]) : [],
          labels: {}, // No specific labels for generic data
          widths: {},
        };
      }
    };

    const columnConfig = getColumnConfig();
    const columnKeys = columnConfig.keys;
    const columnLabels = columnConfig.labels;

    return (
      <div className="flex flex-col h-full">
        {/* Tab Header with Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 w-64 rounded-lg border-gray-300"
              />
            </div>
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-700"
            >
              {filteredData.length} items
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onCopy(JSON.stringify(filteredData, null, 2));
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
              {copiedAll ? "Copied" : "Copy All"}
            </Button>
            <Select onValueChange={(format) => onExport(filteredData, format)}>
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

        {/* Data Table in Responsive Card */}
        <div className="flex-1 overflow-hidden p-4">
          <Card className="h-full border border-gray-200 rounded-lg shadow-sm flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <div className="overflow-auto flex-1 max-h-[calc(95vh-250px)]">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      {columnKeys.map((key) => (
                        <th
                          key={key}
                          className={`px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap ${
                            (columnConfig.widths as any)[key] || "w-auto"
                          }`}
                        >
                          {(columnLabels as any)[key] || key}
                        </th>
                      ))}
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200 w-12 sticky right-0 bg-gray-50">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredData.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {columnKeys.map((key, cellIndex) => {
                          const cellId = `${title}-${index}-${cellIndex}`;
                          const isCopied = copiedCell === cellId;
                          const cellValue = String((item as any)[key]);

                          return (
                            <td
                              key={cellIndex}
                              className={`px-3 py-3 text-sm text-gray-800 border-r border-gray-200 cursor-context-menu transition-colors ${
                                (columnConfig.widths as any)[key] || "w-auto"
                              } ${key === "message" ? "align-top" : ""} ${
                                isCopied ? "bg-green-50" : ""
                              }`}
                              onContextMenu={(e) =>
                                handleCellRightClick(e, cellValue, cellId)
                              }
                              title="Right-click to copy"
                            >
                              <div className="flex items-center space-x-2">
                                {key === "id" ? (
                                  <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded-md">
                                    {index}
                                  </span>
                                ) : key === "field" ? (
                                  <span className="font-medium text-blue-700 break-words">
                                    {cellValue}
                                  </span>
                                ) : key === "content" ? (
                                  <div className="font-mono bg-gray-50 px-2 py-1 rounded-md text-xs break-words w-full">
                                    <div className="whitespace-pre-wrap">
                                      {cellValue}
                                    </div>
                                  </div>
                                ) : key === "dt" ? (
                                  <span className="font-mono text-xs bg-blue-50 px-2 py-1 rounded-md whitespace-nowrap">
                                    {formatDate(cellValue)}
                                  </span>
                                ) : key === "msg_direction" ? (
                                  <Badge
                                    variant="secondary"
                                    className={`${
                                      (item as any)[key] === "I"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-blue-100 text-blue-700"
                                    } text-xs whitespace-nowrap`}
                                  >
                                    {(item as any)[key] === "I"
                                      ? "Incoming"
                                      : "Outgoing"}
                                  </Badge>
                                ) : key === "request_response" ? (
                                  <Badge
                                    variant="secondary"
                                    className={`${
                                      (item as any)[key] === "1"
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-purple-100 text-purple-700"
                                    } text-xs whitespace-nowrap`}
                                  >
                                    {(item as any)[key] === "1"
                                      ? "Request"
                                      : "Response"}
                                  </Badge>
                                ) : key === "message" ? (
                                  <MessageCell message={cellValue} />
                                ) : key === "uuid" ||
                                  key === "participant_id" ? (
                                  <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded-md break-all">
                                    {cellValue}
                                  </span>
                                ) : (
                                  <span className="break-words">
                                    {cellValue}
                                  </span>
                                )}
                                {isCopied && (
                                  <Badge className="bg-green-100 text-green-700 text-xs animate-in fade-in">
                                    Copied!
                                  </Badge>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-2 py-3 text-center sticky right-0 bg-white border-l border-gray-200 w-12">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const rowCellId = `${title}-${index}-row`;
                              onCopy(JSON.stringify(item, null, 2));
                              setCopiedCell(rowCellId);
                              setTimeout(() => setCopiedCell(null), 1500);
                            }}
                            className="h-6 w-6 p-0 rounded-md hover:bg-gray-100"
                          >
                            {copiedCell === `${title}-${index}-row` ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Raw JSON Tab Component
  const RawJsonTab = ({
    transaction,
    attributes,
    endpoints,
    graylog,
    onCopy,
    onExport,
  }: any) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedView, setSelectedView] = useState("all");
    const [copiedAll, setCopiedAll] = useState(false);

    const rawData = {
      transaction: transaction || {},
      attributes: attributes || [],
      endpoints: endpoints || [],
      graylog: graylog || [],
    };

    const getViewData = () => {
      switch (selectedView) {
        case "transaction":
          return rawData.transaction;
        case "attributes":
          return rawData.attributes;
        case "endpoints":
          return rawData.endpoints;
        case "graylog":
          return rawData.graylog;
        default:
          return rawData;
      }
    };

    const jsonString = JSON.stringify(getViewData(), null, 2);
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
        {/* Tab Header with Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <Select value={selectedView} onValueChange={setSelectedView}>
              <SelectTrigger className="w-40 h-8 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Data</SelectItem>
                <SelectItem value="transaction">Transaction Only</SelectItem>
                <SelectItem value="attributes">Attributes Only</SelectItem>
                <SelectItem value="endpoints">Endpoints Only</SelectItem>
                <SelectItem value="graylog">GrayLog Only</SelectItem>
              </SelectContent>
            </Select>
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
            <Select onValueChange={(format) => onExport(getViewData(), format)}>
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

        {/* JSON Content */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="bg-gray-900 rounded-lg p-4 flex flex-col max-h-[calc(95vh-250px)]">
            <pre className="text-green-400 text-xs font-mono whitespace-pre overflow-auto max-w-[1000px] flex-1">
              {filteredJson}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  // Custom GrayLog Messages Tab Component with timestamp grouping and expandable messages
  const GrayLogMessagesTab = ({
    data,
    loading,
    error,
    onCopy,
    onExport,
  }: any) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
      new Set()
    );
    const [copiedAll, setCopiedAll] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading graylog messages...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-start justify-center gap-3 p-6 m-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
          <p className="font-semibold">Gagal mengambil GrayLog messages</p>
          <p className="text-sm whitespace-pre-wrap break-words">{error}</p>
          <p className="text-xs text-red-600">
            Tip: user GrayLog harus punya permission Search API
            (/api/search/universal/absolute), bukan hanya bisa login ke UI.
          </p>
        </div>
      );
    }

    let messages = [];
    let rules = [];

    const isSavedTransactionData =
      data &&
      Array.isArray(data) &&
      data.length > 0 &&
      data[0].hasOwnProperty("level") &&
      data[0].hasOwnProperty("message") &&
      data[0].hasOwnProperty("source");

    if (isSavedTransactionData) {
      // Handle saved transaction graylog data (simpler structure)
      messages = data;
    } else if (Array.isArray(data)) {
      // If data is already an array, use it directly
      messages = data;
    } else if (data?.data?.messages && Array.isArray(data.data.messages)) {
      // Handle new API structure: data.data.messages[]
      messages = data.data.messages;
      // Extract rules from the new API structure
      rules = data.data.rules || [];
    } else if (data?.messages && Array.isArray(data.messages)) {
      // If data has a messages property that's an array
      messages = data.messages;
      rules = data.rules || [];
    } else if (data?.data && Array.isArray(data.data)) {
      // If data has a data property that's an array
      messages = data.data;
    } else if (data && typeof data === "object") {
      // If data is an object, try to find any array property
      const arrayProps = Object.values(data).find((val) => Array.isArray(val));
      if (arrayProps) {
        messages = arrayProps as any[];
      }
      rules = data.rules || [];
    }

    const getMatchingRule = (message: any) => {
      if (!rules || rules.length === 0) return null;

      const messageContent = message.full_message || message.message || "";

      for (const rule of rules) {
        if (rule.active === 1 && rule.key_word) {
          try {
            // Create regex from key_word (supports pipe-separated patterns)
            const regex = new RegExp(rule.key_word, "i"); // case insensitive
            if (regex.test(messageContent)) {
              return rule;
            }
          } catch (error) {
            console.warn(
              "Invalid regex pattern in rule:",
              rule.key_word,
              error
            );
          }
        }
      }
      return null;
    };

    const convertCssToReactStyle = (cssString: string) => {
      const styleObj: { [key: string]: string } = {};

      cssString.split(";").forEach((rule) => {
        const [property, value] = rule.split(":").map((s) => s.trim());
        if (property && value) {
          // Convert kebab-case to camelCase (e.g., font-weight -> fontWeight)
          const camelCaseProperty = property.replace(
            /-([a-z])/g,
            (match, letter) => letter.toUpperCase()
          );
          styleObj[camelCaseProperty] = value;
        }
      });

      return styleObj;
    };

    const getMessageStyle = (message: any) => {
      const matchingRule = getMatchingRule(message);
      if (matchingRule && matchingRule.action) {
        return {
          style: convertCssToReactStyle(matchingRule.action),
          rule: matchingRule,
        };
      }
      return {};
    };

    const applyRuleStyleToText = (text: string, rules: any[]) => {
      if (!rules || rules.length === 0) return text;

      let styledText = text;
      const matches: Array<{
        rule: any;
        start: number;
        end: number;
        text: string;
      }> = [];

      // Find all matches for all active rules
      rules.forEach((rule) => {
        if (rule.active === 1 && rule.key_word) {
          try {
            const regex = new RegExp(rule.key_word, "gi");
            let match;
            while ((match = regex.exec(text)) !== null) {
              matches.push({
                rule,
                start: match.index,
                end: match.index + match[0].length,
                text: match[0],
              });
            }
          } catch (error) {
            console.warn("Invalid regex pattern:", rule.key_word);
          }
        }
      });

      // Sort matches by start position (descending) to apply styling from end to start
      matches.sort((a, b) => b.start - a.start);

      // Apply styling to matches
      matches.forEach((match) => {
        const baseText = typeof styledText === "string" ? styledText : text;
        const beforeText = baseText.substring(0, match.start);
        const afterText = baseText.substring(match.end);
        const reactStyle = convertCssToReactStyle(match.rule.action);

        styledText = (
          <>
            {beforeText}
            <span style={reactStyle} title={match.rule.description}>
              {match.text}
            </span>
            {afterText}
          </>
        ) as any;
      });

      return matches.length > 0 ? styledText : text;
    };

    const renderStructuredData = (obj: any, level = 0) => {
      if (obj === null || obj === undefined) {
        return <span className="text-gray-500 italic">null</span>;
      }

      if (
        typeof obj === "string" ||
        typeof obj === "number" ||
        typeof obj === "boolean"
      ) {
        const textValue = String(obj);
        const styledText =
          typeof obj === "string"
            ? applyRuleStyleToText(textValue, rules)
            : textValue;
        return <span className="text-gray-800">{styledText}</span>;
      }

      if (Array.isArray(obj)) {
        return (
          <div className="ml-4">
            {obj.map((item, index) => (
              <div key={index} className="flex">
                <span className="text-blue-600 mr-2">[{index}]:</span>
                {renderStructuredData(item, level + 1)}
              </div>
            ))}
          </div>
        );
      }

      if (typeof obj === "object") {
        return (
          <div className={level > 0 ? "ml-4" : ""}>
            {Object.entries(obj).map(([key, value]) => (
              <div key={key} className="flex flex-wrap items-start mb-1">
                <span className="text-blue-600 font-medium mr-2 min-w-0 break-all">
                  {key}:
                </span>
                <div className="flex-1 min-w-0">
                  {renderStructuredData(value, level + 1)}
                </div>
              </div>
            ))}
          </div>
        );
      }

      return <span>{String(obj)}</span>;
    };

    const formatGraylogTimestamp = (dateString: string) => {
      try {
        const d = new Date(dateString);
        if (Number.isNaN(d.getTime())) return dateString || "Unknown";
        const pad = (n: number, len = 2) => String(n).padStart(len, "0");
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
          d.getUTCDate()
        )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(
          d.getUTCSeconds()
        )}.${pad(d.getUTCMilliseconds(), 3)} +00:00`;
      } catch {
        return dateString || "Unknown";
      }
    };

    const normalizeMessage = (item: any, index: number) => {
      if (isSavedTransactionData) {
        return {
          message: item,
          messageId: `saved-${item.uuid || "msg"}-${index}`,
          timestamp: item.timestamp,
          source: item.source || "Unknown Source",
          plugin: item.Plugin || item.plugin || "-",
          uuid: item.UUID || item.uuid || "-",
          messageContent: String(item.message ?? "No message content"),
        };
      }

      const message = item.message || item;
      return {
        message,
        messageId: message._id || message.id || `msg-${index}`,
        timestamp:
          message.timestamp ||
          message.EventReceivedTime ||
          message.dt ||
          message.date_n_time,
        source:
          message.source || message.gl2_remote_ip || "Unknown Source",
        plugin: message.Plugin || message.plugin || "-",
        uuid: message.UUID || message.uuid || "-",
        messageContent: String(
          message.full_message || message.message || "No message content"
        ),
      };
    };

    const sortedMessages = [...messages]
      .map((item: any, index: number) => normalizeMessage(item, index))
      .filter((entry) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          entry.messageContent.toLowerCase().includes(q) ||
          String(entry.source || "").toLowerCase().includes(q) ||
          String(entry.plugin || "").toLowerCase().includes(q) ||
          String(entry.uuid || "").toLowerCase().includes(q) ||
          String(entry.timestamp || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return ta - tb;
      });

    const toggleMessageExpansion = (messageId: string) => {
      const newExpanded = new Set(expandedMessages);
      if (newExpanded.has(messageId)) {
        newExpanded.delete(messageId);
      } else {
        newExpanded.add(messageId);
      }
      setExpandedMessages(newExpanded);
    };

    return (
      <div className="flex flex-col min-h-0 bg-white border border-gray-200 rounded-sm overflow-hidden">
        {/* Graylog-style widget header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
          <h3 className="text-sm font-semibold text-gray-800">All Messages</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-gray-800"
              onClick={() => setShowSearch((v) => !v)}
              title="Search"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-gray-800"
              onClick={() => {
                onCopy(JSON.stringify(messages, null, 2));
                setCopiedAll(true);
                setTimeout(() => setCopiedAll(false), 1500);
              }}
              title={copiedAll ? "Copied" : "Copy all"}
            >
              {copiedAll ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <Select onValueChange={(format) => onExport(messages, format)}>
              <SelectTrigger className="h-7 w-7 p-0 border-0 shadow-none justify-center [&>svg:last-child]:hidden">
                <Pencil className="h-3.5 w-3.5 text-gray-500" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">Export JSON</SelectItem>
                <SelectItem value="txt">Export TXT</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[11px] text-gray-500 ml-1">
              {sortedMessages.length}
            </span>
          </div>
        </div>

        {showSearch && (
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs rounded-sm border-gray-300"
              autoFocus
            />
          </div>
        )}

        {/* Column headers */}
        <div className="grid grid-cols-[minmax(210px,1.1fr)_minmax(110px,0.7fr)_minmax(160px,1.3fr)_minmax(240px,1.2fr)] gap-3 px-3 py-1.5 bg-[#f3f3f3] border-b border-gray-200 text-[11px] font-semibold text-gray-600">
          {["timestamp", "source", "Plugin", "UUID"].map((label) => (
            <div key={label} className="flex items-center gap-1 min-w-0">
              <span className="truncate">{label}</span>
              <ListFilter className="h-3 w-3 text-gray-400 shrink-0" />
            </div>
          ))}
        </div>

        {/* Message list */}
        <div className="flex-1 min-w-0 max-h-[calc(95vh-280px)] overflow-y-auto">
          {sortedMessages.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-gray-500">
              No messages found
            </div>
          ) : (
            sortedMessages.map((entry) => {
              const {
                message,
                messageId,
                timestamp,
                source,
                plugin,
                uuid,
                messageContent,
              } = entry;
              const isExpanded = expandedMessages.has(messageId);
              const messageStyle = getMessageStyle(message);

              return (
                <div
                  key={messageId}
                  className="border-b border-gray-200 px-3 py-2 hover:bg-[#fafafa] cursor-pointer"
                  onClick={() => toggleMessageExpansion(messageId)}
                >
                  <div className="grid grid-cols-[minmax(210px,1.1fr)_minmax(110px,0.7fr)_minmax(160px,1.3fr)_minmax(240px,1.2fr)] gap-3">
                    <span className="text-[13px] font-bold text-gray-900 leading-5 truncate">
                      {formatGraylogTimestamp(timestamp || "Unknown")}
                    </span>
                    <span className="text-[13px] font-bold text-gray-900 leading-5 truncate">
                      {source}
                    </span>
                    <span
                      className="text-[13px] font-bold text-gray-900 leading-5 truncate"
                      title={plugin}
                    >
                      {plugin}
                    </span>
                    <span
                      className="text-[13px] font-bold text-gray-900 leading-5 truncate"
                      title={uuid}
                    >
                      {uuid}
                    </span>
                  </div>

                  <pre
                    className="mt-0.5 pl-0 text-[12.5px] font-mono leading-5 whitespace-pre-wrap break-words text-[#0a7a7a]"
                    style={messageStyle.style || undefined}
                  >
                    {applyRuleStyleToText(messageContent, rules)}
                  </pre>

                  {isExpanded && (
                    <div
                      className="mt-2 mb-1 border border-gray-200 bg-[#f7f7f7] px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const fields =
                          message && typeof message === "object"
                            ? message
                            : {};
                        const graylogId =
                          fields._id ||
                          fields.gl2_message_id ||
                          messageId;
                        const receivedBy =
                          fields.gl2_source_input ||
                          fields.gl2_source_node ||
                          fields.gl2_remote_ip ||
                          "-";
                        const storedInIndex =
                          fields.gl2_source_collector ||
                          fields._index ||
                          fields.index ||
                          "-";
                        const streams = Array.isArray(fields.streams)
                          ? fields.streams
                          : fields.gl2_route
                            ? [fields.gl2_route]
                            : [];
                        const leftMeta = [
                          {
                            label: "Timestamp",
                            value: formatGraylogTimestamp(
                              fields.timestamp || timestamp || "-"
                            ).replace(" +00:00", ""),
                          },
                          {
                            label: "Received by",
                            value: receivedBy,
                            icon: true,
                          },
                          {
                            label: "Stored in index",
                            value: storedInIndex,
                          },
                          {
                            label: "Routed into streams",
                            value: streams,
                            streams: true,
                          },
                        ];
                        const rightFieldOrder = [
                          "EventReceivedTime",
                          "Plugin",
                          "Severity",
                          "SourceModuleName",
                          "SourceModuleType",
                          "UUID",
                          "facility",
                          "full_message",
                          "message",
                          "level",
                          "source",
                        ];
                        const usedKeys = new Set([
                          "timestamp",
                          "_id",
                          "gl2_message_id",
                          "gl2_source_input",
                          "gl2_source_node",
                          "gl2_remote_ip",
                          "gl2_source_collector",
                          "_index",
                          "index",
                          "streams",
                          "gl2_route",
                          "message",
                          "full_message",
                          ...rightFieldOrder.map((k) => k.toLowerCase()),
                        ]);
                        const rightFields = rightFieldOrder
                          .map((key) => {
                            const foundKey = Object.keys(fields).find(
                              (k) => k.toLowerCase() === key.toLowerCase()
                            );
                            if (!foundKey) return null;
                            const val = fields[foundKey];
                            if (val === undefined || val === null || val === "")
                              return null;
                            return { label: foundKey, value: val };
                          })
                          .filter(Boolean) as Array<{
                          label: string;
                          value: any;
                        }>;

                        // Append remaining fields not already shown
                        Object.keys(fields).forEach((key) => {
                          if (usedKeys.has(key.toLowerCase())) return;
                          if (
                            rightFields.some(
                              (f) => f.label.toLowerCase() === key.toLowerCase()
                            )
                          )
                            return;
                          const val = fields[key];
                          if (
                            val === undefined ||
                            val === null ||
                            typeof val === "object"
                          )
                            return;
                          rightFields.push({ label: key, value: val });
                        });

                        const fullMessage =
                          fields.full_message || fields.message || messageContent;

                        return (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-200">
                              <div className="flex items-center gap-2 min-w-0">
                                <Mail className="h-4 w-4 text-gray-500 shrink-0" />
                                <span className="text-sm font-semibold text-gray-800 font-mono truncate">
                                  {graylogId}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs rounded-sm bg-white"
                                  onClick={() => {
                                    onCopy(String(graylogId));
                                    setCopiedCell(`${messageId}-permalink`);
                                    setTimeout(() => setCopiedCell(null), 1500);
                                  }}
                                >
                                  Permalink
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs rounded-sm bg-white"
                                  disabled
                                >
                                  Show surrounding messages
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs rounded-sm bg-white"
                                  disabled
                                >
                                  Test against stream
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs rounded-sm bg-white"
                                  onClick={() => {
                                    onCopy(String(graylogId));
                                    setCopiedCell(`${messageId}-id`);
                                    setTimeout(() => setCopiedCell(null), 1500);
                                  }}
                                >
                                  {copiedCell === `${messageId}-id` ||
                                  copiedCell === `${messageId}-permalink` ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1 text-green-600" />
                                      Copied
                                    </>
                                  ) : (
                                    "Copy ID"
                                  )}
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1">
                              <div className="space-y-3">
                                {leftMeta.map((item) => (
                                  <div key={item.label}>
                                    <div className="text-[12px] font-semibold text-gray-700 mb-0.5">
                                      {item.label}
                                    </div>
                                    {item.streams ? (
                                      <ul className="list-disc list-inside text-[13px]">
                                        {(item.value as any[]).length > 0 ? (
                                          (item.value as any[]).map(
                                            (stream: any, i: number) => (
                                              <li key={i}>
                                                <span className="text-[#5b4db8] hover:underline cursor-default">
                                                  {typeof stream === "string"
                                                    ? stream
                                                    : stream?.title ||
                                                      stream?.id ||
                                                      JSON.stringify(stream)}
                                                </span>
                                              </li>
                                            )
                                          )
                                        ) : (
                                          <li className="text-gray-500 list-none">
                                            -
                                          </li>
                                        )}
                                      </ul>
                                    ) : (
                                      <div className="text-[13px] text-gray-800 flex items-center gap-1.5 break-all">
                                        {item.icon && (
                                          <Server className="h-3.5 w-3.5 text-[#5b4db8] shrink-0" />
                                        )}
                                        <span>{String(item.value)}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <div className="space-y-3">
                                {rightFields
                                  .filter(
                                    (f) =>
                                      f.label.toLowerCase() !==
                                        "full_message" &&
                                      f.label.toLowerCase() !== "message"
                                  )
                                  .map((item) => (
                                    <div key={item.label}>
                                      <div className="text-[12px] font-semibold text-gray-700 mb-0.5">
                                        {item.label}
                                      </div>
                                      <div className="text-[13px] text-gray-800 break-all whitespace-pre-wrap">
                                        {String(item.value)}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-200">
                              <div className="text-[12px] font-semibold text-gray-700 mb-1">
                                full_message
                              </div>
                              <pre
                                className="text-[12.5px] font-mono leading-5 whitespace-pre-wrap break-words text-[#0a7a7a]"
                                style={messageStyle.style || undefined}
                              >
                                {applyRuleStyleToText(
                                  String(fullMessage),
                                  rules
                                )}
                              </pre>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-32px)] h-[calc(100vh-32px)] max-w-none max-h-none overflow-hidden rounded-2xl border-0 shadow-2xl p-0 mx-auto flex flex-col">
        <DialogHeader className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-3">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-800">
                  Transaction Details
                </DialogTitle>
                {transaction && (
                  <p className="text-sm text-gray-500 mt-1">
                    Transaction ID:{" "}
                    {transaction["Trx ID"] || (transaction as any).trx_id} •
                    UUID: {transaction["UUID"] || (transaction as any).uuid} •{" "}
                    {formatDate(
                      transaction["Date n Time"] ||
                        (transaction as any).date_n_time ||
                        (transaction as any).dt
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-w-0 flex-col h-full">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                {
                  id: "details",
                  name: "Transaction Details",
                  icon: CreditCard,
                },
                { id: "attributes", name: "Attributes", icon: Settings },
                { id: "endpoints", name: "Endpoint Data", icon: Route },
                { id: "graylog", name: "GrayLog Messages", icon: FileText },
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

          {/* Tab Content */}
          <div className="flex-1 min-w-0 overflow-hidden min-h-0">
            {/* Transaction Details Tab */}
            {activeTab === "details" && (
              <TransactionDetailsTab
                transaction={transaction}
                onCopy={(data: string) => navigator.clipboard.writeText(data)}
                onExport={(data: any, format: any) =>
                  exportTabData(data, format, "transaction-details")
                }
              />
            )}

            {/* Transaction Attributes Tab */}
            {activeTab === "attributes" && (
              <DataTab
                data={transactionDetails.attributes}
                loading={isLoading}
                title="Attributes"
                icon={Settings}
                onCopy={(data: string) => navigator.clipboard.writeText(data)}
                onExport={(data: any, format: any) =>
                  exportTabData(data, format, "transaction-attributes")
                }
              />
            )}

            {/* Transaction Endpoints Tab */}
            {activeTab === "endpoints" && (
              <DataTab
                data={transactionDetails.endpoints}
                loading={isLoading}
                title="Endpoint Data"
                icon={Route}
                onCopy={(data: string) => navigator.clipboard.writeText(data)}
                onExport={(data: any, format: any) =>
                  exportTabData(data, format, "transaction-endpoints")
                }
              />
            )}

            {/* GrayLog Messages Tab */}
            {activeTab === "graylog" && (
              <GrayLogMessagesTab
                data={transactionDetails.graylog}
                loading={isLoading}
                error={transactionDetails.graylogError}
                onCopy={(data: string) => navigator.clipboard.writeText(data)}
                onExport={(data: any, format: any) =>
                  exportTabData(data, format, "graylog-messages")
                }
              />
            )}

            {/* Raw JSON Tab */}
            {activeTab === "rawjson" && (
              <RawJsonTab
                transaction={transaction}
                attributes={transactionDetails.attributes}
                endpoints={transactionDetails.endpoints}
                graylog={transactionDetails.graylog}
                onCopy={(data: string) => navigator.clipboard.writeText(data)}
                onExport={(data: any, format: any) =>
                  exportTabData(data, format, "raw-json")
                }
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
