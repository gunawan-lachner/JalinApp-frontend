"use client";

import {
  Folder,
  File as FileIcon,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Eye,
  Download,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { rnaApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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

interface FileTableProps {
  files: FileItem[];
  filteredFiles: FileItem[];
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  searchTerm: string;
  selectedConnection: string;
  currentPath: string;
  onSort: (column: string) => void;
  onFileClick: (file: FileItem) => void;
  onFileSelect: (fileName: string, index?: number, checked?: boolean) => void;
  onFileSelectWithShift: (
    fileName: string,
    index: number,
    checked: boolean
  ) => void;
  onSelectAll: () => void;
  onContextMenu: (e: React.MouseEvent, file: FileItem) => void;
  onRenameClick: (file: FileItem) => void;
  onDeleteClick: (file?: FileItem) => void;
  lastClickedIndex: number | null;
}

export function FileTable({
  files,
  filteredFiles,
  sortColumn,
  sortDirection,
  searchTerm,
  selectedConnection,
  currentPath,
  onSort,
  onFileClick,
  onFileSelect,
  onFileSelectWithShift,
  onSelectAll,
  onContextMenu,
  onRenameClick,
  onDeleteClick,
  lastClickedIndex,
}: FileTableProps) {
  const { toast } = useToast();

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

  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return "-";
    return new Date(timestamp * 1000).toLocaleString();
  };

  const handleDownloadClick = async (file: FileItem) => {
    if (!selectedConnection) return;
    try {
      const filePath =
        currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
      const response = await rnaApi.fileManagerDownloadFile({
        connection_name: selectedConnection,
        path: filePath,
      });

      if (response.success && response.data) {
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: `Downloaded "${file.name}"`,
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
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="w-12">
              <Checkbox
                checked={files.length > 0 && files.every((f) => f.selected)}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => onSort("name")}
            >
              <div className="flex items-center gap-2">
                Name
                {sortColumn === "name" && (
                  <span className="text-xs text-blue-600">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => onSort("size")}
            >
              <div className="flex items-center gap-2">
                Size
                {sortColumn === "size" && (
                  <span className="text-xs text-blue-600">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => onSort("type")}
            >
              <div className="flex items-center gap-2">
                Type
                {sortColumn === "type" && (
                  <span className="text-xs text-blue-600">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => onSort("modified")}
            >
              <div className="flex items-center gap-2">
                Modified
                {sortColumn === "modified" && (
                  <span className="text-xs text-blue-600">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => onSort("permissions")}
            >
              <div className="flex items-center gap-2">
                Permissions
                {sortColumn === "permissions" && (
                  <span className="text-xs text-blue-600">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => onSort("owner")}
            >
              <div className="flex items-center gap-2">
                Owner
                {sortColumn === "owner" && (
                  <span className="text-xs text-blue-600">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getSortedFiles().length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center py-12 text-gray-500"
              >
                <div className="flex flex-col items-center gap-2">
                  <Folder className="h-12 w-12 text-gray-300" />
                  <p className="text-sm font-medium">
                    {searchTerm
                      ? "No files match your search"
                      : "No files found"}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            getSortedFiles().map((file, index) => (
              <TableRow
                key={index}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                onClick={() => onFileClick(file)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={file.selected || false}
                    disabled={file.name === ".."}
                    onCheckedChange={(checked) => {
                      const sortedFiles = getSortedFiles();
                      const fileIndex = sortedFiles.findIndex(
                        (f) => f.name === file.name
                      );
                      onFileSelectWithShift(
                        file.name,
                        fileIndex,
                        checked as boolean
                      );
                    }}
                  />
                </TableCell>
                <TableCell
                  onContextMenu={(e) =>
                    file.name !== ".." && onContextMenu(e, file)
                  }
                >
                  <div className="flex items-center gap-2">
                    {file.is_dir ? (
                      <Folder className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    ) : (
                      <FileIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span
                      className={
                        file.name === ".."
                          ? "text-blue-600 font-medium"
                          : file.is_dir
                          ? "text-blue-600 font-medium"
                          : "text-gray-900"
                      }
                    >
                      {file.name === ".." ? ".. (Parent Directory)" : file.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">
                  {formatFileSize(file.size)}
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                    {file.type || "-"}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600 text-sm">
                  {formatDate(file.mtime)}
                </TableCell>
                <TableCell className="font-mono text-xs text-gray-600">
                  {file.permissions || "-"}
                </TableCell>
                <TableCell className="text-gray-600">
                  {file.owner || "-"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl">
                      <DropdownMenuItem className="rounded-xl">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      {!file.is_dir && (
                        <DropdownMenuItem
                          className="rounded-xl"
                          onClick={async () => {
                            await handleDownloadClick(file);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="rounded-xl"
                        onClick={() => onRenameClick(file)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 rounded-xl focus:text-red-600"
                        onClick={() => onDeleteClick(file)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
