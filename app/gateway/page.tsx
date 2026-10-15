"use client";

import React from "react";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  Database,
  ChevronLeft,
  X,
  Trash2,
  Edit,
  Copy,
  FileText,
  ChevronDown,
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
import { Sidebar } from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useRnaApi } from "@/hooks/useRnaApi";
import type { Gateway, BinDetail } from "@/lib/api";
import type { ConnectionProfile } from "@/lib/types";

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface BinSearchResponse {
  data: BinDetail[];
  pagination: {
    total_count: number;
    total_pages: number;
  };
}

export default function GatewayPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState(pathname);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const api = useRnaApi();

  const [connectionProfiles, setConnectionProfiles] = useState<
    ConnectionProfile[]
  >([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [binDetails, setBinDetails] = useState<BinDetail[]>([]);

  // UI state
  const [selectedConnection, setSelectedConnection] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState("10");
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [gatewaySearchTerm, setGatewaySearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [binRangeSearch, setBinRangeSearch] = useState(true);
  const [showBinSearch, setShowBinSearch] = useState(false);
  const [binSearchTerm, setBinSearchTerm] = useState("");

  // Pagination state
  const [totalGateways, setTotalGateways] = useState(0);
  const [totalBins, setTotalBins] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    rowIndex?: number;
    cellKey?: string;
    cellValue?: string;
    selectedBin?: any;
    selectedGateway?: any;
    type?: string;
  }>({ visible: false, x: 0, y: 0 });

  // Modal state
  const [showAddGatewayModal, setShowAddGatewayModal] = useState(false);
  const [showAddBinModal, setShowAddBinModal] = useState(false);
  const [showEditGatewayModal, setShowEditGatewayModal] = useState(false);
  const [showEditBinModal, setShowEditBinModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null);
  const [editingBin, setEditingBin] = useState<BinDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "gateway" | "bin" | "multi-bin";
    data: any;
  } | null>(null);

  // Form state
  const [gatewayForm, setGatewayForm] = useState({ id: "", name: "" });
  const [binForm, setBinForm] = useState({
    bin_lower: "",
    bin_upper: "",
    bin_type: 1,
    country: "360",
    currency: "360",
    region: "B",
    bin_holder_name: "",
  });

  // Drag and drop state
  const [draggedRows, setDraggedRows] = useState<string[]>([]);
  const [dragOverGateway, setDragOverGateway] = useState<string | null>(null);

  const [editFormGateway, setEditFormGateway] = useState<Gateway | null>(null);

  const [originalBinValues, setOriginalBinValues] = useState<any>(null);

  const [addFormGateway, setAddFormGateway] = useState<Gateway | null>(null);

  const [addBinForm, setAddBinForm] = useState({
    bin_lower: "",
    bin_upper: "",
    bin_type: 1,
    country: "360",
    currency: "360",
    region: "B",
    bin_holder_name: "",
  });

  const [editBinForm, setEditBinForm] = useState({
    bin_lower: "",
    bin_upper: "",
    bin_type: 1,
    country: "360",
    currency: "360",
    region: "B",
    bin_holder_name: "",
  });

  const [editGatewayData, setEditGatewayData] = useState({ name: "" });

  const [editingGatewayData, setEditingGatewayData] = useState<Gateway | null>(
    null
  );

  const [deleteBinHolderName, setDeleteBinHolderName] = useState(false);

  const [isGatewayDropdownOpen, setIsGatewayDropdownOpen] = useState(false);

  const filteredGatewaysForEdit = useMemo(() => {
    if (!gatewaySearchTerm) return gateways;
    return gateways.filter(
      (gateway) =>
        gateway.name.toLowerCase().includes(gatewaySearchTerm.toLowerCase()) ||
        gateway.id.toString().includes(gatewaySearchTerm)
    );
  }, [gateways, gatewaySearchTerm]);

  const handleBinLowerBlur = () => {
    if (addBinForm.bin_lower && addBinForm.bin_lower.length > 0) {
      const paddedValue = addBinForm.bin_lower.padEnd(
        addBinForm.bin_lower.length + 9,
        "0"
      );
      if (paddedValue.length <= 19) {
        setAddBinForm({ ...addBinForm, bin_lower: paddedValue });
      }
    }
  };

  const handleBinUpperBlur = () => {
    if (addBinForm.bin_upper && addBinForm.bin_upper.length > 0) {
      const paddedValue = addBinForm.bin_upper.padEnd(
        addBinForm.bin_upper.length + 9,
        "9"
      );
      if (paddedValue.length <= 19) {
        setAddBinForm({ ...addBinForm, bin_upper: paddedValue });
      }
    }
  };

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
      setActiveSection(href);
    },
    [router]
  );

  useEffect(() => {
    console.log("🚀 Component mounted, fetching connection profiles...");
    api.getConnectionProfiles(
      (data) => {
        console.log("✅ Connection profiles loaded:", data);
        setConnectionProfiles(data);
        // if (data.length > 0) {
        //   setSelectedConnection(data[0].name)
        // }
      },
      (error) => {
        console.error("❌ Failed to load connection profiles:", error);
        toast({
          title: "Error",
          description: `Failed to load connection profiles: ${error}`,
          variant: "destructive",
        });
      }
    );
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      loadGateways();
    }
  }, [selectedConnection, gatewaySearchTerm]);

  useEffect(() => {
    if (selectedGateway) {
      loadBins();
    }
  }, [selectedGateway, currentPage, pageSize, searchTerm]);

  const loadGateways = useCallback(() => {
    setLoading(true);
    api.getGateways(
      {
        connection: selectedConnection,
        search: gatewaySearchTerm,
        page: 1,
        page_size: 100, // Load more gateways for the tree
      },
      (response) => {
        console.log("✅ Gateways loaded:", response);
        setGateways(response.data);
        setTotalGateways(response.pagination.total_count);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Failed to load gateways:", error);
        toast({
          title: "Error",
          description: `Failed to load gateways: ${error}`,
          variant: "destructive",
        });
        setLoading(false);
      }
    );
  }, [selectedConnection, gatewaySearchTerm]);

  const loadBins = useCallback(async () => {
    if (!selectedGateway) return;

    setLoading(true);
    api.getGatewayBins(
      selectedGateway.id,
      {
        connection: selectedConnection,
        search: searchTerm,
        page: currentPage,
        page_size: Number.parseInt(pageSize),
      },
      (data: BinSearchResponse) => {
        const totalCount = data.pagination?.total_count || 0;
        const pageSizeNum = Number.parseInt(pageSize) || 10;
        const calculatedTotalPages =
          totalCount > 0 ? Math.ceil(totalCount / pageSizeNum) : 1;

        setBinDetails(data.data || []);
        setTotalBins(totalCount);
        setTotalPages(calculatedTotalPages);

        setLoading(false);
      },
      (error) => {
        console.error("❌ Failed to load BINs:", error);
        toast({
          title: "Error",
          description: `Failed to load BINs: ${error}`,
          variant: "destructive",
        });
        setBinDetails([]);
        setTotalBins(0);
        setTotalPages(1);
        setLoading(false);
      }
    );
  }, [selectedGateway, selectedConnection, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    if (selectedGateway) {
      loadBins();
    }
  }, [loadBins]);

  const handleGatewaySelect = (gateway: Gateway) => {
    setSelectedGateway(gateway);
    setSelectedRows([]); // Clear BIN selection when switching gateways
    setCurrentPage(1); // Reset to first page
    toast({
      title: "Gateway Selected",
      description: `Showing BIN details for ${gateway.name}`,
      variant: "success",
    });
  };

  const handleRowClick = (binId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+Click: Toggle selection
      setSelectedRows((prev) =>
        prev.includes(binId)
          ? prev.filter((id) => id !== binId)
          : [...prev, binId]
      );
    } else if (event.shiftKey && selectedRows.length > 0) {
      // Shift+Click: Range selection
      const lastSelected = selectedRows[selectedRows.length - 1];
      const currentIndex = binDetails.findIndex((bin) => bin.id === binId);
      const lastIndex = binDetails.findIndex((bin) => bin.id === lastSelected);

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeIds = binDetails.slice(start, end + 1).map((bin) => bin.id);
        setSelectedRows((prev) => [...new Set([...prev, ...rangeIds])]);
      }
    } else {
      // Single click: Select only this row
      setSelectedRows([binId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === binDetails.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(binDetails.map((bin) => bin.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedRows([]);
  };

  const handleContextMenu = (e: React.MouseEvent, type: string, item?: any) => {
    e.preventDefault();

    if (type === "gateway") {
      console.log(`🖱️ Right click on Gateway ${item?.id}`);
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selectedGateway: item,
        type: "gateway",
      });
      return;
    }

    // Get cell information from the clicked element (for BIN items)
    let cellKey = "";
    let cellValue = "";

    const target = e.target as HTMLElement;
    const cell = target.closest("td");
    if (cell) {
      const cellIndex = Array.from(cell.parentElement?.children || []).indexOf(
        cell
      );
      const binIndex = binDetails.findIndex((b) => b.id === item?.id);

      // Map cell index to field names (accounting for select and index columns)
      const fieldMap = [
        "",
        "",
        "id",
        "bin_lower",
        "bin_upper",
        "bin_holder_name",
        "bin_type",
        "country",
        "currency",
        "region",
        "action",
      ];
      if (cellIndex >= 2 && cellIndex < fieldMap.length) {
        cellKey = fieldMap[cellIndex];
        cellValue = item?.[cellKey]?.toString() || "";
      }
    }

    console.log(
      `🖱️ Right click on BIN ${item?.id}, cell: ${cellKey} = "${cellValue}"`
    );

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIndex: binDetails.findIndex((b) => b.id === item?.id),
      cellKey,
      cellValue,
      selectedBin: item,
      type: "bin",
    });
  };

  const handleContextMenuAction = async (action: string) => {
    if (contextMenu.type === "gateway" && contextMenu.selectedGateway) {
      if (action === "edit-gateway") {
        setEditingGatewayData(contextMenu.selectedGateway);
        setEditGatewayData({ name: contextMenu.selectedGateway.name });
        setShowEditGatewayModal(true);
      } else if (action === "delete-gateway") {
        setDeleteTarget({
          type: "gateway",
          data: contextMenu.selectedGateway,
        });
        setShowDeleteConfirmModal(true);
      }
    } else if (contextMenu.type === "bin" && contextMenu.selectedBin) {
      if (action === "add-new") {
        setShowAddBinModal(true);
      } else if (action === "edit-selected") {
        handleRowDoubleClick(contextMenu.selectedBin);
      } else if (action === "delete-selected") {
        handleDeleteBin(contextMenu.selectedBin);
      } else if (action === "copy-cell") {
        if (contextMenu.cellValue) {
          navigator.clipboard.writeText(contextMenu.cellValue);
        }
      } else if (action === "copy-row") {
        if (contextMenu.selectedBin) {
          const rowText = Object.entries(contextMenu.selectedBin)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n");
          navigator.clipboard.writeText(rowText);
        }
      } else if (action === "clear-selection") {
        setSelectedRows([]);
      }
    }
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const handleDeleteGateway = async (gateway: any) => {
    if (
      !confirm(`Are you sure you want to delete gateway "${gateway.name}"?`)
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/gateway/${gateway.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh gateways list
        loadGateways();
        // Clear selection if deleted gateway was selected
        if (selectedGateway?.id === gateway.id) {
          setSelectedGateway(null);
          setBinDetails([]);
        }
      } else {
        console.error("Failed to delete gateway");
      }
    } catch (error) {
      console.error("Error deleting gateway:", error);
    } finally {
      setLoading(false);
    }
  };

  const hideContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  const handleDragStart = (event: React.DragEvent, binIds: string[]) => {
    setDraggedRows(binIds);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", binIds.join(","));
  };

  const handleDragOver = (event: React.DragEvent, gatewayId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverGateway(gatewayId);
  };

  const handleDragLeave = () => {
    setDragOverGateway(null);
  };

  const handleDrop = (event: React.DragEvent, targetGatewayId: string) => {
    event.preventDefault();
    const binIds = event.dataTransfer.getData("text/plain").split(",");

    if (binIds.length > 0 && targetGatewayId !== selectedGateway?.id) {
      api.moveBins(
        {
          connection: selectedConnection,
          bin_ids: binIds,
          target_gateway_id: Number.parseInt(targetGatewayId),
        },
        (response) => {
          console.log("✅ BINs moved:", response);
          toast({
            title: "BINs Moved",
            description: response.message,
            variant: "success",
          });
          // Refresh data
          loadGateways();
          loadBins();
          setSelectedRows([]);
        },
        (error) => {
          console.error("❌ Failed to move BINs:", error);
          toast({
            title: "Error",
            description: `Failed to move BINs: ${error}`,
            variant: "destructive",
          });
        }
      );
    }

    setDragOverGateway(null);
    setDraggedRows([]);
  };

  const handleAddGateway = () => {
    if (gatewayForm.name.trim()) {
      const payload: any = {
        connection: selectedConnection,
        name: gatewayForm.name.trim(),
      };

      if (gatewayForm.id.trim()) {
        payload.id = gatewayForm.id.trim();
      }

      api.createGateway(
        payload,
        (response) => {
          console.log("✅ Gateway created:", response);
          toast({
            title: "Gateway Added",
            description: response.message,
            variant: "success",
          });
          setGatewayForm({ id: "", name: "" });
          setShowAddGatewayModal(false);
          loadGateways(); // Refresh gateway list
        },
        (error) => {
          console.error("❌ Failed to create gateway:", error);
          toast({
            title: "Error",
            description: `Failed to create gateway: ${error}`,
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleAddBin = async () => {
    if (!selectedGateway) {
      toast({
        title: "Error",
        description: "Please select a gateway first",
        variant: "destructive",
      });
      return;
    }

    if (!addBinForm.bin_lower || !addBinForm.bin_upper) {
      toast({
        title: "Error",
        description: "Please fill in BIN Lower and BIN Upper fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const requestPayload = {
        connection: selectedConnection,
        bin_lower: addBinForm.bin_lower,
        bin_upper: addBinForm.bin_upper,
        bin_type: Number.parseInt(addBinForm.bin_type.toString()) || 1,
        country: addBinForm.country,
        currency: addBinForm.currency,
        region: addBinForm.region,
        ...(addBinForm.bin_holder_name && {
          bin_holder_name: addBinForm.bin_holder_name,
        }),
      };

      await api.createBin(
        selectedGateway.id.toString(),
        requestPayload,
        (response) => {
          toast({
            title: "Success",
            description: "BIN added successfully",
          });
          setShowAddBinModal(false);
          setAddBinForm({
            bin_lower: "",
            bin_upper: "",
            bin_type: 1,
            country: "360",
            currency: "360",
            region: "B",
            bin_holder_name: "",
          });
          loadBins();
          loadGateways();
        },
        (error) => {
          console.error("❌ Failed to add BIN:", error);
          toast({
            title: "Error",
            description: `Failed to add BIN: ${error}`,
            variant: "destructive",
          });
        }
      );
    } catch (error) {
      console.error("❌ Failed to add BIN:", error);
      toast({
        title: "Error",
        description: "Failed to add BIN",
        variant: "destructive",
      });
    }
  };

  const handleRowDoubleClick = (bin: BinDetail) => {
    setEditingBin(bin);
    setEditFormGateway(selectedGateway);

    const originalValues = {
      connection: selectedConnection,
      bin_lower: bin.bin_lower,
      bin_upper: bin.bin_upper,
      bin_type: bin.bin_type,
      country: bin.country,
      currency: bin.currency,
      region: bin.region,
    };
    setOriginalBinValues(originalValues);

    setEditBinForm({
      bin_lower: bin.bin_lower,
      bin_upper: bin.bin_upper,
      bin_type: bin.bin_type,
      country: bin.country,
      currency: bin.currency,
      region: bin.region,
      bin_holder_name: bin.bin_holder_name || "",
    });
    setShowEditBinModal(true);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "a":
            event.preventDefault();
            handleSelectAll();
            break;
          case "n":
            event.preventDefault();
            if (selectedGateway) {
              setShowAddBinModal(true);
            }
            break;
        }
      } else if (event.key === "Escape") {
        handleClearSelection();
        hideContextMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", hideContextMenu);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", hideContextMenu);
    };
  }, [selectedGateway]);

  const filteredGateways = gateways.filter((gateway) =>
    gateway.name.toLowerCase().includes(gatewaySearchTerm.toLowerCase())
  );

  const filteredBinDetails = binDetails.filter((bin) => {
    const matchesSearch =
      !searchTerm ||
      Object.values(bin).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesSearch;
  });

  // Added loadMoreGateways function
  const loadMoreGateways = useCallback(() => {
    if (loading) return;
    setLoading(true);
    api.getGateways(
      {
        connection: selectedConnection,
        search: gatewaySearchTerm,
        page: Math.ceil(gateways.length / 100) + 1, // Calculate next page based on current gateways length
        page_size: 100,
      },
      (response) => {
        console.log("✅ More Gateways loaded:", response);
        setGateways((prevGateways) => [...prevGateways, ...response.data]);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Failed to load more gateways:", error);
        toast({
          title: "Error",
          description: `Failed to load more gateways: ${error}`,
          variant: "destructive",
        });
        setLoading(false);
      }
    );
  }, [selectedConnection, gatewaySearchTerm, gateways, loading, api, toast]);

  const handleDeleteBin = (bin: BinDetail) => {
    setDeleteTarget({ type: "bin", data: bin });
    setDeleteBinHolderName(false);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "gateway" && deleteTarget.data.bin_count > 0) {
      toast({
        title: "Cannot Delete Gateway",
        description: `This gateway has ${deleteTarget.data.bin_count} BIN(s) associated with it. Please remove all BINs before deleting the gateway.`,
        variant: "destructive",
      });
      setShowDeleteConfirmModal(false);
      setDeleteTarget(null);
      return;
    }

    try {
      setLoading(true);

      if (deleteTarget.type === "gateway") {
        api.deleteGateway(
          deleteTarget.data.id,
          selectedConnection,
          (response) => {
            toast({
              title: `Gateway Deleted`,
              description: response.message || `Gateway deleted successfully`,
            });

            loadGateways();
            setSelectedGateway(null);
            setBinDetails([]);
            setShowDeleteConfirmModal(false);
            setDeleteTarget(null);
          },
          (error) => {
            toast({
              title: "Delete Failed",
              description: error.message || `Failed to delete gateway`,
              variant: "destructive",
            });
            setLoading(false);
            setShowDeleteConfirmModal(false);
            setDeleteTarget(null);
          }
        );
      } else {
        api.deleteBin(
          deleteTarget.data.id,
          selectedConnection,
          !deleteBinHolderName, // keepBinHolderName is opposite of deleteBinHolderName
          (response) => {
            toast({
              title: `BIN Deleted`,
              description: response.message || `BIN deleted successfully`,
            });
            setShowDeleteConfirmModal(false);
            setDeleteTarget(null);
            loadBins(); // Refresh BIN list
            loadGateways(); // Refresh gateway list to update counts
          },
          (error) => {
            toast({
              title: "Delete Failed",
              description: error.message || "Failed to delete BIN",
              variant: "destructive",
            });
          }
        );
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: `An error occurred while deleting the ${deleteTarget.type}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowDeleteConfirmModal(false);
      setDeleteTarget(null);
    }
  };

  const handleBinSearch = () => {
    api.searchBins(
      {
        connection: selectedConnection,
        search: binSearchTerm,
        use_range: binRangeSearch,
        page: 1,
        page_size: Number.parseInt(pageSize),
      },
      (data: BinSearchResponse) => {
        console.log("✅ BIN search results:", data);
        setBinDetails(data.data || []);
        setTotalBins(data.pagination?.total_count || 0);
        setTotalPages(data.pagination?.total_pages || 0);
        setCurrentPage(1); // Reset to first page after search
        toast({
          title: "Search Complete",
          description: `Found ${data.pagination?.total_count || 0} BINs`,
          variant: "success",
        });
      },
      (error) => {
        console.error("❌ Failed to search BINs:", error);
        toast({
          title: "Search Failed",
          description: `Failed to search BINs: ${error}`,
          variant: "destructive",
        });
        setBinDetails([]);
        setTotalBins(0);
        setTotalPages(0);
      }
    );
  };

  const handlePageChange = (newPage: number) => {
    const maxPages = Math.max(1, totalPages);
    if (
      newPage >= 1 &&
      newPage <= maxPages &&
      !loading &&
      newPage !== currentPage
    ) {
      setCurrentPage(newPage);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPages = Math.max(1, totalPages);

    if (maxPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= maxPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination with ellipsis
      if (currentPage <= 4) {
        // Show first 5 pages, ellipsis, last page
        for (let i = 1; i <= 5; i++) pages.push(i);
        if (maxPages > 6) pages.push("...");
        pages.push(maxPages);
      } else if (currentPage >= maxPages - 3) {
        // Show first page, ellipsis, last 5 pages
        pages.push(1);
        if (maxPages > 6) pages.push("...");
        for (let i = maxPages - 4; i <= maxPages; i++) pages.push(i);
      } else {
        // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(maxPages);
      }
    }

    return pages;
  };

  const handleEditGateway = async () => {
    if (!editingGatewayData || !editGatewayData.name.trim()) {
      toast({
        title: "Error",
        description: "Gateway and name are required",
        variant: "destructive",
      });
      return;
    }

    api.updateGateway(
      editingGatewayData.id,
      {
        name: editGatewayData.name.trim(),
        connection: selectedConnection,
      },
      (response) => {
        toast({
          title: "Success",
          description: "Gateway updated successfully",
        });
        setShowEditGatewayModal(false);
        setEditGatewayData({ name: "" });
        setEditingGatewayData(null);
        setContextMenu({
          visible: false,
          x: 0,
          y: 0,
          selectedGateway: null,
          type: "",
        });
        loadGateways();
      },
      (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update gateway",
          variant: "destructive",
        });
      }
    );
  };

  const handleEditBin = async () => {
    if (editingBin) {
      if (loading) return;

      const binLower = editBinForm.bin_lower.trim();
      const binUpper = editBinForm.bin_upper.trim();

      if (!binLower || !binUpper) {
        toast({
          title: "Validation Error",
          description: "BIN Lower and BIN Upper are required fields.",
          variant: "destructive",
        });
        return;
      }

      if (binLower.length !== binUpper.length) {
        toast({
          title: "Validation Error",
          description: "BIN Lower and BIN Upper must have the same length.",
          variant: "destructive",
        });
        return;
      }

      if (binLower >= binUpper) {
        toast({
          title: "Validation Error",
          description: "BIN Lower must be less than BIN Upper.",
          variant: "destructive",
        });
        return;
      }

      const updateData: any = {};

      // Helper function to safely compare values
      const hasChanged = (newValue: any, originalValue: any) => {
        // Handle null/undefined cases
        if (newValue === null || newValue === undefined) {
          return (
            originalValue !== null &&
            originalValue !== undefined &&
            originalValue !== ""
          );
        }
        if (originalValue === null || originalValue === undefined) {
          return newValue !== "" && newValue !== null && newValue !== undefined;
        }
        // Convert to strings for comparison to handle type differences
        return String(newValue).trim() !== String(originalValue).trim();
      };

      // Check each field for changes
      if (hasChanged(selectedConnection, originalBinValues?.connection)) {
        updateData.connection = selectedConnection;
      }

      if (hasChanged(binLower, originalBinValues?.bin_lower)) {
        updateData.bin_lower = binLower;
      }

      if (hasChanged(binUpper, originalBinValues?.bin_upper)) {
        updateData.bin_upper = binUpper;
      }

      const newBinType = Number.parseInt(editBinForm.bin_type.toString());
      const originalBinType = Number.parseInt(
        originalBinValues?.bin_type?.toString() || "1"
      );
      if (newBinType !== originalBinType) {
        updateData.bin_type = newBinType;
      }

      if (hasChanged(editBinForm.country, originalBinValues?.country)) {
        updateData.country = editBinForm.country;
      }

      if (hasChanged(editBinForm.currency, originalBinValues?.currency)) {
        updateData.currency = editBinForm.currency;
      }

      if (hasChanged(editBinForm.region, originalBinValues?.region)) {
        updateData.region = editBinForm.region;
      }

      if (
        hasChanged(
          editBinForm.bin_holder_name,
          originalBinValues?.bin_holder_name
        )
      ) {
        updateData.bin_holder_name = editBinForm.bin_holder_name || "";
      }

      // Check if moving to different gateway
      if (editFormGateway && editFormGateway.id !== selectedGateway?.id) {
        updateData.gateway_id = Number.parseInt(editFormGateway.id.toString());
      }

      const hasChanges = Object.keys(updateData).length > 0;
      if (!hasChanges) {
        toast({
          title: "No Changes",
          description: "No changes detected to update.",
          variant: "default",
        });
        return;
      }

      setLoading(true);

      try {
        await api.updateBin(
          editingBin.id,
          updateData,
          (response) => {
            console.log("✅ BIN updated:", response);
            toast({
              title: "BIN Updated",
              description: response.message || "BIN updated successfully",
              variant: "success",
            });

            setShowEditBinModal(false);
            setEditingBin(null);
            setEditFormGateway(null);
            setOriginalBinValues(null);
            setEditBinForm({
              bin_lower: "",
              bin_upper: "",
              bin_type: 1,
              country: "360",
              currency: "360",
              region: "B",
              bin_holder_name: "",
            });

            // Only reload bins, not gateways for better performance
            loadBins().finally(() => setLoading(false));
          },
          (error) => {
            console.error("❌ Failed to update BIN:", error);
            let errorMessage = `Failed to update BIN: ${error}`;

            if (error.includes("overlaps") || error.includes("overlap")) {
              errorMessage =
                "The BIN range you entered conflicts with an existing BIN. Please choose a different range that doesn't overlap with other BINs.";
            } else if (error.includes("invalid") || error.includes("Invalid")) {
              errorMessage =
                "The BIN range format is invalid. Please check your BIN Lower and Upper values.";
            } else if (error.includes("No fields to update")) {
              errorMessage =
                "No changes were detected. Please modify at least one field before updating.";
            }

            toast({
              title: "Update Failed",
              description: errorMessage,
              variant: "destructive",
            });

            setLoading(false);
          }
        );
      } catch (error) {
        console.error("❌ Update BIN error:", error);
        toast({
          title: "Update Failed",
          description: "An unexpected error occurred while updating the BIN.",
          variant: "destructive",
        });
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />

        {/* Main Content */}
        <div className="flex-1 max-w-full overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Jalin App</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Gateway</span>
              </div>
            </div>
          </div>

          <div className="p-6 max-w-full">
            {/* Hero Section */}
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                Gateway Management
              </h1>
              <p className="text-gray-600">
                {selectedGateway
                  ? `Viewing BIN details for ${selectedGateway.name} (${selectedGateway.bin_count} BINs)`
                  : "Select a gateway from the tree to view BIN details"}
              </p>
            </div>

            {/* Main Content Layout */}
            <div className="flex gap-6">
              {/* Gateway Tree Sidebar */}
              {!sidebarCollapsed && (
                <Card className="w-96 shadow-sm border-0 bg-white rounded-3xl flex-shrink-0">
                  <CardHeader className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Database className="h-5 w-5 text-blue-600" />
                        Gateway Tree
                      </CardTitle>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-2xl bg-transparent"
                          onClick={() => setShowAddGatewayModal(true)}
                          title="Add New Gateway"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-2xl bg-transparent"
                          onClick={loadGateways}
                          title="Refresh Gateways"
                          disabled={loading}
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${
                              loading ? "animate-spin" : ""
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col">
                    <div className="px-6 pb-4">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder={`Search from ${totalGateways} gateways found...`}
                          className="pl-10 rounded-2xl"
                          value={gatewaySearchTerm}
                          onChange={(e) => setGatewaySearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="h-[600px] overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="p-6 space-y-2">
                          {loading && gateways.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                              <span className="ml-2 text-gray-500">
                                Loading gateways...
                              </span>
                            </div>
                          ) : filteredGateways.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <Database className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                              <p>No gateways found</p>
                            </div>
                          ) : (
                            <>
                              {filteredGateways.map((gateway, index) => (
                                <div
                                  key={gateway.id}
                                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors ${
                                    selectedGateway?.id === gateway.id
                                      ? "bg-blue-50 border border-blue-200"
                                      : "border border-transparent"
                                  } ${
                                    dragOverGateway === gateway.id
                                      ? "bg-green-50 border-green-200"
                                      : ""
                                  }`}
                                  onClick={() => handleGatewaySelect(gateway)}
                                  onContextMenu={(e) =>
                                    handleContextMenu(e, "gateway", gateway)
                                  }
                                  onDragOver={(e) =>
                                    handleDragOver(e, gateway.id)
                                  }
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, gateway.id)}
                                  ref={
                                    index === filteredGateways.length - 1
                                      ? (el) => {
                                          if (
                                            el &&
                                            !loading &&
                                            filteredGateways.length <
                                              totalGateways
                                          ) {
                                            const observer =
                                              new IntersectionObserver(
                                                (entries) => {
                                                  if (
                                                    entries[0].isIntersecting
                                                  ) {
                                                    loadMoreGateways();
                                                    observer.disconnect();
                                                  }
                                                },
                                                { threshold: 0.1 }
                                              );
                                            observer.observe(el);
                                          }
                                        }
                                      : null
                                  }
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-800">
                                      {gateway.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      ID: {gateway.id}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge
                                      variant="secondary"
                                      className={`${
                                        gateway.bin_count === 0
                                          ? "bg-gray-100 text-gray-600"
                                          : "bg-green-100 text-green-700"
                                      } text-xs rounded-full`}
                                    >
                                      {gateway.bin_count} BIN
                                    </Badge>
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  </div>
                                </div>
                              ))}

                              {loading && gateways.length > 0 && (
                                <div className="flex items-center justify-center py-4">
                                  <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                                  <span className="ml-2 text-sm text-gray-500">
                                    Loading more...
                                  </span>
                                </div>
                              )}

                              {!loading &&
                                filteredGateways.length >= totalGateways &&
                                totalGateways > 0 && (
                                  <div className="text-center py-4 text-sm text-gray-400 border-t border-gray-100 mt-4">
                                    All {totalGateways} gateways loaded
                                  </div>
                                )}
                            </>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* BIN Details Content */}
              <div className="flex-1 min-w-0">
                <Card className="shadow-sm border-0 bg-white rounded-3xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-2xl bg-transparent"
                          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                          title="Toggle Sidebar"
                        >
                          <ChevronLeft
                            className={`h-4 w-4 transition-transform ${
                              sidebarCollapsed ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <Database className="h-5 w-5 text-blue-600" />
                          BIN Details
                        </CardTitle>
                        {selectedGateway && (
                          <Badge
                            variant="secondary"
                            className="text-xs rounded-full"
                          >
                            {selectedGateway.bin_count} BINs
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                          className="rounded-2xl bg-transparent"
                          disabled={!selectedGateway || binDetails.length === 0}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearSelection}
                          className="rounded-2xl bg-transparent"
                          disabled={selectedRows.length === 0}
                        >
                          Clear Selection
                        </Button>
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 rounded-full"
                        >
                          Showing {binDetails.length} of {totalBins} BIN details
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex space-x-4 items-center flex-1">
                        <div className="relative flex-1 max-w-md">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search in current page..."
                            className="pl-10 w-full rounded-2xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            Connection:
                          </span>
                          <Select
                            value={selectedConnection}
                            onValueChange={setSelectedConnection}
                          >
                            <SelectTrigger className="w-32 rounded-2xl">
                              <SelectValue placeholder="Select connection..." />
                            </SelectTrigger>
                            <SelectContent>
                              {connectionProfiles
                                .filter(
                                  (profile) => profile.connection_type === "DB"
                                )
                                .map((profile) => (
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
                        <div className="flex items-center space-x-3 ml-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-2xl bg-transparent"
                            onClick={() => setShowAddBinModal(true)}
                            disabled={!selectedGateway}
                            title="Add New BIN"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-2xl bg-transparent"
                            onClick={loadBins}
                            disabled={loading}
                            title="Refresh BINs"
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${
                                loading ? "animate-spin" : ""
                              }`}
                            />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                            onClick={() => setShowBinSearch(!showBinSearch)}
                            title="BIN Search"
                          >
                            <Database className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* BIN Search Section */}
                    {showBinSearch && (
                      <Card className="mb-4 border border-blue-200 bg-blue-50 rounded-2xl">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4 mb-3">
                            <div className="flex-1">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Search in Database..."
                                  className="pl-10 rounded-2xl"
                                  value={binSearchTerm}
                                  onChange={(e) =>
                                    setBinSearchTerm(e.target.value)
                                  }
                                  maxLength={19}
                                />
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                              onClick={handleBinSearch}
                            >
                              <Search className="h-4 w-4 mr-2" />
                              Search BINs
                            </Button>
                            <Button
                              variant="outline"
                              className="rounded-2xl bg-transparent"
                              onClick={() => setShowBinSearch(false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="bin-range-switch"
                              checked={binRangeSearch}
                              onCheckedChange={setBinRangeSearch}
                              className="data-[state=checked]:bg-green-600"
                            />
                            <Label
                              htmlFor="bin-range-switch"
                              className="text-sm"
                            >
                              Disable to Search using BIN prefix or Enable to
                              Search using BIN range
                            </Label>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {selectedGateway ? (
                      <>
                        <div className="w-full overflow-x-auto border border-gray-200 rounded-2xl">
                          <div className="min-w-max">
                            <table className="w-full">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  {/* Select Column */}
                                  <th className="w-12 px-3 py-2 text-left border-r border-gray-200 bg-gray-50">
                                    <Checkbox
                                      checked={
                                        selectedRows.length ===
                                          binDetails.length &&
                                        binDetails.length > 0
                                      }
                                      onCheckedChange={handleSelectAll}
                                    />
                                  </th>
                                  {/* Index Column */}
                                  <th className="w-16 px-3 py-2 text-left border-r border-gray-200 bg-gray-50">
                                    <span className="text-xs font-semibold text-gray-700">
                                      #
                                    </span>
                                  </th>
                                  <th className="px-3 py-2 text-left border-r border-gray-200 bg-gray-50">
                                    <span className="text-xs font-semibold text-gray-700">
                                      ID
                                    </span>
                                  </th>
                                  <th className="px-3 py-2 text-left border-r border-gray-200 bg-gray-50">
                                    <span className="text-xs font-semibold text-gray-700">
                                      BIN Lower
                                    </span>
                                  </th>
                                  <th className="px-3 py-2 text-left border-r border-gray-200 bg-gray-50">
                                    <span className="text-xs font-semibold text-gray-700">
                                      BIN Upper
                                    </span>
                                  </th>
                                  <th className="px-3 py-2 text-left border-r border-gray-200 bg-gray-50">
                                    <span className="text-xs font-semibold text-gray-700">
                                      BIN Holder Name
                                    </span>
                                  </th>
                                  <th className="px-3 py-2 text-left border-r border-gray-200 bg-gray-50">
                                    <span className="text-xs font-semibold text-gray-700">
                                      BIN Type
                                    </span>
                                  </th>
                                  <th className="px-3 py-2 text-left border-r border-gray-200 bg-gray-50">
                                    <span className="text-xs font-semibold text-gray-700">
                                      Country
                                    </span>
                                  </th>
                                  <th className="px-3 py-2 text-left border-r border-gray-200 bg-gray-50">
                                    <span className="text-xs font-semibold text-gray-700">
                                      Currency
                                    </span>
                                  </th>
                                  <th className="px-3 py-2 text-left border-r border-gray-200 bg-gray-50">
                                    <span className="text-xs font-semibold text-gray-700">
                                      Region
                                    </span>
                                  </th>
                                  <th className="px-3 py-2 text-left bg-gray-50">
                                    <span className="text-xs font-semibold text-gray-700">
                                      Action
                                    </span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                  <tr>
                                    <td
                                      colSpan={11}
                                      className="px-3 py-8 text-center"
                                    >
                                      <div className="flex items-center justify-center">
                                        <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                                        <span className="text-gray-500">
                                          Loading BINs...
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : binDetails.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={11}
                                      className="px-3 py-8 text-center text-gray-500"
                                    >
                                      No BIN details found for this gateway
                                    </td>
                                  </tr>
                                ) : (
                                  binDetails.map((bin, index) => {
                                    const safePageSize =
                                      Number.parseInt(pageSize || "10") || 10;
                                    const globalIndex =
                                      (currentPage - 1) * safePageSize + index;
                                    const isSelected = selectedRows.includes(
                                      bin.id
                                    );

                                    return (
                                      <tr
                                        key={bin.id}
                                        className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                                          isSelected
                                            ? "bg-blue-50 border-l-4 border-blue-400"
                                            : ""
                                        }`}
                                        onClick={(e) =>
                                          handleRowClick(bin.id, e)
                                        }
                                        onDoubleClick={() =>
                                          handleRowDoubleClick(bin)
                                        }
                                        onContextMenu={(e) =>
                                          handleContextMenu(
                                            e,
                                            selectedRows.length > 1
                                              ? "multi-bin"
                                              : "bin",
                                            bin
                                          )
                                        }
                                        draggable={true}
                                        onDragStart={(e) =>
                                          handleDragStart(
                                            e,
                                            selectedRows.includes(bin.id)
                                              ? selectedRows
                                              : [bin.id]
                                          )
                                        }
                                      >
                                        {/* Select Cell */}
                                        <td className="px-3 py-2 border-r border-gray-200">
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                setSelectedRows((prev) => [
                                                  ...prev,
                                                  bin.id,
                                                ]);
                                              } else {
                                                setSelectedRows((prev) =>
                                                  prev.filter(
                                                    (id) => id !== bin.id
                                                  )
                                                );
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </td>
                                        {/* Index Cell */}
                                        <td className="px-3 py-2 border-r border-gray-200">
                                          <span className="text-xs text-gray-800">
                                            {globalIndex + 1}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-200">
                                          <div className="font-mono bg-gray-50 px-2 py-1 rounded-md text-xs">
                                            {bin.id}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-200">
                                          <div className="font-mono bg-gray-50 px-2 py-1 rounded-md text-xs">
                                            {bin.bin_lower}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-200">
                                          <div className="font-mono bg-gray-50 px-2 py-1 rounded-md text-xs">
                                            {bin.bin_upper}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-200">
                                          <span
                                            className="text-xs text-gray-800"
                                            title={bin.bin_holder_name}
                                          >
                                            {bin.bin_holder_name || "-"}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-200">
                                          <div className="text-center">
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                                              {bin.bin_type}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-200">
                                          <span className="text-xs text-gray-800">
                                            {bin.country}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-200">
                                          <span className="text-xs text-gray-800">
                                            {bin.currency}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-200">
                                          <span className="text-xs text-gray-800">
                                            {bin.region}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-2xl bg-transparent text-red-600 border-red-200 hover:bg-red-50"
                                            onClick={() => handleDeleteBin(bin)}
                                          >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Delete
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-700">
                              {totalBins > 0 ? (
                                <>
                                  Showing{" "}
                                  <span className="font-medium">
                                    {Math.max(
                                      1,
                                      (currentPage - 1) *
                                        Number.parseInt(pageSize || "10") +
                                        1
                                    )}
                                  </span>{" "}
                                  to{" "}
                                  <span className="font-medium">
                                    {Math.min(
                                      currentPage *
                                        Number.parseInt(pageSize || "10"),
                                      totalBins || 0
                                    )}
                                  </span>{" "}
                                  of{" "}
                                  <span className="font-medium">
                                    {(totalBins || 0).toLocaleString()}
                                  </span>{" "}
                                  results
                                </>
                              ) : (
                                "No results found"
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Page {currentPage} of {Math.max(1, totalPages)}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm text-gray-600">
                                Per page:
                              </Label>
                              <Select
                                value={pageSize}
                                onValueChange={(value) => {
                                  setPageSize(value);
                                  setCurrentPage(1); // Reset to first page when changing page size
                                }}
                              >
                                <SelectTrigger className="w-20 h-8 rounded-lg text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="20">20</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                  <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1">
                            {/* Previous Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage <= 1 || loading}
                              className="h-8 px-3 rounded-lg text-sm"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>

                            {/* Page Numbers */}
                            <div className="flex items-center space-x-1">
                              {getPageNumbers().map((page, index) => (
                                <React.Fragment key={index}>
                                  {page === "..." ? (
                                    <span className="px-2 py-1 text-sm text-gray-500">
                                      ...
                                    </span>
                                  ) : (
                                    <Button
                                      variant={
                                        currentPage === page
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        handlePageChange(page as number)
                                      }
                                      disabled={loading}
                                      className={`h-8 w-8 p-0 rounded-lg text-sm ${
                                        currentPage === page
                                          ? "bg-blue-600 text-white hover:bg-blue-700"
                                          : "hover:bg-gray-50"
                                      }`}
                                    >
                                      {page}
                                    </Button>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>

                            {/* Next Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={
                                currentPage >= Math.max(1, totalPages) ||
                                loading
                              }
                              className="h-8 px-3 rounded-lg text-sm"
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">
                          No Gateway Selected
                        </p>
                        <p className="text-sm mt-2">
                          Select a gateway from the tree to view BIN details
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {contextMenu.visible && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-48"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu({ visible: false, x: 0, y: 0 })}
        >
          {contextMenu.type === "gateway" ? (
            <>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                onClick={() => handleContextMenuAction("edit-gateway")}
              >
                <Edit className="h-4 w-4" />
                <span>Edit Gateway</span>
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 text-red-600"
                onClick={() => handleContextMenuAction("delete-gateway")}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Gateway</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                onClick={() => handleContextMenuAction("add-new")}
              >
                <Plus className="h-4 w-4" />
                <span>Add New BIN</span>
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                onClick={() => handleContextMenuAction("edit-selected")}
              >
                <Edit className="h-4 w-4" />
                <span>Edit selected BIN</span>
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 text-red-600"
                onClick={() => handleContextMenuAction("delete-selected")}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete selected BIN</span>
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                onClick={() => handleContextMenuAction("copy-cell")}
              >
                <Copy className="h-4 w-4" />
                <span>Copy cell value</span>
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                onClick={() => handleContextMenuAction("copy-row")}
              >
                <FileText className="h-4 w-4" />
                <span>Copy row value</span>
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                onClick={() => handleContextMenuAction("clear-selection")}
              >
                <X className="h-4 w-4" />
                <span>Clear selection</span>
              </button>
            </>
          )}
        </div>
      )}

      {contextMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu({ visible: false, x: 0, y: 0 })}
        />
      )}

      {/* Add Gateway Modal */}
      <Dialog open={showAddGatewayModal} onOpenChange={setShowAddGatewayModal}>
        <DialogContent className="max-w-2xl rounded-3xl border-0 shadow-2xl bg-white">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Add New Gateway
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Create a new gateway to organize BIN ranges.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div>
              <Label
                htmlFor="gateway-id"
                className="text-sm font-medium text-gray-700"
              >
                Gateway ID
              </Label>
              <Input
                id="gateway-id"
                placeholder="Leave empty for auto-generation"
                value={gatewayForm.id}
                onChange={(e) =>
                  setGatewayForm({ ...gatewayForm, id: e.target.value })
                }
                className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label
                htmlFor="gateway-name"
                className="text-sm font-medium text-gray-700"
              >
                Gateway Name *
              </Label>
              <Input
                id="gateway-name"
                placeholder="Enter gateway name"
                value={gatewayForm.name}
                onChange={(e) =>
                  setGatewayForm({ ...gatewayForm, name: e.target.value })
                }
                className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter className="pt-6 gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAddGatewayModal(false)}
              className="px-6 py-2.5 border-gray-300 hover:bg-gray-50 rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddGateway}
              disabled={!gatewayForm.name.trim() || loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Gateway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add BIN Modal */}
      <Dialog open={showAddBinModal} onOpenChange={setShowAddBinModal}>
        <DialogContent className="max-w-2xl rounded-3xl border-0 shadow-2xl bg-white">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Add New BIN
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Add a new BIN range to {selectedGateway?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label
                htmlFor="bin-id"
                className="text-sm font-medium text-gray-700"
              >
                BIN Details ID
              </Label>
              <Input
                id="bin-id"
                placeholder="This value is autogenerate"
                disabled
                className="mt-1.5 rounded-xl bg-gray-50 border-gray-200 text-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="bin-lower"
                  className="text-sm font-medium text-gray-700"
                >
                  BIN Lower *
                </Label>
                <Input
                  id="bin-lower"
                  placeholder="e.g., 123456"
                  value={addBinForm.bin_lower}
                  onChange={(e) =>
                    setAddBinForm({ ...addBinForm, bin_lower: e.target.value })
                  }
                  onBlur={handleBinLowerBlur}
                  className="mt-1.5 rounded-xl font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  maxLength={19}
                />
              </div>
              <div>
                <Label
                  htmlFor="bin-upper"
                  className="text-sm font-medium text-gray-700"
                >
                  BIN Upper *
                </Label>
                <Input
                  id="bin-upper"
                  placeholder="e.g., 123456"
                  value={addBinForm.bin_upper}
                  onChange={(e) =>
                    setAddBinForm({ ...addBinForm, bin_upper: e.target.value })
                  }
                  onBlur={handleBinUpperBlur}
                  className="mt-1.5 rounded-xl font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  maxLength={19}
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="bin-holder"
                className="text-sm font-medium text-gray-700"
              >
                BIN Holder Name
              </Label>
              <Input
                id="bin-holder"
                placeholder="Enter BIN holder name"
                value={addBinForm.bin_holder_name}
                onChange={(e) =>
                  setAddBinForm({
                    ...addBinForm,
                    bin_holder_name: e.target.value,
                  })
                }
                className="mt-1.5 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label
                  htmlFor="bin-type"
                  className="text-sm font-medium text-gray-700"
                >
                  Type
                </Label>
                <Input
                  id="bin-type"
                  value={addBinForm.bin_type.toString()}
                  onChange={(e) =>
                    setAddBinForm({
                      ...addBinForm,
                      bin_type: Number.parseInt(e.target.value) || 1,
                    })
                  }
                  className="mt-1.5 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="country"
                  className="text-sm font-medium text-gray-700"
                >
                  Country
                </Label>
                <Input
                  id="country"
                  value={addBinForm.country}
                  onChange={(e) =>
                    setAddBinForm({ ...addBinForm, country: e.target.value })
                  }
                  className="mt-1.5 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="currency"
                  className="text-sm font-medium text-gray-700"
                >
                  Currency
                </Label>
                <Input
                  id="currency"
                  value={addBinForm.currency}
                  onChange={(e) =>
                    setAddBinForm({ ...addBinForm, currency: e.target.value })
                  }
                  className="mt-1.5 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="region"
                  className="text-sm font-medium text-gray-700"
                >
                  Region
                </Label>
                <Input
                  id="region"
                  value={addBinForm.region}
                  onChange={(e) =>
                    setAddBinForm({ ...addBinForm, region: e.target.value })
                  }
                  className="mt-1.5 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAddBinModal(false)}
              className="px-6 py-2 border-gray-300 hover:bg-gray-50 rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBin}
              disabled={
                !addBinForm.bin_lower || !addBinForm.bin_upper || loading
              }
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add BIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditBinModal} onOpenChange={setShowEditBinModal}>
        <DialogContent className="max-w-2xl rounded-3xl border-0 shadow-2xl bg-white">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Update BIN
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Update BIN details for {editFormGateway?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={() => {}} className="space-y-6">
            <div>
              <Label
                htmlFor="edit-bin-id"
                className="text-sm font-medium text-gray-700"
              >
                BIN Details ID
              </Label>
              <Input
                id="edit-bin-id"
                value={editingBin?.id || ""}
                disabled
                className="mt-1.5 rounded-xl bg-gray-50 border-gray-200 text-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="edit-bin-lower"
                  className="text-sm font-medium text-gray-700"
                >
                  BIN Lower *
                </Label>
                <Input
                  id="edit-bin-lower"
                  placeholder="e.g., 1234560000000000000"
                  value={editBinForm.bin_lower}
                  onChange={(e) =>
                    setEditBinForm({
                      ...editBinForm,
                      bin_lower: e.target.value,
                    })
                  }
                  className="mt-1.5 rounded-xl font-mono border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  maxLength={19}
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-bin-upper"
                  className="text-sm font-medium text-gray-700"
                >
                  BIN Upper *
                </Label>
                <Input
                  id="edit-bin-upper"
                  placeholder="e.g., 1234569999999999999"
                  value={editBinForm.bin_upper}
                  onChange={(e) =>
                    setEditBinForm({
                      ...editBinForm,
                      bin_upper: e.target.value,
                    })
                  }
                  className="mt-1.5 rounded-xl font-mono border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  maxLength={19}
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="edit-bin-holder"
                className="text-sm font-medium text-gray-700"
              >
                BIN Holder Name
              </Label>
              <Input
                id="edit-bin-holder"
                placeholder="Enter BIN holder name"
                value={editBinForm.bin_holder_name || ""}
                onChange={(e) =>
                  setEditBinForm({
                    ...editBinForm,
                    bin_holder_name: e.target.value,
                  })
                }
                className="mt-1.5 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-4">
              <Label
                htmlFor="edit-gateway"
                className="text-sm font-medium text-gray-700"
              >
                Gateway *
              </Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setIsGatewayDropdownOpen(!isGatewayDropdownOpen)
                  }
                  className="w-full mt-1.5 px-3 py-2 text-left bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500 focus:outline-none flex items-center justify-between"
                >
                  <span
                    className={
                      editFormGateway ? "text-gray-900" : "text-gray-500"
                    }
                  >
                    {editFormGateway
                      ? `${editFormGateway.name} (ID: ${editFormGateway.id})`
                      : "Select gateway"}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      isGatewayDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isGatewayDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
                    <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search gateways..."
                          value={gatewaySearchTerm}
                          onChange={(e) => setGatewaySearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                      {filteredGatewaysForEdit.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          No gateways found
                        </div>
                      ) : (
                        filteredGatewaysForEdit.map((gateway) => (
                          <button
                            key={gateway.id}
                            type="button"
                            onClick={() => {
                              setEditFormGateway(gateway);
                              setIsGatewayDropdownOpen(false);
                              setGatewaySearchTerm("");
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-sm ${
                              editFormGateway?.id === gateway.id
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-900"
                            }`}
                          >
                            {gateway.name} (ID: {gateway.id})
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label
                  htmlFor="edit-bin-type"
                  className="text-sm font-medium text-gray-700"
                >
                  Type
                </Label>
                <Input
                  id="edit-bin-type"
                  value={editBinForm.bin_type.toString()}
                  onChange={(e) =>
                    setEditBinForm({
                      ...editBinForm,
                      bin_type: Number.parseInt(e.target.value) || 1,
                    })
                  }
                  className="mt-1.5 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-country"
                  className="text-sm font-medium text-gray-700"
                >
                  Country
                </Label>
                <Input
                  id="edit-country"
                  value={editBinForm.country}
                  onChange={(e) =>
                    setEditBinForm({ ...editBinForm, country: e.target.value })
                  }
                  className="mt-1.5 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-currency"
                  className="text-sm font-medium text-gray-700"
                >
                  Currency
                </Label>
                <Input
                  id="edit-currency"
                  value={editBinForm.currency}
                  onChange={(e) =>
                    setEditBinForm({ ...editBinForm, currency: e.target.value })
                  }
                  className="mt-1.5 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-region"
                  className="text-sm font-medium text-gray-700"
                >
                  Region
                </Label>
                <Input
                  id="edit-region"
                  value={editBinForm.region}
                  onChange={(e) =>
                    setEditBinForm({ ...editBinForm, region: e.target.value })
                  }
                  className="mt-1.5 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </form>

          <DialogFooter className="pt-6 gap-3">
            <Button
              variant="outline"
              onClick={() => setShowEditBinModal(false)}
              className="border-gray-200 hover:bg-gray-50 px-6 rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditBin}
              className="bg-blue-600 hover:bg-blue-700 px-6 rounded-full"
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update BIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Gateway Modal */}
      <Dialog
        open={showEditGatewayModal}
        onOpenChange={setShowEditGatewayModal}
      >
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Edit Gateway
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Update the gateway name and configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="edit-gateway-name"
                className="text-sm font-medium text-gray-700"
              >
                Gateway Name
              </Label>
              <Input
                id="edit-gateway-name"
                value={editGatewayData.name}
                onChange={(e) => setEditGatewayData({ name: e.target.value })}
                placeholder="Enter gateway name"
                className="mt-1 rounded-full border-gray-300"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowEditGatewayModal(false)}
              className="flex-1 border-gray-200 hover:bg-gray-50 rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditGateway}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update Gateway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteConfirmModal}
        onOpenChange={setShowDeleteConfirmModal}
      >
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Delete {deleteTarget?.type === "gateway" ? "Gateway" : "BIN"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Are you sure you want to delete this{" "}
              {deleteTarget?.type === "gateway" ? "gateway" : "BIN"}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget?.type === "gateway" && (
            <div className="bg-gray-50 rounded-xl p-4 my-4">
              <div className="text-sm text-gray-600">
                <div>
                  <span className="font-medium">Gateway Name:</span>{" "}
                  {deleteTarget.data.name}
                </div>
                <div>
                  <span className="font-medium">Gateway ID:</span>{" "}
                  {deleteTarget.data.id}
                </div>
                <div>
                  <span className="font-medium">BIN Count:</span>{" "}
                  {deleteTarget.data.bin_count}
                </div>
              </div>
              {deleteTarget.data.bin_count > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <span className="text-sm text-amber-800 font-medium">
                      Warning: This gateway cannot be deleted because it has{" "}
                      {deleteTarget.data.bin_count} BIN(s) associated with it.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {deleteTarget?.type === "bin" && (
            <div className="bg-gray-50 rounded-xl p-4 my-4">
              <div className="text-sm text-gray-600">
                <div>
                  <span className="font-medium">BIN Range:</span>{" "}
                  {deleteTarget.data.bin_lower} - {deleteTarget.data.bin_upper}
                </div>
                <div>
                  <span className="font-medium">Holder Name:</span>{" "}
                  {deleteTarget.data.bin_holder_name || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  {deleteTarget.data.bin_type}
                </div>
                <div>
                  <span className="font-medium">Country:</span>{" "}
                  {deleteTarget.data.country}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700">
                      Also delete BIN holder name
                    </label>
                    <span className="text-xs text-gray-500">
                      Remove the holder name from the system permanently
                    </span>
                  </div>
                  <Switch
                    checked={deleteBinHolderName}
                    onCheckedChange={setDeleteBinHolderName}
                    className="data-[state=checked]:bg-red-600"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmModal(false)}
              className="flex-1 border-gray-200 hover:bg-gray-50 rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={
                loading ||
                (deleteTarget?.type === "gateway" &&
                  deleteTarget.data.bin_count > 0)
              }
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete {deleteTarget?.type === "gateway" ? "Gateway" : "BIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
