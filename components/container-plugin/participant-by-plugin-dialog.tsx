"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, Users, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { rnaApi } from "@/lib/api"
import type { Participant } from "@/lib/types"
import {
  ParticipantFormModal,
  type ParticipantFormValues,
} from "@/components/rna/participant-form-modal"

const PARTICIPANT_FIELDS: Array<{ key: keyof Participant; label: string }> = [
  { key: "id", label: "ID" },
  { key: "ext_id", label: "Ext ID" },
  { key: "participant_type", label: "Type" },
  { key: "name", label: "Name" },
  { key: "container_plugin_name", label: "Container Plugin Name" },
  { key: "network_type", label: "Network Type" },
  { key: "active", label: "Active" },
  { key: "display_on_ui", label: "Display On UI" },
  { key: "comments", label: "Comments" },
]

interface ParticipantByPluginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  error: string | null
  containerPluginName: string | null
  participants: Participant[]
  profileId: string
  canEdit?: boolean
  onParticipantUpdated?: (participant: Participant) => void
}

export function ParticipantByPluginDialog({
  open,
  onOpenChange,
  loading,
  error,
  containerPluginName,
  participants,
  profileId,
  canEdit = false,
  onParticipantUpdated,
}: ParticipantByPluginDialogProps) {
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Participant | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openEdit = (participant: Participant) => {
    setEditing(participant)
    setEditOpen(true)
  }

  const closeEdit = () => {
    if (isSubmitting) return
    setEditOpen(false)
    setEditing(null)
  }

  const handleSubmit = async (values: ParticipantFormValues) => {
    if (!editing || !profileId) return
    setIsSubmitting(true)
    try {
      const res = await rnaApi.updateParticipant(editing.id, {
        profileId,
        name: values.name,
        ext_id: values.ext_id,
        participant_type: values.participant_type,
        container_plugin_name: values.container_plugin_name,
        network_type: values.network_type,
        active: values.active,
        display_on_ui: values.display_on_ui,
        comments: values.comments,
      })
      const data = res.data
      if (res.success && data?.success !== false && data?.data) {
        toast({
          title: "Participant diupdate",
          description: `"${data.data.name || values.name}" berhasil disimpan.`,
        })
        onParticipantUpdated?.(data.data)
        setEditOpen(false)
        setEditing(null)
      } else {
        toast({
          title: "Gagal update",
          description:
            (data as { message?: string; error?: string } | undefined)
              ?.error ||
            data?.message ||
            res.error ||
            "Update gagal",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Gagal update",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-600" />
              Participant
              {containerPluginName && (
                <Badge variant="outline" className="font-mono font-normal">
                  {containerPluginName}
                </Badge>
              )}
              {!loading && !error && (
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  {participants.length} record
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {loading ? (
              <div className="py-16 text-center text-gray-500">
                <Loader2 className="h-7 w-7 animate-spin mx-auto mb-3" />
                Memuat participant...
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : participants.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                Tidak ada participant untuk container_plugin_name ini.
              </div>
            ) : (
              participants.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {p.name || "—"}
                      </span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        ID {p.id}
                      </Badge>
                      {p.participant_type != null &&
                        p.participant_type !== "" && (
                          <Badge variant="outline" className="text-xs">
                            {String(p.participant_type)}
                          </Badge>
                        )}
                    </div>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {PARTICIPANT_FIELDS.map(({ key, label }) => {
                      const raw = p[key]
                      const display =
                        raw == null || raw === "" ? "—" : String(raw)
                      return (
                        <div
                          key={String(key)}
                          className="rounded-xl border border-gray-100 bg-white px-3 py-2"
                        >
                          <div className="text-[11px] uppercase tracking-wide text-gray-500">
                            {label}
                          </div>
                          <div className="mt-0.5 text-sm font-mono text-gray-900 break-all">
                            {display}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ParticipantFormModal
        isOpen={editOpen}
        onClose={closeEdit}
        mode="edit"
        initialData={editing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  )
}
