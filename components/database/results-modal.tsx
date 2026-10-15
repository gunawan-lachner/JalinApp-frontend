"use client"

import { FileText, Search, Copy, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useMemo, useCallback } from "react"
import type { TableComparison } from "@/lib/types"

interface ResultsModalProps {
  showResultsModal: boolean
  setShowResultsModal: (show: boolean) => void
  selectedComparison: TableComparison | null
  selectedResultType: string
  selectedResults: any[]
  resultSearchTerm: string
  setResultSearchTerm: (term: string) => void
  filteredResults: any[]
  onCopy: () => void
}

function DifferentRecordsView({ records }: { records: any[] }) {
  if (records.length === 0) return null

  // Get all unique field names from source and target records
  const allFields = new Set<string>()
  records.forEach((record) => {
    if (record.source_record) {
      Object.keys(record.source_record).forEach((key) => allFields.add(key))
    }
    if (record.target_record) {
      Object.keys(record.target_record).forEach((key) => allFields.add(key))
    }
  })

  const fieldNames = Array.from(allFields).sort()

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm min-w-max bg-white">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="px-6 py-4 text-left font-semibold text-gray-800 bg-slate-100 border-b-2 border-slate-200 whitespace-nowrap min-w-[180px] shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Comparison Key</span>
              </div>
            </th>
            {fieldNames.map((field) => (
              <th key={field} className="border-b-2 border-slate-200 bg-slate-100 shadow-sm">
                <div className="px-4 py-4 text-center font-semibold text-gray-800 whitespace-nowrap min-w-[160px] border-b border-slate-300">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span>{field}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <div className="px-4 py-3 text-xs font-bold text-blue-700 bg-blue-50 border-r border-slate-300">
                    <div className="flex items-center justify-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>SOURCE</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 text-xs font-bold text-emerald-700 bg-emerald-50">
                    <div className="flex items-center justify-center space-x-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span>TARGET</span>
                    </div>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {records.map((record, index) => {
            const fieldsWithDifferences = record.fields_with_differences || []

            return (
              <tr key={index} className="hover:bg-slate-50 transition-all duration-200 group">
                <td className="px-6 py-4 bg-white border-r border-slate-200 whitespace-nowrap min-w-[180px] group-hover:bg-slate-50 transition-all duration-200">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-bold text-gray-900">{record.comparison_key}</span>
                    </div>
                    {record.comparison_key_columns && (
                      <div className="flex items-center space-x-1 ml-4">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <span className="text-xs text-gray-500 font-medium">
                          ({record.comparison_key_columns.join(", ")})
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                {fieldNames.map((field) => {
                  const sourceValue = record.source_record?.[field]
                  const targetValue = record.target_record?.[field]
                  const hasDifference = fieldsWithDifferences.includes(field)

                  return (
                    <td key={field} className="border-r border-slate-200 last:border-r-0">
                      <div className="grid grid-cols-2 divide-x divide-slate-200 h-full">
                        <div
                          className={`px-4 py-4 text-center transition-all duration-200 ${
                            hasDifference
                              ? "bg-red-50 text-red-900 font-semibold border-l-2 border-red-400"
                              : "text-gray-700 group-hover:bg-blue-25"
                          }`}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            {hasDifference && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>}
                            <div className="max-w-[120px] truncate font-medium" title={String(sourceValue ?? "")}>
                              {sourceValue ?? "-"}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`px-4 py-4 text-center transition-all duration-200 ${
                            hasDifference
                              ? "bg-red-50 text-red-900 font-semibold border-r-2 border-red-400"
                              : "text-gray-700 group-hover:bg-emerald-25"
                          }`}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            {hasDifference && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>}
                            <div className="max-w-[120px] truncate font-medium" title={String(targetValue ?? "")}>
                              {targetValue ?? "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function OptimizedRecordsTable({ records, searchTerm }: { records: any[]; searchTerm: string }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const { paginatedRecords, totalPages, columns } = useMemo(() => {
    if (records.length === 0) return { paginatedRecords: [], totalPages: 0, columns: [] }

    // Get columns from first record
    const cols = Object.keys(records[0])

    // Filter records based on search term
    const filtered = searchTerm
      ? records.filter((record) =>
          Object.values(record).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
        )
      : records

    // Calculate pagination
    const total = Math.ceil(filtered.length / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginated = filtered.slice(startIndex, endIndex)

    return {
      paginatedRecords: paginated,
      totalPages: total,
      columns: cols,
    }
  }, [records, searchTerm, currentPage, pageSize])

  const handleSearchChange = useCallback((term: string) => {
    setCurrentPage(1)
  }, [])

  if (records.length === 0) return null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Show:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">per page</span>
          </div>
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, records.length)} of{" "}
            {records.length.toLocaleString()}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-8 px-3"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-700">Page</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-2 py-1">
              {currentPage} of {totalPages}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="h-8 px-3"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-sm min-w-max bg-white">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 border-b-2 border-slate-200">
              {columns.map((column, index) => (
                <th
                  key={column}
                  className={`px-6 py-4 text-left font-semibold text-gray-800 whitespace-nowrap min-w-[140px] ${
                    index === 0 ? "border-r border-slate-300" : ""
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${index === 0 ? "bg-blue-500" : "bg-gray-400"}`}></div>
                    <span className="font-bold">{column}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedRecords.map((record, index) => (
              <tr key={index} className="hover:bg-slate-50 transition-all duration-200 group">
                {columns.map((column, colIndex) => {
                  const value = record[column]
                  return (
                    <td
                      key={column}
                      className={`px-6 py-4 text-gray-800 whitespace-nowrap min-w-[140px] group-hover:text-gray-900 transition-colors ${
                        colIndex === 0 ? "border-r border-slate-200 bg-white font-medium" : ""
                      }`}
                    >
                      <div className="max-w-[200px] truncate" title={String(value ?? "")}>
                        {value ?? "-"}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ResultsModal({
  showResultsModal,
  setShowResultsModal,
  selectedComparison,
  selectedResultType,
  selectedResults,
  resultSearchTerm,
  setResultSearchTerm,
  filteredResults,
  onCopy,
}: ResultsModalProps) {
  const isDifferentRecords =
    selectedResultType === "different" &&
    filteredResults.length > 0 &&
    filteredResults[0].source_record &&
    filteredResults[0].target_record

  return (
    <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] overflow-hidden rounded-3xl flex flex-col">
        <DialogHeader className="border-b pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center space-x-3">
            <div className="bg-blue-100 border border-blue-200 rounded-2xl p-3">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">
                {selectedResultType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} Records
              </div>
              {selectedComparison && (
                <div className="text-sm text-gray-600 mt-1">
                  {selectedComparison.sourceTable} vs {selectedComparison.targetTable} •{" "}
                  {filteredResults.length.toLocaleString()} records
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 space-y-4 p-1">
          {/* Search and Actions */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search records..."
                value={resultSearchTerm}
                onChange={(e) => setResultSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 rounded-full">
                {filteredResults.length.toLocaleString()} records
              </Badge>
              <Button variant="outline" size="sm" onClick={onCopy} className="rounded-xl bg-transparent">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>

          {/* Results Table Container */}
          <div className="flex-1 min-h-0 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {filteredResults.length > 0 ? (
              isDifferentRecords ? (
                <DifferentRecordsView records={filteredResults} />
              ) : (
                <OptimizedRecordsTable records={filteredResults} searchTerm={resultSearchTerm} />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No records found</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
