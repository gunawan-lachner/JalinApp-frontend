"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Database, AlertCircle, Save, Plus, Copy } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type GmmColumnMeta = {
  name: string
  type: string
  nullable: boolean
  is_pk: boolean
  is_auto: boolean
  is_blob: boolean
  is_numeric: boolean
  is_server_only?: boolean
}

/** @deprecated use GmmColumnMeta */
export type Iso8583ColumnMeta = GmmColumnMeta

interface GmmTableEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit" | "duplicate"
  columnsMeta: GmmColumnMeta[]
  initial?: Record<string, unknown> | null
  saving?: boolean
  tableName: string
  entityLabel: string
  onSubmit: (fields: Record<string, unknown>) => Promise<void>
}

function toDraftValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function isLongField(meta: GmmColumnMeta): boolean {
  const t = meta.type || ""
  if (meta.is_blob || t.includes("text")) return true
  const match = t.match(/varchar\((\d+)\)/)
  return Boolean(match && Number(match[1]) >= 200)
}

export function GmmTableEditorDialog({
  open,
  onOpenChange,
  mode,
  columnsMeta,
  initial,
  saving = false,
  tableName,
  entityLabel,
  onSubmit,
}: GmmTableEditorDialogProps) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isInsertMode = mode === "create" || mode === "duplicate"

  const editableCols = useMemo(() => {
    return columnsMeta.filter((c) => {
      if (mode === "edit" && c.is_pk) return false
      if (c.is_auto) return false
      if (c.is_server_only) return false
      return true
    })
  }, [columnsMeta, mode])

  useEffect(() => {
    if (!open) {
      setDraft({})
      setError(null)
      setSubmitting(false)
      return
    }
    const next: Record<string, string> = {}
    for (const col of columnsMeta) {
      if (mode === "edit" && col.is_pk) continue
      if (col.is_auto || col.is_server_only) continue
      const fromInitial = initial ? initial[col.name] : undefined
      next[col.name] = toDraftValue(fromInitial)
    }
    const pk = columnsMeta.find((c) => c.is_pk)
    if (isInsertMode && pk && !pk.is_auto) {
      if (mode === "duplicate") next[pk.name] = ""
      else if (!(pk.name in next)) next[pk.name] = ""
    }
    setDraft(next)
    setError(null)
  }, [open, mode, columnsMeta, initial, isInsertMode])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const fields: Record<string, unknown> = {}
      for (const col of editableCols) {
        const raw = draft[col.name] ?? ""
        if (raw === "" && col.nullable) {
          fields[col.name] = null
        } else if (raw === "" && col.is_numeric && !col.nullable) {
          fields[col.name] = 0
        } else if (col.is_numeric && raw !== "") {
          const n = Number(raw)
          if (!Number.isFinite(n)) {
            throw new Error(`Kolom ${col.name} harus angka`)
          }
          fields[col.name] = Number.isInteger(n) ? Math.trunc(n) : n
        } else {
          fields[col.name] = raw
        }
      }
      if (isInsertMode) {
        const pk = columnsMeta.find((c) => c.is_pk)
        if (pk && !pk.is_auto) {
          const idRaw = (draft[pk.name] ?? "").trim()
          if (!idRaw) throw new Error(`Kolom ${pk.name} wajib diisi (id baru)`)
          const idNum = Number(idRaw)
          if (!Number.isFinite(idNum)) throw new Error(`Kolom ${pk.name} harus angka`)
          fields[pk.name] = Math.trunc(idNum)
        }
      }
      await onSubmit(fields)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const busy = saving || submitting
  const title =
    mode === "duplicate"
      ? `Duplikasi ${entityLabel}`
      : mode === "create"
        ? `Tambah ${entityLabel}`
        : `Edit ${entityLabel}`
  const recordId = initial?.id ?? initial?.ID ?? null

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{tableName}</span>
            {mode === "edit" && recordId != null && String(recordId) !== "" && (
              <Badge variant="secondary" className="text-[10px]">
                #{String(recordId)}
              </Badge>
            )}
            {mode === "create" && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                Create
              </Badge>
            )}
            {mode === "duplicate" && (
              <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-[10px]">
                Duplicate
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pr-1">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {editableCols.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Muat data terlebih dahulu agar kolom tabel tersedia.
            </div>
          ) : (
            <div className="space-y-3">
              {editableCols.map((col) => (
                <div key={col.name} className="space-y-1.5">
                  <Label htmlFor={`gmm-edit-${col.name}`} className="flex items-center gap-2">
                    <span className="font-mono text-xs">{col.name}</span>
                    {!col.nullable && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        required
                      </Badge>
                    )}
                    <span className="text-[10px] text-gray-400 font-normal">{col.type}</span>
                  </Label>
                  {isLongField(col) ? (
                    <Textarea
                      id={`gmm-edit-${col.name}`}
                      value={draft[col.name] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [col.name]: e.target.value }))
                      }
                      className="min-h-[160px] max-h-72 font-mono text-xs whitespace-pre-wrap break-all"
                      disabled={busy}
                    />
                  ) : (
                    <Input
                      id={`gmm-edit-${col.name}`}
                      value={draft[col.name] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [col.name]: e.target.value }))
                      }
                      className="font-mono text-xs h-9"
                      disabled={busy}
                      placeholder={
                        col.is_pk
                          ? mode === "duplicate"
                            ? "isi id baru (wajib)"
                            : "wajib (tanpa auto-increment)"
                          : undefined
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={busy || editableCols.length === 0}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : mode === "duplicate" ? (
              <Copy className="h-4 w-4 mr-1.5" />
            ) : mode === "create" ? (
              <Plus className="h-4 w-4 mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {mode === "duplicate" ? "Duplikasi" : mode === "create" ? "Tambah" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Backward-compatible wrapper for ISO8583 Plugin editor. */
export function Iso8583PluginEditorDialog(
  props: Omit<GmmTableEditorDialogProps, "tableName" | "entityLabel">,
) {
  return (
    <GmmTableEditorDialog
      {...props}
      tableName="gmm_iso8583_plugin"
      entityLabel="ISO8583 Plugin"
    />
  )
}
