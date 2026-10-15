"use client";

import type React from "react";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Clock, FileIcon, Search, Trash2, Copy } from "lucide-react";
import { useRnaApi } from "@/hooks/useRnaApi";
import { TransactionTable } from "@/components/rna/transaction-table";
import { useAuth } from "@/contexts/auth-context";

interface SavedTransaction {
  saved_id: string;
  save_name: string;
  description: string;
  created_at: string;
  transaction_count: number;
  transactions: any[];
  user_id: number;
}

interface SavedTransactionDetails {
  saved_transaction: any;
  transaction_details: any[];
  attributes: any[];
  endpoints: any[];
  graylog_data: any[];
  transaction_details_count: number;
  attributes_count: number;
  endpoints_count: number;
  graylog_count: number;
}

interface Transaction {
  [key: string]: any;
}

interface SavedTransactionsProps {
  onTransactionClick: (transaction: Transaction, additionalData?: any) => void;
  isActive?: boolean; // Added prop to track if tab is active
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onCopyCellValue: () => void;
  onCopyRowData: () => void;
  cellValue?: string;
}

function ContextMenu({
  isOpen,
  position,
  onClose,
  onCopyCellValue,
  onCopyRowData,
  cellValue,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-48"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <button
        onClick={onCopyCellValue}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-3"
      >
        <Copy className="h-4 w-4 text-gray-500" />
        <span>Copy Cell Value</span>
      </button>
      <button
        onClick={onCopyRowData}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-3"
      >
        <FileText className="h-4 w-4 text-gray-500" />
        <span>Copy Row Data</span>
      </button>
    </div>
  );
}

export function SavedTransactions({
  onTransactionClick,
  isActive = true,
}: SavedTransactionsProps) {
  const [savedTransactions, setSavedTransactions] = useState<
    SavedTransaction[]
  >([]);
  const [selectedSavedTransaction, setSelectedSavedTransaction] =
    useState<SavedTransaction | null>(null);
  const [savedTransactionResults, setSavedTransactionResults] = useState<
    Transaction[]
  >([]);
  const [savedTransactionDetails, setSavedTransactionDetails] =
    useState<SavedTransactionDetails | null>(null);
  const [loadingSavedTransactions, setLoadingSavedTransactions] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<SavedTransaction | null>(null);

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  );
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    rowIndex: number;
    cellKey?: string;
    cellValue?: string;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    rowIndex: -1,
  });

  const rnaApi = useRnaApi();
  const { user } = useAuth();

  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const detailsAbortControllerRef = useRef<AbortController | null>(null);

  const debouncedSearch = useCallback((term: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(term);
    }, 300);
  }, []);

  const loadSavedTransactions = async () => {
    if (!isActive || !user) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoadingSavedTransactions(true);

    try {
      const response = await rnaApi.getSavedTransactions();

      if (abortControllerRef.current?.signal.aborted) return;

      if (response.success && response.data && Array.isArray(response.data)) {
        const userSavedTransactions = response.data.filter(
          (transaction: SavedTransaction) =>
            user && transaction.user_id === user.id
        );
        setSavedTransactions(userSavedTransactions);
      } else {
        setSavedTransactions([]);
      }
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error("Failed to load saved transactions:", error);
        setSavedTransactions([]);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoadingSavedTransactions(false);
      }
    }
  };

  const loadSavedTransactionDetails = async (savedTransactionId: string) => {
    if (!isActive) return;

    if (detailsAbortControllerRef.current) {
      detailsAbortControllerRef.current.abort();
    }

    detailsAbortControllerRef.current = new AbortController();

    try {
      const response = await rnaApi.getSavedTransactionDetails(
        savedTransactionId
      );

      if (detailsAbortControllerRef.current?.signal.aborted) return;

      if (response.success && response.data) {
        setSavedTransactionDetails(response.data);
        setSavedTransactionResults(response.data.transaction_details || []);
      }
    } catch (error) {
      if (!detailsAbortControllerRef.current?.signal.aborted) {
        console.error("Failed to load saved transaction details:", error);
      }
    }
  };

  const openDeleteConfirm = (
    saved: SavedTransaction,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent triggering the card click
    setTransactionToDelete(saved);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteSavedTransaction = async () => {
    if (!transactionToDelete) return;

    try {
      await rnaApi.deleteSavedTransaction(transactionToDelete.saved_id);
      setSavedTransactions((prev) =>
        prev.filter((saved) => saved.saved_id !== transactionToDelete.saved_id)
      );
      if (selectedSavedTransaction?.saved_id === transactionToDelete.saved_id) {
        setSelectedSavedTransaction(null);
        setSavedTransactionResults([]);
        setSavedTransactionDetails(null);
      }
      setIsDeleteConfirmOpen(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error("Failed to delete saved transaction:", error);
      alert("Failed to delete saved transaction. Please try again.");
    }
  };

  const filteredSavedTransactions = savedTransactions.filter(
    (saved) =>
      saved.save_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (saved.description &&
        saved.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    if (user && isActive) {
      loadSavedTransactions();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (detailsAbortControllerRef.current) {
        detailsAbortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [user, isActive]);

  useEffect(() => {
    if (!isActive) {
      setLoadingSavedTransactions(false);
      setSavedTransactionResults([]);
      setSavedTransactionDetails(null);
      setSelectedSavedTransaction(null);
      setSelectedRows(new Set());
      setSearchTerm("");
      setCurrentPage(1);
      setColumnFilters({});
      setSortConfig(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (detailsAbortControllerRef.current) {
        detailsAbortControllerRef.current.abort();
        detailsAbortControllerRef.current = null;
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    }
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (detailsAbortControllerRef.current) {
        detailsAbortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleRowSelect = (index: number) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(index)) {
      newSelectedRows.delete(index);
    } else {
      newSelectedRows.add(index);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleRowSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      const allRows = new Set(
        Array.from({ length: savedTransactionResults.length }, (_, i) => i)
      );
      setSelectedRows(allRows);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleColumnFilter = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleColumnVisibilityChange = (columnKey: string) => {
    const newHiddenColumns = new Set(hiddenColumns);
    if (newHiddenColumns.has(columnKey)) {
      newHiddenColumns.delete(columnKey);
    } else {
      newHiddenColumns.add(columnKey);
    }
    setHiddenColumns(newHiddenColumns);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    rowIndex: number,
    cellKey?: string,
    cellValue?: string
  ) => {
    e.preventDefault();

    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      rowIndex,
      cellKey,
      cellValue,
    });
  };

  const handleCopyCellValue = () => {
    if (contextMenu.cellValue !== undefined) {
      navigator.clipboard
        .writeText(String(contextMenu.cellValue))
        .then(() => {
          console.log(
            `📋 Copied to clipboard: ${contextMenu.cellKey} = "${contextMenu.cellValue}"`
          );
        })
        .catch((err) => {
          console.error("Failed to copy to clipboard:", err);
          alert(`Value: ${contextMenu.cellValue}`);
        });
    }
    setContextMenu({ ...contextMenu, isOpen: false });
  };

  const handleCopyRowData = () => {
    if (
      contextMenu.rowIndex >= 0 &&
      savedTransactionResults[contextMenu.rowIndex]
    ) {
      const transaction = savedTransactionResults[contextMenu.rowIndex];
      const rowData = Object.entries(transaction)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      navigator.clipboard
        .writeText(rowData)
        .then(() => {
          console.log(`📋 Copied row data to clipboard`);
        })
        .catch((err) => {
          console.error("Failed to copy row data to clipboard:", err);
          alert(`Row data: ${rowData}`);
        });
    }
    setContextMenu({ ...contextMenu, isOpen: false });
  };

  const handleTransactionClick = (transaction: Transaction) => {
    if (savedTransactionDetails) {
      const transactionId = transaction.trx_id;
      const transactionUuid = transaction.uuid;

      const transactionAttributes = savedTransactionDetails.attributes.filter(
        (attr) => {
          const attrTransactionId = attr.transaction_id?.toString();
          const txnId = transactionId?.toString();
          return attrTransactionId === txnId;
        }
      );

      const transactionEndpoints = savedTransactionDetails.endpoints.filter(
        (endpoint) => endpoint.uuid === transactionUuid
      );

      const transactionGraylog = savedTransactionDetails.graylog_data.filter(
        (graylog) => graylog.uuid === transactionUuid
      );

      if (
        transactionGraylog.length === 0 &&
        savedTransactionDetails.graylog_data.length > 0
      ) {
        onTransactionClick(transaction, {
          attributes: transactionAttributes,
          endpoints: transactionEndpoints,
          graylog_data: transactionGraylog,
          saved_transaction_info: savedTransactionDetails.saved_transaction,
        });
      } else {
        onTransactionClick(transaction, {
          attributes: transactionAttributes,
          endpoints: transactionEndpoints,
          graylog_data: transactionGraylog,
          saved_transaction_info: savedTransactionDetails.saved_transaction,
        });
      }
    }
  };

  if (!isActive) {
    return (
      <div className="flex space-x-6 h-full">
        <div className="w-96">
          <Card className="shadow-sm border-0 bg-white rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Saved Transactions
                </h3>
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-500"
                >
                  -
                </Badge>
              </div>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">
                  Switch to this tab to load saved transactions
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex-1">
          <Card className="shadow-sm border-0 bg-white rounded-2xl">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Saved Transactions
              </h3>
              <p className="text-gray-600">
                Switch to this tab to view saved transactions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex space-x-6 h-full">
      {/* Left Sidebar - Saved Transactions List */}
      <div className="w-96">
        <Card className="shadow-sm border-0 bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Saved Transactions
              </h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {filteredSavedTransactions.length}
              </Badge>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search saved transactions..."
                onChange={(e) => debouncedSearch(e.target.value)}
                className="pl-10 rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200"
              />
            </div>

            <ScrollArea className="h-[600px]">
              {loadingSavedTransactions ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-2xl"></div>
                    </div>
                  ))}
                </div>
              ) : filteredSavedTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {searchTerm
                      ? "No saved transactions match your search"
                      : "No saved transactions found"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSavedTransactions.map((saved) => (
                    <div
                      key={saved.saved_id}
                      onClick={() => {
                        setSelectedSavedTransaction(saved);
                        loadSavedTransactionDetails(saved.saved_id);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        selectedSavedTransaction?.saved_id === saved.saved_id
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-800 text-sm truncate">
                          {saved.save_name}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => openDeleteConfirm(saved, e)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {saved.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {saved.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(saved.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FileIcon className="h-3 w-3" />
                          <span>{saved.transactions?.length || 0} items</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 min-w-0">
        {selectedSavedTransaction ? (
          <Card className="shadow-sm border-0 bg-white rounded-2xl">
            <CardHeader className="pb-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {selectedSavedTransaction.save_name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedSavedTransaction.description || "No description"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {selectedSavedTransaction.transaction_count} transactions
                  </div>
                  <div className="text-xs text-gray-500">
                    Saved on{" "}
                    {new Date(
                      selectedSavedTransaction.created_at
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {savedTransactionResults.length > 0 ? (
                <TransactionTable
                  transactions={savedTransactionResults}
                  selectedRows={selectedRows}
                  onRowSelect={handleRowSelect}
                  onRowSelectAll={handleRowSelectAll}
                  onRowDoubleClick={handleTransactionClick}
                  onContextMenu={handleContextMenu}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  columnFilters={columnFilters}
                  onColumnFilter={handleColumnFilter}
                  hiddenColumns={hiddenColumns}
                  onColumnVisibilityChange={handleColumnVisibilityChange}
                  paginationState={{
                    currentPage,
                    pageSize,
                    totalPages: Math.ceil(
                      savedTransactionResults.length / pageSize
                    ),
                    totalRows: savedTransactionResults.length,
                  }}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  isLoading={false}
                />
              ) : (
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-0 bg-white rounded-2xl">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Select a Saved Transaction
              </h3>
              <p className="text-gray-600">
                Choose a saved transaction from the sidebar to view its details
                and data.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the saved transaction "
              {transactionToDelete?.save_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSavedTransaction}
              className="rounded-2xl"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
        onCopyCellValue={handleCopyCellValue}
        onCopyRowData={handleCopyRowData}
        cellValue={contextMenu.cellValue}
      />
    </div>
  );
}
