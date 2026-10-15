"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  History,
  Settings,
  Database,
  Terminal,
  Clock,
  FileText,
  Activity,
  ChevronRight,
  AlertCircle,
  Save,
  Trash2,
  Calendar,
  Copy,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
// Using native date input; no popover calendar

import { Sidebar } from "@/components/layout/sidebar";
import type { ConnectionProfile } from "@/lib/types";
import { rnaApi } from "@/lib/api"; // Import rnaApi for API calls

interface LogExtraction {
  id: string;
  uuid: string;
  extracted_at: string;
  status: "success" | "error" | "pending";
  file_count: number;
  total_lines: number;
  execution_time: number;
  error_message?: string;
  download_path?: string;
}

interface SettingsForm {
  connectionTimeout: number;
  retryCount: number;
  contextBefore: number;
  contextAfter: number;
  currentPath: string;
  backupPath: string;
  fileNamePattern: string;
  downloadPath: string;
}

export default function LogExtractorPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState(pathname);

  // Tab state
  const [activeTab, setActiveTab] = useState<
    "extractor" | "settings" | "history"
  >("extractor");

  // Connection state
  const [connectionProfiles, setConnectionProfiles] = useState<
    ConnectionProfile[]
  >([]);
  const [selectedConnection, setSelectedConnection] = useState("");

  // Log extraction state
  const [uuid, setUuid] = useState("");
  const [logDate, setLogDate] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const [compressFiles, setCompressFiles] = useState<boolean>(true);
  const [taskId, setTaskId] = useState<string>("");
  const [convenienceUrls, setConvenienceUrls] = useState<{
    stream_url?: string;
    download_url?: string;
  } | null>(null);
  const [statusState, setStatusState] = useState<null | {
    state: "PENDING" | "SUCCESS" | "FAILURE" | "CANCELED";
    status: string;
    progress: number;
    files_found: number;
    result_files: Array<
      string | { md5?: string; name?: string; path?: string }
    >;
    ssh_connection?: string;
    log_entries?: string[];
    created_at?: string;
    expires_at?: string;
    context_before?: number;
    context_after?: number;
  }>(null);
  const pollerRef = useRef<NodeJS.Timeout | null>(null);
  const tailPollerRef = useRef<NodeJS.Timeout | null>(null);
  const logDateInputRef = useRef<HTMLInputElement | null>(null);
  const [logExtractions, setLogExtractions] = useState<LogExtraction[]>([]);
  const [selectedExtraction, setSelectedExtraction] =
    useState<LogExtraction | null>(null);
  const [tailIndex, setTailIndex] = useState(0);
  const [tailEntries, setTailEntries] = useState<string[]>([]);
  // Local listing (History tab)
  const [localPath, setLocalPath] = useState<string>("");
  const [selectedLocalPath, setSelectedLocalPath] = useState<string>("");
  const [selectedLocalFile, setSelectedLocalFile] = useState<{
    name: string;
    path: string;
    is_dir: boolean;
    size: number;
    modified_at: string;
  } | null>(null);
  const [localEntries, setLocalEntries] = useState<
    Array<{
      name: string;
      path: string;
      is_dir: boolean;
      size: number;
      modified_at: string;
    }>
  >([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<SettingsForm>({
    connectionTimeout: 30,
    retryCount: 3,
    contextBefore: 100,
    contextAfter: 100,
    currentPath: "/app/jalin_renaissance/",
    backupPath: "/app/renaissance_log_backup_jalin/",
    fileNamePattern: "renaissance{date}*.txt",
    downloadPath: "app/logs",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  const CACHE_KEY = "jalin_log_extractor_history";
  const SETTINGS_KEY = "jalin_log_extractor_settings_v1";
  const SETTINGS_COOKIE = "jalin_log_extractor_settings_v1";

  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
      new RegExp(
        "(?:^|; )" +
          name.replace(/([.$?*|{}()\[\]\\/+^])/g, "\\$1") +
          "=([^;]*)"
      )
    );
    return match ? decodeURIComponent(match[1]) : null;
  };

  const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === "undefined") return;
    const maxAge = days * 24 * 60 * 60;
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  };

  const loadCachedSettings = useCallback(() => {
    try {
      const cookieVal = getCookie(SETTINGS_COOKIE);
      if (cookieVal) {
        const cachedSettings = JSON.parse(cookieVal);
        if (cachedSettings && typeof cachedSettings === "object") {
          console.log("⚙️ Loading settings from cookie", cachedSettings);
          setSettings((prev) => ({ ...prev, ...cachedSettings }));
          setSettingsHydrated(true);
          return true;
        }
      }
      const rawSettings =
        typeof window !== "undefined"
          ? window.localStorage.getItem(SETTINGS_KEY)
          : null;
      if (rawSettings) {
        const cachedSettings = JSON.parse(rawSettings);
        if (cachedSettings && typeof cachedSettings === "object") {
          console.log("⚙️ Loading settings from localStorage", cachedSettings);
          setSettings((prev) => ({ ...prev, ...cachedSettings }));
          setSettingsHydrated(true);
          return true;
        }
      }
    } catch (e) {
      console.warn("Failed to parse cached settings", e);
    }
    setSettingsHydrated(true);
    return false;
  }, []);

  useEffect(() => {
    console.log("🚀 Log Extractor page mounted, fetching data...");
    loadInitialData();
    // Prefill from query params if provided
    try {
      const qUuid = searchParams?.get("uuid") || "";
      const qDate = searchParams?.get("date") || "";
      if (qUuid) setUuid(qUuid);
      if (qDate) {
        // Convert dd-mm-yyyy to yyyy-MM-dd for input type=date
        const m = qDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (m) {
          const formatted = `${m[3]}-${m[2]}-${m[1]}`;
          setLogDate(formatted);
        }
      }
      if (qUuid || qDate) setActiveTab("extractor");
    } catch {}
    // Load cached history
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(CACHE_KEY)
          : null;
      if (raw) {
        const cached: LogExtraction[] = JSON.parse(raw);
        if (Array.isArray(cached)) {
          setLogExtractions(cached);
        }
      }
    } catch (e) {
      console.warn("Failed to parse cached history", e);
    }

    // Load cached settings (cookie takes priority, fallback to localStorage)
    loadCachedSettings();
  }, []);

  // Auto-save settings to cache whenever they change so extraction uses latest values
  useEffect(() => {
    if (!settingsHydrated) return;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }
      // also persist to cookie for server-assisted/state continuity
      setCookie(SETTINGS_COOKIE, JSON.stringify(settings));
    } catch (e) {
      console.warn("Failed to cache settings", e);
    }
  }, [settings, settingsHydrated]);

  // Keep localPath in sync with settings.downloadPath
  useEffect(() => {
    if (settings?.downloadPath && settings.downloadPath !== localPath) {
      setLocalPath(settings.downloadPath);
    }
  }, [settings.downloadPath]);

  const listLocalFiles = async () => {
    if (!localPath || !localPath.trim()) {
      setLocalError("Path is required");
      return;
    }
    setLocalLoading(true);
    setLocalError(null);
    try {
      const res = await rnaApi.sshExtractorLocalList(localPath, "*.txt");
      if (res.success && res.data) {
        setLocalEntries(res.data.data.entries || []);
      } else {
        setLocalError(res.error || "Failed to list local files");
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    } finally {
      setLocalLoading(false);
    }
  };

  // Auto list when switching to History tab or when downloadPath changes
  useEffect(() => {
    if (activeTab === "history" && localPath) {
      listLocalFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, localPath]);

  const readLocalFile = async (
    path: string,
    fileEntry?: {
      name: string;
      path: string;
      is_dir: boolean;
      size: number;
      modified_at: string;
    }
  ) => {
    setSelectedLocalPath(path);
    if (fileEntry) {
      setSelectedLocalFile(fileEntry);
    }
    setFileLoading(true);
    setFileError(null);
    setFilePreview("");
    try {
      const res = await rnaApi.sshExtractorLocalRead(path, 0, 1048576);
      if (res.success && res.data) {
        const content = res.data.data.content_b64 ?? "";
        if (!content) {
          setFilePreview("");
        } else {
          // Some servers may already send plain text in this field; attempt base64 decode first.
          let text = "";
          try {
            let binaryStr: string;
            if (typeof window !== "undefined") {
              binaryStr = window.atob(content);
            } else {
              // Node fallback
              binaryStr = Buffer.from(content, "base64").toString("binary");
            }
            const bytes = new Uint8Array(
              binaryStr.split("").map((c) => c.charCodeAt(0))
            );
            // Decode as UTF-8
            const decoder =
              typeof TextDecoder !== "undefined"
                ? new TextDecoder("utf-8")
                : null;
            text = decoder
              ? decoder.decode(bytes)
              : String.fromCharCode(...bytes);
          } catch {
            // Not valid base64, treat as plain text
            text = content;
          }
          setFilePreview(text);
        }
      } else {
        setFileError(res.error || "Failed to read file");
      }
    } catch (e) {
      setFileError(e instanceof Error ? e.message : String(e));
    } finally {
      setFileLoading(false);
    }
  };

  const downloadLocalFile = async () => {
    if (!selectedLocalFile || !localPath) {
      toast({
        title: "No file selected",
        description: "Please select a file to download.",
        variant: "destructive",
      });
      return;
    }

    setDownloading(true);
    try {
      const res = await rnaApi.sshExtractorLocalDownload(
        selectedLocalFile.name,
        localPath
      );
      if (res.success && res.data) {
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = selectedLocalFile.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: "Download Successful",
          description: `File ${selectedLocalFile.name} downloaded successfully.`,
        });
      } else {
        toast({
          title: "Download Failed",
          description: res.error || "Failed to download file",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Download Failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Persist history to cache whenever it changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(logExtractions));
      }
    } catch (e) {
      console.warn("Cannot save log extractor cache", e);
    }
  }, [logExtractions]);

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
      } else {
        setError(
          connectionResponse.error || "Failed to load connection profiles."
        );
      }
    } catch (err) {
      console.error("❌ Failed to load connection profiles:", err);
      setError("Failed to load connection profiles.");
    }

    setLoading(false);
  };

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
      setActiveSection(href);
    },
    [router]
  );

  const extractLogs = async () => {
    if (!selectedConnection) {
      setError("Please select a connection profile first.");
      return;
    }
    if (!uuid.trim()) {
      setError("Please enter a UUID to search for.");
      return;
    }

    setExtracting(true);
    setError(null);
    console.log(`🔄 Starting SSH Log Extractor for UUID: ${uuid}`);

    try {
      const startRes = await rnaApi.sshExtractorStart({
        uuid,
        profileId: selectedConnection,
        download_dir: settings.downloadPath,
        compress_files: compressFiles,
        force_new: true,
        log_date: logDate || undefined,
        connection_timeout: settings.connectionTimeout,
        retry_count: settings.retryCount,
        context_before: settings.contextBefore,
        context_after: settings.contextAfter,
        log_path_current: settings.currentPath,
        log_path_backup: settings.backupPath,
        file_name_pattern: settings.fileNamePattern,
        verbose_logging: true,
        auto_download: false,
      });

      const resp: any = startRes.data;
      const tId = resp?.data?.task_id || resp?.task_id;
      if (!startRes.success || !tId) {
        throw new Error(startRes.error || "Failed to start extractor");
      }

      setTaskId(tId);
      toast({ title: "Task Started", description: `Task ID: ${tId}` });

      // Capture convenience URLs if provided
      const streamUrl = resp?.data?.stream_url || resp?.stream_url;
      const downloadUrl = resp?.data?.download_url || resp?.download_url;
      if (streamUrl || downloadUrl) {
        setConvenienceUrls({
          stream_url: streamUrl,
          download_url: downloadUrl,
        });
        setStatusState((prev) =>
          prev
            ? { ...prev, status: prev.status, progress: prev.progress }
            : {
                state: "PENDING",
                status: "Starting",
                progress: 5,
                files_found: 0,
                result_files: [],
              }
        );
      } else {
        setConvenienceUrls(null);
      }

      // Begin polling status
      if (pollerRef.current) clearInterval(pollerRef.current);
      pollerRef.current = setInterval(async () => {
        const statusRes = await rnaApi.sshExtractorStatus(tId);
        if (!statusRes.success || !statusRes.data) return;
        const payload: any = statusRes.data;
        setStatusState(payload.data);

        // When terminal state, stop polling and push to history
        if (
          payload.data.state === "SUCCESS" ||
          payload.data.state === "FAILURE" ||
          payload.data.state === "CANCELED"
        ) {
          if (pollerRef.current) clearInterval(pollerRef.current);
          pollerRef.current = null;
          if (tailPollerRef.current) clearInterval(tailPollerRef.current);
          tailPollerRef.current = null;

          const nowIso = new Date().toISOString();
          const wasSuccess = payload.data.state === "SUCCESS";
          const newExtraction: LogExtraction = {
            id: `extract-${Date.now()}`,
            uuid: uuid,
            extracted_at: nowIso,
            status: wasSuccess ? "success" : "error",
            file_count:
              payload.data.files_found ??
              (payload.data.result_files?.length || 0),
            total_lines: 0,
            execution_time: payload.execution_time ?? 0,
            error_message:
              payload.data.state === "CANCELED"
                ? "Canceled by user"
                : wasSuccess
                ? undefined
                : payload.data.status || "Extraction failed",
          };
          setLogExtractions((prev) => [newExtraction, ...prev]);
          setSelectedExtraction(newExtraction);
          setExtracting(false);

          toast({
            title:
              payload.data.state === "CANCELED"
                ? "Extraction Canceled"
                : wasSuccess
                ? "Extraction Complete"
                : "Extraction Failed",
            description:
              payload.data.state === "CANCELED"
                ? `Task ${tId} canceled`
                : wasSuccess
                ? `Files found: ${newExtraction.file_count}`
                : newExtraction.error_message,
            variant: wasSuccess
              ? undefined
              : payload.data.state === "CANCELED"
              ? undefined
              : "destructive",
          });
        }
      }, 1000);

      // Start tail polling for live logs
      setTailIndex(0);
      setTailEntries([]);
      if (tailPollerRef.current) clearInterval(tailPollerRef.current);
      tailPollerRef.current = setInterval(async () => {
        try {
          const tailRes = await rnaApi.sshExtractorTail(tId, tailIndex);
          if (!tailRes.success || !tailRes.data) return;
          const d = tailRes.data.data;
          if (Array.isArray(d.entries) && d.entries.length > 0) {
            setTailEntries((prev) => [...prev, ...d.entries]);
          }
          if (Number.isFinite(d.next_index)) setTailIndex(d.next_index);
          // Opportunistically update progress/status/current_file on the UI header
          setStatusState((prev) =>
            prev
              ? {
                  ...prev,
                  progress: d.progress ?? prev.progress,
                  status: d.status ?? prev.status,
                  log_entries: undefined,
                }
              : prev
          );
          // Stop tailing if server says success or error
          if (d.success || d.error_message) {
            if (tailPollerRef.current) clearInterval(tailPollerRef.current);
            tailPollerRef.current = null;
          }
        } catch (e) {
          // swallow transient errors
        }
      }, 1000);
    } catch (err) {
      console.error("❌ Log extraction failed:", err);
      const errorExtraction: LogExtraction = {
        id: `extract-error-${Date.now()}`,
        uuid: uuid,
        extracted_at: new Date().toISOString(),
        status: "error",
        file_count: 0,
        total_lines: 0,
        execution_time: 0,
        error_message:
          err instanceof Error ? err.message : "An unexpected error occurred",
      };
      setLogExtractions((prev) => [errorExtraction, ...prev]);
      setSelectedExtraction(errorExtraction);
      setError(
        `Log extraction failed: ${
          err instanceof Error ? err.message : "An unexpected error occurred"
        }`
      );
      toast({
        title: "Log Extraction Failed",
        description:
          err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      setExtracting(false);
    }
  };

  const cancelExtraction = async () => {
    if (!taskId) return;
    try {
      const res = await rnaApi.sshExtractorCancel(taskId);
      if (res.success && res.data) {
        // stop pollers
        if (pollerRef.current) clearInterval(pollerRef.current);
        if (tailPollerRef.current) clearInterval(tailPollerRef.current);
        pollerRef.current = null;
        tailPollerRef.current = null;
        setExtracting(false);
        setStatusState((prev) => ({
          ...(prev || {
            state: "CANCELED",
            status: "Canceled",
            progress: 1,
            files_found: 0,
            result_files: [],
          }),
          state: "CANCELED",
          status: "Canceled",
          progress: 1,
        }));
        toast({
          title: "Extraction Canceled",
          description: `Task ${taskId} canceled`,
        });
      } else {
        toast({
          title: "Cancel failed",
          description: res.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Cancel failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  // Clear cache action removed per request

  const saveSettings = () => {
    try {
      const payload = JSON.stringify(settings);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_KEY, payload);
      }
      setCookie(SETTINGS_COOKIE, payload);
      loadCachedSettings();
      toast({
        title: "Settings Saved Successfully",
        description: "Your settings have been saved successfully.",
        variant: "success",
      });
    } catch (e) {
      console.warn("Failed to save settings", e);
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleSettingsChange = (
    field: keyof SettingsForm,
    value: string | number
  ) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Remove single history item from cache/state
  const handleRemoveExtraction = (id: string) => {
    setLogExtractions((prev) => prev.filter((x) => x.id !== id));
    if (selectedExtraction?.id === id) {
      setSelectedExtraction(null);
    }
  };

  // Clear all history cache
  const handleClearHistory = () => {
    setLogExtractions([]);
    setSelectedExtraction(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Safely render a file entry coming from API which may be a string or an object
  const renderFileLabel = (
    f: string | { md5?: string; name?: string; path?: string }
  ) => {
    if (typeof f === "string") return f;
    return f.path || f.name || (f.md5 ? `md5:${f.md5}` : JSON.stringify(f));
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
                <span className="text-gray-800 font-medium">Log Extractor</span>
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
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Jalin App</span>
              <span>/</span>
              <span className="text-gray-800 font-medium">Log Extractor</span>
            </div>
          </div>

          <div className="p-6 max-w-full">
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                Log Extractor
              </h1>
              <p className="text-gray-600">
                Extract and download log files from remote servers using UUID
                search.
              </p>
            </div>

            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Connection & Clear Cache Cards - Side by Side */}
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
                      Select SSH Connection
                    </Label>
                    <Select
                      value={selectedConnection}
                      onValueChange={setSelectedConnection}
                    >
                      <SelectTrigger className="w-full rounded-2xl">
                        <SelectValue placeholder="Select SSH connection" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectionProfiles.map((profile) => (
                          <SelectItem key={profile.name} value={profile.name}>
                            {profile.name} ({profile.connection_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedConnection && (
                      <div className="mt-3">
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          <Database className="h-3 w-3 mr-1" />
                          SSH Connected
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Clear Cache Card */}
              <Card className="w-64 shadow-sm border-0 bg-white rounded-3xl flex-shrink-0">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <Database className="h-6 w-6 text-blue-600" />
                    <span>Cache</span>
                  </h2>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Clear Extractor Cache
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-2xl w-full"
                      onClick={async () => {
                        const res = await rnaApi.sshExtractorClearCache();
                        if (res.success) {
                          toast({
                            title: "Extractor cache cleared",
                            description: `Cleared ${
                              res.data?.data?.cleared_count ?? 0
                            } tasks`,
                          });
                        } else {
                          toast({
                            title: "Failed to clear cache",
                            description: res.error || "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Clear Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex space-x-1 mb-6">
              <Button
                variant={activeTab === "extractor" ? "default" : "ghost"}
                onClick={() => setActiveTab("extractor")}
                className={`rounded-2xl ${
                  activeTab === "extractor"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : ""
                }`}
                size="sm"
              >
                <Terminal className="h-4 w-4 mr-2" />
                Log Extractor
              </Button>
              <Button
                variant={activeTab === "history" ? "default" : "ghost"}
                onClick={() => setActiveTab("history")}
                className={`rounded-2xl ${
                  activeTab === "history" ? "bg-blue-600 hover:bg-blue-700" : ""
                }`}
                size="sm"
              >
                <History className="h-4 w-4 mr-2" />
                History ({logExtractions.length})
              </Button>
              <Button
                variant={activeTab === "settings" ? "default" : "ghost"}
                onClick={() => setActiveTab("settings")}
                className={`rounded-2xl ${
                  activeTab === "settings"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : ""
                }`}
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>

            <div className="w-full">
              {activeTab === "extractor" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <Card className="shadow-sm border-0 bg-white rounded-3xl h-full">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                              <Search className="h-5 w-5 text-blue-600" />
                              UUID Search
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">
                                Compress files
                              </span>
                              <Switch
                                checked={compressFiles}
                                onCheckedChange={setCompressFiles}
                                aria-label="Toggle compress files"
                                className="data-[state=checked]:bg-green-600"
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-end gap-3">
                                <div className="flex-1">
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Transaction UUID
                                  </Label>
                                  <Input
                                    value={uuid}
                                    onChange={(e) => setUuid(e.target.value)}
                                    placeholder="Enter UUID to search logs"
                                    className="rounded-2xl"
                                  />
                                </div>
                                <div className="w-60">
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Log Date
                                  </Label>
                                  <div className="relative">
                                    <Input
                                      ref={logDateInputRef}
                                      type="date"
                                      value={logDate}
                                      onChange={(e) =>
                                        setLogDate(e.target.value)
                                      }
                                      className="rounded-2xl pr-10 hide-native-picker"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const el = logDateInputRef.current;
                                        if (!el) return;
                                        if (
                                          "showPicker" in el &&
                                          typeof (el as any).showPicker ===
                                            "function"
                                        ) {
                                          (el as any).showPicker();
                                        } else {
                                          el.focus();
                                          el.click();
                                        }
                                      }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                      title="Open calendar"
                                    >
                                      <Calendar className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Enter the transaction UUID and optionally select
                                a log date to narrow the search.
                              </p>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                onClick={extractLogs}
                                disabled={
                                  extracting ||
                                  !selectedConnection ||
                                  !uuid.trim()
                                }
                                className="rounded-2xl bg-blue-600 hover:bg-blue-700"
                              >
                                {extracting ? (
                                  <>
                                    <Clock className="h-4 w-4 mr-2 animate-spin" />{" "}
                                    Extracting...
                                  </>
                                ) : (
                                  <>
                                    <Search className="h-4 w-4 mr-2" /> Extract
                                    Logs
                                  </>
                                )}
                              </Button>
                              {extracting && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={cancelExtraction}
                                  className="rounded-2xl"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <Card className="shadow-sm border-0 bg-white rounded-3xl h-full">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Result
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          {statusState ? (
                            <div>
                              {/* Header: status badge and quick stats */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Activity className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm text-gray-700">
                                    Task
                                  </span>
                                  <Badge
                                    className={
                                      statusState.state === "SUCCESS"
                                        ? "bg-green-100 text-green-700"
                                        : statusState.state === "FAILURE"
                                        ? "bg-red-100 text-red-700"
                                        : statusState.state === "CANCELED"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-blue-100 text-blue-700"
                                    }
                                  >
                                    {statusState.state}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-lg">
                                    {statusState.files_found ?? 0} files
                                  </span>
                                  <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-lg">
                                    {Math.round(statusState.progress || 0)}%
                                  </span>
                                </div>
                              </div>

                              {/* Context: UUID, date, connection */}
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="text-xs text-gray-600">
                                  Searching UUID
                                </span>
                                <code className="text-xs font-mono px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                                  {uuid || "-"}
                                </code>
                                {uuid && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 rounded-xl"
                                    onClick={() => {
                                      try {
                                        navigator.clipboard.writeText(uuid);
                                        toast({
                                          title: "Copied",
                                          description:
                                            "UUID copied to clipboard",
                                        });
                                      } catch {}
                                    }}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    <span className="text-xs">Copy</span>
                                  </Button>
                                )}
                                {logDate && (
                                  <span className="text-xs text-gray-500">
                                    • Date: {logDate}
                                  </span>
                                )}
                                {selectedConnection && (
                                  <span className="text-xs text-gray-500">
                                    • Conn: {selectedConnection}
                                  </span>
                                )}
                              </div>

                              {/* Progress */}
                              {(statusState.state === "RUNNING" ||
                                statusState.state === "PENDING") && (
                                <>
                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                      className="h-2 rounded-full bg-blue-600 transition-all"
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(
                                            0,
                                            Math.round(
                                              statusState.progress || 0
                                            )
                                          )
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>
                                      {Math.round(statusState.progress || 0)}%
                                    </span>
                                    <span>
                                      {statusState.files_found ?? 0} files
                                    </span>
                                  </div>
                                </>
                              )}

                              {/* Live status line */}
                              {(statusState.status ||
                                (statusState as any)?.current_file) && (
                                <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                                  <span className="truncate mr-2">
                                    {statusState.status}
                                  </span>
                                  {(statusState as any)?.current_file && (
                                    <span className="ml-auto text-gray-500 truncate max-w-[50%]">
                                      {(statusState as any).current_file}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Files detected so far */}
                              {Array.isArray(statusState.result_files) &&
                                statusState.result_files.length > 0 && (
                                  <div className="mt-3 bg-gray-50 rounded-2xl p-3 border border-gray-200">
                                    <div className="text-xs font-medium text-gray-700 mb-2">
                                      Files detected so far
                                    </div>
                                    <ul className="space-y-1">
                                      {statusState.result_files
                                        .slice(0, 5)
                                        .map((f, i) => (
                                          <li
                                            key={`${renderFileLabel(f)}-${i}`}
                                            className="flex items-center gap-2 text-xs text-gray-700"
                                          >
                                            <FileText className="h-3 w-3 text-blue-600" />
                                            <span
                                              className="font-mono truncate"
                                              title={renderFileLabel(f)}
                                            >
                                              {renderFileLabel(f)}
                                            </span>
                                          </li>
                                        ))}
                                    </ul>
                                    {statusState.result_files.length > 5 && (
                                      <div className="text-[11px] text-gray-500 mt-1">
                                        and{" "}
                                        {statusState.result_files.length - 5}{" "}
                                        more…
                                      </div>
                                    )}
                                  </div>
                                )}
                            </div>
                          ) : selectedExtraction ? (
                            <div>
                              <div className="flex items-center space-x-2 mb-4">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <h3 className="text-lg font-medium text-gray-800">
                                  Extraction Results
                                </h3>
                                <Badge
                                  className={
                                    selectedExtraction.status === "success"
                                      ? "bg-green-100 text-green-700"
                                      : selectedExtraction.status === "error"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }
                                >
                                  {selectedExtraction.status}
                                </Badge>
                              </div>

                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-gray-50 rounded-2xl p-4">
                                    <div className="text-sm text-gray-600">
                                      UUID
                                    </div>
                                    <div className="font-mono text-sm text-gray-800">
                                      {selectedExtraction.uuid}
                                    </div>
                                  </div>
                                  <div className="bg-gray-50 rounded-2xl p-4">
                                    <div className="text-sm text-gray-600">
                                      Extracted At
                                    </div>
                                    <div className="text-sm text-gray-800">
                                      {formatDate(
                                        selectedExtraction.extracted_at
                                      )}
                                    </div>
                                  </div>
                                  <div className="bg-gray-50 rounded-2xl p-4">
                                    <div className="text-sm text-gray-600">
                                      Files Found
                                    </div>
                                    <div className="text-sm text-gray-800">
                                      {selectedExtraction.file_count} files
                                    </div>
                                  </div>
                                  <div className="bg-gray-50 rounded-2xl p-4">
                                    <div className="text-sm text-gray-600">
                                      Total Lines
                                    </div>
                                    <div className="text-sm text-gray-800">
                                      {selectedExtraction.total_lines.toLocaleString()}{" "}
                                      lines
                                    </div>
                                  </div>
                                </div>

                                {statusState?.result_files &&
                                  statusState.result_files.length > 0 && (
                                    <div className="bg-gray-50 rounded-2xl p-4">
                                      <div className="text-sm font-medium text-gray-700 mb-2">
                                        Result Files
                                      </div>
                                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                        {statusState.result_files.map(
                                          (f, i) => (
                                            <li
                                              key={`${renderFileLabel(f)}-${i}`}
                                              className="font-mono truncate"
                                              title={renderFileLabel(f)}
                                            >
                                              {renderFileLabel(f)}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  )}

                                {selectedExtraction.status === "success" &&
                                  selectedExtraction.download_path && (
                                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="text-sm font-medium text-green-800">
                                            Download Ready
                                          </div>
                                          <div className="text-xs text-green-600 font-mono">
                                            {selectedExtraction.download_path}
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700 rounded-2xl"
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                {selectedExtraction.error_message && (
                                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                                    <div className="text-sm font-medium text-red-800 mb-2">
                                      Error Details
                                    </div>
                                    <div className="text-sm text-red-700">
                                      {selectedExtraction.error_message}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-8 text-center">
                              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-gray-200 mb-3">
                                <Search className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="text-gray-800 font-medium">
                                No result yet
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Start the extraction to see matching files and
                                live status here.
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-700">
                            Live Logs
                          </span>
                        </div>
                        {taskId && (
                          <code className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
                            {taskId}
                          </code>
                        )}
                      </div>
                      <div className="h-[440px] overflow-auto rounded-xl bg-gray-50 border border-gray-200 p-3">
                        {tailEntries.length > 0 ? (
                          <div className="text-xs font-mono space-y-1">
                            {tailEntries.map((line, i) => (
                              <div
                                key={`${i}-${line.slice(0, 10)}`}
                                className="text-gray-800"
                              >
                                {line}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            No live logs yet. Start an extraction to stream
                            logs.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "settings" && (
                <Card className="flex-1 shadow-sm border-0 bg-white rounded-3xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Settings className="h-5 w-5 text-blue-600" />
                      Extractor Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Connection Timeout (seconds)
                        </Label>
                        <Input
                          type="number"
                          value={settings.connectionTimeout}
                          onChange={(e) =>
                            handleSettingsChange(
                              "connectionTimeout",
                              Number.parseInt(e.target.value)
                            )
                          }
                          className="rounded-2xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Maximum connection timeout (in seconds) before
                          timeout. Value 5-120 seconds.
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Retry Count
                        </Label>
                        <Input
                          type="number"
                          value={settings.retryCount}
                          onChange={(e) =>
                            handleSettingsChange(
                              "retryCount",
                              Number.parseInt(e.target.value)
                            )
                          }
                          className="rounded-2xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Number of retries if SSH connection fails. Value 1-5
                          times.
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Context Before (lines)
                        </Label>
                        <Input
                          type="number"
                          value={settings.contextBefore}
                          onChange={(e) =>
                            handleSettingsChange(
                              "contextBefore",
                              Number.parseInt(e.target.value)
                            )
                          }
                          className="rounded-2xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Number of lines to include before the UUID match.
                          Minimum 10 lines (no maximum limit).
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Context After (lines)
                        </Label>
                        <Input
                          type="number"
                          value={settings.contextAfter}
                          onChange={(e) =>
                            handleSettingsChange(
                              "contextAfter",
                              Number.parseInt(e.target.value)
                            )
                          }
                          className="rounded-2xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Number of lines to include after the UUID match.
                          Minimum 10 lines (no maximum limit).
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Current Path
                        </Label>
                        <Input
                          value={settings.currentPath}
                          onChange={(e) =>
                            handleSettingsChange("currentPath", e.target.value)
                          }
                          className="rounded-2xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Path for current logs (today and yesterday).
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Backup Path
                        </Label>
                        <Input
                          value={settings.backupPath}
                          onChange={(e) =>
                            handleSettingsChange("backupPath", e.target.value)
                          }
                          className="rounded-2xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Base path for backup logs (older dates).
                        </p>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          File Name Pattern
                        </Label>
                        <Input
                          value={settings.fileNamePattern}
                          onChange={(e) =>
                            handleSettingsChange(
                              "fileNamePattern",
                              e.target.value
                            )
                          }
                          className="rounded-2xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Pattern for log file names. Use {"{date}"} as
                          placeholder for date (YYYYMMDD format).
                        </p>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Download Path
                        </Label>
                        <Input
                          value={settings.downloadPath}
                          onChange={(e) =>
                            handleSettingsChange("downloadPath", e.target.value)
                          }
                          className="rounded-2xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Local path to save downloaded log files (avoid
                          OneDrive for best reliability).
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={saveSettings}
                        className="bg-green-600 hover:bg-green-700 rounded-2xl"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "history" && (
                <div className="flex flex-col lg:flex-row gap-6">
                  <Card className="w-full lg:w-[520px] shadow-sm border-0 bg-white rounded-3xl flex-shrink-0 lg:sticky top-6 self-start z-10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Local .txt Files
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {localError && (
                        <Alert className="mb-4 border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700">
                            {localError}
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                        <div className="text-xs font-medium text-gray-700 mb-2 truncate">
                          {localPath || ""}
                        </div>
                        <div className="max-h-[520px] overflow-auto">
                          {localLoading ? (
                            <div className="text-sm text-gray-500 p-4">
                              Loading...
                            </div>
                          ) : localEntries.length === 0 ? (
                            <div className="text-sm text-gray-500 p-4">
                              No .txt files found.
                            </div>
                          ) : (
                            <ul className="text-sm">
                              {localEntries.map((e, idx) => (
                                <li
                                  key={`${e.path}-${idx}`}
                                  className={`border-t border-gray-100 px-2 py-2 flex items-center justify-between cursor-pointer rounded-md hover:bg-gray-100 ${
                                    selectedLocalPath === e.path
                                      ? "bg-blue-50"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    !e.is_dir && readLocalFile(e.path, e)
                                  }
                                >
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className="font-mono truncate"
                                      title={e.path}
                                    >
                                      {e.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {e.modified_at}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-600 ml-2 flex-shrink-0">
                                    {e.is_dir
                                      ? "Folder"
                                      : `${e.size.toLocaleString()} B`}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="flex-1 min-w-0 shadow-sm border-0 bg-white rounded-3xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Extraction History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 mb-6">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="text-sm font-medium text-gray-700">
                            Preview
                          </div>
                          {selectedLocalFile && !selectedLocalFile.is_dir && (
                            <Button
                              size="sm"
                              onClick={downloadLocalFile}
                              disabled={downloading}
                              className="bg-green-600 hover:bg-green-700 rounded-full flex-shrink-0"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {downloading ? "Downloading..." : "Download"}
                            </Button>
                          )}
                        </div>
                        {fileError && (
                          <Alert className="mb-3 border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-700">
                              {fileError}
                            </AlertDescription>
                          </Alert>
                        )}
                        <div className="h-80 overflow-auto rounded-xl bg-white border border-gray-200">
                          {fileLoading ? (
                            <div className="p-4 text-sm text-gray-500">
                              Loading content...
                            </div>
                          ) : filePreview ? (
                            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words overflow-x-auto">
                              {filePreview}
                            </pre>
                          ) : (
                            <div className="p-4 text-sm text-gray-500">
                              Select a file on the left to preview its content.
                            </div>
                          )}
                        </div>
                      </div>

                      {logExtractions.length > 0 ? (
                        <div className="space-y-3">
                          {logExtractions.map((ex) => (
                            <div
                              key={ex.id}
                              className="flex items-center justify-between bg-gray-50 rounded-2xl p-3"
                            >
                              <div className="min-w-0">
                                <div className="font-mono text-sm text-gray-800 truncate">
                                  {ex.uuid}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(ex.extracted_at)} •{" "}
                                  {ex.file_count} files
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={
                                    ex.status === "success"
                                      ? "bg-green-100 text-green-700"
                                      : ex.status === "error"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }
                                >
                                  {ex.status}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-xl"
                                  onClick={() => setSelectedExtraction(ex)}
                                >
                                  Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-xl"
                                  onClick={() => handleRemoveExtraction(ex.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={handleClearHistory}
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
