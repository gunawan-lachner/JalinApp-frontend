"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Search, Loader2, AlertCircle, Database, RefreshCw, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { rnaApi } from "@/lib/api"
import type { ConnectionProfile, ContainerPlugin, ContainerPluginAttr } from "@/lib/types"
import { ManageDbProfilesDialog } from "@/components/renjs/manage-db-profiles-dialog"
import { ContainerPluginDetailDialog } from "@/components/container-plugin/container-plugin-detail-dialog"
import { GmmRecordDetailDialog } from "@/components/gmm/gmm-record-detail-dialog"

const PROFILE_STORAGE_KEY = "gmm:iso8583_profile_id"

function cellText(value: unknown): string {
  if (value == null) return "—"
  if (typeof value === "string") return value || "—"
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function normalizeCol(col: string): string {
  return col.trim().toLowerCase().replace(/[\s-]+/g, "_")
}

function isContainerPluginNameColumn(col: string): boolean {
  return normalizeCol(col) === "container_plugin_name"
}

function isXsltMappingIdColumn(col: string): boolean {
  return normalizeCol(col) === "xslt_mapping_id"
}

function isDataDefinitionIdColumn(col: string): boolean {
  return normalizeCol(col) === "data_definition_id"
}

function parseNumericId(text: string): number | null {
  const n = Number.parseInt(text.trim(), 10)
  return Number.isFinite(n) ? n : null
}

export function Iso8583PluginTab() {
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [profileId, setProfileId] = useState("")
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [plugins, setPlugins] = useState<Array<Record<string, unknown>>>([])
  const [filter, setFilter] = useState("")
  const [manageProfilesOpen, setManageProfilesOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [dialogPlugin, setDialogPlugin] = useState<ContainerPlugin | null>(null)
  const [dialogAttrs, setDialogAttrs] = useState<ContainerPluginAttr[]>([])

  const [xsltOpen, setXsltOpen] = useState(false)
  const [xsltLoading, setXsltLoading] = useState(false)
  const [xsltError, setXsltError] = useState<string | null>(null)
  const [xsltRecord, setXsltRecord] = useState<Record<string, unknown> | null>(null)

  const [defOpen, setDefOpen] = useState(false)
  const [defLoading, setDefLoading] = useState(false)
  const [defError, setDefError] = useState<string | null>(null)
  const [defRecord, setDefRecord] = useState<Record<string, unknown> | null>(null)

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true)
    try {
      const res = await rnaApi.getConnectionProfiles()
      if (res.success && res.data) {
        const dbProfiles = res.data.filter(
          (p) =>
            !p.connection_type ||
            ["DB", "MYSQL", "MARIADB"].includes((p.connection_type || "").toUpperCase()),
        )
        const list = dbProfiles.length > 0 ? dbProfiles : res.data
        setProfiles(list)
        const stored =
          typeof window !== "undefined" ? localStorage.getItem(PROFILE_STORAGE_KEY) : null
        const initial =
          (stored && list.some((p) => p.name === stored) && stored) || list[0]?.name || ""
        setProfileId(initial)
      } else {
        setError(res.error || "Gagal memuat connection profiles")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setProfilesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  useEffect(() => {
    if (!profileId) return
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, profileId)
    } catch {
      // ignore
    }
  }, [profileId])

  const filteredPlugins = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return plugins
    return plugins.filter((row) =>
      columns.some((col) => cellText(row[col]).toLowerCase().includes(q)),
    )
  }, [plugins, columns, filter])

  const handleLoad = async () => {
    if (!profileId) {
      toast({
        title: "Profile wajib",
        description: "Pilih connection profile terlebih dahulu.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await rnaApi.gmmListIso8583(profileId)
      if (res.success && res.data?.data) {
        setColumns(res.data.data.columns || [])
        setPlugins(res.data.data.plugins || [])
        setLoaded(true)
        toast({
          title: "Data dimuat",
          description: `${res.data.data.plugins?.length ?? 0} baris dari gmm_iso8583_plugin.`,
        })
      } else {
        const msg = res.error || res.data?.error || "Gagal memuat data"
        setError(msg)
        setColumns([])
        setPlugins([])
        setLoaded(false)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setColumns([])
      setPlugins([])
      setLoaded(false)
    } finally {
      setLoading(false)
    }
  }

  const rowKey = (row: Record<string, unknown>, index: number) => {
    const id = row.id ?? row.ID ?? row.Id
    return id != null ? String(id) : `row-${index}`
  }

  const requireProfile = useCallback(() => {
    if (profileId) return true
    toast({
      title: "Profile wajib",
      description: "Pilih connection profile terlebih dahulu.",
      variant: "destructive",
    })
    return false
  }, [profileId, toast])

  const openContainerPluginByName = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed || trimmed === "—") return
      if (!requireProfile()) return
      setDialogOpen(true)
      setDialogLoading(true)
      setDialogError(null)
      setDialogPlugin(null)
      setDialogAttrs([])
      try {
        const res = await rnaApi.getContainerPluginDetailById({
          profileId,
          name: trimmed,
          filters: [],
        })
        const payload = res.data
        if (res.success && payload?.data) {
          setDialogPlugin(payload.data.plugin || null)
          setDialogAttrs(payload.data.attrs || [])
        } else {
          setDialogError(
            payload?.error ||
              res.error ||
              `Container plugin "${trimmed}" tidak ditemukan`,
          )
        }
      } catch (e) {
        setDialogError(e instanceof Error ? e.message : String(e))
      } finally {
        setDialogLoading(false)
      }
    },
    [profileId, requireProfile],
  )

  const openXsltMappingById = useCallback(
    async (rawId: string) => {
      const id = parseNumericId(rawId)
      if (id == null) return
      if (!requireProfile()) return
      setXsltOpen(true)
      setXsltLoading(true)
      setXsltError(null)
      setXsltRecord(null)
      try {
        const res = await rnaApi.gmmGetXslt(profileId, id)
        if (res.success && res.data?.data?.mapping) {
          const m = res.data.data.mapping
          setXsltRecord({
            id: m.id,
            name: m.name,
            usercomment: m.usercomment,
            hash: m.hash ?? null,
            last_mod: m.last_mod ?? null,
            mappingdata: m.content || "",
          })
        } else {
          setXsltError(res.error || res.data?.error || `XSLT mapping #${id} tidak ditemukan`)
        }
      } catch (e) {
        setXsltError(e instanceof Error ? e.message : String(e))
      } finally {
        setXsltLoading(false)
      }
    },
    [profileId, requireProfile],
  )

  const openDataDefinitionById = useCallback(
    async (rawId: string) => {
      const id = parseNumericId(rawId)
      if (id == null) return
      if (!requireProfile()) return
      setDefOpen(true)
      setDefLoading(true)
      setDefError(null)
      setDefRecord(null)
      try {
        const res = await rnaApi.gmmGetDataDefinition(profileId, id)
        if (res.success && res.data?.data?.definition) {
          setDefRecord(res.data.data.definition)
        } else {
          setDefError(
            res.error || res.data?.error || `Data definition #${id} tidak ditemukan`,
          )
        }
      } catch (e) {
        setDefError(e instanceof Error ? e.message : String(e))
      } finally {
        setDefLoading(false)
      }
    },
    [profileId, requireProfile],
  )

  const saveDataDefinition = useCallback(
    async (fields: Record<string, unknown>) => {
      const idRaw = defRecord?.id ?? defRecord?.ID
      const id = typeof idRaw === "number" ? idRaw : Number.parseInt(String(idRaw ?? ""), 10)
      if (!Number.isFinite(id)) {
        throw new Error("ID data definition tidak valid")
      }
      if (!profileId) {
        throw new Error("Connection profile wajib")
      }
      const res = await rnaApi.gmmUpdateDataDefinition({
        profileId,
        id,
        fields,
      })
      if (res.success && res.data?.data?.definition) {
        setDefRecord(res.data.data.definition)
        toast({
          title: "Data definition disimpan",
          description: `#${id} berhasil di-update`,
        })
        return res.data.data.definition
      }
      throw new Error(res.error || res.data?.error || "Gagal menyimpan data definition")
    },
    [defRecord, profileId, toast],
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-end">
        <div className="space-y-2 min-w-0">
          <Label className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-gray-500" />
            Connection Profile
          </Label>
          <Select value={profileId || undefined} onValueChange={setProfileId} disabled={profilesLoading}>
            <SelectTrigger>
              <SelectValue placeholder={profilesLoading ? "Memuat..." : "Pilih profile DB"} />
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
        <Button
          type="button"
          variant="outline"
          onClick={() => setManageProfilesOpen(true)}
          disabled={profilesLoading}
        >
          Manage
        </Button>
        <Button onClick={handleLoad} disabled={loading || profilesLoading || !profileId}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Muat Data
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loaded && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <Database className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900 font-mono">gmm_iso8583_plugin</span>
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            {plugins.length} baris
          </Badge>
          <Badge variant="outline" className="text-xs">
            {columns.length} kolom
          </Badge>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm font-medium text-gray-700">ISO8583 Plugin</div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter semua kolom..."
              className="pl-9 h-9"
              disabled={!loaded}
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Memuat gmm_iso8583_plugin...
            </div>
          ) : !loaded ? (
            <div className="p-10 text-center text-gray-500 text-sm">
              Pilih connection profile lalu klik Muat Data.
            </div>
          ) : filteredPlugins.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm">
              {filter
                ? "Tidak ada baris yang cocok dengan filter."
                : "Tabel kosong atau tidak ada data."}
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPlugins.map((row, index) => (
                  <tr key={rowKey(row, index)} className="hover:bg-gray-50">
                    {columns.map((col) => {
                      const text = cellText(row[col])
                      const isLong = text.length > 80
                      if (isContainerPluginNameColumn(col) && text !== "—") {
                        return (
                          <td
                            key={col}
                            className="px-4 py-3 text-gray-800 max-w-[280px] whitespace-nowrap"
                          >
                            <button
                              type="button"
                              onClick={() => openContainerPluginByName(text)}
                              className="font-mono text-xs text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                              title={`Buka container_plugin "${text}"`}
                            >
                              {text}
                            </button>
                          </td>
                        )
                      }
                      if (isXsltMappingIdColumn(col) && text !== "—") {
                        return (
                          <td
                            key={col}
                            className="px-4 py-3 text-gray-800 max-w-[280px] whitespace-nowrap"
                          >
                            <button
                              type="button"
                              onClick={() => openXsltMappingById(text)}
                              className="font-mono text-xs text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                              title={`Buka gmm_xslt_mapping #${text}`}
                            >
                              {text}
                            </button>
                          </td>
                        )
                      }
                      if (isDataDefinitionIdColumn(col) && text !== "—") {
                        return (
                          <td
                            key={col}
                            className="px-4 py-3 text-gray-800 max-w-[280px] whitespace-nowrap"
                          >
                            <button
                              type="button"
                              onClick={() => openDataDefinitionById(text)}
                              className="font-mono text-xs text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                              title={`Buka gmm_data_definition #${text}`}
                            >
                              {text}
                            </button>
                          </td>
                        )
                      }
                      return (
                        <td
                          key={col}
                          className="px-4 py-3 text-gray-800 max-w-[280px]"
                          title={isLong ? text : undefined}
                        >
                          <span className="font-mono text-xs whitespace-pre-wrap break-all line-clamp-3">
                            {text}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ContainerPluginDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        loading={dialogLoading}
        error={dialogError}
        plugin={dialogPlugin}
        attrs={dialogAttrs}
        filteredAttrs={dialogAttrs}
        hasAttrFilters={false}
        onOpenByName={openContainerPluginByName}
      />

      <GmmRecordDetailDialog
        open={xsltOpen}
        onOpenChange={setXsltOpen}
        title="XSLT Mapping"
        tableName="gmm_xslt_mapping"
        loading={xsltLoading}
        error={xsltError}
        record={xsltRecord}
        contentFields={["mappingdata"]}
      />

      <GmmRecordDetailDialog
        open={defOpen}
        onOpenChange={setDefOpen}
        title="Data Definition"
        tableName="gmm_data_definition"
        loading={defLoading}
        error={defError}
        record={defRecord}
        contentFields={[
          "encodingdata",
          "definition",
          "data",
          "content",
          "payload",
          "xml",
          "json",
        ]}
        canEdit
        onSave={saveDataDefinition}
      />

      <ManageDbProfilesDialog
        open={manageProfilesOpen}
        onOpenChange={setManageProfilesOpen}
        selectedProfileName={profileId}
        onProfilesChanged={(list, selectedName) => {
          const dbProfiles = list.filter(
            (p) =>
              !p.connection_type ||
              ["DB", "MYSQL", "MARIADB"].includes((p.connection_type || "").toUpperCase()),
          )
          const next = dbProfiles.length > 0 ? dbProfiles : list
          setProfiles(next)
          if (selectedName && next.some((p) => p.name === selectedName)) {
            setProfileId(selectedName)
          } else if (profileId && !next.some((p) => p.name === profileId)) {
            setProfileId(next[0]?.name || "")
          }
        }}
      />
    </div>
  )
}
