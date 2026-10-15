"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  RefreshCw,
  Upload,
  FolderPlus,
  CheckSquare,
  Search,
  X,
  ChevronRight,
  Folder,
  File as FileIcon,
  HardDrive,
  ArrowRight,
  Download,
  Trash2,
  Eye,
  MoreVertical,
  Server,
  Edit,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/sidebar";
import type { ConnectionProfile } from "@/lib/types";
import { rnaApi } from "@/lib/api";
import { FileTable } from "@/components/file-manager/file-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileItem {
  name: string;
  is_dir: boolean;
  size: number;
  mtime: number;
  permissions?: string;
  owner?: string;
  type?: string;
  selected?: boolean;
}

interface DiskUsage {
  used: number;
  total: number;
  percentage: number;
}

export default function FileManagerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState(pathname);

  // Connection state
  const [connectionProfiles, setConnectionProfiles] = useState<
    ConnectionProfile[]
  >([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [loading, setLoading] = useState(true);

  // Path state
  const [currentPath, setCurrentPath] = useState("/");
  const [pathInput, setPathInput] = useState("/");

  // Files state
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Disk usage state
  const [diskUsage, setDiskUsage] = useState<DiskUsage>({
    used: 0,
    total: 0,
    percentage: 0,
  });

  // UI state
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [renameNewName, setRenameNewName] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [contextMenuFile, setContextMenuFile] = useState<FileItem | null>(null);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<
    Record<string, "working" | "success" | "error">
  >({});

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
      setActiveSection(href);
    },
    [router]
  );

  // Load connection profiles
  useEffect(() => {
    loadConnectionProfiles();
  }, []);

  // Load files when connection or path changes
  useEffect(() => {
    if (selectedConnection) {
      loadFiles();
      loadDiskUsage();
    }
  }, [selectedConnection, currentPath]);

  // Load files when search term changes (with debounce)
  useEffect(() => {
    if (selectedConnection) {
      const timeoutId = setTimeout(() => {
        loadFiles();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const loadConnectionProfiles = async () => {
    setLoading(true);
    try {
      const response = await rnaApi.getConnectionProfiles();
      if (response.success && response.data) {
        const sshConnections = response.data.filter(
          (profile) => profile.connection_type === "SSH"
        );
        setConnectionProfiles(sshConnections);
      }
    } catch (error) {
      console.error("Failed to load connection profiles:", error);
      toast({
        title: "Error",
        description: "Failed to load connection profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    if (!selectedConnection) return;

    try {
      const response = await rnaApi.fileManagerListDirectory({
        connection_name: selectedConnection,
        path: currentPath,
        filter: searchTerm.trim() || undefined,
      });

      if (response.success && response.data) {
        const data = response.data;
        if (data.success === false || data.error) {
          toast({
            title: "Error",
            description: data.error || "Failed to load files",
            variant: "destructive",
          });
          setFiles([]);
          setWarningMessage("");
        } else {
          // Show warning if present
          if (data.warning) {
            setWarningMessage(data.warning);
          } else {
            setWarningMessage("");
          }

          const fileItems: FileItem[] = (data.files || []).map((file: any) => ({
            name: file.name,
            is_dir: file.is_dir,
            size: file.size || 0,
            mtime: file.mtime || Date.now() / 1000,
            permissions: file.permissions || "-rw-r--r--",
            owner: file.owner || "renapp",
            type: getFileType(file.name, file.is_dir),
            selected: false,
          }));

          // Add parent directory if not at root
          if (currentPath !== "/") {
            fileItems.unshift({
              name: "..",
              is_dir: true,
              size: 0,
              mtime: 0,
              permissions: "-",
              owner: "-",
              type: "Parent",
              selected: false,
            });
          }

          setFiles(fileItems);
        }
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load files",
          variant: "destructive",
        });
        setFiles([]);
      }
    } catch (error) {
      console.error("Failed to load files:", error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    }
  };

  const loadDiskUsage = async () => {
    if (!selectedConnection) return;

    try {
      const response = await rnaApi.fileManagerGetDiskUsage({
        connection_name: selectedConnection,
      });

      if (response.success && response.data) {
        const usage = response.data.usage;
        setDiskUsage({
          used: usage.used,
          total: usage.total,
          percentage: Math.round(usage.percent),
        });
      } else {
        // Fallback to mock data on error
        setDiskUsage({
          used: 4.3 * 1024 * 1024 * 1024,
          total: 21 * 1024 * 1024 * 1024,
          percentage: 20,
        });
      }
    } catch (error) {
      console.error("Failed to load disk usage:", error);
      // Fallback to mock data
      setDiskUsage({
        used: 4.3 * 1024 * 1024 * 1024,
        total: 21 * 1024 * 1024 * 1024,
        percentage: 20,
      });
    }
  };

  // Filter files locally (for display after API call)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFiles(files);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = files.filter((file) =>
        file.name.toLowerCase().includes(term)
      );
      setFilteredFiles(filtered);
    }
  }, [files, searchTerm]);

  const handlePathChange = (newPath: string) => {
    setCurrentPath(newPath);
    setPathInput(newPath);
  };

  const handleBreadcrumbClick = (path: string) => {
    handlePathChange(path);
  };

  const handleFileClick = (file: FileItem) => {
    if (file.name === "..") {
      // Navigate to parent directory
      const parentPath =
        currentPath === "/"
          ? "/"
          : currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";
      handlePathChange(parentPath);
    } else if (file.is_dir) {
      // Navigate into directory
      const newPath =
        currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
      handlePathChange(newPath);
    }
  };

  const handleSelectAll = () => {
    const filesToSelect = files.filter((f) => f.name !== "..");
    const allSelected = filesToSelect.every((f) => f.selected);
    const updatedFiles = files.map((f) => ({
      ...f,
      selected: f.name === ".." ? false : !allSelected,
    }));
    setFiles(updatedFiles);
  };

  const handleFileSelect = (
    fileName: string,
    index?: number,
    checked?: boolean
  ) => {
    const updatedFiles = files.map((f) =>
      f.name === fileName
        ? { ...f, selected: checked !== undefined ? checked : !f.selected }
        : f
    );
    setFiles(updatedFiles);
    if (index !== undefined) {
      setLastClickedIndex(index);
    }
  };

  // Shift-click range selection
  const handleFileSelectWithShift = (
    fileName: string,
    index: number,
    checked: boolean
  ) => {
    if (lastClickedIndex !== null) {
      const sortedFiles = getSortedFiles();
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);

      const updatedFiles = files.map((f, i) => {
        const fileIndex = sortedFiles.findIndex(
          (sf: FileItem) => sf.name === f.name
        );
        if (fileIndex >= start && fileIndex <= end && f.name !== "..") {
          return { ...f, selected: checked };
        }
        return f;
      });
      setFiles(updatedFiles);
    } else {
      handleFileSelect(fileName, index, checked);
    }
    setLastClickedIndex(index);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortedFiles = () => {
    if (!sortColumn) return filteredFiles;

    const sorted = [...filteredFiles].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "size":
          comparison = a.size - b.size;
          break;
        case "type":
          comparison = (a.type || "").localeCompare(b.type || "");
          break;
        case "modified":
          comparison = a.mtime - b.mtime;
          break;
        case "permissions":
          comparison = (a.permissions || "").localeCompare(b.permissions || "");
          break;
        case "owner":
          comparison = (a.owner || "").localeCompare(b.owner || "");
          break;
        default:
          return 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "-";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getFileType = (name: string, isDir: boolean): string => {
    if (isDir) return "Directory";
    if (name === "..") return "Parent";
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "txt") return "Text";
    if (["tar", "gz", "zip", "rar"].includes(ext || "")) return "Archive";
    if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return "Image";
    if (["pdf", "doc", "docx"].includes(ext || "")) return "Document";
    return "File";
  };

  const getBreadcrumbs = () => {
    if (currentPath === "/") return ["/"];
    const parts = currentPath.split("/").filter((p) => p);
    const breadcrumbs = ["/"];
    let current = "";
    parts.forEach((part) => {
      current += `/${part}`;
      breadcrumbs.push(current);
    });
    return breadcrumbs;
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedConnection) return;

    try {
      const response = await rnaApi.fileManagerCreateFolder({
        connection_name: selectedConnection,
        path: currentPath,
        folder_name: newFolderName.trim(),
      });

      if (response.success) {
        toast({
          title: "Success",
          description:
            response.data?.message ||
            `Folder "${newFolderName}" created successfully`,
        });
        setShowCreateFolderDialog(false);
        setNewFolderName("");
        loadFiles();
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to create folder",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    loadFiles();
    loadDiskUsage();
    toast({
      title: "Refreshed",
      description: "File list and disk usage updated",
    });
  };

  const selectedCount = files.filter(
    (f) => f.selected && f.name !== ".."
  ).length;
  const selectedFiles = files.filter((f) => f.selected && f.name !== "..");

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuFile(file);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuVisible(false);
    };
    if (contextMenuVisible) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenuVisible]);

  // Rename handlers
  const handleRenameClick = (file: FileItem) => {
    setFileToRename(file);
    setRenameNewName(file.name);
    setShowRenameDialog(true);
    setContextMenuVisible(false);
  };

  const handleConfirmRename = async () => {
    if (!fileToRename || !renameNewName.trim() || !selectedConnection) return;

    try {
      const response = await rnaApi.fileManagerRename({
        connection_name: selectedConnection,
        path: currentPath,
        old_name: fileToRename.name,
        new_name: renameNewName.trim(),
      });

      if (response.success) {
        toast({
          title: "Success",
          description:
            response.data?.message ||
            `Renamed "${fileToRename.name}" to "${renameNewName}"`,
        });
        setShowRenameDialog(false);
        setFileToRename(null);
        setRenameNewName("");
        loadFiles();
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to rename file",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename file",
        variant: "destructive",
      });
    }
  };

  // Delete handlers
  const handleDeleteClick = (file?: FileItem) => {
    if (file) {
      setContextMenuFile(file);
    }
    setShowDeleteDialog(true);
    setContextMenuVisible(false);
  };

  const handleConfirmDelete = async () => {
    if (!selectedConnection) return;
    const filesToDelete = contextMenuFile ? [contextMenuFile] : selectedFiles;
    setDeleteProgress({});

    try {
      const fileNames = filesToDelete.map((f) => f.name);

      // Update progress for all files
      fileNames.forEach((name) => {
        setDeleteProgress((prev) => ({ ...prev, [name]: "working" }));
      });

      const response = await rnaApi.fileManagerDelete({
        connection_name: selectedConnection,
        path: currentPath,
        files: fileNames,
      });

      if (response.success && response.data) {
        // Mark all as success
        fileNames.forEach((name) => {
          setDeleteProgress((prev) => ({ ...prev, [name]: "success" }));
        });

        // Show warnings if any
        if (response.data.warnings && response.data.warnings.length > 0) {
          response.data.warnings.forEach((warning: string) => {
            const fileName = warning.split(":")[0];
            if (fileNames.includes(fileName)) {
              setDeleteProgress((prev) => ({ ...prev, [fileName]: "error" }));
            }
          });
        }

        toast({
          title: "Success",
          description:
            response.data.message ||
            `Deleted ${response.data.deleted_count} item(s)`,
        });

        setTimeout(() => {
          setShowDeleteDialog(false);
          setContextMenuFile(null);
          setDeleteProgress({});
          const updatedFiles = files.map((f) => ({ ...f, selected: false }));
          setFiles(updatedFiles);
          loadFiles();
        }, 1500);
      } else {
        // Mark all as error
        fileNames.forEach((name) => {
          setDeleteProgress((prev) => ({ ...prev, [name]: "error" }));
        });
        toast({
          title: "Error",
          description: response.error || "Failed to delete files",
          variant: "destructive",
        });
      }
    } catch (error) {
      const fileNames = filesToDelete.map((f) => f.name);
      fileNames.forEach((name) => {
        setDeleteProgress((prev) => ({ ...prev, [name]: "error" }));
      });
      toast({
        title: "Error",
        description: "Failed to delete files",
        variant: "destructive",
      });
    }
  };

  // Bulk download
  const handleBulkDownload = async () => {
    if (selectedFiles.length === 0 || !selectedConnection) return;

    try {
      const fileNames = selectedFiles.map((f) => f.name);
      const response = await rnaApi.fileManagerBulkDownload({
        connection_name: selectedConnection,
        path: currentPath,
        files: fileNames,
      });

      if (response.success && response.data) {
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "selected_files.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: `Downloaded ${fileNames.length} file(s)`,
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to download files",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download files",
        variant: "destructive",
      });
    }
  };

  // Upload handlers
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(e.target.files);
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadFiles || !selectedConnection) return;

    try {
      setUploadProgress(10);
      const fileArray = Array.from(uploadFiles);

      const response = await rnaApi.fileManagerUpload(
        selectedConnection,
        currentPath,
        fileArray
      );

      setUploadProgress(100);

      if (response.success && response.data) {
        toast({
          title: "Success",
          description:
            response.data.message ||
            `Uploaded ${response.data.uploaded_count} file(s)`,
        });

        if (response.data.warnings && response.data.warnings.length > 0) {
          toast({
            title: "Warning",
            description: `Some files failed: ${response.data.warnings.join(
              ", "
            )}`,
            variant: "destructive",
          });
        }

        setShowUploadDialog(false);
        setUploadFiles(null);
        setUploadProgress(0);
        loadFiles();
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to upload files",
          variant: "destructive",
        });
        setUploadProgress(0);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
      setUploadProgress(0);
    }
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
                <span className="text-gray-800 font-medium">File Manager</span>
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
              <span className="text-gray-800 font-medium">File Manager</span>
            </div>
          </div>

          <div className="p-6 max-w-full">
            {/* Hero Section */}
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                File Manager
              </h1>
              <p className="text-gray-600">
                Browse, manage, and organize files on remote SSH servers with an
                intuitive file browser interface.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {/* Top Controls Section */}
              <div className="flex gap-6">
                {/* Connection & Path Card */}
                <Card className="flex-1 shadow-sm border-0 bg-white rounded-3xl">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                      <Server className="h-6 w-6 text-blue-600" />
                      <span>Connection</span>
                    </h2>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Select Connection
                      </Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedConnection}
                          onValueChange={setSelectedConnection}
                          disabled={loading}
                        >
                          <SelectTrigger className="flex-1 rounded-2xl">
                            <SelectValue placeholder="Select a connection..." />
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
                          variant="outline"
                          size="icon"
                          onClick={loadConnectionProfiles}
                          className="rounded-2xl"
                          title="Refresh connections"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Disk Usage Card */}
                <Card className="w-96 shadow-sm border-0 bg-white rounded-3xl flex-shrink-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <HardDrive className="h-5 w-5 text-blue-600" />
                      Disk Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {formatFileSize(diskUsage.used)} /{" "}
                          {formatFileSize(diskUsage.total)}
                        </span>
                        <span className="text-gray-800 font-semibold">
                          {diskUsage.percentage}%
                        </span>
                      </div>
                      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-blue-600 transition-all rounded-full"
                          style={{ width: `${diskUsage.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Used</span>
                        <span>Available</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="rounded-2xl bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  variant="outline"
                  className="rounded-2xl bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
                <Button
                  onClick={() => setShowCreateFolderDialog(true)}
                  variant="outline"
                  className="rounded-2xl bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
                <Button
                  onClick={handleSelectAll}
                  variant="outline"
                  className="rounded-2xl bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select All
                </Button>

                {/* Current Path */}
                <div className="flex items-center gap-2 ml-auto">
                  <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Current Path:
                  </Label>
                  <div className="flex items-center gap-2">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-1 flex-wrap bg-gray-50 rounded-2xl px-3 py-2 min-w-0">
                      {getBreadcrumbs().map((path, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <button
                            onClick={() => handleBreadcrumbClick(path)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm px-2 py-1 rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap"
                          >
                            {path === "/" ? "/" : path.split("/").pop()}
                          </button>
                          {index < getBreadcrumbs().length - 1 && (
                            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                    <Input
                      value={pathInput}
                      onChange={(e) => setPathInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handlePathChange(pathInput);
                        }
                      }}
                      className="w-64 rounded-2xl"
                      placeholder="/path/to/directory"
                    />
                    <Button
                      onClick={() => handlePathChange(pathInput)}
                      className="rounded-2xl bg-blue-600 hover:bg-blue-700"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Go
                    </Button>
                  </div>
                </div>

                {selectedCount > 0 && (
                  <>
                    <Button
                      onClick={handleBulkDownload}
                      variant="outline"
                      className="rounded-2xl bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected ({selectedCount})
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick()}
                      variant="outline"
                      className="rounded-2xl bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedCount})
                    </Button>
                    <div className="px-4 py-2 bg-blue-50 rounded-2xl border border-blue-200">
                      <span className="text-sm font-medium text-blue-700">
                        {selectedCount} item{selectedCount !== 1 ? "s" : ""}{" "}
                        selected
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Selected Files Display */}
              {selectedCount > 0 && (
                <Card className="shadow-sm border-0 bg-blue-50 rounded-3xl border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-700">
                          Selected Files: {selectedCount}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updatedFiles = files.map((f) => ({
                            ...f,
                            selected: false,
                          }));
                          setFiles(updatedFiles);
                        }}
                        className="rounded-2xl bg-white hover:bg-gray-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Selection
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warning Message */}
              {warningMessage && (
                <Card className="shadow-sm border-0 bg-yellow-50 rounded-3xl border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        {warningMessage}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setWarningMessage("")}
                        className="ml-auto h-6 w-6 rounded-full hover:bg-yellow-100"
                      >
                        <X className="h-4 w-4 text-yellow-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Files Table Card */}
              <Card className="shadow-sm border-0 bg-white rounded-3xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Folder className="h-5 w-5 text-blue-600" />
                      Files and Directories
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Filter files (case-insensitive)"
                          className="pl-10 pr-10 w-64 rounded-2xl"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:bg-gray-100 rounded-full p-1 transition-colors"
                          >
                            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </button>
                        )}
                      </div>
                      {searchTerm && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                          onClick={() => setSearchTerm("")}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FileTable
                    files={files}
                    filteredFiles={filteredFiles}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    searchTerm={searchTerm}
                    selectedConnection={selectedConnection}
                    currentPath={currentPath}
                    onSort={handleSort}
                    onFileClick={handleFileClick}
                    onFileSelect={handleFileSelect}
                    onFileSelectWithShift={handleFileSelectWithShift}
                    onSelectAll={handleSelectAll}
                    onContextMenu={handleContextMenu}
                    onRenameClick={handleRenameClick}
                    onDeleteClick={handleDeleteClick}
                    lastClickedIndex={lastClickedIndex}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog
        open={showCreateFolderDialog}
        onOpenChange={setShowCreateFolderDialog}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="rounded-2xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateFolderDialog(false);
                setNewFolderName("");
              }}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Upload files to the current directory: {currentPath}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Files
              </Label>
              <Input
                type="file"
                multiple
                onChange={handleFileInputChange}
                className="rounded-2xl"
              />
              {uploadFiles && (
                <p className="text-sm text-gray-600 mt-2">
                  {uploadFiles.length} file(s) selected
                </p>
              )}
            </div>
            {uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="text-gray-800 font-medium">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-600 transition-all rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setUploadFiles(null);
                setUploadProgress(0);
              }}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={!uploadFiles || uploadProgress > 0}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700"
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Rename File/Folder</DialogTitle>
            <DialogDescription>Enter a new name for the item</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Current Name
              </Label>
              <Input
                value={fileToRename?.name || ""}
                readOnly
                className="rounded-2xl bg-gray-50"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                New Name
              </Label>
              <Input
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                placeholder="Enter new name..."
                className="rounded-2xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmRename();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRenameDialog(false);
                setFileToRename(null);
                setRenameNewName("");
              }}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRename}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the selected item(s)? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Warning: This action cannot be undone!
                </span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Items to delete:
              </Label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-2xl p-3 bg-gray-50">
                <ul className="space-y-1">
                  {(contextMenuFile ? [contextMenuFile] : selectedFiles).map(
                    (file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between text-sm text-gray-700"
                      >
                        <span>• {file.name}</span>
                        {deleteProgress[file.name] && (
                          <span className="ml-2">
                            {deleteProgress[file.name] === "working" && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            )}
                            {deleteProgress[file.name] === "success" && (
                              <span className="text-green-600">✓</span>
                            )}
                            {deleteProgress[file.name] === "error" && (
                              <span className="text-red-600">✗</span>
                            )}
                          </span>
                        )}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setContextMenuFile(null);
                setDeleteProgress({});
              }}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="rounded-2xl bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      {contextMenuVisible && contextMenuFile && (
        <div
          className="fixed bg-white border border-gray-200 rounded-2xl shadow-lg z-50 min-w-[160px] py-2"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
        >
          {!contextMenuFile.is_dir && (
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl flex items-center gap-2"
              onClick={async () => {
                if (!selectedConnection) return;
                setContextMenuVisible(false);
                try {
                  const filePath =
                    currentPath === "/"
                      ? `/${contextMenuFile.name}`
                      : `${currentPath}/${contextMenuFile.name}`;
                  const response = await rnaApi.fileManagerDownloadFile({
                    connection_name: selectedConnection,
                    path: filePath,
                  });

                  if (response.success && response.data) {
                    const blob = response.data;
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = contextMenuFile.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);

                    toast({
                      title: "Success",
                      description: `Downloaded "${contextMenuFile.name}"`,
                    });
                  } else {
                    toast({
                      title: "Error",
                      description: response.error || "Failed to download file",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to download file",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Download className="h-4 w-4 text-green-600" />
              Download
            </button>
          )}
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl flex items-center gap-2"
            onClick={() => handleRenameClick(contextMenuFile)}
          >
            <Edit className="h-4 w-4 text-yellow-600" />
            Rename
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2"
            onClick={() => handleDeleteClick(contextMenuFile)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          {selectedCount > 0 && (
            <>
              <div className="h-px bg-gray-200 my-2" />
              <button
                className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-xl flex items-center gap-2"
                onClick={() => {
                  handleBulkDownload();
                  setContextMenuVisible(false);
                }}
              >
                <Download className="h-4 w-4" />
                Download Selected ({selectedCount})
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2"
                onClick={() => {
                  handleDeleteClick();
                  setContextMenuVisible(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedCount})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
