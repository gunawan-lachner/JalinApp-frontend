"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  Loader2,
  Boxes,
  Pencil,
  Save,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { rnaApi } from "@/lib/api"

function formatFieldName(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Id/g, "ID")
}

function toFormValue(value: unknown): string {
  if (value == null) return ""
  return String(value)
}

function looksNumeric(value: unknown): boolean {
  if (typeof value === "number") return true
  if (typeof value !== "string") return false
  const t = value.trim()
  if (!t) return false
  return /^-?\d+(\.\d+)?$/.test(t)
}

interface PluginTableDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  error: string | null
  pluginId: number | string | null
  data: Record<string, unknown> | null
  profileId: string
  canEdit?: boolean
  onUpdated?: (data: Record<string, unknown>) => void
}

export function PluginTableDetailDialog({
  open,
  onOpenChange,
  loading,
  error,
  pluginId,
  data,
  profileId,
  canEdit = false,
  onUpdated,
}: PluginTableDetailDialogProps) {
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const entries = data
    ? Object.entries(data).filter(([key]) => key !== undefined)
    : []

  const editableKeys = useMemo(
    () => (data ? Object.keys(data).filter((k) => k !== "id") : []),
    [data],
  )

  useEffect(() => {
    if (!editOpen || !data) return
    const next: Record<string, string> = {}
    for (const key of editableKeys) {
      next[key] = toFormValue(data[key])
    }
    setForm(next)
    setEditError(null)
  }, [editOpen, data, editableKeys])

  const openEdit = () => {
    if (!data || !canEdit) return
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!data || pluginId == null || !profileId) return

    if ("name" in form && !(form.name || "").trim()) {
      setEditError("Name wajib diisi.")
      return
    }

    const payload: Record<string, unknown> = { profileId }
    let changed = false
    for (const key of editableKeys) {
      const raw = form[key] ?? ""
      const original = toFormValue(data[key])
      if (raw === original) continue
      changed = true
      if (looksNumeric(data[key]) && raw.trim() !== "") {
        const n = Number(raw)
        payload[key] = Number.isNaN(n) ? raw : n
      } else if (raw.trim() === "" && looksNumeric(data[key])) {
        payload[key] = null
      } else {
        payload[key] = key === "name" ? raw.trim() : raw
      }
    }

    if (!changed) {
      setEditError("Tidak ada perubahan untuk disimpan.")
      return
    }

    setSaving(true)
    setEditError(null)
    try {
      const res = await rnaApi.updatePluginTableRow(pluginId, payload)
      const body = res.data
      if (res.success && body?.success !== false && body?.data) {
        toast({
          title: "Plugin diupdate",
          description: `Plugin ID ${pluginId} berhasil disimpan.`,
        })
        onUpdated?.(body.data)
        setEditOpen(false)
      } else {
        setEditError(
          (body as { error?: string } | undefined)?.error ||
            body?.message ||
            res.error ||
            "Gagal menyimpan plugin",
        )
      }
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-start justify-between gap-3 pr-6">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
                <Boxes className="h-5 w-5 text-blue-600" />
                Plugin
                {pluginId != null && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 border-blue-200 font-mono"
                  >
                    ID {pluginId}
                  </Badge>
                )}
                {data?.name != null && String(data.name) !== "" && (
                  <Badge variant="outline" className="font-mono font-normal">
                    {String(data.name)}
                  </Badge>
                )}
              </DialogTitle>
              {canEdit && data && !loading && !error && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={openEdit}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="py-16 text-center text-gray-500">
                <Loader2 className="h-7 w-7 animate-spin mx-auto mb-3" />
                Memuat detail plugin...
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : !data ? (
              <div className="py-16 text-center text-sm text-gray-500">
                Data plugin tidak tersedia.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {entries.map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">
                      {formatFieldName(key)}
                    </div>
                    <div className="mt-0.5 text-sm font-mono text-gray-900 break-all">
                      {value == null || value === "" ? "—" : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(next) => {
          if (!next && !saving) setEditOpen(false)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Plugin
              {pluginId != null && (
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border-blue-200 font-mono"
                >
                  ID {pluginId}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {editError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editableKeys.map((key) => {
                const isLong =
                  key.toLowerCase().includes("comment") ||
                  key.toLowerCase().includes("desc") ||
                  (form[key] || "").length > 80
                return (
                  <div
                    key={key}
                    className={isLong ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}
                  >
                    <Label htmlFor={`plugin-edit-${key}`}>
                      {formatFieldName(key)}
                    </Label>
                    {isLong ? (
                      <Textarea
                        id={`plugin-edit-${key}`}
                        value={form[key] || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="font-mono text-sm min-h-[80px]"
                        disabled={saving}
                      />
                    ) : (
                      <Input
                        id={`plugin-edit-${key}`}
                        type={looksNumeric(data?.[key]) ? "number" : "text"}
                        value={form[key] || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="font-mono text-sm"
                        disabled={saving}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-gray-200 flex-shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
