"use client"

import { Database, ArrowRight, FileText, Trash2, ChevronDown, ChevronUp, Key } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { rnaApi } from "@/lib/api"
import type { TableComparison } from "@/lib/types"

interface ComparisonQueueProps {
  tableComparisons: TableComparison[]
  removeComparison: (id: string) => void
  onRunComparisons: () => void
  updateComparisonKey?: (
    id: string,
    keyConfig: { type: "PRIMARY" | "CUSTOM"; columns?: string[]; comparison_key: string | string[] },
  ) => void
}

export function ComparisonQueue({
  tableComparisons,
  removeComparison,
  onRunComparisons,
  updateComparisonKey,
}: ComparisonQueueProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [comparisonKeys, setComparisonKeys] = useState<
    Record<string, { type: "PRIMARY" | "CUSTOM"; columns?: string[]; comparison_key: string | string[] }>
  >({})
  const [tableColumns, setTableColumns] = useState<Record<string, string[]>>({})
  const [loadingColumns, setLoadingColumns] = useState<Record<string, boolean>>({})

  const fetchTableColumns = async (profile: string, tableName: string) => {
    const cacheKey = `${profile}-${tableName}`

    if (tableColumns[cacheKey] || loadingColumns[cacheKey]) {
      return
    }

    setLoadingColumns((prev) => ({ ...prev, [cacheKey]: true }))

    try {
      const response = await rnaApi.getTableColumns(profile, tableName)

      if (response.success && response.data) {
        setTableColumns((prev) => ({
          ...prev,
          [cacheKey]: response.data.columns,
        }))
      }
    } catch (error) {
      console.error("Error fetching table columns:", error)
    } finally {
      setLoadingColumns((prev) => ({ ...prev, [cacheKey]: false }))
    }
  }

  const getTableColumns = (profile: string, tableName: string) => {
    const cacheKey = `${profile}-${tableName}`
    return tableColumns[cacheKey] || []
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCards(newExpanded)
  }

  const handleUpdateComparisonKey = (id: string, type: "PRIMARY" | "CUSTOM", columns?: string[]) => {
    let comparison_key: string | string[]
    if (type === "PRIMARY") {
      comparison_key = "primary"
    } else if (type === "CUSTOM" && columns && columns.length > 0) {
      comparison_key = columns.length === 1 ? columns[0] : columns
    } else {
      comparison_key = "primary"
    }

    const keyConfig = { type, columns, comparison_key }
    setComparisonKeys((prev) => ({
      ...prev,
      [id]: keyConfig,
    }))

    if (updateComparisonKey) {
      updateComparisonKey(id, keyConfig)
    }

    if (type === "CUSTOM") {
      const comparison = tableComparisons.find((c) => c.id === id)
      if (comparison) {
        if (!comparison.isQueryMode) {
          fetchTableColumns(comparison.sourceProfile, comparison.sourceTable)
        }
      }
    }
  }

  const toggleColumn = (comparisonId: string, column: string) => {
    const current = comparisonKeys[comparisonId] || { type: "PRIMARY", columns: [] }
    const currentColumns = current.columns || []

    let newColumns: string[]
    if (currentColumns.includes(column)) {
      newColumns = currentColumns.filter((col) => col !== column)
    } else {
      newColumns = [...currentColumns, column]
    }

    handleUpdateComparisonKey(comparisonId, current.type, newColumns)
  }

  useEffect(() => {
    tableComparisons.forEach((comparison) => {
      if (!comparison.isQueryMode) {
        fetchTableColumns(comparison.sourceProfile, comparison.sourceTable)
      }
    })
  }, [tableComparisons])

  if (tableComparisons.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-800">Comparison Queue ({tableComparisons.length})</h4>
        <Button onClick={onRunComparisons} className="bg-green-600 hover:bg-green-700 rounded-xl">
          <ArrowRight className="h-4 w-4 mr-2" />
          Run All Comparisons
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tableComparisons.map((comparison) => (
          <Card key={comparison.id} className="border hover:border-blue-300 transition-colors rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Badge
                    variant="secondary"
                    className={`text-xs rounded-full ${
                      comparison.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : comparison.status === "running"
                          ? "bg-blue-100 text-blue-700"
                          : comparison.status === "error"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {comparison.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeComparison(comparison.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{comparison.sourceProfile}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <span className="font-medium">{comparison.targetProfile}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded-lg text-xs">{comparison.sourceTable}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded-lg text-xs">{comparison.targetTable}</span>
                </div>
              </div>

              <Collapsible open={expandedCards.has(comparison.id)} onOpenChange={() => toggleExpanded(comparison.id)}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full mt-3 p-2 h-auto rounded-xl hover:bg-gray-50">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <Key className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">
                          {comparison.isQueryMode ? "Query" : "Comparison Key"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {comparison.isQueryMode && comparison.query
                            ? "Custom Query"
                            : comparisonKeys[comparison.id]?.type === "CUSTOM" &&
                                comparisonKeys[comparison.id]?.columns?.length
                              ? `${comparisonKeys[comparison.id].columns!.length} column(s)`
                              : comparisonKeys[comparison.id]?.type || "PRIMARY"}
                        </Badge>
                      </div>
                      {expandedCards.has(comparison.id) ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 space-y-3">
                  {comparison.isQueryMode && comparison.query ? (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Query Logic</Label>
                      <div className="bg-gray-50 border rounded-xl p-3">
                        <code className="text-sm font-mono text-gray-800 whitespace-pre-wrap">{comparison.query}</code>
                      </div>
                      <p className="text-xs text-gray-500">Applied to table: {comparison.sourceTable}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Key Type</Label>
                        <Select
                          value={comparisonKeys[comparison.id]?.type || "PRIMARY"}
                          onValueChange={(value: "PRIMARY" | "CUSTOM") =>
                            handleUpdateComparisonKey(comparison.id, value)
                          }
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRIMARY">PRIMARY</SelectItem>
                            <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {comparisonKeys[comparison.id]?.type === "CUSTOM" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Select Columns (Multiple)</Label>
                          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-xl bg-gray-50">
                            {loadingColumns[`${comparison.sourceProfile}-${comparison.sourceTable}`] ? (
                              <div className="col-span-2 text-center text-sm text-gray-500 py-2">
                                Loading columns...
                              </div>
                            ) : getTableColumns(comparison.sourceProfile, comparison.sourceTable).length > 0 ? (
                              getTableColumns(comparison.sourceProfile, comparison.sourceTable).map((column) => (
                                <div key={column} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`${comparison.id}-${column}`}
                                    checked={comparisonKeys[comparison.id]?.columns?.includes(column) || false}
                                    onChange={() => toggleColumn(comparison.id, column)}
                                    className="w-3 h-3 text-blue-600"
                                  />
                                  <Label
                                    htmlFor={`${comparison.id}-${column}`}
                                    className="text-xs font-mono cursor-pointer"
                                  >
                                    {column}
                                  </Label>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-2 text-center text-sm text-gray-500 py-2">
                                No columns available
                              </div>
                            )}
                          </div>
                          {comparisonKeys[comparison.id]?.columns &&
                            comparisonKeys[comparison.id].columns!.length > 0 && (
                              <div className="text-xs text-gray-600">
                                Selected: {comparisonKeys[comparison.id].columns!.join(", ")}
                              </div>
                            )}
                        </div>
                      )}
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {comparison.results && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{comparison.results.summary.identical}</div>
                      <div className="text-gray-500">Identical</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-600">
                        {comparison.results.summary.different +
                          comparison.results.summary.only_in_source +
                          comparison.results.summary.only_in_target}
                      </div>
                      <div className="text-gray-500">Differences</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
