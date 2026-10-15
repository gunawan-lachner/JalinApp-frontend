"use client"

import { Download, GitCompare, TrendingUp, CheckCircle, AlertCircle, Database, Users, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { TableComparison } from "@/lib/types"

interface ComparisonResultsProps {
  tableComparisons: TableComparison[]
  overallStats: {
    matchRate: number
    totalRecords: number
    identical: number
    different: number
    only_in_source: number
    only_in_target: number
  } | null
  exportAllResults: (format: "csv" | "excel") => void
  showDetailedResults: (comparison: TableComparison, resultType: string) => void
  setCurrentStep: (step: number) => void
}

export function ComparisonResults({
  tableComparisons,
  overallStats,
  exportAllResults,
  showDetailedResults,
  setCurrentStep,
}: ComparisonResultsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Comparison Results</h3>
          <p className="text-gray-600">
            Analysis complete for {tableComparisons.filter((c) => c.results).length} comparison
            {tableComparisons.filter((c) => c.results).length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select onValueChange={exportAllResults}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="Export All" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="csv" className="rounded-lg">
                <div className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </div>
              </SelectItem>
              <SelectItem value="excel" className="rounded-lg">
                <div className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Export Excel</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setCurrentStep(1)} className="rounded-xl">
            New Analysis
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      {overallStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-blue-50 border-blue-200 rounded-2xl">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">{overallStats.matchRate.toFixed(1)}%</div>
              <div className="text-sm text-blue-600">Match Rate</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200 rounded-2xl">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{overallStats.identical.toLocaleString()}</div>
              <div className="text-sm text-green-600">Identical</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200 rounded-2xl">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-700">{overallStats.different.toLocaleString()}</div>
              <div className="text-sm text-red-600">Different</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200 rounded-2xl">
            <CardContent className="p-4 text-center">
              <Database className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-700">{overallStats.only_in_source.toLocaleString()}</div>
              <div className="text-sm text-orange-600">Source Only</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200 rounded-2xl">
            <CardContent className="p-4 text-center">
              <Database className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">{overallStats.only_in_target.toLocaleString()}</div>
              <div className="text-sm text-purple-600">Target Only</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Individual Comparison Results */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-800">Individual Comparisons</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tableComparisons
            .filter((comp) => comp.results)
            .map((comparison) => (
              <Card key={comparison.id} className="border rounded-2xl">
                <CardHeader className="bg-gray-50 border-b rounded-t-2xl">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <GitCompare className="h-4 w-4 text-blue-600" />
                      <span>
                        {comparison.isQueryMode
                          ? "Query Comparison"
                          : `${comparison.sourceTable} vs ${comparison.targetTable}`}
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs rounded-full">
                      Completed
                    </Badge>
                  </CardTitle>
                  <div className="text-sm text-gray-600">
                    {comparison.sourceProfile} → {comparison.targetProfile}
                  </div>
                  {!comparison.isQueryMode && comparison.comparisonKey && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-gray-700 mb-1">Comparison Key:</div>
                      <div className="bg-white border rounded-lg p-2 text-xs font-mono text-gray-800">
                        {comparison.comparisonKey.type === "PRIMARY"
                          ? "PRIMARY KEY"
                          : comparison.comparisonKey.columns?.join(", ") || "Custom Key"}
                      </div>
                    </div>
                  )}
                  {comparison.isQueryMode && comparison.query && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-gray-700 mb-1">Query:</div>
                      <div className="bg-white border rounded-lg p-2 text-xs font-mono text-gray-800 max-h-16 overflow-y-auto">
                        {comparison.query.length > 100 ? `${comparison.query.substring(0, 100)}...` : comparison.query}
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      {
                        key: "only_in_source",
                        label: "Source Only",
                        count: comparison.results!.summary.only_in_source,
                        color: "bg-blue-50 text-blue-700 border-blue-200",
                      },
                      {
                        key: "only_in_target",
                        label: "Target Only",
                        count: comparison.results!.summary.only_in_target,
                        color: "bg-orange-50 text-orange-700 border-orange-200",
                      },
                      {
                        key: "different",
                        label: "Different",
                        count: comparison.results!.summary.different,
                        color: "bg-red-50 text-red-700 border-red-200",
                      },
                      {
                        key: "identical",
                        label: "Identical",
                        count: comparison.results!.summary.identical,
                        color: "bg-green-50 text-green-700 border-green-200",
                      },
                    ].map(({ key, label, count, color }) => (
                      <Card
                        key={key}
                        className={`cursor-pointer hover:border-gray-400 transition-colors ${color} border rounded-2xl`}
                        onClick={() => showDetailedResults(comparison, key)}
                      >
                        <CardContent className="p-3 text-center">
                          <div className="text-lg font-bold">{count.toLocaleString()}</div>
                          <div className="text-xs font-medium">{label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>
                        {(
                          comparison.results!.summary.only_in_source +
                          comparison.results!.summary.only_in_target +
                          comparison.results!.summary.different +
                          comparison.results!.summary.identical
                        ).toLocaleString()}{" "}
                        total records
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {(() => {
                          const total =
                            comparison.results!.summary.only_in_source +
                            comparison.results!.summary.only_in_target +
                            comparison.results!.summary.different +
                            comparison.results!.summary.identical
                          const matchRate = total > 0 ? (comparison.results!.summary.identical / total) * 100 : 0
                          return matchRate.toFixed(1)
                        })()}% match
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}
