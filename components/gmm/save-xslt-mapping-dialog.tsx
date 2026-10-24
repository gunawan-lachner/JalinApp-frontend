"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Database,
  Link2,
  Loader2,
  Search,
  AlertCircle,
  Check,
  History,
  ScrollText,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

export interface XsltMappingRow {
  id: number
  name: string
  usercomment: string
  hash?: string | null
  last_mod?: string
}

interface SaveXsltMappingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  /** Dialog opened for save or load — affects title only */
  intent?: "save" | "load"
  suggestedName?: string
  suggestedComment?: string
  onLoadedContent?: (
    content: string,
    meta: { id: number; name: string; usercomment: string },
  ) => void
}

type SaveMode = "overwrite" | "new"

const PROFILE_STORAGE_KEY = "gmm:xslt_profile_id"

export function SaveXsltMappingDialog({
  open,
  onOpenChange,
  content,
  intent = "save",
  suggestedName = "",
  suggestedComment = "",
  onLoadedContent,
}: SaveXsltMappingDialogProps) {
  const { toast } = useToast()

  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [profileId, setProfileId] = useState("")
  const [mode, setMode] = useState<SaveMode>("overwrite")
  const [usercomment, setUsercomment] = useState("")
  const [filter, setFilter] = useState("")
  const [mappings, setMappings] = useState<XsltMappingRow[]>([])
  const [mappingsLoading, setMappingsLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [newId, setNewId] = useState("")
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)
  const [loadingMapping, setLoadingMapping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manageProfilesOpen, setManageProfilesOpen] = useState(false)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyBusy, setHistoryBusy] = useState(false)
  const [clearHistoryConfirmOpen, setClearHistoryConfirmOpen] = useState(false)
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const [historyRows, setHistoryRows] = useState<
    Array<{
      id: number
      mapping_id: number
      version?: number
      hash?: string
      checksum?: string
      usercomment?: string | null
      comment?: string | null
      created_at?: string
      content_length?: number
    }>
  >([])

  const filteredMappings = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return mappings
    return mappings.filter(
      (m) =>
        String(m.id).includes(q) ||
        (m.name || "").toLowerCase().includes(q) ||
        (m.usercomment || "").toLowerCase().includes(q) ||
        (m.hash || "").toLowerCase().includes(q),
    )
  }, [mappings, filter])

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true)
    try {
      const res = await rnaApi.getConnectionProfiles()
      if (res.success && res.data) {
        const dbProfiles = res.data.filter(
          (p) =>
            !p.connection_type ||
            ["DB", "MYSQL", "MARIADB"].includes(p.connection_type.toUpperCase()),
        )
        const list = dbProfiles.length > 0 ? dbProfiles : res.data
        setProfiles(list)
        const stored = typeof window !== "undefined" ? localStorage.getItem(PROFILE_STORAGE_KEY) : null
        const initial =
          (stored && list.some((p) => p.name === stored) && stored) || list[0]?.name || ""
        setProfileId(initial)
      }
    } finally {
      setProfilesLoading(false)
    }
  }, [])

  const loadMappings = useCallback(async (pid: string) => {
    if (!pid) return
    setMappingsLoading(true)
    setError(null)
    try {
      const res = await rnaApi.gmmListXslt(pid)
      if (res.success && res.data?.data) {
        setMappings(res.data.data.mappings || [])
      } else {
        setError(res.error || res.data?.error || "Gagal memuat daftar mapping")
        setMappings([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setMappings([])
    } finally {
      setMappingsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setMode("overwrite")
    setUsercomment(suggestedComment || "")
    setFilter("")
    setSelectedId(null)
    setNewId("")
    setNewName(suggestedName?.trim() || "")
    setError(null)
    setHistoryOpen(false)
    loadProfiles()
  }, [open, suggestedName, suggestedComment, loadProfiles])

  useEffect(() => {
    if (!open || !profileId) return
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, profileId)
    } catch {
      // ignore
    }
    loadMappings(profileId)
  }, [open, profileId, loadMappings])

  const handleSave = async () => {
    if (!profileId) {
      toast({ title: "Profile wajib", description: "Pilih connection profile.", variant: "destructive" })
      return
    }
    if (mode === "overwrite" && !selectedId) {
      toast({
        title: "Pilih mapping",
        description: "Pilih baris yang akan di-overwrite.",
        variant: "destructive",
      })
      return
    }
    if (mode === "new") {
      const parsedId = Number.parseInt(newId.trim(), 10)
      if (!newId.trim() || Number.isNaN(parsedId)) {
        toast({
          title: "ID wajib",
          description: "Isi ID numerik untuk mapping baru.",
          variant: "destructive",
        })
        return
      }
      if (!newName.trim()) {
        toast({
          title: "Name wajib",
          description: "Isi name untuk mapping baru.",
          variant: "destructive",
        })
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      const res = await rnaApi.gmmSaveXslt({
        profileId,
        mode,
        content,
        usercomment: usercomment.trim(),
        ...(mode === "overwrite"
          ? { id: selectedId! }
          : {
              id: Number.parseInt(newId.trim(), 10),
              name: newName.trim(),
            }),
      })
      if (res.success && res.data?.data?.mapping) {
        const m = res.data.data.mapping
        toast({
          title: mode === "overwrite" ? "Mapping di-overwrite" : "Mapping baru disimpan",
          description: `#${m.id} / ${m.name}`,
        })
        onOpenChange(false)
      } else {
        const msg = res.error || res.data?.error || "Gagal menyimpan mapping"
        setError(msg)
        toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async () => {
    if (mode === "overwrite") {
      if (!selectedId) {
        toast({
          title: "Pilih mapping",
          description: "Pilih baris mapping lalu Load.",
          variant: "destructive",
        })
        return
      }
      if (!profileId) return
      setLoadingMapping(true)
      try {
        const res = await rnaApi.gmmGetXslt(profileId, selectedId)
        if (res.success && res.data?.data?.mapping) {
          const m = res.data.data.mapping
          onLoadedContent?.(m.content || "", {
            id: m.id,
            name: m.name,
            usercomment: m.usercomment || "",
          })
          toast({
            title: "Mapping dimuat",
            description: `#${m.id} / ${m.name}`,
          })
          onOpenChange(false)
        } else {
          toast({
            title: "Gagal memuat",
            description: res.error || res.data?.error || "Tidak dapat memuat mapping",
            variant: "destructive",
          })
        }
      } catch (e) {
        toast({
          title: "Gagal memuat",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        })
      } finally {
        setLoadingMapping(false)
      }
      return
    }
    await loadMappings(profileId)
  }

  const openHistory = async () => {
    if (!profileId || !selectedId) return
    setHistoryOpen(true)
    setHistoryLoading(true)
    setSelectedHistoryId(null)
    try {
      const res = await rnaApi.gmmXsltHistory(profileId, selectedId)
      if (res.success && res.data?.data) {
        setHistoryRows(res.data.data.history || [])
      } else {
        setHistoryRows([])
        toast({
          title: "Gagal memuat history",
          description: res.error || res.data?.error || "Tidak dapat memuat history",
          variant: "destructive",
        })
      }
    } catch (e) {
      setHistoryRows([])
      toast({
        title: "Gagal memuat history",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadHistoryEntry = async (historyId?: number | null) => {
    const targetId = historyId ?? selectedHistoryId
    if (!profileId || !targetId) {
      toast({
        title: "Pilih versi",
        description: "Pilih baris history terlebih dahulu.",
        variant: "destructive",
      })
      return
    }
    setLoadingMapping(true)
    try {
      const res = await rnaApi.gmmXsltHistoryGet(profileId, targetId)
      if (res.success && res.data?.data?.history) {
        const h = res.data.data.history
        const meta = mappings.find((m) => m.id === h.mapping_id)
        onLoadedContent?.(h.content || "", {
          id: h.mapping_id,
          name: meta?.name || `history-${h.id}`,
          usercomment: h.usercomment || h.comment || meta?.usercomment || "",
        })
        toast({
          title: "Version loaded to editor",
          description: `Version ${h.version ?? h.id} — gunakan Save (overwrite) untuk menyimpan ke DB.`,
        })
        setHistoryOpen(false)
        onOpenChange(false)
      } else {
        toast({
          title: "Gagal memuat history",
          description: res.error || res.data?.error || "Tidak dapat memuat isi history",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Gagal memuat history",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    } finally {
      setLoadingMapping(false)
    }
  }

  const deleteSelectedHistory = async () => {
    if (!profileId || !selectedHistoryId) {
      toast({
        title: "Pilih versi",
        description: "Pilih baris history yang akan dihapus.",
        variant: "destructive",
      })
      return
    }
    const selected = historyRows.find((r) => r.id === selectedHistoryId)
    const versionLabel = selected?.version ?? selectedHistoryId
    if (!window.confirm(`Hapus version ${versionLabel}?`)) return
    setHistoryBusy(true)
    try {
      const res = await rnaApi.gmmXsltHistoryDelete(profileId, selectedHistoryId)
      if (res.success) {
        setHistoryRows((rows) => rows.filter((r) => r.id !== selectedHistoryId))
        setSelectedHistoryId(null)
        toast({ title: "Version dihapus", description: `Version ${versionLabel}` })
      } else {
        toast({
          title: "Gagal menghapus",
          description: res.error || res.data?.error || "Tidak dapat menghapus version",
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
      setHistoryBusy(false)
    }
  }

  const clearAllHistory = async () => {
    if (!profileId || !selectedId) return
    setHistoryBusy(true)
    try {
      const res = await rnaApi.gmmXsltHistoryClear(profileId, selectedId)
      if (res.success) {
        setHistoryRows([])
        setSelectedHistoryId(null)
        setClearHistoryConfirmOpen(false)
        toast({
          title: "History dibersihkan",
          description: `${res.data?.data?.deleted ?? 0} version dihapus`,
        })
      } else {
        toast({
          title: "Gagal clear history",
          description: res.error || res.data?.error || "Tidak dapat clear history",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Gagal clear history",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    } finally {
      setHistoryBusy(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              {intent === "load" ? "Load XSLT from database" : "Save XSLT to database"}
            </DialogTitle>
            <DialogDescription>
              {intent === "load" ? (
                <>
                  Muat mapping dari tabel <code className="text-xs">gmm_xslt_mapping</code> ke editor
                </>
              ) : (
                <>
                  Simpan konten editor ke tabel <code className="text-xs">gmm_xslt_mapping</code>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 min-w-0 overflow-hidden">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-gray-500" />
                Connection Profile
              </Label>
              <div className="flex gap-2 min-w-0">
                <Select
                  value={profileId || undefined}
                  onValueChange={setProfileId}
                  disabled={profilesLoading}
                >
                  <SelectTrigger className="flex-1 min-w-0">
                    <SelectValue placeholder={profilesLoading ? "Memuat..." : "Pilih profile"} />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-shrink-0"
                  onClick={() => setManageProfilesOpen(true)}
                >
                  Manage
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mode</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as SaveMode)}
                className="flex flex-col sm:flex-row gap-3"
              >
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="overwrite" id="gmm-mode-overwrite" />
                  Overwrite existing mapping
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="new" id="gmm-mode-new" />
                  Save as new mapping
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="xslt-usercomment">User comment</Label>
              <Input
                id="xslt-usercomment"
                value={usercomment}
                onChange={(e) => setUsercomment(e.target.value)}
                placeholder="Deskripsi singkat mapping..."
                maxLength={255}
              />
            </div>

            {mode === "new" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="xslt-id">ID</Label>
                  <Input
                    id="xslt-id"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="contoh: 2001"
                    className="font-mono text-sm"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xslt-name">Name</Label>
                  <Input
                    id="xslt-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="contoh: ECP_0200_BI_out"
                    className="font-mono text-sm"
                    maxLength={255}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 min-w-0">
                <Label>Select mapping to overwrite</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter by id, name, comment, hash..."
                    className="pl-9"
                  />
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden min-w-0">
                  <div className="max-h-64 overflow-auto">
                    {mappingsLoading ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Memuat mappings...
                      </div>
                    ) : filteredMappings.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">Tidak ada mapping.</div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-8" />
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">ID</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                              User comment
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Hash</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 whitespace-nowrap">
                              Last mod
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredMappings.map((m) => {
                            const selected = selectedId === m.id
                            return (
                              <tr
                                key={m.id}
                                className={`cursor-pointer ${selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                                onClick={() => {
                                  setSelectedId(m.id)
                                  setUsercomment(m.usercomment || "")
                                }}
                              >
                                <td className="px-3 py-2">
                                  {selected && <Check className="h-4 w-4 text-blue-600" />}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">{m.id}</td>
                                <td
                                  className="px-3 py-2 font-mono text-xs max-w-[160px] truncate"
                                  title={m.name}
                                >
                                  {m.name}
                                </td>
                                <td
                                  className="px-3 py-2 text-xs max-w-[180px] truncate"
                                  title={m.usercomment}
                                >
                                  {m.usercomment}
                                </td>
                                <td
                                  className="px-3 py-2 font-mono text-[10px] text-gray-500 max-w-[140px] truncate"
                                  title={m.hash || ""}
                                >
                                  {m.hash || "—"}
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                                  {m.last_mod || "—"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                {selectedId != null && (
                  <div className="text-xs text-gray-500">
                    Selected:{" "}
                    <Badge variant="secondary" className="text-[10px]">
                      #{selectedId}
                    </Badge>
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
          </div>

          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!selectedId || mode !== "overwrite" || historyLoading}
              onClick={openHistory}
              className="sm:mr-auto"
            >
              <History className="h-4 w-4 mr-2" />
              History...
            </Button>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleLoad}
                disabled={loadingMapping || mappingsLoading || !profileId}
              >
                {loadingMapping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={
                  saving ||
                  !profileId ||
                  (mode === "overwrite" && selectedId == null) ||
                  (mode === "new" && (!newId.trim() || !newName.trim()))
                }
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-blue-600" />
              XSLT mapping history
            </DialogTitle>
            <DialogDescription>
              Connection: {profileId || "—"} — Mapping ID: {selectedId ?? "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="border border-gray-200 rounded-xl overflow-hidden min-w-0">
            <div className="max-h-80 overflow-auto">
              {historyLoading ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Memuat history...
                </div>
              ) : historyRows.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">Belum ada history.</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Version</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 whitespace-nowrap">
                        Created at
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Comment</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyRows.map((h) => {
                      const selected = selectedHistoryId === h.id
                      const comment = h.usercomment || h.comment || ""
                      const hash = h.hash || h.checksum || ""
                      return (
                        <tr
                          key={h.id}
                          className={`cursor-pointer ${selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                          onClick={() => setSelectedHistoryId(h.id)}
                          onDoubleClick={() => loadHistoryEntry(h.id)}
                        >
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{h.version ?? h.id}</td>
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                            {h.created_at || "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700 max-w-[180px] truncate" title={comment}>
                            {comment}
                          </td>
                          <td
                            className="px-3 py-2 font-mono text-[10px] text-gray-500 max-w-[220px] truncate"
                            title={hash}
                          >
                            {hash || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => loadHistoryEntry()}
                disabled={!selectedHistoryId || loadingMapping || historyBusy}
              >
                {loadingMapping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load selected
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={deleteSelectedHistory}
                disabled={!selectedHistoryId || historyBusy}
              >
                {historyBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete version
              </Button>
              <Button
                type="button"
                variant="outline"
                className="sm:ml-auto"
                onClick={() => setClearHistoryConfirmOpen(true)}
                disabled={historyRows.length === 0 || historyBusy}
              >
                Clear all history
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Load akan menyalin versi terpilih ke editor saja. Untuk menyimpan kembali ke database, gunakan
              Save XSLT to database (overwrite).
            </p>
          </div>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={clearHistoryConfirmOpen} onOpenChange={setClearHistoryConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">Clear all history?</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <span className="block">
                Semua versi history untuk mapping ini akan dihapus permanen dan tidak bisa dikembalikan.
              </span>
              <span className="block text-sm text-gray-700">
                Connection: <span className="font-medium">{profileId || "—"}</span>
                {" · "}
                Mapping ID: <span className="font-medium">{selectedId ?? "—"}</span>
                {" · "}
                <span className="font-medium">{historyRows.length}</span> version
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel disabled={historyBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                clearAllHistory()
              }}
              disabled={historyBusy}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {historyBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
