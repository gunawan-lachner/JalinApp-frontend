"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { useRnaApi } from "@/hooks/useRnaApi"
import { useToast } from "@/hooks/use-toast"
import { StepIndicator } from "@/components/database/step-indicator"
import { ComparisonSetup } from "@/components/database/comparison-setup"
import { ComparisonQueue } from "@/components/database/comparison-queue"
import { ComparisonOptions } from "@/components/database/comparison-options"
import { ComparisonExecution } from "@/components/database/comparison-execution"
import { ComparisonResults } from "@/components/database/comparison-results"
import { ResultsModal } from "@/components/database/results-modal"
import type {
  ConnectionProfile,
  TableComparison,
  ColumnMapping,
  TableComparisonRequest,
  TableComparisonResponse,
} from "@/lib/types"

export default function DatabaseComparePage() {
  const router = useRouter()
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState(pathname)
  const { toast } = useToast()
  const api = useRnaApi()

  // Connection profiles and table data
  const [connectionProfiles, setConnectionProfiles] = useState<ConnectionProfile[]>([])
  const [profileTables, setProfileTables] = useState<Record<string, string[]>>({})
  const [profileColumns, setProfileColumns] = useState<Record<string, Record<string, string[]>>>({})

  // Multiple table comparisons
  const [tableComparisons, setTableComparisons] = useState<TableComparison[]>([])
  const [currentComparison, setCurrentComparison] = useState<TableComparison>({
    id: Date.now().toString(),
    sourceProfile: "",
    targetProfile: "",
    sourceTable: "", // This will be handled by selectedTables
    targetTable: "", // This will be handled by selectedTables
    columnMappings: [],
    status: "pending",
    comparisonKey: { type: "PRIMARY" }, // Default comparison key type
    isQueryMode: false, // Default query mode flag
    query: undefined, // Default query
  })

  // New state for multi-selection of common tables
  const [selectedCommonTables, setSelectedCommonTables] = useState<string[]>([])

  // Comparison options
  const [compareOptions, setCompareOptions] = useState({
    compare_all: true,
    only_in_source: true,
    only_in_target: true,
    different_records: true,
    identical_records: true,
  })

  // UI state
  const [currentStep, setCurrentStep] = useState(1)
  const [isRunningComparisons, setIsRunningComparisons] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [selectedComparison, setSelectedComparison] = useState<TableComparison | null>(null)
  const [selectedResultType, setSelectedResultType] = useState<string>("")
  const [selectedResults, setSelectedResults] = useState<any[]>([])
  const [resultSearchTerm, setResultSearchTerm] = useState("")

  const handleNavigation = (href: string) => {
    router.push(href)
    setActiveSection(href)
  }

  // Load connection profiles on mount
  useEffect(() => {
    api.getConnectionProfiles(
      (data) => {
        setConnectionProfiles(data)
      },
      (error) => {
        toast({
          title: "Error",
          description: `Failed to load connection profiles: ${error}`,
          variant: "destructive",
        })
      },
    )
  }, [])

  // Load tables for a profile
  const loadTablesForProfile = (profile: string) => {
    if (profileTables[profile]) return // Already loaded

    api.getSourceTables(
      profile,
      (data) => {
        setProfileTables((prev) => ({ ...prev, [profile]: data.tables || [] }))
      },
      (error) => {
        toast({
          title: "Error",
          description: `Failed to load tables for ${profile}: ${error}`,
          variant: "destructive",
        })
      },
    )
  }

  // Load columns for a table
  const loadColumnsForTable = (profile: string, table: string) => {
    const key = `${profile}.${table}`
    if (profileColumns[profile]?.[table]) return // Already loaded

    api.getTableColumns(
      profile,
      table,
      (data) => {
        setProfileColumns((prev) => ({
          ...prev,
          [profile]: {
            ...prev[profile],
            [table]: data.columns || [],
          },
        }))
      },
      (error) => {
        toast({
          title: "Error",
          description: `Failed to load columns for ${profile}.${table}: ${error}`,
          variant: "destructive",
        })
      },
    )
  }

  // Generate column mappings
  const generateColumnMappings = (srcCols: string[], tgtCols: string[]): ColumnMapping[] => {
    return srcCols.map((srcCol) => {
      // Try exact match first
      let targetCol = tgtCols.find((tgtCol) => tgtCol.toLowerCase() === srcCol.toLowerCase())
      // Try partial match
      if (!targetCol) {
        targetCol = tgtCols.find(
          (tgtCol) =>
            tgtCol.toLowerCase().includes(srcCol.toLowerCase()) || srcCol.toLowerCase().includes(tgtCol.toLowerCase()),
        )
      }
      return {
        sourceColumn: srcCol,
        targetColumn: targetCol || "",
      }
    })
  }

  // Update current comparison (for profile selection)
  const updateCurrentComparison = (updates: Partial<TableComparison>) => {
    setCurrentComparison((prev) => {
      const newComparison = { ...prev, ...updates }

      // Auto-load tables when profiles change
      if (updates.sourceProfile) {
        loadTablesForProfile(updates.sourceProfile)
        setSelectedCommonTables([]) // Clear selected tables on profile change
      }
      if (updates.targetProfile) {
        loadTablesForProfile(updates.targetProfile)
        setSelectedCommonTables([]) // Clear selected tables on profile change
      }

      // If a single table is selected for column mapping display, load its columns
      if (selectedCommonTables.length === 1 && newComparison.sourceProfile && newComparison.targetProfile) {
        const table = selectedCommonTables[0]
        loadColumnsForTable(newComparison.sourceProfile, table)
        loadColumnsForTable(newComparison.targetProfile, table)
      }

      return newComparison
    })
  }

  // Handle multi-selection for common tables
  const handleTableSelection = (table: string) => {
    setSelectedCommonTables((prev) => {
      if (prev.includes(table)) {
        return prev.filter((t) => t !== table)
      } else {
        return [...prev, table]
      }
    })
  }

  // Add multiple comparisons to list
  const addComparisons = (isQueryMode?: boolean, query?: string) => {
    if (
      !currentComparison.sourceProfile ||
      !currentComparison.targetProfile ||
      (!isQueryMode && selectedCommonTables.length === 0) ||
      (isQueryMode && !query?.trim())
    ) {
      toast({
        title: "Incomplete Comparison",
        description: isQueryMode
          ? "Please select source and target profiles, and enter a query for comparison."
          : "Please select source and target profiles, and at least one table for comparison.",
        variant: "destructive",
      })
      return
    }

    const newComparisons: TableComparison[] = []

    if (isQueryMode) {
      newComparisons.push({
        id: `${Date.now()}-query`, // Unique ID for query comparison
        sourceProfile: currentComparison.sourceProfile,
        targetProfile: currentComparison.targetProfile,
        sourceTable: "", // No specific table for query mode
        targetTable: "", // No specific table for query mode
        columnMappings: [], // No column mappings for query mode
        status: "pending",
        comparisonKey: currentComparison.comparisonKey,
        isQueryMode: true,
        query: query,
      })
    } else {
      // Regular mode - iterate through selected tables
      selectedCommonTables.forEach((table) => {
        const srcCols = profileColumns[currentComparison.sourceProfile]?.[table] || []
        const tgtCols = profileColumns[currentComparison.targetProfile]?.[table] || []
        const mappings = generateColumnMappings(srcCols, tgtCols)

        newComparisons.push({
          id: `${Date.now()}-${table}`, // Unique ID for each table comparison
          sourceProfile: currentComparison.sourceProfile,
          targetProfile: currentComparison.targetProfile,
          sourceTable: table,
          targetTable: table, // Target table is always the same as source table
          columnMappings: mappings,
          status: "pending",
          comparisonKey: currentComparison.comparisonKey, // Include comparison key configuration
          isQueryMode: false,
          query: undefined,
        })
      })
    }

    setTableComparisons((prev) => [...prev, ...newComparisons])
    setSelectedCommonTables([]) // Clear selections after adding
    toast({
      title: "Comparison Added",
      description: isQueryMode
        ? "Added query-based comparison to the list"
        : `Added ${newComparisons.length} table comparison(s) to the list`,
      variant: "success",
    })
  }

  // Remove comparison from list
  const removeComparison = (id: string) => {
    setTableComparisons((prev) => prev.filter((comp) => comp.id !== id))
  }

  // Update comparison key in table comparisons
  const updateComparisonKey = (
    id: string,
    keyConfig: { type: "PRIMARY" | "CUSTOM"; columns?: string[]; comparison_key: string | string[] },
  ) => {
    setTableComparisons((prev) =>
      prev.map((comp) =>
        comp.id === id ? { ...comp, comparisonKey: { type: keyConfig.type, columns: keyConfig.columns } } : comp,
      ),
    )
  }

  // Run all comparisons
  const runAllComparisons = async () => {
    if (tableComparisons.length === 0) {
      toast({
        title: "No Comparisons",
        description: "Please add at least one table comparison",
        variant: "destructive",
      })
      return
    }

    setIsRunningComparisons(true)
    setOverallProgress(0)

    const totalComparisons = tableComparisons.length
    let completedComparisons = 0

    for (const comparison of tableComparisons) {
      // Update status to running
      setTableComparisons((prev) =>
        prev.map((comp) => (comp.id === comparison.id ? { ...comp, status: "running" as const } : comp)),
      )

      // Build column mapping object
      const columnMapping: Record<string, string> = {}
      comparison.columnMappings.forEach((mapping) => {
        if (mapping.targetColumn && mapping.targetColumn !== "skip") {
          columnMapping[mapping.sourceColumn] = mapping.targetColumn
        }
      })

      const compareFields: string[] = []
      let comparisonKey: string | string[] = "primary"

      if (comparison.comparisonKey?.type === "CUSTOM" && comparison.comparisonKey.columns?.length) {
        comparisonKey =
          comparison.comparisonKey.columns.length === 1
            ? comparison.comparisonKey.columns[0]
            : comparison.comparisonKey.columns
        compareFields.push(...comparison.comparisonKey.columns)
      }

      const request: TableComparisonRequest = {
        source_profile: comparison.sourceProfile,
        target_profile: comparison.targetProfile,
        source_table: comparison.sourceTable,
        target_table: comparison.targetTable,
        column_mapping: Object.keys(columnMapping).length > 0 ? columnMapping : undefined,
        compare_options: {
          ...compareOptions,
          comparison_key: comparisonKey,
        },
        compare_fields: compareFields.length > 0 ? compareFields : undefined,
        is_query_mode: comparison.isQueryMode, // Include query mode flag in request
        query: comparison.query, // Include query if in query mode
      }

      try {
        const result = await new Promise<TableComparisonResponse>((resolve, reject) => {
          api.compareTables(
            request,
            (data) => resolve(data),
            (error) => reject(error),
          )
        })

        // Update with results
        setTableComparisons((prev) =>
          prev.map((comp) =>
            comp.id === comparison.id ? { ...comp, status: "completed" as const, results: result } : comp,
          ),
        )
      } catch (error) {
        // Update with error
        setTableComparisons((prev) =>
          prev.map((comp) =>
            comp.id === comparison.id ? { ...comp, status: "error" as const, error: error as string } : comp,
          ),
        )
      }

      completedComparisons++
      setOverallProgress((completedComparisons / totalComparisons) * 100)
    }

    setIsRunningComparisons(false)
    setCurrentStep(3) // Move to results step
    toast({
      title: "Comparisons Complete",
      description: `Completed ${completedComparisons} table comparisons`,
      variant: "success",
    })
  }

  // Show detailed results
  const showDetailedResults = (comparison: TableComparison, resultType: string) => {
    if (!comparison.results) return

    let results: any[] = []
    switch (resultType) {
      case "only_in_source":
        results = comparison.results.only_in_source
        break
      case "only_in_target":
        results = comparison.results.only_in_target
        break
      case "different":
        results = comparison.results.different
        break
      case "identical":
        results = comparison.results.identical
        break
    }

    setSelectedComparison(comparison)
    setSelectedResultType(resultType)
    setSelectedResults(results)
    setShowResultsModal(true)
  }

  // Filter results based on search term
  const filteredResults = selectedResults.filter((result) =>
    Object.values(result).some((value) => String(value).toLowerCase().includes(resultSearchTerm.toLowerCase())),
  )

  // Export all results
  const exportAllResults = (format: "csv" | "excel") => {
    const allResults = tableComparisons
      .filter((comp) => comp.results)
      .flatMap((comp) => [
        ...comp.results!.only_in_source.map((r) => ({
          ...r,
          _comparison_source: `${comp.sourceProfile}.${comp.sourceTable}`,
          _comparison_target: `${comp.targetProfile}.${comp.targetTable}`,
          _comparison_type: "only_in_source",
        })),
        ...comp.results!.only_in_target.map((r) => ({
          ...r,
          _comparison_source: `${comp.sourceProfile}.${comp.sourceTable}`,
          _comparison_target: `${comp.targetProfile}.${comp.targetTable}`,
          _comparison_type: "only_in_target",
        })),
        ...comp.results!.different.map((r) => ({
          ...r,
          _comparison_source: `${comp.sourceProfile}.${comp.sourceTable}`,
          _comparison_target: `${comp.targetProfile}.${comp.targetTable}`,
          _comparison_type: "different",
        })),
        ...comp.results!.identical.map((r) => ({
          ...r,
          _comparison_source: `${comp.sourceProfile}.${comp.sourceTable}`,
          _comparison_target: `${comp.targetProfile}.${comp.targetTable}`,
          _comparison_type: "identical",
        })),
      ])

    api.exportCompareResults(
      allResults,
      format,
      (blob) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        const timestamp = new Date().toISOString().split("T")[0]
        const filename = `multi_table_comparison_${timestamp}.${format}`
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast({
          title: "Export Complete",
          description: `Results exported as ${filename}`,
          variant: "success",
        })
      },
      (error) => {
        toast({
          title: "Export Failed",
          description: `Failed to export results: ${error}`,
          variant: "destructive",
        })
      },
    )
  }

  // Get overall statistics
  const getOverallStats = () => {
    const completedComparisons = tableComparisons.filter((comp) => comp.results)
    if (completedComparisons.length === 0) return null

    const totalStats = completedComparisons.reduce(
      (acc, comp) => {
        if (comp.results) {
          acc.only_in_source += comp.results.summary.only_in_source
          acc.only_in_target += comp.results.summary.only_in_target
          acc.different += comp.results.summary.different
          acc.identical += comp.results.summary.identical
        }
        return acc
      },
      { only_in_source: 0, only_in_target: 0, different: 0, identical: 0 },
    )

    const totalRecords = Object.values(totalStats).reduce((a, b) => a + b, 0)
    const matchRate = totalRecords > 0 ? (totalStats.identical / totalRecords) * 100 : 0

    return { ...totalStats, totalRecords, matchRate }
  }

  const overallStats = getOverallStats()

  const handleCopyResults = () => {
    navigator.clipboard.writeText(JSON.stringify(filteredResults, null, 2))
    toast({ title: "Copied", description: "Results copied to clipboard" })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />

        <div className="flex-1">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Jalin App</span>
              <span>/</span>
              <span>Database</span>
              <span>/</span>
              <span className="text-gray-800 font-medium">Compare Tables</span>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {/* Hero Section */}
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">Database Table Comparison</h1>
                <p className="text-gray-600">Compare data between tables in different database connection profiles.</p>
              </div>

              {/* Progress Steps */}
              <Card className="rounded-2xl">
                <CardHeader className="bg-gray-50 border-b rounded-t-2xl">
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    <span>Comparison Workflow</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <StepIndicator currentStep={currentStep} />

                  {/* Step 1: Setup Comparisons */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <ComparisonSetup
                        connectionProfiles={connectionProfiles}
                        profileTables={profileTables}
                        profileColumns={profileColumns}
                        currentComparison={currentComparison}
                        selectedCommonTables={selectedCommonTables}
                        updateCurrentComparison={updateCurrentComparison}
                        handleTableSelection={handleTableSelection}
                        addComparisons={addComparisons}
                        generateColumnMappings={generateColumnMappings}
                      />

                      <ComparisonQueue
                        tableComparisons={tableComparisons}
                        removeComparison={removeComparison}
                        onRunComparisons={() => setCurrentStep(2)}
                        updateComparisonKey={updateComparisonKey} // Pass updateComparisonKey callback to ComparisonQueue
                      />

                      <ComparisonOptions compareOptions={compareOptions} setCompareOptions={setCompareOptions} />
                    </div>
                  )}

                  {/* Step 2: Run Analysis */}
                  {currentStep === 2 && (
                    <ComparisonExecution
                      tableComparisons={tableComparisons}
                      isRunningComparisons={isRunningComparisons}
                      overallProgress={overallProgress}
                      runAllComparisons={runAllComparisons}
                      setCurrentStep={setCurrentStep}
                    />
                  )}

                  {/* Step 3: View Results */}
                  {currentStep === 3 && (
                    <ComparisonResults
                      tableComparisons={tableComparisons}
                      overallStats={overallStats}
                      exportAllResults={exportAllResults}
                      showDetailedResults={showDetailedResults}
                      setCurrentStep={setCurrentStep}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Results Modal */}
      <ResultsModal
        showResultsModal={showResultsModal}
        setShowResultsModal={setShowResultsModal}
        selectedComparison={selectedComparison}
        selectedResultType={selectedResultType}
        selectedResults={selectedResults}
        resultSearchTerm={resultSearchTerm}
        setResultSearchTerm={setResultSearchTerm}
        filteredResults={filteredResults}
        onCopy={handleCopyResults}
      />
    </div>
  )
}
