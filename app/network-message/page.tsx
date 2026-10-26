"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Copy,
  Trash2,
  Send,
  Database,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Terminal,
  Folder,
  FolderOpen,
  Plus,
  Loader2,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sidebar } from "@/components/layout/sidebar";
import {
  rnaApi,
  type NetworkPacket,
  type CreatePacketRequest,
  type TrafficLog,
  type ConnectionLog,
  type StressTestSnapshot,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type ProtocolType = "TCP" | "UDP" | "HTTP" | "HTTPS" | string;

interface FolderGroup {
  folder: string;
  items: NetworkPacket[];
}

function asciiToHex(ascii: string) {
  return Array.from(ascii)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
}

function cleanHex(s: string) {
  return s.replace(/\s+/g, "").replace(/0x/gi, "");
}

function hexToAscii(hex: string) {
  const cleaned = cleanHex(hex);
  if (cleaned.length % 2 !== 0) return "";
  const bytes = cleaned.match(/.{1,2}/g) || [];
  return bytes.map((b) => String.fromCharCode(Number.parseInt(b, 16))).join("");
}

// ISO8583 Field Definitions
const ISO8583_FIELDS: Record<
  number,
  { type: "fixed" | "llvar" | "lllvar"; len?: number; max_len?: number }
> = {
  2: { type: "llvar", max_len: 19 },
  3: { type: "fixed", len: 6 },
  4: { type: "fixed", len: 12 },
  5: { type: "fixed", len: 12 },
  6: { type: "fixed", len: 12 },
  7: { type: "fixed", len: 10 },
  8: { type: "fixed", len: 8 },
  9: { type: "fixed", len: 8 },
  10: { type: "fixed", len: 8 },
  11: { type: "fixed", len: 6 },
  12: { type: "fixed", len: 6 },
  13: { type: "fixed", len: 4 },
  14: { type: "fixed", len: 4 },
  15: { type: "fixed", len: 4 },
  16: { type: "fixed", len: 4 },
  17: { type: "fixed", len: 4 },
  18: { type: "fixed", len: 4 },
  19: { type: "fixed", len: 3 },
  20: { type: "fixed", len: 3 },
  21: { type: "fixed", len: 3 },
  22: { type: "fixed", len: 3 },
  23: { type: "fixed", len: 3 },
  24: { type: "fixed", len: 3 },
  25: { type: "fixed", len: 2 },
  26: { type: "fixed", len: 2 },
  27: { type: "fixed", len: 1 },
  28: { type: "fixed", len: 9 },
  29: { type: "fixed", len: 9 },
  30: { type: "fixed", len: 9 },
  31: { type: "fixed", len: 9 },
  32: { type: "llvar", max_len: 11 },
  33: { type: "llvar", max_len: 11 },
  34: { type: "llvar", max_len: 28 },
  35: { type: "llvar", max_len: 37 },
  36: { type: "lllvar", max_len: 104 },
  37: { type: "fixed", len: 12 },
  38: { type: "fixed", len: 6 },
  39: { type: "fixed", len: 2 },
  40: { type: "fixed", len: 3 },
  41: { type: "fixed", len: 8 },
  42: { type: "fixed", len: 15 },
  43: { type: "fixed", len: 40 },
  44: { type: "llvar", max_len: 25 },
  45: { type: "llvar", max_len: 76 },
  46: { type: "lllvar", max_len: 999 },
  47: { type: "lllvar", max_len: 999 },
  48: { type: "lllvar", max_len: 999 },
  49: { type: "fixed", len: 3 },
  50: { type: "fixed", len: 3 },
  51: { type: "fixed", len: 3 },
  52: { type: "fixed", len: 8 },
  53: { type: "fixed", len: 16 },
  54: { type: "lllvar", max_len: 120 },
  55: { type: "lllvar", max_len: 999 },
  56: { type: "lllvar", max_len: 999 },
  57: { type: "lllvar", max_len: 999 },
  58: { type: "lllvar", max_len: 999 },
  59: { type: "lllvar", max_len: 999 },
  60: { type: "lllvar", max_len: 999 },
  61: { type: "lllvar", max_len: 999 },
  62: { type: "lllvar", max_len: 999 },
  63: { type: "lllvar", max_len: 999 },
  64: { type: "fixed", len: 8 },
};

// Convert hex string to binary string
function hexStringToBinary(hex: string): string {
  return hex
    .split("")
    .map((h) => Number.parseInt(h, 16).toString(2).padStart(4, "0"))
    .join("");
}

// Parse ISO8583 message from ASCII
function parseISO8583Ascii(msg: string): {
  mti: string;
  bitmapHex: string;
  secBitmap: string;
  dataElements: Record<number, string>;
  /** Encoded span in the raw message, including LLVAR/LLLVAR length prefix. */
  ranges: Record<number, { start: number; end: number }>;
} | null {
  if (!msg || msg.length < 20) return null;

  let idx = 0;

  // Parse MTI (first 4 chars)
  const mti = msg.substring(idx, idx + 4);
  idx += 4;

  // Parse primary bitmap (16 hex chars = 64 bits)
  const bitmapHex = msg.substring(idx, idx + 16);
  idx += 16;
  let bitmapBin = hexStringToBinary(bitmapHex);

  // Check if secondary bitmap exists (bit 0 of primary bitmap)
  let secBitmap = "";
  if (bitmapBin[0] === "1") {
    secBitmap = msg.substring(idx, idx + 16);
    idx += 16;
    bitmapBin += hexStringToBinary(secBitmap);
  }

  // Parse data elements based on bitmap
  const dataElements: Record<number, string> = {};
  const ranges: Record<number, { start: number; end: number }> = {};

  for (let i = 1; i < bitmapBin.length; i++) {
    if (bitmapBin[i] !== "1") continue;

    const fieldNo = i + 1;
    const spec = ISO8583_FIELDS[fieldNo];
    // Unknown layout would desync the rest of the message. Stop here.
    if (!spec) break;

    const start = idx;
    if (spec.type === "fixed") {
      if (idx + spec.len! > msg.length) break;
      const val = msg.substring(idx, idx + spec.len!);
      dataElements[fieldNo] = val;
      idx += spec.len!;
    } else if (spec.type === "llvar") {
      if (idx + 2 > msg.length) break;
      const len = Number.parseInt(msg.substring(idx, idx + 2), 10);
      if (!Number.isFinite(len) || idx + 2 + len > msg.length) break;
      const val = msg.substring(idx + 2, idx + 2 + len);
      idx += 2 + len;
      dataElements[fieldNo] = val;
    } else if (spec.type === "lllvar") {
      if (idx + 3 > msg.length) break;
      const len = Number.parseInt(msg.substring(idx, idx + 3), 10);
      if (!Number.isFinite(len) || idx + 3 + len > msg.length) break;
      const val = msg.substring(idx + 3, idx + 3 + len);
      idx += 3 + len;
      dataElements[fieldNo] = val;
    }
    ranges[fieldNo] = { start, end: idx };
  }

  return { mti, bitmapHex, secBitmap, dataElements, ranges };
}

function encodeIsoField(fieldNo: number, value: string): string | null {
  const spec = ISO8583_FIELDS[fieldNo];
  if (!spec) return null;
  if (spec.type === "fixed") {
    const len = spec.len ?? 0;
    let val = value ?? "";
    if (val.length > len) val = val.slice(0, len);
    else if (val.length < len) {
      val = /^\d*$/.test(val) ? val.padStart(len, "0") : val.padEnd(len, " ");
    }
    return val;
  }
  if (spec.type === "llvar") {
    const max = spec.max_len ?? 99;
    let val = value ?? "";
    if (val.length > max) val = val.slice(0, max);
    return String(val.length).padStart(2, "0") + val;
  }
  const max = spec.max_len ?? 999;
  let val = value ?? "";
  if (val.length > max) val = val.slice(0, max);
  return String(val.length).padStart(3, "0") + val;
}

/** Replace one DE in the original ASCII message. Other fields and the bitmap stay intact. */
function replaceIsoField(msg: string, fieldNo: number, value: string): string | null {
  const parsed = parseISO8583Ascii(msg);
  if (!parsed) return null;
  const range = parsed.ranges[fieldNo];
  if (!range) return null;
  const encoded = encodeIsoField(fieldNo, value);
  if (encoded == null) return null;
  return msg.slice(0, range.start) + encoded + msg.slice(range.end);
}

// Parse ISO8583 preview from ASCII or HEX
function parseIso8583Preview(
  fromAscii: string,
  fromHex: string
): Array<{ field: string; value: string }> {
  const preview: Array<{ field: string; value: string }> = [];

  // Prefer ASCII if available, else convert HEX to ASCII
  let ascii = fromAscii?.trim() || "";
  if (!ascii && fromHex) {
    ascii = hexToAscii(fromHex);
  }

  if (!ascii || ascii.length < 20) {
    return preview;
  }

  try {
    const parsed = parseISO8583Ascii(ascii);
    if (!parsed) {
      return preview;
    }

    // Add MTI
    preview.push({ field: "MTI", value: parsed.mti });

    // Add Bitmap
    const bitmapDisplay = parsed.secBitmap
      ? `${parsed.bitmapHex} ${parsed.secBitmap}`
      : parsed.bitmapHex;
    preview.push({ field: "Bitmap", value: bitmapDisplay });

    // Add data elements in field number order
    const fieldNumbers = Object.keys(parsed.dataElements)
      .map(Number)
      .sort((a, b) => a - b);

    for (const fieldNo of fieldNumbers) {
      const value = parsed.dataElements[fieldNo];
      preview.push({ field: `DE${String(fieldNo).padStart(3, "0")}`, value });
    }
  } catch (error) {
    // If parsing fails, return empty preview
    console.error("ISO8583 parsing error:", error);
  }

  return preview;
}

function downloadStressReport(job: StressTestSnapshot) {
  const rows = job.rows || [];
  const header = "waktu,stan,rrn,jenis_transaksi,hasil,latency_ms";
  const lines = rows.map((row) =>
    [row.time, row.stan, row.rrn, row.transaction_type, row.success ? "sukses" : "gagal", String(row.latency_ms)]
      .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stress-test-${job.job_id.slice(0, 8)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatStressTps(job: StressTestSnapshot) {
  const tps =
    typeof job.tps === "number"
      ? job.tps
      : job.elapsed_ms > 0
        ? job.success_count / (job.elapsed_ms / 1000)
        : 0;
  return tps.toFixed(2);
}

export default function NetworkMessagePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState(pathname);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStressDialog, setShowStressDialog] = useState(false);
  const [stressMode, setStressMode] = useState<"count" | "duration">("count");
  const [stressCount, setStressCount] = useState(20);
  const [stressDuration, setStressDuration] = useState(60);
  const [stressConcurrency, setStressConcurrency] = useState(5);
  const [stressDelay, setStressDelay] = useState(0);
  const [incrementStan, setIncrementStan] = useState(true);
  const [stressJob, setStressJob] = useState<StressTestSnapshot | null>(null);
  const [stressRunning, setStressRunning] = useState(false);
  const stressSummaryLogged = useRef<string | null>(null);

  // Data state
  const [packets, setPackets] = useState<NetworkPacket[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isNewPacket, setIsNewPacket] = useState(false);
  const [trafficLogs, setTrafficLogs] = useState<TrafficLog[]>([]);
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([]);

  // Sidebar state
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});

  // Fetch packets on mount and when search changes
  useEffect(() => {
    loadPackets();
  }, []);

  const loadPackets = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (searchTerm.trim()) {
        response = await rnaApi.searchPackets(searchTerm.trim());
      } else {
        response = await rnaApi.getAllPackets();
      }

      if (response.success && response.data) {
        const packetData = "data" in response.data ? response.data.data : [];
        setPackets(packetData);
        // Auto-select first packet if none selected
        if (packetData.length > 0) {
          setSelectedId((prev) => prev || packetData[0].id);
        }
        // Expand all folders by default
        const allFolders = new Set(
          packetData.map((p) => p.folder || "Default")
        );
        const expanded: Record<string, boolean> = {};
        allFolders.forEach((folder) => {
          expanded[folder] = true;
        });
        setExpandedFolders(expanded);
      } else {
        setError(response.error || "Failed to load packets");
        toast({
          title: "Error",
          description: response.error || "Failed to load packets",
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load packets";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reload when search term changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPackets();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Form fields
  const selected = useMemo(
    () =>
      isNewPacket ? null : packets.find((p) => p.id === selectedId) || null,
    [packets, selectedId, isNewPacket]
  );
  const [name, setName] = useState("");
  const [protocol, setProtocol] = useState<string>("TCP");
  const [address, setAddress] = useState("10.132.130.26");
  const [port, setPort] = useState<number>(6670);
  const [folder, setFolder] = useState<string>("SIT");
  const [packetId, setPacketId] = useState<number>(0);
  const [ascii, setAscii] = useState<string>("");
  const [hex, setHex] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [deDrafts, setDeDrafts] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"detail" | "logs">("detail");

  // Update form fields when selected packet changes
  useEffect(() => {
    if (selected && !isNewPacket) {
      setName(selected.name);
      setProtocol(selected.protocol);
      setAddress(selected.address);
      setPort(selected.port);
      setFolder(selected.folder || "Default");
      setPacketId(selected.id);
      setAscii(selected.ascii || "");
      setHex(selected.hex || "");
      setComment(selected.comment || "");
      setDeDrafts({});
      // Clear logs when selecting a different packet
      setTrafficLogs([]);
      setConnectionLogs([]);
    } else if (isNewPacket) {
      // Reset form for new packet with default values
      setName("");
      setProtocol("TCP");
      setAddress("10.132.130.26");
      setPort(6670);
      setFolder("SIT");
      setPacketId(0);
      setAscii("");
      setHex("");
      setComment("");
      setDeDrafts({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, isNewPacket]);

  // Organize packets by folder directly
  const folderGroups: FolderGroup[] = useMemo(() => {
    const byFolder: Record<string, NetworkPacket[]> = {};

    packets.forEach((p) => {
      const folderName = p.folder || "Default";
      if (!byFolder[folderName]) {
        byFolder[folderName] = [];
      }
      byFolder[folderName].push(p);
    });

    return Object.keys(byFolder)
      .sort()
      .map((folderName) => ({
        folder: folderName,
        items: byFolder[folderName].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
  }, [packets]);

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
      setActiveSection(href);
    },
    [router]
  );

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const onConvertAsciiToHex = () => {
    try {
      const hx = asciiToHex(ascii);
      setHex(hx);
      setError(null);
    } catch {
      setError("Failed to convert ASCII to HEX.");
    }
  };

  const onConvertHexToAscii = () => {
    try {
      const asc = hexToAscii(hex);
      setAscii(asc);
      setError(null);
    } catch {
      setError("Failed to convert HEX to ASCII.");
    }
  };

  const onSave = async () => {
    if (!selectedId) return;

    setSaving(true);
    setError(null);
    try {
      const response = await rnaApi.updatePacket(packetId, {
        name,
        protocol,
        address,
        port,
        folder: folder || "Default",
        hex: hex || "",
        ascii: ascii || "",
        comment: comment || "",
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Packet updated successfully",
        });
        await loadPackets();
      } else {
        setError(response.error || "Failed to update packet");
        toast({
          title: "Error",
          description: response.error || "Failed to update packet",
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update packet";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    if (!selected) return;
    setName(selected.name);
    setProtocol(selected.protocol);
    setAddress(selected.address);
    setPort(selected.port);
    setFolder(selected.folder || "Default");
    setPacketId(selected.id);
    setAscii(selected.ascii || "");
    setHex(selected.hex || "");
    setComment(selected.comment || "");
  };

  const onCreateNew = () => {
    // Create a new temporary packet card
    setIsNewPacket(true);
    setSelectedId(null);
    // Reset form fields with default values
    setName("");
    setProtocol("TCP");
    setAddress("10.132.130.26");
    setPort(6670);
    setFolder("SIT");
    setPacketId(0);
    setAscii("");
    setHex("");
    setComment("");
    // Clear logs
    setTrafficLogs([]);
    setConnectionLogs([]);
  };

  const sendPacketToServer = async (packetId?: number) => {
    setSaving(true);
    setError(null);

    // Clear logs before sending
    setTrafficLogs([]);
    setConnectionLogs([]);

    try {
      let response;

      // Determine which endpoint to use based on whether we have a packet ID
      const targetId = packetId || selectedId;

      if (targetId) {
        // Use sendPacketById endpoint when we have a packet ID
        // This endpoint loads the packet from the database and sends it
        response = await rnaApi.sendPacketById(targetId, false);
      } else {
        // Use general send endpoint for new packets or when no ID is available
        // This requires all packet data in the request body
        response = await rnaApi.sendPacket({
          packet: {
            hex: hex || "",
            address: address,
            port: port,
            protocol: protocol,
            ascii: ascii || "",
          },
          persistentTcp: false,
        });
      }

      if (response.success && response.data) {
        toast({
          title: "Success",
          description: "Packet sent successfully",
        });

        // Extract logs from response according to API guide
        // Logs can be at root level (trafficLogs, connectionLogs) or in data object
        // API response structure: { success, message, trafficLogs, connectionLogs, data: { trafficLogs, connectionLogs } }
        const sendResponse = response.data;
        const trafficLogsFromResponse =
          sendResponse.trafficLogs || sendResponse.data?.trafficLogs || [];
        const connectionLogsFromResponse =
          sendResponse.connectionLogs ||
          sendResponse.data?.connectionLogs ||
          [];

        if (trafficLogsFromResponse.length > 0) {
          setTrafficLogs(trafficLogsFromResponse);
        }
        if (connectionLogsFromResponse.length > 0) {
          setConnectionLogs(connectionLogsFromResponse);
        }

        // Switch to logs tab to show the results
        setActiveTab("logs");
      } else {
        const errorMessage =
          response.error || response.data?.error || "Failed to send packet";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send packet";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper function to check if there are changes
  const hasChanges = (): boolean => {
    if (isNewPacket) return true; // New packet always has changes
    if (!selected) return false; // No selected packet, no changes

    // Compare current form values with selected packet
    return (
      name !== selected.name ||
      protocol !== selected.protocol ||
      address !== selected.address ||
      port !== selected.port ||
      folder !== (selected.folder || "Default") ||
      hex !== (selected.hex || "") ||
      ascii !== (selected.ascii || "") ||
      comment !== (selected.comment || "")
    );
  };

  const onSend = async () => {
    const needsSave = isNewPacket || hasChanges();

    if (needsSave) {
      // New packet or has changes - save/update first, then send
      if (isNewPacket) {
        // Check if name already exists
        const nameExists = packets.some(
          (p) => p.name === name && name.trim() !== ""
        );
        if (nameExists) {
          toast({
            title: "Error",
            description:
              "A packet with this name already exists. Please use a different name.",
            variant: "destructive",
          });
          return;
        }

        // Validate required fields
        if (!name || !address || !port || !protocol) {
          toast({
            title: "Validation Error",
            description:
              "Please fill in all required fields (Name, Address, Port, Protocol)",
            variant: "destructive",
          });
          return;
        }

        setSaving(true);
        setError(null);
        try {
          const response = await rnaApi.createPacket({
            name,
            protocol,
            address,
            port,
            folder: folder || "Default",
            hex: hex || "",
            ascii: ascii || "",
            comment: comment || "",
          });

          if (response.success && response.data) {
            const packetId = response.data.packet_id;
            setIsNewPacket(false);
            await loadPackets();
            if (packetId) {
              setSelectedId(packetId);
              // Now send the packet
              await sendPacketToServer(packetId);
            }
          } else {
            setError(response.error || "Failed to create packet");
            toast({
              title: "Error",
              description: response.error || "Failed to create packet",
              variant: "destructive",
            });
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to create packet";
          setError(errorMessage);
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setSaving(false);
        }
      } else {
        // Existing packet with changes - update first, then send
        if (!selectedId) return;

        setSaving(true);
        setError(null);
        try {
          const response = await rnaApi.updatePacket(selectedId, {
            name,
            protocol,
            address,
            port,
            folder: folder || "Default",
            hex: hex || "",
            ascii: ascii || "",
            comment: comment || "",
          });

          if (response.success) {
            toast({
              title: "Success",
              description: "Packet updated successfully",
            });
            await loadPackets();
            // Now send the packet
            await sendPacketToServer(selectedId);
          } else {
            setError(response.error || "Failed to update packet");
            toast({
              title: "Error",
              description: response.error || "Failed to update packet",
              variant: "destructive",
            });
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to update packet";
          setError(errorMessage);
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setSaving(false);
        }
      }
    } else {
      // No changes - send directly
      await sendPacketToServer();
    }
  };

  const stressJobId = stressJob?.job_id;
  const stressStatus = stressJob?.status;

  const appendStressSummary = useCallback((snapshot: StressTestSnapshot) => {
    if (snapshot.status === "running") return;
    if (stressSummaryLogged.current === snapshot.job_id) return;
    stressSummaryLogged.current = snapshot.job_id;
    setStressRunning(false);
    setConnectionLogs((prev) => [
      {
        id: Date.now(),
        time: new Date().toISOString(),
        connectionId: `STRESS-${snapshot.job_id.slice(0, 8)}`,
        status: "INFO",
        protocol: snapshot.protocol,
        localAddress: "",
        remoteAddress: snapshot.target,
        details: "",
        duration: `${Math.round(snapshot.elapsed_ms)} ms`,
        packet_id: selectedId || 0,
        message:
          snapshot.mode === "duration"
            ? `Stress test ${snapshot.status}: ${snapshot.success_count} sukses, gagal ${snapshot.fail_count}, ${snapshot.completed} request dalam ${Math.round(snapshot.elapsed_ms / 1000)}/${snapshot.duration_sec} dtk, avg ${snapshot.latency_ms.avg} ms, ${formatStressTps(snapshot)} TPS`
            : `Stress test ${snapshot.status}: ${snapshot.success_count}/${snapshot.total} sukses, gagal ${snapshot.fail_count}, avg ${snapshot.latency_ms.avg} ms, ${formatStressTps(snapshot)} TPS`,
      },
      ...prev,
    ]);
  }, [selectedId]);

  useEffect(() => {
    if (!stressJobId || stressStatus !== "running") return;

    const timer = window.setInterval(async () => {
      const response = await rnaApi.getNetworkStressTest(stressJobId);
      const snapshot = response.success ? response.data?.data : undefined;
      if (!snapshot) return;
      setStressJob(snapshot);
      appendStressSummary(snapshot);
    }, 700);

    return () => window.clearInterval(timer);
  }, [stressJobId, stressStatus, appendStressSummary]);

  const onStartStress = async () => {
    if (!address || !port || !protocol || (!hex.trim() && !ascii.trim())) {
      toast({
        title: "Validasi",
        description: "Isi address, port, protocol, dan payload ASCII atau HEX.",
        variant: "destructive",
      });
      return;
    }

    const count = Math.min(200, Math.max(1, Number(stressCount) || 1));
    const durationSec = Math.min(600, Math.max(1, Number(stressDuration) || 60));
    const concurrencyCap = stressMode === "duration" ? 10 : Math.min(10, count);
    const concurrency = Math.min(concurrencyCap, Math.max(1, Number(stressConcurrency) || 1));
    const delayMs = Math.min(2000, Math.max(0, Number(stressDelay) || 0));
    setStressCount(count);
    setStressDuration(durationSec);
    setStressConcurrency(concurrency);
    setStressDelay(delayMs);
    setStressRunning(true);
    setStressJob(null);
    stressSummaryLogged.current = null;

    const response = await rnaApi.startNetworkStressTest({
      packet_id: selectedId || undefined,
      packet: {
        hex: hex || "",
        ascii: ascii || "",
        address,
        port,
        protocol,
      },
      mode: stressMode,
      count,
      duration_sec: durationSec,
      concurrency,
      delay_ms: delayMs,
      increment_stan: incrementStan,
    });

    const snapshot = response.success ? response.data?.data : undefined;
    if (!snapshot) {
      setStressRunning(false);
      toast({
        title: "Stress test gagal dimulai",
        description: response.error || "Tidak dapat memulai stress test",
        variant: "destructive",
      });
      return;
    }
    setStressJob(snapshot);
    appendStressSummary(snapshot);
  };

  const onStopStress = async () => {
    if (!stressJob?.job_id) return;
    const response = await rnaApi.stopNetworkStressTest(stressJob.job_id);
    const snapshot = response.success ? response.data?.data : undefined;
    if (snapshot) setStressJob(snapshot);
  };

  const onDelete = () => {
    if (selectedId == null) return;
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (selectedId == null) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await rnaApi.deletePacket(selectedId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Packet deleted successfully",
        });
        setSelectedId(null);
        setIsNewPacket(false);
        setShowDeleteDialog(false);
        await loadPackets();
      } else {
        setError(response.error || "Failed to delete packet");
        toast({
          title: "Error",
          description: response.error || "Failed to delete packet",
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete packet";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const isoPreview = useMemo(
    () => parseIso8583Preview(ascii, hex),
    [ascii, hex]
  );

  const applyIsoFieldEdit = (field: string, rawValue: string) => {
    const source = ascii.trim() || (hex.trim() ? hexToAscii(hex) : "");
    const parsed = parseISO8583Ascii(source);
    if (!parsed) {
      toast({
        title: "Tidak dapat mengubah field",
        description: "Payload ISO8583 tidak bisa diparse.",
        variant: "destructive",
      });
      return;
    }

    let next: string | null = null;
    if (field === "MTI") {
      const mti = rawValue.replace(/\D/g, "").padStart(4, "0").slice(-4);
      next = mti + source.slice(4);
    } else if (/^DE\d{3}$/.test(field)) {
      const fieldNo = Number.parseInt(field.slice(2), 10);
      if (!rawValue.trim()) {
        toast({
          title: "Nilai DE kosong",
          description: "Isi nilai DE. Field yang sudah ada tidak dihapus dari bitmap.",
          variant: "destructive",
        });
        return;
      }
      next = replaceIsoField(source, fieldNo, rawValue);
      if (!next) {
        toast({
          title: "Tidak dapat mengubah DE",
          description: `Posisi ${field} tidak ditemukan di payload.`,
          variant: "destructive",
        });
        return;
      }
    }
    if (!next) return;
    setAscii(next);
    setHex(asciiToHex(next));
    setDeDrafts((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />
        <div className="flex-1 max-w-full overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Jalin App</span>
              <span>/</span>
              <span className="text-gray-800 font-medium">Network Message</span>
            </div>
          </div>

          <div className="p-6 max-w-full">
            {/* Hero */}
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                Network Message
              </h1>
              <p className="text-gray-600">
                Manage and send test packets. Edit ASCII/HEX payloads and
                preview parsed ISO8583 fields.
              </p>
            </div>

            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-6">
              {/* Left: Message list */}
              <Card className="w-96 shadow-sm border-0 bg-white rounded-3xl flex-shrink-0">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Messages
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCreateNew}
                      className="rounded-2xl bg-transparent"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search messages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200 text-sm"
                    />
                  </div>

                  <ScrollArea className="h-full">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      </div>
                    ) : folderGroups.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          No packets found
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* New Packet Card */}
                        {isNewPacket && (
                          <div
                            onClick={() => setIsNewPacket(true)}
                            className="flex items-start gap-3 p-3 cursor-pointer transition-colors bg-blue-50 border-2 border-blue-300 border-dashed rounded-2xl"
                          >
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 bg-blue-500" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-blue-700 leading-tight break-words">
                                New Packet
                              </div>
                              <div className="text-xs text-blue-500 mt-0.5">
                                Click to edit
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs flex-shrink-0 mt-0.5 border-blue-300 text-blue-700"
                            >
                              New
                            </Badge>
                          </div>
                        )}
                        {folderGroups.map((folderGroup) => {
                          const isFolderExpanded =
                            expandedFolders[folderGroup.folder];
                          return (
                            <div
                              key={folderGroup.folder}
                              className="border border-gray-200 rounded-2xl overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => toggleFolder(folderGroup.folder)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                              >
                                <span
                                  className="text-sm font-semibold text-gray-700 truncate flex-1 min-w-0 text-left"
                                  title={folderGroup.folder}
                                >
                                  {folderGroup.folder}
                                </span>
                                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                  {isFolderExpanded ? "Hide" : "Show"}
                                </span>
                              </button>
                              {isFolderExpanded && (
                                <div className="divide-y divide-gray-100">
                                  {folderGroup.items.map((item) => {
                                    const active = item.id === selectedId;
                                    return (
                                      <div
                                        key={item.id}
                                        onClick={() => {
                                          setSelectedId(item.id);
                                          setIsNewPacket(false);
                                        }}
                                        className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                                          active
                                            ? "bg-blue-50"
                                            : "hover:bg-gray-50"
                                        }`}
                                      >
                                        <div
                                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${
                                            active
                                              ? "bg-blue-500"
                                              : "bg-gray-400"
                                          }`}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div
                                            className="text-sm font-medium text-gray-700 leading-tight break-words"
                                            title={item.name}
                                          >
                                            {item.name}
                                          </div>
                                          <div
                                            className="text-xs text-gray-500 mt-0.5 truncate"
                                            title={`${item.address}:${item.port}`}
                                          >
                                            {item.address}:{item.port}
                                          </div>
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className="text-xs flex-shrink-0 mt-0.5"
                                        >
                                          {item.protocol}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Right: Detail */}
              <div className="flex-1 min-w-0">
                <Card className="shadow-sm border-0 bg-white rounded-3xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-blue-600" />
                      {isNewPacket ? "New Packet" : name || "Untitled Packet"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      {!isNewPacket && (
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{protocol}</Badge>
                          <Badge
                            variant="outline"
                            className="text-gray-600"
                          >{`${address}:${port}`}</Badge>
                          <span className="text-sm text-gray-500">
                            {folder}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowStressDialog(true)}
                          disabled={saving}
                          className="rounded-2xl"
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          {stressRunning ? "Stress Test..." : "Stress Test"}
                        </Button>
                        <Button
                          onClick={onSend}
                          disabled={saving}
                          className="bg-green-600 hover:bg-green-700 rounded-2xl"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              {isNewPacket ? "Save" : "Send"}
                            </>
                          )}
                        </Button>
                        {!isNewPacket && (
                          <Button
                            variant="outline"
                            onClick={onDelete}
                            disabled={deleting || !selectedId}
                            className="text-red-600 border-red-200 hover:bg-red-50 rounded-2xl bg-transparent"
                          >
                            {deleting ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-6 flex space-x-1">
                      <Button
                        size="sm"
                        variant={activeTab === "detail" ? "default" : "ghost"}
                        onClick={() => setActiveTab("detail")}
                        className={`rounded-2xl ${
                          activeTab === "detail"
                            ? "bg-blue-600 hover:bg-blue-700"
                            : ""
                        }`}
                      >
                        Saved Packet Detail
                      </Button>
                      <Button
                        size="sm"
                        variant={activeTab === "logs" ? "default" : "ghost"}
                        onClick={() => setActiveTab("logs")}
                        className={`rounded-2xl ${
                          activeTab === "logs"
                            ? "bg-blue-600 hover:bg-blue-700"
                            : ""
                        }`}
                      >
                        Logs
                      </Button>
                    </div>

                    {activeTab === "detail" ? (
                      <div className="mt-6 space-y-6">
                        {/* Row: Name / Protocol / Port */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Name
                            </Label>
                            <Input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Packet name"
                              className="rounded-2xl"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Protocol
                            </Label>
                            <Select
                              value={protocol}
                              onValueChange={(v: string) => setProtocol(v)}
                            >
                              <SelectTrigger className="rounded-2xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TCP">TCP</SelectItem>
                                <SelectItem value="UDP">UDP</SelectItem>
                                <SelectItem value="HTTP">HTTP</SelectItem>
                                <SelectItem value="HTTPS">HTTPS</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Port
                            </Label>
                            <Input
                              type="number"
                              value={port}
                              onChange={(e) => setPort(Number(e.target.value))}
                              className="rounded-2xl"
                            />
                          </div>
                        </div>

                        {/* Row: Address / Folder */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Address
                            </Label>
                            <Input
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="10.132.130.26"
                              className="rounded-2xl"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Folder
                            </Label>
                            <Input
                              value={folder}
                              onChange={(e) => setFolder(e.target.value)}
                              placeholder="SIT"
                              className="rounded-2xl"
                            />
                          </div>
                        </div>

                        {/* ASCII */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium text-gray-700">
                              ASCII
                            </Label>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl bg-transparent"
                              onClick={onConvertAsciiToHex}
                            >
                              ASCII → HEX
                            </Button>
                          </div>
                          <Textarea
                            value={ascii}
                            onChange={(e) => setAscii(e.target.value)}
                            onBlur={() => {
                              if (ascii.trim()) {
                                try {
                                  const hx = asciiToHex(ascii);
                                  setHex(hx);
                                  setError(null);
                                } catch {
                                  // Silently fail on blur - don't show error
                                }
                              }
                            }}
                            rows={4}
                            className="font-mono text-sm rounded-2xl"
                            placeholder="Enter ASCII payload..."
                          />
                        </div>

                        {/* HEX */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium text-gray-700">
                              HEX
                            </Label>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl bg-transparent"
                              onClick={onConvertHexToAscii}
                            >
                              HEX → ASCII
                            </Button>
                          </div>
                          <Textarea
                            value={hex}
                            onChange={(e) => setHex(e.target.value)}
                            onBlur={() => {
                              if (hex.trim()) {
                                try {
                                  const asc = hexToAscii(hex);
                                  setAscii(asc);
                                  setError(null);
                                } catch {
                                  // Silently fail on blur - don't show error
                                }
                              }
                            }}
                            rows={6}
                            className="font-mono text-sm rounded-2xl"
                            placeholder="Enter HEX payload..."
                          />
                        </div>

                        {/* Comment */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Comment
                          </Label>
                          <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            className="rounded-2xl"
                            placeholder="Add a comment for this packet..."
                          />
                        </div>

                        {/* Actions */}
                        {!isNewPacket && (
                          <div className="flex items-center space-x-3">
                            <Button
                              onClick={onSave}
                              disabled={saving || !selectedId}
                              className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                            >
                              {saving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                "Save Changes"
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={onReset}
                              className="rounded-2xl bg-transparent"
                            >
                              Reset
                            </Button>
                          </div>
                        )}

                        {/* Parsed ISO8583 Preview */}
                        <div className="pt-4">
                          <h3 className="text-md font-semibold text-gray-800 mb-1">
                            Parsed ISO8583 Preview
                          </h3>
                          <p className="text-xs text-gray-500 mb-3">
                            Edit MTI atau DE, lalu keluar dari kolom. ASCII dan HEX ikut berubah sebelum dikirim.
                          </p>
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Field
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Value
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {isoPreview.length === 0 ? (
                                  <tr>
                                    <td
                                      className="px-4 py-3 text-sm text-gray-500"
                                      colSpan={2}
                                    >
                                      No preview available. Enter ASCII or HEX
                                      to preview.
                                    </td>
                                  </tr>
                                ) : (
                                  isoPreview.map((row, idx) => {
                                    const editable =
                                      row.field === "MTI" || /^DE\d{3}$/.test(row.field);
                                    const draft = deDrafts[row.field];
                                    return (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                          {row.field}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          {editable ? (
                                            <Input
                                              value={draft ?? row.value}
                                              onChange={(e) =>
                                                setDeDrafts((prev) => ({
                                                  ...prev,
                                                  [row.field]: e.target.value,
                                                }))
                                              }
                                              onBlur={(e) => {
                                                const next = e.target.value;
                                                if (next === row.value) {
                                                  setDeDrafts((prev) => {
                                                    const copy = { ...prev };
                                                    delete copy[row.field];
                                                    return copy;
                                                  });
                                                  return;
                                                }
                                                applyIsoFieldEdit(row.field, next);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  (e.target as HTMLInputElement).blur();
                                                }
                                              }}
                                              className="h-8 font-mono text-xs"
                                            />
                                          ) : (
                                            <span className="font-mono text-xs break-all">
                                              {row.value}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 space-y-6">
                        {/* Traffic Logs */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <Database className="h-5 w-5 text-blue-600" />
                              <h3 className="text-lg font-medium text-gray-800">
                                Traffic Logs
                              </h3>
                              <Badge
                                variant="secondary"
                                className="bg-blue-100 text-blue-700"
                              >
                                {trafficLogs.length}
                              </Badge>
                            </div>
                          </div>
                          {trafficLogs.length === 0 ? (
                            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                              <p className="text-sm text-gray-500 text-center">
                                No traffic logs yet. Send a packet to see logs
                                here.
                              </p>
                            </div>
                          ) : (
                            <div className="border border-gray-200 rounded-2xl overflow-hidden">
                              <div className="overflow-auto max-h-[400px]">
                                <table className="w-full">
                                  <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Time
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Type
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        From
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        To
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Method
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Data
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 bg-white">
                                    {trafficLogs.map((log) => (
                                      <tr
                                        key={log.id}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="px-4 py-2 text-xs text-gray-600">
                                          {new Date(
                                            log.time || log.created_at || ""
                                          ).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2">
                                          <Badge
                                            variant="outline"
                                            className={
                                              log.type === "OUT"
                                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                                : "bg-green-100 text-green-700 border-green-200"
                                            }
                                          >
                                            {log.type}
                                          </Badge>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-700 font-mono">
                                          {log.fromIP}:{log.fromPort}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-700 font-mono">
                                          {log.toAddress}:{log.toPort}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-700">
                                          {log.method}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-700 font-mono break-all max-w-md">
                                          {log.data}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Connection Logs */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <Terminal className="h-5 w-5 text-purple-600" />
                              <h3 className="text-lg font-medium text-gray-800">
                                Connection Logs
                              </h3>
                              <Badge
                                variant="secondary"
                                className="bg-purple-100 text-purple-700"
                              >
                                {connectionLogs.length}
                              </Badge>
                            </div>
                          </div>
                          {connectionLogs.length === 0 ? (
                            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                              <p className="text-sm text-gray-500 text-center">
                                No connection logs yet. Send a packet to see
                                logs here.
                              </p>
                            </div>
                          ) : (
                            <div className="border border-gray-200 rounded-2xl overflow-hidden">
                              <div className="overflow-auto max-h-[400px]">
                                <table className="w-full">
                                  <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Time
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Status
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Connection ID
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Protocol
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Local Address
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Remote Address
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                                        Message
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 bg-white">
                                    {connectionLogs.map((log) => (
                                      <tr
                                        key={log.id}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="px-4 py-2 text-xs text-gray-600">
                                          {new Date(
                                            log.time || log.created_at || ""
                                          ).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2">
                                          <Badge
                                            variant="outline"
                                            className={
                                              log.status === "ESTABLISHED"
                                                ? "bg-green-100 text-green-700 border-green-200"
                                                : log.status === "ESTABLISHING"
                                                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                                : log.status === "CLOSED"
                                                ? "bg-gray-100 text-gray-700 border-gray-200"
                                                : log.status === "FAILED"
                                                ? "bg-red-100 text-red-700 border-red-200"
                                                : log.status === "INFO"
                                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                                : "bg-gray-100 text-gray-700 border-gray-200"
                                            }
                                          >
                                            {log.status}
                                          </Badge>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-700 font-mono">
                                          {log.connectionId}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-700">
                                          {log.protocol}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-700 font-mono">
                                          {log.localAddress}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-700 font-mono">
                                          {log.remoteAddress}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-700 break-all max-w-md">
                                          {log.message}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showStressDialog} onOpenChange={setShowStressDialog}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Stress Test
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Mengirim payload saat ini berulang ke {address || "-"}:{port || "-"} ({protocol}).
              Mode jumlah berhenti setelah N request. Mode waktu mengirim terus sampai durasi habis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
              <Button
                type="button"
                variant={stressMode === "count" ? "default" : "ghost"}
                disabled={stressRunning}
                onClick={() => setStressMode("count")}
                className={`rounded-xl ${stressMode === "count" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              >
                Jumlah
              </Button>
              <Button
                type="button"
                variant={stressMode === "duration" ? "default" : "ghost"}
                disabled={stressRunning}
                onClick={() => setStressMode("duration")}
                className={`rounded-xl ${stressMode === "duration" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              >
                Waktu
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {stressMode === "duration" ? "Detik" : "Jumlah"}
                </Label>
                {stressMode === "duration" ? (
                  <Input
                    type="number"
                    min={1}
                    max={600}
                    value={stressDuration}
                    disabled={stressRunning}
                    onChange={(e) => setStressDuration(Number(e.target.value))}
                    className="rounded-2xl"
                  />
                ) : (
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={stressCount}
                    disabled={stressRunning}
                    onChange={(e) => setStressCount(Number(e.target.value))}
                    className="rounded-2xl"
                  />
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Konkuren
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={stressConcurrency}
                  disabled={stressRunning}
                  onChange={(e) => setStressConcurrency(Number(e.target.value))}
                  className="rounded-2xl"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Jeda (ms)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={2000}
                  value={stressDelay}
                  disabled={stressRunning}
                  onChange={(e) => setStressDelay(Number(e.target.value))}
                  className="rounded-2xl"
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="increment-stan"
                checked={incrementStan}
                disabled={stressRunning}
                onCheckedChange={(value) => setIncrementStan(value === true)}
              />
              <Label htmlFor="increment-stan" className="text-sm text-gray-700 leading-5">
                Naikkan STAN (DE11) dan RRN (DE37) pada tiap request ISO8583
              </Label>
            </div>

            {stressJob && (
              <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {stressJob.mode === "duration"
                      ? `${stressJob.completed} request · ${Math.min(stressJob.duration_sec, Math.round(stressJob.elapsed_ms / 1000))}/${stressJob.duration_sec} dtk`
                      : `${stressJob.completed}/${stressJob.total}`}
                    {" · "}
                    {stressJob.status}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {formatStressTps(stressJob)} TPS
                  </span>
                </div>
                <Progress
                  value={
                    stressJob.mode === "duration"
                      ? Math.min(
                          100,
                          stressJob.duration_sec
                            ? Math.round((stressJob.elapsed_ms / (stressJob.duration_sec * 1000)) * 100)
                            : 0
                        )
                      : stressJob.total
                        ? Math.round((stressJob.completed / stressJob.total) * 100)
                        : 0
                  }
                />
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div>
                    <div className="text-xs text-gray-500">TPS</div>
                    <div className="text-sm font-semibold text-blue-700">
                      {formatStressTps(stressJob)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Sukses</div>
                    <div className="text-sm font-semibold text-green-700">
                      {stressJob.success_count}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Gagal</div>
                    <div className="text-sm font-semibold text-red-700">
                      {stressJob.fail_count}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Avg</div>
                    <div className="text-sm font-semibold text-gray-800">
                      {stressJob.latency_ms.avg} ms
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">p95</div>
                    <div className="text-sm font-semibold text-gray-800">
                      {stressJob.latency_ms.p95} ms
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  min {stressJob.latency_ms.min} ms · max {stressJob.latency_ms.max} ms ·{" "}
                  {Math.round(stressJob.elapsed_ms)} ms
                </div>
                {stressJob.errors.length > 0 && (
                  <div className="space-y-1">
                    {stressJob.errors.map((item) => (
                      <div
                        key={item.message}
                        className="text-xs text-red-700 break-all"
                      >
                        {item.count}× {item.message}
                      </div>
                    ))}
                  </div>
                )}
                {(stressJob.rows?.length || 0) > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-800">
                        Laporan ({stressJob.rows?.length}
                        {stressJob.rows_truncated ? "+" : ""})
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => downloadStressReport(stressJob)}
                      >
                        Unduh CSV
                      </Button>
                    </div>
                    <div className="max-h-56 overflow-auto rounded-xl border border-gray-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-50 text-gray-500">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Waktu</th>
                            <th className="px-3 py-2 text-left font-medium">STAN</th>
                            <th className="px-3 py-2 text-left font-medium">RRN</th>
                            <th className="px-3 py-2 text-left font-medium">Jenis Transaksi</th>
                            <th className="px-3 py-2 text-left font-medium">Hasil</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stressJob.rows?.map((row, index) => (
                            <tr key={`${row.time}-${row.stan}-${index}`} className="border-t border-gray-100">
                              <td className="px-3 py-1.5 font-mono whitespace-nowrap">{row.time}</td>
                              <td className="px-3 py-1.5 font-mono">{row.stan || "-"}</td>
                              <td className="px-3 py-1.5 font-mono">{row.rrn || "-"}</td>
                              <td className="px-3 py-1.5">{row.transaction_type || "-"}</td>
                              <td className={`px-3 py-1.5 ${row.success ? "text-green-700" : "text-red-700"}`}>
                                {row.success ? "Sukses" : "Gagal"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowStressDialog(false)}
              className="flex-1 rounded-full"
            >
              Tutup
            </Button>
            {stressRunning ? (
              <Button
                onClick={onStopStress}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
              >
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={onStartStress}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              >
                <Activity className="h-4 w-4 mr-2" />
                Mulai
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Delete Packet
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Are you sure you want to delete this packet? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="bg-gray-50 rounded-xl p-4 my-4">
              <div className="text-sm text-gray-600">
                <div>
                  <span className="font-medium">Packet Name:</span>{" "}
                  {selected.name}
                </div>
                <div>
                  <span className="font-medium">Protocol:</span>{" "}
                  {selected.protocol}
                </div>
                <div>
                  <span className="font-medium">Address:</span>{" "}
                  {selected.address}:{selected.port}
                </div>
                <div>
                  <span className="font-medium">Folder:</span>{" "}
                  {selected.folder || "Default"}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 border-gray-200 hover:bg-gray-50 rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
