"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Search, Cpu, Database, AlertCircle, Pencil } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { ContainerPlugin, ContainerPluginAttr } from "@/lib/types"

const PLUGIN_FIELDS: Array<{ key: keyof ContainerPlugin; label: string }> = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "container_id", label: "Container ID" },
  { key: "plugin_id", label: "Plugin ID" },
  { key: "state_startup", label: "State Startup" },
  { key: "port_listen", label: "Port Listen" },
  { key: "cnt_instances", label: "Instances" },
  { key: "in_next_plugin", label: "In Next Plugin" },
  { key: "out_next_plugin", label: "Out Next Plugin" },
  { key: "connectto_ipport", label: "Connect To" },
  { key: "queue_threshold", label: "Queue Threshold" },
  { key: "node_type", label: "Node Type" },
  { key: "startup_order", label: "Startup Order" },
  { key: "response_timeout", label: "Response Timeout" },
  { key: "comments", label: "Comments" },
]

const LINKABLE_NAME_FIELDS = new Set<keyof ContainerPlugin>([
  "in_next_plugin",
  "out_next_plugin",
])

interface ContainerPluginDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  error: string | null
  plugin: ContainerPlugin | null
  attrs: ContainerPluginAttr[]
  filteredAttrs: ContainerPluginAttr[]
  hasAttrFilters: boolean
  onOpenByName?: (name: string) => void
  onOpenPluginId?: (pluginId: number | string) => void
  onOpenParticipantByName?: (name: string) => void
  canEdit?: boolean
  onEdit?: (plugin: ContainerPlugin) => void
}

export function ContainerPluginDetailDialog({
  open,
  onOpenChange,
  loading,
  error,
  plugin,
  attrs,
  filteredAttrs,
  hasAttrFilters,
  onOpenByName,
  onOpenPluginId,
  onOpenParticipantByName,
  canEdit,
  onEdit,
}: ContainerPluginDetailDialogProps) {
  const [attrSearch, setAttrSearch] = useState("")
  const [showOnlyMatched, setShowOnlyMatched] = useState(true)

  const sourceAttrs =
    hasAttrFilters && showOnlyMatched ? filteredAttrs : attrs

  const visibleAttrs = useMemo(() => {
    const q = attrSearch.trim().toLowerCase()
    if (!q) return sourceAttrs
    return sourceAttrs.filter(
      (a) =>
        String(a.id).includes(q) ||
        String(a.container_plugin_id).includes(q) ||
        (a.field || "").toLowerCase().includes(q) ||
        (a.content || "").toLowerCase().includes(q),
    )
  }, [sourceAttrs, attrSearch])

  const matchedIds = useMemo(
    () => new Set(filteredAttrs.map((a) => a.id)),
    [filteredAttrs],
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setAttrSearch("")
          setShowOnlyMatched(true)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start justify-between gap-3 pr-6">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
              <Cpu className="h-5 w-5 text-blue-600" />
              {plugin?.name || "Container Plugin"}
              {plugin && (
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border-blue-200 font-mono"
                >
                  ID {plugin.id}
                </Badge>
              )}
            </DialogTitle>
            {canEdit && plugin && !loading && !error && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={() => onEdit?.(plugin)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <Loader2 className="h-7 w-7 animate-spin mx-auto mb-3" />
              Memuat detail...
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !plugin ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              Data plugin tidak tersedia.
            </div>
          ) : (
            <Tabs defaultValue="plugin" className="space-y-4">
              <TabsList>
                <TabsTrigger value="plugin">container_plugin</TabsTrigger>
                <TabsTrigger value="attrs">
                  container_plugin_attr
                  <Badge variant="secondary" className="ml-2 font-normal">
                    {hasAttrFilters && showOnlyMatched
                      ? `${filteredAttrs.length}/${attrs.length}`
                      : attrs.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="plugin" className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {PLUGIN_FIELDS.map(({ key, label }) => {
                    const raw = plugin[key]
                    const display =
                      raw == null || raw === "" ? "—" : String(raw)
                    const canLinkName =
                      LINKABLE_NAME_FIELDS.has(key) &&
                      display !== "—" &&
                      !!onOpenByName
                    const canLinkPluginId =
                      key === "plugin_id" &&
                      display !== "—" &&
                      !!onOpenPluginId
                    const canLinkParticipant =
                      key === "name" &&
                      display !== "—" &&
                      !!onOpenParticipantByName
                    return (
                      <div
                        key={String(key)}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          {label}
                        </div>
                        <div className="mt-0.5 text-sm font-mono text-gray-900 break-all">
                          {canLinkParticipant ? (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenParticipantByName?.(display)
                              }
                              className="text-left text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                              title={`Buka participant dengan container_plugin_name "${display}"`}
                            >
                              {display}
                            </button>
                          ) : canLinkName ? (
                            <button
                              type="button"
                              onClick={() => onOpenByName?.(display)}
                              className="text-left text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                              title={`Buka container_plugin "${display}"`}
                            >
                              {display}
                            </button>
                          ) : canLinkPluginId ? (
                            <button
                              type="button"
                              onClick={() => onOpenPluginId?.(display)}
                              className="text-left text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                              title={`Buka detail plugin id ${display}`}
                            >
                              {display}
                            </button>
                          ) : (
                            display
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="attrs" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Database className="h-4 w-4" />
                    Atribut plugin
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    {hasAttrFilters && (
                      <button
                        type="button"
                        onClick={() => setShowOnlyMatched((v) => !v)}
                        className="text-xs text-blue-700 hover:underline text-left"
                      >
                        {showOnlyMatched
                          ? "Tampilkan semua atribut"
                          : "Tampilkan hanya yang cocok filter"}
                      </button>
                    )}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={attrSearch}
                        onChange={(e) => setAttrSearch(e.target.value)}
                        placeholder="Cari field / content..."
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                </div>

                {visibleAttrs.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 text-sm border border-dashed border-gray-200 rounded-xl">
                    {hasAttrFilters && showOnlyMatched
                      ? "Tidak ada atribut yang cocok dengan filter."
                      : "Tidak ada atribut untuk plugin ini."}
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b">
                              ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b">
                              Plugin ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b">
                              Field
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b">
                              Content
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {visibleAttrs.map((attr) => {
                            const matched = matchedIds.has(attr.id)
                            return (
                              <tr
                                key={attr.id}
                                className={
                                  hasAttrFilters && matched
                                    ? "bg-blue-50/70"
                                    : "hover:bg-gray-50"
                                }
                              >
                                <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                                  {attr.id}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                                  {attr.container_plugin_id}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                  {attr.field}
                                </td>
                                <td className="px-4 py-3 text-gray-800">
                                  <span className="whitespace-pre-wrap break-all font-mono text-xs">
                                    {attr.content}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
