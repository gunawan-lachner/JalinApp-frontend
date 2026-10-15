"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  FolderOpen,
  FolderSearch,
  Briefcase,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { FolderBrowseDialog } from "@/components/renjs/folder-browse-dialog"

export interface RenjsWorkspace {
  id: number
  name: string
  path: string
  description?: string | null
  created_at?: string
  updated_at?: string
}

interface WorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaces: RenjsWorkspace[]
  activeWorkspaceId?: number | null
  defaultPath?: string
  onRefresh: () => Promise<void> | void
  onOpenWorkspace: (workspace: RenjsWorkspace) => void
}

type FormMode = "create" | "edit"

export function WorkspaceDialog({
  open,
  onOpenChange,
  workspaces,
  activeWorkspaceId,
  defaultPath = "",
  onRefresh,
  onOpenWorkspace,
}: WorkspaceDialogProps) {
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>("create")
  const [formLoading, setFormLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RenjsWorkspace | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [form, setForm] = useState({ id: 0, name: "", path: "", description: "" })

  useEffect(() => {
    if (!open) {
      setFormOpen(false)
      setDeleteTarget(null)
    }
  }, [open])

  const openCreate = () => {
    setFormMode("create")
    setForm({
      id: 0,
      name: "",
      path: defaultPath || "",
      description: "",
    })
    setFormOpen(true)
  }

  const openEdit = (ws: RenjsWorkspace) => {
    setFormMode("edit")
    setForm({
      id: ws.id,
      name: ws.name,
      path: ws.path,
      description: ws.description || "",
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nama wajib", description: "Isi nama workspace.", variant: "destructive" })
      return
    }
    if (!form.path.trim()) {
      toast({ title: "Path wajib", description: "Isi path folder workspace.", variant: "destructive" })
      return
    }

    setFormLoading(true)
    try {
      const res = await rnaApi.renjsSaveWorkspace({
        ...(formMode === "edit" ? { id: form.id } : {}),
        name: form.name.trim(),
        path: form.path.trim(),
        description: form.description.trim() || undefined,
      })
      if (res.success && res.data?.data) {
        toast({
          title: formMode === "edit" ? "Workspace diperbarui" : "Workspace dibuat",
          description: res.data.data.workspace?.name || form.name,
        })
        setFormOpen(false)
        await onRefresh()
      } else {
        toast({
          title: "Gagal menyimpan",
          description: res.error || res.data?.error || "Tidak dapat menyimpan workspace",
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
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await rnaApi.renjsDeleteWorkspace(deleteTarget.id)
      if (res.success) {
        toast({ title: "Workspace dihapus", description: deleteTarget.name })
        setDeleteTarget(null)
        await onRefresh()
      } else {
        toast({
          title: "Gagal menghapus",
          description: res.error || res.data?.error || "Tidak dapat menghapus workspace",
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Kelola Workspace
            </DialogTitle>
            <DialogDescription>
              Buat, buka, atau hapus workspace bernama. Path tersimpan di server dan bisa dibuka ulang kapan saja.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 min-w-0">
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Workspace Baru
              </Button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden min-w-0">
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Daftar Workspace</span>
                <Badge variant="secondary" className="text-xs">
                  {workspaces.length}
                </Badge>
              </div>
              <div className="max-h-80 overflow-y-auto overflow-x-hidden">
                {workspaces.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    Belum ada workspace. Buat yang baru untuk mulai.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {workspaces.map((ws) => {
                      const isActive = activeWorkspaceId === ws.id
                      return (
                        <li key={ws.id} className="min-w-0">
                          <div
                            className={`flex items-start gap-3 px-4 py-3 ${
                              isActive ? "bg-blue-50" : "hover:bg-gray-50"
                            }`}
                          >
                            <FolderOpen className="h-4 w-4 text-amber-500 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-sm text-gray-900 truncate">{ws.name}</span>
                                {isActive && (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                                    Aktif
                                  </Badge>
                                )}
                              </div>
                              <div className="font-mono text-xs text-gray-400 truncate" title={ws.path}>
                                {ws.path}
                              </div>
                              {ws.description && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{ws.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  onOpenWorkspace(ws)
                                  onOpenChange(false)
                                }}
                              >
                                Buka
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => openEdit(ws)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => setDeleteTarget(ws)}
                                title="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle>{formMode === "edit" ? "Edit Workspace" : "Workspace Baru"}</DialogTitle>
            <DialogDescription>Isi nama proyek dan path folder di server backend.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 min-w-0">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Nama</Label>
              <Input
                id="ws-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="contoh: Project Issuer ABC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-path">Path Folder</Label>
              <div className="flex gap-2 min-w-0">
                <Input
                  id="ws-path"
                  value={form.path}
                  onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
                  placeholder="C:\\renjs\\project atau /app/renjs"
                  className="font-mono text-sm min-w-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="flex-shrink-0"
                  onClick={() => setBrowseOpen(true)}
                  title="Browse folder"
                >
                  <FolderSearch className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-desc">Deskripsi (opsional)</Label>
              <Textarea
                id="ws-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Catatan singkat tentang workspace ini"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={formLoading}>
              Batal
            </Button>
            <Button type="button" onClick={handleSave} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FolderBrowseDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        initialPath={form.path || defaultPath}
        onSelect={(path) => setForm((f) => ({ ...f, path }))}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Workspace <span className="font-medium">{deleteTarget?.name}</span> akan dihapus. File di disk tidak
              ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function useRenjsWorkspaces() {
  const [workspaces, setWorkspaces] = useState<RenjsWorkspace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await rnaApi.renjsListWorkspaces()
      if (res.success && res.data?.data) {
        setWorkspaces(res.data.data.workspaces || [])
      } else {
        setError(res.error || res.data?.error || "Gagal memuat workspace")
        setWorkspaces([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setWorkspaces([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { workspaces, loading, error, refresh, setWorkspaces }
}
