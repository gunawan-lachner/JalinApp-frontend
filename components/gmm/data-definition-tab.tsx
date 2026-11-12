"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Search,
  Loader2,
  AlertCircle,
  Database,
  RefreshCw,
  Link2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { rnaApi } from "@/lib/api"
import type { ConnectionProfile } from "@/lib/types"
import { ManageDbProfilesDialog } from "@/components/renjs/manage-db-profiles-dialog"
import { GmmRecordDetailDialog } from "@/components/gmm/gmm-record-detail-dialog"
import {
  GmmTableEditorDialog,
  type GmmColumnMeta,
} from "@/components/gmm/gmm-table-editor-dialog"

const PROFILE_STORAGE_KEY = "gmm:data_definition_profile_id"

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

function rowId(row: Record<string, unknown>): string | number | null {
  const id = row.id ?? row.ID ?? row.Id
  if (id == null || id === "") return null
  return typeof id === "number" || typeof id === "string" ? id : String(id)
}

function parseId(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw).trim(), 10)
  return Number.isFinite(n) ? n : null
}

export function DataDefinitionTab() {
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [profileId, setProfileId] = useState("")
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [columnsMeta, setColumnsMeta] = useState<GmmColumnMeta[]>([])
  const [definitions, setDefinitions] = useState<Array<Record<string, unknown>>>([])
  const [filter, setFilter] = useState("")
  const [manageProfilesOpen, setManageProfilesOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)
  const [viewRecord, setViewRecord] = useState<Record<string, unknown> | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<"create" | "edit" | "duplicate">("create")
  const [editorInitial, setEditorInitial] = useState<Record<string, unknown> | null>(null)
  const [editorSaving, setEditorSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const filteredDefinitions = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return definitions
    return definitions.filter((row) =>
      columns.some((col) => cellText(row[col]).toLowerCase().includes(q)),
    )
  }, [definitions, columns, filter])

  const requireProfile = useCallback(() => {
    if (profileId) return true
    toast({
      title: "Profile wajib",
      description: "Pilih connection profile terlebih dahulu.",
      variant: "destructive",
    })
    return false
  }, [profileId, toast])

  const handleLoad = async () => {
    if (!requireProfile()) return
    setLoading(true)
    setError(null)
    try {
      const res = await rnaApi.gmmListDataDefinition(profileId)
      if (res.success && res.data?.data) {
        setColumns(res.data.data.columns || [])
        setColumnsMeta((res.data.data.columns_meta as GmmColumnMeta[]) || [])
        setDefinitions(res.data.data.definitions || [])
        setLoaded(true)
        toast({
          title: "Data dimuat",
          description: `${res.data.data.definitions?.length ?? 0} baris dari gmm_data_definition.`,
        })
      } else {
        const msg = res.error || res.data?.error || "Gagal memuat data"
        setError(msg)
        setColumns([])
        setColumnsMeta([])
        setDefinitions([])
        setLoaded(false)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setColumns([])
      setColumnsMeta([])
      setDefinitions([])
      setLoaded(false)
    } finally {
      setLoading(false)
    }
  }

  const refreshQuiet = useCallback(async () => {
    if (!profileId) return
    const res = await rnaApi.gmmListDataDefinition(profileId)
    if (res.success && res.data?.data) {
      setColumns(res.data.data.columns || [])
      setColumnsMeta((res.data.data.columns_meta as GmmColumnMeta[]) || [])
      setDefinitions(res.data.data.definitions || [])
      setLoaded(true)
    }
  }, [profileId])

  const fetchFullRecord = useCallback(
    async (id: number) => {
      const res = await rnaApi.gmmGetDataDefinition(profileId, id)
      if (res.success && res.data?.data?.definition) {
        return res.data.data.definition
      }
      throw new Error(res.error || res.data?.error || `Data definition #${id} tidak ditemukan`)
    },
    [profileId],
  )

  const openView = async (row: Record<string, unknown>) => {
    const id = parseId(rowId(row))
    if (id == null) {
      toast({
        title: "ID tidak ditemukan",
        description: "Baris ini tidak punya kolom id.",
        variant: "destructive",
      })
      return
    }
    if (!requireProfile()) return
    setViewOpen(true)
    setViewLoading(true)
    setViewError(null)
    setViewRecord(null)
    try {
      setViewRecord(await fetchFullRecord(id))
    } catch (e) {
      setViewError(e instanceof Error ? e.message : String(e))
    } finally {
      setViewLoading(false)
    }
  }

  const openCreate = () => {
    if (!requireProfile()) return
    if (!loaded) {
      toast({
        title: "Muat data dulu",
        description: "Klik Muat Data agar kolom tabel tersedia untuk form create.",
        variant: "destructive",
      })
      return
    }
    setEditorMode("create")
    setEditorInitial(null)
    setEditorOpen(true)
  }

  const openEdit = async (row: Record<string, unknown>) => {
    const id = parseId(rowId(row))
    if (id == null || !requireProfile()) return
    try {
      const full = await fetchFullRecord(id)
      setEditorMode("edit")
      setEditorInitial(full)
      setEditorOpen(true)
    } catch (e) {
      toast({
        title: "Gagal membuka edit",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    }
  }

  const openDuplicate = async (row: Record<string, unknown>) => {
    const id = parseId(rowId(row))
    if (id == null || !requireProfile()) return
    if (!loaded) {
      toast({
        title: "Muat data dulu",
        description: "Klik Muat Data agar kolom tabel tersedia.",
        variant: "destructive",
      })
      return
    }
    try {
      const full = await fetchFullRecord(id)
      const copy: Record<string, unknown> = { ...full }
      for (const key of Object.keys(copy)) {
        const lower = key.toLowerCase()
        if (lower === "id" || lower === "hash" || lower === "last_mod") {
          copy[key] = ""
        }
      }
      setEditorMode("duplicate")
      setEditorInitial(copy)
      setEditorOpen(true)
    } catch (e) {
      toast({
        title: "Gagal menduplikasi",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    }
  }

  const handleEditorSubmit = async (fields: Record<string, unknown>) => {
    if (!profileId) throw new Error("Connection profile wajib")
    setEditorSaving(true)
    try {
      if (editorMode === "create" || editorMode === "duplicate") {
        const res = await rnaApi.gmmCreateDataDefinition({ profileId, fields })
        if (!(res.success && res.data?.data?.definition)) {
          throw new Error(
            res.error ||
              res.data?.error ||
              (editorMode === "duplicate"
                ? "Gagal menduplikasi data definition"
                : "Gagal menambah data definition"),
          )
        }
        toast({
          title: editorMode === "duplicate" ? "Definition diduplikasi" : "Definition ditambah",
          description: `gmm_data_definition #${String(res.data.data.definition.id ?? fields.id)} berhasil dibuat.`,
        })
      } else {
        const id = parseId(rowId(editorInitial || {}))
        if (id == null) throw new Error("ID data definition tidak valid")
        const res = await rnaApi.gmmUpdateDataDefinition({ profileId, id, fields })
        if (!(res.success && res.data?.data?.definition)) {
          throw new Error(res.error || res.data?.error || "Gagal mengupdate data definition")
        }
        toast({
          title: "Definition diupdate",
          description: `gmm_data_definition #${id} berhasil disimpan.`,
        })
        if (viewRecord && String(rowId(viewRecord)) === String(id)) {
          setViewRecord(res.data.data.definition)
        }
      }
      await refreshQuiet()
    } finally {
      setEditorSaving(false)
    }
  }

  const saveViewRecord = useCallback(
    async (fields: Record<string, unknown>) => {
      const id = parseId(rowId(viewRecord || {}))
      if (id == null) throw new Error("ID data definition tidak valid")
      if (!profileId) throw new Error("Connection profile wajib")
      const res = await rnaApi.gmmUpdateDataDefinition({ profileId, id, fields })
      if (res.success && res.data?.data?.definition) {
        setViewRecord(res.data.data.definition)
        await refreshQuiet()
        toast({
          title: "Definition disimpan",
          description: `#${id} berhasil di-update`,
        })
        return res.data.data.definition
      }
      throw new Error(res.error || res.data?.error || "Gagal menyimpan data definition")
    },
    [viewRecord, profileId, refreshQuiet, toast],
  )

  const handleDelete = async () => {
    if (!deleteTarget || !profileId) return
    const id = parseId(rowId(deleteTarget))
    if (id == null) return
    setDeleting(true)
    try {
      const res = await rnaApi.gmmDeleteDataDefinition(profileId, id)
      if (res.success && res.data?.success !== false) {
        toast({
          title: "Definition dihapus",
          description: `gmm_data_definition #${id} dihapus.`,
        })
        setDeleteTarget(null)
        if (viewRecord && String(rowId(viewRecord)) === String(id)) {
          setViewOpen(false)
          setViewRecord(null)
        }
        await refreshQuiet()
      } else {
        toast({
          title: "Gagal menghapus",
          description: res.error || res.data?.error || "Tidak dapat menghapus data definition",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Gagal menghapus",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const rowKey = (row: Record<string, unknown>, index: number) => {
    const id = rowId(row)
    return id != null ? String(id) : `row-${index}`
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-4 items-end">
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
        <Button
          type="button"
          onClick={openCreate}
          disabled={profilesLoading || !profileId || !loaded}
          title={!loaded ? "Muat data dulu agar kolom tersedia" : "Tambah baris baru"}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah
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
          <span className="text-sm font-medium text-blue-900 font-mono">gmm_data_definition</span>
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            {definitions.length} baris
          </Badge>
          <Badge variant="outline" className="text-xs">
            {columns.length} kolom
          </Badge>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm font-medium text-gray-700">Data Definition</div>
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
              Memuat gmm_data_definition...
            </div>
          ) : !loaded ? (
            <div className="p-10 text-center text-gray-500 text-sm">
              Pilih connection profile lalu klik Muat Data.
            </div>
          ) : filteredDefinitions.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm space-y-3">
              <p>
                {filter
                  ? "Tidak ada baris yang cocok dengan filter."
                  : "Tabel kosong atau tidak ada data."}
              </p>
              {!filter && (
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah definition
                </Button>
              )}
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b whitespace-nowrap w-36">
                    Aksi
                  </th>
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
                {filteredDefinitions.map((row, index) => (
                  <tr key={rowKey(row, index)} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Lihat"
                          onClick={() => void openView(row)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit"
                          onClick={() => void openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Duplicate"
                          onClick={() => void openDuplicate(row)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Hapus"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                    {columns.map((col) => {
                      const text = cellText(row[col])
                      const isLong = text.length > 80
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

      <GmmRecordDetailDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Data Definition"
        tableName="gmm_data_definition"
        loading={viewLoading}
        error={viewError}
        record={viewRecord}
        contentFields={["encodingdata", "encoding_data", "definition", "data", "content", "payload"]}
        canEdit
        onSave={saveViewRecord}
      />

      <GmmTableEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        mode={editorMode}
        columnsMeta={columnsMeta}
        initial={editorInitial}
        saving={editorSaving}
        tableName="gmm_data_definition"
        entityLabel="Data Definition"
        onSubmit={handleEditorSubmit}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">Hapus definition?</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <span className="block">Baris akan dihapus permanen dari gmm_data_definition.</span>
              {deleteTarget && (
                <span className="block font-mono text-sm text-gray-800 break-all">
                  id={String(rowId(deleteTarget) ?? "—")} · {cellText(deleteTarget.name)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
