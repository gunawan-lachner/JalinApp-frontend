"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Activity,
  Copy,
  Search,
  Check,
  Pencil,
  Save,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import type { BinRoutingRoute, SimpleIdName } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRnaApi } from "@/hooks/useRnaApi";

/** Fields that live on `bin_participant` and may be edited. */
const BIN_PARTICIPANT_EDITABLE_FIELDS = [
  "participant_acq_id",
  "gateway_id",
  "priority",
  "participant_iss_id",
  "rule",
  "description",
] as const;

type EditableField = (typeof BIN_PARTICIPANT_EDITABLE_FIELDS)[number];

const NUMERIC_FIELDS = new Set<EditableField>([
  "gateway_id",
  "priority",
]);

const PARTICIPANT_SELECT_FIELDS = new Set<EditableField>([
  "participant_acq_id",
  "participant_iss_id",
]);

const TEXTAREA_FIELDS = new Set<EditableField>(["rule", "description"]);

function isEditableField(key: string): key is EditableField {
  return (BIN_PARTICIPANT_EDITABLE_FIELDS as readonly string[]).includes(key);
}

function ParticipantSearchSelect({
  items,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  items: SimpleIdName[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => String(i.id) === String(value));
  const label = selected ? `${selected.id} - ${selected.name}` : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-8 text-xs"
        >
          <span className="truncate text-left font-mono">
            {label || placeholder || "Pilih participant..."}
          </span>
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[320px]">
        <Command>
          <CommandInput
            className="my-2 ring-0 outline-none border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-transparent focus-visible:border-transparent focus-visible:ring-offset-0"
            placeholder="Cari id / nama participant..."
          />
          <CommandList className="max-h-64">
            <CommandEmpty>Participant tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {items.map((item, idx) => {
                const isSelected = String(item.id) === String(value);
                return (
                  <CommandItem
                    key={`${item.id}-${idx}`}
                    value={`${item.id} ${item.name}`}
                    className="cursor-pointer text-xs"
                    onSelect={() => {
                      onChange(String(item.id));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={`mr-2 h-3.5 w-3.5 ${
                        isSelected ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="truncate font-mono">
                      {item.id} - {item.name}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type ParticipantOption = SimpleIdName & {
  container_plugin_name?: string;
};

interface RouteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: BinRoutingRoute | null;
  connection?: string;
  canEdit?: boolean;
  /** Participants for participant_acq_id (typically ACQ type). */
  acquirers?: ParticipantOption[];
  /** Participants for participant_iss_id. */
  issuers?: ParticipantOption[];
  /** Gateways for resolving gateway_name after edit. */
  gateways?: SimpleIdName[];
  onUpdated?: (updated: BinRoutingRoute) => void;
}

export function RouteDetailsModal({
  isOpen,
  onClose,
  route,
  connection,
  canEdit = false,
  acquirers = [],
  issuers = [],
  gateways = [],
  onUpdated,
}: RouteDetailsModalProps) {
  const { toast } = useToast();
  const api = useRnaApi();
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<EditableField, string>>>(
    {}
  );

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setSearchTerm("");
      setDraft({});
      setIsSaving(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!route) return;
    setDraft({
      participant_acq_id: String(route.participant_acq_id ?? ""),
      gateway_id: String(route.gateway_id ?? ""),
      priority: String(route.priority ?? ""),
      participant_iss_id: String(route.participant_iss_id ?? ""),
      rule: String(route.rule ?? ""),
      description: String(route.description ?? ""),
    });
    setIsEditing(false);
  }, [route]);

  const normalizeParticipantOptions = (
    items: ParticipantOption[]
  ): ParticipantOption[] =>
    items.map((item) => {
      const raw = String(item.name ?? "");
      // Strip leading "id - " if parent already baked it into the label
      let stripped = raw.replace(new RegExp(`^${item.id}\\s*-\\s*`), "");
      let plugin = String(item.container_plugin_name ?? "").trim();
      if (!plugin) {
        const m = stripped.match(/\(([^)]+)\)\s*$/);
        if (m) plugin = m[1].trim();
      }
      // Keep plugin in search label, but remember it separately for updates
      if (plugin && !stripped.includes(`(${plugin})`)) {
        stripped = `${stripped} (${plugin})`;
      }
      return {
        id: Number(item.id),
        name: stripped || raw || String(item.id),
        container_plugin_name: plugin || undefined,
      };
    });

  const acquirerOptions = useMemo(
    () => normalizeParticipantOptions(acquirers),
    [acquirers]
  );
  const issuerOptions = useMemo(
    () => normalizeParticipantOptions(issuers),
    [issuers]
  );

  const rows = useMemo(() => {
    if (!route) return [];
    return Object.entries(route).filter(
      ([k, v]) =>
        k.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(v ?? "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
  }, [route, searchTerm]);

  const exportData = (format: "json" | "csv" | "txt") => {
    if (!route) return;
    let content = "";
    let mime = "";
    let ext = "";
    if (format === "json") {
      content = JSON.stringify(route, null, 2);
      mime = "application/json";
      ext = "json";
    } else if (format === "csv") {
      const header = "field,value";
      const body = Object.entries(route)
        .map(([k, v]) => `"${k}","${String(v).replaceAll('"', '""')}"`)
        .join("\n");
      content = `${header}\n${body}`;
      mime = "text/csv";
      ext = "csv";
    } else {
      content = Object.entries(route)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join("\n");
      mime = "text/plain";
      ext = "txt";
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `route-${route.id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCell = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 1200);
  };

  const startEdit = () => {
    if (!route || !canEdit) return;
    setDraft({
      participant_acq_id: String(route.participant_acq_id ?? ""),
      gateway_id: String(route.gateway_id ?? ""),
      priority: String(route.priority ?? ""),
      participant_iss_id: String(route.participant_iss_id ?? ""),
      rule: String(route.rule ?? ""),
      description: String(route.description ?? ""),
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (!route) return;
    setDraft({
      participant_acq_id: String(route.participant_acq_id ?? ""),
      gateway_id: String(route.gateway_id ?? ""),
      priority: String(route.priority ?? ""),
      participant_iss_id: String(route.participant_iss_id ?? ""),
      rule: String(route.rule ?? ""),
      description: String(route.description ?? ""),
    });
    setIsEditing(false);
  };

  const updateDraft = (key: EditableField, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!route || !connection) {
      toast({
        title: "Connection wajib",
        description: "Pilih connection profile terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    const parseRequiredInt = (label: string, raw: string | undefined) => {
      const trimmed = String(raw ?? "").trim();
      if (!trimmed) throw new Error(`${label} wajib diisi`);
      const n = Number(trimmed);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
        throw new Error(`${label} harus bilangan bulat positif`);
      }
      return n;
    };

    let payload: {
      connection: string;
      priority: number;
      gateway_id: number;
      participant_iss_id: number;
      participant_acq_id: number;
      rule: string;
      description: string;
    };

    try {
      payload = {
        connection,
        participant_acq_id: parseRequiredInt(
          "participant_acq_id",
          draft.participant_acq_id
        ),
        gateway_id: parseRequiredInt("gateway_id", draft.gateway_id),
        priority: parseRequiredInt("priority", draft.priority),
        participant_iss_id: parseRequiredInt(
          "participant_iss_id",
          draft.participant_iss_id
        ),
        rule: String(draft.rule ?? ""),
        description: String(draft.description ?? ""),
      };
    } catch (e) {
      toast({
        title: "Validasi gagal",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    api.updateBinRoute(
      route.id,
      payload,
      () => {
        const acq = acquirerOptions.find(
          (a) => a.id === payload.participant_acq_id
        );
        const iss = issuerOptions.find(
          (i) => i.id === payload.participant_iss_id
        );
        const gw = gateways.find((g) => g.id === payload.gateway_id);

        const cleanParticipantLabel = (opt?: ParticipantOption) => {
          if (!opt) return undefined;
          const plugin = opt.container_plugin_name?.trim();
          let label = String(opt.name ?? "");
          if (plugin) {
            label = label
              .replace(new RegExp(`\\s*\\(${plugin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)\\s*$`), "")
              .trim();
          }
          return label || opt.name;
        };

        const updated: BinRoutingRoute = {
          ...route,
          participant_acq_id: payload.participant_acq_id,
          gateway_id: payload.gateway_id,
          priority: payload.priority,
          participant_iss_id: payload.participant_iss_id,
          rule: payload.rule,
          description: payload.description,
          acq_name: cleanParticipantLabel(acq) ?? route.acq_name,
          iss_name: cleanParticipantLabel(iss) ?? route.iss_name,
          // container_plugin_name ikut participant issuer (JOIN), harus di-refresh
          container_plugin_name:
            iss?.container_plugin_name ??
            (payload.participant_iss_id === route.participant_iss_id
              ? route.container_plugin_name
              : ""),
          gateway_name: gw?.name ?? route.gateway_name,
        };
        onUpdated?.(updated);
        setIsEditing(false);
        setIsSaving(false);
        toast({
          title: "Tersimpan",
          description: `Route ${route.id} (bin_participant) diupdate.`,
        });
      },
      (err) => {
        setIsSaving(false);
        toast({
          title: "Gagal menyimpan",
          description: String(err),
          variant: "destructive",
        });
      }
    );
  };

  const displayValue = (key: string, value: unknown) => {
    if (isEditing && isEditableField(key)) {
      return draft[key] ?? "";
    }
    return value == null ? "" : String(value);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (isEditing) cancelEdit();
          onClose();
        }
      }}
    >
      <DialogContent className="w-[calc(100vw-32px)] h-[calc(100vh-32px)] max-w-none max-h-none overflow-hidden rounded-3xl border-0 shadow-2xl p-0 mx-auto flex flex-col">
        <DialogHeader className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-3">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-800">
                Route Details
              </DialogTitle>
              {route && (
                <p className="text-sm text-gray-500 mt-1">
                  Route ID: {route.id} • Acquirer:{" "}
                  {String((route as any).acq_name ?? "")} • Issuer:{" "}
                  {String((route as any).iss_name ?? "")}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-w-0 overflow-hidden p-4">
          <Card className="h-full border border-gray-200 rounded-xl shadow-sm flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search route fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 w-64 rounded-lg border-gray-300"
                  />
                </div>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 rounded-full"
                >
                  {rows.length} fields
                </Badge>
                {isEditing && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 rounded-full font-normal"
                  >
                    Edit bin_participant
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {canEdit && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEdit}
                    disabled={!route || !connection}
                    className="rounded-lg text-xs bg-transparent"
                    title={
                      !connection
                        ? "Pilih connection profile dulu"
                        : "Edit field bin_participant"
                    }
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="rounded-lg text-xs bg-transparent"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="rounded-lg text-xs"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Save
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      rows.map(([k, v]) => `${k}: ${String(v)}`).join("\n")
                    );
                    setCopiedAll(true);
                    setTimeout(() => setCopiedAll(false), 1500);
                  }}
                  className="rounded-lg text-xs bg-transparent"
                >
                  {copiedAll ? (
                    <Check className="h-3 w-3 mr-1 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  {copiedAll ? "Copied" : "Copy All"}
                </Button>
                <Select onValueChange={(fmt) => exportData(fmt as any)}>
                  <SelectTrigger className="w-24 h-8 rounded-lg text-xs">
                    <SelectValue placeholder="Export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="txt">TXT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CardContent className="p-0 flex-1 overflow-auto">
              <div className="border border-gray-200 rounded-lg overflow-hidden m-4">
                <div className="overflow-auto max-h-[calc(95vh-250px)]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          Field
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          Value
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200 w-16">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-10 text-center text-sm text-gray-500"
                          >
                            Tidak ada field yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        rows.map(([key, value], idx) => {
                          const id = `route-cell-${idx}`;
                          const isCopied = copiedCell === id;
                          const editable = isEditableField(key);
                          const shown = displayValue(key, value);
                          return (
                            <tr
                              key={key}
                              className={`hover:bg-gray-50 ${
                                isEditing && !editable ? "opacity-60" : ""
                              }`}
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  <span>{key}</span>
                                  {isEditing && editable && (
                                    <Badge className="bg-blue-100 text-blue-700 text-[10px] rounded-full font-normal">
                                      editable
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td
                                className={`px-4 py-3 text-sm text-gray-800 border-r border-gray-200 transition-colors ${
                                  isCopied ? "bg-green-50" : ""
                                } ${
                                  !(isEditing && editable)
                                    ? "cursor-context-menu"
                                    : ""
                                }`}
                                onContextMenu={(e) => {
                                  if (isEditing && editable) return;
                                  e.preventDefault();
                                  copyCell(shown, id);
                                }}
                                title={
                                  isEditing && editable
                                    ? undefined
                                    : "Right-click to copy"
                                }
                              >
                                {isEditing && editable ? (
                                  PARTICIPANT_SELECT_FIELDS.has(key) ? (
                                    <ParticipantSearchSelect
                                      items={
                                        key === "participant_acq_id"
                                          ? acquirerOptions
                                          : issuerOptions
                                      }
                                      value={shown}
                                      onChange={(v) => updateDraft(key, v)}
                                      placeholder={
                                        key === "participant_acq_id"
                                          ? "Pilih acquirer (participant)..."
                                          : "Pilih issuer (participant)..."
                                      }
                                      disabled={isSaving}
                                    />
                                  ) : TEXTAREA_FIELDS.has(key) ? (
                                    <Textarea
                                      value={shown}
                                      onChange={(e) =>
                                        updateDraft(key, e.target.value)
                                      }
                                      className="min-h-[72px] font-mono text-xs"
                                      disabled={isSaving}
                                    />
                                  ) : (
                                    <Input
                                      value={shown}
                                      onChange={(e) =>
                                        updateDraft(key, e.target.value)
                                      }
                                      inputMode={
                                        NUMERIC_FIELDS.has(key)
                                          ? "numeric"
                                          : undefined
                                      }
                                      className="h-8 font-mono text-xs"
                                      disabled={isSaving}
                                    />
                                  )
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    {key === "id" || key.endsWith("_id") ? (
                                      <div className="font-mono bg-gray-50 px-2 py-1 rounded-md text-xs">
                                        {key === "participant_acq_id" ||
                                        key === "participant_iss_id"
                                          ? (() => {
                                              const opts =
                                                key === "participant_acq_id"
                                                  ? acquirerOptions
                                                  : issuerOptions;
                                              const found = opts.find(
                                                (o) =>
                                                  String(o.id) === String(shown)
                                              );
                                              return found
                                                ? `${found.id} - ${found.name}`
                                                : shown;
                                            })()
                                          : shown}
                                      </div>
                                    ) : (
                                      <span className="break-all">{shown}</span>
                                    )}
                                    {isCopied && (
                                      <Badge className="bg-green-100 text-green-700 text-xs animate-in fade-in rounded-full">
                                        Copied!
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyCell(shown, id)}
                                  className="h-6 w-6 p-0 rounded-md hover:bg-gray-100"
                                  disabled={isEditing && editable}
                                >
                                  {isCopied ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
