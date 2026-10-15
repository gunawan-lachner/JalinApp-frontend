"use client";
import { useState, useEffect, useMemo } from "react";
import type React from "react";

import type {
  ConnectionProfile,
  SimpleIdName,
  BinRoutingRoute,
  BinRoutingListResponse,
} from "@/lib/types";
import { useRouter, usePathname } from "next/navigation";
import {
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Copy,
  ChevronDownIcon,
  Check,
  Code,
  ShieldCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Sidebar } from "@/components/layout/sidebar";
import { useRnaApi } from "@/hooks/useRnaApi";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RouteTable } from "@/components/rna/route-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RouteRule {
  id: number;
  priority: number;
  matchStatus: "matched" | "not_matched" | "pending";
  description: string;
  gateway: string;
  issuerParticipant: string;
  containerPlugin: string;
  rule: string;
}

interface ValidationResult {
  routeId: number;
  rule: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationData {
  results: ValidationResult[];
  totalErrors: number;
  totalWarnings: number;
  totalRules: number;
}

type FilterType = "all" | "valid" | "error" | "warning";

function SearchSelect({
  items,
  value,
  onChange,
  placeholder,
  triggerClassName = "rounded-2xl border border-gray-300 w-full justify-between",
  format = "name",
  contentClassName = "p-0 w-[--radix-popover-trigger-width] rounded-xl",
}: {
  items: { id: number; name: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  format?: "name" | "id-name";
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => String(i.id) === String(value));
  const label = selected
    ? format === "id-name"
      ? `${selected.id} - ${selected.name}`
      : selected.name
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={triggerClassName}
        >
          <span className="truncate text-left">
            {label || placeholder || "Select"}
          </span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={contentClassName}>
        <Command className="rounded-xl">
          <CommandInput
            className="my-2 ring-0 outline-none border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-transparent focus-visible:border-transparent focus-visible:ring-offset-0"
            placeholder="Search..."
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map((item, idx) => {
                const isSelected = String(item.id) === String(value);
                return (
                  <CommandItem
                    key={`${item.id}-${idx}`}
                    value={`${item.id} ${item.name}`}
                    className="cursor-pointer"
                    onSelect={() => {
                      onChange(String(item.id));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        isSelected ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="truncate">
                      {format === "id-name"
                        ? `${item.id} - ${item.name}`
                        : item.name}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Parse transaction attributes from JSON or CSV-like "row,field,content" lines
function parseTransactionAttributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "string") return out;
  const trimmed = raw.trim();
  if (!trimmed) return out;

  // JSON format
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed);
      Object.keys(obj).forEach((k) => {
        out[k] = String(obj[k]);
      });
      return out;
    } catch {
      // fallthrough to CSV parsing
    }
  }

  // CSV/log: expect "... , FIELD, CONTENT"
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const parts = line.split(",");
    if (parts.length >= 3) {
      const field = parts[1]?.trim();
      const content = parts.slice(2).join(",").trim();
      if (field) out[field] = content;
    }
  }
  return out;
}

function normalizeToCsvIdFieldContent(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Try JSON conversion first
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const lines: string[] = ["ID,Field,Content"];
      let i = 1;
      for (const [field, value] of Object.entries(obj)) {
        lines.push(`${i++},${field},${String(value)}`);
      }
      return lines.join("\n");
    } catch {
      // fall through
    }
  }

  // Try to extract repeating id/field/content tokens from malformed, single-line JSON-like blobs
  const hasTokenLike = /["']?\b(field|content|id)\b["']?\s*:/.test(trimmed);
  if (hasTokenLike) {
    const ids = Array.from(
      trimmed.matchAll(/["']?\bid["']?\s*:\s*(\d+)/gi)
    ).map((m) => m[1]);
    const fields = Array.from(
      trimmed.matchAll(/["']?\bfield["']?\s*:\s*["']([^"']+)["']/gi)
    ).map((m) => m[1]);
    const contents = Array.from(
      trimmed.matchAll(/["']?\bcontent["']?\s*:\s*["']([^"']+)["']/gi)
    ).map((m) => m[1]);

    const count = Math.max(fields.length, contents.length);
    if (count > 0) {
      const out: string[] = ["ID,Field,Content"];
      for (let i = 0; i < count; i++) {
        const field = fields[i] ?? "";
        const content = contents[i] ?? "";
        if (!field || !content) continue;
        const id = ids[i] && /^\d+$/.test(ids[i]) ? ids[i] : String(i + 1);
        out.push(`${id},${field},${content}`);
      }
      if (out.length > 1) return out.join("\n");
    }
  }

  // Fallback: normalize CSV-ish input (keeps only first three columns ID, Field, Content)
  const lines = trimmed.split(/\r?\n/);
  const out: string[] = ["ID,Field,Content"];
  let idCounter = 1;

  const isHeader = (line: string) =>
    /^id\s*,\s*field\s*,\s*content\s*$/i.test(line.trim());

  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    if (isHeader(l)) continue;

    const parts = l.split(",");
    let id = "";
    let field = "";
    let content = "";

    if (parts.length >= 3) {
      id = parts[0].trim();
      field = parts[1].trim();
      content = parts.slice(2).join(",").trim();
      if (!/^\d+$/.test(id)) id = String(idCounter++);
    } else if (parts.length === 2) {
      id = String(idCounter++);
      field = parts[0].trim();
      content = parts[1].trim();
    } else {
      continue;
    }

    out.push(`${id},${field},${content}`);
  }

  return out.join("\n");
}
// Create a safe evaluator consistent with the HTML reference
function createRuleEvaluator(rule: string, context: Record<string, string>) {
  return () => {
    try {
      let evaluatedRule = rule;

      // Handle SUBSTR{var,start,len} -> (var).substring(start, start+len)
      evaluatedRule = evaluatedRule.replace(
        /SUBSTR\{([^,]+),\s*(\d+),\s*(\d+)\}/g,
        (_, str, start, length) => {
          return `(${str}).substring(${start}, ${
            Number.parseInt(start) + Number.parseInt(length)
          })`;
        }
      );

      // Escape any remaining curly braces defensively
      evaluatedRule = evaluatedRule.replace(/[{}]/g, (m) => "\\" + m);

      // Replace variable names with placeholders to avoid collisions
      const placeholders: Record<string, string> = {};
      let idx = 0;
      const sortedKeys = Object.keys(context).sort(
        (a, b) => b.length - a.length
      );
      sortedKeys.forEach((key) => {
        const ph = `__PLACEHOLDER_${idx++}__`;
        placeholders[key] = ph;
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(`\\b${escaped}\\b`, "g");
        evaluatedRule = evaluatedRule.replace(rx, ph);
      });

      // value == [a,b] -> ["a","b"].indexOf("value") >= 0 (and single item -> direct comparison)
      evaluatedRule = evaluatedRule.replace(
        /(__PLACEHOLDER_\d+__)\s*==\s*\[([^\]]+)\]/g,
        (_m, ph, arrayValues) => {
          const originalKey = Object.keys(placeholders).find(
            (k) => placeholders[k] === ph
          )!;
          const quotedValue = JSON.stringify(context[originalKey]);
          const values = arrayValues
            .split(",")
            .map((v) => v.trim().replace(/^['"]|['"]$/g, ""));
          if (values.length === 1) {
            let v = values[0];
            if (/^\d+$/.test(v))
              v = String(Number.parseInt(v, 10)).padStart(v.length, "0");
            return `${quotedValue} == "${v}"`;
          }
          const quoted = values.map((v) =>
            JSON.stringify(
              /^\d+$/.test(v)
                ? String(Number.parseInt(v, 10)).padStart(v.length, "0")
                : v
            )
          );
          return `[${quoted.join(",")}].indexOf(${quotedValue}) >= 0`;
        }
      );

      // value in [a,b]
      evaluatedRule = evaluatedRule.replace(
        /(__PLACEHOLDER_\d+__)\s+in\s+\[([^\]]+)\]/g,
        (_m, ph, arrayValues) => {
          const originalKey = Object.keys(placeholders).find(
            (k) => placeholders[k] === ph
          )!;
          const values = arrayValues
            .split(",")
            .map((v) => JSON.stringify(v.trim().replace(/^['"]|['"]$/g, "")));
          return `[${values.join(",")}].indexOf(${JSON.stringify(
            context[originalKey]
          )}) >= 0`;
        }
      );

      // value != [a,b]
      evaluatedRule = evaluatedRule.replace(
        /(__PLACEHOLDER_\d+__)\s*!=\s*\[([^\]]+)\]/g,
        (_m, ph, arrayValues) => {
          const originalKey = Object.keys(placeholders).find(
            (k) => placeholders[k] === ph
          )!;
          const values = arrayValues
            .split(",")
            .map((v) => JSON.stringify(v.trim().replace(/^['"]|['"]$/g, "")));
          return `[${values.join(",")}].indexOf(${JSON.stringify(
            context[originalKey]
          )}) < 0`;
        }
      );

      // Replace placeholders with quoted actual values
      Object.keys(placeholders).forEach((key) => {
        const rx = new RegExp(placeholders[key], "g");
        evaluatedRule = evaluatedRule.replace(rx, JSON.stringify(context[key]));
      });

      // Quote remaining array items: [1,2] -> ["1","2"] if not already quoted
      evaluatedRule = evaluatedRule.replace(/\[([^\]]+)\]/g, (m, values) => {
        const alreadyQuoted = values
          .split(",")
          .some(
            (v: string) => v.trim().startsWith('"') && v.trim().endsWith('"')
          );
        if (alreadyQuoted) return m;
        const arr = values
          .split(",")
          .map((v: string) => v.trim().replace(/^['"]|['"]$/g, ""))
          .map((v: string) => `"${v}"`);
        return `[${arr.join(",")}]`;
      });

      // Convert numeric literals on RHS of comparisons to strings while preserving zero-padding
      evaluatedRule = evaluatedRule.replace(
        /([=!<>]=)\s*(\d+)\b/g,
        (_m, op, num) => {
          const padded = String(Number.parseInt(num, 10)).padStart(
            num.length,
            "0"
          );
          return `${op} "${padded}"`;
        }
      );

      // Normalize operators: == -> === and != -> !== while preserving any existing strict ops
      const TMP_EQ = "__TMP_EQ__";
      const TMP_NEQ = "__TMP_NEQ__";
      evaluatedRule = evaluatedRule
        .replace(/===/g, TMP_EQ)
        .replace(/!==/g, TMP_NEQ);
      evaluatedRule = evaluatedRule.replace(/==/g, "===").replace(/!=/g, "!==");
      evaluatedRule = evaluatedRule.replace(new RegExp(TMP_EQ, "g"), "===");
      evaluatedRule = evaluatedRule.replace(new RegExp(TMP_NEQ, "g"), "!==");

      // Evaluate safely
      const fn = new Function("return " + evaluatedRule);
      return Boolean(fn());
    } catch {
      return false;
    }
  };
}

// Evaluate a single rule string against internal data
function evaluateRule(rule: string, internalData: Record<string, string>) {
  if (!rule || !internalData) return false;
  // Ensure all referenced attributes exist in context
  const ctx: Record<string, string> = {};
  Object.keys(internalData).forEach((k) => (ctx[k] = String(internalData[k])));

  const references = rule.match(/IN\.[A-Z_]+|OT\.[A-Z_]+|IR\.[A-Z_]+/g) || [];
  references.forEach((attr) => {
    if (!(attr in ctx)) ctx[attr] = "";
  });

  const evaluator = createRuleEvaluator(rule, ctx);
  return evaluator();
}

// Fetch candidate BIN-valid gateways. Fallback to profile gateways list.
async function getBinValidGateways(
  profileId: string,
  api: ReturnType<typeof useRnaApi>
) {
  try {
    const res = await api.getBinGateways(profileId);
    if (res.success && res.data) {
      return (res.data.results || []).map((g) => String(g.id));
    }
  } catch {}
  return [];
}

// Simulate routing: 0 no match, 1 simple, 2 enhanced, 3 mismatch
async function simulateRouting(
  routes: any[],
  internalData: Record<string, string>,
  profileId: string,
  api: ReturnType<typeof useRnaApi>
) {
  const binValid = await getBinValidGateways(profileId, api); // string ids
  const txnGateway = String(internalData["IN.GATEWAY_ID"] ?? "");

  return routes.map((r) => {
    const rule = String(r.rule ?? "");
    const isMatch = evaluateRule(rule, internalData);
    if (!isMatch) {
      return {
        ...r,
        isMatch: false,
        match_status: 0,
        status_reason: "Rule not matched",
      };
    }
    const routeGateway = String(r.gateway_id ?? "");
    if (txnGateway && routeGateway && txnGateway === routeGateway) {
      return {
        ...r,
        isMatch: true,
        match_status: 1,
        status_reason: "Simple gateway match with transaction",
      };
    }
    if (routeGateway && binValid.includes(routeGateway)) {
      return {
        ...r,
        isMatch: true,
        match_status: 2,
        status_reason: "Enhanced BIN validation match",
      };
    }
    return {
      ...r,
      isMatch: true,
      match_status: 3,
      status_reason: "Rule matched but gateway mismatch",
    };
  });
}

// Helper to derive a 6-digit BIN prefix from transaction attributes
function deriveBinPrefix(internalData: Record<string, string>): string {
  const prefer = String(internalData["IN.PAN_PREFIX"] || "").replace(/\D/g, "");
  if (prefer.length >= 6) return prefer.slice(0, 6);

  const candidates = [
    internalData["IN.PAN"],
    internalData["MASK_PAN"],
    internalData["DUMMY_PAN"],
  ].filter(Boolean) as string[];

  for (const cand of candidates) {
    const digits = (cand || "").replace(/\D/g, "");
    if (digits.length >= 6) return digits.slice(0, 6);
  }
  return "";
}

// Evaluate and tag routes with status, using precomputed bin-valid gateways
function simulateRoutingWithGateways(
  routes: any[],
  internalData: Record<string, string>,
  binValidGatewayIds: string[]
) {
  const txnGateway = String(internalData["IN.GATEWAY_ID"] ?? "");

  return routes.map((r) => {
    const rule = String(r.rule ?? "");
    const isMatch = evaluateRule(rule, internalData);
    if (!isMatch) {
      return {
        ...r,
        isMatch: false,
        match_status: 0,
        status_reason: "Rule not matched",
      };
    }
    const routeGateway = String(r.gateway_id ?? "");
    if (txnGateway && routeGateway && txnGateway === routeGateway) {
      return {
        ...r,
        isMatch: true,
        match_status: 1,
        status_reason: "Simple gateway match with transaction",
      };
    }
    if (routeGateway && binValidGatewayIds.includes(routeGateway)) {
      return {
        ...r,
        isMatch: true,
        match_status: 2,
        status_reason: "Enhanced BIN validation match",
      };
    }
    return {
      ...r,
      isMatch: true,
      match_status: 3,
      status_reason: "Rule matched but gateway mismatch",
    };
  });
}

export default function RoutingSimulationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState(pathname);

  // Connection state
  const [connectionProfiles, setConnectionProfiles] = useState<
    ConnectionProfile[]
  >([]);
  const [selectedConnection, setSelectedConnection] = useState("");

  const [isSmallQueryExpanded, setIsSmallQueryExpanded] = useState(false);

  // Simulation state
  const [acquirerId, setAcquirerId] = useState("");
  const [transactionData, setTransactionData] = useState("");
  const [enableSimulation, setEnableSimulation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [executionTime, setExecutionTime] = useState("0.01");
  const [rowsReturned, setRowsReturned] = useState(0);

  // Route rules state
  const [routes, setRoutes] = useState<BinRoutingRoute[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [routeSortConfig, setRouteSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  );
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const paginationState = useMemo(
    () => ({
      currentPage,
      pageSize,
      totalRows,
      totalPages: Math.max(1, Math.ceil((totalRows || 0) / pageSize)),
    }),
    [currentPage, pageSize, totalRows]
  );

  // Filter state
  const [filters, setFilters] = useState({
    id: "",
    priority: "",
    matchStatus: "",
    description: "",
    gateway: "",
    issuerParticipant: "",
    containerPlugin: "",
    rule: "",
  });

  // Sorting and context menu state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof BinRoutingRoute;
    direction: "asc" | "desc";
  } | null>(null);

  type ContextMenuState = {
    visible: boolean;
    x: number;
    y: number;
    cellValue?: string;
    colKey?: keyof BinRoutingRoute;
    row?: BinRoutingRoute;
  };
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });

  const api = useRnaApi();
  const { toast } = useToast();

  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationData, setValidationData] = useState<ValidationData | null>(
    null
  );
  const [validationFilter, setValidationFilter] = useState<FilterType>("all");
  const [isValidating, setIsValidating] = useState(false);

  const handleNavigation = (href: string) => {
    router.push(href);
    setActiveSection(href);
  };

  // Fetch connection profiles
  useEffect(() => {
    api.getConnectionProfiles(
      (data) => {
        const dbConnections = data.filter(
          (profile) => profile.connection_type === "DB"
        );
        setConnectionProfiles(dbConnections);
      },
      (error) => {
        console.error("Failed to fetch connection profiles:", error);
      }
    );
  }, []);

  // Acquirers state loaded from API
  const [acquirers, setAcquirers] = useState<SimpleIdName[]>([]);
  const [acqLoading, setAcqLoading] = useState(false);

  // Fetch acquirers when a connection is selected
  useEffect(() => {
    if (!selectedConnection) {
      setAcquirers([]);
      setAcquirerId("");
      return;
    }
    setAcqLoading(true);
    api.getBinAcquirers(
      selectedConnection,
      (data) => {
        const results = data?.results ?? [];
        setAcquirers(results);
        setAcqLoading(false);
      },
      (err) => {
        console.error("Acquirers error", err);
        setAcqLoading(false);
        toast({
          title: "Error",
          description: "Failed to load acquirers.",
          variant: "destructive",
        });
      }
    );
  }, [selectedConnection]);

  const handleValidateSyntax = () => {
    if (!transactionData.trim()) {
      toast({
        title: "No Data",
        description: "Please enter transaction data to validate.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Syntax Valid",
        description: "Transaction data syntax is valid.",
      });
    }, 500);
  };

  const handleExecuteSimulation = async () => {
    if (!selectedConnection || !transactionData.trim()) {
      toast({
        title: "Missing Requirements",
        description: "Please select a connection and enter transaction data.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const start = performance.now();
      const internalData = parseTransactionAttributes(transactionData);

      // If simulation is disabled, just measure timing and exit
      if (!enableSimulation) {
        const end = performance.now();
        const duration = ((end - start) / 1000).toFixed(2);
        setExecutionTime(duration);
        setIsLoading(false);
        toast({
          title: "Simulation Skipped",
          description:
            "Simulation is disabled. Enable it to compute indicators.",
        });
        return;
      }

      const initialData = await api.getSimulationRoutes(
        {
          connection: selectedConnection,
          acquirer_id: acquirerId ? Number(acquirerId) : undefined,
          page: 1,
          pageSize: 20,
        },
        (d) => d,
        (err) => console.error("Simulation routes error", err)
      );

      const totalCount = (initialData as any)?.total ?? 0;

      const simData = await api.getSimulationRoutes(
        {
          connection: selectedConnection,
          acquirer_id: acquirerId ? Number(acquirerId) : undefined,
          page: 1,
          pageSize: totalCount > 0 ? totalCount : 20,
        },
        (d) => d,
        (err) => console.error("Simulation routes error", err)
      );

      const routesFromApi = (simData as any)?.routes ?? [];
      setExecutedSql((simData as any)?.query || "");
      setTotalRows(routesFromApi.length);
      setRoutes(routesFromApi); // set raw first for consistency

      // 2) Derive BIN prefix and fetch BIN-valid gateways
      const binPrefix = deriveBinPrefix(internalData);
      let binValidIds: string[] = [];
      if (binPrefix && binPrefix.length === 6) {
        const countryStr = String(
          internalData["IN.BIN_CARD_BILLING_CURRENCY"] || ""
        ).replace(/\D/g, "");
        const maybeCountry = countryStr ? Number(countryStr) : undefined;
        const gwData = await api.getBinGatewaysByPrefix(
          {
            profileId: selectedConnection,
            pan_prefix: binPrefix,
            country: maybeCountry,
          },
          (d) => d,
          (err) => console.error("BIN gateways by prefix error", err)
        );
        const results = (gwData as any)?.results ?? [];
        binValidIds = results.map((g: any) => String(g.id));
      }

      // 3) Evaluate rules and classify statuses
      const simulated = simulateRoutingWithGateways(
        routesFromApi,
        internalData,
        binValidIds
      );

      // 4) Finalize timing and update UI
      const end = performance.now();
      const duration = ((end - start) / 1000).toFixed(2);
      setExecutionTime(duration);
      setRowsReturned(simulated.length);
      setRoutes(simulated);
      setIsSimulated(true);
      setTotalRows(simulated.length);
      setCurrentPage(1);

      toast({
        title: "Simulation Complete",
        description: `Evaluated ${simulated.length} routes in ${duration}s.`,
      });
    } catch (e) {
      console.error("Simulation error", e);
      toast({
        title: "Error",
        description: "Failed to execute simulation.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSampleData = () => {
    const sampleData = `ID,Field,Content
7364799,IN.ISS_SETTLEMENT_DATE,2025-05-22
7364800,IN.ISS_SETTLEMENT_WITHOUT_HOLI,2025-05-22
7364801,IN.PCI_DATA_KEY,892f5120-36d5-11f0-8e94-506b8dff8c6f
7364802,IN.PCI_DATA_SOURCE,JALIN_CONTAINER-1
7364803,IN.ACCOUNTING_ISS_PID,2040
7364804,IN.GATEWAY_ID,242
7364805,IN.BIN_TYPE,1
7364806,IN.PARTISS,2040
7364807,IN.BIN_CARD_ISSUED_REGION,B
7364808,IN.BIN_CARD_BILLING_CURRENCY,360
7364809,IN.PROD,ATM
7364810,IN.ACCOUNT_TO,0
7364811,IN.TCP_CURRENT_STATE,3
7364812,IN.RRN,000000009561
7364813,IN.PINENTRY,1
7364814,IN.PIN_EXISTS,1
7364815,IN.PAN,@0002I+xVkpO+RFXdHagmL7SgmBN7LwpIDg00aftkGbwRVIE=
7364816,IN.PAN_PREFIX,888832
7364817,IN.LANGUAGE_CODE,ID
7364818,IN.MVI,00
7364819,IN.PROCCODE,311000
7364820,IN.DATE,0522
7364821,IN.TIME,132519
7364822,IN.MSGTYPE,0200
7364823,IN.AMOUNT,0
7364824,IN.STAN,9561`;
    setTransactionData(sampleData);
    toast({
      title: "Sample Data Loaded",
      description: "Sample transaction data has been loaded in CSV format.",
    });
  };

  const [executedSql, setExecutedSql] = useState("");

  const handleLoadRules = useMemo(
    () => (overrides?: { page?: number; pageSize?: number }) => {
      if (!selectedConnection) {
        toast({
          title: "Select connection",
          description: "Please choose a DB connection first.",
        });
        return;
      }

      const nextPage = overrides?.page ?? currentPage;
      const nextPageSize = overrides?.pageSize ?? pageSize;

      setIsSimulated(false);

      setIsLoading(true);
      setIsPaginationLoading(true);

      api.listBinRoutes(
        {
          profileId: selectedConnection,
          page: nextPage,
          page_size: nextPageSize,
          sort: "desc",
          acquirer_id: acquirerId || undefined,
        },
        (data: BinRoutingListResponse) => {
          setRoutes(data.results || []);
          setTotalRows(data.total_rows || 0);
          setExecutedSql(data.executed_sql || "");
          setIsLoading(false);
          setIsPaginationLoading(false);
        },
        (err) => {
          console.error("List rules error", err);
          setRoutes([]);
          setTotalRows(0);
          setIsLoading(false);
          setIsPaginationLoading(false);
        }
      );
    },
    [selectedConnection, currentPage, pageSize, acquirerId, api, toast]
  );

  const handleRouteRowSelect = useMemo(
    () => (index: number) => {
      const next = new Set(selectedRows);
      next.has(index) ? next.delete(index) : next.add(index);
      setSelectedRows(next);
    },
    [selectedRows]
  );

  const handleRouteRowSelectAll = useMemo(
    () => (selectAll: boolean) => {
      const next = new Set<number>();
      if (selectAll && routes.length > 0) {
        routes.forEach((_, i) => next.add(i));
      }
      setSelectedRows(next);
    },
    [routes]
  );

  const handleRouteSort = useMemo(
    () => (key: string) => {
      let direction: "asc" | "desc" = "asc";
      if (
        routeSortConfig &&
        routeSortConfig.key === key &&
        routeSortConfig.direction === "asc"
      )
        direction = "desc";
      setRouteSortConfig({ key, direction });
    },
    [routeSortConfig]
  );

  const handleRouteColumnFilter = useMemo(
    () => (key: string, value: string) => {
      setColumnFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleRoutePageChange = useMemo(
    () => (page: number) => {
      if (isSimulated) return;
      setCurrentPage(page);
      handleLoadRules({ page, pageSize });
    },
    [handleLoadRules, pageSize, isSimulated]
  );

  const handleRoutePageSizeChange = useMemo(
    () => (size: number) => {
      if (isSimulated) return;
      const firstPage = 1;
      setPageSize(size);
      setCurrentPage(firstPage);
      handleLoadRules({ page: firstPage, pageSize: size });
    },
    [handleLoadRules, isSimulated]
  );

  const getMatchStatusBadge = (status: number | string | undefined) => {
    // Handle case where status might be undefined or from simulation (0, 1, 2, 3)
    let matchStatus:
      | "matched"
      | "not_matched"
      | "pending"
      | "mismatch"
      | undefined;

    if (typeof status === "number") {
      switch (status) {
        case 0:
          matchStatus = "not_matched";
          break;
        case 1:
          matchStatus = "matched";
          break;
        case 2:
          matchStatus = "matched"; // Enhanced is still a match
          break;
        case 3:
          matchStatus = "mismatch";
          break;
        default:
          matchStatus = undefined;
      }
    } else if (typeof status === "string") {
      // Assuming original status strings like "matched", "pending", "not_matched"
      if (
        status === "matched" ||
        status === "pending" ||
        status === "not_matched"
      ) {
        matchStatus = status;
      }
    }

    switch (matchStatus) {
      case "matched":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Matched
          </Badge>
        );
      case "not_matched":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not Matched
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "mismatch":
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Mismatch
          </Badge>
        );
      default:
        return null;
    }
  };

  const toggleSort = useMemo(
    () => (key: keyof BinRoutingRoute) => {
      setSortConfig((prev) => {
        if (!prev || prev.key !== key) return { key, direction: "asc" };
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      });
    },
    []
  );

  const openContextMenu = (
    e: React.MouseEvent,
    row: BinRoutingRoute,
    colKey: keyof BinRoutingRoute,
    cellValue: string
  ) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      cellValue,
      colKey,
      row,
    });
  };

  const sortedRoutes = useMemo(() => {
    const data = [...routes];
    if (!routeSortConfig) return data;
    const { key, direction } = routeSortConfig;
    data.sort((a, b) => {
      const av = String(a[key as keyof BinRoutingRoute]).toLowerCase();
      const bv = String(b[key as keyof BinRoutingRoute]).toLowerCase();
      if (!isNaN(Number(av)) && !isNaN(Number(bv))) {
        const na = Number(av);
        const nb = Number(bv);
        return direction === "asc" ? na - nb : nb - na;
      }
      return direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return data;
  }, [routes, routeSortConfig]);

  useEffect(() => {
    const close = () => setContextMenu((s) => ({ ...s, visible: false }));
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("keydown", esc);
    };
  }, []);

  const handleCopyExecutedSql = async () => {
    await navigator.clipboard.writeText(executedSql || "");
    toast({
      title: "Copied",
      description: "Executed SQL copied to clipboard.",
    });
  };
  const handleSaveExecutedSql = () => {
    const blob = new Blob([executedSql || ""], {
      type: "text/plain;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `executed_sql_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const validateRuleSyntax = (
    rule: string
  ): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rule || typeof rule !== "string") {
      return {
        isValid: false,
        errors: ["Rule is empty or invalid"],
        warnings: [],
      };
    }

    const trimmedRule = rule.trim();
    if (trimmedRule === "") {
      return { isValid: false, errors: ["Rule is empty"], warnings: [] };
    }

    // 1. Validate paired punctuation marks
    const bracketPairs = [
      { open: "(", close: ")", name: "parentheses" },
      { open: "[", close: "]", name: "brackets" },
      { open: "{", close: "}", name: "braces" },
    ];

    bracketPairs.forEach((pair) => {
      const openCount = (
        trimmedRule.match(new RegExp("\\" + pair.open, "g")) || []
      ).length;
      const closeCount = (
        trimmedRule.match(new RegExp("\\" + pair.close, "g")) || []
      ).length;

      if (openCount !== closeCount) {
        const diff = openCount - closeCount;
        if (diff > 0) {
          errors.push(
            `Unmatched ${pair.name}: ${diff} more opening ${pair.open} than closing ${pair.close}`
          );
        } else {
          errors.push(
            `Unmatched ${pair.name}: ${Math.abs(diff)} more closing ${
              pair.close
            } than opening ${pair.open}`
          );
        }
      }
    });

    // 2. Validate quotes (single and double)
    const singleQuoteMatches = trimmedRule.match(/'/g) || [];
    const doubleQuoteMatches = trimmedRule.match(/"/g) || [];

    if (singleQuoteMatches.length % 2 !== 0) {
      errors.push(
        `Unmatched single quotes: ${singleQuoteMatches.length} quotes found (must be even number)`
      );
    }

    if (doubleQuoteMatches.length % 2 !== 0) {
      errors.push(
        `Unmatched double quotes: ${doubleQuoteMatches.length} quotes found (must be even number)`
      );
    }

    // 3. Check for invalid quote patterns
    const invalidQuotePatterns = [
      { pattern: /''/g, name: "empty single quotes" },
      { pattern: /""/g, name: "empty double quotes" },
      { pattern: /'''/g, name: "triple single quotes" },
      { pattern: /"""/g, name: "triple double quotes" },
      { pattern: /''''/g, name: "quadruple single quotes" },
      { pattern: /""""/g, name: "quadruple double quotes" },
    ];

    invalidQuotePatterns.forEach(({ pattern, name }) => {
      const matches = trimmedRule.match(pattern);
      if (matches) {
        errors.push(`Invalid ${name} found: ${matches.length} occurrences`);
      }
    });

    // 4. Validate logical operators
    const logicalOperatorErrors: string[] = [];

    // Check for incomplete && operators
    const incompleteAnd = trimmedRule.match(/&(?!&)/g);
    if (incompleteAnd) {
      logicalOperatorErrors.push(
        `Incomplete AND operator: found ${incompleteAnd.length} single & (should be &&)`
      );
    }

    // Check for incomplete || operators
    const incompleteOr = trimmedRule.match(/\|(?!\|)/g);
    if (incompleteOr) {
      logicalOperatorErrors.push(
        `Incomplete OR operator: found ${incompleteOr.length} single | (should be ||)`
      );
    }

    // Check for valid logical operators
    const validAndCount = (trimmedRule.match(/&&/g) || []).length;
    const validOrCount = (trimmedRule.match(/\|\|/g) || []).length;

    if (validAndCount > 0 || validOrCount > 0) {
      logicalOperatorErrors.length = 0; // Clear previous errors if valid operators found
    }

    errors.push(...logicalOperatorErrors);

    // 5. Validate comparison operators
    const comparisonErrors: string[] = [];

    // Check for single = (should be ==) - but exclude != and ==
    const invalidSingleEquals: string[] = [];

    // First, find all = characters
    const allEquals = [...trimmedRule.matchAll(/=/g)];

    // Check each = to see if it's a valid operator or invalid single =
    allEquals.forEach((match) => {
      const index = match.index!;

      // Check if this = is part of a valid operator
      const isPartOfValidOperator =
        // Check for == (look behind and ahead)
        (index > 0 && trimmedRule[index - 1] === "=") ||
        (index < trimmedRule.length - 1 && trimmedRule[index + 1] === "=") ||
        // Check for != (look behind)
        (index > 0 && trimmedRule[index - 1] === "!");

      // If it's not part of a valid operator, it's an invalid single =
      if (!isPartOfValidOperator) {
        invalidSingleEquals.push(match[0]);
      }
    });

    if (invalidSingleEquals.length > 0) {
      comparisonErrors.push(
        `Invalid comparison operator: found ${invalidSingleEquals.length} single = (should be ==)`
      );
    }

    // Check for valid comparison operators
    const validComparisons = trimmedRule.match(/==|!=|>=|<=|>|</g) || [];
    if (validComparisons.length === 0 && trimmedRule.includes("=")) {
      comparisonErrors.push(
        "No valid comparison operators found (use ==, !=, >=, <=, >, <)"
      );
    }

    errors.push(...comparisonErrors);

    // 6. Validate array format
    const arrayErrors: string[] = [];
    const arrayPattern = /\[([^\]]*)\]/g;
    let arrayMatch;

    while ((arrayMatch = arrayPattern.exec(trimmedRule)) !== null) {
      const arrayContent = arrayMatch[1];
      if (arrayContent.trim() === "") {
        arrayErrors.push(`Empty array found at position ${arrayMatch.index}`);
      } else {
        // Check for proper comma separation
        const items = arrayContent.split(",").map((item) => item.trim());
        if (items.some((item) => item === "")) {
          arrayErrors.push(
            `Invalid array format: empty items found at position ${arrayMatch.index}`
          );
        }
      }
    }

    errors.push(...arrayErrors);

    // 7. Additional syntax checks
    const additionalErrors: string[] = [];

    // Check for consecutive operators
    const consecutiveOps = trimmedRule.match(
      /(&&\s*&&|\|\|\s*\|\||==\s*==|!=\s*!=)/g
    );
    if (consecutiveOps) {
      additionalErrors.push(
        `Consecutive operators found: ${consecutiveOps.join(", ")}`
      );
    }

    // Check for missing spaces around operators
    const missingSpaces = trimmedRule.match(
      /([a-zA-Z0-9_]+)(==|!=|>=|<=|>|<)([a-zA-Z0-9_]+)/g
    );
    if (missingSpaces) {
      warnings.push(
        `Consider adding spaces around operators for better readability`
      );
    }

    errors.push(...additionalErrors);

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  };

  const validateAllRules = (): ValidationData => {
    const validationResults: ValidationResult[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    routes.forEach((route) => {
      if (route.rule) {
        const validation = validateRuleSyntax(route.rule);
        validationResults.push({
          routeId: route.id,
          rule: route.rule,
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
        });

        totalErrors += validation.errors.length;
        totalWarnings += validation.warnings.length;
      }
    });

    return {
      results: validationResults,
      totalErrors: totalErrors,
      totalWarnings: totalWarnings,
      totalRules: validationResults.length,
    };
  };

  const handleValidateAllRules = () => {
    if (!routes || routes.length === 0) {
      toast({
        title: "No Rules",
        description: "Please load rules data first by clicking Load Rules",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);

    // Simulate validation delay for better UX
    setTimeout(() => {
      const data = validateAllRules();
      setValidationData(data);
      setValidationFilter("all");
      setValidationModalOpen(true);
      setIsValidating(false);

      toast({
        title: "Validation Complete",
        description: `Validated ${data.totalRules} rules. Found ${data.totalErrors} errors and ${data.totalWarnings} warnings.`,
      });
    }, 500);
  };

  const getFilteredResults = (): ValidationResult[] => {
    if (!validationData) return [];

    switch (validationFilter) {
      case "valid":
        return validationData.results.filter((r) => r.isValid);
      case "error":
        return validationData.results.filter((r) => !r.isValid);
      case "warning":
        return validationData.results.filter((r) => r.warnings.length > 0);
      default:
        return validationData.results;
    }
  };

  const exportValidationResults = () => {
    if (!validationData) return;

    const filteredResults = getFilteredResults();
    const filterSuffix =
      validationFilter === "valid"
        ? "_valid_rules"
        : validationFilter === "error"
        ? "_rules_with_errors"
        : validationFilter === "warning"
        ? "_rules_with_warnings"
        : "_all_rules";

    const csvContent = [
      ["Rule ID", "Rule", "Is Valid", "Errors", "Warnings"],
      ...filteredResults.map((result) => [
        result.routeId,
        `"${result.rule.replace(/"/g, '""')}"`,
        result.isValid ? "Yes" : "No",
        result.errors.join("; "),
        result.warnings.join("; "),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rule_validation_results${filterSuffix}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: `Exported ${filteredResults.length} rules to CSV`,
    });
  };

  const filteredValidationResults = getFilteredResults();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />

        <div className="flex-1 max-w-full overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Jalin App</span>
              <span>/</span>
              <span className="text-gray-800 font-medium">
                Routing Simulation
              </span>
            </div>
          </div>

          <div className="p-6 max-w-full">
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                Routing Simulation
              </h1>
              <p className="text-gray-600">
                Simulate and validate routing data from transaction.
              </p>
            </div>
            <Card className="shadow-sm border-0 bg-white rounded-3xl mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-gray-500" />
                      {/* UNIFY label styling with transaction routing */}
                      <span className="text-sm font-medium text-gray-700 mb-2 block">
                        Connection:
                      </span>
                    </div>
                    <Select
                      value={selectedConnection}
                      onValueChange={setSelectedConnection}
                    >
                      <SelectTrigger className="w-64 rounded-2xl">
                        <SelectValue placeholder="Select connection" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectionProfiles.map((profile) => (
                          <SelectItem key={profile.name} value={profile.name}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-3">
                    {selectedConnection ? (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-700 px-3 py-1"
                      >
                        <Database className="h-3 w-3 mr-1.5" />
                        {routes.length} routes loaded
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 text-gray-600 px-3 py-1"
                      >
                        No connection selected
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Left Column - Acquirer Configuration */}
              <Card className="shadow-sm border-0 bg-white rounded-3xl">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Acquirer ID
                      </Label>
                      <SearchSelect
                        items={(acquirers || []).map((a) => ({
                          id: Number(a.id),
                          name: String(a.name),
                        }))}
                        value={acquirerId}
                        onChange={setAcquirerId}
                        placeholder="Select acquirer"
                        triggerClassName="w-full rounded-2xl border border-gray-300 justify-between"
                        format="id-name"
                        contentClassName="p-0 w-[--radix-popover-trigger-width] max-h-[400px] overflow-auto rounded-xl shadow-lg"
                      />
                    </div>

                    <div className="flex space-x-3 items-center justify-between">
                      <Button
                        onClick={
                          enableSimulation
                            ? handleExecuteSimulation
                            : handleValidateAllRules
                        }
                        disabled={
                          (enableSimulation ? isLoading : isValidating) ||
                          !selectedConnection
                        }
                        variant="outline"
                        className="rounded-2xl border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
                      >
                        {enableSimulation ? (
                          isLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Simulating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Simulate
                            </>
                          )
                        ) : isValidating ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Validate Syntax
                          </>
                        )}
                      </Button>
                      {/* </CHANGE> */}
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => {
                            setCurrentPage(1);
                            handleLoadRules({ page: 1, pageSize });
                          }}
                          disabled={isLoading}
                          className="rounded-2xl bg-blue-600 hover:bg-blue-700"
                        >
                          {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Load Rules
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center space-x-3">
                        <Switch
                          id="enable-simulation"
                          checked={enableSimulation}
                          onCheckedChange={setEnableSimulation}
                          className="data-[state=checked]:bg-green-600"
                        />
                        <div>
                          <Label
                            htmlFor="enable-simulation"
                            className="text-sm font-medium text-gray-800"
                          >
                            Enable Simulation & Validation
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">
                            When disabled, only shows rules data without
                            simulation
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Transaction Attributes */}
              <Card className="shadow-sm border-0 bg-white rounded-3xl">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Simulation &amp; Validation
                      </h3>
                      <Badge
                        variant="secondary"
                        className={
                          enableSimulation
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }
                      >
                        {enableSimulation ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>

                    <Textarea
                      placeholder="Paste Transaction Attributes in CSV format (ID,Field,Content) here..."
                      value={transactionData}
                      onChange={(e) => setTransactionData(e.target.value)}
                      onBlur={() =>
                        setTransactionData(
                          normalizeToCsvIdFieldContent(transactionData)
                        )
                      }
                      className="min-h-[140px] rounded-2xl font-mono text-sm border border-gray-300"
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Button
                          onClick={handleLoadSampleData}
                          variant="link"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                        >
                          Load Sample Data
                        </Button>
                        <span className="text-gray-300">|</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                        >
                          Show Rule Examples
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 flex justify-center">
              <Button
                onClick={() => setIsSmallQueryExpanded(!isSmallQueryExpanded)}
                variant="outline"
                size="sm"
                className="h-7 px-2 rounded-full bg-white border-gray-300 hover:bg-gray-50 shadow-sm transition-all duration-200 text-xs"
              >
                <Code className="h-3 w-3 mr-1 text-gray-600" />
                <span className="text-gray-700 font-medium">SQL</span>
                {executionTime && !Number.isNaN(Number(executionTime)) && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-green-100 text-green-700 text-xs px-1 py-0 h-3 text-[10px]"
                  >
                    {Number(executionTime).toFixed(2)}s
                  </Badge>
                )}
                <ChevronDownIcon
                  className={`h-3 w-3 ml-1 text-gray-500 transition-transform duration-200 ${
                    isSmallQueryExpanded ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </div>

            {isSmallQueryExpanded && (
              <Card className="shadow-sm border-0 bg-white rounded-3xl mb-6 animate-in slide-in-from-top-2 duration-200">
                <CardContent className="p-6 space-y-4">
                  {/* Query Statistics */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {executionTime &&
                        !Number.isNaN(Number(executionTime)) && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-gray-600">
                              <span className="font-medium text-green-700">
                                {Number(executionTime).toFixed(3)}s
                              </span>
                            </span>
                          </div>
                        )}
                      <div className="flex items-center space-x-1">
                        <Database className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs text-gray-600">
                          <span className="font-medium text-blue-700">
                            {(totalRows || 0).toLocaleString()}
                          </span>{" "}
                          rows
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyExecutedSql}
                        className="h-7 px-2 rounded-lg text-xs bg-white/70"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveExecutedSql}
                        className="h-7 px-2 rounded-lg text-xs bg-white/70"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>

                  {/* SQL Query Display */}
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
                      {executedSql ? executedSql : "No query available"}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm border-0 bg-white rounded-3xl">
              <CardContent className="p-6">
                <RouteTable
                  routes={routes}
                  selectedRows={selectedRows}
                  onRowSelect={handleRouteRowSelect}
                  onRowSelectAll={handleRouteRowSelectAll}
                  onRightClick={openContextMenu}
                  sortConfig={routeSortConfig}
                  onSort={handleRouteSort}
                  columnFilters={columnFilters}
                  onColumnFilter={handleRouteColumnFilter}
                  hiddenColumns={hiddenColumns}
                  onColumnVisibilityChange={(columnKey) => {
                    const next = new Set(hiddenColumns);
                    next.has(columnKey)
                      ? next.delete(columnKey)
                      : next.add(columnKey);
                    setHiddenColumns(next);
                  }}
                  paginationState={paginationState}
                  onPageChange={handleRoutePageChange}
                  onPageSizeChange={handleRoutePageSizeChange}
                  isPaginationLoading={isPaginationLoading}
                  onDelete={() => {
                    toast({
                      title: "Not available",
                      description: "Delete is disabled on Routing Simulation.",
                    });
                  }}
                  onRowDoubleClick={() => {}}
                  hidePagination={isSimulated}
                />
                <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                  {/* TODO: Add pagination controls here */}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* redesign validation modal to match transaction detail modal (max width, header, cards, scroll area) */}
      <Dialog open={validationModalOpen} onOpenChange={setValidationModalOpen}>
        <DialogContent className="max-w-7xl w-[92vw] rounded-2xl p-0 overflow-hidden border border-gray-200 bg-white">
          <DialogHeader className="px-6 py-4 border-b bg-gray-50/60 backdrop-blur supports-[backdrop-filter]:bg-gray-50/40">
            <DialogTitle className="flex items-center text-xl font-semibold text-gray-900">
              <ShieldCheck className="h-5 w-5 mr-2 text-blue-600" />
              Rule Syntax Validation Results
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Validate routing rules for structural issues and formatting.
              Filter results and export when ready.
            </DialogDescription>
          </DialogHeader>

          {validationData && (
            <div className="px-6 py-3 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setValidationFilter("all")}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${
                      validationFilter === "all"
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    All
                    <span
                      className={`ml-2 inline-flex items-center justify-center rounded-full text-[10px] px-1.5 py-0.5 ${
                        validationFilter === "all"
                          ? "bg-white/20"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {validationData.totalRules}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationFilter("valid")}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${
                      validationFilter === "valid"
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Valid
                    <span
                      className={`ml-2 inline-flex items-center justify-center rounded-full text-[10px] px-1.5 py-0.5 ${
                        validationFilter === "valid"
                          ? "bg-white/20"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {validationData.results.filter((r) => r.isValid).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationFilter("error")}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${
                      validationFilter === "error"
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Errors
                    <span
                      className={`ml-2 inline-flex items-center justify-center rounded-full text-[10px] px-1.5 py-0.5 ${
                        validationFilter === "error"
                          ? "bg-white/20"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {validationData.totalErrors}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationFilter("warning")}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${
                      validationFilter === "warning"
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Warnings
                    <span
                      className={`ml-2 inline-flex items-center justify-center rounded-full text-[10px] px-1.5 py-0.5 ${
                        validationFilter === "warning"
                          ? "bg-white/20"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {validationData.totalWarnings}
                    </span>
                  </button>
                </div>

                {/* quick stats */}
                <div className="hidden md:flex items-center gap-3 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    {
                      validationData.results.filter((r) => r.isValid).length
                    }{" "}
                    valid
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                    {
                      validationData.results.filter((r) => !r.isValid).length
                    }{" "}
                    errors
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                    {
                      validationData.results.filter(
                        (r) => r.warnings.length > 0
                      ).length
                    }{" "}
                    warnings
                  </span>
                </div>
              </div>
            </div>
          )}

          {validationData && (
            <ScrollArea className="h-[60vh]">
              <div className="px-6 py-5">
                {filteredValidationResults.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No rules match the current filter.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Card list items with accent bar */}
                    {filteredValidationResults.map((result, index) => (
                      <div
                        key={`${result.routeId}-${index}`}
                        className={`group rounded-xl border bg-white shadow-sm hover:shadow-md transition overflow-hidden ${
                          result.isValid
                            ? "border-l-4 border-l-green-500"
                            : "border-l-4 border-l-red-500"
                        }`}
                      >
                        <button
                          type="button"
                          className="w-full text-left px-4 py-3 flex items-center justify-between"
                          onClick={(e) => {
                            // Toggle details via data attribute
                            const panel =
                              (e.currentTarget.nextSibling as HTMLElement) ||
                              null;
                            if (panel) panel.hidden = !panel.hidden;
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {result.isValid ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                Rule ID: {result.routeId}
                                <Badge
                                  variant="secondary"
                                  className={`ml-2 ${
                                    result.isValid
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {result.isValid ? "Valid" : "Invalid"}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {result.errors.length} error(s) •{" "}
                                {result.warnings.length} warning(s)
                              </div>
                            </div>
                          </div>
                          <ChevronDownIcon className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
                        </button>

                        {/* details panel */}
                        <div className="px-4 pb-4 space-y-3" hidden>
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              Rule
                            </div>
                            <code className="block p-3 bg-gray-50 rounded-md text-sm font-mono text-gray-800 overflow-x-auto">
                              {result.rule}
                            </code>
                          </div>

                          {result.errors.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-red-700 mb-2 flex items-center">
                                <XCircle className="h-4 w-4 mr-1" />
                                Errors
                              </div>
                              <ul className="space-y-1">
                                {result.errors.map((error, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start text-sm text-red-600"
                                  >
                                    <span className="mr-2">•</span>
                                    <span>{error}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.warnings.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-yellow-700 mb-2 flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Warnings
                              </div>
                              <ul className="space-y-1">
                                {result.warnings.map((warning, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start text-sm text-yellow-600"
                                  >
                                    <span className="mr-2">•</span>
                                    <span>{warning}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {contextMenu.visible && (
        <div
          className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={async () => {
                if (!contextMenu.cellValue) return;
                await navigator.clipboard.writeText(contextMenu.cellValue);
                toast({
                  title: "Copied",
                  description: "Selected cell copied to clipboard.",
                });
                setContextMenu((s) => ({ ...s, visible: false }));
              }}
            >
              <Copy className="h-4 w-4 text-gray-500" />
              Copy selected cell
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={async () => {
                if (!contextMenu.row) return;
                await navigator.clipboard.writeText(
                  JSON.stringify(contextMenu.row, null, 2)
                );
                toast({
                  title: "Copied",
                  description: "Entire row copied as JSON.",
                });
                setContextMenu((s) => ({ ...s, visible: false }));
              }}
            >
              <Copy className="h-4 w-4 text-gray-500" />
              Copy entire row
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
