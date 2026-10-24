"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Save,
  Pencil,
  ChevronsUpDown,
  Check,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { rnaApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ContainerPlugin, ContainerPluginAttr } from "@/lib/types"

function PluginNameCombobox({
  id,
  value,
  options,
  onChange,
  disabled,
  loading,
}: {
  id?: string
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled?: boolean
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const display = value.trim()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full justify-between font-mono text-sm h-10 px-3 font-normal"
        >
          <span className="truncate text-left">
            {loading
              ? "Memuat daftar plugin..."
              : display || "Pilih / cari container_plugin name..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Cari nama plugin..." className="h-9" />
          <CommandList className="max-h-64">
            <CommandEmpty>Tidak ada hasil.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__empty__"
                onSelect={() => {
                  onChange("")
                  setOpen(false)
                }}
                className="text-sm text-gray-500"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !display ? "opacity-100" : "opacity-0",
                  )}
                />
                (kosong)
              </CommandItem>
              {options.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => {
                    onChange(name)
                    setOpen(false)
                  }}
                  className="font-mono text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      display === name ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const EDITABLE_PLUGIN_FIELDS: Array<{
  key: keyof ContainerPlugin
  label: string
  type?: "text" | "number" | "textarea" | "plugin_name_select"
}> = [
  { key: "name", label: "Name", type: "text" },
  { key: "container_id", label: "Container ID", type: "number" },
  { key: "plugin_id", label: "Plugin ID", type: "number" },
  { key: "state_startup", label: "State Startup", type: "number" },
  { key: "port_listen", label: "Port Listen", type: "number" },
  { key: "cnt_instances", label: "Instances", type: "number" },
  { key: "in_next_plugin", label: "In Next Plugin", type: "plugin_name_select" },
  { key: "out_next_plugin", label: "Out Next Plugin", type: "plugin_name_select" },
  { key: "connectto_ipport", label: "Connect To", type: "text" },
  { key: "queue_threshold", label: "Queue Threshold", type: "number" },
  { key: "node_type", label: "Node Type", type: "number" },
  { key: "startup_order", label: "Startup Order", type: "number" },
  { key: "response_timeout", label: "Response Timeout", type: "number" },
  { key: "dynamic_creation_mode", label: "Dynamic Creation Mode", type: "number" },
  { key: "max_dynamic_instances", label: "Max Dynamic Instances", type: "number" },
  { key: "flapping_ignore_time", label: "Flapping Ignore Time", type: "number" },
  { key: "comments", label: "Comments", type: "textarea" },
]

type AttrDraft = {
  key: string
  id?: number
  field: string
  content: string
  _delete?: boolean
  _isNew?: boolean
}

function toFormValue(value: unknown): string {
  if (value == null) return ""
  return String(value)
}

function parseNumberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isNaN(n) ? null : n
}

interface ContainerPluginEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
  plugin: ContainerPlugin | null
  attrs: ContainerPluginAttr[]
  loading?: boolean
  onSaved: (plugin: ContainerPlugin, attrs: ContainerPluginAttr[]) => void
}

export function ContainerPluginEditDialog({
  open,
  onOpenChange,
  profileId,
  plugin,
  attrs,
  loading = false,
  onSaved,
}: ContainerPluginEditDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<Record<string, string>>({})
  const [attrDrafts, setAttrDrafts] = useState<AttrDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pluginNames, setPluginNames] = useState<string[]>([])
  const [pluginNamesLoading, setPluginNamesLoading] = useState(false)

  useEffect(() => {
    if (!open || !plugin) return
    const next: Record<string, string> = {}
    for (const field of EDITABLE_PLUGIN_FIELDS) {
      next[field.key] = toFormValue(plugin[field.key])
    }
    setForm(next)
    setAttrDrafts(
      attrs.map((a) => ({
        key: `attr-${a.id}`,
        id: a.id,
        field: a.field || "",
        content: a.content || "",
      })),
    )
    setError(null)
  }, [open, plugin, attrs])

  useEffect(() => {
    if (!open || !profileId) return
    let cancelled = false
    const loadNames = async () => {
      setPluginNamesLoading(true)
      try {
        const res = await rnaApi.listContainerPluginNames({ profileId })
        const names = res.data?.data
        if (!cancelled && res.success && Array.isArray(names)) {
          setPluginNames(names)
        } else if (!cancelled) {
          setPluginNames([])
        }
      } catch {
        if (!cancelled) setPluginNames([])
      } finally {
        if (!cancelled) setPluginNamesLoading(false)
      }
    }
    void loadNames()
    return () => {
      cancelled = true
    }
  }, [open, profileId])

  const pluginNameOptions = useMemo(() => {
    const set = new Set(pluginNames)
    for (const key of ["in_next_plugin", "out_next_plugin"] as const) {
      const current = (form[key] || "").trim()
      if (current) set.add(current)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [pluginNames, form.in_next_plugin, form.out_next_plugin])

  const visibleAttrs = useMemo(
    () => attrDrafts.filter((a) => !a._delete),
    [attrDrafts],
  )

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateAttr = (key: string, patch: Partial<AttrDraft>) => {
    setAttrDrafts((prev) =>
      prev.map((a) => (a.key === key ? { ...a, ...patch } : a)),
    )
  }

  const addAttr = () => {
    setAttrDrafts((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        field: "",
        content: "",
        _isNew: true,
      },
    ])
  }

  const removeAttr = (key: string) => {
    setAttrDrafts((prev) =>
      prev
        .map((a) => {
          if (a.key !== key) return a
          if (a._isNew || a.id == null) return null
          return { ...a, _delete: true }
        })
        .filter(Boolean) as AttrDraft[],
    )
  }

  const handleSave = async () => {
    if (!plugin || !profileId) return
    const name = (form.name || "").trim()
    if (!name) {
      setError("Name wajib diisi.")
      return
    }

    for (const attr of visibleAttrs) {
      if (!attr.field.trim()) {
        setError("Field atribut tidak boleh kosong.")
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = { profileId }
      // Hanya kirim field plugin yang benar-benar berubah
      for (const field of EDITABLE_PLUGIN_FIELDS) {
        const raw = form[field.key] ?? ""
        const original = toFormValue(plugin[field.key])
        if (field.type === "number") {
          const nextVal = parseNumberOrNull(raw)
          const originalNum =
            original.trim() === "" ? null : Number(original)
          const originalNormalized = Number.isNaN(originalNum as number)
            ? null
            : originalNum
          if (nextVal !== originalNormalized) {
            payload[field.key] = nextVal
          }
        } else {
          if (raw !== original) {
            payload[field.key] = field.key === "name" ? raw.trim() : raw
          }
        }
      }

      const originalAttrMap = new Map(
        attrs.map((a) => [a.id, a] as const),
      )
      const attrsPayload: Array<{
        id?: number
        field?: string
        content?: string
        _delete?: boolean
      }> = []

      for (const a of attrDrafts) {
        if (a._delete && a.id != null) {
          attrsPayload.push({ id: a.id, _delete: true })
          continue
        }
        if (a._isNew || a.id == null) {
          attrsPayload.push({
            field: a.field.trim(),
            content: a.content,
          })
          continue
        }
        const originalAttr = originalAttrMap.get(a.id)
        if (
          !originalAttr ||
          originalAttr.field !== a.field.trim() ||
          (originalAttr.content || "") !== a.content
        ) {
          attrsPayload.push({
            id: a.id,
            field: a.field.trim(),
            content: a.content,
          })
        }
      }

      const hasPluginChanges = Object.keys(payload).some((k) => k !== "profileId")
      if (!hasPluginChanges && attrsPayload.length === 0) {
        setError("Tidak ada perubahan untuk disimpan.")
        setSaving(false)
        return
      }

      if (attrsPayload.length > 0) {
        payload.attrs = attrsPayload
      }

      const res = await rnaApi.updateContainerPlugin(plugin.id, payload as any)
      const data = res.data
      if (res.success && data?.success !== false && data?.data) {
        toast({
          title: "Berhasil disimpan",
          description: `Container plugin "${data.data.plugin?.name || name}" diupdate.`,
        })
        onSaved(data.data.plugin, data.data.attrs || [])
        onOpenChange(false)
      } else {
        const errMsg = data?.error || res.error || "Gagal menyimpan perubahan"
        // Pesan lebih jelas jika bentrok nama
        setError(
          errMsg.includes("sudah digunakan")
            ? `${errMsg}. Ubah field Name di tab container_plugin jika Anda ingin rename.`
            : errMsg,
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
            <Pencil className="h-5 w-5 text-blue-600" />
            Edit Container Plugin
            {plugin && (
              <>
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border-blue-200 font-mono"
                >
                  ID {plugin.id}
                </Badge>
                {plugin.name && (
                  <Badge variant="outline" className="font-mono font-normal">
                    {plugin.name}
                  </Badge>
                )}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <Loader2 className="h-7 w-7 animate-spin mx-auto mb-3" />
              Memuat data edit...
            </div>
          ) : !plugin ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Plugin tidak tersedia.
            </div>
          ) : (
            <Tabs defaultValue="plugin" className="space-y-4">
              <TabsList>
                <TabsTrigger value="plugin">container_plugin</TabsTrigger>
                <TabsTrigger value="attrs">
                  container_plugin_attr
                  <Badge variant="secondary" className="ml-2 font-normal">
                    {visibleAttrs.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="plugin" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {EDITABLE_PLUGIN_FIELDS.map((field) => (
                    <div
                      key={field.key}
                      className={
                        field.type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"
                      }
                    >
                      <Label htmlFor={`edit-${field.key}`}>{field.label}</Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          id={`edit-${field.key}`}
                          value={form[field.key] || ""}
                          onChange={(e) => updateForm(field.key, e.target.value)}
                          className="font-mono text-sm min-h-[80px]"
                        />
                      ) : field.type === "plugin_name_select" ? (
                        <PluginNameCombobox
                          id={`edit-${field.key}`}
                          value={form[field.key] || ""}
                          options={pluginNameOptions}
                          onChange={(value) => updateForm(field.key, value)}
                          loading={pluginNamesLoading}
                        />
                      ) : (
                        <Input
                          id={`edit-${field.key}`}
                          type={field.type === "number" ? "number" : "text"}
                          value={form[field.key] || ""}
                          onChange={(e) => updateForm(field.key, e.target.value)}
                          className="font-mono text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="attrs" className="mt-0 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-600">
                    Edit field / content, atau tambah atribut baru
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={addAttr}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Tambah Attr
                  </Button>
                </div>

                {visibleAttrs.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl">
                    Belum ada atribut. Klik &quot;Tambah Attr&quot; untuk menambah.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {visibleAttrs.map((attr) => (
                      <div
                        key={attr.key}
                        className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50"
                      >
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Field</Label>
                          <Input
                            value={attr.field}
                            onChange={(e) =>
                              updateAttr(attr.key, { field: e.target.value })
                            }
                            className="h-8 font-mono text-xs"
                            placeholder="field name"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Content</Label>
                          <Input
                            value={attr.content}
                            onChange={(e) =>
                              updateAttr(attr.key, { content: e.target.value })
                            }
                            className="h-8 font-mono text-xs"
                            placeholder="content"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200"
                            onClick={() => removeAttr(attr.key)}
                            title="Hapus atribut"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-200 flex-shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || !plugin}
          >
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
  )
}
