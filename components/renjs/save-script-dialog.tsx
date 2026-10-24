"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Database,
  Link2,
  Loader2,
  Search,
  History,
  AlertCircle,
  Check,
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

export interface DbScriptRow {
  id: number
  group_name: string
  name: string
  checksum?: string
  comment?: string | null
  last_update?: string
}

interface SaveScriptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  /** Dialog opened for save or load — affects title only */
  intent?: "save" | "load"
  suggestedName?: string
  suggestedGroup?: string
  onLoadedContent?: (content: string, meta: { id: number; group_name: string; name: string }) => void
}

type SaveMode = "overwrite" | "new"

const PROFILE_STORAGE_KEY = "renjs:script_profile_id"

export function SaveScriptDialog({
  open,
  onOpenChange,
  content,
  intent = "save",
  suggestedName = "",
  suggestedGroup = "",
  onLoadedContent,
}: SaveScriptDialogProps) {
  const { toast } = useToast()

  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [profileId, setProfileId] = useState("")
  const [mode, setMode] = useState<SaveMode>("overwrite")
  const [comment, setComment] = useState("")
  const [filter, setFilter] = useState("")
  const [scripts, setScripts] = useState<DbScriptRow[]>([])
  const [scriptsLoading, setScriptsLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [newGroup, setNewGroup] = useState("")
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)
  const [loadingScript, setLoadingScript] = useState(false)
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
      script_id: number
      version?: number
      checksum?: string
      comment?: string | null
      created_at?: string
      content_length?: number
    }>
  >([])

  const filteredScripts = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return scripts
    return scripts.filter(
      (s) =>
        String(s.id).includes(q) ||
        (s.group_name || "").toLowerCase().includes(q) ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.checksum || "").toLowerCase().includes(q) ||
        (s.comment || "").toLowerCase().includes(q),
    )
  }, [scripts, filter])

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
          (stored && list.some((p) => p.name === stored) && stored) ||
          list[0]?.name ||
          ""
        setProfileId(initial)
      }
    } finally {
      setProfilesLoading(false)
    }
  }, [])

  const loadScripts = useCallback(async (pid: string) => {
    if (!pid) return
    setScriptsLoading(true)
    setError(null)
    try {
      const res = await rnaApi.renjsListScripts(pid)
      if (res.success && res.data?.data) {
        setScripts(res.data.data.scripts || [])
      } else {
        setError(res.error || res.data?.error || "Gagal memuat daftar script")
        setScripts([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setScripts([])
    } finally {
      setScriptsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setMode("overwrite")
    setComment("")
    setFilter("")
    setSelectedId(null)
    // Default: Script Name = "main"; Group = nama file (tanpa ekstensi)
    setNewGroup(suggestedGroup || "")
    setNewName(suggestedName?.trim() || "main")
    setError(null)
    setHistoryOpen(false)
    loadProfiles()
  }, [open, suggestedGroup, suggestedName, loadProfiles])

  useEffect(() => {
    if (!open || !profileId) return
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, profileId)
    } catch {
      // ignore
    }
    loadScripts(profileId)
  }, [open, profileId, loadScripts])

  const handleSave = async () => {
    if (!profileId) {
      toast({ title: "Profile wajib", description: "Pilih connection profile.", variant: "destructive" })
      return
    }
    if (mode === "overwrite" && !selectedId) {
      toast({
        title: "Pilih script",
        description: "Pilih script yang akan di-overwrite.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    setError(null)
    try {
      const resolvedName = newName.trim() || "main"
      const resolvedGroup = newGroup.trim() || suggestedGroup.trim() || undefined
      const res = await rnaApi.renjsSaveScript({
        profileId,
        mode,
        content,
        comment: comment.trim() || undefined,
        ...(mode === "overwrite"
          ? { id: selectedId! }
          : {
              name: resolvedName,
              ...(resolvedGroup ? { group_name: resolvedGroup } : {}),
            }),
      })
      if (res.success && res.data?.data?.script) {
        const s = res.data.data.script
        toast({
          title: mode === "overwrite" ? "Script di-overwrite" : "Script baru disimpan",
          description: `${s.group_name} / ${s.name}`,
        })
        onOpenChange(false)
      } else {
        const msg = res.error || res.data?.error || "Gagal menyimpan script"
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

  const handleLoadScripts = async () => {
    if (mode === "overwrite") {
      if (!selectedId) {
        toast({
          title: "Pilih script",
          description: "Pilih baris script lalu Load scripts.",
          variant: "destructive",
        })
        return
      }
      if (!profileId) return
      setLoadingScript(true)
      try {
        const res = await rnaApi.renjsGetScript(profileId, selectedId)
        if (res.success && res.data?.data?.script) {
          const s = res.data.data.script
          onLoadedContent?.(s.content || "", {
            id: s.id,
            group_name: s.group_name,
            name: s.name,
          })
          toast({
            title: "Script dimuat",
            description: `${s.group_name} / ${s.name}`,
          })
          onOpenChange(false)
        } else {
          toast({
            title: "Gagal memuat",
            description: res.error || res.data?.error || "Tidak dapat memuat script",
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
        setLoadingScript(false)
      }
      return
    }

    // new mode: just refresh list
    await loadScripts(profileId)
  }

  const openHistory = async () => {
    if (!profileId || !selectedId) return
    setHistoryOpen(true)
    setHistoryLoading(true)
    setSelectedHistoryId(null)
    try {
      const res = await rnaApi.renjsScriptHistory(profileId, selectedId)
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
    setLoadingScript(true)
    try {
      const res = await rnaApi.renjsScriptHistoryGet(profileId, targetId)
      if (res.success && res.data?.data?.history) {
        const h = res.data.data.history
        const meta = scripts.find((s) => s.id === h.script_id)
        onLoadedContent?.(h.content || "", {
          id: h.script_id,
          group_name: meta?.group_name || "",
          name: meta?.name || `history-${h.id}`,
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
      setLoadingScript(false)
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
      const res = await rnaApi.renjsScriptHistoryDelete(profileId, selectedHistoryId)
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
      const res = await rnaApi.renjsScriptHistoryClear(profileId, selectedId)
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
              {intent === "load" ? "Load script from database" : "Save script to database"}
            </DialogTitle>
            <DialogDescription>
              {intent === "load"
                ? "Load a database script into the editor"
                : "Save current editor content to a database script"}
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
                  <RadioGroupItem value="overwrite" id="mode-overwrite" />
                  Overwrite existing script
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="new" id="mode-new" />
                  Save as new script
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="script-comment">Comment (optional)</Label>
              <Input
                id="script-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Short description for this version..."
              />
            </div>

            {mode === "new" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="script-name">Script Name</Label>
                  <Input
                    id="script-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="contoh: Gunawan script"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="script-group">Group (optional)</Label>
                  <Input
                    id="script-group"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    placeholder="contoh: Guntam"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 min-w-0">
                <Label>Select script to overwrite</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter scripts..."
                    className="pl-9"
                  />
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden min-w-0">
                  <div className="max-h-64 overflow-auto">
                    {scriptsLoading ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Memuat scripts...
                      </div>
                    ) : filteredScripts.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">Tidak ada script.</div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-8" />
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">ID</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Group</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Checksum</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 whitespace-nowrap">
                              Last update
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredScripts.map((s) => {
                            const selected = selectedId === s.id
                            return (
                              <tr
                                key={s.id}
                                className={`cursor-pointer ${selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                                onClick={() => setSelectedId(s.id)}
                              >
                                <td className="px-3 py-2">
                                  {selected && <Check className="h-4 w-4 text-blue-600" />}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">{s.id}</td>
                                <td className="px-3 py-2 font-mono text-xs max-w-[160px] truncate" title={s.group_name}>
                                  {s.group_name}
                                </td>
                                <td className="px-3 py-2 font-medium max-w-[120px] truncate" title={s.name}>
                                  {s.name}
                                </td>
                                <td
                                  className="px-3 py-2 font-mono text-[10px] text-gray-500 max-w-[140px] truncate"
                                  title={s.checksum}
                                >
                                  {s.checksum}
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                                  {s.last_update || "—"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                {selectedId && (
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
                onClick={handleLoadScripts}
                disabled={loadingScript || scriptsLoading || !profileId}
              >
                {loadingScript ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load scripts
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !profileId || (mode === "overwrite" && !selectedId)}
                title={
                  !profileId
                    ? "Pilih connection profile terlebih dahulu"
                    : mode === "overwrite" && !selectedId
                      ? "Pilih script yang akan di-overwrite"
                      : "Simpan ke database"
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
              Script history (local)
            </DialogTitle>
            <DialogDescription>
              Connection: {profileId || "—"} — Script ID: {selectedId ?? "—"}
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
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Checksum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyRows.map((h) => {
                      const selected = selectedHistoryId === h.id
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
                          <td className="px-3 py-2 text-xs text-gray-700 max-w-[180px] truncate" title={h.comment || ""}>
                            {h.comment || ""}
                          </td>
                          <td
                            className="px-3 py-2 font-mono text-[10px] text-gray-500 max-w-[220px] truncate"
                            title={h.checksum || ""}
                          >
                            {h.checksum || "—"}
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
                disabled={!selectedHistoryId || loadingScript || historyBusy}
              >
                {loadingScript ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
              Load will copy the selected version into the editor only. To persist it back to the database, use
              &apos;Save script to database&apos; (overwrite).
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
                Semua versi lokal untuk script ini akan dihapus permanen dan tidak bisa dikembalikan.
              </span>
              <span className="block text-sm text-gray-700">
                Connection: <span className="font-medium">{profileId || "—"}</span>
                {" · "}
                Script ID: <span className="font-medium">{selectedId ?? "—"}</span>
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
