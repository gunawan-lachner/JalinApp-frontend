"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Plus,
  Play,
  Edit,
  Trash2,
  Clock,
  Code,
  Activity,
  AlertCircle,
  Terminal,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Monitor,
  Info,
  Settings,
  Download,
  StopCircle,
  FileDown,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

import { Sidebar } from "@/components/layout/sidebar";
import { rnaApi } from "@/lib/api";
import type { ConnectionProfile } from "@/lib/types";

interface SystemMetrics {
  os: string;
  cpu: string;
  memory: string;
  disk: string;
  uptime: string;
  hostname: string;
}

interface CommandSnippet {
  id: string;
  name: string;
  command: string;
  description?: string;
}

type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface SshTab {
  id: string; // typically connection name as unique id
  title: string;
  connection: ConnectionProfile;
  status: ConnectionStatus;
  terminalOutput: string[];
  selectedSnippetId: string;
  customCommand: string;
  executing: boolean;
}

export default function SSHClientPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState(pathname);

  // Connection state
  const [connectionProfiles, setConnectionProfiles] = useState<
    ConnectionProfile[]
  >([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [selectedSSHConnection, setSelectedSSHConnection] =
    useState<ConnectionProfile | null>(null);

  // Tabs state
  const [tabs, setTabs] = useState<SshTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // System metrics state
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    os: "--",
    cpu: "-- %",
    memory: "--",
    disk: "--",
    uptime: "--",
    hostname: "--",
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Command execution state
  const [commandSnippets, setCommandSnippets] = useState<CommandSnippet[]>([
    {
      id: "1",
      name: "Check disk usage",
      command: "df -h",
      description: "Display filesystem disk space usage",
    },
    {
      id: "2",
      name: "List processes",
      command: "ps aux",
      description: "Show running processes",
    },
    {
      id: "3",
      name: "System info",
      command: "uname -a",
      description: "Display system information",
    },
    {
      id: "4",
      name: "Memory usage",
      command: "free -h",
      description: "Display memory usage",
    },
    {
      id: "5",
      name: "Network connections",
      command: "netstat -tuln",
      description: "Show network connections",
    },
  ]);
  const [selectedSnippet, setSelectedSnippet] = useState(""); // kept for backward compatibility (unused in tabbed mode)
  const [customCommand, setCustomCommand] = useState(""); // kept for backward compatibility (unused in tabbed mode)
  const [executing, setExecuting] = useState(false); // kept for backward compatibility (unused in tabbed mode)

  // Terminal output state
  // Deprecated in favor of per-tab output but used for empty state
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "SSH Client ready...",
    "Select a connection to begin.",
  ]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManageSnippetsOpen, setIsManageSnippetsOpen] = useState(false);
  // Manage Snippets: Create state
  const [isCreateSnippetOpen, setIsCreateSnippetOpen] = useState(false);
  const [createFormLoading, setCreateFormLoading] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    description: string;
    commands: string;
  }>({
    name: "",
    description: "",
    commands: "",
  });
  const [isCloseAllOpen, setIsCloseAllOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [graylogRules, setGraylogRules] = useState<
    Array<{
      id: number;
      key_word: string;
      action: string;
      active: number;
      rules_mode?: string;
      enable_link?: number;
      url?: string;
      extra_attributes?: string;
      description?: string;
    }>
  >([]);

  useEffect(() => {
    console.log("🚀 SSH Client page mounted, fetching data...");
    loadInitialData();
    loadSnippets();
    loadGraylogRules(false);
  }, []);

  // When active tab changes, fetch metrics for that tab if connected
  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab && tab.status === "connected") {
      fetchAndSetMetrics(tab.connection.name, tab.connection.host).catch(
        () => {}
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  // Fetch graylog rules from backend and cache locally
  const loadGraylogRules = async (showInactive = false) => {
    try {
      const res = await rnaApi.getGraylogRules(showInactive);
      if (res.success && res.data) {
        setGraylogRules(res.data.rules || []);
      }
    } catch (e) {
      // ignore; terminal will still render without rule styling
    }
  };

  // Parse CSS declarations like "background-color: #ffcccc; color: #990000;" into style object
  const parseCssToStyle = (css: string): React.CSSProperties => {
    const style: React.CSSProperties = {};
    css
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((decl) => {
        const [prop, val] = decl.split(":").map((p) => p && p.trim());
        if (!prop || !val) return;
        const camel = prop.replace(/-([a-z])/g, (_, c) =>
          c.toUpperCase()
        ) as keyof React.CSSProperties;
        // @ts-ignore dynamic assignment
        style[camel] = val;
      });
    return style;
  };

  // Determine rule-based style for a line
  const getLineStyle = (line: string): React.CSSProperties | undefined => {
    if (!graylogRules || graylogRules.length === 0) return undefined;
    for (const rule of graylogRules) {
      if (rule.active === 0) continue;
      const pattern = rule.key_word || "";
      if (!pattern) continue;
      try {
        const re = new RegExp(pattern, "i");
        if (re.test(line)) {
          return parseCssToStyle(rule.action || "");
        }
      } catch {
        // invalid regex; skip
      }
    }
    return undefined;
  };

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const connectionResponse = await rnaApi.getConnectionProfiles();
      if (connectionResponse.success && connectionResponse.data) {
        const sshConnections = connectionResponse.data.filter(
          (profile) => profile.connection_type === "SSH"
        );
        setConnectionProfiles(sshConnections);
        // Do not auto-select any SSH connection on load
        // Default-expand categories that contain SSH connections
        try {
          const cats = sshConnections.reduce<Record<string, boolean>>(
            (acc, p: any) => {
              const cat = p.category || "Uncategorized";
              acc[cat] = true;
              return acc;
            },
            {}
          );
          setExpandedCategories(cats);
        } catch {}

        const loadSnippets = async () => {
          try {
            const res = await rnaApi.sshClientSnippets();
            if (res.success && res.data) {
              const items = (res.data.results || []).map((s: any) => ({
                id: String(s.id),
                name: s.name,
                command: s.commands,
                description: s.description,
              }));
              setCommandSnippets(items);
            }
          } catch (e) {
            // silently ignore; user can still use custom command
          }
        };
      } else {
        setError(
          connectionResponse.error || "Failed to load SSH connection profiles."
        );
      }
    } catch (err) {
      console.error("❌ Failed to load connection profiles:", err);
      const errorMsg = "Failed to load SSH connection profiles.";
      setError(errorMsg);
      toast({
        title: "Failed to Load Connections",
        description: errorMsg,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  // Load available SSH snippets from API
  const loadSnippets = async () => {
    try {
      const res = await rnaApi.sshClientSnippets();
      if (res.success && res.data) {
        const items = (res.data.results || []).map((s: any) => ({
          id: String(s.id),
          name: s.name,
          command: s.commands,
          description: s.description,
        }));
        setCommandSnippets(items);
      }
    } catch (e) {
      // silently ignore; user can still use custom command
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setActiveSection(href);
  };

  const handleSSHConnectionSelect = (connectionName: string) => {
    const connection = connectionProfiles.find(
      (profile) => profile.name === connectionName
    );
    if (!connection) return;

    setSelectedConnection(connectionName);
    setSelectedSSHConnection(connection);

    // Helper to convert 1 -> A, 2 -> B, ... 26 -> Z, 27 -> AA, etc.
    const numberToLetters = (num: number) => {
      let n = num;
      let letters = "";
      while (n > 0) {
        const rem = (n - 1) % 26;
        letters = String.fromCharCode(65 + rem) + letters;
        n = Math.floor((n - 1) / 26);
      }
      return letters;
    };

    let createdTabId = "";
    setTabs((prev) => {
      const countForConn = prev.filter(
        (t) => t.connection.name === connection.name
      ).length;
      const suffix = numberToLetters(countForConn + 1); // A, B, C...
      const newTabId = `${connection.name}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const newTab: SshTab = {
        id: newTabId,
        title: `${connection.name} (${suffix})`,
        connection,
        status: "connecting",
        terminalOutput: [
          "SSH Client ready...",
          `Connecting to ${connection.name}...`,
        ],
        selectedSnippetId: "",
        customCommand: "",
        executing: false,
      };
      setActiveTabId(newTab.id);
      createdTabId = newTabId;
      return [...prev, newTab];
    });

    // Establish connection via API
    (async () => {
      try {
        const resp = await rnaApi.sshClientEstablish(connection.name);
        if (resp.success) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === createdTabId
                ? {
                    ...t,
                    status: "connected",
                    terminalOutput: [
                      ...t.terminalOutput,
                      `Connection established to ${
                        connection.host || "remote server"
                      }!`,
                    ],
                  }
                : t
            )
          );
          // Populate metrics immediately after connection
          try {
            await fetchAndSetMetrics(connection.name, connection.host);
          } catch {}
        } else {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === createdTabId
                ? {
                    ...t,
                    status: "disconnected",
                    terminalOutput: [
                      ...t.terminalOutput,
                      `Error: ${
                        resp.error || "Failed to establish connection"
                      }`,
                    ],
                  }
                : t
            )
          );
          setError(resp.error || "Failed to establish connection.");
        }
      } catch (e: any) {
        const errorMsg = e?.message || "Failed to establish connection.";
        setTabs((prev) =>
          prev.map((t) =>
            t.id === createdTabId
              ? {
                  ...t,
                  status: "disconnected",
                  terminalOutput: [...t.terminalOutput, `Error: ${errorMsg}`],
                }
              : t
          )
        );
        setError(errorMsg);
        toast({
          title: "Connection Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    })();
  };

  const closeTab = (tabId: string) => {
    setTabs((prev) => {
      const toClose = prev.find((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(next.length ? next[next.length - 1].id : null);
        setSelectedSSHConnection(
          next.length ? next[next.length - 1].connection : null
        );
      }
      // Conditionally close backend connection only if no other tab uses it
      if (toClose) {
        const stillUsed = next.some(
          (t) => t.connection.name === toClose.connection.name
        );
        if (!stillUsed) {
          rnaApi.sshClientClose(toClose.connection.name).catch(() => {});
        }
      }
      return next;
    });
  };

  const closeAllTabs = () => {
    // Close unique connections
    const uniqueConns = Array.from(new Set(tabs.map((t) => t.connection.name)));
    uniqueConns.forEach((cn) => rnaApi.sshClientClose(cn).catch(() => {}));
    setTabs([]);
    setActiveTabId(null);
    setSelectedSSHConnection(null);
  };

  const refreshMetrics = async () => {
    if (!selectedSSHConnection) return;

    setRefreshing(true);
    try {
      await fetchAndSetMetrics(
        selectedSSHConnection.name,
        selectedSSHConnection.host
      );
      toast({
        title: "Metrics Refreshed",
        description: "System metrics have been updated successfully.",
        variant: "default",
      });
    } catch (err: any) {
      toast({
        title: "Refresh Failed",
        description: err?.message || "Failed to refresh system metrics.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Helper: fetch server-status and map to our SystemMetrics state
  const fetchAndSetMetrics = async (
    connectionName: string,
    hostFallback?: string
  ) => {
    const res = await rnaApi.sshClientServerStatus(connectionName, [
      "cpu",
      "memory",
      "disk",
      "uptime",
      "hostname",
      "os",
    ]);
    if (!res.success || !res.data)
      throw new Error(res.error || "Failed to get server status");
    const d: any = res.data;
    // CPU mapping: prefer aggregate percent if provided, else compute or fallback to user percent
    const cpuPercent =
      typeof d.cpu_percent !== "undefined"
        ? `${d.cpu_percent}%`
        : typeof d.cpu_user !== "undefined"
        ? `${d.cpu_user}%`
        : "-- %";
    // Memory: backend returns mem_* likely in MB. If very large numbers, assume bytes.
    let mem = "--";
    if (
      typeof d.mem_used !== "undefined" &&
      typeof d.mem_total !== "undefined"
    ) {
      const used = Number(d.mem_used);
      const total = Number(d.mem_total);
      if (used > 1024 * 1024 || total > 1024 * 1024) {
        // Treat as bytes
        mem = `${(used / 1024 ** 2).toFixed(1)}MB / ${(
          total /
          1024 ** 2
        ).toFixed(1)}MB`;
      } else {
        // Treat as MB
        mem = `${used}MB / ${total}MB`;
      }
    } else if (d.memory) {
      mem = d.memory;
    }
    // Disk: bytes to GB plus percent if available
    let disk = "--";
    if (
      typeof d.disk_used !== "undefined" &&
      typeof d.disk_total !== "undefined"
    ) {
      const usedGb = (Number(d.disk_used) / 1024 ** 3).toFixed(0);
      const totalGb = (Number(d.disk_total) / 1024 ** 3).toFixed(0);
      const pct =
        typeof d.disk_percent !== "undefined" ? ` (${d.disk_percent}%)` : "";
      disk = `${usedGb}GB / ${totalGb}GB${pct}`;
    } else if (d.disk) {
      disk = d.disk;
    }
    // Uptime and Hostname
    const uptime = d.uptime || d.server_time || "--";
    const hostname = d.hostname || d.host || hostFallback || "--";
    // OS string
    const os = d.os || d.platform || "--";
    setSystemMetrics({
      os,
      cpu: cpuPercent,
      memory: mem,
      disk,
      uptime,
      hostname,
    });
  };

  const executeCommand = async (tabIdParam?: string) => {
    const currentTabId = tabIdParam || activeTabId;
    if (!currentTabId) {
      setError("Please select an SSH connection first.");
      return;
    }

    const tab = tabs.find((t) => t.id === currentTabId);
    if (!tab) return;

    const commandToExecute = tab.customCommand;

    if (!commandToExecute.trim()) {
      setError("Please select a snippet or enter a command to execute.");
      return;
    }

    setError(null);
    setTabs((prev) =>
      prev.map((t) =>
        t.id === currentTabId
          ? {
              ...t,
              executing: true,
              terminalOutput: [
                ...t.terminalOutput,
                `$ ${commandToExecute}`,
                "Executing command...",
              ],
            }
          : t
      )
    );

    try {
      const res = await rnaApi.sshClientExecute(
        tab.connection.name,
        tab.customCommand
      );
      if (!res.success || !res.data?.success) {
        throw new Error(
          res.error || res.data?.error || "Command execution failed"
        );
      }
      const outputLines: string[] = [res.data.output || "(no output)", ""];
      setTabs((prev) =>
        prev.map((t) =>
          t.id === currentTabId
            ? { ...t, terminalOutput: [...t.terminalOutput, ...outputLines] }
            : t
        )
      );
      toast({
        title: "Command Executed",
        description: "Command executed successfully.",
        variant: "default",
      });
    } catch (err: any) {
      const errorMsg = err?.message || "Command execution failed.";
      setTabs((prev) =>
        prev.map((t) =>
          t.id === currentTabId
            ? {
                ...t,
                terminalOutput: [...t.terminalOutput, `Error: ${errorMsg}`],
              }
            : t
        )
      );
      setError(errorMsg);
      toast({
        title: "Command Execution Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === currentTabId ? { ...t, executing: false } : t
        )
      );
    }
  };

  const clearTerminal = (tabIdParam?: string) => {
    const currentTabId = tabIdParam || activeTabId;
    if (!currentTabId) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === currentTabId ? { ...t, terminalOutput: [] } : t
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <Sidebar
            activeSection={activeSection}
            onNavigate={handleNavigation}
          />
          <div className="flex-1 max-w-full overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Jalin App</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">SSH Client</span>
              </div>
            </div>
            <div className="p-6 max-w-full">
              <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-blue-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-blue-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />

        <div className="flex-1 max-w-full overflow-hidden">
          {/* Header with Breadcrumb */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Jalin App</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">SSH Client</span>
              </div>
              <div className="flex items-center space-x-2"></div>
            </div>
          </div>

          <div className="p-6 max-w-full">
            {/* Hero Section */}
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                SSH Client
              </h1>
              <p className="text-gray-600">
                Connect to and manage remote servers via SSH connections with
                real-time monitoring.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Main Content Layout */}
            <div className="flex gap-6">
              {/* Connections Sidebar */}
              <Card className="w-80 shadow-sm border-0 bg-white rounded-3xl flex-shrink-0">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Server className="h-5 w-5 text-blue-600" />
                      SSH Connections
                    </CardTitle>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-2xl bg-transparent"
                        onClick={loadInitialData}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {connectionProfiles.length === 0 ? (
                        <div className="text-center py-8">
                          <Server className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            No SSH connections available
                          </p>
                        </div>
                      ) : (
                        // Group by category and render collapsible sections
                        Object.entries(
                          connectionProfiles.reduce<
                            Record<string, typeof connectionProfiles>
                          >((acc, p) => {
                            const cat = p.category || "Uncategorized";
                            acc[cat] = acc[cat] || [];
                            acc[cat].push(p);
                            return acc;
                          }, {})
                        ).map(([category, profiles]) => (
                          <div
                            key={category}
                            className="border border-gray-200 rounded-2xl overflow-hidden"
                          >
                            <button
                              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
                              onClick={() =>
                                setExpandedCategories((prev) => ({
                                  ...prev,
                                  [category]: !prev[category],
                                }))
                              }
                            >
                              <span className="text-sm font-semibold text-gray-700 truncate">
                                {category}
                              </span>
                              <span className="text-xs text-gray-500">
                                {expandedCategories[category] ? "Hide" : "Show"}
                              </span>
                            </button>
                            {expandedCategories[category] && (
                              <div className="divide-y divide-gray-100">
                                {profiles.map((connection) => (
                                  <div
                                    key={connection.name}
                                    onClick={() =>
                                      handleSSHConnectionSelect(connection.name)
                                    }
                                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                      selectedSSHConnection?.name ===
                                      connection.name
                                        ? "bg-blue-50"
                                        : "hover:bg-gray-50"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div
                                        className={`w-2.5 h-2.5 rounded-full ${
                                          selectedSSHConnection?.name ===
                                          connection.name
                                            ? "bg-green-500"
                                            : "bg-gray-400"
                                        }`}
                                      />
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">
                                          {connection.name}
                                        </span>
                                        <div
                                          className="text-xs text-gray-500 truncate max-w-[12rem]"
                                          title={
                                            connection.host || "SSH Server"
                                          }
                                        >
                                          {connection.host || "SSH Server"}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {connection.connection_type}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0 space-y-6">
                {/* Tabs bar */}
                <div className="flex items-center justify-between">
                  <Tabs
                    value={activeTabId || undefined}
                    onValueChange={(val) => {
                      setActiveTabId(val);
                      const t = tabs.find((tb) => tb.id === val);
                      setSelectedSSHConnection(t ? t.connection : null);
                    }}
                    className="w-full"
                  >
                    <TabsList className="rounded-2xl bg-white border border-gray-200 p-1 overflow-x-auto">
                      {tabs.length === 0 && (
                        <div className="px-3 py-1 text-sm text-gray-500">
                          No connections open
                        </div>
                      )}
                      {tabs.map((t) => (
                        <div key={t.id} className="flex items-center">
                          <TabsTrigger
                            value={t.id}
                            className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                          >
                            <span
                              className={`w-2 h-2 rounded-full inline-block mr-2 ${
                                t.status === "connected"
                                  ? "bg-green-500"
                                  : t.status === "connecting"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                            />
                            {t.title}
                          </TabsTrigger>
                          <button
                            className="ml-2 mr-2 text-gray-400 hover:text-gray-700"
                            onClick={() => closeTab(t.id)}
                            aria-label={`Close ${t.title}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </TabsList>
                  </Tabs>
                  {tabs.length > 0 && (
                    <div className="flex items-center ml-2 space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsManageSnippetsOpen(true)}
                        className="rounded-full"
                      >
                        <Code className="h-4 w-4 mr-2" />
                        Manage Snippets
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-transparent"
                        onClick={() => setIsCloseAllOpen(true)}
                      >
                        Close All
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tabs content */}
                {tabs.map((t) => (
                  <Tabs
                    key={t.id}
                    value={activeTabId || undefined}
                    className="w-full"
                  >
                    <TabsContent value={t.id}>
                      {/* Connection Status and System Metrics */}
                      <Card className="shadow-sm border-0 bg-white rounded-3xl">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  t.status === "connected"
                                    ? "bg-green-500"
                                    : t.status === "connecting"
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                              />
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800">
                                  {t.connection.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Host: {t.connection.host || "SSH Server"} |
                                  Type: {t.connection.connection_type}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-2">
                                <Label className="text-sm text-gray-600">
                                  Auto Refresh
                                </Label>
                                <Switch
                                  checked={autoRefresh}
                                  onCheckedChange={setAutoRefresh}
                                  className="data-[state=checked]:bg-green-600"
                                />
                              </div>
                              <Button
                                variant="outline"
                                onClick={refreshMetrics}
                                disabled={refreshing}
                                className="rounded-2xl bg-transparent"
                              >
                                {refreshing ? (
                                  <Activity className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                Refresh
                              </Button>
                            </div>
                          </div>

                          {/* System Metrics Grid (6 in a row) */}
                          <div className="grid grid-cols-6 gap-4 mb-6">
                            <div className="text-center">
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 mb-2 border border-blue-100">
                                <Monitor className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                                <div
                                  className="text-sm font-medium text-gray-800 leading-tight truncate max-w-[12rem] mx-auto"
                                  title={systemMetrics.os}
                                >
                                  {systemMetrics.os}
                                </div>
                              </div>
                              <span className="text-xs text-gray-600 font-medium">
                                OS
                              </span>
                            </div>
                            <div className="text-center">
                              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 mb-2 border border-green-100">
                                <Cpu className="h-6 w-6 text-green-600 mx-auto mb-2" />
                                <div
                                  className="text-sm font-medium text-gray-800 leading-tight truncate max-w-[12rem] mx-auto"
                                  title={systemMetrics.cpu}
                                >
                                  {systemMetrics.cpu}
                                </div>
                              </div>
                              <span className="text-xs text-gray-600 font-medium">
                                CPU
                              </span>
                            </div>
                            <div className="text-center">
                              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-4 mb-2 border border-purple-100">
                                <MemoryStick className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                                <div
                                  className="text-sm font-medium text-gray-800 leading-tight truncate max-w-[12rem] mx-auto"
                                  title={systemMetrics.memory}
                                >
                                  {systemMetrics.memory}
                                </div>
                              </div>
                              <span className="text-xs text-gray-600 font-medium">
                                Memory
                              </span>
                            </div>
                            <div className="text-center">
                              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 mb-2 border border-orange-100">
                                <HardDrive className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                                <div
                                  className="text-sm font-medium text-gray-800 leading-tight truncate max-w-[12rem] mx-auto"
                                  title={systemMetrics.disk}
                                >
                                  {systemMetrics.disk}
                                </div>
                              </div>
                              <span className="text-xs text-gray-600 font-medium">
                                Disk
                              </span>
                            </div>
                            <div className="text-center">
                              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-4 mb-2 border border-teal-100">
                                <Clock className="h-6 w-6 text-teal-600 mx-auto mb-2" />
                                <div
                                  className="text-sm font-medium text-gray-800 leading-tight truncate max-w-[12rem] mx-auto"
                                  title={systemMetrics.uptime}
                                >
                                  {systemMetrics.uptime}
                                </div>
                              </div>
                              <span className="text-xs text-gray-600 font-medium">
                                Uptime
                              </span>
                            </div>
                            <div className="text-center">
                              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-4 mb-2 border border-rose-100">
                                <Info className="h-6 w-6 text-rose-600 mx-auto mb-2" />
                                <div
                                  className="text-sm font-medium text-gray-800 leading-tight truncate max-w-[12rem] mx-auto"
                                  title={systemMetrics.hostname}
                                >
                                  {systemMetrics.hostname}
                                </div>
                              </div>
                              <span className="text-xs text-gray-600 font-medium">
                                Hostname
                              </span>
                            </div>
                          </div>

                          {/* Command Execution */}
                          <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                              <div className="flex-1">
                                <Select
                                  value={t.selectedSnippetId}
                                  onValueChange={(val) =>
                                    setTabs((prev) =>
                                      prev.map((tb) => {
                                        if (tb.id !== t.id) return tb;
                                        const snip = commandSnippets.find(
                                          (s) => s.id === val
                                        );
                                        return {
                                          ...tb,
                                          selectedSnippetId: val,
                                          customCommand:
                                            snip?.command || tb.customCommand,
                                        };
                                      })
                                    )
                                  }
                                >
                                  <SelectTrigger className="rounded-2xl border-gray-200 text-left">
                                    <SelectValue placeholder="Select a snippet or command to execute" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {commandSnippets.map((snippet) => (
                                      <SelectItem
                                        key={snippet.id}
                                        value={snippet.id}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium truncate max-w-[10rem]">
                                            {snippet.name}
                                          </span>
                                          <span className="text-xs text-gray-500 font-mono truncate max-w-[12rem]">
                                            | {snippet.command}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                onClick={() => executeCommand(t.id)}
                                disabled={t.executing}
                                className="bg-blue-600 hover:bg-blue-700 rounded-2xl px-6"
                              >
                                {t.executing ? (
                                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4 mr-2" />
                                )}
                                Send
                              </Button>
                            </div>

                            {/* Custom Command Input */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Custom command
                              </label>
                              <textarea
                                value={t.customCommand}
                                onChange={(e) =>
                                  setTabs((prev) =>
                                    prev.map((tb) =>
                                      tb.id === t.id
                                        ? {
                                            ...tb,
                                            customCommand: e.target.value,
                                          }
                                        : tb
                                    )
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (
                                    (e.ctrlKey || e.metaKey) &&
                                    e.key === "Enter"
                                  ) {
                                    e.preventDefault();
                                    executeCommand(t.id);
                                  }
                                }}
                                className="w-full rounded-2xl border border-gray-200 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Type your command here... Press Ctrl/⌘ + Enter to execute"
                              />
                            </div>

                            {/* Action Buttons removed per request */}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Terminal Output */}
                      <Card className="shadow-sm mt-4 border-0 bg-white rounded-3xl">
                        <CardContent className="p-0">
                          <div className="bg-black text-green-400 font-mono text-sm rounded-3xl overflow-hidden">
                            <div className="flex items-center justify-between bg-gray-800 px-4 py-3 border-b border-gray-700">
                              <div className="flex items-center space-x-2">
                                <Terminal className="h-4 w-4 text-gray-300" />
                                <span className="text-gray-300 font-medium">
                                  Terminal Output
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs text-gray-400 border-gray-600"
                                >
                                  {t.connection.name}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="relative">
                                  <Search className="h-3 w-3 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
                                  <input
                                    type="text"
                                    placeholder="Search output..."
                                    className="bg-gray-700 text-gray-300 text-xs rounded-lg pl-7 pr-3 py-1.5 w-40 border border-gray-600 focus:border-gray-500 focus:outline-none placeholder-gray-500"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => clearTerminal(t.id)}
                                  className="text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Clear
                                </Button>
                              </div>
                            </div>
                            <div className="p-4 min-h-48 max-h-[70vh] resize-y overflow-auto">
                              <div>
                                {t.terminalOutput.map((line, index) =>
                                  line.trim() === "" ? (
                                    <div key={index} className="h-3" />
                                  ) : (
                                    <div
                                      key={index}
                                      className={`whitespace-pre-wrap mb-1`}
                                      style={getLineStyle(line)}
                                    >
                                      {line}
                                    </div>
                                  )
                                )}
                                {t.terminalOutput.length === 0 && (
                                  <div className="text-gray-500 italic">
                                    Terminal output will appear here...
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                ))}

                {tabs.length === 0 && (
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6 text-sm text-gray-600">
                      Please select a connection from the left to start using
                      the SSH Client.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manage Snippets Modal */}
      <Dialog
        open={isManageSnippetsOpen}
        onOpenChange={setIsManageSnippetsOpen}
      >
        <DialogContent className="max-w-4xl sm:max-w-5xl rounded-3xl h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Command Snippets</DialogTitle>
            <DialogDescription>
              Create and manage reusable command snippets for quick execution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Command Snippets
                  </span>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 rounded-full"
                    onClick={() => setIsCreateSnippetOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Snippet
                  </Button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {commandSnippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {snippet.name}
                      </div>
                      <div className="text-sm text-gray-600 font-mono">
                        {snippet.command}
                      </div>
                      {snippet.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {snippet.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-transparent"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 rounded-full bg-transparent"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Snippet Modal */}
      <Dialog open={isCreateSnippetOpen} onOpenChange={setIsCreateSnippetOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create SSH Snippet</DialogTitle>
            <DialogDescription>
              Add a reusable command snippet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-snip-name">Name</Label>
              <input
                id="create-snip-name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., Disk Information"
                className="mt-1 w-full rounded-full border border-gray-300 p-2 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="create-snip-desc">Description</Label>
              <input
                id="create-snip-desc"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Optional description"
                className="mt-1 w-full rounded-full border border-gray-300 p-2 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="create-snip-cmds">Commands</Label>
              <textarea
                id="create-snip-cmds"
                value={createForm.commands}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, commands: e.target.value }))
                }
                rows={6}
                placeholder="df -h\nfree -m"
                className="mt-1 w-full rounded-2xl border border-gray-300 p-3 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateSnippetOpen(false)}
              className="rounded-full border-gray-300"
              disabled={createFormLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!createForm.name.trim() || !createForm.commands.trim()) {
                  setError("Name and commands are required");
                  return;
                }
                try {
                  setCreateFormLoading(true);
                  const res = await rnaApi.sshClientSnippetUpsert({
                    name: createForm.name.trim(),
                    description: createForm.description.trim(),
                    commands: createForm.commands,
                  });
                  if (res.success) {
                    setIsCreateSnippetOpen(false);
                    setCreateForm({ name: "", description: "", commands: "" });
                    await loadSnippets();
                    toast({
                      title: "Snippet Created",
                      description: "Your SSH snippet has been saved.",
                      variant: "default",
                    });
                  } else {
                    setError(res.error || "Failed to create snippet");
                  }
                } catch (e: any) {
                  const errorMsg =
                    e?.message || "Network error while creating snippet";
                  setError(errorMsg);
                  toast({
                    title: "Failed to Create Snippet",
                    description: errorMsg,
                    variant: "destructive",
                  });
                } finally {
                  setCreateFormLoading(false);
                }
              }}
              disabled={createFormLoading}
              className="bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              {createFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Snippet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close All Tabs Confirmation Modal */}
      <Dialog open={isCloseAllOpen} onOpenChange={setIsCloseAllOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Close All Tabs</DialogTitle>
            <DialogDescription>
              This will close all SSH tabs. Unsaved work will be lost. Are you
              sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => setIsCloseAllOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-2xl bg-red-600 hover:bg-red-700"
              onClick={() => {
                closeAllTabs();
                setIsCloseAllOpen(false);
              }}
            >
              Close All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
