"use client"

import { CardTitle } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowRight, Waves } from "lucide-react"
import type { TransactionFlow } from "@/lib/types"

interface TransactionFlowModalProps {
  isOpen: boolean
  onClose: () => void
  flows: TransactionFlow[]
  allAcquirers: string[]
  allIssuers: string[]
}

// Helper to get initials, ignoring bracketed codes like [ATMC]
const getInitials = (name: string) => {
  if (!name) return "??"

  // Remove [CODE] part and trim whitespace
  const cleanedName = name.replace(/\[.*?\]\s*/, "").trim()

  if (!cleanedName) return "??" // Handle cases where only [CODE] was present

  // Split by space or hyphen, and filter out empty strings
  const parts = cleanedName.split(/[\s-]+/).filter(Boolean)

  if (parts.length === 0) return "??"

  // Take the first significant part (e.g., "BMRI" from "BMRI - EFTS" or "Bank" from "Bank BRI")
  const primaryName = parts[0]

  // Get the first two letters
  return primaryName.substring(0, 2).toUpperCase()
}

// Helper function to format amount
const formatAmount = (amount: number) => {
  if (amount === 0) return "Rp0.00"
  return `Rp${(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function TransactionFlowModal({ isOpen, onClose, flows }: TransactionFlowModalProps) {
  const filteredFlows = flows

  const totalFlowPairs = filteredFlows.length
  const totalFilteredTransactions = filteredFlows.reduce((sum, flow) => sum + flow.transactions, 0)
  const averageTransactionsPerRoute = totalFlowPairs > 0 ? totalFilteredTransactions / totalFlowPairs : 0

  const busiestRoute = useMemo(() => {
    if (filteredFlows.length === 0) return null
    return filteredFlows.reduce((prev, current) => (prev.transactions > current.transactions ? prev : current))
  }, [filteredFlows])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[90vw] rounded-xl p-6">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-800">Transaction Flow Analysis</DialogTitle>
          <DialogDescription className="text-gray-600">
            Detailed view of transaction routing between acquirers and issuers.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          <Card className="rounded-xl shadow-sm border-0 bg-blue-50 border-blue-200 p-4 text-center">
            <CardTitle className="text-sm font-medium text-blue-700">Total Flow Pairs</CardTitle>
            <div className="text-3xl font-bold text-gray-800 mt-2">{totalFlowPairs}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-0 bg-green-50 border-green-200 p-4 text-center">
            <CardTitle className="text-sm font-medium text-green-700">Busiest Route</CardTitle>
            <div className="text-md font-bold text-gray-800 mt-2">
              {busiestRoute ? `${busiestRoute.acquirerFullName} → ${busiestRoute.issuerFullName}` : "N/A"}
            </div>
            {busiestRoute && (
              <p className="text-xs text-green-600 mt-1">{busiestRoute.transactions.toLocaleString()} transactions</p>
            )}
          </Card>
          <Card className="rounded-xl shadow-sm border-0 bg-purple-50 border-purple-200 p-4 text-center">
            <CardTitle className="text-sm font-medium text-purple-700">Avg Transactions/Route</CardTitle>
            <div className="text-3xl font-bold text-gray-800 mt-2">{averageTransactionsPerRoute.toFixed(0)}</div>
          </Card>
        </div>

        <div>
          {filteredFlows.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No transaction flow data available.</div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFlows.map((flow, index) => (
                  <div
                    key={index}
                    className={`relative flex items-center p-4 border rounded-2xl bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-300 overflow-hidden 
                    ${
                      flow.isLowSuccessRate
                        ? "border-l-4 border-red-500"
                        : flow.isHighVolume
                          ? "border-l-4 border-blue-500"
                          : flow.successRate >= 70
                            ? "border-l-4 border-green-500"
                            : // Added green border for high success rate
                              "border-gray-200"
                    }
                    `}
                  >
                    <div className="flex items-center space-x-4 flex-grow">
                      <div
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center text-md font-bold 
                        ${flow.isHighVolume ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"}
                      `}
                      >
                        {getInitials(flow.source)}
                        <span className="sr-only">{flow.acquirerFullName}</span>
                      </div>
                      <ArrowRight className="h-6 w-6 text-gray-400" />
                      <div
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center text-md font-bold 
                        ${flow.isLowSuccessRate ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}
                      `}
                      >
                        {getInitials(flow.target)}
                        <span className="sr-only">{flow.issuerFullName}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between w-full gap-2">
                          <div className="text-lg font-bold text-gray-800 flex-shrink-0">
                            {flow.transactions.toLocaleString()} Transactions
                          </div>
                          <div
                            className={`text-md font-semibold flex-shrink-0 ${flow.successRate < 70 ? "text-red-600" : "text-green-600"}`}
                          >
                            {flow.successRate.toFixed(1)}% Success Rate
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${flow.successRate}%`,
                              backgroundColor: flow.successRate < 70 ? "#ef4444" : "#22c55e", // red or green
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span className="truncate">{flow.acquirerFullName}</span>
                          <span className="truncate">{flow.issuerFullName}</span>
                        </div>
                        <div className="flex gap-2 mt-2 justify-end">
                          {flow.isHighVolume && (
                            <div className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              <Waves className="mr-1 h-3 w-3" /> High Volume
                            </div>
                          )}
                          <div className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                            Avg: {formatAmount(flow.averageAmount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
