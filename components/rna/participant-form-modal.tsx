"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Participant } from "@/lib/types"

export type ParticipantFormValues = {
  id?: string
  ext_id: string
  participant_type: string
  name: string
  container_plugin_name: string
  network_type: string
  active: number
  display_on_ui: string
  comments: string
}

interface ParticipantFormModalProps {
  isOpen: boolean
  onClose: () => void
  mode: "create" | "edit"
  initialData?: Participant | null
  isSubmitting?: boolean
  onSubmit: (values: ParticipantFormValues) => void
}

const emptyForm: ParticipantFormValues = {
  id: "",
  ext_id: "",
  participant_type: "",
  name: "",
  container_plugin_name: "",
  network_type: "",
  active: 1,
  display_on_ui: "Y",
  comments: "",
}

export function ParticipantFormModal({
  isOpen,
  onClose,
  mode,
  initialData,
  isSubmitting = false,
  onSubmit,
}: ParticipantFormModalProps) {
  const [form, setForm] = useState<ParticipantFormValues>(emptyForm)

  useEffect(() => {
    if (!isOpen) return
    if (mode === "edit" && initialData) {
      setForm({
        id: String(initialData.id ?? ""),
        ext_id: initialData.ext_id ?? "",
        participant_type: initialData.participant_type ?? "",
        name: initialData.name ?? "",
        container_plugin_name: initialData.container_plugin_name ?? "",
        network_type: initialData.network_type ?? "",
        active: Number(initialData.active) === 1 ? 1 : 0,
        display_on_ui: initialData.display_on_ui === "N" ? "N" : "Y",
        comments: initialData.comments ?? "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [isOpen, mode, initialData])

  const handleChange = (key: keyof ParticipantFormValues, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({
      ...form,
      name: form.name.trim(),
      ext_id: form.ext_id.trim(),
      participant_type: form.participant_type.trim(),
      container_plugin_name: form.container_plugin_name.trim(),
      network_type: form.network_type.trim(),
      comments: form.comments.trim(),
      id: form.id?.trim() || undefined,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl p-6">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-semibold text-gray-800">
            {mode === "edit" ? "Edit Participant" : "Add Participant"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-6">
          <div>
            <Label htmlFor="participant-id" className="text-sm font-medium text-gray-700 mb-1 block">
              ID {mode === "create" ? "(optional)" : ""}
            </Label>
            <Input
              id="participant-id"
              value={form.id || ""}
              onChange={(e) => handleChange("id", e.target.value)}
              disabled={mode === "edit" || isSubmitting}
              className="rounded-full h-10"
              placeholder={mode === "create" ? "Auto if empty" : undefined}
            />
          </div>

          <div>
            <Label htmlFor="ext_id" className="text-sm font-medium text-gray-700 mb-1 block">
              Ext ID
            </Label>
            <Input
              id="ext_id"
              value={form.ext_id}
              onChange={(e) => handleChange("ext_id", e.target.value)}
              disabled={isSubmitting}
              className="rounded-full h-10"
            />
          </div>

          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1 block">
              Name *
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              disabled={isSubmitting}
              className="rounded-full h-10"
            />
          </div>

          <div>
            <Label htmlFor="participant_type" className="text-sm font-medium text-gray-700 mb-1 block">
              Type
            </Label>
            <Input
              id="participant_type"
              value={form.participant_type}
              onChange={(e) => handleChange("participant_type", e.target.value)}
              disabled={isSubmitting}
              className="rounded-full h-10"
            />
          </div>

          <div>
            <Label htmlFor="container_plugin_name" className="text-sm font-medium text-gray-700 mb-1 block">
              Plugin Name
            </Label>
            <Input
              id="container_plugin_name"
              value={form.container_plugin_name}
              onChange={(e) => handleChange("container_plugin_name", e.target.value)}
              disabled={isSubmitting}
              className="rounded-full h-10"
            />
          </div>

          <div>
            <Label htmlFor="network_type" className="text-sm font-medium text-gray-700 mb-1 block">
              Network Type
            </Label>
            <Input
              id="network_type"
              value={form.network_type}
              onChange={(e) => handleChange("network_type", e.target.value)}
              disabled={isSubmitting}
              className="rounded-full h-10"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Active</Label>
            <Select
              value={String(form.active)}
              onValueChange={(value) => handleChange("active", Number(value))}
              disabled={isSubmitting}
            >
              <SelectTrigger className="rounded-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Yes</SelectItem>
                <SelectItem value="0">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Display UI</Label>
            <Select
              value={form.display_on_ui}
              onValueChange={(value) => handleChange("display_on_ui", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="rounded-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Y">Y</SelectItem>
                <SelectItem value="N">N</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="comments" className="text-sm font-medium text-gray-700 mb-1 block">
              Comments
            </Label>
            <Textarea
              id="comments"
              value={form.comments}
              onChange={(e) => handleChange("comments", e.target.value)}
              disabled={isSubmitting}
              className="rounded-2xl min-h-[80px]"
            />
          </div>

          <DialogFooter className="col-span-full pt-4 border-t border-gray-200 mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-full">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.name.trim()} className="rounded-full">
              {isSubmitting ? "Saving..." : mode === "edit" ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
