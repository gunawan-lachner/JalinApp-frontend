"use client"

import { useState, useMemo } from "react"
import { Database, FileText, Plus, Eye, EyeOff, ArrowLeftRight, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { ConnectionProfile, TableComparison, ColumnMapping } from "@/lib/types"

interface ComparisonSetupProps {
  connectionProfiles: ConnectionProfile[]
  profileTables: Record<string, string[]>
  profileColumns: Record<string, Record<string, string[]>>
  currentComparison: TableComparison
  selectedCommonTables: string[] // Renamed for clarity for multi-selection
  updateCurrentComparison: (updates: Partial<TableComparison>) => void
  handleTableSelection: (table: string) => void // New handler for multi-select
  addComparisons: (isQueryMode?: boolean, query?: string) => void // Added query mode parameters
  generateColumnMappings: (srcCols: string[], tgtCols: string[]) => ColumnMapping[]
}

export function ComparisonSetup({
  connectionProfiles,
  profileTables,
  profileColumns,
  currentComparison,
  selectedCommonTables,
  updateCurrentComparison,
  handleTableSelection,
  addComparisons,
  generateColumnMappings,
}: ComparisonSetupProps) {
  const [showColumnMapping, setShowColumnMapping] = useState(false)
  const [tableSearch, setTableSearch] = useState("")
  const [isQueryMode, setIsQueryMode] = useState(false)
  const [comparisonQuery, setComparisonQuery] = useState("")

  const commonTables = useMemo(() => {
    if (!currentComparison.sourceProfile || !currentComparison.targetProfile) {
      return []
    }
    const sourceTables = new Set(profileTables[currentComparison.sourceProfile] || [])
    const targetTables = new Set(profileTables[currentComparison.targetProfile] || [])

    const filteredTables = Array.from(sourceTables).filter(
      (table) => targetTables.has(table) && table.toLowerCase().includes(tableSearch.toLowerCase()),
    )
    return filteredTables.sort()
  }, [profileTables, currentComparison.sourceProfile, currentComparison.targetProfile, tableSearch])

  const showColumnMappingSection =
    selectedCommonTables.length === 1 &&
    currentComparison.sourceProfile &&
    currentComparison.targetProfile &&
    profileColumns[currentComparison.sourceProfile]?.[selectedCommonTables[0]] &&
    profileColumns[currentComparison.targetProfile]?.[selectedCommonTables[0]]

  const currentColumnMappings = useMemo(() => {
    if (showColumnMappingSection) {
      const selectedTable = selectedCommonTables[0]
      const srcCols = profileColumns[currentComparison.sourceProfile]?.[selectedTable] || []
      const tgtCols = profileColumns[currentComparison.targetProfile]?.[selectedTable] || []
      return generateColumnMappings(srcCols, tgtCols)
    }
    return []
  }, [
    showColumnMappingSection,
    profileColumns,
    currentComparison.sourceProfile,
    currentComparison.targetProfile,
    selectedCommonTables,
    generateColumnMappings,
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Setup Table Comparisons</h3>

        <div className="flex items-center space-x-2">
          <Label htmlFor="query-mode" className="text-sm font-medium text-gray-600">
            Query Mode
          </Label>
          <Switch
            id="query-mode"
            checked={isQueryMode}
            onCheckedChange={setIsQueryMode}
            className="data-[state=checked]:bg-green-600"
          />
        </div>
      </div>

      <Card className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-2xl">
        <CardHeader className="rounded-t-2xl">
          <CardTitle className="text-base text-blue-800">
            {isQueryMode ? "Add Query-Based Comparison" : "Add New Comparison"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span>Source Database</span>
              </Label>
              <Select
                value={currentComparison.sourceProfile}
                onValueChange={(value) =>
                  updateCurrentComparison({ sourceProfile: value, sourceTable: "", targetTable: "" })
                }
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select source database...">
                    {currentComparison.sourceProfile
                      ? (() => {
                          const profile = connectionProfiles.find((p) => p.name === currentComparison.sourceProfile)
                          return profile
                            ? `${profile.name} | ${profile.database} | ${profile.host}:${profile.port}`
                            : "Select source database..."
                        })()
                      : "Select source database..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {connectionProfiles
                    .filter((profile) => profile.connection_type === "DB")
                    .map((profile) => (
                      <SelectItem key={profile.name} value={profile.name} className="rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              profile.category === "Production"
                                ? "bg-red-400"
                                : profile.category === "Development"
                                  ? "bg-green-400"
                                  : "bg-yellow-400"
                            }`}
                          />
                          <div>
                            <div className="font-medium">{profile.name}</div>
                            <div className="text-xs text-gray-500">
                              {profile.database} • {profile.host}:{profile.port}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Database className="h-4 w-4 text-purple-600" />
                <span>Target Database</span>
              </Label>
              <Select
                value={currentComparison.targetProfile}
                onValueChange={(value) =>
                  updateCurrentComparison({ targetProfile: value, sourceTable: "", targetTable: "" })
                }
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select target database...">
                    {currentComparison.targetProfile
                      ? (() => {
                          const profile = connectionProfiles.find((p) => p.name === currentComparison.targetProfile)
                          return profile
                            ? `${profile.name} | ${profile.database} | ${profile.host}:${profile.port}`
                            : "Select target database..."
                        })()
                      : "Select target database..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {connectionProfiles
                    .filter((profile) => profile.connection_type === "DB")
                    .map((profile) => (
                      <SelectItem key={profile.name} value={profile.name} className="rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              profile.category === "Production"
                                ? "bg-red-400"
                                : profile.category === "Development"
                                  ? "bg-green-400"
                                  : "bg-yellow-400"
                            }`}
                          />
                          <div>
                            <div className="font-medium">{profile.name}</div>
                            <div className="text-xs text-gray-500">
                              {profile.database} • {profile.host}:{profile.port}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isQueryMode ? (
            // Query mode: Show query field directly after database selection
            currentComparison.sourceProfile &&
            currentComparison.targetProfile && (
              <Card className="rounded-2xl border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span>Database Comparison Query</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Write your full SQL query for data comparison
                    </Label>
                    <Textarea
                      placeholder="Example: SELECT * FROM users WHERE created_at > '2024-01-01' AND status = 'active'"
                      value={comparisonQuery}
                      onChange={(e) => setComparisonQuery(e.target.value)}
                      className="min-h-[120px] rounded-xl font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      This query will be executed on both source ({currentComparison.sourceProfile}) and target (
                      {currentComparison.targetProfile}) databases for comparison.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            // Regular mode: Show table selection
            <Card className="rounded-2xl border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span>Select Table(s) for Comparison ({selectedCommonTables.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tables..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-10 rounded-xl"
                    disabled={!currentComparison.sourceProfile || !currentComparison.targetProfile}
                  />
                </div>
                <div className="max-h-80 overflow-y-auto pr-2">
                  {commonTables.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {commonTables.map((table) => (
                        <Button
                          key={table}
                          variant={selectedCommonTables.includes(table) ? "default" : "outline"}
                          className={`justify-start rounded-xl ${
                            selectedCommonTables.includes(table)
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "border-gray-200 hover:bg-gray-100"
                          }`}
                          onClick={() => handleTableSelection(table)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {table}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-gray-500 py-4">
                      {!currentComparison.sourceProfile || !currentComparison.targetProfile
                        ? "Select both source and target profiles to see common tables."
                        : "No common tables found or match search criteria."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {showColumnMappingSection && !isQueryMode && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">Column Mapping</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowColumnMapping(!showColumnMapping)}
                  className="rounded-xl"
                >
                  {showColumnMapping ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showColumnMapping ? "Hide" : "Show"} Mapping
                </Button>
              </div>

              {showColumnMapping && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 max-h-[500px] overflow-y-auto">
                  <div className="space-y-4">
                    {currentColumnMappings.map((mapping, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100"
                      >
                        <div className="flex-1">
                          <div className="font-mono text-sm bg-blue-100 text-blue-800 px-3 py-2 rounded-lg border border-blue-200">
                            {mapping.sourceColumn}
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">
                          <ArrowLeftRight className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <Select value={mapping.targetColumn} onValueChange={(value) => {}}>
                            <SelectTrigger className="h-10 rounded-xl">
                              <SelectValue placeholder="Select target..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="skip" className="rounded-lg">
                                -- Skip this column --
                              </SelectItem>
                              {(profileColumns[currentComparison.targetProfile]?.[selectedCommonTables[0]] || []).map(
                                (col) => (
                                  <SelectItem key={col} value={col} className="rounded-lg">
                                    {col}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => addComparisons(isQueryMode, comparisonQuery)}
              className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
              disabled={
                !currentComparison.sourceProfile ||
                !currentComparison.targetProfile ||
                (isQueryMode ? !comparisonQuery.trim() : selectedCommonTables.length === 0)
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              {isQueryMode
                ? "Add Query Comparison"
                : `Add ${selectedCommonTables.length} Comparison${selectedCommonTables.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
