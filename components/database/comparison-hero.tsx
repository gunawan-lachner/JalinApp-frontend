import { GitCompare } from "lucide-react"
import type { ConnectionProfile, TableComparison } from "@/lib/types"

interface ComparisonHeroProps {
  connectionProfiles: ConnectionProfile[]
  tableComparisons: TableComparison[]
  overallStats: {
    matchRate: number
    totalRecords: number
    identical: number
    different: number
    only_in_source: number
    only_in_target: number
  } | null
}

export function ComparisonHero({ connectionProfiles, tableComparisons, overallStats }: ComparisonHeroProps) {
  const hasQueryMode = tableComparisons.some((comp) => comp.isQueryMode)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 rounded-2xl p-3">
              <GitCompare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                {hasQueryMode ? "Database Query Comparison" : "Database Table Comparison"}
              </h1>
              <p className="text-gray-600">
                {hasQueryMode
                  ? "Compare custom SQL queries across different databases to identify differences and inconsistencies"
                  : "Compare multiple tables across different databases to identify differences and inconsistencies"}
              </p>
            </div>
          </div>
        </div>
        {overallStats && (
          <div className="bg-white border border-blue-200 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{overallStats.matchRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Overall Match Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              {overallStats.totalRecords.toLocaleString()} records analyzed
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
