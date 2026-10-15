"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Copy,
  X,
  Database,
  Activity,
  Search,
  Users,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import { useRnaApi } from "@/hooks/useRnaApi";
import type {
  ConnectionProfile,
  Participant,
  ContainerPlugin,
} from "@/lib/types";
import { ParticipantTable } from "@/components/rna/participant-table";
import { ParticipantFilters } from "@/components/rna/participant-filters";
import { Sidebar } from "@/components/layout/sidebar";
import { ContainerPluginDetailsModal } from "@/components/rna/container-plugin-details-modal";
import { ParticipantDuplicateModal } from "@/components/rna/participant-duplicate-modal";
import {
  ParticipantFormModal,
  type ParticipantFormValues,
} from "@/components/rna/participant-form-modal";


export default function ParticipantPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState(pathname);
  const [selectedConnection, setSelectedConnection] = useState("");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedRows, setSelectedRows] = useState(new Set<number>());
  const [paginationState, setPaginationState] = useState({
    currentPage: 1,
    pageSize: 20,
    totalRows: 0,
    totalPages: 0,
    executionTime: 0,
  });
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [preferredPageSize, setPreferredPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      return Number.parseInt(
        localStorage.getItem("rna_participant_page_size") || "20"
      );
    }
    return 20;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  );
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    rowIndex?: number;
    cellKey?: string;
    cellValue?: string;
  }>({ visible: false, x: 0, y: 0 });
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // State for Container Plugin Details Modal
  const [showPluginDetailsModal, setShowPluginDetailsModal] = useState(false);
  const [pluginDetails, setPluginDetails] = useState<ContainerPlugin | null>(
    null
  );
  const [pluginDetailsLoading, setPluginDetailsLoading] = useState(false);
  const [pluginDetailsError, setPluginDetailsError] = useState<string | null>(
    null
  );

  // State for Participant Duplicate Modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [participantToDuplicate, setParticipantToDuplicate] =
    useState<Participant | null>(null);

  // State for Participant Create/Edit Modal
  const [showFormModal, setShowFormModal] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [isFormSubmitting, setIsFormSubmitting] = useState(false)

  // State for Delete Confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // State for SQL Query Display
  const [queryInfo, setQueryInfo] = useState<{
    executedSql?: string;
    executionTime?: number;
    error?: string | null;
  } | null>(null);
  const [showQuerySection, setShowQuerySection] = useState(false);

  const api = useRnaApi();
  const [connectionProfiles, setConnectionProfiles] = useState<
    ConnectionProfile[]
  >([]);
  const [searchResults, setSearchResults] = useState<{
    total_rows: number;
    page: number;
    page_size: number;
    execution_time?: number;
    error?: string | null;
    executed_sql?: string;
  } | null>(null);

  const latestParticipantRequestId = useRef(0)
  const skipColumnFilterRefetch = useRef(false)

  useEffect(() => {
    console.log("🚀 Participant page mounted, fetching connection profiles...");
    api.getConnectionProfiles(
      (data) => {
        console.log("✅ Connection profiles loaded successfully:", data);
        setConnectionProfiles(data || []);
      },
      (error) => {
        console.error("❌ Failed to load connection profiles:", error);
        toast({
          title: "Failed to Load Connection Profiles",
          description:
            error || "An error occurred while loading connection profiles.",
          variant: "destructive",
        });
      }
    );
  }, []);

  // Auto-fetch when connection changes or page size changes
  useEffect(() => {
    if (selectedConnection && connectionProfiles.length > 0) {
      skipColumnFilterRefetch.current = true;
      console.log("🔄 Auto-fetching participants for:", selectedConnection);
      handleSearch(1, preferredPageSize);
    }
  }, [selectedConnection, preferredPageSize]);

  // Refetch when column header filters change (server-side; avoids empty pages mid-pagination)
  useEffect(() => {
    if (!selectedConnection || connectionProfiles.length === 0) return
    if (skipColumnFilterRefetch.current) {
      skipColumnFilterRefetch.current = false
      return
    }
    const id = setTimeout(() => {
      handleSearch(1, preferredPageSize)
    }, 350)
    return () => clearTimeout(id)
  }, [columnFilters])

  const handleNavigation = (href: string) => {
    router.push(href);
    setActiveSection(href);
  };

  const handleSearch = async (
    newPage = 1,
    newPageSize = paginationState.pageSize
  ) => {
    if (!selectedConnection) {
      console.warn("⚠️ No connection selected, skipping participant search");
      return;
    }

    const requestId = ++latestParticipantRequestId.current;
    setIsPaginationLoading(true);
    console.log(
      `🔍 Searching participants page ${newPage} with ${newPageSize} items per page`
    );
    console.log(`🔗 Connection: ${selectedConnection}`);
    console.log(`🔎 Search Term: ${searchTerm}`);

    const column_filters: Record<string, string> = {}
    Object.entries(columnFilters).forEach(([k, v]) => {
      if (v && String(v).trim()) column_filters[k] = String(v).trim()
    })

    const searchParams = {
      profileId: selectedConnection,
      page: newPage,
      page_size: newPageSize,
      search: searchTerm.trim() !== "" ? searchTerm.trim() : undefined,
      ...(Object.keys(column_filters).length > 0 ? { column_filters } : {}),
    };

    api.getParticipants(
      searchParams,
      (data) => {
        if (requestId !== latestParticipantRequestId.current) return;
        console.log("✅ Participant search results received:", data);
        setParticipants(data.results || []);
        setPaginationState({
          currentPage: data.page || newPage,
          pageSize: data.page_size || newPageSize,
          totalRows: data.total_rows || 0,
          totalPages: Math.ceil(
            (data.total_rows || 0) / (data.page_size || newPageSize)
          ),
          executionTime: Math.round((data.execution_time || 0) * 1000),
        });
        setSearchResults(data);
        setSelectedRows(new Set());
        setQueryInfo({
          executedSql: data.executed_sql,
          executionTime: data.execution_time,
          error: data.error,
        });
        setIsPaginationLoading(false);
      },
      (error) => {
        if (requestId !== latestParticipantRequestId.current) return;
        console.error("❌ Participant search failed:", error);
        setParticipants([]);
        setSearchResults(null);
        setPaginationState((prev) => ({
          ...prev,
          totalRows: 0,
          totalPages: 0,
        }));
        setQueryInfo({
          executedSql: undefined,
          executionTime: undefined,
          error: error || "Failed to fetch participants",
        });
        toast({
          title: "Search Failed",
          description:
            error || "Failed to fetch participants. Please try again.",
          variant: "destructive",
        });
        setIsPaginationLoading(false);
      }
    );
  };

  const clearFilters = () => {
    skipColumnFilterRefetch.current = true;
    setSearchTerm("");
    setTypeFilter("all");
    setColumnFilters({});
    if (selectedConnection) {
      // Re-run search after clearing filters, starting from page 1
      setTimeout(() => handleSearch(1, preferredPageSize), 100);
    }
  };

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleRowSelectAll = (selectAll: boolean) => {
    const newSelected = new Set<number>();
    if (selectAll && participants.length > 0) {
      participants.forEach((_, index) => newSelected.add(index));
    }
    setSelectedRows(newSelected);
  };

  const exportData = async (format: "csv") => {
    if (!selectedConnection) {
      toast({
        title: "Connection Required",
        description: "Please select a connection first!",
        variant: "destructive",
      });
      return;
    }

    const participantsToExport =
      selectedRows.size > 0
        ? Array.from(selectedRows).map((index) => participants[index])
        : participants;

    if (participantsToExport.length === 0) {
      toast({
        title: "No Data to Export",
        description: "No participants to export!",
        variant: "destructive",
      });
      return;
    }

    try {
      const headers = Object.keys(participantsToExport[0]).join(",");
      const rows = participantsToExport
        .map((p) =>
          Object.values(p)
            .map((val) => `"${String(val).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
      const csvContent = `${headers}\n${rows}`;

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `participants_${timestamp}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log(`📥 CSV file downloaded: ${filename}`);
    } catch (error) {
      console.error("❌ CSV export failed:", error);
      toast({
        title: "Export Failed",
        description:
          error instanceof Error ? error.message : "Failed to export CSV file.",
        variant: "destructive",
      });
    }
  };

  const retryConnection = () => {
    console.log("🔄 Manual retry triggered");
    api.clearError();
    api.getConnectionProfiles(
      (data) => {
        console.log("✅ Retry successful - Connection profiles loaded:", data);
        setConnectionProfiles(data || []);
      },
      (error) => {
        console.error("❌ Retry failed:", error);
        toast({
          title: "Retry Failed",
          description:
            error || "Failed to reload connection profiles. Please try again.",
          variant: "destructive",
        });
      }
    );
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleRightClick = (
    e: React.MouseEvent,
    rowIndex: number,
    cellKey?: string,
    cellValue?: string
  ) => {
    e.preventDefault();

    let finalCellKey = cellKey;
    let finalCellValue = cellValue;

    if (!cellKey || !cellValue) {
      const target = e.target as HTMLElement;
      const cell = target.closest("td");
      if (cell) {
        const cellIndex = Array.from(
          cell.parentElement?.children || []
        ).indexOf(cell);
        const visibleColumns = [
          { key: "id", label: "ID" },
          { key: "ext_id", label: "Ext ID" },
          { key: "participant_type", label: "Type" },
          { key: "name", label: "Name" },
          { key: "container_plugin_name", label: "Plugin Name" },
          { key: "network_type", label: "Network Type" },
          { key: "active", label: "Active" },
          { key: "display_on_ui", label: "Display UI" },
          { key: "comments", label: "Comments" },
        ].filter((col) => !hiddenColumns.has(col.key));

        if (cellIndex >= 2) {
          const columnIndex = cellIndex - 2;
          if (columnIndex < visibleColumns.length) {
            const currentParticipant = participants[rowIndex];
            finalCellKey = visibleColumns[columnIndex].key;
            finalCellValue = String(
              currentParticipant[finalCellKey as keyof Participant] || ""
            );
          }
        }
      }
    }

    console.log(
      `🖱️ Right click on row ${rowIndex}, cell: ${finalCellKey} = "${finalCellValue}"`
    );

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIndex,
      cellKey: finalCellKey,
      cellValue: finalCellValue,
    });
  };

  const handleContextMenuAction = (action: string) => {
    const { rowIndex, cellKey, cellValue } = contextMenu;
    switch (action) {
      case "copy-cell":
        if (cellValue) navigator.clipboard.writeText(cellValue);
        break;
      case "copy-row":
        if (rowIndex !== undefined) {
          const row = participants[rowIndex];
          const rowText = Object.entries(row)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n");
          navigator.clipboard.writeText(rowText);
        }
        break;
      case "filter-by-value":
        if (cellKey && cellValue) {
          console.log(
            `🔍 Filtering column "${cellKey}" by value: "${cellValue}"`
          );
          setColumnFilters((prev) => ({
            ...prev,
            [cellKey]: cellValue,
          }));
        }
        break;
      case "select-all":
        handleRowSelectAll(true);
        break;
      case "clear-selection":
        setSelectedRows(new Set());
        break;
      case "duplicate-participant":
        if (rowIndex !== undefined) {
          const participant = participants[rowIndex];
          handleDuplicateParticipant(participant);
        }
        break;
      case "edit-participant":
        if (rowIndex !== undefined) {
          handleEditParticipant(participants[rowIndex]);
        }
        break;
      case "delete-participant":
        if (rowIndex !== undefined) {
          handleDeleteParticipant(participants[rowIndex]);
        }
        break;
    }
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const changePageSize = (newPageSize: number) => {
    localStorage.setItem("rna_participant_page_size", newPageSize.toString());
    setPreferredPageSize(newPageSize);
    handleSearch(1, newPageSize);
  };

  const clearColumnFilter = (columnKey: string) => {
    setColumnFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[columnKey];
      return newFilters;
    });
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({});
  };

  // Function to handle viewing plugin details
  const handleViewPluginDetails = async (pluginName: string) => {
    if (!selectedConnection) {
      toast({
        title: "Connection Required",
        description: "Please select a connection profile first.",
        variant: "destructive",
      });
      return;
    }
    setPluginDetails(null);
    setPluginDetailsError(null);
    setPluginDetailsLoading(true);
    setShowPluginDetailsModal(true);

    api.getContainerPluginDetails(
      { profileId: selectedConnection, name: pluginName },
      (data) => {
        if (data && data.length > 0) {
          setPluginDetails(data[0]);
          setPluginDetailsError(null);
        } else {
          const errorMsg = "No details found for this plugin.";
          setPluginDetailsError(errorMsg);
          toast({
            title: "No Details Found",
            description: errorMsg,
            variant: "destructive",
          });
        }
        setPluginDetailsLoading(false);
      },
      (error) => {
        const errorMsg = error || "Failed to fetch plugin details.";
        setPluginDetailsError(errorMsg);
        setPluginDetailsLoading(false);
        toast({
          title: "Failed to Load Plugin Details",
          description: errorMsg,
          variant: "destructive",
        });
      }
    );
  };

  // Function to handle participant duplication
  const handleDuplicateParticipant = (participant: Participant) => {
    setParticipantToDuplicate(participant);
    setShowDuplicateModal(true);
  };

  const handleDuplicateSuccess = () => {
    // Refresh the participant list after successful duplication
    if (selectedConnection) {
      handleSearch(paginationState.currentPage, paginationState.pageSize);
    }
  };

  const handleCreateParticipant = () => {
    if (!selectedConnection) {
      toast({
        title: "Connection required",
        description: "Please select a database connection first.",
        variant: "destructive",
      })
      return
    }
    setFormMode("create")
    setEditingParticipant(null)
    setShowFormModal(true)
  }

  const handleEditParticipant = (participant: Participant) => {
    setFormMode("edit")
    setEditingParticipant(participant)
    setShowFormModal(true)
  }

  const handleDeleteParticipant = (participant: Participant) => {
    setParticipantToDelete(participant)
    setShowDeleteConfirm(true)
  }

  const handleFormSubmit = (values: ParticipantFormValues) => {
    if (!selectedConnection) return
    setIsFormSubmitting(true)

    if (formMode === "create") {
      const payload: Record<string, unknown> = {
        profileId: selectedConnection,
        name: values.name,
        ext_id: values.ext_id || undefined,
        participant_type: values.participant_type || undefined,
        container_plugin_name: values.container_plugin_name || undefined,
        network_type: values.network_type || undefined,
        active: values.active,
        display_on_ui: values.display_on_ui,
        comments: values.comments || undefined,
      }
      if (values.id) payload.id = values.id

      api.createParticipant(
        payload as any,
        () => {
          setIsFormSubmitting(false)
          setShowFormModal(false)
          toast({
            title: "Participant created",
            description: `"${values.name}" has been created.`,
          })
          handleSearch(1, paginationState.pageSize)
        },
        (error) => {
          setIsFormSubmitting(false)
          toast({
            title: "Create failed",
            description: String(error),
            variant: "destructive",
          })
        },
      )
    } else if (editingParticipant) {
      api.updateParticipant(
        editingParticipant.id,
        {
          profileId: selectedConnection,
          name: values.name,
          ext_id: values.ext_id,
          participant_type: values.participant_type,
          container_plugin_name: values.container_plugin_name,
          network_type: values.network_type,
          active: values.active,
          display_on_ui: values.display_on_ui,
          comments: values.comments,
        },
        () => {
          setIsFormSubmitting(false)
          setShowFormModal(false)
          setEditingParticipant(null)
          toast({
            title: "Participant updated",
            description: `"${values.name}" has been updated.`,
          })
          handleSearch(paginationState.currentPage, paginationState.pageSize)
        },
        (error) => {
          setIsFormSubmitting(false)
          toast({
            title: "Update failed",
            description: String(error),
            variant: "destructive",
          })
        },
      )
    }
  }

  const confirmDeleteParticipant = () => {
    if (!selectedConnection || !participantToDelete) return
    setIsDeleting(true)
    api.deleteParticipant(
      participantToDelete.id,
      selectedConnection,
      () => {
        setIsDeleting(false)
        setShowDeleteConfirm(false)
        toast({
          title: "Participant deleted",
          description: `"${participantToDelete.name}" has been deleted.`,
        })
        setParticipantToDelete(null)
        handleSearch(paginationState.currentPage, paginationState.pageSize)
      },
      (error) => {
        setIsDeleting(false)
        toast({
          title: "Delete failed",
          description: String(error),
          variant: "destructive",
        })
      },
    )
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
              <span className="text-gray-800 font-medium">Participant</span>
            </div>
          </div>

          <div className="p-6 max-w-full space-y-6">
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                Participant Overview
              </h1>
              <p className="text-gray-600">
                View and manage participant data for services.
              </p>
            </div>

            <ParticipantFilters
              connectionProfiles={connectionProfiles.filter(
                (profile) => profile.connection_type === "DB"
              )}
              selectedConnection={selectedConnection}
              onConnectionChange={setSelectedConnection}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              onSearch={() => handleSearch()}
              onClearFilters={clearFilters}
              isLoading={api.loading}
              error={api.error}
              onRetry={retryConnection}
              onClearError={api.clearError}
              searchResults={searchResults}
              pageSize={paginationState.pageSize}
              onPageSizeChange={changePageSize}
              queryInfo={queryInfo}
              showQuerySection={showQuerySection}
              onToggleQuerySection={() =>
                setShowQuerySection(!showQuerySection)
              }
            />

            {searchResults && (
              <Card className="shadow-sm border-0 bg-white rounded-3xl">
                <CardHeader className="pb-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-green-100 rounded-lg p-2">
                          <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            Participant Results
                          </h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-sm text-gray-600">
                              {searchTerm.trim() ? (
                                <>
                                  {paginationState.totalRows.toLocaleString()}{" "}
                                  results for "
                                  <span className="font-semibold text-gray-800">
                                    {searchTerm}
                                  </span>
                                  "
                                </>
                              ) : (
                                <>
                                  {paginationState.totalRows.toLocaleString()}{" "}
                                  participants found
                                </>
                              )}
                            </span>
                            {searchResults.execution_time !== undefined && (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700"
                              >
                                {searchResults.execution_time}ms
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedRows.size > 0 && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700"
                        >
                          {selectedRows.size} selected
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      {selectedConnection && (
                        <Button
                          size="sm"
                          onClick={handleCreateParticipant}
                          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Participant
                        </Button>
                      )}
                      <Select onValueChange={exportData}>
                        <SelectTrigger className="w-28 h-9 rounded-full">
                          <SelectValue placeholder="Export" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ParticipantTable
                    participants={
                      typeFilter !== "all"
                        ? participants.filter(
                            (p) => p.participant_type === typeFilter
                          )
                        : participants
                    }
                    selectedRows={selectedRows}
                    onRowSelect={handleRowSelect}
                    onRowSelectAll={handleRowSelectAll}
                    onContextMenu={handleRightClick}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    columnFilters={columnFilters}
                    onColumnFilter={(key, value) =>
                      setColumnFilters((prev) => ({ ...prev, [key]: value }))
                    }
                    hiddenColumns={hiddenColumns}
                    onColumnVisibilityChange={(columnKey) => {
                      const newHidden = new Set(hiddenColumns);
                      if (newHidden.has(columnKey)) {
                        newHidden.delete(columnKey);
                      } else {
                        newHidden.add(columnKey);
                      }
                      setHiddenColumns(newHidden);
                    }}
                    paginationState={paginationState}
                    onPageChange={(page) =>
                      handleSearch(page, paginationState.pageSize)
                    }
                    onPageSizeChange={changePageSize}
                    isPaginationLoading={isPaginationLoading}
                    onViewPluginDetails={handleViewPluginDetails}
                    onDuplicateParticipant={handleDuplicateParticipant}
                    onEditParticipant={handleEditParticipant}
                    onDeleteParticipant={handleDeleteParticipant}
                    onCreateParticipant={handleCreateParticipant}
                  />
                </CardContent>
              </Card>
            )}

            {!selectedConnection && !api.error && (
              <Card className="shadow-sm border-0 rounded-2xl">
                <CardContent className="p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="bg-blue-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Database className="h-12 w-12 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">
                      Select a Database Connection
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Choose a database connection profile above to start
                      viewing participant data.
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Badge variant="outline">
                        <Activity className="h-3 w-3 mr-1" />
                        Real-time data
                      </Badge>
                      <Badge variant="outline">
                        <Search className="h-3 w-3 mr-1" />
                        Searchable
                      </Badge>
                      <Badge variant="outline">
                        <Database className="h-3 w-3 mr-1" />
                        Export options
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {contextMenu.visible && (
              <div
                className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-48"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onMouseLeave={() =>
                  setContextMenu({ visible: false, x: 0, y: 0 })
                }
              >
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                  onClick={() => handleContextMenuAction("copy-cell")}
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Cell Value</span>
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                  onClick={() => handleContextMenuAction("copy-row")}
                >
                  <Users className="h-4 w-4" />
                  <span>Copy Row Data</span>
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                  onClick={() =>
                    handleContextMenuAction("edit-participant")
                  }
                >
                  <Pencil className="h-4 w-4" />
                  <span>Edit Participant</span>
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                  onClick={() =>
                    handleContextMenuAction("duplicate-participant")
                  }
                >
                  <Copy className="h-4 w-4" />
                  <span>Duplicate Participant</span>
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 text-red-600"
                  onClick={() => handleContextMenuAction("delete-participant")}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Participant</span>
                </button>
                {contextMenu.cellKey && contextMenu.cellValue && (
                  <>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                      onClick={() => handleContextMenuAction("filter-by-value")}
                    >
                      <Database className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span>Filter by This Value</span>
                        <span className="text-xs text-gray-500 truncate max-w-32">
                          {contextMenu.cellKey}: "{contextMenu.cellValue}"
                        </span>
                      </div>
                    </button>
                  </>
                )}
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                  onClick={() => handleContextMenuAction("select-all")}
                >
                  <Activity className="h-4 w-4" />
                  <span>Select All</span>
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                  onClick={() => handleContextMenuAction("clear-selection")}
                >
                  <X className="h-4 w-4" />
                  <span>Clear Selection</span>
                </button>
              </div>
            )}

            {contextMenu.visible && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setContextMenu({ visible: false, x: 0, y: 0 })}
              />
            )}
          </div>
        </div>
      </div>

      <ContainerPluginDetailsModal
        isOpen={showPluginDetailsModal}
        onClose={() => setShowPluginDetailsModal(false)}
        pluginData={pluginDetails}
        isLoading={pluginDetailsLoading}
        error={pluginDetailsError}
      />

      <ParticipantDuplicateModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        participant={participantToDuplicate}
        profileId={selectedConnection}
        onSuccess={handleDuplicateSuccess}
      />

      <ParticipantFormModal
        isOpen={showFormModal}
        onClose={() => {
          if (!isFormSubmitting) {
            setShowFormModal(false)
            setEditingParticipant(null)
          }
        }}
        mode={formMode}
        initialData={editingParticipant}
        isSubmitting={isFormSubmitting}
        onSubmit={handleFormSubmit}
      />

      <Dialog open={showDeleteConfirm} onOpenChange={(open) => !open && !isDeleting && setShowDeleteConfirm(false)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Delete participant <span className="font-semibold">{participantToDelete?.name}</span>
            {participantToDelete?.id != null ? ` (ID ${participantToDelete.id})` : ""}? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteParticipant}
              disabled={isDeleting}
              className="rounded-full"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
