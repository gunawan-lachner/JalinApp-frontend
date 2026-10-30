"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Search,
  Plus,
  Play,
  Copy,
  Edit,
  Trash2,
  Database,
  Clock,
  Code,
  FileText,
  Activity,
  ChevronRight,
  Table,
  AlertCircle,
  ChevronLeft,
  Terminal,
  Save,
  Brain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch" // Import Switch component
import { useToast } from "@/hooks/use-toast" // Import useToast
import { useCrudPermissions } from "@/hooks/useCrudPermissions"

import { Sidebar } from "@/components/layout/sidebar"
import { rnaApi } from "@/lib/api"
import type { ConnectionProfile } from "@/lib/types"
import type { SavedQuery, RawQueryResponse, ExecuteQueryResponse } from "@/lib/api" // Import RawQueryResponse and ExecuteQueryResponse

interface QueryExecution {
  id: string // Client-side generated ID for history
  query_id?: number // Optional for ad-hoc queries
  query_name: string
  executed_sql: string
  execution_time: number // This will be client-side calculated for now
  row_count: number
  executed_at: string
  status: "success" | "error"
  error_message?: string
  columns: string[]
  data: any[]
  parameters_used?: string[] // Optional for ad-hoc queries
  profile_id: string
  error_details?: {
    // Add error_details for structured error handling
    error_type: string
    error_message: string
    possible_causes: string[]
  }
}

interface PaginationState {
  currentPage: number
  pageSize: number
  totalRows: number
  totalPages: number
}

export default function QueriesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState(pathname)
  // Apply CRUD permissions (auto-disables Create/Edit/Delete/etc when not allowed)
  useCrudPermissions()

  // Mode switch
  const [isSandboxMode, setIsSandboxMode] = useState(false)

  // Connection and API state
  const [connectionProfiles, setConnectionProfiles] = useState<ConnectionProfile[]>([])
  const [selectedConnection, setSelectedConnection] = useState("")

  // Query management state
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [queryExecutions, setQueryExecutions] = useState<QueryExecution[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null)
  const [selectedExecution, setSelectedExecution] = useState<QueryExecution | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [queryToDelete, setQueryToDelete] = useState<SavedQuery | null>(null)

  // Form state for creating/editing queries
  const [queryForm, setQueryForm] = useState({
    id: 0, // Added for edit functionality
    name: "",
    description: "",
    query: "",
    tags: "", // Tags are not part of the current API, keeping for UI consistency
  })

  // Parameter state for query execution
  const [queryParameters, setQueryParameters] = useState<Record<string, string>>({})

  // Ad-hoc query state
  const [adHocQuery, setAdHocQuery] = useState("")
  const [executingAdHocQuery, setExecutingAdHocQuery] = useState(false)
  const [adHocResults, setAdHocResults] = useState<QueryExecution | null>(null)

  // AI Query Generation state
  const [aiPrompt, setAiPrompt] = useState("")
  const [generatingAiSql, setGeneratingAiSql] = useState(false)

  // Execution state
  const [executingQuery, setExecutingQuery] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"queries" | "history">("queries")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Results table pagination state
  const [resultsPaginationState, setResultsPaginationState] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 10,
    totalRows: 0,
    totalPages: 0,
  })

  useEffect(() => {
    console.log("🚀 Queries page mounted, fetching data...")
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    setError(null)

    // Load connection profiles
    const connectionResponse = await rnaApi.getConnectionProfiles()
    if (connectionResponse.success && connectionResponse.data) {
      const dbConnections = connectionResponse.data.filter((profile) => profile.connection_type === "DB")
      setConnectionProfiles(dbConnections)
      // Removed automatic connection selection - user must select manually
    } else {
      setError(connectionResponse.error || "Failed to load connection profiles.")
    }

    // Load saved queries
    const queriesResponse = await rnaApi.getQueries()
    if (queriesResponse.success && queriesResponse.data) {
      setSavedQueries(queriesResponse.data)
      if (queriesResponse.data.length > 0 && !selectedQuery) {
        setSelectedQuery(queriesResponse.data[0])
        initializeQueryParameters(queriesResponse.data[0])
      }
    } else {
      setError(queriesResponse.error || "Failed to load queries.")
    }
    setLoading(false)
  }

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href)
      setActiveSection(href)
    },
    [router],
  )

  const initializeQueryParameters = (query: SavedQuery) => {
    const params: Record<string, string> = {}
    query.parameters?.forEach((param) => {
      params[param.name] = param.default || ""
    })
    setQueryParameters(params)
  }

  const executeQuery = async (query: SavedQuery) => {
    if (!selectedConnection) {
      setError("Please select a connection profile first.")
      return
    }

    // Validate required parameters
    const missingParams = query.parameters?.filter((param) => !queryParameters[param.name] && !param.default) || []

    if (missingParams.length > 0) {
      setError(`Missing required parameters: ${missingParams.map((p) => p.name).join(", ")}`)
      return
    }

    setExecutingQuery(query.id)
    setError(null)
    console.log(`🔄 Executing query: ${query.name}`)

    const startTime = performance.now()

    try {
      const executePayload = {
        parameters: queryParameters,
        profileId: selectedConnection,
      }

      const response = await rnaApi.executeSavedQuery(query.id, executePayload)

      if (response.success && response.data) {
        const endTime = performance.now()
        const executionTime = Math.round(endTime - startTime) // Calculate client-side execution time

        const newExecution: QueryExecution = {
          id: `exec-${Date.now()}`,
          query_id: response.data.query_id,
          query_name: query.name,
          executed_sql: response.data.executed_sql,
          execution_time: executionTime,
          row_count: response.data.row_count,
          executed_at: new Date().toISOString(),
          status: "success",
          columns: response.data.columns,
          data: response.data.data,
          parameters_used: response.data.parameters_used,
          profile_id: response.data.profile_id,
        }

        setQueryExecutions((prev) => [newExecution, ...prev])
        setSelectedExecution(newExecution)

        // Reset and update results pagination for the new execution
        setResultsPaginationState((prev) => ({
          ...prev,
          currentPage: 1,
          totalRows: newExecution.row_count,
          totalPages: Math.ceil(newExecution.row_count / prev.pageSize),
        }))

        toast({
          title: "Query Executed",
          description: `Query "${query.name}" executed successfully in ${formatExecutionTime(executionTime)}.`,
          
        })
        console.log("✅ Query executed successfully")
      } else {
        // Handle server-side error for saved queries
        const errorMessage = response.error || response.data?.message || "Query execution failed"
        const errorDetails = (response.data as ExecuteQueryResponse)?.error_details // Cast to access error_details

        const errorExecution: QueryExecution = {
          id: `exec-error-${Date.now()}`,
          query_id: query.id,
          query_name: query.name,
          executed_sql: query.sql_script,
          execution_time: 0,
          row_count: 0,
          executed_at: new Date().toISOString(),
          status: "error",
          error_message: errorMessage,
          columns: [],
          data: [],
          parameters_used: Object.values(queryParameters),
          profile_id: selectedConnection,
          error_details: errorDetails,
        }

        setQueryExecutions((prev) => [errorExecution, ...prev])
        setSelectedExecution(errorExecution)
        setError(`Query execution failed: ${errorMessage}`)
        toast({
          title: "Query Execution Failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("❌ Query execution failed:", err)
      const errorExecution: QueryExecution = {
        id: `exec-error-${Date.now()}`,
        query_id: query.id,
        query_name: query.name,
        executed_sql: query.sql_script,
        execution_time: 0,
        row_count: 0,
        executed_at: new Date().toISOString(),
        status: "error",
        error_message: err instanceof Error ? err.message : "An unexpected error occurred",
        columns: [],
        data: [],
        parameters_used: Object.values(queryParameters),
        profile_id: selectedConnection,
      }

      setQueryExecutions((prev) => [errorExecution, ...prev])
      setSelectedExecution(errorExecution)
      setError(`Query execution failed: ${err instanceof Error ? err.message : "An unexpected error occurred"}`)
      toast({
        title: "Query Execution Failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setExecutingQuery(null)
    }
  }

  const executeRawQuery = async () => {
    if (!selectedConnection) {
      setError("Please select a connection profile first.")
      return
    }
    if (!adHocQuery.trim()) {
      setError("Please enter an SQL query to execute.")
      return
    }

    setExecutingAdHocQuery(true)
    setError(null)
    console.log(`🔄 Executing raw query: ${adHocQuery}`)

    const startTime = performance.now()

    try {
      const executePayload = {
        sql_script: adHocQuery,
        profileId: selectedConnection,
      }

      const response = await rnaApi.executeRawQuery(executePayload)

      if (response.success && response.data) {
        const endTime = performance.now()
        const executionTime = Math.round(endTime - startTime)

        const newExecution: QueryExecution = {
          id: `adhoc-exec-${Date.now()}`,
          query_name: "Raw Query", // Changed from "Ad-hoc Query" to "Raw Query"
          executed_sql: adHocQuery,
          execution_time: executionTime,
          row_count: response.data.row_count,
          executed_at: new Date().toISOString(),
          status: "success",
          columns: response.data.columns,
          data: response.data.data,
          profile_id: selectedConnection,
        }

        setAdHocResults(newExecution)
        setQueryExecutions((prev) => [newExecution, ...prev]) // Add to history

        setResultsPaginationState((prev) => ({
          ...prev,
          currentPage: 1,
          totalRows: newExecution.row_count,
          totalPages: Math.ceil(newExecution.row_count / prev.pageSize),
        }))
        toast({
          title: "Raw Query Executed",
          description: `Raw query executed successfully in ${formatExecutionTime(executionTime)}.`,
          
        })
        console.log("✅ Raw query executed successfully")
      } else {
        // Handle server-side error for raw queries
        const errorMessage = response.error || response.data?.message || "Raw query execution failed"
        const errorDetails = (response.data as RawQueryResponse)?.error_details // Cast to access error_details

        console.error("❌ Raw query execution failed:", errorMessage, errorDetails)

        const errorExecution: QueryExecution = {
          id: `adhoc-exec-error-${Date.now()}`,
          query_name: "Raw Query", // Changed from "Ad-hoc Query" to "Raw Query"
          executed_sql: adHocQuery,
          execution_time: 0,
          row_count: 0,
          executed_at: new Date().toISOString(),
          status: "error",
          error_message: errorMessage,
          columns: [],
          data: [],
          profile_id: selectedConnection,
          error_details: errorDetails, // Store error details
        }
        setAdHocResults(errorExecution)
        setQueryExecutions((prev) => [errorExecution, ...prev]) // Add to history
        setError(`Raw query execution failed: ${errorMessage}`)
        toast({
          title: "Raw Query Execution Failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("❌ Raw query execution failed:", err)
      const errorExecution: QueryExecution = {
        id: `adhoc-exec-error-${Date.now()}`,
        query_name: "Raw Query", // Changed from "Ad-hoc Query" to "Raw Query"
        executed_sql: adHocQuery,
        execution_time: 0,
        row_count: 0,
        executed_at: new Date().toISOString(),
        status: "error",
        error_message: err instanceof Error ? err.message : "An unexpected error occurred",
        columns: [],
        data: [],
        profile_id: selectedConnection,
      }
      setAdHocResults(errorExecution)
      setQueryExecutions((prev) => [errorExecution, ...prev]) // Add to history
      setError(`Raw query execution failed: ${err instanceof Error ? err.message : "An unexpected error occurred"}`)
      toast({
        title: "Raw Query Execution Failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setExecutingAdHocQuery(false)
    }
  }

  const generateSqlFromAi = async () => {
    if (!selectedConnection) {
      setError("Please select a connection profile first.")
      return
    }
    if (!aiPrompt.trim()) {
      setError("Please enter a prompt for AI to generate SQL.")
      return
    }

    setGeneratingAiSql(true)
    setError(null)
    console.log(`🧠 Generating SQL from AI prompt: ${aiPrompt}`)

    try {
      const response = await rnaApi.generateSqlFromAi({
        request: aiPrompt,
        profileId: selectedConnection,
      })

      if (response.success && response.data?.ai_response?.Query) {
        setAdHocQuery(response.data.ai_response.Query)
        toast({
          title: "SQL Generated",
          description: response.data.ai_response.Message || "SQL query successfully generated by AI.",
          
        })
        console.log("✅ SQL generated by AI successfully")
      } else {
        const errorMessage =
          response.error ||
          response.data?.error ||
          response.data?.error_details?.error_message ||
          response.data?.message ||
          "Failed to generate SQL from AI."
        setError(`AI SQL generation failed: ${errorMessage}`)
        toast({
          title: "AI SQL Generation Failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("❌ AI SQL generation failed:", err)
      setError(`AI SQL generation failed: ${err instanceof Error ? err.message : "An unexpected error occurred"}`)
      toast({
        title: "AI SQL Generation Failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setGeneratingAiSql(false)
    }
  }

  const handleCreateQuery = async () => {
    setError(null)
    try {
      const newQueryData = {
        name: queryForm.name,
        sql_script: queryForm.query,
        description: queryForm.description,
        parameters: [], // Assuming parameters are not created via this form for now
      }
      const response = await rnaApi.createQuery(newQueryData)
      if (response.success) {
        toast({
          title: "Query Created",
          description: `Query "${queryForm.name}" has been successfully created.`,
          
        })
        setIsCreateModalOpen(false)
        setQueryForm({ id: 0, name: "", description: "", query: "", tags: "" }) // Reset form
        loadInitialData() // Refresh the list of queries
      } else {
        setError(response.error || "Failed to create query.")
        toast({
          title: "Failed to Create Query",
          description: response.error || "An unknown error occurred.",
          variant: "destructive",
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
      toast({
        title: "Failed to Create Query",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleEditQuery = async () => {
    setError(null)
    if (!selectedQuery) {
      setError("No query selected for editing.")
      return
    }
    try {
      const updatedQueryData = {
        name: queryForm.name,
        sql_script: queryForm.query,
        description: queryForm.description,
        // Parameters are not updated via this form for now
      }
      const response = await rnaApi.updateQuery(selectedQuery.id, updatedQueryData)
      if (response.success) {
        toast({
          title: "Query Updated",
          description: `Query "${queryForm.name}" has been successfully updated.`,
          
        })
        setIsEditModalOpen(false)
        loadInitialData() // Refresh the list of queries
      } else {
        setError(response.error || "Failed to update query.")
        toast({
          title: "Failed to Update Query",
          description: response.error || "An unknown error occurred.",
          variant: "destructive",
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
      toast({
        title: "Failed to Update Query",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteQuery = async () => {
    setError(null)
    if (!queryToDelete) {
      setError("No query selected for deletion.")
      return
    }
    try {
      const response = await rnaApi.deleteQuery(queryToDelete.id)
      if (response.success) {
        toast({
          title: "Query Deleted",
          description: `Query "${queryToDelete.name}" has been successfully deleted.`,
          
        })
        setIsDeleteConfirmOpen(false)
        setQueryToDelete(null)
        setSelectedQuery(null) // Clear selected query if it was the one deleted
        setSelectedExecution(null) // Clear selected execution
        loadInitialData() // Refresh the list of queries
      } else {
        setError(response.error || "Failed to delete query.")
        toast({
          title: "Failed to Delete Query",
          description: response.error || "An unknown error occurred.",
          variant: "destructive",
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
      toast({
        title: "Failed to Delete Query",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const openCreateModal = (prefillQuery = "") => {
    setQueryForm({
      id: 0,
      name: "",
      description: "",
      query: prefillQuery,
      tags: "",
    })
    setIsCreateModalOpen(true)
  }

  const openEditModal = (query: SavedQuery) => {
    setQueryForm({
      id: query.id,
      name: query.name,
      description: query.description || "",
      query: query.sql_script,
      tags: "", // Tags are not part of the current API, keeping for UI consistency
    })
    setIsEditModalOpen(true)
  }

  const openDeleteConfirm = (query: SavedQuery) => {
    setQueryToDelete(query)
    setIsDeleteConfirmOpen(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "SQL query copied to clipboard.",
      
    })
    console.log("📋 Copied to clipboard")
  }

  const handleQuerySelect = (query: SavedQuery) => {
    setSelectedQuery(query)
    initializeQueryParameters(query)
    setSelectedExecution(null) // Clear execution when selecting a new query
    setAdHocResults(null) // Clear ad-hoc results
    // Reset results pagination when selecting a new query
    setResultsPaginationState((prev) => ({
      ...prev,
      currentPage: 1,
      totalRows: 0,
      totalPages: 0,
    }))
  }

  const handleExecutionSelect = (execution: QueryExecution) => {
    setSelectedExecution(execution)
    setSelectedQuery(savedQueries.find((q) => q.id === execution.query_id) || null)
    setAdHocResults(null) // Clear ad-hoc results
    // Update results pagination for the selected execution
    setResultsPaginationState((prev) => ({
      ...prev,
      currentPage: 1,
      totalRows: execution.row_count,
      totalPages: Math.ceil(execution.row_count / prev.pageSize),
    }))
  }

  const handleParameterChange = (paramName: string, value: string) => {
    setQueryParameters((prev) => ({
      ...prev,
      [paramName]: value,
    }))
  }

  // Pagination for results table
  const onResultsPageChange = (page: number) => {
    setResultsPaginationState((prev) => ({ ...prev, currentPage: page }))
  }

  const onResultsPageSizeChange = (pageSize: number) => {
    setResultsPaginationState((prev) => {
      const newTotalPages = Math.ceil(prev.totalRows / pageSize)
      const newCurrentPage = Math.min(prev.currentPage, newTotalPages || 1) // Ensure current page is valid
      return { ...prev, pageSize, totalPages: newTotalPages, currentPage: newCurrentPage }
    })
  }

  const getResultsPageNumbers = () => {
    const { currentPage, totalPages } = resultsPaginationState
    const maxVisiblePages = 5
    const pages: (number | string)[] = []

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      let startPage = Math.max(2, currentPage - 1)
      let endPage = Math.min(totalPages - 1, currentPage + 1)

      if (currentPage <= 3) {
        endPage = Math.min(4, totalPages - 1)
      } else if (currentPage >= totalPages - 2) {
        startPage = Math.max(totalPages - 3, 2)
      }

      if (startPage > 2) pages.push("...")
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
      if (endPage < totalPages - 1) pages.push("...")
      if (totalPages > 1) pages.push(totalPages)
    }
    return pages
  }

  const filteredQueries = savedQueries.filter(
    (query) =>
      query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.sql_script.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const renderResultsTable = (
    execution: QueryExecution,
    pagination: PaginationState,
    onPageChange: (page: number) => void,
    onPageSizeChange: (pageSize: number) => void,
  ) => {
    if (!execution.data || execution.data.length === 0) return null

    const startIndex = (pagination.currentPage - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    const paginatedData = execution.data.slice(startIndex, endIndex)

    return (
      <div className="space-y-4">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {execution.columns.map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {execution.columns.map((column) => (
                      <td key={column} className="px-4 py-3 text-sm text-gray-900">
                        {row[column] !== null && row[column] !== undefined ? String(row[column]) : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {Math.min((pagination.currentPage - 1) * pagination.pageSize + 1, pagination.totalRows)}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRows)}
              </span>{" "}
              of <span className="font-medium">{pagination.totalRows.toLocaleString()}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-sm text-gray-600">Per page:</Label>
              <Select value={pagination.pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
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

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="rounded-lg text-sm bg-transparent"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {getResultsPageNumbers().map((pageNum, index) => (
                <div key={index}>
                  {pageNum === "..." ? (
                    <span className="px-3 py-1 text-gray-500 text-sm">...</span>
                  ) : (
                    <Button
                      variant={pageNum === pagination.currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => typeof pageNum === "number" && onPageChange(pageNum)}
                      className={`w-10 h-8 rounded-lg text-sm ${
                        pageNum === pagination.currentPage
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-transparent hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="rounded-lg text-sm bg-transparent"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderParameterInputs = (query: SavedQuery) => {
    if (!query.parameters || query.parameters.length === 0) return null

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Query Parameters</h4>
        {query.parameters.map((param) => (
          <div key={param.name}>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              {param.name} ({param.type}){!param.default && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              value={queryParameters[param.name] || ""}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              placeholder={param.description || `Enter ${param.name}`}
              className="rounded-2xl"
            />
            {param.description && <p className="text-xs text-gray-500 mt-1">{param.description}</p>}
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />
          <div className="flex-1 max-w-full overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Jalin App</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Queries</span>
              </div>
            </div>
            <div className="p-6 max-w-full">
              <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-blue-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-blue-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-96">
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded-2xl"></div>
                        <div className="h-8 bg-gray-200 rounded-2xl"></div>
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded-2xl"></div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex-1">
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-32 bg-gray-200 rounded-2xl"></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
              <span className="text-gray-800 font-medium">Queries</span>
            </div>
          </div>

          <div className="p-6 max-w-full">
            {/* Hero Section */}
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">Query Management</h1>
              <p className="text-gray-600">Execute and manage SQL queries across your database connections.</p>
            </div>

            {/* Error Alert for page-level errors */}
            {error &&
              !adHocResults?.error_details && ( // Only show if not a specific adHocResults error
                <Alert className="mb-6 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

            {/* Connection Selection and Mode Switch */}
            <Card className="shadow-sm border-0 bg-white rounded-3xl mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Connection:</span>
                    </div>
                    <Select value={selectedConnection} onValueChange={setSelectedConnection}>
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
                    <Label htmlFor="sandbox-mode" className="text-sm font-medium text-gray-700">
                      Sandbox Mode
                    </Label>
                    <Switch
                      id="sandbox-mode"
                      checked={isSandboxMode}
                      onCheckedChange={setIsSandboxMode}
                      className="data-[state=checked]:bg-green-600"
                    />
                    {/* "New Query" button is only active outside sandbox mode */}
                    {!isSandboxMode && (
                      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                            onClick={() => openCreateModal()} // Open empty create modal
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            New Query
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Layout */}
            <div className="flex gap-6">
              {/* Query List Sidebar (Left Panel in Saved Mode, Query Editor in Sandbox Mode) */}
              {!isSandboxMode ? (
                <Card className="w-96 shadow-sm border-0 bg-white rounded-3xl flex-shrink-0">
                  <CardContent className="p-6">
                    {/* Tab Navigation */}
                    <div className="flex space-x-1 mb-4">
                      <Button
                        variant={activeTab === "queries" ? "default" : "ghost"}
                        onClick={() => setActiveTab("queries")}
                        className={`rounded-2xl ${activeTab === "queries" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                        size="sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Queries ({savedQueries.length})
                      </Button>
                      <Button
                        variant={activeTab === "history" ? "default" : "ghost"}
                        onClick={() => setActiveTab("history")}
                        className={`rounded-2xl ${activeTab === "history" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                        size="sm"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        History ({queryExecutions.length})
                      </Button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search queries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 rounded-2xl"
                      />
                    </div>

                    {/* Query List */}
                    <ScrollArea>
                      <div className="space-y-2">
                        {activeTab === "queries" ? (
                          filteredQueries.length === 0 ? (
                            <div className="text-center py-8">
                              <Code className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No queries found</p>
                            </div>
                          ) : (
                            filteredQueries.map((query) => (
                              <div
                                key={query.id}
                                onClick={() => handleQuerySelect(query)}
                                className={`p-3 rounded-2xl cursor-pointer transition-colors ${
                                  selectedQuery?.id === query.id
                                    ? "bg-blue-50 border-2 border-blue-200"
                                    : "hover:bg-gray-50 border-2 border-transparent"
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-800 truncate">{query.name}</h4>
                                    {query.description && (
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{query.description}</p>
                                    )}
                                    <div className="flex items-center mt-2 text-xs text-gray-400">
                                      <span>Created: {formatDate(query.created_at)}</span>
                                      {query.parameters && query.parameters.length > 0 && (
                                        <>
                                          <span className="mx-1">•</span>
                                          <span>{query.parameters.length} params</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                </div>
                              </div>
                            ))
                          )
                        ) : queryExecutions.length === 0 ? (
                          <div className="text-center py-8">
                            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No execution history</p>
                          </div>
                        ) : (
                          queryExecutions.map((execution) => (
                            <div
                              key={execution.id}
                              onClick={() => handleExecutionSelect(execution)}
                              className={`p-3 rounded-2xl cursor-pointer transition-colors ${
                                selectedExecution?.id === execution.id
                                  ? "bg-blue-50 border-2 border-blue-200"
                                  : "hover:bg-gray-50 border-2 border-transparent"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-800 truncate">{execution.query_name}</h4>
                                  <div className="flex items-center mt-1 space-x-2">
                                    <Badge
                                      variant={execution.status === "success" ? "default" : "destructive"}
                                      className={`text-xs ${execution.status === "success" ? "bg-green-100 text-green-700" : ""}`}
                                    >
                                      {execution.status}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {formatExecutionTime(execution.execution_time)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">{formatDate(execution.executed_at)}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <div className="w-96 flex flex-col gap-6 flex-shrink-0">
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                          <Terminal className="h-6 w-6 text-blue-600" />
                          <span>SQL Editor</span>
                        </h2>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => openCreateModal(adHocQuery)} // Open create modal with current adHocQuery
                            disabled={!adHocQuery.trim()}
                            className="bg-blue-600 hover:bg-blue-700 rounded-full w-10 h-10 p-0 flex-shrink-0"
                            size="icon"
                            title="Save Query"
                          >
                            <Save className="h-5 w-5" />
                            <span className="sr-only">Save Query</span>
                          </Button>
                          <Button
                            onClick={executeRawQuery}
                            disabled={executingAdHocQuery || !selectedConnection || !adHocQuery.trim()}
                            className="bg-green-600 hover:bg-green-700 rounded-full w-10 h-10 p-0 flex-shrink-0"
                            size="icon"
                            title="Execute Raw Query"
                          >
                            {executingAdHocQuery ? (
                              <Activity className="h-5 w-5 animate-spin" />
                            ) : (
                              <Play className="h-5 w-5" />
                            )}
                            <span className="sr-only">
                              {executingAdHocQuery ? "Executing..." : "Execute Raw Query"}
                            </span>
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        <Textarea
                          value={adHocQuery}
                          onChange={(e) => setAdHocQuery(e.target.value)}
                          placeholder="Write your SQL query here (e.g., SELECT * FROM users LIMIT 10;)"
                          rows={10}
                          className="font-mono text-sm rounded-2xl h-full"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Prompt Card */}
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                          <Brain className="h-6 w-6 text-purple-600" />
                          <span>AI SQL Generator</span>
                        </h2>
                        <Button
                          onClick={generateSqlFromAi}
                          disabled={generatingAiSql || !selectedConnection || !aiPrompt.trim()}
                          className="bg-purple-600 hover:bg-purple-700 rounded-full w-10 h-10 p-0 flex-shrink-0"
                          size="icon"
                          title="Generate SQL"
                        >
                          {generatingAiSql ? (
                            <Activity className="h-5 w-5 animate-spin" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                          <span className="sr-only">{generatingAiSql ? "Generating..." : "Generate SQL"}</span>
                        </Button>
                      </div>
                      <div>
                        <Textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="e.g., Show me all active participants with their container plugin names."
                          rows={4}
                          className="font-sans text-sm rounded-2xl"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Main Content Area (Right Panel in Sandbox Mode) */}
              <div className="flex-1 min-w-0">
                {isSandboxMode ? (
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6">
                      {adHocResults ? (
                        <div>
                          <div className="flex items-center space-x-2 mb-3">
                            <Table className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-medium text-gray-800">Results</h3>
                            <Badge
                              className={
                                adHocResults.status === "success"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }
                            >
                              {adHocResults.status === "success" ? `${adHocResults.row_count} rows` : "Error"}
                            </Badge>
                            <Badge variant="outline">{formatExecutionTime(adHocResults.execution_time)}</Badge>
                          </div>
                          {adHocResults.error_details ? (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                              <h4 className="text-sm font-semibold text-red-800 mb-2">Query Execution Error</h4>
                              <p className="text-sm text-red-700 font-mono mb-2">
                                <span className="font-bold">{adHocResults.error_details.error_type}:</span>{" "}
                                {adHocResults.error_details.error_message}
                              </p>
                              {adHocResults.error_details.possible_causes &&
                                adHocResults.error_details.possible_causes.length > 0 && (
                                  <div>
                                    <p className="text-xs text-red-600 font-medium mb-1">Possible Causes:</p>
                                    <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                                      {adHocResults.error_details.possible_causes.map((cause, idx) => (
                                        <li key={idx}>{cause}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              {adHocResults.executed_sql && (
                                <div className="mt-4">
                                  <p className="text-xs text-red-600 font-medium mb-1">Executed SQL:</p>
                                  <pre className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded overflow-x-auto">
                                    {adHocResults.executed_sql}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ) : adHocResults.error_message ? (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                              <p className="text-sm text-red-700 font-mono">{adHocResults.error_message}</p>
                            </div>
                          ) : null}
                          {adHocResults.status === "success" &&
                            renderResultsTable(
                              adHocResults,
                              resultsPaginationState,
                              onResultsPageChange,
                              onResultsPageSizeChange,
                            )}
                        </div>
                      ) : (
                        <div className="p-12 text-center">
                          <Table className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-medium text-gray-800 mb-2">No Results Yet</h3>
                          <p className="text-gray-600">
                            Enter an SQL query on the left and click 'Execute Raw Query' to see results.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : activeTab === "queries" && selectedQuery ? (
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h2 className="text-xl font-semibold text-gray-800">{selectedQuery.name}</h2>
                            {selectedQuery.parameters && selectedQuery.parameters.length > 0 && (
                              <Badge variant="secondary" className="text-xs rounded-full">
                                {selectedQuery.parameters.length} parameters
                              </Badge>
                            )}
                          </div>
                          {selectedQuery.description && (
                            <p className="text-gray-600 mb-4">{selectedQuery.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Created: {formatDate(selectedQuery.created_at)}</span>
                            <span>•</span>
                            <span>Updated: {formatDate(selectedQuery.updated_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => executeQuery(selectedQuery)}
                            disabled={executingQuery === selectedQuery.id || !selectedConnection}
                            className="bg-green-600 hover:bg-green-700 rounded-2xl"
                          >
                            {executingQuery === selectedQuery.id ? (
                              <Activity className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            {executingQuery === selectedQuery.id ? "Running..." : "Execute"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => copyToClipboard(selectedQuery.sql_script)}
                            className="rounded-2xl"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openEditModal(selectedQuery)}
                            className="rounded-2xl"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openDeleteConfirm(selectedQuery)}
                            className="text-red-600 border-red-200 hover:bg-red-50 rounded-2xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Parameters Section */}
                        {selectedQuery.parameters && selectedQuery.parameters.length > 0 && (
                          <div>{renderParameterInputs(selectedQuery)}</div>
                        )}

                        <div>
                          <h3 className="text-lg font-medium text-gray-800 mb-3">SQL Query</h3>
                          <div className="bg-gray-50 rounded-2xl p-4">
                            <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap overflow-x-auto">
                              {selectedQuery.sql_script}
                            </pre>
                          </div>
                        </div>

                        {selectedExecution && selectedExecution.query_id === selectedQuery.id && (
                          <div>
                            <div className="flex items-center space-x-2 mb-3">
                              <Table className="h-5 w-5 text-blue-600" />
                              <h3 className="text-lg font-medium text-gray-800">Latest Results</h3>
                              <Badge className="bg-green-100 text-green-700">{selectedExecution.row_count} rows</Badge>
                              <Badge variant="outline">{formatExecutionTime(selectedExecution.execution_time)}</Badge>
                            </div>
                            {selectedExecution.error_details ? (
                              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                                <h4 className="text-sm font-semibold text-red-800 mb-2">Query Execution Error</h4>
                                <p className="text-sm text-red-700 font-mono mb-2">
                                  <span className="font-bold">{selectedExecution.error_details.error_type}:</span>{" "}
                                  {selectedExecution.error_details.error_message}
                                </p>
                                {selectedExecution.error_details.possible_causes &&
                                  selectedExecution.error_details.possible_causes.length > 0 && (
                                    <div>
                                      <p className="text-xs text-red-600 font-medium mb-1">Possible Causes:</p>
                                      <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                                        {selectedExecution.error_details.possible_causes.map((cause, idx) => (
                                          <li key={idx}>{cause}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                {selectedExecution.executed_sql && (
                                  <div className="mt-4">
                                    <p className="text-xs text-red-600 font-medium mb-1">Executed SQL:</p>
                                    <pre className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded overflow-x-auto">
                                      {selectedExecution.executed_sql}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ) : selectedExecution.error_message ? (
                              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                                <p className="text-sm text-red-700 font-mono">{selectedExecution.error_message}</p>
                              </div>
                            ) : null}
                            {selectedExecution.status === "success" &&
                              renderResultsTable(
                                selectedExecution,
                                resultsPaginationState,
                                onResultsPageChange,
                                onResultsPageSizeChange,
                              )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : activeTab === "history" && selectedExecution ? (
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h2 className="text-xl font-semibold text-gray-800">{selectedExecution.query_name}</h2>
                            <Badge
                              variant={selectedExecution.status === "success" ? "default" : "destructive"}
                              className={`text-xs ${selectedExecution.status === "success" ? "bg-green-100 text-green-700" : ""}`}
                            >
                              {selectedExecution.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Executed: {formatDate(selectedExecution.executed_at)}</span>
                            <span>•</span>
                            <span>Duration: {formatExecutionTime(selectedExecution.execution_time)}</span>
                            <span>•</span>
                            <span>Results: {selectedExecution.row_count.toLocaleString()} rows</span>
                            <span>•</span>
                            <span>Profile: {selectedExecution.profile_id}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(selectedExecution.executed_sql)}
                          className="rounded-2xl"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium text-gray-800 mb-3">Executed Query</h3>
                          <div className="bg-gray-50 rounded-2xl p-4">
                            <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap overflow-x-auto">
                              {selectedExecution.executed_sql}
                            </pre>
                          </div>
                        </div>

                        {selectedExecution.parameters_used && selectedExecution.parameters_used.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium text-gray-800 mb-3">Parameters Used</h3>
                            <div className="bg-blue-50 rounded-2xl p-4">
                              <div className="flex flex-wrap gap-2">
                                {selectedExecution.parameters_used.map((param, index) => (
                                  <Badge key={index} variant="outline" className="bg-white">
                                    {param}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedExecution.status === "success" ? (
                          <div>
                            <div className="flex items-center space-x-2 mb-3">
                              <Table className="h-5 w-5 text-blue-600" />
                              <h3 className="text-lg font-medium text-gray-800">Query Results</h3>
                              <Badge className="bg-green-100 text-green-700">{selectedExecution.row_count} rows</Badge>
                            </div>
                            {renderResultsTable(
                              selectedExecution,
                              resultsPaginationState,
                              onResultsPageChange,
                              onResultsPageSizeChange,
                            )}
                          </div>
                        ) : selectedExecution.error_details ? (
                          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                            <h4 className="text-sm font-semibold text-red-800 mb-2">Query Execution Error</h4>
                            <p className="text-sm text-red-700 font-mono mb-2">
                              <span className="font-bold">{selectedExecution.error_details.error_type}:</span>{" "}
                              {selectedExecution.error_details.error_message}
                            </p>
                            {selectedExecution.error_details.possible_causes &&
                              selectedExecution.error_details.possible_causes.length > 0 && (
                                <div>
                                  <p className="text-xs text-red-600 font-medium mb-1">Possible Causes:</p>
                                  <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                                    {selectedExecution.error_details.possible_causes.map((cause, idx) => (
                                      <li key={idx}>{cause}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            {selectedExecution.executed_sql && (
                              <div className="mt-4">
                                <p className="text-xs text-red-600 font-medium mb-1">Executed SQL:</p>
                                <pre className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded overflow-x-auto">
                                  {selectedExecution.executed_sql}
                                </pre>
                              </div>
                            )}
                          </div>
                        ) : selectedExecution.error_message ? (
                          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                            <p className="text-sm text-red-700 font-mono">{selectedExecution.error_message}</p>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="shadow-sm border-0 bg-white rounded-3xl">
                    <CardContent className="p-12 text-center">
                      <Code className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-gray-800 mb-2">
                        {activeTab === "queries" ? "Select a Query" : "Select an Execution"}
                      </h3>
                      <p className="text-gray-600">
                        {activeTab === "queries"
                          ? "Choose a query from the list to view details and execute it."
                          : "Choose an execution from the history to view results and details."}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create New Query Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create New Query</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Query Name</label>
              <Input
                value={queryForm.name}
                onChange={(e) => setQueryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter query name"
                className="rounded-2xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
              <Input
                value={queryForm.description}
                onChange={(e) => setQueryForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter query description (optional)"
                className="rounded-2xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">SQL Query</label>
              <Textarea
                value={queryForm.query}
                onChange={(e) => setQueryForm((prev) => ({ ...prev, query: e.target.value }))}
                placeholder="Enter your SQL query here..."
                rows={8}
                className="font-mono text-sm rounded-2xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tags (comma-separated)</label>
              <Input
                value={queryForm.tags}
                onChange={(e) => setQueryForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., participants, reports, daily"
                className="rounded-2xl"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-2xl">
                Cancel
              </Button>
              <Button onClick={handleCreateQuery} className="bg-blue-600 hover:bg-blue-700 rounded-2xl">
                Create Query
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Query Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit Query</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Query Name</label>
              <Input
                value={queryForm.name}
                onChange={(e) => setQueryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter query name"
                className="rounded-2xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
              <Input
                value={queryForm.description}
                onChange={(e) => setQueryForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter query description (optional)"
                className="rounded-2xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">SQL Query</label>
              <Textarea
                value={queryForm.query}
                onChange={(e) => setQueryForm((prev) => ({ ...prev, query: e.target.value }))}
                placeholder="Enter your SQL query here..."
                rows={8}
                className="font-mono text-sm rounded-2xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tags (comma-separated)</label>
              <Input
                value={queryForm.tags}
                onChange={(e) => setQueryForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., participants, reports, daily"
                className="rounded-2xl"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-2xl">
                Cancel
              </Button>
              <Button onClick={handleEditQuery} className="bg-blue-600 hover:bg-blue-700 rounded-2xl">
                Update Query
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the query "{queryToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="rounded-2xl">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuery} className="rounded-2xl">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
