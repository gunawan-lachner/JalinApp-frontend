"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Database, AlertCircle, Pencil, Save, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface GmmRecordDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  tableName: string
  loading: boolean
  error: string | null
  record: Record<string, unknown> | null
  /** Field names rendered as large scrollable content blocks */
  contentFields?: string[]
  /** Enable Edit / Save UI */
  canEdit?: boolean
  /** Persist edited fields; return updated record or void */
  onSave?: (fields: Record<string, unknown>) => Promise<Record<string, unknown> | void>
}

const READONLY_FIELDS = new Set([
  "id",
  "last_mod",
  "last_update",
  "updated_at",
  "modified_at",
  "update_time",
  "created_at",
  "hash",
])

function formatValue(value: unknown): string {
  if (value == null) return "—"
  if (typeof value === "string") return value || "—"
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function toEditValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function GmmRecordDetailDialog({
  open,
  onOpenChange,
  title,
  tableName,
  loading,
  error,
  record,
  contentFields = [],
  canEdit = false,
  onSave,
}: GmmRecordDetailDialogProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const contentSet = useMemo(
    () => new Set(contentFields.map((f) => f.toLowerCase())),
    [contentFields],
  )

  const entries = record
    ? Object.entries(record).filter(([key]) => !contentSet.has(key.toLowerCase()))
    : []
  const contentEntries = record
    ? Object.entries(record).filter(([key]) => contentSet.has(key.toLowerCase()))
    : []

  const recordId = record?.id ?? record?.ID ?? null

  useEffect(() => {
    if (!open) {
      setEditing(false)
      setDraft({})
      setSaveError(null)
      setSaving(false)
    }
  }, [open])

  useEffect(() => {
    if (!record || !editing) return
    const next: Record<string, string> = {}
    for (const [key, value] of Object.entries(record)) {
      if (READONLY_FIELDS.has(key.toLowerCase())) continue
      next[key] = toEditValue(value)
    }
    setDraft(next)
    setSaveError(null)
  }, [record, editing])

  const startEdit = () => {
    if (!record || !canEdit) return
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft({})
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!onSave || !record) return
    setSaving(true)
    setSaveError(null)
    try {
      const fields: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(draft)) {
        if (READONLY_FIELDS.has(key.toLowerCase())) continue
        fields[key] = value
      }
      await onSave(fields)
      setEditing(false)
      setDraft({})
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const isReadonlyKey = (key: string) => READONLY_FIELDS.has(key.toLowerCase())

  const isMultilineField = (key: string, value?: unknown) => {
    const lower = key.toLowerCase()
    if (contentSet.has(lower)) return true
    if (lower === "encodingdata" || lower.includes("encoding_data")) return true
    const text = toEditValue(value)
    return text.includes("\n") || text.length > 120
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="space-y-1.5 min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                {title}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{tableName}</span>
                {recordId != null && (
                  <Badge variant="secondary" className="text-[10px]">
                    #{String(recordId)}
                  </Badge>
                )}
                {editing && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                    Editing
                  </Badge>
                )}
              </DialogDescription>
            </div>
            {canEdit && !loading && !error && record && !editing && (
              <Button type="button" variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="p-10 text-center text-gray-500 text-sm">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Memuat data...
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !record ? (
            <div className="p-8 text-center text-gray-500 text-sm">Tidak ada data.</div>
          ) : (
            <>
              {(saveError || null) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {entries.map(([key, value]) => (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap w-40 align-top bg-gray-50">
                          {key}
                        </td>
                        <td className="px-4 py-2.5 text-gray-800">
                          {editing && !isReadonlyKey(key) ? (
                            isMultilineField(key, value) ? (
                              <Textarea
                                value={draft[key] ?? ""}
                                onChange={(e) =>
                                  setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                className="min-h-[160px] max-h-72 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs whitespace-pre-wrap break-all resize-y"
                              />
                            ) : (
                              <Input
                                value={draft[key] ?? ""}
                                onChange={(e) =>
                                  setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                className="font-mono text-xs h-8"
                              />
                            )
                          ) : (
                            <span className="font-mono text-xs break-all whitespace-pre-wrap">
                              {formatValue(value)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {contentEntries.map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">{key}</div>
                  {editing && !isReadonlyKey(key) ? (
                    <Textarea
                      value={draft[key] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="min-h-[220px] max-h-72 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs whitespace-pre-wrap break-all resize-y"
                    />
                  ) : (
                    <pre className="max-h-72 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs font-mono text-gray-800 whitespace-pre-wrap break-all">
                      {formatValue(value)}
                    </pre>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {editing && (
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !onSave}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Save
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
