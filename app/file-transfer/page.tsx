"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type React from "react";

import { useRouter, usePathname } from "next/navigation";
import {
  Upload,
  FolderOpen,
  Server,
  Activity,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Search,
  GitCompare,
  Pause,
  Play,
  X,
  Download,
  Terminal,
  File as FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

import { Sidebar } from "@/components/layout/sidebar";
import type { ConnectionProfile } from "@/lib/types";
import { rnaApi } from "@/lib/api";

interface FileTransferItem {
  id: string;
  name: string;
  size: number;
  path: string;
  selected: boolean;
  lastModified?: number;
  file?: File; // Added actual File object
}

interface ComparisonObject {
  id: string;
  name: string;
  path: string;
  md5: string;
  owner: string;
  permissions: string;
  size: number;
  modified: string;
}

export default function FileTransferPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState(pathname);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const transferLogRef = useRef<HTMLDivElement>(null);
  const comparisonLogRef = useRef<HTMLDivElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"transfer" | "comparison">(
    "transfer"
  );

  // Connection state
  const [connectionProfiles, setConnectionProfiles] = useState<
    ConnectionProfile[]
  >([]);
  const [selectedConnection, setSelectedConnection] = useState("");

  // File Transfer state
  const [localDirectory, setLocalDirectory] = useState("~");
  const [remotePath, setRemotePath] = useState("/tmp");
  const [selectedFiles, setSelectedFiles] = useState<FileTransferItem[]>([]);
  const [selectedSingleServer, setSelectedSingleServer] = useState("");
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [expandedTargetCategories, setExpandedTargetCategories] = useState<
    Record<string, boolean>
  >({});

  // Transfer Progress state
  const [currentTransferId, setCurrentTransferId] = useState<string | null>(
    null
  );
  const [transferProgress, setTransferProgress] = useState<any>(null);
  const [transferStatus, setTransferStatus] = useState<string>("Ready");
  const [transferLogs, setTransferLogs] = useState<
    Array<{
      message: string;
      type: "info" | "success" | "warning" | "error";
      timestamp: string;
    }>
  >([
    {
      message: "System ready",
      type: "info",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [showTransferProgress, setShowTransferProgress] = useState(false);
  const [progressPollingInterval, setProgressPollingInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Object Comparison state
  const [sourceServer, setSourceServer] = useState("");
  const [sourceRemotePath, setSourceRemotePath] = useState("/tmp");
  const [fileFilter, setFileFilter] = useState("*.so");
  const [targetRemotePath, setTargetRemotePath] = useState("/tmp");
  const [selectedTargetServers, setSelectedTargetServers] = useState<string[]>(
    []
  );
  const [targetServerPaths, setTargetServerPaths] = useState<
    Record<string, string>
  >({});
  const [comparisonObjects, setComparisonObjects] = useState<
    ComparisonObject[]
  >([]);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [objectSearch, setObjectSearch] = useState("");
  const [objectFilter, setObjectFilter] = useState<"all" | "selected">("all");
  const [comparing, setComparing] = useState(false);
  const [comparisonLogs, setComparisonLogs] = useState<
    Array<{
      message: string;
      type: "info" | "success" | "warning" | "error";
      timestamp: string;
    }>
  >([
    {
      message: "Comparison tool ready",
      type: "info",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [comparisonProgress, setComparisonProgress] = useState<{
    objectsProcessed: number;
    totalObjects: number;
    serversProcessed: number;
    totalServers: number;
    currentObject: string;
    percentage: number;
  } | null>(null);
  const [comparisonResults, setComparisonResults] = useState<any>(null);
  const [showComparisonProgress, setShowComparisonProgress] = useState(false);
  const [showComparisonResults, setShowComparisonResults] = useState(false);

  // Remote Browser state
  const [remoteBrowserOpen, setRemoteBrowserOpen] = useState(false);
  const [remoteBrowserServer, setRemoteBrowserServer] = useState("");
  const [remoteBrowserPath, setRemoteBrowserPath] = useState("/");
  const [remoteBrowserFiles, setRemoteBrowserFiles] = useState<any[]>([]);
  const [remoteBrowserError, setRemoteBrowserError] = useState<string | null>(
    null
  );
  const [activeRemoteBrowserInput, setActiveRemoteBrowserInput] = useState<
    string | null
  >(null);
  const [activeRemoteBrowserServer, setActiveRemoteBrowserServer] = useState<
    string | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🚀 File Transfer page mounted, fetching data...");
    loadInitialData();
  }, []);

  // Load remote files when server or path changes
  useEffect(() => {
    if (remoteBrowserOpen && remoteBrowserServer) {
      loadRemoteFiles();
    }
  }, [remoteBrowserOpen, remoteBrowserServer, remoteBrowserPath]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (progressPollingInterval) {
        clearInterval(progressPollingInterval);
      }
    };
  }, [progressPollingInterval]);

  // Auto-scroll transfer log to bottom
  useEffect(() => {
    if (transferLogRef.current) {
      transferLogRef.current.scrollTop = transferLogRef.current.scrollHeight;
    }
  }, [transferLogs]);

  // Auto-scroll comparison log to bottom
  useEffect(() => {
    if (comparisonLogRef.current) {
      comparisonLogRef.current.scrollTop =
        comparisonLogRef.current.scrollHeight;
    }
  }, [comparisonLogs]);

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

  const handleServerSelection = (serverId: string, checked: boolean) => {
    if (checked) {
      setSelectedServers((prev) => [...prev, serverId]);
    } else {
      setSelectedServers((prev) => prev.filter((id) => id !== serverId));
    }
  };

  const handleTargetServerSelection = (serverId: string, checked: boolean) => {
    if (checked) {
      setSelectedTargetServers((prev) => [...prev, serverId]);
    } else {
      setSelectedTargetServers((prev) => prev.filter((id) => id !== serverId));
    }
  };

  const browseFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const browseDirectory = () => {
    if (directoryInputRef.current) {
      directoryInputRef.current.click();
    }
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileItems: FileTransferItem[] = Array.from(files).map(
        (file, index) => ({
          id: `file-${index}`,
          name: file.name,
          size: file.size,
          path: file.webkitRelativePath || file.name,
          selected: true,
          lastModified: file.lastModified,
          file: file,
        })
      );

      setSelectedFiles(fileItems);

      // Update local directory display - show file count like advanced_transfer.html
      if (files.length === 1) {
        setLocalDirectory("1 file selected");
      } else {
        setLocalDirectory(`${files.length} files selected`);
      }

      addTransferLog(`Selected ${files.length} files.`, "success");

      // Clear the input value to allow selecting the same file again
      event.target.value = "";
    }
  };

  // Helper function to add transfer log entries
  const addTransferLog = (
    message: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ) => {
    setTransferLogs((prev) => [
      ...prev,
      { message, type, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

  // Helper function to add comparison log entries
  const addComparisonLog = (
    message: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ) => {
    setComparisonLogs((prev) => [
      ...prev,
      { message, type, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

  // Helper function to organize servers by category
  const organizeServersByCategory = (servers: ConnectionProfile[]) => {
    const grouped: Record<string, ConnectionProfile[]> = {};
    servers.forEach((server) => {
      const category = (server as any).category || "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(server);
    });
    return grouped;
  };

  // Toggle category expansion
  const toggleCategory = (category: string, isTarget: boolean = false) => {
    if (isTarget) {
      setExpandedTargetCategories((prev) => ({
        ...prev,
        [category]: !prev[category],
      }));
    } else {
      setExpandedCategories((prev) => ({
        ...prev,
        [category]: !prev[category],
      }));
    }
  };

  // Load remote files for browser
  const loadRemoteFiles = async () => {
    if (!remoteBrowserServer) {
      setRemoteBrowserFiles([]);
      return;
    }

    try {
      const response = await rnaApi.browseRemoteFiles({
        connection_name: remoteBrowserServer,
        path: remoteBrowserPath || "/",
      });

      if (response.success && response.data) {
        const data = response.data;

        // Check if the response indicates success or error
        if (data.success === false) {
          // Handle error responses (permission denied, path not found, etc.)
          const errorMessage = data.error || "Unknown error";
          setRemoteBrowserFiles([]);
          setRemoteBrowserPath(data.path || remoteBrowserPath || "/");
          setRemoteBrowserError(errorMessage);

          // Add appropriate log message based on error type
          if (errorMessage.toLowerCase().includes("permission denied")) {
            addTransferLog(
              `Permission denied: Cannot access ${
                data.path || remoteBrowserPath
              }`,
              "error"
            );
          } else if (errorMessage.toLowerCase().includes("not found")) {
            addTransferLog(
              `Path not found: ${data.path || remoteBrowserPath}`,
              "error"
            );
          } else if (errorMessage.toLowerCase().includes("not a directory")) {
            addTransferLog(
              `Path is not a directory: ${data.path || remoteBrowserPath}`,
              "error"
            );
          } else {
            addTransferLog(`Error: ${errorMessage}`, "error");
          }
        } else {
          // Success response
          setRemoteBrowserFiles(data.files || []);
          setRemoteBrowserPath(data.path || remoteBrowserPath || "/");
          setRemoteBrowserError(null); // Clear any previous errors

          // Log success message if available
          if (data.message) {
            if (data.file_count === 0) {
              addTransferLog(`Directory ${data.path} is empty`, "info");
            } else {
              addTransferLog(
                `Found ${data.file_count || data.files?.length || 0} items in ${
                  data.path
                }`,
                "success"
              );
            }
          }
        }
      } else {
        // API call failed
        const errorMsg = response.error || "Unknown error";
        addTransferLog(`Failed to browse remote files: ${errorMsg}`, "error");
        setRemoteBrowserFiles([]);
        setRemoteBrowserError(errorMsg);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to browse remote files";
      addTransferLog(errorMessage, "error");
      setRemoteBrowserFiles([]);
      setRemoteBrowserError(errorMessage);
    }
  };

  // Start progress polling
  const startProgressPolling = (transferId: string) => {
    // Clear any existing polling
    if (progressPollingInterval) {
      clearInterval(progressPollingInterval);
    }

    const poll = async () => {
      if (!currentTransferId || currentTransferId !== transferId) {
        return;
      }

      try {
        const response = await rnaApi.getTransferProgress(transferId);
        if (response.success && response.data) {
          const progressData = response.data;
          setTransferProgress(progressData);
          setTransferStatus(progressData.status);

          // Update logs based on status
          if (progressData.status === "completed") {
            addTransferLog("Transfer completed successfully", "success");
            stopProgressPolling();
          } else if (progressData.status === "failed") {
            addTransferLog("Transfer failed", "error");
            stopProgressPolling();
          }

          // If all completed, stop polling
          if (progressData.all_completed) {
            addTransferLog("All files transferred successfully", "success");
            stopProgressPolling();
          }
        } else {
          addTransferLog(
            `Failed to get progress: ${response.error || "Unknown error"}`,
            "warning"
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get progress";
        addTransferLog(errorMessage, "warning");
      }
    };

    // Poll immediately, then every second
    poll();
    const interval = setInterval(poll, 1000);
    setProgressPollingInterval(interval);
  };

  // Stop progress polling
  const stopProgressPolling = () => {
    if (progressPollingInterval) {
      clearInterval(progressPollingInterval);
      setProgressPollingInterval(null);
    }
  };

  // Pause transfer
  const handlePauseTransfer = async () => {
    if (!currentTransferId) return;

    try {
      const response = await rnaApi.pauseTransfer(currentTransferId);
      if (response.success) {
        addTransferLog("Transfer paused", "warning");
        setTransferStatus("paused");
      } else {
        addTransferLog(
          `Failed to pause: ${response.error || "Unknown error"}`,
          "error"
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to pause transfer";
      addTransferLog(errorMessage, "error");
    }
  };

  // Resume transfer
  const handleResumeTransfer = async () => {
    if (!currentTransferId) return;

    try {
      const response = await rnaApi.resumeTransfer(currentTransferId);
      if (response.success) {
        addTransferLog("Transfer resumed", "info");
        setTransferStatus("transferring");
        // Resume polling if it was stopped
        if (!progressPollingInterval) {
          startProgressPolling(currentTransferId);
        }
      } else {
        addTransferLog(
          `Failed to resume: ${response.error || "Unknown error"}`,
          "error"
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to resume transfer";
      addTransferLog(errorMessage, "error");
    }
  };

  // Cancel transfer
  const handleCancelTransfer = async () => {
    if (!currentTransferId) return;
    setShowCancelDialog(true);
  };

  const confirmCancelTransfer = async () => {
    if (!currentTransferId) return;
    setShowCancelDialog(false);

    try {
      const response = await rnaApi.cancelTransfer(currentTransferId);
      if (response.success) {
        addTransferLog("Transfer cancelled", "warning");
        setTransferStatus("cancelled");
        stopProgressPolling();
        setCurrentTransferId(null);
        setShowTransferProgress(false);
      } else {
        addTransferLog(
          `Failed to cancel: ${response.error || "Unknown error"}`,
          "error"
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to cancel transfer";
      addTransferLog(errorMessage, "error");
    }
  };

  // Render progress items for a single file
  const renderFileProgress = (fileProgress: any, transferId: string) => {
    const percent =
      fileProgress.total_size > 0
        ? Math.round((fileProgress.transferred / fileProgress.total_size) * 100)
        : 0;

    let statusBadgeClass = "bg-blue-500";
    if (fileProgress.status === "completed") {
      statusBadgeClass = "bg-green-500";
    } else if (fileProgress.status === "failed") {
      statusBadgeClass = "bg-red-500";
    } else if (fileProgress.status === "paused") {
      statusBadgeClass = "bg-yellow-500";
    }

    return (
      <div
        key={transferId}
        className="border border-gray-200 rounded-xl p-4 mb-3 bg-gray-50"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            {fileProgress.filename}
          </span>
          <Badge className={statusBadgeClass}>{fileProgress.status}</Badge>
        </div>
        <Progress value={percent} className="h-2 mb-2" />
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>
            {formatFileSize(fileProgress.transferred)} /{" "}
            {formatFileSize(fileProgress.total_size)}
          </span>
          <span>
            {fileProgress.speed
              ? `${formatFileSize(fileProgress.speed)}/s`
              : ""}
            {fileProgress.eta && fileProgress.eta > 0
              ? ` • ${Math.round(fileProgress.eta)}s remaining`
              : ""}
          </span>
        </div>
        {fileProgress.status === "completed" && (
          <div className="mt-2 space-y-1">
            {fileProgress.md5_match === true && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                MD5 Verified ✓
              </Badge>
            )}
            {fileProgress.md5_match === false && (
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200"
              >
                MD5 Mismatch ✗
              </Badge>
            )}
            {fileProgress.owner_changed && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                Owner Changed ✓
              </Badge>
            )}
            {fileProgress.permissions_changed && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                Permissions Changed ✓
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleDirectorySelection = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files) {
      const fileItems: FileTransferItem[] = Array.from(files).map(
        (file, index) => ({
          id: `dir-file-${index}`,
          name: file.name,
          size: file.size,
          path: file.webkitRelativePath,
          selected: true,
          file: file,
        })
      );

      setSelectedFiles(fileItems);

      // Update local directory display
      if (files.length > 0 && files[0].webkitRelativePath) {
        const pathParts = files[0].webkitRelativePath.split("/");
        setLocalDirectory(pathParts[0]);
      }

      toast({
        title: "Directory Selected",
        description: `Selected directory with ${files.length} file(s).`,
      });
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, selected: !file.selected } : file
      )
    );
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const uploadToSingleServer = async () => {
    if (!selectedSingleServer) {
      addTransferLog("Please select a target server.", "warning");
      return;
    }

    const filesToUpload = selectedFiles.filter((f) => f.selected);
    if (filesToUpload.length === 0) {
      addTransferLog("Please select files to upload.", "warning");
      return;
    }

    setUploading(true);
    setError(null);
    addTransferLog(
      `Starting upload of ${filesToUpload.length} file(s) to ${selectedSingleServer}...`,
      "info"
    );

    try {
      // Note: The API expects server-side file paths (e.g., "/path/to/file.so")
      // For browser File objects, we would need to:
      // 1. Upload files to server first using FormData and get server paths
      // 2. Or modify the API to accept FormData directly
      // For now, we'll attempt the API call - the backend should handle file uploads
      // or we need a separate file upload endpoint

      // Extract file paths - in a real implementation, these would be server paths
      // after uploading files via FormData to a temporary location
      const filePaths = filesToUpload.map((f) => {
        // If file has a path (from webkitRelativePath), use it
        // Otherwise, this would need to be a server path after upload
        return f.path || f.name;
      });

      const response = await rnaApi.uploadFilesSingle({
        connection_name: selectedSingleServer,
        remote_path: remotePath || "/tmp",
        files: filePaths,
      });

      if (response.success && response.data) {
        const transferId = response.data.transfer_id;
        setCurrentTransferId(transferId);
        setShowTransferProgress(true);
        setTransferStatus("transferring");
        addTransferLog(response.data.message, "success");
        startProgressPolling(transferId);
      } else {
        addTransferLog(
          `Upload failed: ${response.error || "Unknown error"}`,
          "error"
        );
        setError(response.error || "Upload failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      addTransferLog(errorMessage, "error");
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const uploadToMultipleServers = async () => {
    if (selectedServers.length === 0) {
      addTransferLog("Please select target servers.", "warning");
      return;
    }

    const filesToUpload = selectedFiles.filter((f) => f.selected);
    if (filesToUpload.length === 0) {
      addTransferLog("Please select files to upload.", "warning");
      return;
    }

    setUploading(true);
    setError(null);
    addTransferLog(
      `Starting upload of ${filesToUpload.length} file(s) to ${selectedServers.length} server(s)...`,
      "info"
    );

    try {
      // Note: The API expects server-side file paths (e.g., "/path/to/file.so")
      // For browser File objects, we would need to:
      // 1. Upload files to server first using FormData and get server paths
      // 2. Or modify the API to accept FormData directly
      // For now, we'll attempt the API call - the backend should handle file uploads
      // or we need a separate file upload endpoint

      // Extract file paths - in a real implementation, these would be server paths
      // after uploading files via FormData to a temporary location
      const filePaths = filesToUpload.map((f) => {
        // If file has a path (from webkitRelativePath), use it
        // Otherwise, this would need to be a server path after upload
        return f.path || f.name;
      });

      const response = await rnaApi.uploadFilesMultiple({
        server_names: selectedServers,
        remote_path: remotePath || "/tmp",
        files: filePaths,
      });

      if (response.success && response.data) {
        const transferId = response.data.transfer_id;
        setCurrentTransferId(transferId);
        setShowTransferProgress(true);
        setTransferStatus("transferring");
        addTransferLog(response.data.message, "success");
        startProgressPolling(transferId);
      } else {
        addTransferLog(
          `Upload failed: ${response.error || "Unknown error"}`,
          "error"
        );
        setError(response.error || "Upload failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      addTransferLog(errorMessage, "error");
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const listObjects = async () => {
    if (!sourceServer) {
      addComparisonLog("Please select a source server.", "warning");
      return;
    }
    if (!sourceRemotePath) {
      addComparisonLog("Please provide a remote path.", "warning");
      return;
    }
    if (!fileFilter) {
      addComparisonLog("Please provide a file filter.", "warning");
      return;
    }

    try {
      addComparisonLog(
        `Listing objects on ${sourceServer} in path ${sourceRemotePath} with filter "${fileFilter}"`
      );
      // Mock object listing - will be replaced with API call
      const mockObjects: ComparisonObject[] = [
        {
          id: "1",
          name: "libjalin.so",
          path: "/tmp/libjalin.so",
          md5: "a1b2c3d4e5f6",
          owner: "jalin",
          permissions: "755",
          size: 2048576,
          modified: "2024-01-15T10:30:00Z",
        },
        {
          id: "2",
          name: "renaissance.so",
          path: "/tmp/renaissance.so",
          md5: "f6e5d4c3b2a1",
          owner: "jalin",
          permissions: "644",
          size: 1536000,
          modified: "2024-01-14T15:45:00Z",
        },
      ];
      setComparisonObjects(mockObjects);
      addComparisonLog(`Found ${mockObjects.length} objects.`, "success");
    } catch (err) {
      addComparisonLog("Failed to list objects.", "error");
      setError("Failed to list objects.");
    }
  };

  const compareObjects = async () => {
    if (!sourceServer) {
      addComparisonLog("Please select a source server.", "warning");
      return;
    }
    if (selectedObjects.length === 0) {
      addComparisonLog(
        "Please select at least one object to compare.",
        "warning"
      );
      return;
    }
    if (selectedTargetServers.length === 0) {
      addComparisonLog("Please select at least one target server.", "warning");
      return;
    }

    setComparing(true);
    setShowComparisonProgress(true);
    setShowComparisonResults(false);

    // Collect target server paths
    const serverPaths: Record<string, string> = {};
    selectedTargetServers.forEach((serverName) => {
      const serverPath = targetServerPaths[serverName]?.trim() || "";
      serverPaths[serverName] = serverPath || targetRemotePath || "/tmp";
    });

    addComparisonLog(
      `Starting new comparison for ${selectedObjects.length} objects across ${selectedTargetServers.length} servers...`
    );

    // Initialize progress
    setComparisonProgress({
      objectsProcessed: 0,
      totalObjects: selectedObjects.length,
      serversProcessed: 0,
      totalServers: selectedTargetServers.length,
      currentObject: "",
      percentage: 0,
    });

    try {
      // Mock comparison - will be replaced with API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock results
      const mockResults: any = {};
      selectedObjects.forEach((objId) => {
        const obj = comparisonObjects.find((o) => o.id === objId);
        if (obj) {
          mockResults[obj.path] = {
            [sourceServer]: {
              md5: obj.md5,
              owner: obj.owner,
              permissions: obj.permissions,
            },
          };
          selectedTargetServers.forEach((server) => {
            mockResults[obj.path][server] = {
              md5: obj.md5,
              owner: obj.owner,
              permissions: obj.permissions,
            };
          });
        }
      });

      setComparisonResults(mockResults);
      setShowComparisonResults(true);
      setShowComparisonProgress(false);
      setComparisonProgress({
        objectsProcessed: selectedObjects.length,
        totalObjects: selectedObjects.length,
        serversProcessed: selectedTargetServers.length,
        totalServers: selectedTargetServers.length,
        currentObject: "",
        percentage: 100,
      });

      addComparisonLog("Comparison finished successfully.", "success");
      toast({
        title: "Comparison Complete",
        description: `Compared ${selectedObjects.length} objects across ${selectedTargetServers.length} servers.`,
      });
    } catch (err) {
      addComparisonLog("Comparison failed with errors.", "error");
      setError("Comparison failed.");
      setShowComparisonProgress(false);
    } finally {
      setComparing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const filteredObjects = comparisonObjects.filter((obj) =>
    obj.name.toLowerCase().includes(objectSearch.toLowerCase())
  );

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
                <span className="text-gray-800 font-medium">
                  SSH File Transfer
                </span>
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
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Jalin App</span>
              <span>/</span>
              <span className="text-gray-800 font-medium">
                SSH File Transfer
              </span>
            </div>
          </div>

          <div className="p-6 max-w-full">
            {/* Hero Section */}
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                SSH File Transfer
              </h1>
              <p className="text-gray-600">
                {activeTab === "transfer"
                  ? "Upload .so files to SSH servers with MD5 verification and resume capability"
                  : "Compare file MD5, owner, and permissions across multiple servers."}
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

            {/* Connection Selection */}
            <Card className="shadow-sm border-0 bg-white rounded-3xl mb-6"></Card>

            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6">
              <Button
                variant={activeTab === "transfer" ? "default" : "ghost"}
                onClick={() => setActiveTab("transfer")}
                className={`rounded-2xl ${
                  activeTab === "transfer"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : ""
                }`}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                File Transfer
              </Button>
              <Button
                variant={activeTab === "comparison" ? "default" : "ghost"}
                onClick={() => setActiveTab("comparison")}
                className={`rounded-2xl ${
                  activeTab === "comparison"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : ""
                }`}
                size="sm"
              >
                <GitCompare className="h-4 w-4 mr-2" />
                Object Comparison
              </Button>
            </div>

            {/* Tab Content */}
            <div className="flex flex-col gap-6">
              {activeTab === "transfer" && (
                <>
                  <div className="flex gap-6">
                    {/* File Selection Panel */}
                    <Card className="w-96 shadow-sm border-0 bg-white rounded-3xl flex-shrink-0">
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                          <FolderOpen className="h-6 w-6 text-blue-600" />
                          <span>File Selection</span>
                        </h2>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Local Directory
                            </Label>
                            <div className="flex space-x-2">
                              <Input
                                value={localDirectory}
                                onChange={(e) =>
                                  setLocalDirectory(e.target.value)
                                }
                                className="rounded-2xl flex-1"
                                readOnly
                              />
                              <Button
                                onClick={browseFiles}
                                variant="outline"
                                className="rounded-2xl bg-transparent"
                              >
                                Browse
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Browse and select files from your local system
                            </p>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Selected Files
                            </Label>
                            <div className="border border-gray-200 rounded-2xl p-4 min-h-[120px] max-h-[220px] overflow-y-auto">
                              {selectedFiles.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">
                                  No files selected
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {selectedFiles.map((file) => (
                                    <div
                                      key={file.id}
                                      className="flex items-center justify-between p-2 border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <Checkbox
                                          checked={file.selected}
                                          onCheckedChange={() =>
                                            toggleFileSelection(file.id)
                                          }
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {file.name}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end text-right min-w-[120px]">
                                        <span className="text-xs font-medium text-gray-600">
                                          {formatFileSize(file.size)}
                                        </span>
                                        {file.lastModified && (
                                          <span className="text-xs text-gray-500">
                                            {formatDate(file.lastModified)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  <div className="pt-2 border-t border-gray-200 mt-3">
                                    <p className="text-xs text-gray-600">
                                      Total:{" "}
                                      {
                                        selectedFiles.filter((f) => f.selected)
                                          .length
                                      }{" "}
                                      files selected
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileSelection}
                          style={{ display: "none" }}
                        />
                        <input
                          ref={directoryInputRef}
                          type="file"
                          {...({ webkitdirectory: "" } as any)}
                          onChange={handleDirectorySelection}
                          style={{ display: "none" }}
                        />
                      </CardContent>
                    </Card>

                    {/* Server Selection Panel */}
                    <Card className="flex-1 shadow-sm border-0 bg-white rounded-3xl">
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                          <Server className="h-6 w-6 text-blue-600" />
                          <span>Server Selection</span>
                        </h2>

                        <div className="space-y-6">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Remote Path
                            </Label>
                            <div className="flex space-x-2">
                              <Input
                                value={remotePath}
                                onChange={(e) => setRemotePath(e.target.value)}
                                className="rounded-2xl flex-1"
                              />
                              <Button
                                variant="outline"
                                className="rounded-2xl bg-transparent"
                                onClick={() => {
                                  setActiveRemoteBrowserInput("remotePath");
                                  setActiveRemoteBrowserServer(null);
                                  setRemoteBrowserServer(
                                    selectedSingleServer || ""
                                  );
                                  setRemoteBrowserPath(remotePath || "/");
                                  setRemoteBrowserOpen(true);
                                }}
                              >
                                Browse
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <div className="flex items-center space-x-3">
                              <Label className="text-sm font-medium text-gray-700">
                                Server Mode
                              </Label>
                              <span className="text-sm text-gray-600">
                                {isMultipleMode
                                  ? "Multiple Servers"
                                  : "Single Server"}
                              </span>
                            </div>
                            <Switch
                              checked={isMultipleMode}
                              onCheckedChange={setIsMultipleMode}
                              className="data-[state=checked]:bg-green-600"
                            />
                          </div>

                          {!isMultipleMode && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-4 block">
                                Single Server
                              </Label>
                              <div className="flex items-center space-x-4 mb-4">
                                <Select
                                  value={selectedSingleServer}
                                  onValueChange={setSelectedSingleServer}
                                >
                                  <SelectTrigger className="w-64 rounded-2xl">
                                    <SelectValue placeholder="Select server..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {connectionProfiles.map((profile) => (
                                      <SelectItem
                                        key={profile.name}
                                        value={profile.name}
                                      >
                                        {profile.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  onClick={uploadToSingleServer}
                                  disabled={
                                    uploading ||
                                    !selectedConnection ||
                                    selectedFiles.length === 0 ||
                                    !selectedSingleServer
                                  }
                                  className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                                >
                                  {uploading ? (
                                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                  )}
                                  Upload to Single Server
                                </Button>
                              </div>
                            </div>
                          )}

                          {isMultipleMode && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-4 block">
                                Multiple Servers
                              </Label>
                              <ScrollArea className="max-h-[300px] border border-gray-200 rounded-2xl p-4 mb-4">
                                {Object.entries(
                                  organizeServersByCategory(connectionProfiles)
                                )
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([category, servers]) => {
                                    const categoryId = `category-${category
                                      .replace(/\s+/g, "-")
                                      .toLowerCase()}`;
                                    const isExpanded =
                                      expandedCategories[category] || false;
                                    const categoryServers = servers.map(
                                      (s) => s.name
                                    );
                                    const allCategorySelected =
                                      categoryServers.every((name) =>
                                        selectedServers.includes(name)
                                      );
                                    const someCategorySelected =
                                      categoryServers.some((name) =>
                                        selectedServers.includes(name)
                                      );

                                    return (
                                      <div
                                        key={category}
                                        className="mb-2 border border-gray-200 rounded-xl p-2 bg-gray-50"
                                      >
                                        <div className="flex items-center space-x-2 mb-1">
                                          <Checkbox
                                            checked={allCategorySelected}
                                            ref={(el) => {
                                              if (el) {
                                                (el as any).indeterminate =
                                                  someCategorySelected &&
                                                  !allCategorySelected;
                                              }
                                            }}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                setSelectedServers((prev) => [
                                                  ...new Set([
                                                    ...prev,
                                                    ...categoryServers,
                                                  ]),
                                                ]);
                                              } else {
                                                setSelectedServers((prev) =>
                                                  prev.filter(
                                                    (name) =>
                                                      !categoryServers.includes(
                                                        name
                                                      )
                                                  )
                                                );
                                              }
                                            }}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() =>
                                              toggleCategory(category)
                                            }
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="h-4 w-4" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4" />
                                            )}
                                          </Button>
                                          <Label
                                            className="text-sm font-semibold text-gray-700 cursor-pointer flex-1"
                                            onClick={() =>
                                              toggleCategory(category)
                                            }
                                          >
                                            {category}
                                          </Label>
                                        </div>
                                        {isExpanded && (
                                          <div className="ml-8 mt-2 space-y-2">
                                            {servers.map((server) => (
                                              <div
                                                key={server.name}
                                                className="flex items-center space-x-2"
                                              >
                                                <Checkbox
                                                  id={`server-${server.name}`}
                                                  checked={selectedServers.includes(
                                                    server.name
                                                  )}
                                                  onCheckedChange={(checked) =>
                                                    handleServerSelection(
                                                      server.name,
                                                      checked as boolean
                                                    )
                                                  }
                                                />
                                                <Label
                                                  htmlFor={`server-${server.name}`}
                                                  className="text-sm text-gray-700 cursor-pointer"
                                                >
                                                  {server.name}{" "}
                                                  {server.host
                                                    ? `(${server.host})`
                                                    : ""}
                                                </Label>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </ScrollArea>
                              <Button
                                onClick={uploadToMultipleServers}
                                disabled={
                                  uploading ||
                                  !selectedConnection ||
                                  selectedFiles.length === 0 ||
                                  selectedServers.length === 0
                                }
                                className="bg-green-600 hover:bg-green-700 rounded-2xl"
                              >
                                {uploading ? (
                                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                Upload to Multiple Servers
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Transfer Progress Card */}
                  {showTransferProgress && (
                    <Card className="shadow-sm border-0 bg-white rounded-3xl">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-semibold text-gray-800">
                            Transfer Progress
                          </h2>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={handlePauseTransfer}
                              disabled={
                                !currentTransferId ||
                                transferStatus === "paused" ||
                                transferStatus === "completed" ||
                                transferStatus === "cancelled" ||
                                transferStatus === "failed"
                              }
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={handleResumeTransfer}
                              disabled={
                                !currentTransferId ||
                                transferStatus !== "paused"
                              }
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Resume
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                              onClick={handleCancelTransfer}
                              disabled={
                                !currentTransferId ||
                                transferStatus === "completed" ||
                                transferStatus === "cancelled"
                              }
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                            <Badge variant="outline" className="ml-3">
                              {transferStatus}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {transferProgress ? (
                            transferProgress.type === "multi_server" ? (
                              <div className="space-y-4">
                                {/* Overall progress for multi-server */}
                                {transferProgress.total_servers && (
                                  <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-sm font-medium text-gray-700">
                                        Overall Progress
                                      </span>
                                      <span className="text-sm text-gray-600">
                                        {transferProgress.servers?.filter(
                                          (s: string) => {
                                            const status =
                                              transferProgress
                                                .server_statuses?.[s];
                                            return (
                                              status === "completed" ||
                                              status === "failed"
                                            );
                                          }
                                        ).length || 0}{" "}
                                        of {transferProgress.total_servers}{" "}
                                        servers
                                      </span>
                                    </div>
                                    <Progress
                                      value={
                                        transferProgress.total_servers > 0
                                          ? Math.round(
                                              ((transferProgress.servers?.filter(
                                                (s: string) => {
                                                  const status =
                                                    transferProgress
                                                      .server_statuses?.[s];
                                                  return (
                                                    status === "completed" ||
                                                    status === "failed"
                                                  );
                                                }
                                              ).length || 0) /
                                                transferProgress.total_servers) *
                                                100
                                            )
                                          : 0
                                      }
                                      className="h-3"
                                    />
                                  </div>
                                )}
                                {/* Per-server progress */}
                                {transferProgress.servers?.map(
                                  (serverName: string) => {
                                    const serverProgress =
                                      transferProgress.progress?.[serverName] ||
                                      {};
                                    const serverStatus =
                                      transferProgress.server_statuses?.[
                                        serverName
                                      ] || "pending";
                                    const isCurrentServer =
                                      transferProgress.current_server ===
                                      serverName;

                                    return (
                                      <div
                                        key={serverName}
                                        className={`border rounded-xl p-4 ${
                                          isCurrentServer
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 bg-gray-50"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            <h4 className="text-sm font-semibold text-gray-900">
                                              {serverName}
                                            </h4>
                                            {isCurrentServer && (
                                              <Badge
                                                variant="outline"
                                                className="bg-blue-100 text-blue-700"
                                              >
                                                Active
                                              </Badge>
                                            )}
                                            <Badge
                                              className={
                                                serverStatus === "completed"
                                                  ? "bg-green-500"
                                                  : serverStatus === "failed"
                                                  ? "bg-red-500"
                                                  : serverStatus ===
                                                    "transferring"
                                                  ? "bg-blue-500"
                                                  : "bg-gray-500"
                                              }
                                            >
                                              {serverStatus}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          {Object.entries(serverProgress).map(
                                            ([transferId, fileProgress]: [
                                              string,
                                              any
                                            ]) =>
                                              renderFileProgress(
                                                fileProgress,
                                                transferId
                                              )
                                          )}
                                          {Object.keys(serverProgress)
                                            .length === 0 && (
                                            <div className="text-sm text-gray-500 text-center py-2">
                                              No progress data available
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {transferProgress.progress &&
                                  Object.entries(transferProgress.progress).map(
                                    ([transferId, fileProgress]: [
                                      string,
                                      any
                                    ]) =>
                                      renderFileProgress(
                                        fileProgress,
                                        transferId
                                      )
                                  )}
                                {(!transferProgress.progress ||
                                  Object.keys(transferProgress.progress)
                                    .length === 0) && (
                                  <div className="text-sm text-gray-500 text-center py-4">
                                    No progress data available
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            <div className="text-sm text-gray-500 text-center py-4">
                              No active transfer
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Transfer Log */}
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        Transfer Log
                      </h2>
                      <ScrollArea className="h-[200px] border border-gray-200 rounded-2xl p-4 bg-gray-50">
                        <div
                          ref={transferLogRef}
                          className="space-y-1 font-mono text-sm"
                        >
                          {transferLogs.map((log, index) => (
                            <div
                              key={index}
                              className={`${
                                log.type === "info"
                                  ? "text-blue-600"
                                  : log.type === "success"
                                  ? "text-green-600"
                                  : log.type === "warning"
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}
                            >
                              [{log.timestamp}] {log.message}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              )}

              {activeTab === "comparison" && (
                <>
                  <div className="flex gap-6">
                    {/* Source Selection Panel */}
                    <Card className="w-96 shadow-sm border-0 bg-white rounded-3xl flex-shrink-0">
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                          1. Source Selection & Filtering
                        </h2>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Source Server
                            </Label>
                            <Select
                              value={sourceServer}
                              onValueChange={setSourceServer}
                            >
                              <SelectTrigger className="rounded-2xl">
                                <SelectValue placeholder="Select source server..." />
                              </SelectTrigger>
                              <SelectContent>
                                {connectionProfiles.map((profile) => (
                                  <SelectItem
                                    key={profile.name}
                                    value={profile.name}
                                  >
                                    {profile.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Remote Path
                            </Label>
                            <div className="flex space-x-2">
                              <Input
                                value={sourceRemotePath}
                                onChange={(e) =>
                                  setSourceRemotePath(e.target.value)
                                }
                                className="rounded-2xl flex-1"
                              />
                              <Button
                                variant="outline"
                                className="rounded-2xl bg-transparent"
                                onClick={() => {
                                  setActiveRemoteBrowserInput(
                                    "sourceRemotePath"
                                  );
                                  setActiveRemoteBrowserServer(null);
                                  setRemoteBrowserServer(sourceServer || "");
                                  setRemoteBrowserPath(sourceRemotePath || "/");
                                  setRemoteBrowserOpen(true);
                                }}
                              >
                                Browse
                              </Button>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              File Filter (e.g., *.so)
                            </Label>
                            <Input
                              value={fileFilter}
                              onChange={(e) => setFileFilter(e.target.value)}
                              placeholder="e.g., *.so or specific_file.txt"
                              className="rounded-2xl"
                            />
                          </div>

                          <Button
                            onClick={listObjects}
                            disabled={!sourceServer}
                            className="w-full bg-blue-600 hover:bg-blue-700 rounded-2xl"
                          >
                            <Search className="h-4 w-4 mr-2" />
                            List Objects
                          </Button>
                        </div>

                        <div className="mt-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            2. Object Selection
                          </h3>
                          <div className="space-y-3">
                            <Input
                              value={objectSearch}
                              onChange={(e) => setObjectSearch(e.target.value)}
                              placeholder="Search objects..."
                              className="rounded-2xl"
                            />
                            <div className="flex justify-between text-sm">
                              <span
                                className={`cursor-pointer transition-colors ${
                                  objectFilter === "all"
                                    ? "text-blue-600 font-semibold"
                                    : "text-gray-600 hover:text-blue-600"
                                }`}
                                onClick={() => setObjectFilter("all")}
                              >
                                Total: {comparisonObjects.length}
                              </span>
                              <span
                                className={`cursor-pointer transition-colors ${
                                  objectFilter === "selected"
                                    ? "text-blue-600 font-semibold"
                                    : "text-gray-600 hover:text-blue-600"
                                }`}
                                onClick={() => setObjectFilter("selected")}
                              >
                                Selected: {selectedObjects.length}
                              </span>
                            </div>
                            <div className="border border-gray-200 rounded-2xl overflow-hidden">
                              {comparisonObjects.length === 0 ? (
                                <div className="p-8 text-center">
                                  <p className="text-sm text-gray-500">
                                    Objects will be listed here.
                                  </p>
                                </div>
                              ) : (
                                <ScrollArea className="h-[280px]">
                                  <div className="p-2">
                                    <div className="flex items-center space-x-2 mb-2 pb-2 border-b">
                                      <Checkbox
                                        checked={
                                          filteredObjects.length > 0 &&
                                          filteredObjects.every((obj) =>
                                            selectedObjects.includes(obj.id)
                                          )
                                        }
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedObjects((prev) => [
                                              ...new Set([
                                                ...prev,
                                                ...filteredObjects.map(
                                                  (o) => o.id
                                                ),
                                              ]),
                                            ]);
                                          } else {
                                            setSelectedObjects((prev) =>
                                              prev.filter(
                                                (id) =>
                                                  !filteredObjects.some(
                                                    (o) => o.id === id
                                                  )
                                              )
                                            );
                                          }
                                        }}
                                      />
                                      <Label className="text-sm font-semibold">
                                        Select All
                                      </Label>
                                    </div>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-[36px]"></TableHead>
                                          <TableHead>File Name</TableHead>
                                          <TableHead className="text-right">
                                            Size
                                          </TableHead>
                                          <TableHead className="text-right">
                                            Modified
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {filteredObjects
                                          .filter((obj) =>
                                            objectFilter === "selected"
                                              ? selectedObjects.includes(obj.id)
                                              : true
                                          )
                                          .map((obj) => (
                                            <TableRow key={obj.id}>
                                              <TableCell>
                                                <Checkbox
                                                  checked={selectedObjects.includes(
                                                    obj.id
                                                  )}
                                                  onCheckedChange={(
                                                    checked
                                                  ) => {
                                                    if (checked) {
                                                      setSelectedObjects(
                                                        (prev) => [
                                                          ...prev,
                                                          obj.id,
                                                        ]
                                                      );
                                                    } else {
                                                      setSelectedObjects(
                                                        (prev) =>
                                                          prev.filter(
                                                            (id) =>
                                                              id !== obj.id
                                                          )
                                                      );
                                                    }
                                                  }}
                                                />
                                              </TableCell>
                                              <TableCell className="font-mono text-sm">
                                                {obj.name}
                                              </TableCell>
                                              <TableCell className="text-right text-xs text-gray-500">
                                                {formatFileSize(obj.size)}
                                              </TableCell>
                                              <TableCell className="text-right text-xs text-gray-500">
                                                {obj.modified
                                                  ? new Date(
                                                      obj.modified
                                                    ).toLocaleDateString() +
                                                    " " +
                                                    new Date(
                                                      obj.modified
                                                    ).toLocaleTimeString()
                                                  : ""}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </ScrollArea>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Target Selection Panel */}
                    <Card className="flex-1 shadow-sm border-0 bg-white rounded-3xl">
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                          3. Target Server Selection
                        </h2>

                        <div className="space-y-6">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Default Target Path
                            </Label>
                            <div className="flex space-x-2">
                              <Input
                                value={targetRemotePath}
                                onChange={(e) =>
                                  setTargetRemotePath(e.target.value)
                                }
                                className="rounded-2xl flex-1"
                              />
                              <Button
                                variant="outline"
                                className="rounded-2xl bg-transparent"
                                onClick={() => {
                                  setActiveRemoteBrowserInput(
                                    "targetRemotePath"
                                  );
                                  setActiveRemoteBrowserServer(null);
                                  setRemoteBrowserServer("");
                                  setRemoteBrowserPath(targetRemotePath || "/");
                                  setRemoteBrowserOpen(true);
                                }}
                              >
                                Browse
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              This will be used as default path for all target
                              servers. You can override individual server paths
                              below.
                            </p>
                          </div>

                          <div>
                            <div className="border border-gray-200 rounded-2xl p-4 mb-4 max-h-[600px] overflow-y-auto">
                              {Object.entries(
                                organizeServersByCategory(connectionProfiles)
                              )
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([category, servers]) => {
                                  const isExpanded =
                                    expandedTargetCategories[category] || false;
                                  const categoryServers = servers.map(
                                    (s) => s.name
                                  );
                                  const allCategorySelected =
                                    categoryServers.every((name) =>
                                      selectedTargetServers.includes(name)
                                    );
                                  const someCategorySelected =
                                    categoryServers.some((name) =>
                                      selectedTargetServers.includes(name)
                                    );

                                  return (
                                    <div
                                      key={category}
                                      className="mb-3 border border-gray-200 rounded-xl p-3 bg-gray-50 transition-all duration-200"
                                    >
                                      <div className="flex items-center space-x-2 mb-1">
                                        <Checkbox
                                          checked={allCategorySelected}
                                          ref={(el) => {
                                            if (el) {
                                              (el as any).indeterminate =
                                                someCategorySelected &&
                                                !allCategorySelected;
                                            }
                                          }}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedTargetServers(
                                                (prev) => [
                                                  ...new Set([
                                                    ...prev,
                                                    ...categoryServers,
                                                  ]),
                                                ]
                                              );
                                            } else {
                                              setSelectedTargetServers((prev) =>
                                                prev.filter(
                                                  (name) =>
                                                    !categoryServers.includes(
                                                      name
                                                    )
                                                )
                                              );
                                            }
                                          }}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() =>
                                            toggleCategory(category, true)
                                          }
                                        >
                                          {isExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </Button>
                                        <Label
                                          className="text-sm font-semibold text-gray-700 cursor-pointer flex-1"
                                          onClick={() =>
                                            toggleCategory(category, true)
                                          }
                                        >
                                          {category}
                                        </Label>
                                      </div>
                                      {isExpanded && (
                                        <div className="ml-8 mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                          {servers.map((server) => (
                                            <div
                                              key={server.name}
                                              className="space-y-2 p-2 rounded-lg bg-white border border-gray-100"
                                            >
                                              <div className="flex items-center space-x-2">
                                                <Checkbox
                                                  id={`target-${server.name}`}
                                                  checked={selectedTargetServers.includes(
                                                    server.name
                                                  )}
                                                  onCheckedChange={(checked) =>
                                                    handleTargetServerSelection(
                                                      server.name,
                                                      checked as boolean
                                                    )
                                                  }
                                                />
                                                <Label
                                                  htmlFor={`target-${server.name}`}
                                                  className="text-sm text-gray-700 cursor-pointer flex-1 font-medium"
                                                >
                                                  {server.name}{" "}
                                                  {server.host
                                                    ? `(${server.host})`
                                                    : ""}
                                                </Label>
                                              </div>
                                              <div className="ml-6 flex space-x-2">
                                                <Input
                                                  value={
                                                    targetServerPaths[
                                                      server.name
                                                    ] || ""
                                                  }
                                                  onChange={(e) =>
                                                    setTargetServerPaths(
                                                      (prev) => ({
                                                        ...prev,
                                                        [server.name]:
                                                          e.target.value,
                                                      })
                                                    )
                                                  }
                                                  placeholder="Path (uses default if empty)"
                                                  className="rounded-xl text-xs h-8 flex-1"
                                                />
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="rounded-xl h-8 text-xs"
                                                  onClick={() => {
                                                    setActiveRemoteBrowserInput(
                                                      null
                                                    );
                                                    setActiveRemoteBrowserServer(
                                                      server.name
                                                    );
                                                    setRemoteBrowserServer(
                                                      server.name
                                                    );
                                                    setRemoteBrowserPath(
                                                      targetServerPaths[
                                                        server.name
                                                      ] ||
                                                        targetRemotePath ||
                                                        "/"
                                                    );
                                                    setRemoteBrowserOpen(true);
                                                  }}
                                                >
                                                  Browse
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                            <Button
                              onClick={compareObjects}
                              disabled={
                                comparing ||
                                selectedObjects.length === 0 ||
                                selectedTargetServers.length === 0
                              }
                              className="bg-green-600 hover:bg-green-700 rounded-2xl"
                            >
                              {comparing ? (
                                <Activity className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <GitCompare className="h-4 w-4 mr-2" />
                              )}
                              Compare Objects
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Comparison Progress Card */}
                  {showComparisonProgress && (
                    <Card className="shadow-sm border-0 bg-white rounded-3xl">
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                          Comparison Progress
                        </h2>
                        {comparisonProgress && (
                          <div className="space-y-4">
                            <Progress
                              value={comparisonProgress.percentage}
                              className="h-3"
                            />
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>
                                Objects processed:{" "}
                                {comparisonProgress.objectsProcessed} /{" "}
                                {comparisonProgress.totalObjects}
                              </span>
                              <span>
                                Servers: {comparisonProgress.serversProcessed} /{" "}
                                {comparisonProgress.totalServers}
                              </span>
                            </div>
                            {comparisonProgress.currentObject && (
                              <div className="text-sm text-gray-500 mt-2">
                                Currently processing:{" "}
                                {comparisonProgress.currentObject}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Comparison Results Card */}
                  {showComparisonResults && comparisonResults && (
                    <Card className="shadow-sm border-0 bg-white rounded-3xl">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-semibold text-gray-800">
                            Comparison Results
                          </h2>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => {
                              // Export CSV functionality
                              toast({
                                title: "Export CSV",
                                description:
                                  "CSV export functionality will be implemented",
                              });
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </Button>
                        </div>
                        <div className="border border-gray-200 rounded-2xl overflow-hidden">
                          <ScrollArea className="h-[400px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Object</TableHead>
                                  <TableHead>Property</TableHead>
                                  <TableHead>{sourceServer} (Source)</TableHead>
                                  {selectedTargetServers.map((server) => (
                                    <TableHead key={server}>{server}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.entries(comparisonResults).map(
                                  ([objectPath, objectData]: [string, any]) => {
                                    const sourceData = objectData[sourceServer];
                                    const properties = [
                                      "md5",
                                      "owner",
                                      "permissions",
                                    ];
                                    return properties.map((prop, index) => {
                                      const isMismatch =
                                        selectedTargetServers.some((target) => {
                                          const targetData = objectData[target];
                                          if (
                                            !sourceData ||
                                            !targetData ||
                                            !sourceData[prop] ||
                                            !targetData[prop]
                                          )
                                            return true;
                                          return (
                                            sourceData[prop] !==
                                            targetData[prop]
                                          );
                                        });
                                      return (
                                        <TableRow
                                          key={`${objectPath}-${prop}`}
                                          className={
                                            isMismatch ? "bg-yellow-50" : ""
                                          }
                                        >
                                          {index === 0 && (
                                            <TableCell
                                              rowSpan={3}
                                              className="align-middle font-mono text-sm"
                                            >
                                              {objectPath}
                                            </TableCell>
                                          )}
                                          <TableCell className="font-semibold">
                                            {prop.charAt(0).toUpperCase() +
                                              prop.slice(1)}
                                          </TableCell>
                                          <TableCell className="font-mono text-sm">
                                            {sourceData && sourceData[prop]
                                              ? sourceData[prop]
                                              : sourceData?.error ||
                                                "Not found"}
                                          </TableCell>
                                          {selectedTargetServers.map(
                                            (target) => {
                                              const targetData =
                                                objectData[target];
                                              if (!targetData || !sourceData) {
                                                return (
                                                  <TableCell
                                                    key={target}
                                                    className="text-center text-gray-400"
                                                  >
                                                    ?
                                                  </TableCell>
                                                );
                                              } else if (
                                                !targetData[prop] ||
                                                !sourceData[prop]
                                              ) {
                                                return (
                                                  <TableCell
                                                    key={target}
                                                    className="text-center text-gray-400"
                                                  >
                                                    -
                                                  </TableCell>
                                                );
                                              } else if (
                                                sourceData[prop] ===
                                                targetData[prop]
                                              ) {
                                                return (
                                                  <TableCell
                                                    key={target}
                                                    className="text-center text-green-600"
                                                  >
                                                    ✓
                                                  </TableCell>
                                                );
                                              } else {
                                                return (
                                                  <TableCell
                                                    key={target}
                                                    className="text-center text-red-600"
                                                  >
                                                    ✗
                                                  </TableCell>
                                                );
                                              }
                                            }
                                          )}
                                        </TableRow>
                                      );
                                    });
                                  }
                                )}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Compare Log */}
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        Compare Log
                      </h2>
                      <ScrollArea className="h-[200px] border border-gray-200 rounded-2xl p-4 bg-gray-50">
                        <div
                          ref={comparisonLogRef}
                          className="space-y-1 font-mono text-sm"
                        >
                          {comparisonLogs.map((log, index) => (
                            <div
                              key={index}
                              className={`${
                                log.type === "info"
                                  ? "text-blue-600"
                                  : log.type === "success"
                                  ? "text-green-600"
                                  : log.type === "warning"
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}
                            >
                              [{log.timestamp}] {log.message}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Transfer Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900 text-center">
              Cancel Transfer
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Are you sure you want to cancel this transfer? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="rounded-2xl w-full sm:w-auto"
            >
              Keep Transfer
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelTransfer}
              className="rounded-2xl w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              Cancel Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remote Browser Modal */}
      <Dialog open={remoteBrowserOpen} onOpenChange={setRemoteBrowserOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Browse Remote Server</DialogTitle>
            <DialogDescription>
              Select a server and navigate to choose a remote path
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Server
              </Label>
              <Select
                value={remoteBrowserServer}
                onValueChange={(value) => {
                  setRemoteBrowserServer(value);
                  setRemoteBrowserPath("/");
                  setRemoteBrowserFiles([]);
                  setRemoteBrowserError(null);
                }}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Select a server to browse..." />
                </SelectTrigger>
                <SelectContent>
                  {connectionProfiles.map((profile) => (
                    <SelectItem key={profile.name} value={profile.name}>
                      {profile.name} {profile.host ? `(${profile.host})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    const parentPath =
                      remoteBrowserPath.substring(
                        0,
                        remoteBrowserPath.lastIndexOf("/")
                      ) || "/";
                    setRemoteBrowserPath(parentPath);
                    setRemoteBrowserError(null);
                  }}
                  disabled={remoteBrowserPath === "/"}
                >
                  ↑ Up
                </Button>
                <Input
                  value={remoteBrowserPath}
                  readOnly
                  className="rounded-2xl flex-1"
                />
              </div>
              {remoteBrowserError && (
                <Alert className="mb-4 border-red-200 bg-red-50 rounded-2xl">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 text-sm">
                    {remoteBrowserError}
                  </AlertDescription>
                </Alert>
              )}
              <ScrollArea className="h-[300px] border border-gray-200 rounded-2xl p-4">
                {remoteBrowserError ? (
                  <div className="text-center text-red-600 py-8">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm font-medium">{remoteBrowserError}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Please try a different path or check your permissions
                    </p>
                  </div>
                ) : remoteBrowserFiles.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {remoteBrowserServer
                      ? "Loading..."
                      : "Please select a server first"}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Parent directory ".." */}
                    {remoteBrowserPath !== "/" && (
                      <div
                        className="p-2 rounded-xl cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          const parentPath =
                            remoteBrowserPath.substring(
                              0,
                              remoteBrowserPath.lastIndexOf("/")
                            ) || "/";
                          setRemoteBrowserPath(parentPath);
                          setRemoteBrowserError(null);
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <ChevronRight className="h-4 w-4 text-blue-600 rotate-[-90deg]" />
                          <span className="text-sm font-medium">..</span>
                        </div>
                      </div>
                    )}
                    {remoteBrowserFiles.map((file, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded-xl cursor-pointer hover:bg-gray-100 ${
                          !file.is_dir ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        onClick={() => {
                          if (file.is_dir) {
                            const newPath =
                              remoteBrowserPath === "/"
                                ? `/${file.name}`
                                : `${remoteBrowserPath}/${file.name}`;
                            setRemoteBrowserPath(newPath);
                            setRemoteBrowserError(null);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          {file.is_dir ? (
                            <FolderOpen className="h-4 w-4 text-blue-600" />
                          ) : (
                            <FileIcon className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm">{file.name}</span>
                          {file.size && (
                            <Badge
                              variant="outline"
                              className="ml-auto text-xs"
                            >
                              {formatFileSize(file.size)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {remoteBrowserFiles.length === 0 &&
                      remoteBrowserPath === "/" && (
                        <div className="text-center text-gray-500 py-4">
                          Directory is empty
                        </div>
                      )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoteBrowserOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (activeRemoteBrowserInput) {
                  // Update the input field
                  if (activeRemoteBrowserInput === "remotePath") {
                    setRemotePath(remoteBrowserPath);
                  } else if (activeRemoteBrowserInput === "sourceRemotePath") {
                    setSourceRemotePath(remoteBrowserPath);
                  } else if (activeRemoteBrowserInput === "targetRemotePath") {
                    setTargetRemotePath(remoteBrowserPath);
                  }
                } else if (activeRemoteBrowserServer) {
                  // Update server-specific path
                  setTargetServerPaths((prev) => ({
                    ...prev,
                    [activeRemoteBrowserServer]: remoteBrowserPath,
                  }));
                }
                setRemoteBrowserOpen(false);
              }}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700"
            >
              Select Path
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
