"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowUp, Folder, FolderOpen, HardDrive, Loader2, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { rnaApi } from "@/lib/api"

interface FolderEntry {
  name: string
  path: string
  is_dir: boolean
}

interface FolderBrowseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPath?: string
  onSelect: (path: string) => void
}

function parentPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "")
  const idx = normalized.lastIndexOf("/")
  if (idx <= 0) return path
  if (/^[A-Za-z]:$/.test(normalized.slice(0, idx))) {
    return normalized.slice(0, idx + 1)
  }
  return normalized.slice(0, idx) || "/"
}

export function FolderBrowseDialog({ open, onOpenChange, initialPath, onSelect }: FolderBrowseDialogProps) {
  const [mode, setMode] = useState<"roots" | "folder">("roots")
  const [currentPath, setCurrentPath] = useState("")
  const [roots, setRoots] = useState<FolderEntry[]>([])
  const [folders, setFolders] = useState<FolderEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState("")

  const loadRoots = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMode("roots")
    try {
      const res = await rnaApi.renjsListRoots()
      if (res.success && res.data?.data) {
        setRoots(res.data.data.roots || [])
      } else {
        setError(res.error || res.data?.error || "Gagal memuat root folder")
        setRoots([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setRoots([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFolders = useCallback(async (path: string) => {
    if (!path.trim()) {
      await loadRoots()
      return
    }
    setLoading(true)
    setError(null)
    setMode("folder")
    try {
      const res = await rnaApi.renjsListFiles(path.trim(), "*", { dirs_only: true })
      if (res.success && res.data?.data) {
        const resolved = res.data.data.path || path.trim()
        setCurrentPath(resolved)
        setSelectedPath(resolved)
        setFolders((res.data.data.entries || []).filter((e) => e.is_dir))
      } else {
        setError(res.error || res.data?.error || "Gagal memuat folder")
        setFolders([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setFolders([])
    } finally {
      setLoading(false)
    }
  }, [loadRoots])

  useEffect(() => {
    if (!open) return
    const start = (initialPath || "").trim()
    if (start) {
      loadFolders(start)
    } else {
      setCurrentPath("")
      setSelectedPath("")
      loadRoots()
    }
  }, [open, initialPath, loadFolders, loadRoots])

  const handleConfirm = () => {
    if (!selectedPath) return
    onSelect(selectedPath)
    onOpenChange(false)
  }

  const items = mode === "roots" ? roots : folders

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl overflow-hidden">
        <DialogHeader className="min-w-0 pr-6">
          <DialogTitle>Pilih Folder</DialogTitle>
          <DialogDescription>
            Browse folder di server backend, lalu pilih folder yang ingin dibuka di Explorer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => {
                if (mode === "folder" && currentPath) {
                  const parent = parentPath(currentPath)
                  if (parent === currentPath) {
                    loadRoots()
                    setCurrentPath("")
                    setSelectedPath("")
                  } else {
                    loadFolders(parent)
                  }
                } else {
                  loadRoots()
                }
              }}
              disabled={loading}
              title="Naik ke folder induk"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-xs text-gray-500">Lokasi saat ini</div>
              <div
                className="font-mono text-sm text-gray-800 truncate"
                title={mode === "roots" ? "Root folders" : currentPath || "—"}
              >
                {mode === "roots" ? "Root folders" : currentPath || "—"}
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="break-words">{error}</AlertDescription>
            </Alert>
          )}

          <div className="border border-gray-200 rounded-xl overflow-hidden min-w-0">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 min-w-0">
                <FolderOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="truncate">{mode === "roots" ? "Root" : "Subfolder"}</span>
              </div>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {items.length}
              </Badge>
            </div>
            <div className="max-h-72 overflow-y-auto overflow-x-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Memuat folder...
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">Tidak ada folder.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const isSelected = selectedPath === item.path
                    return (
                      <li key={item.path} className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedPath(item.path)}
                          onDoubleClick={() => loadFolders(item.path)}
                          title={item.path}
                          className={`w-full max-w-full min-w-0 flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors overflow-hidden ${
                            isSelected ? "bg-blue-50 text-blue-800" : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          {mode === "roots" ? (
                            <HardDrive className="h-4 w-4 text-slate-500 flex-shrink-0" />
                          ) : (
                            <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="truncate font-medium">{item.name}</div>
                            <div className="truncate font-mono text-xs text-gray-400">{item.path}</div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Klik sekali untuk memilih, double-click untuk masuk ke dalam folder.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => selectedPath && loadFolders(selectedPath)}
            disabled={!selectedPath || loading}
          >
            Buka
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedPath || loading}>
            Pilih Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
