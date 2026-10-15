"use client"

import { useCallback, useEffect, useState } from "react"
import { Database, Link2, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface ManageDbProfilesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProfileName?: string
  onProfilesChanged?: (profiles: ConnectionProfile[], selectedName?: string) => void
}

const emptyForm = (): ConnectionProfile => ({
  name: "",
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "",
  database: "",
  category: "",
  connection_type: "DB",
})

export function ManageDbProfilesDialog({
  open,
  onOpenChange,
  selectedProfileName,
  onProfilesChanged,
}: ManageDbProfilesDialogProps) {
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [originalName, setOriginalName] = useState("")
  const [form, setForm] = useState<ConnectionProfile>(emptyForm())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const loadProfiles = useCallback(async (preferName?: string) => {
    setLoading(true)
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
        const pick =
          (preferName && list.find((p) => p.name === preferName)?.name) ||
          (selectedProfileName && list.find((p) => p.name === selectedProfileName)?.name) ||
          list[0]?.name ||
          ""
        if (pick) {
          const found = list.find((p) => p.name === pick)!
          setIsNew(false)
          setOriginalName(found.name)
          setForm({ ...found, password: "" })
        } else {
          setIsNew(true)
          setOriginalName("")
          setForm(emptyForm())
        }
        onProfilesChanged?.(list, pick || undefined)
      } else {
        toast({
          title: "Gagal memuat profiles",
          description: res.error || "Tidak dapat memuat connection profiles",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Gagal memuat profiles",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [onProfilesChanged, selectedProfileName, toast])

  useEffect(() => {
    if (!open) return
    loadProfiles(selectedProfileName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectProfile = (profile: ConnectionProfile) => {
    setIsNew(false)
    setOriginalName(profile.name)
    setForm({ ...profile, password: "" })
  }

  const handleNew = () => {
    setIsNew(true)
    setOriginalName("")
    setForm(emptyForm())
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name wajib", description: "Isi nama profile.", variant: "destructive" })
      return
    }
    if (!form.host.trim() || !form.database.trim() || !form.user.trim()) {
      toast({
        title: "Field wajib",
        description: "Host, User, dan Database harus diisi.",
        variant: "destructive",
      })
      return
    }
    if (isNew && !form.password) {
      toast({ title: "Password wajib", description: "Isi password untuk profile baru.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload: ConnectionProfile = {
        ...form,
        name: form.name.trim(),
        host: form.host.trim(),
        database: form.database.trim(),
        user: form.user.trim(),
        category: form.category || "",
        connection_type: form.connection_type || "DB",
        port: Number(form.port) || 3306,
      }

      const res = isNew
        ? await rnaApi.createConnectionProfile(payload)
        : await rnaApi.updateConnectionProfile(originalName || payload.name, payload)

      if (res.success) {
        toast({
          title: isNew ? "Profile dibuat" : "Profile disimpan",
          description: payload.name,
        })
        await loadProfiles(payload.name)
      } else {
        toast({
          title: "Gagal menyimpan",
          description: res.error || "Tidak dapat menyimpan profile",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Gagal menyimpan",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const name = originalName || form.name
    if (!name || isNew) return
    setDeleting(true)
    try {
      const res = await rnaApi.deleteConnectionProfile(name)
      if (res.success) {
        toast({ title: "Profile dihapus", description: name })
        setDeleteConfirmOpen(false)
        await loadProfiles()
      } else {
        toast({
          title: "Gagal menghapus",
          description: res.error || "Tidak dapat menghapus profile",
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

  const selectedName = isNew ? "" : originalName

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Manage DB Connection Profiles
            </DialogTitle>
            <DialogDescription>Create, update, and delete MySQL connection profiles.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[420px] min-w-0">
            {/* Left: profiles list */}
            <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col min-w-0">
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5" />
                Profiles
              </div>
              <div className="flex-1 overflow-auto max-h-[380px]">
                {loading ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Memuat profiles...
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">Belum ada profile.</div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Host</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">DB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {profiles.map((p) => {
                        const active = !isNew && selectedName === p.name
                        return (
                          <tr
                            key={p.name}
                            className={`cursor-pointer ${active ? "bg-blue-50" : "hover:bg-gray-50"}`}
                            onClick={() => selectProfile(p)}
                          >
                            <td className="px-3 py-2 font-medium whitespace-nowrap">{p.name}</td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">{p.host}</td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">{p.database}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right: profile details */}
            <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col min-w-0">
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
                Profile details {isNew ? "(new)" : selectedName ? `— ${selectedName}` : ""}
              </div>
              <div className="p-4 space-y-3 overflow-auto">
                <div className="space-y-1.5">
                  <Label htmlFor="mgr-name">Name</Label>
                  <Input
                    id="mgr-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="mgr-host">Host</Label>
                    <Input
                      id="mgr-host"
                      value={form.host}
                      onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mgr-port">Port</Label>
                    <Input
                      id="mgr-port"
                      type="number"
                      value={form.port}
                      onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) || 3306 }))}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mgr-user">User</Label>
                    <Input
                      id="mgr-user"
                      value={form.user}
                      onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mgr-pass">Password</Label>
                    <Input
                      id="mgr-pass"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder={isNew ? "Required for new profile" : "(leave blank to keep existing)"}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mgr-db">Database</Label>
                    <Input
                      id="mgr-db"
                      value={form.database}
                      onChange={(e) => setForm((f) => ({ ...f, database: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mgr-cat">Category (optional)</Label>
                    <Input
                      id="mgr-cat"
                      value={form.category || ""}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="DEV / SIT / UAT"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Tip: on edit, leave password empty to keep current password.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleNew} disabled={saving || deleting}>
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={isNew || !originalName || saving || deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleSave} disabled={saving || deleting || loading}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">Delete profile?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Profile <span className="font-medium text-gray-800">{originalName}</span> akan dihapus. Ini tidak menghapus
              data di database MySQL target.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
