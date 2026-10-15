"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useRnaApi } from "@/hooks/useRnaApi"
import type { BinRoutingRoute, SimpleIdName } from "@/lib/types"
import { RefreshCw, ShieldCheck, ClipboardPaste, ChevronDownIcon, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

// Local SearchSelect with identical styling to routing page
function SearchSelect({
  items,
  value,
  onChange,
  placeholder,
  triggerClassName = "rounded-2xl border border-gray-300 w-full justify-between",
  format = "name",
  contentClassName = "p-0 w-[--radix-popover-trigger-width] rounded-xl",
}: {
  items: { id: number; name: string }[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  triggerClassName?: string
  format?: "name" | "id-name"
  contentClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = items.find((i) => String(i.id) === String(value))
  const label = selected ? (format === "id-name" ? `${selected.id} - ${selected.name}` : selected.name) : ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={triggerClassName}>
          <span className="truncate text-left">{label || placeholder || "Select"}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={contentClassName}>
        <Command className="rounded-xl">
          <CommandInput
            className="my-2 ring-0 outline-none border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-transparent focus-visible:border-transparent focus-visible:ring-offset-0"
            placeholder="Search..."
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map((item, idx) => {
                const isSelected = String(item.id) === String(value)
                return (
                  <CommandItem
                    key={`${item.id}-${idx}`}
                    onSelect={() => {
                      onChange(String(item.id))
                      setOpen(false)
                    }}
                    className={isSelected ? "bg-blue-50 text-blue-700" : ""}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{format === "id-name" ? `${item.id} - ${item.name}` : item.name}</span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Helpers copied from routing-simulation/page.tsx
function parseTransactionAttributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== "string") return out
  const trimmed = raw.trim()
  if (!trimmed) return out
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed)
      Object.keys(obj).forEach((k) => {
        out[k] = String(obj[k])
      })
      return out
    } catch {}
  }
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed) as Array<Record<string, any>>
      for (const item of arr) {
        const field = item?.field
        const content = item?.content
        if (typeof field === "string") {
          out[field] = String(content ?? "")
        }
      }
      return out
    } catch {}
  }
  const lines = trimmed.split(/\r?\n/)
  for (const line of lines) {
    const parts = line.split(",")
    if (parts.length >= 3) {
      const field = parts[1]?.trim()
      const content = parts.slice(2).join(",").trim()
      if (field) out[field] = content
    }
  }
  return out
}

function normalizeToCsvIdFieldContent(raw: string): string {
  if (!raw || typeof raw !== "string") return ""
  const trimmed = raw.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>
      const lines: string[] = ["ID,Field,Content"]
      let i = 1
      for (const [field, value] of Object.entries(obj)) {
        lines.push(`${i++},${field},${String(value)}`)
      }
      return lines.join("\n")
    } catch {}
  }
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed) as Array<Record<string, any>>
      const lines: string[] = ["ID,Field,Content"]
      for (const item of arr) {
        if (!item || Object.keys(item).length === 0) continue
        const id = item.id ?? ""
        const field = item.field ?? ""
        const content = item.content ?? ""
        lines.push(`${String(id)},${String(field)},${String(content)}`)
      }
      if (lines.length > 1) return lines.join("\n")
    } catch {}
  }
  const lines = trimmed.split(/\r?\n/)
  const out: string[] = ["ID,Field,Content"]
  let idCounter = 1
  const isHeader = (line: string) => /^id\s*,\s*field\s*,\s*content\s*$/i.test(line.trim())
  for (const line of lines) {
    const l = line.trim()
    if (!l) continue
    if (isHeader(l)) continue
    const parts = l.split(",")
    let id = ""
    let field = ""
    let content = ""
    if (parts.length >= 3) {
      id = parts[0].trim()
      field = parts[1].trim()
      content = parts.slice(2).join(",").trim()
      if (!/^\d+$/.test(id)) id = String(idCounter++)
    } else if (parts.length === 2) {
      id = String(idCounter++)
      field = parts[0].trim()
      content = parts[1].trim()
    } else {
      continue
    }
    out.push(`${id},${field},${content}`)
  }
  return out.join("\n")
}

function createRuleEvaluator(rule: string, context: Record<string, string>) {
  return () => {
    try {
      let evaluatedRule = rule
      evaluatedRule = evaluatedRule.replace(/SUBSTR\{([^,]+),\s*(\d+),\s*(\d+)\}/g, (_, str, start, length) => {
        return `(${str}).substring(${start}, ${Number.parseInt(start) + Number.parseInt(length)})`
      })
      evaluatedRule = evaluatedRule.replace(/[{}]/g, (m) => "\\" + m)
      const placeholders: Record<string, string> = {}
      let idx = 0
      const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length)
      sortedKeys.forEach((key) => {
        const ph = `__PLACEHOLDER_${idx++}__`
        placeholders[key] = ph
        const escaped = key.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")
        const rx = new RegExp(`\\b${escaped}\\b`, "g")
        evaluatedRule = evaluatedRule.replace(rx, ph)
      })
      evaluatedRule = evaluatedRule.replace(/(__PLACEHOLDER_\d+__)\s*==\s*\[([^\]]+)\]/g, (_m, ph, arrayValues) => {
        const originalKey = Object.keys(placeholders).find((k) => placeholders[k] === ph)!
        const quotedValue = JSON.stringify(context[originalKey])
        const values = arrayValues.split(",").map((v: string) => v.trim().replace(/^["']|["']$/g, ""))
        if (values.length === 1) {
          let v = values[0]
          if (/^\d+$/.test(v)) v = String(Number.parseInt(v, 10)).padStart(v.length, "0")
          return `${quotedValue} == "${v}"`
        }
        const quoted = values.map((v: string) => JSON.stringify(/^\d+$/.test(v) ? String(Number.parseInt(v, 10)).padStart(v.length, "0") : v))
        return `[${quoted.join(",")}].indexOf(${quotedValue}) >= 0`
      })
      evaluatedRule = evaluatedRule.replace(/(__PLACEHOLDER_\d+__)\s+in\s+\[([^\]]+)\]/g, (_m, ph, arrayValues) => {
        const originalKey = Object.keys(placeholders).find((k) => placeholders[k] === ph)!
        const values = arrayValues.split(",").map((v: string) => JSON.stringify(v.trim().replace(/^["']|["']$/g, "")))
        return `[${values.join(",")}].indexOf(${JSON.stringify(context[originalKey])}) >= 0`
      })
      evaluatedRule = evaluatedRule.replace(/(__PLACEHOLDER_\d+__)\s*!=\s*\[([^\]]+)\]/g, (_m, ph, arrayValues) => {
        const originalKey = Object.keys(placeholders).find((k) => placeholders[k] === ph)!
        const values = arrayValues.split(",").map((v: string) => JSON.stringify(v.trim().replace(/^["']|["']$/g, "")))
        return `[${values.join(",")}].indexOf(${JSON.stringify(context[originalKey])}) < 0`
      })
      Object.keys(placeholders).forEach((key) => {
        const rx = new RegExp(placeholders[key], "g")
        evaluatedRule = evaluatedRule.replace(rx, JSON.stringify(context[key]))
      })
      evaluatedRule = evaluatedRule.replace(/\[([^\]]+)\]/g, (m, values) => {
        const alreadyQuoted = values.split(",").some((v: string) => v.trim().startsWith('"') && v.trim().endsWith('"'))
        if (alreadyQuoted) return m
        const arr = values
          .split(",")
          .map((v: string) => v.trim().replace(/^["']|["']$/g, ""))
          .map((v: string) => `"${v}"`)
        return `[${arr.join(",")}]`
      })
      evaluatedRule = evaluatedRule.replace(/([=!<>]=)\s*(\d+)\b/g, (_m, op, num) => {
        const padded = String(Number.parseInt(num, 10)).padStart(num.length, "0")
        return `${op} "${padded}"`
      })
      const TMP_EQ = "__TMP_EQ__"
      const TMP_NEQ = "__TMP_NEQ__"
      evaluatedRule = evaluatedRule.replace(/===/g, TMP_EQ).replace(/!==/g, TMP_NEQ)
      evaluatedRule = evaluatedRule.replace(/==/g, "===").replace(/!=/g, "!==")
      evaluatedRule = evaluatedRule.replace(new RegExp(TMP_EQ, "g"), "===")
      evaluatedRule = evaluatedRule.replace(new RegExp(TMP_NEQ, "g"), "!==")
      const fn = new Function("return " + evaluatedRule)
      return Boolean(fn())
    } catch {
      return false
    }
  }
}

function evaluateRule(rule: string, internalData: Record<string, string>) {
  if (!rule || !internalData) return false
  const ctx: Record<string, string> = {}
  Object.keys(internalData).forEach((k) => (ctx[k] = String(internalData[k])))
  const references = rule.match(/IN\.[A-Z_]+|OT\.[A-Z_]+|IR\.[A-Z_]+/g) || []
  references.forEach((attr) => {
    if (!(attr in ctx)) ctx[attr] = ""
  })
  const evaluator = createRuleEvaluator(rule, ctx)
  return evaluator()
}

function deriveBinPrefix(internalData: Record<string, string>): string {
  const prefer = String(internalData["IN.PAN_PREFIX"] || "").replace(/\D/g, "")
  if (prefer.length >= 6) return prefer.slice(0, 6)
  const candidates = [internalData["IN.PAN"], internalData["MASK_PAN"], internalData["DUMMY_PAN"]].filter(Boolean) as string[]
  for (const cand of candidates) {
    const digits = (cand || "").replace(/\D/g, "")
    if (digits.length >= 6) return digits.slice(0, 6)
  }
  return ""
}

function simulateRoutingWithGateways(routes: any[], internalData: Record<string, string>, binValidGatewayIds: string[]) {
  const txnGateway = String(internalData["IN.GATEWAY_ID"] ?? "")
  return routes.map((r) => {
    const rule = String(r.rule ?? "")
    const isMatch = evaluateRule(rule, internalData)
    if (!isMatch) {
      return { ...r, isMatch: false, match_status: 0, status_reason: "Rule not matched" }
    }
    const routeGateway = String(r.gateway_id ?? "")
    if (txnGateway && routeGateway && txnGateway === routeGateway) {
      return { ...r, isMatch: true, match_status: 1, status_reason: "1: rule + gateway match" }
    }
    if (routeGateway && binValidGatewayIds.includes(routeGateway)) {
      return { ...r, isMatch: true, match_status: 2, status_reason: "2: rule match + BIN-valid gateway" }
    }
    return { ...r, isMatch: true, match_status: 3, status_reason: "3: rule match but gateway mismatch" }
  })
}

export function RoutingSimulationPanel({
  selectedConnection,
  acquirers,
  routes,
  onApplyResults,
}: {
  selectedConnection: string
  acquirers: SimpleIdName[]
  routes?: BinRoutingRoute[]
  onApplyResults: (routes: BinRoutingRoute[], executedSql: string, executionTimeSec?: number) => void
}) {
  const [acquirerId, setAcquirerId] = useState("")
  const [transactionData, setTransactionData] = useState("")
  const [enableSimulation, setEnableSimulation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 999999
  const [executionTime, setExecutionTime] = useState("0.00")
  const { toast } = useToast()
  const api = useRnaApi()

  // Validation modal state (parity with routing-simulation page)
  type ValidationResult = { routeId: number; rule: string; isValid: boolean; errors: string[]; warnings: string[] }
  type ValidationData = { results: ValidationResult[]; totalErrors: number; totalWarnings: number; totalRules: number }
  type FilterType = "all" | "valid" | "error" | "warning"
  const [validationModalOpen, setValidationModalOpen] = useState(false)
  const [validationData, setValidationData] = useState<ValidationData | null>(null)
  const [validationFilter, setValidationFilter] = useState<FilterType>("all")

  // Syntax validation helpers
  const validateRuleSyntax = (rule: string): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = []
    const warnings: string[] = []
    if (!rule || typeof rule !== "string") return { isValid: false, errors: ["Rule is empty or invalid"], warnings: [] }
    const trimmedRule = rule.trim()
    if (trimmedRule === "") return { isValid: false, errors: ["Rule is empty"], warnings: [] }

    const bracketPairs = [
      { open: "(", close: ")", name: "parentheses" },
      { open: "[", close: "]", name: "brackets" },
      { open: "{", close: "}", name: "braces" },
    ]
    bracketPairs.forEach((pair) => {
      const openCount = (trimmedRule.match(new RegExp("\\" + pair.open, "g")) || []).length
      const closeCount = (trimmedRule.match(new RegExp("\\" + pair.close, "g")) || []).length
      if (openCount !== closeCount) {
        const diff = openCount - closeCount
        if (diff > 0) errors.push(`Unmatched ${pair.name}: ${diff} more opening ${pair.open} than closing ${pair.close}`)
        else errors.push(`Unmatched ${pair.name}: ${Math.abs(diff)} more closing ${pair.close} than opening ${pair.open}`)
      }
    })

    const singleQuoteMatches = trimmedRule.match(/'/g) || []
    const doubleQuoteMatches = trimmedRule.match(/"/g) || []
    if (singleQuoteMatches.length % 2 !== 0) errors.push(`Unmatched single quotes: ${singleQuoteMatches.length} quotes found (must be even number)`)
    if (doubleQuoteMatches.length % 2 !== 0) errors.push(`Unmatched double quotes: ${doubleQuoteMatches.length} quotes found (must be even number)`)

    const invalidQuotePatterns = [
      { pattern: /''/g, name: "empty single quotes" },
      { pattern: /""/g, name: "empty double quotes" },
      { pattern: /'''/g, name: "triple single quotes" },
      { pattern: /"""/g, name: "triple double quotes" },
      { pattern: /''''/g, name: "quadruple single quotes" },
      { pattern: /""""/g, name: "quadruple double quotes" },
    ]
    invalidQuotePatterns.forEach(({ pattern, name }) => {
      const matches = trimmedRule.match(pattern)
      if (matches) errors.push(`Invalid ${name} found: ${matches.length} occurrences`)
    })

    const logicalOperatorErrors: string[] = []
    const incompleteAnd = trimmedRule.match(/&(?!&)/g)
    if (incompleteAnd) logicalOperatorErrors.push(`Incomplete AND operator: found ${incompleteAnd.length} single & (should be &&)`)
    const incompleteOr = trimmedRule.match(/\|(?!\|)/g)
    if (incompleteOr) logicalOperatorErrors.push(`Incomplete OR operator: found ${incompleteOr.length} single | (should be ||)`)
    const validAndCount = (trimmedRule.match(/&&/g) || []).length
    const validOrCount = (trimmedRule.match(/\|\|/g) || []).length
    if (validAndCount > 0 || validOrCount > 0) logicalOperatorErrors.length = 0
    errors.push(...logicalOperatorErrors)

    const invalidSingleEquals: string[] = []
    const allEquals = [...trimmedRule.matchAll(/=/g)]
    allEquals.forEach((match) => {
      const index = match.index!
      const isPartOfValidOperator =
        (index > 0 && trimmedRule[index - 1] === "=") ||
        (index < trimmedRule.length - 1 && trimmedRule[index + 1] === "=") ||
        (index > 0 && trimmedRule[index - 1] === "!")
      if (!isPartOfValidOperator) invalidSingleEquals.push(match[0])
    })
    if (invalidSingleEquals.length > 0)
      errors.push(`Invalid comparison operator: found ${invalidSingleEquals.length} single = (should be ==)`)

    const validComparisons = trimmedRule.match(/==|!=|>=|<=|>|</g) || []
    if (validComparisons.length === 0 && trimmedRule.includes("="))
      errors.push("No valid comparison operators found (use ==, !=, >=, <=, >, <)")

    const arrayErrors: string[] = []
    const arrayPattern = /\[([^\]]*)\]/g
    let arrayMatch: RegExpExecArray | null
    while ((arrayMatch = arrayPattern.exec(trimmedRule)) !== null) {
      const arrayContent = arrayMatch[1]
      if (arrayContent.trim() === "") arrayErrors.push(`Empty array found at position ${arrayMatch.index}`)
      else {
        const items = arrayContent.split(",").map((item) => item.trim())
        if (items.some((item) => item === "")) arrayErrors.push(`Invalid array format: empty items found at position ${arrayMatch.index}`)
      }
    }
    errors.push(...arrayErrors)

    const consecutiveOps = trimmedRule.match(/(&&\s*&&|\|\|\s*\|\||==\s*==|!=\s*!=)/g)
    if (consecutiveOps) errors.push(`Consecutive operators found: ${consecutiveOps.join(", ")}`)
    const missingSpaces = trimmedRule.match(/([a-zA-Z0-9_]+)(==|!=|>=|<=|>|<)([a-zA-Z0-9_]+)/g)
    if (missingSpaces) warnings.push("Consider adding spaces around operators for better readability")

    return { isValid: errors.length === 0, errors, warnings }
  }

  const validateAllRules = (routes: any[]): ValidationData => {
    const validationResults: ValidationResult[] = []
    let totalErrors = 0
    let totalWarnings = 0
    routes.forEach((route) => {
      if (route.rule) {
        const validation = validateRuleSyntax(route.rule)
        validationResults.push({
          routeId: route.id,
          rule: route.rule,
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
        })
        totalErrors += validation.errors.length
        totalWarnings += validation.warnings.length
      }
    })
    return { results: validationResults, totalErrors, totalWarnings, totalRules: validationResults.length }
  }

  const getFilteredResults = (): ValidationResult[] => {
    if (!validationData) return []
    switch (validationFilter) {
      case "valid":
        return validationData.results.filter((r) => r.isValid)
      case "error":
        return validationData.results.filter((r) => !r.isValid)
      case "warning":
        return validationData.results.filter((r) => r.warnings.length > 0)
      default:
        return validationData.results
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text || !text.trim()) {
        toast({ title: "Clipboard empty", description: "No text found to paste.", variant: "destructive" })
        return
      }
      const normalized = normalizeToCsvIdFieldContent(text)
      setTransactionData(normalized || text)
      toast({ title: "Pasted", description: "Transaction data pasted from clipboard." })
    } catch {
      toast({
        title: "Paste failed",
        description: "Unable to read clipboard. Please allow clipboard permissions and try again.",
        variant: "destructive",
      })
    }
  }

  const handleExecuteSimulation = async () => {
    if (!selectedConnection || !transactionData.trim()) {
      toast({ title: "Missing Requirements", description: "Select a connection and enter transaction data.", variant: "destructive" })
      return
    }
    try {
      setIsLoading(true)
      const start = performance.now()
      const internalData = parseTransactionAttributes(transactionData)
      if (!enableSimulation) {
        const end = performance.now()
        setExecutionTime(((end - start) / 1000).toFixed(2))
        setIsLoading(false)
        toast({ title: "Simulation Skipped", description: "Enable Simulation to compute match status." })
        return
      }
      const simData = await api.getSimulationRoutes(
        { connection: selectedConnection, acquirer_id: acquirerId ? Number(acquirerId) : undefined, page: 1, pageSize: 999999 },
        (d) => d,
        (err: unknown) => console.error("[sim] routes error", err),
      )
      const routesFromApi = (simData as any)?.routes ?? []
      const executedSql = (simData as any)?.query || ""
      // BIN-valid gateways by prefix
      const binPrefix = deriveBinPrefix(internalData)
      let binValidIds: string[] = []
      if (binPrefix && binPrefix.length === 6) {
        const countryStr = String(internalData["IN.BIN_CARD_BILLING_CURRENCY"] || "").replace(/\D/g, "")
        const maybeCountry = countryStr ? Number(countryStr) : undefined
        const gwData = await api.getBinGatewaysByPrefix(
          { profileId: selectedConnection, pan_prefix: binPrefix, country: maybeCountry },
          (d) => d,
          (err: unknown) => console.error("[sim] gateways by prefix error", err),
        )
        const results = (gwData as any)?.results ?? []
        binValidIds = results.map((g: any) => String(g.id))
      }
      const simulated = simulateRoutingWithGateways(routesFromApi, internalData, binValidIds)
      const end = performance.now()
      const execSec = (end - start) / 1000
      setExecutionTime(execSec.toFixed(2))
      onApplyResults(simulated, executedSql, execSec)
      toast({ title: "Simulation Complete", description: `Evaluated ${simulated.length} routes in ${(((end - start) / 1000).toFixed(2))}s.` })
    } catch (e) {
      console.error("[sim] error", e)
      toast({ title: "Error", description: "Failed to execute simulation.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidateAllRules = async () => {
    if (!selectedConnection) {
      toast({ title: "Select connection", description: "Please choose a DB connection first." })
      return
    }
    setIsValidating(true)
    try {
      const loaded = Array.isArray(routes) ? routes : []
      if (!loaded || loaded.length === 0) {
        toast({
          title: "No Rules",
          description: "Please load rules data first by clicking Load Rules",
          variant: "destructive",
        })
        return
      }
      const data = validateAllRules(loaded)
      setValidationData(data)
      setValidationFilter("all")
      setValidationModalOpen(true)
      toast({
        title: "Validation Complete",
        description: `Validated ${data.totalRules} rules. Found ${data.totalErrors} errors and ${data.totalWarnings} warnings.`,
      })
    } catch (e) {
      console.error("[sim-panel] validate error", e)
      toast({ title: "Error", description: "Failed to validate rules.", variant: "destructive" })
    } finally {
      setIsValidating(false)
    }
  }

  const handleLoadRules = async (params: { page: number; pageSize: number }) => {
    if (!selectedConnection) {
      toast({ title: "Missing Requirements", description: "Select a connection.", variant: "destructive" })
      return
    }
    try {
      setIsLoading(true)
      const start = performance.now()
      const simData = await api.getSimulationRoutes(
        { connection: selectedConnection, acquirer_id: acquirerId ? Number(acquirerId) : undefined, ...params },
        (d) => d,
        (err) => console.error("[sim] routes error", err),
      )
      const routesFromApi = (simData as any)?.routes ?? []
      const executedSql = (simData as any)?.query || ""
      const end = performance.now()
      const execSec = (end - start) / 1000
      setExecutionTime(execSec.toFixed(2))
      onApplyResults(routesFromApi, executedSql, execSec)
      toast({ title: "Rules Loaded", description: `Loaded ${routesFromApi.length} rules.` })
    } catch (e) {
      console.error("[sim] error", e)
      toast({ title: "Error", description: "Failed to load rules.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left - Acquirer & Controls */}
      <Card className="shadow-sm border-0 bg-white rounded-3xl">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Acquirer ID</Label>
              <SearchSelect
                items={(acquirers || []).map((a) => ({ id: Number(a.id), name: String(a.name) }))}
                value={acquirerId}
                onChange={setAcquirerId}
                placeholder="Select acquirer"
                triggerClassName="w-full rounded-2xl border border-gray-300 justify-between"
                format="id-name"
                contentClassName="p-0 w-[--radix-popover-trigger-width] max-h-[400px] overflow-auto rounded-xl shadow-lg"
              />
            </div>

            <div className="flex space-x-3 items-center justify-between">
              <Button
                onClick={enableSimulation ? handleExecuteSimulation : handleValidateAllRules}
                disabled={(enableSimulation ? isLoading : isValidating) || !selectedConnection}
                variant="outline"
                className="rounded-2xl border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
              >
                {enableSimulation ? (
                  isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Simulating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Simulate
                    </>
                  )
                ) : isValidating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Validate Syntax
                  </>
                )}
              </Button>
              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    setCurrentPage(1)
                    handleLoadRules({ page: 1, pageSize })
                  }}
                  disabled={isLoading}
                  className="rounded-2xl bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Load Rules
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center space-x-3">
                <Switch
                  id="enable-simulation"
                  checked={enableSimulation}
                  onCheckedChange={setEnableSimulation}
                  className="data-[state=checked]:bg-green-600"
                />
                <div>
                  <Label htmlFor="enable-simulation" className="text-sm font-medium text-gray-800">
                    Enable Simulation & Validation
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">When disabled, only shows rules data without simulation</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right - Simulation & Validation */}
      <Card className="shadow-sm border-0 bg-white rounded-3xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Simulation & Validation</h3>
            <Badge variant="secondary" className={enableSimulation ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
              {enableSimulation ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <Textarea
            placeholder="Paste Transaction Attributes in CSV format (ID,Field,Content) here..."
            value={transactionData}
            onChange={(e) => setTransactionData(e.target.value)}
            onBlur={() => setTransactionData(normalizeToCsvIdFieldContent(transactionData))}
            className="min-h-[140px] rounded-2xl font-mono text-sm border border-gray-300"
          />
          <div className="flex items-center justify-between">
            <Button variant="link" size="sm" className="text-blue-600 hover:text-blue-700 p-0 h-auto" onClick={() => {
              const sampleData = `ID,Field,Content\n1,IN.PAN_PREFIX,888832\n2,IN.GATEWAY_ID,242\n3,IN.BIN_CARD_BILLING_CURRENCY,360`
              setTransactionData(sampleData)
            }}>
              Load Sample Data
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100"
              onClick={handlePasteFromClipboard}
              title="Paste transaction attributes from clipboard"
              aria-label="Paste from clipboard"
            >
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Rule Syntax Validation Results Modal */}
      <Dialog open={validationModalOpen} onOpenChange={setValidationModalOpen}>
        <DialogContent className="max-w-7xl w-[92vw] rounded-2xl p-0 overflow-hidden border border-gray-200 bg-white">
          <DialogHeader className="px-6 py-4 border-b bg-gray-50/60 backdrop-blur supports-[backdrop-filter]:bg-gray-50/40">
            <DialogTitle className="flex items-center text-xl font-semibold text-gray-900">
              <ShieldCheck className="h-5 w-5 mr-2 text-blue-600" />
              Rule Syntax Validation Results
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Validate routing rules for structural issues and formatting. Filter results and export when ready.
            </DialogDescription>
          </DialogHeader>

          {validationData && (
            <div className="px-6 py-3 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setValidationFilter("all")}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${validationFilter === "all" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    All
                    <span className={`ml-2 inline-flex items-center justify-center rounded-full text-[10px] px-1.5 py-0.5 ${validationFilter === "all" ? "bg-white/20" : "bg-gray-100 text-gray-700"}`}>
                      {validationData.totalRules}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidationFilter("valid")}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${validationFilter === "valid" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    Valid
                    <span className={`ml-2 inline-flex items-center justify-center rounded-full text-[10px] px-1.5 py-0.5 ${validationFilter === "valid" ? "bg-white/20" : "bg-gray-100 text-gray-700"}`}>
                      {validationData.results.filter((r) => r.isValid).length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidationFilter("error")}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${validationFilter === "error" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    Errors
                    <span className={`ml-2 inline-flex items-center justify-center rounded-full text-[10px] px-1.5 py-0.5 ${validationFilter === "error" ? "bg-white/20" : "bg-gray-100 text-gray-700"}`}>
                      {validationData.totalErrors}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidationFilter("warning")}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${validationFilter === "warning" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    Warnings
                    <span className={`ml-2 inline-flex items-center justify-center rounded-full text-[10px] px-1.5 py-0.5 ${validationFilter === "warning" ? "bg-white/20" : "bg-gray-100 text-gray-700"}`}>
                      {validationData.totalWarnings}
                    </span>
                  </button>
                </div>
                <div className="hidden md:flex items-center gap-3 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    {validationData.results.filter((r) => r.isValid).length} valid
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                    {validationData.results.filter((r) => !r.isValid).length} errors
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                    {validationData.results.filter((r) => r.warnings.length > 0).length} warnings
                  </span>
                </div>
              </div>
            </div>
          )}

          {validationData && (
            <ScrollArea className="h-[60vh]">
              <div className="px-6 py-5">
                {getFilteredResults().length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No rules match the current filter.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getFilteredResults().map((result, index) => (
                      <div
                        key={`${result.routeId}-${index}`}
                        className={`group rounded-xl border bg-white shadow-sm hover:shadow-md transition overflow-hidden ${result.isValid ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"}`}
                      >
                        <button
                          type="button"
                          className="w-full text-left px-4 py-3 flex items-center justify-between"
                          onClick={(e) => {
                            const panel = (e.currentTarget.nextSibling as HTMLElement) || null
                            if (panel) panel.hidden = !panel.hidden
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {result.isValid ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">Rule ID: {result.routeId}</div>
                              <div className="text-xs text-gray-600 truncate mt-0.5">{result.rule}</div>
                            </div>
                          </div>
                          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                        </button>
                        <div className="px-4 pb-4" hidden>
                          {result.errors.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-semibold text-red-600 mb-1">Errors</div>
                              <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5">
                                {result.errors.map((err, i) => (
                                  <li key={i}>{err}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {result.warnings.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-semibold text-yellow-700 mb-1">Warnings</div>
                              <ul className="list-disc list-inside text-xs text-yellow-700 space-y-0.5">
                                {result.warnings.map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {result.errors.length === 0 && result.warnings.length === 0 && (
                            <div className="text-xs text-gray-600">No issues found.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
