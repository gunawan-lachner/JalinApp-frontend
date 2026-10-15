"use client"

import { useEffect, useState, useCallback } from "react"
import { FileCode2, Plus, Edit, Trash2, Loader2, AlertCircle, CheckCircle, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { rnaApi } from "@/lib/api"
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

interface SshSnippet {
  id?: number
  name: string
  description?: string
  commands: string
}

export function SshSnippetTab() {
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role_name === "admin"

  const [snippets, setSnippets] = useState<SshSnippet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSnippet, setSelectedSnippet] = useState<SshSnippet | null>(null)

  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState<SshSnippet>({ name: "", description: "", commands: "" })

  const fetchSnippets = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await rnaApi.sshClientSnippets()
      if (res.success && res.data) {
        const list = (res.data.results || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          commands: s.commands,
        })) as SshSnippet[]
        setSnippets(list)
      } else {
        setError(res.error || "Failed to load snippets")
      }
    } catch (e: any) {
      setError(e?.message || "Network error while loading snippets")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSnippets()
  }, [fetchSnippets])

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => {
        setError("")
        setSuccess("")
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [error, success])

  const resetForm = () => {
    setFormData({ name: "", description: "", commands: "" })
    setSelectedSnippet(null)
  }

  const openCreate = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEdit = (snip: SshSnippet) => {
    setSelectedSnippet(snip)
    setFormData({ name: snip.name, description: snip.description || "", commands: snip.commands })
    setShowEditModal(true)
  }

  const openDelete = (snip: SshSnippet) => {
    setSelectedSnippet(snip)
    setShowDeleteDialog(true)
  }

  const submitCreate = async () => {
    if (!formData.name.trim() || !formData.commands.trim()) {
      setError("Name and commands are required")
      return
    }
    try {
      setFormLoading(true)
      const res = await rnaApi.sshClientSnippetUpsert({
        name: formData.name.trim(),
        description: formData.description?.trim() || "",
        commands: formData.commands,
      })
      if (res.success) {
        setSuccess("Snippet created")
        setShowCreateModal(false)
        resetForm()
        await fetchSnippets()
      } else {
        setError(res.error || "Failed to create snippet")
      }
    } catch (e: any) {
      setError(e?.message || "Network error while creating snippet")
    } finally {
      setFormLoading(false)
    }
  }

  const submitEdit = async () => {
    if (!selectedSnippet?.id) return
    if (!formData.name.trim() || !formData.commands.trim()) {
      setError("Name and commands are required")
      return
    }
    try {
      setFormLoading(true)
      const res = await rnaApi.sshClientSnippetUpsert({
        id: selectedSnippet.id,
        name: formData.name.trim(),
        description: formData.description?.trim() || "",
        commands: formData.commands,
      })
      if (res.success) {
        setSuccess("Snippet updated")
        setShowEditModal(false)
        resetForm()
        await fetchSnippets()
      } else {
        setError(res.error || "Failed to update snippet")
      }
    } catch (e: any) {
      setError(e?.message || "Network error while updating snippet")
    } finally {
      setFormLoading(false)
    }
  }

  const submitDelete = async () => {
    if (!selectedSnippet?.id) return
    try {
      const res = await rnaApi.sshClientSnippetDelete(selectedSnippet.id)
      if (res.success) {
        setSuccess("Snippet deleted")
        setShowDeleteDialog(false)
        resetForm()
        await fetchSnippets()
      } else {
        setError(res.error || "Failed to delete snippet")
      }
    } catch (e: any) {
      setError(e?.message || "Network error while deleting snippet")
    }
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <FileCode2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Access Required</h3>
        <p className="text-gray-600">You need administrator privileges to manage SSH snippets.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSnippets}
            className="rounded-full border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Snippets Table */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCode2 className="h-5 w-5 text-gray-700" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">SSH Snippets ({snippets.length})</h3>
              <p className="text-sm text-gray-500">Reusable command snippets for SSH client</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 rounded-full" disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Snippet
          </Button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading snippets...</p>
              </div>
            </div>
          ) : snippets.length === 0 ? (
            <div className="text-center py-12">
              <FileCode2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No snippets found</p>
              {error && (
                <Button variant="outline" onClick={fetchSnippets} className="mt-4 rounded-full border-gray-300 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Loading
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Commands</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {snippets.map((snip) => (
                    <tr key={snip.id} className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{snip.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate" title={snip.description}>{snip.description}</div>
                      </td>
                      <td className="py-3 px-4">
                        <pre className="text-xs text-gray-800 bg-white rounded-xl border border-gray-200 p-2 overflow-auto max-h-28 whitespace-pre-wrap">
{snip.commands}
                        </pre>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(snip)} className="rounded-full border-gray-300">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDelete(snip)}
                            className="rounded-full border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create SSH Snippet</DialogTitle>
            <DialogDescription>Add a reusable command snippet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="snip-name">Name</Label>
              <Input
                id="snip-name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Disk Information"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="snip-desc">Description</Label>
              <Input
                id="snip-desc"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="snip-cmds">Commands</Label>
              <textarea
                id="snip-cmds"
                value={formData.commands}
                onChange={(e) => setFormData((p) => ({ ...p, commands: e.target.value }))}
                rows={6}
                placeholder="df -h\nfree -m"
                className="w-full rounded-2xl border border-gray-300 p-3 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-full border-gray-300">
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={formLoading} className="bg-blue-600 hover:bg-blue-700 rounded-full">
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Snippet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit SSH Snippet</DialogTitle>
            <DialogDescription>Update snippet information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="snip-name-edit">Name</Label>
              <Input
                id="snip-name-edit"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="snip-desc-edit">Description</Label>
              <Input
                id="snip-desc-edit"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="snip-cmds-edit">Commands</Label>
              <textarea
                id="snip-cmds-edit"
                value={formData.commands}
                onChange={(e) => setFormData((p) => ({ ...p, commands: e.target.value }))}
                rows={6}
                className="w-full rounded-2xl border border-gray-300 p-3 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="rounded-full border-gray-300">
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={formLoading} className="bg-blue-600 hover:bg-blue-700 rounded-full">
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snippet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSnippet?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitDelete} className="bg-red-600 hover:bg-red-700 rounded-full">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
