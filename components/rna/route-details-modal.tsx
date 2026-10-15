"use client";

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
import { Activity, Copy, Search, Check } from "lucide-react";
import type { BinRoutingRoute } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface RouteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: BinRoutingRoute | null;
}

export function RouteDetailsModal({
  isOpen,
  onClose,
  route,
}: RouteDetailsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const rows = route
    ? Object.entries(route).filter(
        ([k, v]) =>
          k.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(v).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const exportData = (format: "json" | "csv" | "txt") => {
    if (!route) return;
    let content = "";
    let mime = "";
    let ext = "";
    if (format === "json") {
      content = JSON.stringify(route, null, 2);
      mime = "application/json";
      ext = "json";
    } else if (format === "csv") {
      const header = "field,value";
      const body = Object.entries(route)
        .map(([k, v]) => `"${k}","${String(v).replaceAll('"', '""')}"`)
        .join("\n");
      content = `${header}\n${body}`;
      mime = "text/csv";
      ext = "csv";
    } else {
      content = Object.entries(route)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join("\n");
      mime = "text/plain";
      ext = "txt";
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `route-${route.id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCell = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 1200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-32px)] h-[calc(100vh-32px)] max-w-none max-h-none overflow-hidden rounded-3xl border-0 shadow-2xl p-0 mx-auto flex flex-col">
        <DialogHeader className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-3">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-800">
                Route Details
              </DialogTitle>
              {route && (
                <p className="text-sm text-gray-500 mt-1">
                  Route ID: {route.id} • Acquirer:{" "}
                  {String((route as any).acq_name ?? "")} • Issuer:{" "}
                  {String((route as any).iss_name ?? "")}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-w-0 overflow-hidden p-4">
          <Card className="h-full border border-gray-200 rounded-xl shadow-sm flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search route fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 w-64 rounded-lg border-gray-300"
                  />
                </div>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 rounded-full"
                >
                  {rows.length} fields
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      rows.map(([k, v]) => `${k}: ${String(v)}`).join("\n")
                    );
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
                <Select onValueChange={(fmt) => exportData(fmt as any)}>
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
            <CardContent className="p-0 flex-1 overflow-auto">
              <div className="border border-gray-200 rounded-lg overflow-hidden m-4">
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
                      {rows.map(([key, value], idx) => {
                        const id = `route-cell-${idx}`;
                        const isCopied = copiedCell === id;
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                              {key}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-gray-800 border-r border-gray-200 cursor-context-menu transition-colors ${
                                isCopied ? "bg-green-50" : ""
                              }`}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                copyCell(String(value), id);
                              }}
                              title="Right-click to copy"
                            >
                              <div className="flex items-center space-x-2">
                                {key === "id" || key.endsWith("_id") ? (
                                  <div className="font-mono bg-gray-50 px-2 py-1 rounded-md text-xs">
                                    {String(value)}
                                  </div>
                                ) : (
                                  <span className="break-all">
                                    {String(value)}
                                  </span>
                                )}
                                {isCopied && (
                                  <Badge className="bg-green-100 text-green-700 text-xs animate-in fade-in rounded-full">
                                    Copied!
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyCell(String(value), id)}
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
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
