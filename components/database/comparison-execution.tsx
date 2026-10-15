"use client"

import { RefreshCw, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { TableComparison } from "@/lib/types"

interface ComparisonExecutionProps {
  tableComparisons: TableComparison[]
  isRunningComparisons: boolean
  overallProgress: number
  runAllComparisons: () => void
  setCurrentStep: (step: number) => void
}

export function ComparisonExecution({
  tableComparisons,
  isRunningComparisons,
  overallProgress,
  runAllComparisons,
  setCurrentStep,
}: ComparisonExecutionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        {/* Simplified Running Comparisons section */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <h3 className="text-xl font-semibold text-gray-800">Running Comparisons</h3>
          <p className="text-gray-600">
            Analyzing {tableComparisons.length} table comparison
            {tableComparisons.length !== 1 ? "s" : ""}
          </p>
        </div>

        {isRunningComparisons && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-lg text-gray-600">Processing comparisons...</span>
            </div>
            <div className="max-w-md mx-auto">
              <Progress value={overallProgress} className="h-3 rounded-full" />
              <div className="text-sm text-gray-500 text-center mt-2">{overallProgress.toFixed(0)}% complete</div>
            </div>
          </div>
        )}
      </div>

      {/* Live Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {tableComparisons.map((comparison) => (
          <Card key={comparison.id} className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-sm">
                  {comparison.isQueryMode
                    ? "Query Comparison"
                    : `${comparison.sourceTable} vs ${comparison.targetTable}`}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {comparison.sourceProfile} → {comparison.targetProfile}
              </div>
              {!comparison.isQueryMode && comparison.comparisonKey && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-700 mb-1">Comparison Key:</div>
                  <div className="bg-gray-50 rounded-lg p-2 text-xs font-mono text-gray-800">
                    {comparison.comparisonKey.type === "PRIMARY"
                      ? "PRIMARY KEY"
                      : comparison.comparisonKey.columns?.join(", ") || "CUSTOM KEY"}
                  </div>
                </div>
              )}
              {comparison.isQueryMode && comparison.query && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-700 mb-1">Query:</div>
                  <div className="bg-gray-50 rounded-lg p-2 text-xs font-mono text-gray-800 max-h-20 overflow-y-auto">
                    {comparison.query}
                  </div>
                </div>
              )}
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Buttons moved to the bottom and styled for same size and spacing */}
      {!isRunningComparisons && (
        <div className="flex justify-center space-x-4 mt-6">
          <Button
            onClick={() => setCurrentStep(1)}
            variant="outline"
            className="rounded-xl px-8 py-4 text-lg w-48" // Fixed width for consistent size
          >
            Back to Setup
          </Button>
          <Button
            onClick={runAllComparisons}
            className="bg-green-600 hover:bg-green-700 px-8 py-4 text-lg rounded-2xl w-48" // Fixed width for consistent size
          >
            <Zap className="h-5 w-5 mr-2" />
            Start Analysis
          </Button>
        </div>
      )}
    </div>
  )
}
