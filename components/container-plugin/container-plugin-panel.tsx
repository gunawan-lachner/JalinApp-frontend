"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Search,
  Loader2,
  AlertCircle,
  Database,
  RefreshCw,
  Plus,
  Minus,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { rnaApi } from "@/lib/api"
import type {
  ConnectionProfile,
  ContainerPlugin,
  ContainerPluginAttr,
  ContainerPluginDynamicFilter,
  Participant,
} from "@/lib/types"
import { ContainerPluginDetailDialog } from "@/components/container-plugin/container-plugin-detail-dialog"
import { ContainerPluginEditDialog } from "@/components/container-plugin/container-plugin-edit-dialog"
import { PluginTableDetailDialog } from "@/components/container-plugin/plugin-table-detail-dialog"
import { ParticipantByPluginDialog } from "@/components/container-plugin/participant-by-plugin-dialog"
import { useAuth } from "@/contexts/auth-context"

const DEFAULT_FILTER_FIELDS: Array<{ label: string; value: string }> = [
  { label: "Plugin: ID", value: "cp.id" },
  { label: "Plugin: Name", value: "cp.name" },
  { label: "Plugin: Container ID", value: "cp.container_id" },
  { label: "Plugin: Plugin ID", value: "cp.plugin_id" },
  { label: "Plugin: State Startup", value: "cp.state_startup" },
  { label: "Plugin: Port Listen", value: "cp.port_listen" },
  { label: "Plugin: Instances", value: "cp.cnt_instances" },
  { label: "Plugin: In Next", value: "cp.in_next_plugin" },
  { label: "Plugin: Out Next", value: "cp.out_next_plugin" },
  { label: "Plugin: Connect To", value: "cp.connectto_ipport" },
  { label: "Plugin: Comments", value: "cp.comments" },
  { label: "Attr: ID", value: "attr.id" },
  { label: "Attr: Plugin ID", value: "attr.container_plugin_id" },
  { label: "Attr: Field", value: "attr.field" },
  { label: "Attr: Content", value: "attr.content" },
]

const DEFAULT_FILTER_OPERATORS: Array<{ label: string; value: string }> = [
  { label: "=", value: "=" },
  { label: "!=", value: "!=" },
  { label: ">", value: ">" },
  { label: "<", value: "<" },
  { label: ">=", value: ">=" },
  { label: "<=", value: "<=" },
  { label: "LIKE", value: "LIKE" },
  { label: "NOT LIKE", value: "NOT LIKE" },
  { label: "starts with", value: "STARTS_WITH" },
  { label: "ends with", value: "ENDS_WITH" },
  { label: "is empty", value: "IS_EMPTY" },
  { label: "is not empty", value: "IS_NOT_EMPTY" },
]

const TABLE_COLUMNS: Array<{ key: keyof ContainerPlugin; label: string }> = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "container_id", label: "Container ID" },
  { key: "plugin_id", label: "Plugin ID" },
  { key: "port_listen", label: "Port" },
  { key: "cnt_instances", label: "Instances" },
  { key: "in_next_plugin", label: "In Next" },
  { key: "out_next_plugin", label: "Out Next" },
  { key: "comments", label: "Comments" },
]

function createEmptyFilter(): ContainerPluginDynamicFilter {
  return {
    field: "cp.name",
    operator: "LIKE",
    value: "",
  }
}

function isActiveFilter(f: ContainerPluginDynamicFilter): boolean {
  return (
    f.operator === "IS_EMPTY" ||
    f.operator === "IS_NOT_EMPTY" ||
    f.value.trim() !== ""
  )
}

export function ContainerPluginPanel() {
  const { toast } = useToast()
  const { canCrud } = useAuth()
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [profileId, setProfileId] = useState("")
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plugins, setPlugins] = useState<ContainerPlugin[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<ContainerPluginDynamicFilter[]>([
    createEmptyFilter(),
  ])
  const [showFilters, setShowFilters] = useState(true)
  const [filterFields, setFilterFields] = useState(DEFAULT_FILTER_FIELDS)
  const [filterOperators, setFilterOperators] = useState(
    DEFAULT_FILTER_OPERATORS,
  )

  // Detail dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [dialogPlugin, setDialogPlugin] = useState<ContainerPlugin | null>(null)
  const [dialogAttrs, setDialogAttrs] = useState<ContainerPluginAttr[]>([])
  const [dialogFilteredAttrs, setDialogFilteredAttrs] = useState<
    ContainerPluginAttr[]
  >([])
  const [dialogHasAttrFilters, setDialogHasAttrFilters] = useState(false)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editPlugin, setEditPlugin] = useState<ContainerPlugin | null>(null)
  const [editAttrs, setEditAttrs] = useState<ContainerPluginAttr[]>([])
  const [editLoading, setEditLoading] = useState(false)

  // Plugin table (plugin_id FK) dialog state
  const [pluginTableOpen, setPluginTableOpen] = useState(false)
  const [pluginTableLoading, setPluginTableLoading] = useState(false)
  const [pluginTableError, setPluginTableError] = useState<string | null>(null)
  const [pluginTableId, setPluginTableId] = useState<number | string | null>(
    null,
  )
  const [pluginTableData, setPluginTableData] = useState<Record<
    string,
    unknown
  > | null>(null)

  // Participant by container_plugin_name dialog state
  const [participantOpen, setParticipantOpen] = useState(false)
  const [participantLoading, setParticipantLoading] = useState(false)
  const [participantError, setParticipantError] = useState<string | null>(null)
  const [participantPluginName, setParticipantPluginName] = useState<
    string | null
  >(null)
  const [participants, setParticipants] = useState<Participant[]>([])

  useEffect(() => {
    const loadProfiles = async () => {
      setProfilesLoading(true)
      try {
        const res = await rnaApi.getConnectionProfiles()
        if (res.success && res.data) {
          const dbProfiles = res.data.filter(
            (p) =>
              !p.connection_type ||
              p.connection_type.toUpperCase() === "DB" ||
              p.connection_type.toUpperCase() === "MYSQL",
          )
          setProfiles(dbProfiles.length > 0 ? dbProfiles : res.data)
        } else {
          setError(res.error || "Gagal memuat connection profiles")
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setProfilesLoading(false)
      }
    }
    loadProfiles()
  }, [])

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await rnaApi.getContainerPluginFilterMeta()
        if (res.success && res.data) {
          if (res.data.filterFields?.length) {
            setFilterFields(res.data.filterFields)
          }
          if (res.data.filterOperators?.length) {
            setFilterOperators(res.data.filterOperators)
          }
        }
      } catch {
        // keep defaults
      }
    }
    loadMeta()
  }, [])

  const activeFilters = useMemo(() => filters.filter(isActiveFilter), [filters])
  const activeFilterCount = activeFilters.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))

  const addFilter = () => {
    setFilters((prev) => [...prev, createEmptyFilter()])
    setShowFilters(true)
  }

  const updateFilter = (
    index: number,
    key: keyof ContainerPluginDynamicFilter,
    value: string,
  ) => {
    setFilters((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  const removeFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index))
  }

  const clearFilters = () => {
    setFilters([createEmptyFilter()])
    setSearch("")
  }

  const handleSearch = useCallback(
    async (overridePage?: number) => {
      if (!profileId) {
        toast({
          title: "Profile wajib",
          description: "Pilih connection profile terlebih dahulu.",
          variant: "destructive",
        })
        return
      }

      const pageToUse = overridePage ?? page
      setLoading(true)
      setError(null)
      try {
        const res = await rnaApi.searchContainerPlugins({
          profileId,
          page: pageToUse,
          page_size: pageSize,
          search: search.trim() || undefined,
          filters: activeFilters,
        })

        const payload = res.data
        if (res.success && payload) {
          if (payload.success === false) {
            setPlugins([])
            setTotalRows(0)
            setError(payload.error || res.error || "Gagal mencari container plugin")
            return
          }
          setPlugins(Array.isArray(payload.data) ? payload.data : [])
          setTotalRows(payload.total_rows || 0)
          setPage(payload.page || pageToUse)
          if (payload.filterFields?.length) setFilterFields(payload.filterFields)
          if (payload.filterOperators?.length) {
            setFilterOperators(payload.filterOperators)
          }
          toast({
            title: "Pencarian selesai",
            description: `${payload.total_rows || 0} container_plugin ditemukan.`,
          })
        } else {
          setPlugins([])
          setTotalRows(0)
          setError(res.error || "Gagal mencari container plugin")
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        setPlugins([])
        setTotalRows(0)
      } finally {
        setLoading(false)
      }
    },
    [profileId, page, pageSize, search, activeFilters, toast],
  )

  const openDetail = async (target: {
    id?: number | string
    name?: string
    preview?: ContainerPlugin | null
  }) => {
    if (!profileId) return
    const byId = target.id != null && String(target.id).trim() !== ""
    const byName = (target.name || "").trim()
    if (!byId && !byName) return

    const useAttrFilters =
      byId && activeFilters.some((f) => f.field.startsWith("attr."))

    setDialogOpen(true)
    setDialogLoading(true)
    setDialogError(null)
    setDialogPlugin(target.preview || null)
    setDialogAttrs([])
    setDialogFilteredAttrs([])
    setDialogHasAttrFilters(useAttrFilters)
    try {
      const res = await rnaApi.getContainerPluginDetailById({
        profileId,
        ...(byId ? { id: target.id } : { name: byName }),
        // Attr filters only apply when opening from search-result ID,
        // not when navigating via in/out next name links.
        filters: useAttrFilters ? activeFilters : [],
      })
      const payload = res.data
      if (res.success && payload?.data) {
        setDialogPlugin(payload.data.plugin || target.preview || null)
        setDialogAttrs(payload.data.attrs || [])
        setDialogFilteredAttrs(
          payload.data.filtered_attrs || payload.data.attrs || [],
        )
      } else {
        setDialogError(
          payload?.error ||
            res.error ||
            (byName
              ? `Container plugin "${byName}" tidak ditemukan`
              : "Gagal memuat detail container plugin"),
        )
      }
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : String(e))
    } finally {
      setDialogLoading(false)
    }
  }

  const openDetailByName = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === "—") return
    void openDetail({ name: trimmed })
  }

  const openParticipantByPluginName = async (pluginName: string) => {
    if (!profileId) {
      toast({
        title: "Profile wajib",
        description: "Pilih connection profile terlebih dahulu.",
        variant: "destructive",
      })
      return
    }
    const name = pluginName.trim()
    if (!name || name === "—") return

    setParticipantOpen(true)
    setParticipantLoading(true)
    setParticipantError(null)
    setParticipantPluginName(name)
    setParticipants([])
    try {
      const res = await rnaApi.getParticipantByContainerPluginName({
        profileId,
        container_plugin_name: name,
      })
      const payload = res.data
      if (res.success && payload?.data) {
        const rows = Array.isArray(payload.data) ? payload.data : []
        setParticipants(rows)
        if (rows.length === 0) {
          setParticipantError(
            payload.error ||
              `Participant dengan container_plugin_name "${name}" tidak ditemukan`,
          )
        }
      } else {
        setParticipantError(
          payload?.error ||
            res.error ||
            `Participant dengan container_plugin_name "${name}" tidak ditemukan`,
        )
      }
    } catch (e) {
      setParticipantError(e instanceof Error ? e.message : String(e))
    } finally {
      setParticipantLoading(false)
    }
  }

  const openPluginTableDetail = async (pluginIdValue: number | string) => {
    if (!profileId) {
      toast({
        title: "Profile wajib",
        description: "Pilih connection profile terlebih dahulu.",
        variant: "destructive",
      })
      return
    }
    const id = String(pluginIdValue).trim()
    if (!id || id === "—") return

    setPluginTableOpen(true)
    setPluginTableLoading(true)
    setPluginTableError(null)
    setPluginTableId(id)
    setPluginTableData(null)
    try {
      const res = await rnaApi.getPluginTableDetail({
        profileId,
        id,
      })
      const payload = res.data
      if (res.success && payload?.data) {
        setPluginTableData(payload.data)
      } else {
        setPluginTableError(
          payload?.error ||
            res.error ||
            `Plugin id ${id} tidak ditemukan di tabel plugin`,
        )
      }
    } catch (e) {
      setPluginTableError(e instanceof Error ? e.message : String(e))
    } finally {
      setPluginTableLoading(false)
    }
  }

  const openEdit = async (plugin: ContainerPlugin) => {
    if (!profileId || !canCrud) return
    setEditOpen(true)
    setEditPlugin(plugin)
    setEditAttrs([])
    setEditLoading(true)
    try {
      const res = await rnaApi.getContainerPluginDetailById({
        profileId,
        id: plugin.id,
      })
      const payload = res.data
      if (res.success && payload?.data) {
        setEditPlugin(payload.data.plugin || plugin)
        setEditAttrs(payload.data.attrs || [])
      } else {
        toast({
          title: "Gagal memuat data edit",
          description:
            payload?.error || res.error || "Tidak bisa memuat detail plugin",
          variant: "destructive",
        })
        setEditOpen(false)
      }
    } catch (e) {
      toast({
        title: "Gagal memuat data edit",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
      setEditOpen(false)
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditSaved = (
    savedPlugin: ContainerPlugin,
    savedAttrs: ContainerPluginAttr[],
  ) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === savedPlugin.id ? { ...p, ...savedPlugin } : p)),
    )
    if (dialogPlugin?.id === savedPlugin.id) {
      setDialogPlugin(savedPlugin)
      setDialogAttrs(savedAttrs)
      setDialogFilteredAttrs(savedAttrs)
      setDialogHasAttrFilters(false)
    }
    setEditPlugin(savedPlugin)
    setEditAttrs(savedAttrs)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label>Connection Profile</Label>
          <Select
            value={profileId}
            onValueChange={setProfileId}
            disabled={profilesLoading}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={profilesLoading ? "Memuat..." : "Pilih profile DB"}
              />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.name} value={p.name}>
                  {p.name}
                  {p.database ? ` (${p.database})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Pencarian cepat</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && profileId && !loading) {
                  setPage(1)
                  handleSearch(1)
                }
              }}
              placeholder="Cari name / id / comments..."
              className="pl-9 font-mono text-sm"
              disabled={!profileId || profilesLoading}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setPage(1)
              handleSearch(1)
            }}
            disabled={loading || profilesLoading || !profileId}
            className="flex-1 md:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Cari Plugin
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filter
            {activeFilterCount > 0 && (
              <Badge className="ml-1.5 h-5 min-w-5 px-1.5 bg-blue-600">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Filter container_plugin &amp; container_plugin_attr
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Operator: =, !=, &gt;, &lt;, &gt;=, &lt;=, LIKE, starts/ends with, …
              </p>
            </div>
            <div className="flex gap-2">
              {(activeFilterCount > 0 || search.trim()) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-gray-600"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={addFilter}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Filter
              </Button>
            </div>
          </div>

          {filters.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Filter className="h-7 w-7 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Belum ada filter</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filters.map((filter, index) => {
                const needsValue =
                  filter.operator !== "IS_EMPTY" &&
                  filter.operator !== "IS_NOT_EMPTY"
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200"
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Select
                        value={filter.field}
                        onValueChange={(value) =>
                          updateFilter(index, "field", value)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filterFields.map((field) => (
                            <SelectItem
                              key={field.value}
                              value={field.value}
                              className="text-xs"
                            >
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator}
                        onValueChange={(value) =>
                          updateFilter(index, "operator", value)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs font-mono">
                          <SelectValue placeholder="Operator..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOperators.map((op) => (
                            <SelectItem
                              key={op.value}
                              value={op.value}
                              className="text-xs font-mono"
                            >
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        value={filter.value}
                        onChange={(e) =>
                          updateFilter(index, "value", e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setPage(1)
                            handleSearch(1)
                          }
                        }}
                        placeholder={needsValue ? "Nilai..." : "—"}
                        disabled={!needsValue}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 hover:bg-red-50 hover:border-red-200"
                      onClick={() => removeFilter(index)}
                    >
                      <Minus className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Database className="h-4 w-4 text-gray-500" />
            Hasil container_plugin
            <Badge variant="secondary" className="font-normal">
              {totalRows} total
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Per halaman</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                const next = Number(v)
                setPageSize(next)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-[84px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100, 200].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Mencari data...
            </div>
          ) : plugins.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm">
              Pilih profile, atur filter bila perlu, lalu klik &quot;Cari
              Plugin&quot;. Klik ID pada hasil untuk membuka detail.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                  {canCrud && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider border-b whitespace-nowrap">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plugins.map((plugin) => (
                  <tr key={plugin.id} className="hover:bg-gray-50">
                    {TABLE_COLUMNS.map((col) => {
                      const value = plugin[col.key]
                      const display =
                        value == null || value === "" ? "—" : String(value)
                      if (col.key === "id") {
                        return (
                          <td
                            key={col.key}
                            className="px-4 py-3 whitespace-nowrap"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                openDetail({
                                  id: plugin.id,
                                  preview: plugin,
                                })
                              }
                              className="font-mono text-xs text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                              title="Buka detail container_plugin & attr"
                            >
                              {display}
                            </button>
                          </td>
                        )
                      }
                      if (
                        (col.key === "in_next_plugin" ||
                          col.key === "out_next_plugin") &&
                        display !== "—"
                      ) {
                        return (
                          <td
                            key={col.key}
                            className="px-4 py-3 whitespace-nowrap"
                          >
                            <button
                              type="button"
                              onClick={() => openDetailByName(display)}
                              className="font-mono text-xs text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                              title={`Buka container_plugin "${display}"`}
                            >
                              {display}
                            </button>
                          </td>
                        )
                      }
                      if (col.key === "plugin_id" && display !== "—") {
                        return (
                          <td
                            key={col.key}
                            className="px-4 py-3 whitespace-nowrap"
                          >
                            <button
                              type="button"
                              onClick={() => openPluginTableDetail(display)}
                              className="font-mono text-xs text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                              title={`Buka detail plugin id ${display}`}
                            >
                              {display}
                            </button>
                          </td>
                        )
                      }
                      if (col.key === "name" && display !== "—") {
                        return (
                          <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                openParticipantByPluginName(display)
                              }
                              className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                              title={`Buka participant dengan container_plugin_name "${display}"`}
                            >
                              {display}
                            </button>
                          </td>
                        )
                      }
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 ${
                            col.key === "comments"
                              ? "text-gray-800 max-w-[240px] truncate"
                              : "font-mono text-xs text-gray-600 whitespace-nowrap"
                          }`}
                          title={col.key === "comments" ? display : undefined}
                        >
                          {display}
                        </td>
                      )
                    })}
                    {canCrud && (
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => openEdit(plugin)}
                          title="Edit container plugin"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {plugins.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Halaman {page} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={loading || page <= 1}
                onClick={() => {
                  const next = page - 1
                  setPage(next)
                  handleSearch(next)
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={loading || page >= totalPages}
                onClick={() => {
                  const next = page + 1
                  setPage(next)
                  handleSearch(next)
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ContainerPluginDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        loading={dialogLoading}
        error={dialogError}
        plugin={dialogPlugin}
        attrs={dialogAttrs}
        filteredAttrs={dialogFilteredAttrs}
        hasAttrFilters={dialogHasAttrFilters}
        onOpenByName={openDetailByName}
        onOpenPluginId={openPluginTableDetail}
        onOpenParticipantByName={openParticipantByPluginName}
        canEdit={canCrud}
        onEdit={(p) => openEdit(p)}
      />

      <PluginTableDetailDialog
        open={pluginTableOpen}
        onOpenChange={setPluginTableOpen}
        loading={pluginTableLoading}
        error={pluginTableError}
        pluginId={pluginTableId}
        data={pluginTableData}
        profileId={profileId}
        canEdit={canCrud}
        onUpdated={(updated) => setPluginTableData(updated)}
      />

      <ParticipantByPluginDialog
        open={participantOpen}
        onOpenChange={setParticipantOpen}
        loading={participantLoading}
        error={participantError}
        containerPluginName={participantPluginName}
        participants={participants}
        profileId={profileId}
        canEdit={canCrud}
        onParticipantUpdated={(updated) => {
          setParticipants((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
          )
        }}
      />

      <ContainerPluginEditDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEditPlugin(null)
            setEditAttrs([])
          }
        }}
        profileId={profileId}
        plugin={editPlugin}
        attrs={editAttrs}
        loading={editLoading}
        onSaved={handleEditSaved}
      />
    </div>
  )
}
