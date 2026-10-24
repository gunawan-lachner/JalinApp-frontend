"use client";

import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Copy,
  X,
  Database,
  Activity,
  Search,
  Table,
  BarChart,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

import { useRnaApi } from "@/hooks/useRnaApi";
import type { ConnectionProfile, Transaction } from "@/lib/api";
import { TransactionTable } from "@/components/rna/transaction-table";
import { TransactionFilters } from "@/components/rna/transaction-filters";
import { TransactionDetailsModal } from "@/components/rna/transaction-details-modal";
import { Sidebar } from "@/components/layout/sidebar";
import { columns } from "@/components/rna/columns";
import { FileText } from "lucide-react";
import { TransactionInsights } from "@/components/rna/transaction-insights";
import { rnaApi } from "@/lib/api";
import { SavedTransactions } from "@/components/transaction/saved-transactions";
import { Save } from "lucide-react";

interface DynamicFilter {
  field: string;
  operator: string;
  value: string;
}

const MAX_INSIGHTS_PAGE_SIZE = 99999999999;

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function TransactionPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState(pathname);
  const [selectedConnection, setSelectedConnection] = useState("");

  const [dateStart, setDateStart] = useState(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return `${todayStr} 00:00:01`;
  });
  const [dateEnd, setDateEnd] = useState(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return `${todayStr} 23:59:59`;
  });

  const [dynamicFilters, setDynamicFilters] = useState<DynamicFilter[]>([
    { field: "Trx ID", operator: "=", value: "" },
  ]);
  const [filterFields, setFilterFields] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [filterOperators, setFilterOperators] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
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
      return Number.parseInt(localStorage.getItem("rna_page_size") || "20");
    }
    return 20;
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportForm, setExportForm] = useState({
    title: "",
    scenarioTesting: "",
    expectedResult: "",
    actualResult: "",
    includeGrayLog: false,
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [transactionDetails, setTransactionDetails] = useState<{
    attributes: any[];
    endpoints: any[];
    graylog: any[];
    graylogError?: string | null;
  }>({
    attributes: [],
    endpoints: [],
    graylog: [],
    graylogError: null,
  });

  const [resultCodeFilter, setResultCodeFilter] = useState("all");
  const [transactionStatusFilter, setTransactionStatusFilter] = useState("all");

  const [showQuerySection, setShowQuerySection] = useState(false);
  const [queryInfo, setQueryInfo] = useState<{
    executedSql?: string;
    executionTime?: number;
    error?: string | null;
  }>({});

  const [savedTransactions, setSavedTransactions] = useState<any[]>([]);
  const [selectedSavedTransaction, setSelectedSavedTransaction] = useState<
    any | null
  >(null);
  const [savedTransactionResults, setSavedTransactionResults] = useState<
    Transaction[]
  >([]);
  const [loadingSavedTransactions, setLoadingSavedTransactions] =
    useState(false);

  const [viewMode, setViewMode] = useState<"table" | "insights" | "saved">(
    "table"
  );

  const [cachedTableData, setCachedTableData] = useState<Transaction[]>([]);
  const [cachedInsightsData, setCachedInsightsData] = useState<Transaction[]>(
    []
  );
  const [lastSearchParams, setLastSearchParams] = useState<string>("");
  const latestSearchRequestId = useRef(0);

  const api = useRnaApi();

  const [connectionProfiles, setConnectionProfiles] = useState<
    ConnectionProfile[]
  >([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insightsTransactions, setInsightsTransactions] = useState<
    Transaction[]
  >([]);
  const [searchResults, setSearchResults] = useState<{
    total: number;
    totalPages: number;
    executionTime: number;
    query: string;
  } | null>(null);

  const [debugInfo, setDebugInfo] = useState<{
    metadataLoaded: boolean;
    connectionSelected: boolean;
    searchAttempted: boolean;
    lastSearchParams: any;
    lastApiResponse: any;
  }>({
    metadataLoaded: false,
    connectionSelected: false,
    searchAttempted: false,
    lastSearchParams: null,
    lastApiResponse: null,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [saveForm, setSaveForm] = useState({
    saveName: "",
    description: "",
    saveGraylog: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [savedTransactionDetails, setSavedTransactionDetails] = useState<{
    attributes: any[];
    endpoints: any[];
    graylog: any[];
  } | null>(null);

  const [savedTransactionId, setSavedTransactionId] = useState<number | null>(
    null
  );
  const [saveTabMode, setSaveTabMode] = useState<"new" | "existing">("new");
  const [existingProfiles, setExistingProfiles] = useState<any[]>([]);
  const [selectedExistingProfile, setSelectedExistingProfile] = useState<
    any | null
  >(null);
  const [loadingExistingProfiles, setLoadingExistingProfiles] = useState(false);
  const [selectedTransactionIndex, setSelectedTransactionIndex] = useState<
    number | null
  >(null);

  const [redmineSearchLoading, setRedmineSearchLoading] = useState(false);
  const [redmineResults, setRedmineResults] = useState<any[]>([]);
  const [showRedmineResults, setShowRedmineResults] = useState(false);

  const debouncedGlobalSearchTerm = useDebounce(globalSearchTerm, 300);

  const parseRedmineMessage = (description: string) => {
    // More flexible patterns that handle various formatting styles, spacing, and punctuation
    const scenarioPattern =
      /(?:scenario|skenario)\s*[:-]*\s*(.*?)(?=expected\s+result|actual\s+result|please\s+check|$)/is;
    const expectedResultPattern =
      /expected\s+result\s*[:-]*\s*(.*?)(?=actual\s+result|please\s+check|$)/is;
    const actualResultPattern =
      /actual\s+result\s*[:-]*\s*(.*?)(?=please\s+check|note|reff?\s+number|transaction|$)/is;

    // Clean up the input text by normalizing whitespace and removing extra characters
    const cleanDescription = description
      .replace(/\r\n/g, "\n")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const scenarioMatch = cleanDescription.match(scenarioPattern);
    const expectedMatch = cleanDescription.match(expectedResultPattern);
    const actualMatch = cleanDescription.match(actualResultPattern);

    const cleanMatch = (match: string) => {
      return match
        .trim()
        .replace(/^[-:\s]+/, "") // Remove leading dashes, colons, and spaces
        .replace(/[-:\s]+$/, "") // Remove trailing dashes, colons, and spaces
        .replace(/\s+/g, " ") // Normalize internal spacing
        .trim();
    };

    let expectedResult = "";
    let actualResult = "";

    if (actualMatch) {
      // Normal case: both expected and actual results exist
      expectedResult = expectedMatch ? cleanMatch(expectedMatch[1]) : "";
      actualResult = cleanMatch(actualMatch[1]);
    } else if (expectedMatch) {
      // Only expected result exists
      expectedResult = cleanMatch(expectedMatch[1]);
    } else if (scenarioMatch) {
      // No explicit expected/actual result sections, treat everything after scenario as expected result
      const afterScenarioPattern =
        /(?:scenario|skenario)\s*[:-]*\s*.*?(?=expected\s+result|actual\s+result|$)(.*?)(?=please\s+check|note|reff?\s+number|transaction|$)/is;
      const afterScenarioMatch = cleanDescription.match(afterScenarioPattern);
      if (afterScenarioMatch && afterScenarioMatch[1]) {
        expectedResult = cleanMatch(afterScenarioMatch[1]);
      } else {
        // Fallback: everything after the scenario match
        const scenarioEndIndex =
          cleanDescription.indexOf(scenarioMatch[1]) + scenarioMatch[1].length;
        const remainingText = cleanDescription.substring(scenarioEndIndex);
        expectedResult = cleanMatch(remainingText);
      }
    }

    return {
      scenario: scenarioMatch ? cleanMatch(scenarioMatch[1]) : "",
      expectedResult,
      actualResult,
    };
  };

  const handleRedmineSearch = async () => {
    if (!exportForm.title.trim()) {
      return;
    }

    setRedmineSearchLoading(true);
    try {
      // Extract issue IDs from the title (assuming format like "33000" or "#33000")
      const issueIds = exportForm.title
        .split(",")
        .map((id) => id.trim().replace("#", ""));

      const response = await rnaApi.searchRedmine(issueIds);

      if (response.success && response.data?.data?.found) {
        setRedmineResults(response.data.data.found);
        setShowRedmineResults(true);

        // If only one result, auto-populate
        if (response.data.data.found.length === 1) {
          const result = response.data.data.found[0];
          const parsedData = parseRedmineMessage(result.description);

          setExportForm((prev) => ({
            ...prev,
            title: result.title,
            scenarioTesting: parsedData.scenario || result.description,
            expectedResult: parsedData.expectedResult,
            actualResult: parsedData.actualResult,
          }));
          setShowRedmineResults(false);
        }
      }
    } catch (error) {
      console.error("Error searching Redmine:", error);
    } finally {
      setRedmineSearchLoading(false);
    }
  };

  const selectRedmineResult = (result: any) => {
    const parsedData = parseRedmineMessage(result.description);

    setExportForm((prev) => ({
      ...prev,
      title: result.title,
      scenarioTesting: parsedData.scenario || result.description,
      expectedResult: parsedData.expectedResult,
      actualResult: parsedData.actualResult,
    }));
    setShowRedmineResults(false);
  };

  const loadSavedTransactions = async () => {
    setLoadingSavedTransactions(true);
    try {
      const response = await rnaApi.getSavedTransactions();
      if (response.success && response.data && Array.isArray(response.data)) {
        setSavedTransactions(response.data);
      } else {
        setSavedTransactions([]); // Ensure it's always an array
      }
    } catch (error) {
      console.error("Failed to load saved transactions:", error);
      setSavedTransactions([]); // Ensure it's always an array on error
    } finally {
      setLoadingSavedTransactions(false);
    }
  };

  const loadSavedTransactionDetails = async (savedTransactionId: number) => {
    try {
      const response = await rnaApi.getSavedTransactionDetails(
        savedTransactionId
      );
      if (response.success && response.data) {
        setSavedTransactionResults(response.data.transactions || []);
      }
    } catch (error) {
      console.error("Failed to load saved transaction details:", error);
    }
  };

  useEffect(() => {
    if (viewMode === "saved") {
      loadSavedTransactions();
    }
  }, [viewMode]);

  useEffect(() => {
    console.log("🚀 Component mounted, fetching filter metadata...");
    setDebugInfo((prev) => ({ ...prev, metadataLoaded: false }));

    api.getFilterMetadata(
      (data) => {
        console.log("✅ Filter metadata loaded:", data);
        setFilterFields(data.filterFields || []);
        setFilterOperators(data.filterOperators || []);
        setConnectionProfiles(data.profiles || []);
        setDebugInfo((prev) => ({ ...prev, metadataLoaded: true }));

        console.log(
          "ℹ️ Connection profiles loaded, waiting for user selection"
        );
      },
      (error) => {
        console.error("❌ Failed to load filter metadata:", error);
        api.getConnectionProfiles(
          (data) => {
            console.log("✅ Connection profiles loaded as fallback:", data);
            setConnectionProfiles(data);
            setDebugInfo((prev) => ({ ...prev, metadataLoaded: true }));

            console.log(
              "ℹ️ Connection profiles loaded as fallback, waiting for user selection"
            );
          },
          (error) => {
            console.error("❌ Failed to load connection profiles:", error);
          }
        );
      }
    );
  }, []);

  useEffect(() => {
    if (selectedConnection && dateStart && dateEnd) {
      // Only search if we don't have cached data or search params changed
      const currentSearchParams = JSON.stringify({
        connection: selectedConnection,
        dateStart,
        dateEnd,
        resultCodeFilter,
        transactionStatusFilter,
        dynamicFilters,
      });

      if (currentSearchParams !== lastSearchParams) {
        setLastSearchParams(currentSearchParams);
        // Clear cached data when search params change
        setCachedTableData([]);
        setCachedInsightsData([]);

        // Load data for current view mode
        if (viewMode === "table") {
          handleSearch(1, preferredPageSize, false);
        } else if (viewMode === "insights") {
          handleSearch(1, MAX_INSIGHTS_PAGE_SIZE, true);
        }
      }
    }
  }, [
    selectedConnection,
    dateStart,
    dateEnd,
    resultCodeFilter,
    transactionStatusFilter,
    dynamicFilters,
  ]);

  // useEffect(() => {
  //   if (selectedConnection && dateStart && dateEnd && viewMode !== "saved") {
  //     const timeoutId = setTimeout(() => {
  //       console.log("🔄 Auto-searching due to date, result code, or transaction status change")
  //       if (viewMode === "table") {
  //         handleSearch(1, paginationState.pageSize, viewMode === "insights")
  //       } else {
  //         handleSearch(1, MAX_INSIGHTS_PAGE_SIZE, true)
  //       }
  //     }, 1000)
  //     return () => clearTimeout(timeoutId)
  //   }
  // }, [dateStart, dateEnd, resultCodeFilter, transactionStatusFilter, viewMode])

  const handleNavigation = (href: string) => {
    router.push(href);
    setActiveSection(href);
  };

  const addFilter = () => {
    const defaultField =
      filterFields.length > 0 ? filterFields[0].value : "Trx ID";
    const defaultOperator =
      filterOperators.length > 0 ? filterOperators[0].value : "=";
    setShowFilters(true);
    setDynamicFilters([
      ...dynamicFilters,
      { field: defaultField, operator: defaultOperator, value: "" },
    ]);
  };

  const removeFilter = (index: number) => {
    setDynamicFilters((prevFilters) => {
      const updated = prevFilters.filter((_, i) => i !== index);
      // Trigger search with the updated filters immediately
      if (selectedConnection) {
        handleSearch(
          1,
          paginationState.pageSize,
          viewMode === "insights",
          updated
        );
      }
      return updated;
    });
  };

  const updateFilter = (
    index: number,
    key: keyof DynamicFilter,
    value: string
  ) => {
    const updated = [...dynamicFilters];
    updated[index][key] = value;
    setDynamicFilters(updated);
  };

  const handleGlobalSearch = useCallback((term: string) => {
    setGlobalSearchTerm(term);
  }, []);

  useEffect(() => {
    const currentData =
      viewMode === "table" ? transactions : insightsTransactions;
    // Keep filteredTransactions aligned with current page payload.
    // Quick search is executed server-side via `search_term` to keep pagination consistent.
    setFilteredTransactions(currentData);
  }, [debouncedGlobalSearchTerm, transactions, insightsTransactions, viewMode]);

  const handleSearch = async (
    newPage = 1,
    newPageSize = paginationState.pageSize,
    forInsights: boolean,
    overrideDynamicFilters?: DynamicFilter[]
  ) => {
    if (!selectedConnection) {
      console.warn("⚠️ No connection selected, skipping search");
      return;
    }

    if (!dateStart || !dateEnd) {
      console.warn("⚠️ Date range not set, skipping search");
      return;
    }

    const isPageChange = newPage !== paginationState.currentPage;

    if (
      forInsights &&
      cachedInsightsData.length > 0 &&
      !isPageChange &&
      newPage === 1
    ) {
      console.log("📋 Using cached insights data");
      setInsightsTransactions(cachedInsightsData);
      setSelectedRows(new Set());
      return;
    } else if (
      !forInsights &&
      cachedTableData.length > 0 &&
      !isPageChange &&
      newPage === 1 &&
      paginationState.currentPage === 1
    ) {
      console.log("📋 Using cached table data");
      setTransactions(cachedTableData);
      setPaginationState((prev) => ({
        ...prev,
        currentPage: 1,
      }));
      setSelectedRows(new Set());
      return;
    }

    const requestId = ++latestSearchRequestId.current;
    setIsPaginationLoading(true);
    setDebugInfo((prev) => ({ ...prev, searchAttempted: true }));

    const actualPageSize = forInsights ? MAX_INSIGHTS_PAGE_SIZE : newPageSize;

    const filtersToUse = overrideDynamicFilters || dynamicFilters;

    console.log(
      `🔍 Searching page ${newPage} with ${actualPageSize} items per page (forInsights: ${forInsights})`
    );
    console.log(`📅 Date range: ${dateStart} to ${dateEnd}`);
    console.log(`🔗 Connection: ${selectedConnection}`);
    console.log(`🎯 Dynamic filters:`, filtersToUse);
    console.log(`🎯 Result Code Filter:`, resultCodeFilter);
    console.log(`🎯 Transaction Status Filter:`, transactionStatusFilter);

    const filterParams: { [key: string]: string } = {};
    let filterIndex = 0;

    filtersToUse.forEach((filter) => {
      if (filter.field && filter.operator && filter.value) {
        filterParams[`filter_field_${filterIndex}`] = filter.field;
        filterParams[`filter_operator_${filterIndex}`] = filter.operator;
        filterParams[`filter_value_${filterIndex}`] = filter.value;
        filterIndex++;
      }
    });

    if (resultCodeFilter === "0" || resultCodeFilter === "61") {
      filterParams[`filter_field_${filterIndex}`] = "Result";
      filterParams[`filter_operator_${filterIndex}`] = "=";
      filterParams[`filter_value_${filterIndex}`] = resultCodeFilter;
      filterIndex++;
    } else if (resultCodeFilter === "error") {
      filterParams[`filter_field_${filterIndex}`] = "Result";
      filterParams[`filter_operator_${filterIndex}`] = "!=";
      filterParams[`filter_value_${filterIndex}`] = "0";
      filterIndex++;

      filterParams[`filter_field_${filterIndex}`] = "Result";
      filterParams[`filter_operator_${filterIndex}`] = "!=";
      filterParams[`filter_value_${filterIndex}`] = "61";
      filterIndex++;
    }

    if (transactionStatusFilter === "1") {
      filterParams[`filter_field_${filterIndex}`] = "Trx Status";
      filterParams[`filter_operator_${filterIndex}`] = "=";
      filterParams[`filter_value_${filterIndex}`] = "1";
      filterIndex++;
    } else if (transactionStatusFilter === "error") {
      filterParams[`filter_field_${filterIndex}`] = "Trx Status";
      filterParams[`filter_operator_${filterIndex}`] = "!=";
      filterParams[`filter_value_${filterIndex}`] = "1";
      filterIndex++;
    }

    const searchParams = {
      rna_connection: selectedConnection,
      date_start: dateStart,
      date_end: dateEnd,
      page: newPage,
      page_size: actualPageSize,
      ...(searchTerm.trim() ? { search_term: searchTerm.trim() } : {}),
      ...filterParams,
    };

    console.log("📦 Final search parameters:", searchParams);
    setDebugInfo((prev) => ({ ...prev, lastSearchParams: searchParams }));

    api.searchTransactions(
      searchParams,
      (data) => {
        if (requestId !== latestSearchRequestId.current) return;
        console.log("✅ Search results received:", data);
        setDebugInfo((prev) => ({ ...prev, lastApiResponse: data }));

        const results = data.results || [];
        console.log(`📊 Results count: ${results.length}`);
        console.log(`📈 Total rows: ${data.total_rows || 0}`);

        setQueryInfo({
          executedSql: data.executed_sql,
          executionTime: data.executionTime,
          error: data.error,
        });

        if (forInsights) {
          setInsightsTransactions(results);
          setCachedInsightsData(results);
        } else {
          setTransactions(results);
          if (newPage === 1) {
            setCachedTableData(results);
          }
          setPaginationState({
            currentPage: data.page || newPage,
            pageSize: data.page_size || newPageSize,
            totalRows: data.total_rows || 0,
            totalPages: Math.ceil(
              (data.total_rows || 0) / (data.page_size || newPageSize)
            ),
            executionTime: Math.round((data.execution_time || 0) * 1000),
          });
        }

        setSearchResults({
          total: data.total_rows || 0,
          totalPages: Math.ceil(
            (data.total_rows || 0) / (data.page_size || newPageSize)
          ),
          executionTime: Math.round((data.execution_time || 0) * 1000),
          query: data.query || "API query executed",
        });
        setSelectedRows(new Set());
        setIsPaginationLoading(false);
      },
      (error) => {
        if (requestId !== latestSearchRequestId.current) return;
        console.error("❌ Search failed:", error);
        setDebugInfo((prev) => ({ ...prev, lastApiResponse: { error } }));

        setQueryInfo({
          executedSql: undefined,
          executionTime: undefined,
          error: error,
        });

        if (forInsights) {
          setInsightsTransactions([]);
          setCachedInsightsData([]);
        } else {
          setTransactions([]);
          setCachedTableData([]);
          setPaginationState((prev) => ({
            ...prev,
            totalRows: 0,
            totalPages: 0,
          }));
        }
        setSearchResults(null);
        setIsPaginationLoading(false);
      }
    );
  };

  const clearFilters = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    setDateStart(`${todayStr} 00:00:01`);
    setDateEnd(`${todayStr} 23:59:59`);
    setDynamicFilters([{ field: "Trx ID", operator: "=", value: "" }]);
    setColumnFilters({});
    setGlobalSearchTerm("");
    setSearchTerm("");
    setResultCodeFilter("all");
    setTransactionStatusFilter("all");
    if (selectedConnection) {
      setTimeout(
        () => handleSearch(1, preferredPageSize, viewMode === "insights", []),
        100
      );
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
    if (selectAll) {
      const currentTransactions =
        filteredTransactions.length > 0 || globalSearchTerm.trim()
          ? filteredTransactions
          : transactions;

      if (currentTransactions.length > 0) {
        const pageStart =
          (paginationState.currentPage - 1) * paginationState.pageSize;
        currentTransactions.forEach((_, localIndex) => {
          const globalIndex = pageStart + localIndex;
          newSelected.add(globalIndex);
        });
      }
    }
    setSelectedRows(newSelected);
  };

  const showTransactionDetails = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
    // Reset details so stale graylog/attrs from previous trx don't linger
    setTransactionDetails({
      attributes: [],
      endpoints: [],
      graylog: [],
      graylogError: null,
    });

    if (selectedConnection) {
      const uuid = transaction["UUID"] || (transaction as any).uuid;
      const trxId = transaction["Trx ID"] ?? (transaction as any).trx_id;

      api.getTransactionAttributes(
        selectedConnection,
        trxId?.toString(),
        (data) => {
          const attrs = Array.isArray(data)
            ? data
            : Array.isArray((data as any)?.attributes)
            ? (data as any).attributes
            : [];

          setTransactionDetails((prev) => ({ ...prev, attributes: attrs }));
        }
      );
      api.getTransactionEndpoints(
        selectedConnection,
        uuid,
        (data) => {
          setTransactionDetails((prev) => ({ ...prev, endpoints: data }));
        }
      );
      // GrayLog must be searched by UUID, not Trx ID
      if (uuid) {
        api.getGrayLogData(
          selectedConnection,
          uuid,
          (response) => {
            const graylogMessages =
              response?.data?.messages || response?.messages || [];
            setTransactionDetails((prev) => ({
              ...prev,
              graylog: graylogMessages,
              graylogError: null,
            }));
          },
          (errorMessage) => {
            setTransactionDetails((prev) => ({
              ...prev,
              graylog: [],
              graylogError: errorMessage,
            }));
          }
        );
      }
    }
  };

  const exportToHtml = async () => {
    if (!selectedConnection) {
      alert("Please select a connection first!");
      return;
    }

    // Close modal first
    setShowExportModal(false);

    // Then start loading
    setIsExporting(true);

    const exportAll = selectedRows.size === 0;
    const selectedTransactionIds = exportAll
      ? []
      : Array.from(selectedRows)
          .map((globalIndex) => {
            const currentPageStart =
              (paginationState.currentPage - 1) * paginationState.pageSize;
            const currentPageEnd = currentPageStart + paginationState.pageSize;

            // Only process transactions that are on the current page
            if (
              globalIndex >= currentPageStart &&
              globalIndex < currentPageEnd
            ) {
              const localIndex = globalIndex - currentPageStart;
              const currentTransactions =
                filteredTransactions.length > 0 || globalSearchTerm.trim()
                  ? filteredTransactions
                  : transactions;

              if (localIndex >= 0 && localIndex < currentTransactions.length) {
                const transaction = currentTransactions[localIndex];
                // Try different possible property names for transaction ID
                return (
                  transaction?.["Trx ID"] ||
                  (transaction as any)?.trx_id ||
                  (transaction as any)?.id
                );
              }
            }
            return null;
          })
          .filter(Boolean);

    const requestBody = {
      connection: selectedConnection,
      search: globalSearchTerm || "",
      page: paginationState.currentPage,
      page_size: paginationState.pageSize,
      exportAll,
      selectedTransactionIds,
      scenarioData: {
        title: exportForm.title,
        scenarioTesting: exportForm.scenarioTesting,
        expectedResult: exportForm.expectedResult,
        actualResult: exportForm.actualResult,
      },
      includeAttributes: true,
      includeEndpoints: true,
      includeGrayLog: exportForm.includeGrayLog,
      dateStart: dateStart,
      dateEnd: dateEnd,
    };

    try {
      const response = await rnaApi.exportTransactionsHtml(requestBody);

      if (!response.success || !response.data) {
        throw new Error(response.error || "Export failed");
      }

      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `transactions_${timestamp}.html`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`📥 File downloaded: ${filename}`);

      // Reset form after successful export
      setExportForm({
        title: "",
        scenarioTesting: "",
        expectedResult: "",
        actualResult: "",
        includeGrayLog: false,
      });
    } catch (error) {
      console.error("❌ Export failed:", error);
      alert(`Export failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const retryConnection = () => {
    console.log("🔄 Manual retry triggered");
    api.clearError();
    api.getFilterMetadata(
      (data) => {
        console.log("✅ Retry successful - Filter metadata loaded:", data);
        setFilterFields(data.filterFields || []);
        setFilterOperators(data.filterOperators || []);
        setConnectionProfiles(data.profiles || []);
        setDebugInfo((prev) => ({ ...prev, metadataLoaded: true }));
      },
      (error) => {
        console.error("❌ Retry failed:", error);
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

    const newSelected = new Set(selectedRows);
    if (!newSelected.has(rowIndex)) {
      newSelected.add(rowIndex);
      setSelectedRows(newSelected);
    }

    const localIndex =
      rowIndex - (paginationState.currentPage - 1) * paginationState.pageSize;
    const currentTransactions =
      filteredTransactions.length > 0 || globalSearchTerm.trim()
        ? filteredTransactions
        : transactions;

    let finalCellKey = cellKey;
    let finalCellValue = cellValue;

    if (!cellKey || !cellValue) {
      const target = e.target as HTMLElement;
      const cell = target.closest("td");
      if (cell) {
        const cellIndex = Array.from(
          cell.parentElement?.children || []
        ).indexOf(cell);
        const visibleColumns = columns.filter(
          (col) => !hiddenColumns.has(col.key)
        );

        if (cellIndex >= 2) {
          const columnIndex = cellIndex - 2;
          if (
            columnIndex < visibleColumns.length &&
            localIndex >= 0 &&
            localIndex < currentTransactions.length
          ) {
            const currentTransaction = currentTransactions[localIndex];

            finalCellKey = visibleColumns[columnIndex].key;
            finalCellValue = String(
              currentTransaction[finalCellKey as keyof Transaction] || ""
            );
          }
        }
      }
    }

    console.log(
      `🖱️ Right click on row ${rowIndex} (local: ${localIndex}), cell: ${finalCellKey} = "${finalCellValue}"`
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

    const getLocalIndex = (
      globalIdx: number | undefined
    ): number | undefined => {
      if (globalIdx === undefined) return undefined;
      return (
        globalIdx - (paginationState.currentPage - 1) * paginationState.pageSize
      );
    };

    const getTransaction = (
      globalIdx: number | undefined
    ): Transaction | undefined => {
      if (globalIdx === undefined) return undefined;
      const localIdx = getLocalIndex(globalIdx);
      if (localIdx === undefined || localIdx < 0) return undefined;

      const currentTransactions =
        filteredTransactions.length > 0 || globalSearchTerm.trim()
          ? filteredTransactions
          : transactions;

      if (localIdx >= currentTransactions.length) return undefined;
      return currentTransactions[localIdx];
    };

    switch (action) {
      case "copy-cell":
        if (cellValue) navigator.clipboard.writeText(cellValue);
        break;
      case "copy-row":
        if (rowIndex !== undefined) {
          const row = getTransaction(rowIndex);
          if (row) {
            const rowText = Object.entries(row)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n");
            navigator.clipboard.writeText(rowText);
          }
        }
        break;
      case "show-details":
        if (rowIndex !== undefined) {
          const transaction = getTransaction(rowIndex);
          if (transaction) {
            showTransactionDetails(transaction);
          }
        }
        break;
      case "see-log": {
        if (rowIndex === undefined) break;
        const tx = getTransaction(rowIndex);
        if (!tx) break;
        const uuid = (tx as any)["UUID"] || (tx as any).uuid || "";
        const dateVal =
          (tx as any)["Date n Time"] || (tx as any).date_n_time || "";
        const toDDMMYYYY = (d: string) => {
          if (!d) return "";
          const parsed = new Date(d);
          if (isNaN(parsed.getTime())) {
            // try parse fallback formats like "YYYY-MM-DD HH:MM:SS"
            const norm = String(d).replace(/-/g, "/");
            const p2 = new Date(norm);
            if (!isNaN(p2.getTime())) {
              const dd = String(p2.getDate()).padStart(2, "0");
              const mm = String(p2.getMonth() + 1).padStart(2, "0");
              const yyyy = String(p2.getFullYear());
              return `${dd}-${mm}-${yyyy}`;
            }
            return String(d);
          }
          const dd = String(parsed.getDate()).padStart(2, "0");
          const mm = String(parsed.getMonth() + 1).padStart(2, "0");
          const yyyy = String(parsed.getFullYear());
          return `${dd}-${mm}-${yyyy}`;
        };
        const dateParam = toDDMMYYYY(String(dateVal));
        if (uuid) {
          router.push(
            `/log-extractor?uuid=${encodeURIComponent(
              uuid
            )}&date=${encodeURIComponent(dateParam)}`
          );
        } else {
          toast({
            title: "UUID not available",
            description: "Cannot open Log Extractor without UUID.",
          });
        }
        break;
      }
      // Added save transaction option to context menu
      case "save-transactions":
        setShowSaveModal(true);
        break;
      case "filter-by-value":
        if (cellKey && cellValue) {
          console.log(
            `🔍 Adding advanced filter for "${cellKey}" = "${cellValue}"`
          );
          const newFilter: DynamicFilter = {
            field: cellKey,
            operator: "=",
            value: cellValue,
          };
          const updatedDynamicFilters = [...dynamicFilters, newFilter];
          setDynamicFilters(updatedDynamicFilters);

          setShowFilters(true);

          setGlobalSearchTerm("");
          setSearchTerm("");

          if (selectedConnection) {
            handleSearch(
              1,
              paginationState.pageSize,
              viewMode === "insights",
              updatedDynamicFilters
            );
          }
        }
        break;
      case "select-all":
        handleRowSelectAll(true);
        break;
      case "clear-selection":
        setSelectedRows(new Set());
        break;
    }
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const changePageSize = (newPageSize: number) => {
    localStorage.setItem("rna_page_size", newPageSize.toString());
    setPreferredPageSize(newPageSize);
    handleSearch(1, newPageSize, false);
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

  const getDateRangeString = () => {
    try {
      const start = new Date(dateStart).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const end = new Date(dateEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${start} - ${end}`;
    } catch (e) {
      return "Invalid Date Range";
    }
  };

  const handleSaveTransactions = async () => {
    if (saveTabMode === "new" && !saveForm.saveName.trim()) {
      toast({
        title: "Error",
        description: "Save name is required",
        variant: "destructive",
      });
      return;
    }

    if (saveTabMode === "existing" && !selectedExistingProfile) {
      toast({
        title: "Error",
        description: "Please select an existing profile",
        variant: "destructive",
      });
      return;
    }

    if (selectedRows.size === 0) {
      toast({
        title: "Error",
        description: "No transactions selected",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const currentTransactions =
        filteredTransactions.length > 0 || globalSearchTerm.trim()
          ? filteredTransactions
          : transactions;

      const selectedTransactionIds = Array.from(selectedRows)
        .map((globalIndex) => {
          const currentPageStart =
            (paginationState.currentPage - 1) * paginationState.pageSize;
          const currentPageEnd = currentPageStart + paginationState.pageSize;

          // Only process transactions that are on the current page
          if (globalIndex >= currentPageStart && globalIndex < currentPageEnd) {
            const localIndex = globalIndex - currentPageStart;
            if (localIndex >= 0 && localIndex < currentTransactions.length) {
              const transaction = currentTransactions[localIndex];
              if (transaction) {
                // Try different possible property names for transaction ID
                const trxId =
                  transaction["Trx ID"] ||
                  (transaction as any).trx_id ||
                  (transaction as any).id;
                const uuid = transaction["UUID"] || (transaction as any).uuid;

                if (trxId && uuid) {
                  return {
                    trx_id: trxId,
                    uuid: uuid,
                  };
                }
              }
            }
          }
          return null;
        })
        .filter(Boolean); // Remove null entries

      if (selectedTransactionIds.length === 0) {
        toast({
          title: "Error",
          description:
            "No valid transactions found on current page. Please navigate to the page containing your selected transactions.",
          variant: "destructive",
        });
        return;
      }

      // Check if user has selections from other pages
      const currentPageStart =
        (paginationState.currentPage - 1) * paginationState.pageSize;
      const currentPageEnd = currentPageStart + paginationState.pageSize;
      const totalSelectionsOnCurrentPage = Array.from(selectedRows).filter(
        (globalIndex) => {
          return (
            globalIndex >= currentPageStart && globalIndex < currentPageEnd
          );
        }
      ).length;

      if (totalSelectionsOnCurrentPage < selectedRows.size) {
        toast({
          title: "Warning",
          description: `Only saving ${totalSelectionsOnCurrentPage} transactions from current page. ${
            selectedRows.size - totalSelectionsOnCurrentPage
          } selections from other pages were skipped.`,
          variant: "destructive",
        });
      }

      let request: any;

      if (saveTabMode === "existing") {
        request = {
          connection: "LOKAL",
          saved_id: Number.parseInt(selectedExistingProfile.saved_id),
          saveGraylog: saveForm.saveGraylog,
          transactions: selectedTransactionIds,
        };
      } else {
        // For new profile: use original format
        request = {
          connection: selectedConnection,
          saveName: saveForm.saveName,
          description: saveForm.description || undefined,
          saveGraylog: saveForm.saveGraylog,
          transactions: selectedTransactionIds,
        };
      }

      const response = await api.saveTransactions(request);

      if (response && response.success) {
        toast({
          title: "Success",
          description:
            saveTabMode === "existing"
              ? `Successfully added ${selectedTransactionIds.length} transactions to ${selectedExistingProfile.save_name}`
              : `Successfully saved ${response.data.transactions_count} transactions`,
        });
        setShowSaveModal(false);
        setSaveForm({ saveName: "", description: "", saveGraylog: false });
        setSelectedExistingProfile(null); // Clear selected existing profile
        setSelectedRows(new Set());
      } else {
        throw new Error(response?.message || "Failed to save transactions");
      }
    } catch (error) {
      console.error("Save transactions error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save transactions",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const loadExistingProfiles = async () => {
      setLoadingExistingProfiles(true);
      try {
        const response = await rnaApi.getSavedTransactions();
        if (
          response.success &&
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data)
        ) {
          setExistingProfiles(response.data.data);
        } else {
          setExistingProfiles([]);
        }
      } catch (error) {
        console.error("Failed to load existing profiles:", error);
        setExistingProfiles([]);
      } finally {
        setLoadingExistingProfiles(false);
      }
    };

    if (saveTabMode === "existing") {
      loadExistingProfiles();
    }
  }, [saveTabMode, rnaApi]);

  const handleRowClick = (transaction: Transaction, globalIndex: number) => {
    if (transaction && selectedConnection) {
      setSelectedTransaction(transaction);
      setSelectedTransactionIndex(globalIndex);

      const uuid = transaction["UUID"] || transaction["uuid"];

      api.getTransactionAttributes(
        selectedConnection,
        transaction["UUID"],
        (data) => {
          const attrs = Array.isArray(data)
            ? data.map((attr, index) => ({ ...attr, id: index }))
            : [];

          setTransactionDetails((prev) => ({ ...prev, attributes: attrs }));
        }
      );
      api.getTransactionEndpoints(
        selectedConnection,
        transaction["UUID"],
        (data) => {
          setTransactionDetails((prev) => ({ ...prev, endpoints: data }));
        }
      );

      if (uuid) {
        api.getGrayLogData(
          selectedConnection,
          uuid,
          (response) => {
            const graylogMessages =
              response?.data?.messages || response?.messages || [];
            setTransactionDetails((prev) => ({
              ...prev,
              graylog: graylogMessages,
              graylogError: null,
            }));
          },
          (errorMessage) => {
            setTransactionDetails((prev) => ({
              ...prev,
              graylog: [],
              graylogError: errorMessage,
            }));
          }
        );
      }
    }
  };

  const handleExportTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setExportForm((prev) => ({ ...prev, title: e.target.value }));
    },
    []
  );

  const handleExportDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setExportForm((prev) => ({ ...prev, description: e.target.value }));
    },
    []
  );

  const handleSaveNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSaveForm((prev) => ({ ...prev, saveName: e.target.value }));
    },
    []
  );

  const handleSaveDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSaveForm((prev) => ({ ...prev, description: e.target.value }));
    },
    []
  );

  const handleViewModeChange = (value: "table" | "insights" | "saved") => {
    if (!value) return;

    setViewMode(value);

    // Load data for the new view mode if not cached
    if (
      value === "table" &&
      cachedTableData.length === 0 &&
      selectedConnection &&
      dateStart &&
      dateEnd
    ) {
      handleSearch(1, preferredPageSize, false);
    } else if (
      value === "insights" &&
      cachedInsightsData.length === 0 &&
      selectedConnection &&
      dateStart &&
      dateEnd
    ) {
      handleSearch(1, MAX_INSIGHTS_PAGE_SIZE, true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <div className="flex-shrink-0">
          <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Jalin App</span>
              <span>/</span>
              <span className="text-gray-800 font-medium">Transactions</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                    Transactions
                  </h1>
                  <p className="text-gray-600">
                    Filter transactions, lalu kelola data dari hasil pencarian
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <TransactionFilters
                connectionProfiles={connectionProfiles}
                selectedConnection={selectedConnection}
                onConnectionChange={setSelectedConnection}
                dateStart={dateStart}
                dateEnd={dateEnd}
                onDateStartChange={setDateStart}
                onDateEndChange={setDateEnd}
                dynamicFilters={dynamicFilters}
                onAddFilter={addFilter}
                onRemoveFilter={removeFilter}
                onUpdateFilter={updateFilter}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onSearch={() =>
                  handleSearch(
                    1,
                    paginationState.pageSize,
                    viewMode === "insights"
                  )
                }
                onClearFilters={clearFilters}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
                showColumnManager={false}
                onToggleColumnManager={() => {}}
                isLoading={api.loading}
                error={api.error}
                onRetry={retryConnection}
                onClearError={api.clearError}
                searchResults={searchResults}
                pageSize={paginationState.pageSize}
                onPageSizeChange={changePageSize}
                onGlobalSearch={handleGlobalSearch}
                columnFilters={columnFilters}
                onColumnFilter={(key, value) =>
                  setColumnFilters((prev) => ({ ...prev, [key]: value }))
                }
                onClearColumnFilters={clearAllColumnFilters}
                filterFields={filterFields}
                filterOperators={filterOperators}
                queryInfo={queryInfo}
                showQuerySection={showQuerySection}
                onToggleQuerySection={() =>
                  setShowQuerySection(!showQuerySection)
                }
                resultCodeFilter={resultCodeFilter}
                onResultCodeFilterChange={setResultCodeFilter}
                transactionStatusFilter={transactionStatusFilter}
                onTransactionStatusFilterChange={setTransactionStatusFilter}
              />

              <div className="flex justify-end">
                <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("table")}
                    className={`px-4 py-1.5 text-sm rounded-full transition min-w-[110px] ${
                      viewMode === "table"
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={viewMode === "table"}
                  >
                    <Table className="h-4 w-4 mr-2 inline" />
                    Table View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("insights")}
                    className={`px-4 py-1.5 text-sm rounded-full transition min-w-[110px] ${
                      viewMode === "insights"
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={viewMode === "insights"}
                  >
                    <BarChart className="h-4 w-4 mr-2 inline" />
                    Insights
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("saved")}
                    className={`px-4 py-1.5 text-sm rounded-full transition min-w-[110px] ${
                      viewMode === "saved"
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={viewMode === "saved"}
                  >
                    <FileText className="h-4 w-4 mr-2 inline" />
                    Saved
                  </button>
                </div>
              </div>

              {viewMode === "saved" ? (
                <SavedTransactions
                  isActive={viewMode === "saved"}
                  onTransactionClick={(transaction, additionalData) => {
                    setSelectedTransaction(transaction);
                    if (additionalData) {
                      setSavedTransactionDetails({
                        attributes: additionalData.attributes || [],
                        endpoints: additionalData.endpoints || [],
                        graylog: additionalData.graylog_data || [],
                      });
                    } else {
                      setSavedTransactionDetails(null);
                    }
                    setShowDetailsModal(true);
                  }}
                />
              ) : viewMode === "insights" ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <BarChart className="h-4 w-4 text-gray-500" />
                    Insights transactions
                  </div>
                  <div className="p-4">
                    <TransactionInsights
                      transactions={insightsTransactions}
                      totalTransactions={insightsTransactions.length}
                      dateRange={getDateRangeString()}
                      isLoading={api.loading}
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-700">
                      <Database className="h-4 w-4 text-gray-500" />
                      Hasil transactions
                      <Badge variant="secondary" className="font-normal">
                        {paginationState.totalRows} total
                      </Badge>
                      {selectedRows.size > 0 && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 font-normal"
                        >
                          {selectedRows.size} selected
                        </Badge>
                      )}
                      {searchResults?.executionTime !== undefined && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 font-normal"
                        >
                          {searchResults.executionTime}ms
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Button
                        onClick={() => setShowSaveModal(true)}
                        variant="outline"
                        size="sm"
                        disabled={selectedRows.size === 0}
                        className="h-8"
                      >
                        <Database className="h-3.5 w-3.5 mr-1" />
                        Save ({selectedRows.size})
                      </Button>
                      <Button
                        onClick={() => setShowExportModal(true)}
                        size="sm"
                        className="h-8"
                      >
                        Export
                      </Button>
                      <span>Per halaman</span>
                      <Select
                        value={String(paginationState.pageSize)}
                        onValueChange={(v) => changePageSize(Number(v))}
                      >
                        <SelectTrigger className="h-8 w-[84px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 50, 100].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {!selectedConnection && !api.error ? (
                    <div className="p-10 text-center text-gray-500 text-sm">
                      Pilih profile, atur filter bila perlu, lalu klik &quot;Cari
                      Transactions&quot;.
                    </div>
                  ) : searchResults ? (
                    <TransactionTable
                      transactions={transactions}
                      selectedRows={selectedRows}
                      onRowSelect={handleRowSelect}
                      onRowSelectAll={handleRowSelectAll}
                      onRowDoubleClick={showTransactionDetails}
                      onContextMenu={handleRightClick}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      columnFilters={columnFilters}
                      onColumnFilter={(key, value) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          [key]: value,
                        }))
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
                        handleSearch(page, paginationState.pageSize, false)
                      }
                      onPageSizeChange={changePageSize}
                      isPaginationLoading={isPaginationLoading}
                      onRowClick={handleRowClick}
                    />
                  ) : (
                    <div className="p-10 text-center text-gray-500 text-sm">
                      Pilih profile, atur filter bila perlu, lalu klik &quot;Cari
                      Transactions&quot;.
                    </div>
                  )}
                </div>
              )}
            </div>

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
                  <FileText className="h-4 w-4" />
                  <span>Copy Row Data</span>
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                  onClick={() => handleContextMenuAction("show-details")}
                >
                  <Activity className="h-4 w-4" />
                  <span>Show Details</span>
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                  onClick={() => handleContextMenuAction("see-log")}
                >
                  <FileText className="h-4 w-4" />
                  <span>Extract Logs</span>
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                  onClick={() => handleContextMenuAction("save-transactions")}
                >
                  <Save className="h-4 w-4" />
                  <span>Save Transaction Data</span>
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
      </div>

      <TransactionDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        transaction={selectedTransaction}
        transactionDetails={
          viewMode === "saved"
            ? savedTransactionDetails || {
                attributes: [],
                endpoints: [],
                graylog: [],
              }
            : transactionDetails
        }
        isLoading={api.loading}
      />

      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-2xl rounded-3xl border-0 shadow-2xl bg-white">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Export Configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label
                htmlFor="export-title"
                className="text-sm font-medium text-gray-700"
              >
                Title
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="export-title"
                  value={exportForm.title}
                  onChange={handleExportTitleChange}
                  placeholder="Enter issue ID(s) or title"
                  className="h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  onClick={handleRedmineSearch}
                  disabled={redmineSearchLoading || !exportForm.title.trim()}
                  className="h-11 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {redmineSearchLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {showRedmineResults && redmineResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-xl bg-white shadow-lg max-h-60 overflow-y-auto">
                  {redmineResults.map((result, index) => (
                    <div
                      key={index}
                      onClick={() => selectRedmineResult(result)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">
                        {result.title}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {result.issue_number}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {result.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label
                htmlFor="export-scenario"
                className="text-sm font-medium text-gray-700"
              >
                Scenario Testing
              </Label>
              <Textarea
                id="export-scenario"
                value={exportForm.scenarioTesting}
                onChange={(e) =>
                  setExportForm((prev) => ({
                    ...prev,
                    scenarioTesting: e.target.value,
                  }))
                }
                placeholder="Describe the testing scenario (optional)"
                rows={3}
                className="mt-2 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="export-expected"
                  className="text-sm font-medium text-gray-700"
                >
                  Expected Result
                </Label>
                <Textarea
                  id="export-expected"
                  value={exportForm.expectedResult}
                  onChange={(e) =>
                    setExportForm((prev) => ({
                      ...prev,
                      expectedResult: e.target.value,
                    }))
                  }
                  placeholder="Expected outcome (optional)"
                  rows={3}
                  className="mt-2 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="export-actual"
                  className="text-sm font-medium text-gray-700"
                >
                  Actual Result
                </Label>
                <Textarea
                  id="export-actual"
                  value={exportForm.actualResult}
                  onChange={(e) =>
                    setExportForm((prev) => ({
                      ...prev,
                      actualResult: e.target.value,
                    }))
                  }
                  placeholder="Actual outcome (optional)"
                  rows={3}
                  className="mt-2 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <Label
                  htmlFor="include-graylog"
                  className="text-sm font-medium text-gray-700"
                >
                  Include GrayLog Data in Exports
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Include detailed GrayLog information in the exported HTML
                </p>
              </div>
              <Switch
                id="include-graylog"
                checked={exportForm.includeGrayLog}
                onCheckedChange={(checked) =>
                  setExportForm((prev) => ({
                    ...prev,
                    includeGrayLog: checked,
                  }))
                }
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowExportModal(false)}
                className="rounded-xl px-6 py-2 border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={exportToHtml}
                className="rounded-xl px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Export HTML
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Save Transactions
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 rounded-2xl p-3 border border-blue-200">
              <p className="text-sm text-blue-700">
                Saving {selectedRows.size} selected transactions to database.
              </p>
            </div>

            <div className="flex space-x-1 bg-gray-100 rounded-full p-1 w-fit mx-auto">
              <button
                className={`py-1.5 px-3 rounded-full text-xs font-medium transition-colors ${
                  saveTabMode === "new"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setSaveTabMode("new")}
              >
                New
              </button>
              <button
                className={`py-1.5 px-3 rounded-full text-xs font-medium transition-colors ${
                  saveTabMode === "existing"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setSaveTabMode("existing")}
              >
                Existing
              </button>
            </div>

            {/* Tab Content */}
            {saveTabMode === "new" ? (
              // Create New Tab Content
              <div className="space-y-3">
                <div>
                  <Label
                    htmlFor="save-name"
                    className="text-sm font-medium text-gray-700 mb-1 block"
                  >
                    Save Name *
                  </Label>
                  <Input
                    id="save-name"
                    placeholder="Enter name..."
                    className="h-9 rounded-full border border-gray-200"
                    value={saveForm.saveName}
                    onChange={handleSaveNameChange}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="save-description"
                    className="text-sm font-medium text-gray-700 mb-1 block"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="save-description"
                    placeholder="Optional description..."
                    rows={2}
                    className="rounded-2xl border border-gray-200"
                    value={saveForm.description}
                    onChange={handleSaveDescriptionChange}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="save-graylog"
                    className="text-sm font-medium text-gray-700"
                  >
                    Include GrayLog Data
                  </Label>
                  <Switch
                    id="save-graylog"
                    checked={saveForm.saveGraylog}
                    onCheckedChange={(checked) =>
                      setSaveForm((prev) => ({ ...prev, saveGraylog: checked }))
                    }
                  />
                </div>
              </div>
            ) : (
              // Save to Existing Tab Content
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Select Existing Profile *
                  </Label>
                  {loadingExistingProfiles ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-600">
                        Loading profiles...
                      </span>
                    </div>
                  ) : existingProfiles.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-2xl p-3">
                      <div className="grid grid-cols-2 gap-3">
                        {existingProfiles.map((profile) => (
                          <div
                            key={profile.saved_id}
                            className={`p-3 rounded-xl cursor-pointer transition-colors ${
                              selectedExistingProfile?.saved_id ===
                              profile.saved_id
                                ? "bg-blue-50 border border-blue-200"
                                : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                            }`}
                            onClick={() => setSelectedExistingProfile(profile)}
                          >
                            <div className="font-medium text-sm text-gray-800 truncate">
                              {profile.save_name}
                            </div>
                            {profile.description && (
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {profile.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {profile.transaction_count} txns •{" "}
                              {new Date(
                                profile.created_at
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No existing profiles found
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="existing-graylog"
                    className="text-sm font-medium text-gray-700"
                  >
                    Include GrayLog Data
                  </Label>
                  <Switch
                    id="existing-graylog"
                    checked={saveForm.saveGraylog}
                    onCheckedChange={(checked) =>
                      setSaveForm((prev) => ({ ...prev, saveGraylog: checked }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveModal(false)}
                className="rounded-full text-sm"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-sm"
                onClick={handleSaveTransactions}
                disabled={
                  isSaving ||
                  (saveTabMode === "new" && !saveForm.saveName.trim()) ||
                  (saveTabMode === "existing" && !selectedExistingProfile)
                }
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3 mr-1" />
                    {saveTabMode === "new" ? "Create & Save" : "Add to Profile"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isExporting && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 max-w-sm">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 text-sm">
                  Exporting Transactions
                </h3>
                <p className="text-xs text-gray-600">
                  Preparing your HTML file...
                </p>
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full animate-pulse"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
