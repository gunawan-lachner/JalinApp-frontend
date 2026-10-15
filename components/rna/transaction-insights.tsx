"use client"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts"
import { Activity, CheckCircle2, XCircle, Clock, ArrowRight, Expand, Waves } from "lucide-react"
import type { Transaction, TransactionFlow } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { TransactionFlowModal } from "./transaction-flow-modal"

interface TransactionInsightsProps {
  transactions: Transaction[]
  totalTransactions: number
  dateRange: string
  isLoading: boolean
}

// Helper function to format amount
const formatAmount = (amount: number) => {
  if (amount === 0) return "Rp0.00"
  return `Rp${(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// Helper function to format date for charts
const formatDateForChart = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return dateString
  }
}

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-white p-2 shadow-sm">
        <div className="text-sm font-medium">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-2 text-xs">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border bg-white p-2 shadow-sm">
        <div className="text-sm font-medium">{data.name}</div>
        <div className="text-xs text-gray-500">
          Value: <span className="font-medium">{data.value}</span>
        </div>
        <div className="text-xs text-gray-500">
          Percentage: <span className="font-medium">{(data.percent * 100).toFixed(2)}%</span>
        </div>
      </div>
    )
  }
  return null
}

// Custom Label for Pie Chart slices
const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const radius = outerRadius + 20 // Position labels slightly outside the pie
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  // Only show label if percentage is significant enough to avoid clutter
  if (percent * 100 > 5) {
    return (
      <text
        x={x}
        y={y}
        fill="currentColor" // Use current color for text
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${name} (${(percent * 100).toFixed(1)}%)`}
      </text>
    )
  }
  return null
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

export function TransactionInsights({
  transactions,
  totalTransactions,
  dateRange,
  isLoading,
}: TransactionInsightsProps) {
  const [showAllFlowsModal, setShowAllFlowsModal] = useState(false)

  const {
    successCount,
    failedCount,
    successRate,
    errorRate,
    peakHour,
    transactionVolumeData,
    hourlyDistributionData,
    dayOfWeekPerformanceData,
    amountDistributionData,
    topAcquirersData,
    topIssuersData,
    resultCodeDistributionData,
    transactionFlowData,
  } = useMemo(() => {
    if (isLoading || transactions.length === 0) {
      return {
        successCount: 0,
        failedCount: 0,
        successRate: 0,
        errorRate: 0,
        peakHour: "N/A",
        transactionVolumeData: [],
        hourlyDistributionData: [],
        dayOfWeekPerformanceData: [],
        amountDistributionData: [],
        topAcquirersData: [],
        topIssuersData: [],
        resultCodeDistributionData: [],
        transactionFlowData: [],
      }
    }

    let success = 0
    let failed = 0
    const hourlyCounts: { [key: string]: number } = {}
    const dailyCounts: { [key: string]: { total: number; success: number; failed: number } } = {}
    const dayOfWeekCounts: { [key: string]: { success: number; failed: number } } = {
      Sunday: { success: 0, failed: 0 },
      Monday: { success: 0, failed: 0 },
      Tuesday: { success: 0, failed: 0 },
      Wednesday: { success: 0, failed: 0 },
      Thursday: { success: 0, failed: 0 },
      Friday: { success: 0, failed: 0 },
      Saturday: { success: 0, failed: 0 },
    }
    const amountRanges: { [key: string]: { total: number; success: number; failed: number } } = {
      "0-100K": { total: 0, success: 0, failed: 0 },
      "100K-500K": { total: 0, success: 0, failed: 0 },
      "500K-1M": { total: 0, success: 0, failed: 0 },
      "1M-5M": { total: 0, success: 0, failed: 0 },
      ">5M": { total: 0, success: 0, failed: 0 },
    }
    const acquirerCounts: { [key: string]: number } = {}
    const issuerCounts: { [key: string]: number } = {}
    const categorizedResultCodeCounts: { [key: string]: number } = {
      "Success (0)": 0,
      "Approved (61)": 0,
      Errors: 0,
    }
    const transactionFlowsRaw: {
      [key: string]: {
        total: number
        success: number
        totalAmount: number
        acquirerFullName: string
        issuerFullName: string
      }
    } = {}

    transactions.forEach((trx) => {
      const isSuccess = trx.Result === 0 || trx.Result === 61
      if (isSuccess) {
        success++
      } else {
        failed++
      }

      // Hourly Distribution
      const date = new Date(trx["Date n Time"])
      const hour = date.getHours().toString().padStart(2, "0") + ":00"
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1

      // Daily Volume
      const dateKey = date.toISOString().split("T")[0]
      if (!dailyCounts[dateKey]) {
        dailyCounts[dateKey] = { total: 0, success: 0, failed: 0 }
      }
      dailyCounts[dateKey].total++
      if (isSuccess) {
        dailyCounts[dateKey].success++
      } else {
        dailyCounts[dateKey].failed++
      }

      // Day of Week Performance
      const dayOfWeek = new Date(trx["Date n Time"]).toLocaleDateString("en-US", { weekday: "long" })
      if (dayOfWeekCounts[dayOfWeek]) {
        if (isSuccess) {
          dayOfWeekCounts[dayOfWeek].success++
        } else {
          dayOfWeekCounts[dayOfWeek].failed++
        }
      }

      // Amount Distribution
      const amount = trx.Amount / 100 // Convert to actual currency value
      let amountRange = ""
      if (amount <= 100000) amountRange = "0-100K"
      else if (amount <= 500000) amountRange = "100K-500K"
      else if (amount <= 1000000) amountRange = "500K-1M"
      else if (amount <= 5000000) amountRange = "1M-5M"
      else amountRange = ">5M"

      amountRanges[amountRange].total++
      if (isSuccess) {
        amountRanges[amountRange].success++
      } else {
        amountRanges[amountRange].failed++
      }

      // Top Acquirers
      const acquirerName = trx["Acquier Name"] || "Unknown Acquirer"
      acquirerCounts[acquirerName] = (acquirerCounts[acquirerName] || 0) + 1

      // Top Issuers
      const issuerName = trx["Issuer Name"] || "Unknown Issuer"
      issuerCounts[issuerName] = (issuerCounts[issuerName] || 0) + 1

      // Categorized Result Code Distribution
      if (trx.Result === 0) {
        categorizedResultCodeCounts["Success (0)"]++
      } else if (trx.Result === 61) {
        categorizedResultCodeCounts["Approved (61)"]++
      } else {
        categorizedResultCodeCounts["Errors"]++
      }

      // Transaction Flow
      const acquirer = trx["Acquier Name"] || "Unknown"
      const issuer = trx["Issuer Name"] || "Unknown"
      const flowKey = `${acquirer}->${issuer}`
      if (!transactionFlowsRaw[flowKey]) {
        transactionFlowsRaw[flowKey] = {
          total: 0,
          success: 0,
          totalAmount: 0,
          acquirerFullName: acquirer,
          issuerFullName: issuer,
        }
      }
      transactionFlowsRaw[flowKey].total++
      transactionFlowsRaw[flowKey].totalAmount += trx.Amount // Sum raw amounts
      if (isSuccess) {
        transactionFlowsRaw[flowKey].success++
      }
    })

    const total = success + failed
    const successRateCalc = total > 0 ? (success / total) * 100 : 0
    const errorRateCalc = total > 0 ? (failed / total) * 100 : 0

    // Calculate Peak Hour
    const sortedHourly = Object.entries(hourlyCounts).sort(([, countA], [, countB]) => countB - countA)
    const peakHourValue = sortedHourly.length > 0 ? sortedHourly[0][0] : "N/A"

    // Prepare data for charts
    const transactionVolumeData = Object.entries(dailyCounts)
      .map(([date, counts]) => ({
        date: formatDateForChart(date),
        total: counts.total,
        success: counts.success,
        failed: counts.failed,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const hourlyDistributionData = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, "0") + ":00"
      return { hour, total: hourlyCounts[hour] || 0 }
    })

    const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const dayOfWeekPerformanceData = dayOrder.map((day) => ({
      day,
      success: dayOfWeekCounts[day].success,
      failed: dayOfWeekCounts[day].failed,
    }))

    const amountRangeOrder = ["0-100K", "100K-500K", "500K-1M", "1M-5M", ">5M"]
    const amountDistributionData = amountRangeOrder.map((range) => ({
      range,
      total: amountRanges[range].total,
      success: amountRanges[range].success,
      failed: amountRanges[range].failed,
    }))

    const topAcquirersData = Object.entries(acquirerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10

    const topIssuersData = Object.entries(issuerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10

    const resultCodeDistributionData = Object.entries(categorizedResultCodeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const rawTransactionFlowData: TransactionFlow[] = Object.entries(transactionFlowsRaw).map(([key, counts]) => {
      const [source, target] = key.split("->")
      const successRate = counts.total > 0 ? (counts.success / counts.total) * 100 : 0
      const averageAmount = counts.total > 0 ? counts.totalAmount / counts.total / 100 : 0 // Convert to actual currency
      return {
        source,
        target,
        transactions: counts.total,
        successRate: Number.parseFloat(successRate.toFixed(2)),
        averageAmount: Number.parseFloat(averageAmount.toFixed(2)),
        messageType: "Unknown", // Placeholder, will be removed from UI as per request
        acquirerFullName: counts.acquirerFullName,
        issuerFullName: counts.issuerFullName,
        isHighVolume: false, // Will be set after sorting
        isLowSuccessRate: successRate < 70, // Example threshold
      }
    })

    // Determine high volume flows (e.g., top 10% of flows by transaction count)
    const sortedByVolume = [...rawTransactionFlowData].sort((a, b) => b.transactions - a.transactions)
    const highVolumeThresholdIndex = Math.ceil(sortedByVolume.length * 0.1) // Top 10%
    for (let i = 0; i < highVolumeThresholdIndex; i++) {
      const flow = rawTransactionFlowData.find(
        (f) => f.source === sortedByVolume[i].source && f.target === sortedByVolume[i].target,
      )
      if (flow) {
        flow.isHighVolume = true
      }
    }

    return {
      successCount: success,
      failedCount: failed,
      successRate: successRateCalc,
      errorRate: errorRateCalc,
      peakHour: peakHourValue,
      transactionVolumeData,
      hourlyDistributionData,
      dayOfWeekPerformanceData,
      amountDistributionData,
      topAcquirersData,
      topIssuersData,
      resultCodeDistributionData,
      transactionFlowData: rawTransactionFlowData,
    }
  }, [transactions, isLoading])

  // Define colors for categorized result codes
  const RESULT_CODE_COLORS: { [key: string]: string } = {
    "Success (0)": "#82ca9d", // Green for success
    "Approved (61)": "#8884d8", // A different shade for approved
    Errors: "#ff7300", // Orange for errors
  }

  const getResultCodeColor = (categoryName: string) => {
    return RESULT_CODE_COLORS[categoryName] || "#cccccc" // Fallback color
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-2xl shadow-sm border-0 h-32">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
            </CardContent>
          </Card>
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={`chart-skeleton-${i}`} className="rounded-2xl shadow-sm border-0 col-span-1 md:col-span-2 h-80">
            <CardHeader className="pb-4">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)] flex items-center justify-center">
              <div className="h-full w-full bg-gray-100 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl shadow-sm border-0 bg-blue-50 border-blue-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-blue-700">Total Transactions</CardTitle>
              <div className="text-3xl font-bold text-gray-800 mt-2">{totalTransactions.toLocaleString()}</div>
              <p className="text-xs text-blue-600 mt-1">Local Environment</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-green-50 border-green-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-green-700">Success Rate</CardTitle>
              <div className="text-3xl font-bold text-gray-800 mt-2">{successRate.toFixed(1)}%</div>
              <p className="text-xs text-green-600 mt-1">{successCount.toLocaleString()} successful transactions</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-red-50 border-red-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-red-700">Error Rate</CardTitle>
              <div className="text-3xl font-bold text-gray-800 mt-2">{errorRate.toFixed(1)}%</div>
              <p className="text-xs text-red-600 mt-1">{failedCount.toLocaleString()} failed transactions</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-purple-50 border-purple-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-purple-700">Peak Hour</CardTitle>
              <div className="text-3xl font-bold text-gray-800 mt-2">{peakHour}</div>
              <p className="text-xs text-purple-600 mt-1">
                {hourlyDistributionData.find((d) => d.hour === peakHour)?.total.toLocaleString() || 0} transactions
              </p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Volume */}
        <Card className="rounded-2xl shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">Transaction Volume</CardTitle>
            <p className="text-sm text-gray-600">Daily transaction count with success/failure breakdown</p>
            <span className="text-xs text-gray-500">{dateRange}</span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={transactionVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={formatDateForChart} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="success" stroke="#82ca9d" name="Success" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failed" stroke="#ff7300" name="Failed" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transaction Flow (Simplified Representation) */}
        <Card className="rounded-2xl shadow-sm border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">Transaction Flow</CardTitle>
              <p className="text-sm text-gray-600">Acquirer to Issuer transaction routing</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAllFlowsModal(true)}>
                <Expand className="h-4 w-4 mr-2" /> Expand
              </Button>
              {/* Removed Filter Button */}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {transactionFlowData.length > 0 ? (
              transactionFlowData.slice(0, 4).map((flow, index) => (
                <div
                  key={index}
                  className={`relative flex items-center px-4 py-3 border rounded-2xl bg-white shadow-sm overflow-hidden 
                  ${flow.isLowSuccessRate ? "border-l-4 border-red-500" : flow.successRate >= 90 ? "border-l-4 border-green-500" : flow.isHighVolume ? "border-l-4 border-blue-500" : "border-gray-200"}
                  `}
                >
                  <div className="flex items-center space-x-3 flex-grow">
                    <div
                      className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold 
                      ${flow.isHighVolume ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"}
                    `}
                    >
                      {getInitials(flow.source)}
                      <span className="sr-only">{flow.acquirerFullName}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <div
                      className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold 
                      ${flow.isLowSuccessRate ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}
                    `}
                    >
                      {getInitials(flow.target)}
                      <span className="sr-only">{flow.issuerFullName}</span>
                    </div>
                    <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] items-baseline gap-x-2">
                      <div className="font-bold text-gray-800 text-lg flex-shrink-0">
                        {flow.transactions.toLocaleString()}
                      </div>
                      <div
                        className={`font-semibold text-md flex-shrink-0 text-right ${flow.successRate < 70 ? "text-red-600" : "text-green-600"}`}
                      >
                        {flow.successRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 truncate">{flow.acquirerFullName}</div>
                      <div className="text-xs text-gray-500 truncate text-right">{flow.issuerFullName}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 ml-4 text-xs font-medium">
                    {flow.isHighVolume && (
                      <div className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-blue-700">
                        <Waves className="mr-1 h-3 w-3" /> High Volume
                      </div>
                    )}
                    {flow.averageAmount > 0 && (
                      <div className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-700">
                        Avg: {formatAmount(flow.averageAmount)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">No transaction flow data available.</div>
            )}
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card className="rounded-2xl shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">Hourly Distribution</CardTitle>
            <p className="text-sm text-gray-600">Transaction volume by hour of day</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Day of Week Performance */}
        <Card className="rounded-2xl shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">Day of Week Performance</CardTitle>
            <p className="text-sm text-gray-600">Success vs. failure by day of week</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dayOfWeekPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="success" fill="#82ca9d" stackId="a" name="Success" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill="#ff7300" stackId="a" name="Failed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Amount Distribution */}
        <Card className="rounded-2xl shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">Amount Distribution</CardTitle>
            <p className="text-sm text-gray-600">Transactions by amount range</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={amountDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis dataKey="range" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" name="Total" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Acquirers */}
        <Card className="rounded-2xl shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">Top Acquirers</CardTitle>
            <p className="text-sm text-gray-600">Transaction count by acquirer</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topAcquirersData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#82ca9d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Issuers */}
        <Card className="rounded-2xl shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">Top Issuers</CardTitle>
            <p className="text-sm text-gray-600">Transaction count by issuer</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topIssuersData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#ffc658" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Result Code Distribution (Categorized) */}
        <Card className="rounded-2xl shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">Result Code Distribution</CardTitle>
            <p className="text-sm text-gray-600">Categorized distribution by transaction result code</p>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resultCodeDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {resultCodeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getResultCodeColor(entry.name)} />
                  ))}
                  <Label
                    value={`${((resultCodeDistributionData.reduce((sum, entry) => sum + entry.value, 0) / totalTransactions) * 100).toFixed(1)}%`}
                    position="center"
                    className="font-bold text-xl"
                  />
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Flow Modal */}
      <TransactionFlowModal
        isOpen={showAllFlowsModal}
        onClose={() => setShowAllFlowsModal(false)}
        flows={transactionFlowData}
        allAcquirers={Array.from(new Set(transactions.map((t) => t["Acquier Name"]))).filter(Boolean) as string[]}
        allIssuers={Array.from(new Set(transactions.map((t) => t["Issuer Name"]))).filter(Boolean) as string[]}
      />
    </div>
  )
}
