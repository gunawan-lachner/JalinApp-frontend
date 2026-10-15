"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Folder,
  FileText,
  RefreshCw,
  ArrowUp,
  Save,
  Loader2,
  AlertCircle,
  FolderOpen,
  FolderSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Briefcase,
  Settings2,
  BookmarkPlus,
  Database,
  Menu,
  Trash2,
} from "lucide-react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  WorkspaceDialog,
  useRenjsWorkspaces,
  type RenjsWorkspace,
} from "@/components/renjs/workspace-dialog"
import { CodeEditorLanguageBadge } from "@/components/renjs/code-editor"
import { SaveScriptDialog } from "@/components/renjs/save-script-dialog"

const CodeEditor = dynamic(
  () => import("@/components/renjs/code-editor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Memuat editor...
      </div>
    ),
  },
)

const ACTIVE_WORKSPACE_KEY = "renjs:active_workspace_id"

interface FileEntry {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified_at: string
  editable: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function parentPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "")
  const idx = normalized.lastIndexOf("/")
  if (idx <= 0) return path
  // Keep Windows drive root like C:/
  if (/^[A-Za-z]:$/.test(normalized.slice(0, idx))) {
    return normalized.slice(0, idx + 1)
  }
  return normalized.slice(0, idx) || "/"
}

function joinPath(dir: string, file: string): string {
  const trimmedDir = dir.replace(/[\\/]+$/, "")
  const sep = dir.includes("\\") && !dir.includes("/") ? "\\" : "/"
  return `${trimmedDir}${sep}${file}`
}

/** Nama file dari field group; editable; default ekstensi .renjs */
function fileNameFromGroup(group: string, fallback = "main"): string {
  let name = (group || "").trim() || fallback
  name = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/^\.+/, "")
  if (!name) name = fallback
  if (!/\.[^.]+$/.test(name)) name += ".renjs"
  return name
}

export function ExplorerTab() {
  const { toast } = useToast()
  const [currentPath, setCurrentPath] = useState("")
  const [pathInput, setPathInput] = useState("")
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [savedContent, setSavedContent] = useState("")
  const [fileLoading, setFileLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [explorerHidden, setExplorerHidden] = useState(false)
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false)
  const [saveDbOpen, setSaveDbOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null
    const stored = localStorage.getItem(ACTIVE_WORKSPACE_KEY)
    return stored ? Number.parseInt(stored, 10) || null : null
  })
  const [savingWorkspace, setSavingWorkspace] = useState(false)

  const { workspaces, loading: workspacesLoading, refresh: refreshWorkspaces } = useRenjsWorkspaces()

  // Dirty = konten berubah (baik dari file disk maupun hasil load dari DB)
  const isDirty = content !== savedContent
  const activeFolder = (currentPath || pathInput).trim()
  const canSaveToFolder = Boolean(activeFolder && selectedName?.trim() && (content || selectedName) && !saving)

  const persistActiveWorkspace = (id: number | null) => {
    setActiveWorkspaceId(id)
    try {
      if (id == null) localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
      else localStorage.setItem(ACTIVE_WORKSPACE_KEY, String(id))
    } catch {
      // ignore storage errors
    }
  }

  const listDirectory = useCallback(async (path: string) => {
    if (!path.trim()) {
      setListError("Path wajib diisi")
      return
    }
    setListLoading(true)
    setListError(null)
    try {
      const res = await rnaApi.renjsListFiles(path.trim())
      if (res.success && res.data?.data) {
        setEntries(res.data.data.entries || [])
        const resolved = res.data.data.path || path.trim()
        setCurrentPath(resolved)
        setPathInput(resolved)
      } else {
        setListError(res.error || res.data?.error || "Gagal memuat daftar file")
        setEntries([])
      }
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e))
      setEntries([])
    } finally {
      setListLoading(false)
    }
  }, [])

  const openWorkspace = useCallback(
    async (workspace: RenjsWorkspace) => {
      persistActiveWorkspace(workspace.id)
      setSelectedPath(null)
      setSelectedName(null)
      setContent("")
      setSavedContent("")
      await listDirectory(workspace.path)
      toast({
        title: "Workspace dibuka",
        description: workspace.name,
      })
    },
    [listDirectory, toast],
  )

  useEffect(() => {
    const boot = async () => {
      await refreshWorkspaces()
      try {
        const storedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_WORKSPACE_KEY) : null
        const activeId = storedId ? Number.parseInt(storedId, 10) : NaN
        if (activeId) {
          const res = await rnaApi.renjsGetWorkspace(activeId)
          if (res.success && res.data?.data?.workspace) {
            persistActiveWorkspace(res.data.data.workspace.id)
            await listDirectory(res.data.data.workspace.path)
            return
          }
        }
      } catch {
        // fall through to default path
      }

      try {
        const res = await rnaApi.renjsDefaultPath()
        const path = res.data?.data?.path || ""
        if (path) {
          setPathInput(path)
          setCurrentPath(path)
          await listDirectory(path)
        }
      } catch {
        // ignore — user can enter path manually
      }
    }
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openFile = async (entry: FileEntry) => {
    if (!entry.editable) {
      toast({
        title: "Tidak dapat dibuka",
        description: "Hanya file teks (.txt, .renjs, .md, dll) yang bisa diedit.",
        variant: "destructive",
      })
      return
    }
    setFileLoading(true)
    setFileError(null)
    setSelectedPath(entry.path)
    setSelectedName(entry.name)
    try {
      const res = await rnaApi.renjsReadFile(entry.path)
      if (res.success && res.data?.data) {
        const text = res.data.data.content ?? ""
        setContent(text)
        setSavedContent(text)
      } else {
        setFileError(res.error || res.data?.error || "Gagal membaca file")
        setContent("")
        setSavedContent("")
      }
    } catch (e) {
      setFileError(e instanceof Error ? e.message : String(e))
      setContent("")
      setSavedContent("")
    } finally {
      setFileLoading(false)
    }
  }

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.is_dir) {
      listDirectory(entry.path)
    } else {
      openFile(entry)
    }
  }

  const handleDeleteFile = async () => {
    if (!deleteTarget || deleteTarget.is_dir) return
    setDeleting(true)
    try {
      const res = await rnaApi.renjsDeleteFile(deleteTarget.path)
      if (res.success && res.data?.success !== false) {
        toast({
          title: "File dihapus",
          description: deleteTarget.name,
        })
        if (selectedPath === deleteTarget.path) {
          setSelectedPath(null)
          setSelectedName(null)
          setContent("")
          setSavedContent("")
          setFileError(null)
        }
        setDeleteTarget(null)
        if (currentPath) {
          await listDirectory(currentPath)
        }
      } else {
        toast({
          title: "Gagal menghapus",
          description: res.error || res.data?.error || "Tidak dapat menghapus file",
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

  const handleSave = async () => {
    const folder = (currentPath || pathInput).trim()
    const fileName = (selectedName || "").trim()
    if (!folder) {
      toast({
        title: "Folder aktif kosong",
        description: "Buka folder di Explorer terlebih dahulu.",
        variant: "destructive",
      })
      return
    }
    if (!fileName) {
      toast({
        title: "Nama file kosong",
        description: "Isi nama file (dari group) sebelum menyimpan.",
        variant: "destructive",
      })
      return
    }

    // Selalu simpan ke folder aktif + nama file (editable, default dari group)
    const savePath = joinPath(folder, fileName)

    setSaving(true)
    setFileError(null)
    try {
      const res = await rnaApi.renjsWriteFile(savePath, content)
      if (res.success && res.data?.success !== false) {
        const resolved = res.data?.data?.path || savePath
        setSelectedPath(resolved)
        setSelectedName(fileName)
        setSavedContent(content)
        toast({
          title: "Tersimpan",
          description: `Disimpan ke ${resolved}`,
        })
        await listDirectory(folder)
      } else {
        const msg = res.error || res.data?.error || "Gagal menyimpan file"
        setFileError(msg)
        toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setFileError(msg)
      toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAsWorkspace = async () => {
    const path = (currentPath || pathInput).trim()
    if (!path) {
      toast({
        title: "Path kosong",
        description: "Buka folder terlebih dahulu sebelum menyimpan sebagai workspace.",
        variant: "destructive",
      })
      return
    }
    const baseName = path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "Workspace"
    const name = window.prompt("Nama workspace:", baseName)
    if (!name || !name.trim()) return

    setSavingWorkspace(true)
    try {
      const res = await rnaApi.renjsSaveWorkspace({
        name: name.trim(),
        path,
      })
      if (res.success && res.data?.data?.workspace) {
        const ws = res.data.data.workspace
        persistActiveWorkspace(ws.id)
        await refreshWorkspaces()
        toast({ title: "Workspace disimpan", description: ws.name })
      } else {
        toast({
          title: "Gagal menyimpan workspace",
          description: res.error || res.data?.error || "Tidak dapat menyimpan",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Gagal menyimpan workspace",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    } finally {
      setSavingWorkspace(false)
    }
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="flex gap-2 min-w-0 lg:w-72 flex-shrink-0">
          <Select
            value={activeWorkspaceId ? String(activeWorkspaceId) : undefined}
            onValueChange={(value) => {
              const ws = workspaces.find((w) => String(w.id) === value)
              if (ws) openWorkspace(ws)
            }}
            disabled={workspacesLoading || workspaces.length === 0}
          >
            <SelectTrigger className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Briefcase className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <SelectValue
                  placeholder={workspacesLoading ? "Memuat workspace..." : "Pilih workspace"}
                />
              </div>
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((ws) => (
                <SelectItem key={ws.id} value={String(ws.id)}>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{ws.name}</div>
                    <div className="truncate font-mono text-[10px] text-gray-400">{ws.path}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={() => setWorkspaceDialogOpen(true)}
            title="Kelola workspace"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={handleSaveAsWorkspace}
            disabled={savingWorkspace || !(currentPath || pathInput).trim()}
            title="Simpan path saat ini sebagai workspace"
          >
            {savingWorkspace ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookmarkPlus className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Input
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") listDirectory(pathInput)
          }}
          placeholder="Path folder di server (contoh: /app/renjs atau C:\\renjs)"
          className="flex-1 font-mono text-sm min-w-0"
        />
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBrowseOpen(true)}
            disabled={listLoading}
            title="Browse folder di server"
          >
            <FolderSearch className="h-4 w-4" />
            <span className="ml-2">Browse</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => currentPath && listDirectory(parentPath(currentPath))}
            disabled={!currentPath || listLoading}
            title="Folder induk"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => listDirectory(pathInput)}
            disabled={listLoading}
          >
            {listLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {activeWorkspace && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Briefcase className="h-3.5 w-3.5 text-blue-600" />
          <span>
            Workspace aktif: <span className="font-medium text-gray-700">{activeWorkspace.name}</span>
          </span>
        </div>
      )}

      <FolderBrowseDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        initialPath={currentPath || pathInput}
        onSelect={(path) => {
          setPathInput(path)
          listDirectory(path)
        }}
      />

      <WorkspaceDialog
        open={workspaceDialogOpen}
        onOpenChange={setWorkspaceDialogOpen}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        defaultPath={currentPath || pathInput}
        onRefresh={refreshWorkspaces}
        onOpenWorkspace={openWorkspace}
      />

      <SaveScriptDialog
        open={saveDbOpen}
        onOpenChange={setSaveDbOpen}
        content={content}
        suggestedName="main"
        suggestedGroup={(selectedName || "").replace(/\.[^.]+$/, "") || ""}
        onLoadedContent={(loaded, meta) => {
          const fileName = fileNameFromGroup(meta.group_name || "", meta.name || "main")
          setContent(loaded)
          setSavedContent(loaded)
          setSelectedName(fileName)
          setSelectedPath(null)
          setFileError(null)
          toast({
            title: "Konten dimuat dari DB",
            description: `Nama file: ${fileName} (dari group${meta.group_name ? `: ${meta.group_name}` : ""})`,
          })
        }}
      />

      {listError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{listError}</AlertDescription>
        </Alert>
      )}

      <div className="h-[min(70vh,640px)] min-h-[480px] flex gap-2">
        {explorerHidden && (
          <div className="flex flex-col items-center border border-gray-200 rounded-xl bg-white px-1 py-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setExplorerHidden(false)}
              title="Tampilkan Explorer"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
            <span
              className="text-[10px] font-medium text-gray-500 tracking-wide"
              style={{ writingMode: "vertical-rl" }}
            >
              Explorer
            </span>
          </div>
        )}

        <ResizablePanelGroup
          key={explorerHidden ? "hidden" : "shown"}
          direction="horizontal"
          className="flex-1 rounded-xl border border-gray-200 overflow-hidden bg-white"
        >
          {!explorerHidden && (
            <>
              <ResizablePanel defaultSize={35} minSize={18} maxSize={60} className="min-w-0">
                <div className="h-full flex flex-col bg-white">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 min-w-0">
                      <FolderOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="truncate">Explorer</span>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {entries.length} item
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 flex-shrink-0"
                      onClick={() => setExplorerHidden(true)}
                      title="Sembunyikan Explorer"
                    >
                      <PanelLeftClose className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {listLoading ? (
                      <div className="p-8 text-center text-gray-500">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Memuat...
                      </div>
                    ) : entries.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        {currentPath
                          ? "Folder kosong atau tidak ada file teks."
                          : "Masukkan path lalu tekan Refresh."}
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {entries.map((entry) => {
                          const isSelected = selectedPath === entry.path
                          return (
                            <li
                              key={entry.path}
                              className={`group flex items-center gap-1 pr-1 ${
                                isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleEntryClick(entry)}
                                className={`flex-1 min-w-0 flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                  isSelected ? "text-blue-800" : "text-gray-700"
                                }`}
                              >
                                {entry.is_dir ? (
                                  <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                ) : (
                                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="truncate font-medium">{entry.name}</div>
                                  {!entry.is_dir && (
                                    <div className="text-xs text-gray-400">
                                      {formatSize(entry.size)} · {entry.modified_at}
                                    </div>
                                  )}
                                </div>
                              </button>
                              {!entry.is_dir && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 flex-shrink-0 opacity-70 group-hover:opacity-100"
                                      title="Menu file"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Menu className="h-4 w-4" />
                                      <span className="sr-only">Menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                      onClick={() => setDeleteTarget(entry)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete file
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          <ResizablePanel defaultSize={explorerHidden ? 100 : 65} minSize={30} className="min-w-0">
            <div className="h-full flex flex-col bg-white">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Input
                      value={selectedName || ""}
                      onChange={(e) => setSelectedName(e.target.value)}
                      placeholder="Nama file (dari group)"
                      className="h-8 max-w-xs font-mono text-sm"
                      disabled={!selectedPath && !selectedName && !content}
                    />
                    {selectedName && <CodeEditorLanguageBadge fileName={selectedName} />}
                    {isDirty && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex-shrink-0">
                        Belum disimpan
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 font-mono truncate" title={selectedPath || activeFolder || ""}>
                    {selectedPath
                      ? selectedPath
                      : activeFolder
                        ? `Akan disimpan ke: ${joinPath(activeFolder, selectedName || "…")}`
                        : "Buka folder aktif di Explorer untuk menyimpan"}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSaveDbOpen(true)}
                    disabled={!selectedPath && !selectedName && !content}
                    title="Save script to database"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Save to DB
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!canSaveToFolder}
                    title={
                      !activeFolder
                        ? "Buka folder di Explorer terlebih dahulu"
                        : !selectedName?.trim()
                          ? "Isi nama file terlebih dahulu"
                          : `Simpan ke folder aktif: ${activeFolder}`
                    }
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Simpan
                  </Button>
                </div>
              </div>

              {fileError && (
                <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}

              <div className="flex-1 min-h-0">
                {fileLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Membaca file...
                  </div>
                ) : !selectedPath && !selectedName ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    Pilih file teks dari explorer untuk mengedit.
                  </div>
                ) : (
                  <CodeEditor
                    value={content}
                    onChange={setContent}
                    fileName={selectedName || selectedPath}
                  />
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">Delete file?</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <span className="block">File akan dihapus permanen dari disk server.</span>
              <span className="block font-mono text-sm text-gray-800 break-all">
                {deleteTarget?.name}
              </span>
              {deleteTarget?.path && (
                <span className="block font-mono text-xs text-gray-500 break-all">{deleteTarget.path}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteFile()
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
