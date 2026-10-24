"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import type React from "react";

import { useRouter, usePathname } from "next/navigation";
import {
  ChevronDownIcon,
  Search,
  Download,
  Plus,
  X,
  Database,
  Check,
  Code,
  Copy,
  Clock,
  Eye,
  Edit2,
  Trash2,
  Route,
  Filter,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/layout/sidebar";
import { useRnaApi } from "@/hooks/useRnaApi";
import { useToast } from "@/hooks/use-toast";
import type {
  ConnectionProfile,
  BinRoutingListResponse,
  BinRoutingRoute,
  SimpleIdName,
} from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
import { RouteTable } from "@/components/rna/route-table";
import { RoutingSimulationPanel } from "@/components/rna/routing-simulation-panel";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { RouteDetailsModal } from "@/components/rna/route-details-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// BIN normalization helpers
const BIN_TOTAL_LENGTH = 19;
const normalizeBinInput = (value: string) => value.replace(/\D/g, "");
const padBinToLength = (digits: string, total: number = BIN_TOTAL_LENGTH) =>
  digits === "" ? "" : digits.slice(0, total).padEnd(total, "0");
const padBinUpperToLength = (
  digits: string,
  total: number = BIN_TOTAL_LENGTH
) => (digits === "" ? "" : digits.slice(0, total).padEnd(total, "9"));

interface TransactionRoute {
  id: number;
  priority: number;
  acquirer: string;
  binDetailsId: string;
  binLower: string;
  binUpper: string;
  binHolderName: string;
  gateway: string;
  issuerParticipant: string;
  containerPlugin: string;
  rule: string;
  description: string;
}

function SearchSelect({
  items,
  value,
  onChange,
  placeholder,
  triggerClassName = "w-full justify-between font-normal",
  format = "name",
  contentClassName = "p-0 w-[--radix-popover-trigger-width]",
}: {
  items: { id: number; name: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  // format: "name" | "id-name" controls selected label rendering
  format?: "name" | "id-name";
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => String(i.id) === String(value));
  const label = selected
    ? format === "id-name"
      ? `${selected.id} - ${selected.name}`
      : selected.name
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={triggerClassName}
        >
          <span className="truncate text-left">
            {label || placeholder || "Select"}
          </span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={contentClassName}>
        <Command className="rounded-xl">
          <CommandInput
            className="my-2 ring-0 outline-none border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-transparent focus-visible:border-transparent focus-visible:ring-offset-0"
            placeholder="Search..."
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map((item, idx) => {
                const isSelected = String(item.id) === String(value);
                return (
                  <CommandItem
                    key={`${item.id}-${idx}`}
                    value={`${item.id} ${item.name}`}
                    className="cursor-pointer"
                    onSelect={() => {
                      onChange(String(item.id));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        isSelected ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="truncate">
                      {format === "id-name"
                        ? `${item.id} - ${item.name}`
                        : item.name}
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

// ADDED: add isolated, local-state modal to prevent full page re-render while typing
function GatewayChangeModal({
  route,
  gatewaysMeta,
  onClose,
  onSave,
}: {
  route: BinRoutingRoute | null;
  gatewaysMeta: { id: number; name: string }[];
  onClose: () => void;
  onSave: (routeId: number, newGatewayId: number) => void;
}) {
  // The 'route' prop can be null, so the conditional hook call inside the function body
  // is intentional and doesn't violate the rule. Hooks are only called when route is not null.
  const [newGatewayId, setNewGatewayId] = useState<string>("");

  // initialize local form state when route changes
  useEffect(() => {
    setNewGatewayId(""); // start blank; user chooses the new gateway
  }, [route]);

  return (
    <Dialog
      open={!!route}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[600px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Change BIN Gateway
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Update the gateway routing for this BIN configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* BIN Details */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              BIN Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  BIN Details ID
                </label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {route.bin_details_id || "—"}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  BIN Range
                </label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {route.bin_lower}
                  {route.bin_upper && route.bin_upper !== route.bin_lower
                    ? ` - ${route.bin_upper}`
                    : ""}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  BIN Holder Name
                </label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {route.bin_holder_name || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Current Gateway */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Current Gateway
            </h3>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  {route.gateway_name || "—"}
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  ID: {route.gateway_id}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <label className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                Current Route Path
              </label>
              <p className="text-sm text-blue-900 mt-1 font-mono">
                {route.acq_name} → {route.gateway_name} → {route.iss_name}
              </p>
            </div>
          </div>

          {/* New Gateway Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              New Gateway <span className="text-red-500">*</span>
            </label>
            <SearchSelect
              items={gatewaysMeta}
              value={newGatewayId}
              onChange={setNewGatewayId}
              placeholder="Search and select new gateway..."
              triggerClassName="rounded-xl border border-gray-300 w-full justify-between h-11"
              format="id-name"
              contentClassName="p-0 w-[28rem] max-h-[400px] overflow-auto rounded-xl shadow-lg"
            />
            {newGatewayId && newGatewayId !== String(route.gateway_id) && (
              <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
                  New Route Path
                </p>
                <p className="text-sm text-green-900 font-mono">
                  {route.acq_name} →{" "}
                  {gatewaysMeta.find((g) => String(g.id) === newGatewayId)
                    ?.name || "Selected Gateway"}{" "}
                  → {route.iss_name}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="rounded-xl bg-transparent"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              if (!route) return;
              const gid = Number(newGatewayId);
              if (!Number.isFinite(gid)) return;
              onSave(route.id, gid);
            }}
            disabled={
              !newGatewayId || newGatewayId === String(route.gateway_id)
            }
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ADDED: add isolated, local-state modal to prevent full page re-render while typing
function IssuerChangeModal({
  route,
  gatewaysMeta,
  issuers,
  onClose,
  onSave,
}: {
  route: BinRoutingRoute | null;
  gatewaysMeta: { id: number; name: string }[];
  issuers: { id: number; name: string }[];
  onClose: () => void;
  onSave: (
    routeId: number,
    issuerId: number,
    priority?: number,
    gatewayId?: number
  ) => void;
}) {
  // The 'route' prop can be null, so the conditional hook call inside the function body
  // is intentional and doesn't violate the rule. Hooks are only called when route is not null.
  const [newGatewayId, setNewGatewayId] = useState<string>("");
  const [newIssuerId, setNewIssuerId] = useState<string>("");
  const [newPriorityInput, setNewPriorityInput] = useState<string>("");

  useEffect(() => {
    // reset fields on open/route change
    setNewGatewayId("");
    setNewIssuerId("");
    setNewPriorityInput("");
  }, [route]);

  const handleSave = useCallback(() => {
    if (!route) return;
    const issId = Number(newIssuerId || route.participant_iss_id);
    const pr =
      newPriorityInput.trim() === "" ? undefined : Number(newPriorityInput);
    const gid =
      newGatewayId && newGatewayId.trim() !== ""
        ? Number(newGatewayId)
        : undefined;
    if (!Number.isFinite(issId)) return;
    if (pr !== undefined && !Number.isFinite(pr)) return;
    if (gid !== undefined && !Number.isFinite(gid)) return;
    onSave(route.id, issId, pr, gid);
  }, [route, newIssuerId, newPriorityInput, newGatewayId, onSave]);

  return (
    <Dialog
      open={!!route}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w=[720px] rounded-3xl sm:max-w-[720px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold">
            Change Transaction Route
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Update routing configuration for this transaction path
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Route Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md uppercase tracking-wide">
                Route Details
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Participant ID
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {route.participant_iss_id}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Rule
                  </div>
                  <div className="text-sm text-gray-800 font-mono break-all">
                    {route.rule || "-"}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Description
                </div>
                <div className="text-sm text-gray-800 break-all">
                  {route.description || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Current Config */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-md uppercase tracking-wide">
                Current Configuration
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
              <div className="space-y-1">
                <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  Route Path
                </div>
                <div className="text-sm text-blue-900 font-mono">
                  {route.acq_name || "-"} → {route.gateway_name || "-"} →{" "}
                  {route.iss_name || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  Priority
                </div>
                <div className="text-sm text-blue-900 font-semibold">
                  {route.priority ?? "-"}
                </div>
              </div>
            </div>
          </div>

          {/* New Config */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-md uppercase tracking-wide">
                New Configuration
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    Priority
                  </label>
                  <Input
                    type="number"
                    value={newPriorityInput}
                    onChange={(e) => setNewPriorityInput(e.target.value)}
                    placeholder={String(route.priority ?? "16000")}
                    className="rounded-xl border-green-300 focus:border-green-500 focus:ring-green-500 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    New Gateway
                  </label>
                  <SearchSelect
                    items={gatewaysMeta}
                    value={newGatewayId}
                    onChange={setNewGatewayId}
                    placeholder="Select gateway..."
                    triggerClassName="rounded-xl border-green-300 w-full justify-between h-11"
                    format="id-name"
                    contentClassName="p-0 w-[32rem] max-h-[400px] overflow-auto rounded-xl shadow-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    New Issuer
                  </label>
                  <SearchSelect
                    items={issuers}
                    value={newIssuerId}
                    onChange={setNewIssuerId}
                    placeholder="Select issuer..."
                    triggerClassName="rounded-xl border-green-300 w-full justify-between h-11"
                    format="name"
                    contentClassName="p-0 w-[32rem] max-h-[400px] overflow-auto rounded-xl shadow-lg"
                  />
                </div>
              </div>

              {(newGatewayId || newIssuerId) && (
                <div className="pt-3 border-t border-green-200">
                  <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
                    Preview New Route Path
                  </div>
                  <div className="text-sm text-green-900 font-mono">
                    {route.acq_name || "-"} →{" "}
                    {newGatewayId
                      ? gatewaysMeta.find((g) => String(g.id) === newGatewayId)
                          ?.name || route.gateway_name
                      : route.gateway_name || "-"}{" "}
                    →{" "}
                    {newIssuerId
                      ? issuers.find((i) => String(i.id) === newIssuerId)
                          ?.name || route.iss_name
                      : route.iss_name || "-"}
                    {newPriorityInput && (
                      <span className="text-green-700 ml-2">
                        [priority={newPriorityInput}]
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="rounded-xl bg-transparent"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={!newIssuerId && !newPriorityInput && !newGatewayId}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ADDED: add a local-state modal content component to prevent parent re-renders on each keystroke
function CreateEditRouteModalContent({
  title,
  initialForm,
  acquirers,
  gatewaysMeta,
  issuers,
  onCancel,
  onSubmit,
}: {
  title: string;
  initialForm: {
    participant_acq_id: string;
    bin_lower: string;
    bin_upper: string;
    gateway_id: string;
    priority: string;
    participant_iss_id: string;
    rule: string;
    description: string;
    container_plugin_name: string;
    bin_type: string; // renamed from 'type'
    country: string;
    currency: string;
    region: string;
  };
  acquirers: { id: number; name: string }[];
  gatewaysMeta: { id: number; name: string }[];
  issuers: { id: number; name: string }[];
  onCancel: () => void;
  onSubmit: (form: {
    participant_acq_id: string;
    bin_lower: string;
    bin_upper: string;
    gateway_id: string;
    priority: string;
    participant_iss_id: string;
    rule: string;
    description: string;
    container_plugin_name: string;
    bin_type: string; // renamed
    country: string;
    currency: string;
    region: string;
  }) => void;
}) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    // reset local form whenever initial changes (open/edit mode switch)
    setForm(initialForm);
  }, [initialForm]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      {/* Two-column compact layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Acquirer ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Acquirer ID <span className="text-red-500">*</span>
          </label>
          <SearchSelect
            items={acquirers}
            value={form.participant_acq_id}
            onChange={(v) => setForm((f) => ({ ...f, participant_acq_id: v }))}
            placeholder="Search acquirer..."
            triggerClassName="rounded-xl border border-gray-300 w-full justify-between"
            format="id-name"
          />
        </div>

        {/* BIN Number Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            BIN Range <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={form.bin_lower}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  bin_lower: normalizeBinInput(e.target.value).slice(
                    0,
                    BIN_TOTAL_LENGTH
                  ),
                }))
              }
              onBlur={() =>
                setForm((f) => ({
                  ...f,
                  bin_lower: padBinToLength(
                    normalizeBinInput(f.bin_lower),
                    BIN_TOTAL_LENGTH
                  ),
                }))
              }
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Lower BIN"
              className="rounded-xl"
            />
            <Input
              value={form.bin_upper}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  bin_upper: normalizeBinInput(e.target.value).slice(
                    0,
                    BIN_TOTAL_LENGTH
                  ),
                }))
              }
              onBlur={() =>
                setForm((f) => ({
                  ...f,
                  bin_upper: padBinUpperToLength(
                    normalizeBinInput(f.bin_upper),
                    BIN_TOTAL_LENGTH
                  ),
                }))
              }
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Upper BIN"
              className="rounded-xl"
            />
          </div>
        </div>

        {/* keep the 4 fields in one row; convert 'type' binding to 'bin_type' */}
        {/* --- START: 4-in-a-row group --- */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Type <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.bin_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  bin_type: e.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="1"
              className="rounded-xl h-11"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Country <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.country}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  country: e.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="360"
              className="rounded-xl h-11"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Currency <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  currency: e.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="360"
              className="rounded-xl h-11"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Region <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.region}
              onChange={(e) =>
                setForm((f) => ({ ...f, region: e.target.value }))
              }
              placeholder="B"
              className="rounded-xl h-11"
            />
          </div>
        </div>
        {/* --- END: 4-in-a-row group --- */}

        {/* Gateway ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Gateway ID <span className="text-red-500">*</span>
          </label>
          <SearchSelect
            items={gatewaysMeta}
            value={form.gateway_id}
            onChange={(v) => setForm((f) => ({ ...f, gateway_id: v }))}
            placeholder="Search gateway..."
            triggerClassName="rounded-xl border border-gray-300 w-full justify-between"
            format="id-name"
          />
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Priority <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            value={form.priority}
            onChange={(e) =>
              setForm((f) => ({ ...f, priority: e.target.value }))
            }
            placeholder="16000"
            className="rounded-xl"
          />
        </div>

        {/* Issuer ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Issuer ID <span className="text-red-500">*</span>
          </label>
          <SearchSelect
            items={issuers}
            value={form.participant_iss_id}
            onChange={(v) => setForm((f) => ({ ...f, participant_iss_id: v }))}
            placeholder="Search issuer..."
            triggerClassName="rounded-xl border border-gray-300 w-full justify-between"
            format="name"
          />
        </div>

        {/* Container Plugin Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Container Plugin Name
          </label>
          <Input
            value={form.container_plugin_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, container_plugin_name: e.target.value }))
            }
            placeholder="e.g., ISO8583_ATMSWLINK_BNI_OUT"
            className="rounded-xl"
          />
        </div>

        {/* Rule */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Rule <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={form.rule}
            onChange={(e) => setForm((f) => ({ ...f, rule: e.target.value }))}
            placeholder='e.g., ((IN.MT==308) && (IN.BID=="009") && (IN.TOTAL_LEGS == 1))'
            className="rounded-xl"
            rows={3}
          />
        </div>

        {/* Description (single line) */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Description
          </label>
          <Input
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="[ACQ=DEST-EMONEY][TO_LINK]"
            className="rounded-xl"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          className="rounded-xl bg-transparent"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="rounded-xl bg-blue-600 hover:bg-blue-700"
          onClick={() => onSubmit(form)}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

export default function TransactionRoutingPage() {
  // Apply CRUD permissions (auto-disables CRUD buttons if not allowed)
  const { canCrud } = useCrudPermissions();
  const router = useRouter();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState(pathname);

  // Connection state
  const [connectionProfiles, setConnectionProfiles] = useState<
    ConnectionProfile[]
  >([]);
  const [selectedConnection, setSelectedConnection] = useState("");

  // Filter state
  const [acquirerFilter, setAcquirerFilter] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState("");
  const [issuerFilter, setIssuerFilter] = useState("");
  const [binNumber, setBinNumber] = useState("");
  const [othersSearch, setOthersSearch] = useState("");
  const [executedQueries, setExecutedQueries] = useState("0.01");

  // Table filters
  const [tableFilters, setTableFilters] = useState({
    id: "",
    priority: "",
    acquirer: "",
    binDetailsId: "",
    binLower: "",
    binUpper: "",
    binHolderName: "",
    gateway: "",
    issuerParticipant: "",
    containerPlugin: "",
    rule: "",
    description: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);

  // Table data (replace sample)
  const [routes, setRoutes] = useState<BinRoutingRoute[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [executedSql, setExecutedSql] = useState("");
  const [executionTime, setExecutionTime] = useState(0);

  const [isSmallQueryExpanded, setIsSmallQueryExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"routing" | "simulation">(
    "routing"
  );

  const api = useRnaApi();
  const { toast } = useToast();

  const [acquirers, setAcquirers] = useState<SimpleIdName[]>([]);
  const [gatewaysMeta, setGatewaysMeta] = useState<SimpleIdName[]>([]);
  const [issuers, setIssuers] = useState<
    Array<SimpleIdName & { container_plugin_name?: string }>
  >([]);

  const [gatewayModalRoute, setGatewayModalRoute] =
    useState<BinRoutingRoute | null>(null);
  const [issuerModalRoute, setIssuerModalRoute] =
    useState<BinRoutingRoute | null>(null);
  const [newGatewayId, setNewGatewayId] = useState<string>("");
  const [newIssuerId, setNewIssuerId] = useState<string>("");
  const [newPriorityInput, setNewPriorityInput] = useState<string>("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    participant_acq_id: "",
    bin_lower: "",
    bin_upper: "",
    gateway_id: "",
    priority: "",
    participant_iss_id: "",
    rule: "",
    description: "",
    container_plugin_name: "",
    bin_type: "", // renamed from 'type'
    country: "",
    currency: "",
    region: "",
  });

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  );
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const [detailsRoute, setDetailsRoute] = useState<BinRoutingRoute | null>(
    null
  );

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    route: BinRoutingRoute | null;
    cell: { key: string; value: string } | null;
  }>({ visible: false, x: 0, y: 0, route: null, cell: null });

  const [deleteRoute, setDeleteRoute] = useState<BinRoutingRoute | null>(null);

  const [editingRouteId, setEditingRouteId] = useState<number | null>(null); // Declare editingRouteId and setEditingRouteId

  const [isLoading, setIsLoading] = useState(false);

  const handleNavigation = (href: string) => {
    router.push(href);
    setActiveSection(href);
  };

  // Fetch connection profiles
  useEffect(() => {
    api.getConnectionProfiles(
      (data) => {
        const dbConnections = data.filter(
          (profile) => profile.connection_type === "DB"
        );
        setConnectionProfiles(dbConnections);
      },
      (error) => {
        console.error("Failed to fetch connection profiles:", error);
      }
    );
  }, []);

  // Fetch filter lists when connection changes
  useEffect(() => {
    if (!selectedConnection) return;
    setAcquirers([]); // Clear acquirers list
    setGatewaysMeta([]); // Clear gateways list
    setIssuers([]); // Clear issuers list

    api.getBinAcquirers(
      selectedConnection,
      (data) =>
        setAcquirers(
          (data?.results || []).map((d) => ({
            id: Number(d.id),
            name: String(d.name),
          }))
        ),
      (err) => console.error("Acquirers error", err)
    );
    api.getBinGateways(
      selectedConnection,
      (data) =>
        setGatewaysMeta(
          (data?.results || []).map((d) => ({
            id: Number(d.id),
            name: String(d.name),
          }))
        ),
      (err) => console.error("Gateways error", err)
    );
    api.getParticipants(
      {
        profileId: selectedConnection,
        page: 1,
        page_size: 2000,
        search: "",
      },
      (data: any) => {
        const items =
          (data?.results || []).map((p: any) => {
            const id = Number(
              p?.id ??
                p?.participant_id ??
                p?.participantId ??
                p?.issuer_id ??
                p?.issuerId
            );
            const plugin = String(p?.container_plugin_name ?? "").trim();
            const baseName =
              p?.name ?? p?.participant_name ?? p?.issuer_name ?? "Unknown";
            return {
              id,
              name: plugin ? `${baseName} (${plugin})` : String(baseName),
              container_plugin_name: plugin || undefined,
            };
          }) || [];
        setIssuers(items);
      },
      (err) => console.error("Issuers error", err)
    );
  }, [selectedConnection]);

  // Search handler -> call list API
  const handleSearch = useCallback(
    (overrides?: { page?: number; pageSize?: number }) => {
      if (!selectedConnection) {
        toast({
          title: "Select connection",
          description: "Please choose a DB connection first.",
        });
        return;
      }

      const nextPage = overrides?.page ?? currentPage;
      const nextPageSize = overrides?.pageSize ?? pageSize;

      setIsLoading(true); // shimmer skeleton
      setIsPaginationLoading(true); // disable pagination controls

      api.listBinRoutes(
        {
          profileId: selectedConnection,
          page: nextPage,
          page_size: nextPageSize,
          sort: "desc",
          acquirer_id: acquirerFilter || undefined,
          issuer_id: issuerFilter || undefined,
          bin: binNumber || undefined,
          gateway_id: gatewayFilter || undefined,
          search: othersSearch || undefined,
        },
        (data: BinRoutingListResponse) => {
          setRoutes(data.results || []);
          setTotalRows(data.total_rows || 0);
          setExecutedSql(data.executed_sql || "");
          setExecutionTime(data.execution_time || 0);
          setExecutedQueries(
            String(
              (data.execution_time || 0).toFixed
                ? (data.execution_time as any).toFixed(2)
                : data.execution_time
            )
          );
          setIsLoading(false);
          setIsPaginationLoading(false);
        },
        (err) => {
          console.error("List error", err);
          setRoutes([]);
          setTotalRows(0);
          setIsLoading(false);
          setIsPaginationLoading(false);
        }
      );
    },
    [
      selectedConnection,
      currentPage,
      pageSize,
      acquirerFilter,
      issuerFilter,
      binNumber,
      gatewayFilter,
      othersSearch,
      api,
      toast,
    ]
  );

  // Auto load when connection selected or page/pageSize changes
  // useEffect(() => {
  //   if (selectedConnection) handleSearch()
  // }, [selectedConnection, currentPage, pageSize, handleSearch])

  const handleClear = () => {
    setAcquirerFilter("");
    setGatewayFilter("");
    setIssuerFilter("");
    setBinNumber("");
    setOthersSearch("");
    setTableFilters({
      id: "",
      priority: "",
      acquirer: "",
      binDetailsId: "",
      binLower: "",
      binUpper: "",
      binHolderName: "",
      gateway: "",
      issuerParticipant: "",
      containerPlugin: "",
      rule: "",
      description: "",
    });
    // Clear selection, sort, and filter states
    setSelectedRows(new Set());
    setSortConfig(null);
    setColumnFilters({});
    setHasSearched(false); // reset search flag on clear
  };

  // Copy/Save executed SQL
  const handleCopyExecutedSql = async () => {
    try {
      await navigator.clipboard.writeText(executedSql || "");
      toast({
        title: "Copied",
        description: "Executed SQL copied to clipboard.",
      });
    } catch (e) {
      toast({ title: "Copy failed", description: String(e) });
    }
  };
  const handleSaveExecutedSql = () => {
    const blob = new Blob([executedSql || ""], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `executed_sql_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CHANGE: handleAddNew: initialize bin_lower/bin_upper instead of bin
  const handleAddNew = () => {
    setCreateForm({
      participant_acq_id: "",
      bin_lower: "",
      bin_upper: "",
      gateway_id: "",
      priority: "",
      participant_iss_id: "",
      rule: "",
      description: "",
      container_plugin_name: "",
      bin_type: "", // renamed from 'type'
      country: "",
      currency: "",
      region: "",
    });
    setIsCreateOpen(true);
  };

  // CHANGE: submit signature + payload: use bin_lower/bin_upper; drop bin
  const handleCreateEditSubmit = useCallback(
    (form: {
      participant_acq_id: string;
      bin_lower: string;
      bin_upper: string;
      gateway_id: string;
      priority: string;
      participant_iss_id: string;
      rule: string;
      description: string;
      container_plugin_name: string;
      bin_type: string; // renamed
      country: string;
      currency: string;
      region: string;
    }) => {
      if (!selectedConnection) {
        toast({
          title: "Select connection",
          description: "Please choose a DB connection first.",
        });
        return;
      }

      const lower = padBinToLength(
        normalizeBinInput(form.bin_lower),
        BIN_TOTAL_LENGTH
      );
      const upper = padBinUpperToLength(
        normalizeBinInput(form.bin_upper || form.bin_lower),
        BIN_TOTAL_LENGTH
      );

      const payload = {
        connection: selectedConnection,
        participant_acq_id: Number(form.participant_acq_id),
        bin_lower: lower,
        bin_upper: upper,
        gateway_id: Number(form.gateway_id),
        priority: Number(form.priority || 0),
        participant_iss_id: Number(form.participant_iss_id),
        rule: form.rule || "",
        description: form.description || "",
        container_plugin_name: form.container_plugin_name || "",
        bin_type: form.bin_type || "",
        country: form.country || "",
        currency: form.currency || "",
        region: form.region || "",
      };

      if (editingRouteId) {
        api.updateBinRoute(
          editingRouteId,
          payload,
          () => {
            toast({ title: "Updated", description: "Route has been updated." });
            setIsCreateOpen(false);
            setEditingRouteId(null);
            handleSearch();
          },
          (err) => toast({ title: "Update failed", description: String(err) })
        );
      } else {
        api.createBinRoute(
          payload,
          () => {
            toast({
              title: "Created",
              description: "New route has been created.",
            });
            setIsCreateOpen(false);
            handleSearch();
          },
          (err) => toast({ title: "Create failed", description: String(err) })
        );
      }
    },
    [selectedConnection, editingRouteId, api, toast, handleSearch]
  );

  const openGatewayModal = useCallback((r: BinRoutingRoute) => {
    setGatewayModalRoute(r);
    setNewGatewayId(String(r.gateway_id ?? ""));
  }, []);
  const openIssuerModal = useCallback((r: BinRoutingRoute) => {
    setIssuerModalRoute(r);
    setNewIssuerId(String(r.participant_iss_id ?? ""));
    setNewPriorityInput(String(r.priority ?? ""));
    setNewGatewayId(String(r.gateway_id ?? "")); // seed current gateway for combined change
  }, []);

  // CHANGE: add openDuplicateRoute to prefill create form from a selected row without setting editingRouteId
  const openDuplicateRoute = useCallback((r: BinRoutingRoute) => {
    const binLowerRaw = String(
      (r as any).bin_lower ?? (r as any).binLower ?? ""
    );
    const binUpperRaw = String(
      (r as any).bin_upper ?? (r as any).binUpper ?? ""
    );
    const prefilledLower = padBinToLength(
      normalizeBinInput(binLowerRaw),
      BIN_TOTAL_LENGTH
    );
    // if upper missing, default to padded upper from lower
    const prefilledUpper = binUpperRaw
      ? padBinUpperToLength(normalizeBinInput(binUpperRaw), BIN_TOTAL_LENGTH)
      : padBinUpperToLength(normalizeBinInput(binLowerRaw), BIN_TOTAL_LENGTH);

    setCreateForm({
      participant_acq_id: String(r.participant_acq_id ?? ""),
      bin_lower: prefilledLower,
      bin_upper: prefilledUpper,
      gateway_id: String(r.gateway_id ?? ""),
      priority: String(r.priority ?? ""),
      participant_iss_id: String(r.participant_iss_id ?? ""),
      rule: String(r.rule ?? ""),
      description: String(r.description ?? ""),
      container_plugin_name: String(
        (r as any).container_plugin_name ?? (r as any).container_plugin ?? ""
      ),
      bin_type: String((r as any).bin_type ?? (r as any).type ?? ""),
      country: String((r as any).country ?? ""),
      currency: String((r as any).currency ?? ""),
      region: String((r as any).region ?? ""),
    });
    // ensure it's the "Create New" flow
    setEditingRouteId(null);
    setIsCreateOpen(true);
  }, []);

  const confirmDelete = useCallback(
    (r: BinRoutingRoute) => {
      if (!selectedConnection) return;
      if (window.confirm("Delete this route?")) {
        api.deleteBinRoute(
          r.id,
          selectedConnection,
          () => {
            toast({ title: "Deleted", description: `Route ${r.id} removed` });
            handleSearch();
          },
          (err) => toast({ title: "Delete failed", description: String(err) })
        );
      }
    },
    [selectedConnection, api, toast, handleSearch]
  );

  const saveGatewayChange = useCallback(
    (routeId: number, gatewayId: number) => {
      if (!selectedConnection || !gatewayModalRoute) return;
      api.updateGatewayForBinDetails(
        {
          connection: selectedConnection,
          gateway_id: gatewayId,
          bin_details_id: Number((gatewayModalRoute as any).bin_details_id),
        },
        () => {
          toast({ title: "Updated", description: "Gateway updated" });
          setGatewayModalRoute(null);
          setNewGatewayId("");
          handleSearch();
        },
        (err) => toast({ title: "Update failed", description: String(err) })
      );
    },
    [selectedConnection, gatewayModalRoute, api, toast, handleSearch]
  );

  // CHANGE: allow changing issuer, priority, and optionally gateway in one save handler
  const saveIssuerChange = useCallback(
    (
      routeId: number,
      issuerId: number,
      priority?: number,
      gatewayId?: number
    ) => {
      if (!selectedConnection) return;

      const payload: {
        connection: string;
        participant_iss_id: number;
        priority?: number;
        gateway_id?: number;
      } = {
        connection: selectedConnection,
        participant_iss_id: issuerId,
      };

      // keep existing priority behavior
      payload.priority =
        priority === undefined
          ? Number(newPriorityInput) ||
            routes.find((r) => r.id === routeId)?.priority
          : priority;

      if (gatewayId !== undefined && Number.isFinite(gatewayId)) {
        payload.gateway_id = gatewayId;
      }

      api.updateBinRoute(
        routeId,
        payload,
        () => {
          toast({ title: "Updated", description: "Route updated" });
          setIssuerModalRoute(null);
          setNewIssuerId("");
          setNewPriorityInput("");
          setNewGatewayId(""); // clear gateway ID as well since it's now part of this modal
          handleSearch();
        },
        (err) => toast({ title: "Update failed", description: String(err) })
      );
    },
    [selectedConnection, api, toast, newPriorityInput, routes, handleSearch]
  );

  const handleRouteRowSelect = useCallback(
    (index: number) => {
      const next = new Set(selectedRows);
      next.has(index) ? next.delete(index) : next.add(index);
      setSelectedRows(next);
    },
    [selectedRows]
  );

  const handleRouteRowSelectAll = useCallback(
    (selectAll: boolean) => {
      const next = new Set<number>();
      if (selectAll && routes.length > 0) {
        routes.forEach((_, i) => next.add(i));
      }
      setSelectedRows(next);
    },
    [routes]
  );

  const handleRouteSort = useCallback(
    (key: string) => {
      let direction: "asc" | "desc" = "asc";
      if (
        sortConfig &&
        sortConfig.key === key &&
        sortConfig.direction === "asc"
      )
        direction = "desc";
      setSortConfig({ key, direction });
    },
    [sortConfig]
  );

  const handleRouteColumnFilter = useCallback((key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleRoutePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      if (hasSearched && selectedConnection) {
        handleSearch({ page, pageSize });
      }
    },
    [hasSearched, selectedConnection, pageSize, handleSearch]
  );

  const handleRoutePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      const firstPage = 1;
      setCurrentPage(firstPage);
      if (hasSearched && selectedConnection) {
        handleSearch({ page: firstPage, pageSize: size });
      }
    },
    [hasSearched, selectedConnection, handleSearch]
  );

  const paginationState = useMemo(
    () => ({
      currentPage,
      pageSize,
      totalRows,
      totalPages: Math.max(1, Math.ceil((totalRows || 0) / pageSize)),
    }),
    [currentPage, pageSize, totalRows]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((totalRows || 0) / pageSize)),
    [totalRows, pageSize]
  );
  const currentRoutes = routes;

  const duplicateRanges = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of routes) {
      // Use binLower and binUpper for checking duplicates
      const key = `${r.bin_lower ?? ""}-${r.bin_upper ?? ""}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [routes]);

  const openEditRoute = useCallback((r: BinRoutingRoute) => {
    setEditingRouteId(r.id);

    const binLowerRaw = String(
      (r as any).bin_lower ?? (r as any).binLower ?? ""
    );
    const binUpperRaw = String(
      (r as any).bin_upper ?? (r as any).binUpper ?? ""
    );
    const prefilledLower = padBinToLength(
      normalizeBinInput(binLowerRaw),
      BIN_TOTAL_LENGTH
    );
    const prefilledUpper = binUpperRaw
      ? padBinUpperToLength(normalizeBinInput(binUpperRaw), BIN_TOTAL_LENGTH)
      : padBinUpperToLength(normalizeBinInput(binLowerRaw), BIN_TOTAL_LENGTH);

    setCreateForm({
      participant_acq_id: String(r.participant_acq_id ?? ""),
      bin_lower: prefilledLower,
      bin_upper: prefilledUpper,
      gateway_id: String(r.gateway_id ?? ""),
      priority: String(r.priority ?? ""),
      participant_iss_id: String(r.participant_iss_id ?? ""),
      rule: String(r.rule ?? ""),
      description: String(r.description ?? ""),
      container_plugin_name: String(
        (r as any).container_plugin_name ?? (r as any).container_plugin ?? ""
      ),
      bin_type: String((r as any).bin_type ?? (r as any).type ?? ""), // renamed + fallback
      country: String((r as any).country ?? ""),
      currency: String((r as any).currency ?? ""),
      region: String((r as any).region ?? ""),
    });
    setIsCreateOpen(true);
  }, []);

  const requestDeleteRoute = useCallback(
    (r: BinRoutingRoute) => setDeleteRoute(r),
    []
  );
  const handleConfirmDelete = useCallback(() => {
    if (!deleteRoute || !selectedConnection) return;
    api.deleteBinRoute(
      deleteRoute.id,
      selectedConnection,
      () => {
        toast({
          title: "Deleted",
          description: `Route ${deleteRoute.id} removed`,
        });
        setDeleteRoute(null);
        handleSearch();
      },
      (err) => toast({ title: "Delete failed", description: String(err) })
    );
  }, [deleteRoute, selectedConnection, api, toast, handleSearch]);

  const handleRightClick = useCallback(
    (
      e: React.MouseEvent,
      rowIndex: number,
      cell?: { key: string; value: string }
    ) => {
      e.preventDefault();
      const route = routes[rowIndex];
      if (!route) return;

      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        route,
        cell: cell || null,
      });
    },
    [routes]
  );

  // CHANGE: extend context menu action union to include "duplicate" and handle it
  const handleContextMenuAction = useCallback(
    async (
      action:
        | "details"
        | "edit"
        | "duplicate"
        | "delete"
        | "change-gateway"
        | "change-route"
        | "copy-cell"
        | "copy-row"
    ) => {
      const route = contextMenu.route;
      if (!route) return;

      try {
        if (action === "copy-cell") {
          const val = contextMenu.cell?.value ?? "";
          await navigator.clipboard.writeText(val);
          toast({
            title: "Copied cell",
            description: val
              ? "Cell value copied to clipboard."
              : "Empty value copied.",
          });
        } else if (action === "copy-row") {
          const payload = JSON.stringify(route, null, 2);
          await navigator.clipboard.writeText(payload);
          toast({
            title: "Copied row",
            description: "Row data copied to clipboard.",
          });
        } else if (action === "details") {
          setDetailsRoute(route);
        } else if (action === "edit") {
          openEditRoute(route);
        } else if (action === "duplicate") {
          openDuplicateRoute(route);
        } else if (action === "delete") {
          setDeleteRoute(route);
        } else if (action === "change-gateway") {
          openGatewayModal(route);
        } else if (action === "change-route") {
          openIssuerModal(route);
        }
      } catch (err) {
        toast({ title: "Copy failed", description: String(err) });
      } finally {
        setContextMenu({ visible: false, x: 0, y: 0, route: null, cell: null });
      }
    },
    [
      contextMenu.route,
      contextMenu.cell,
      openEditRoute,
      openDuplicateRoute,
      openGatewayModal,
      openIssuerModal,
      toast,
    ]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <div className="flex-shrink-0">
          <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Jalin App</span>
              <span>/</span>
              <span className="text-gray-800 font-medium">
                Routing &amp; Simulator
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                      Routing &amp; Simulator
                    </h1>
                    <p className="text-gray-600">
                      Filter &amp; kelola aturan routing BIN, atau jalankan
                      simulasi — klik baris untuk detail
                    </p>
                  </div>
                  <Route className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Connection Profile</Label>
                    <Select
                      value={selectedConnection}
                      onValueChange={setSelectedConnection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih connection" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectionProfiles.map((profile, idx) => (
                          <SelectItem
                            key={`${profile.name}-${idx}`}
                            value={profile.name}
                          >
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 w-full">
                      <button
                        type="button"
                        onClick={() => setActiveTab("routing")}
                        className={`flex-1 px-3 py-2 text-sm rounded-md transition ${
                          activeTab === "routing"
                            ? "bg-white text-gray-900 shadow-sm font-medium"
                            : "text-gray-600 hover:text-gray-800"
                        }`}
                        aria-pressed={activeTab === "routing"}
                      >
                        Routing
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("simulation")}
                        className={`flex-1 px-3 py-2 text-sm rounded-md transition ${
                          activeTab === "simulation"
                            ? "bg-white text-gray-900 shadow-sm font-medium"
                            : "text-gray-600 hover:text-gray-800"
                        }`}
                        aria-pressed={activeTab === "simulation"}
                      >
                        Simulation
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {activeTab === "routing" ? (
                      <>
                        <Button
                          onClick={() => {
                            setHasSearched(true);
                            setCurrentPage(1);
                            handleSearch({ page: 1, pageSize });
                          }}
                          disabled={!selectedConnection || isLoading}
                          className="flex-1 md:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Cari Routing
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleClear}
                        >
                          <X className="h-4 w-4 mr-1.5" />
                          Reset
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddNew}
                          disabled={!selectedConnection}
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          Add New
                        </Button>
                      </>
                    ) : (
                      <Badge variant="secondary" className="font-normal h-9 px-3">
                        <Database className="h-3.5 w-3.5 mr-1.5" />
                        {routes.length} routes
                      </Badge>
                    )}
                  </div>
                </div>

                {activeTab === "routing" ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                          <Filter className="h-4 w-4 text-gray-500" />
                          Filter routing
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Acquirer, gateway, issuer, BIN, atau pencarian teks
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-600">
                          Acquirer ID
                        </Label>
                        <SearchSelect
                          items={acquirers}
                          value={acquirerFilter}
                          onChange={setAcquirerFilter}
                          placeholder="Pilih acquirer"
                          format="id-name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-600">Gateway</Label>
                        <SearchSelect
                          items={gatewaysMeta}
                          value={gatewayFilter}
                          onChange={setGatewayFilter}
                          placeholder="Pilih gateway"
                          format="id-name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-600">
                          Issuer/Participant
                        </Label>
                        <SearchSelect
                          items={issuers}
                          value={issuerFilter}
                          onChange={setIssuerFilter}
                          placeholder="Pilih issuer"
                          format="name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-600">
                          BIN Number
                        </Label>
                        <Input
                          value={binNumber}
                          onChange={(e) =>
                            setBinNumber(
                              normalizeBinInput(e.target.value).slice(
                                0,
                                BIN_TOTAL_LENGTH
                              )
                            )
                          }
                          onBlur={() =>
                            setBinNumber((v) =>
                              padBinToLength(
                                normalizeBinInput(v),
                                BIN_TOTAL_LENGTH
                              )
                            )
                          }
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              selectedConnection &&
                              !isLoading
                            ) {
                              setHasSearched(true);
                              setCurrentPage(1);
                              handleSearch({ page: 1, pageSize });
                            }
                          }}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="e.g., 4105040000000000000"
                          className="font-mono text-sm"
                          disabled={!selectedConnection}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-600">
                          Pencarian cepat
                        </Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Cari teks apa saja..."
                            value={othersSearch}
                            onChange={(e) => setOthersSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                selectedConnection &&
                                !isLoading
                              ) {
                                setHasSearched(true);
                                setCurrentPage(1);
                                handleSearch({ page: 1, pageSize });
                              }
                            }}
                            className="pl-9 font-mono text-sm"
                            disabled={!selectedConnection}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <RoutingSimulationPanel
                    selectedConnection={selectedConnection}
                    acquirers={acquirers}
                    routes={routes}
                    onApplyResults={(simRoutes, sql, execSec) => {
                      setRoutes(simRoutes);
                      setTotalRows(simRoutes.length);
                      setExecutedSql(sql);
                      if (
                        typeof execSec === "number" &&
                        !Number.isNaN(execSec)
                      ) {
                        setExecutionTime(execSec);
                      }
                    }}
                  />
                )}

                <div className="flex justify-center">
                  <Button
                    onClick={() =>
                      setIsSmallQueryExpanded(!isSmallQueryExpanded)
                    }
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                  >
                    <Code className="h-3.5 w-3.5 mr-1.5 text-gray-600" />
                    <span className="text-gray-700 font-medium">SQL</span>
                    {typeof executionTime === "number" &&
                      !Number.isNaN(executionTime) && (
                        <Badge
                          variant="secondary"
                          className="ml-1.5 font-normal"
                        >
                          {executionTime.toFixed(2)}s
                        </Badge>
                      )}
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 ml-1.5 text-gray-500 transition-transform duration-200 ${
                        isSmallQueryExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </div>

                {isSmallQueryExpanded && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {typeof executionTime === "number" &&
                          !Number.isNaN(executionTime) && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-gray-600">
                                <span className="font-medium text-green-700">
                                  {executionTime.toFixed(3)}s
                                </span>
                              </span>
                            </div>
                          )}
                        <div className="flex items-center space-x-1">
                          <Database className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-xs text-gray-600">
                            <span className="font-medium text-blue-700">
                              {(totalRows || 0).toLocaleString()}
                            </span>{" "}
                            rows
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyExecutedSql}
                          className="h-8"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveExecutedSql}
                          className="h-8"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="bg-slate-700 rounded-md p-1">
                            <Code className="h-3 w-3 text-slate-300" />
                          </div>
                          <span className="text-xs font-medium text-slate-300">
                            Executed SQL Query
                          </span>
                        </div>
                      </div>
                      <pre className="text-sm text-slate-100 whitespace-pre-wrap font-mono leading-relaxed">
                        {executedSql ? executedSql : "No query available"}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Database className="h-4 w-4 text-gray-500" />
                      {activeTab === "routing"
                        ? "Hasil routing"
                        : "Hasil simulasi"}
                      <Badge variant="secondary" className="font-normal">
                        {totalRows || routes.length} total
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    {isLoading ? (
                      <div className="p-10 text-center text-gray-500">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Mencari data...
                      </div>
                    ) : (
                      <RouteTable
                        routes={routes}
                        selectedRows={selectedRows}
                        onRowSelect={handleRouteRowSelect}
                        onRowSelectAll={handleRouteRowSelectAll}
                        onRightClick={handleRightClick}
                        sortConfig={sortConfig}
                        onSort={handleRouteSort}
                        columnFilters={columnFilters}
                        onColumnFilter={handleRouteColumnFilter}
                        hiddenColumns={hiddenColumns}
                        onColumnVisibilityChange={(columnKey) => {
                          const next = new Set(hiddenColumns);
                          next.has(columnKey)
                            ? next.delete(columnKey)
                            : next.add(columnKey);
                          setHiddenColumns(next);
                        }}
                        paginationState={paginationState}
                        onPageChange={handleRoutePageChange}
                        onPageSizeChange={handleRoutePageSizeChange}
                        isPaginationLoading={isPaginationLoading}
                        onRowDoubleClick={(route) => setDetailsRoute(route)}
                        onDelete={confirmDelete}
                        hidePagination={activeTab === "simulation"}
                      />
                    )}
                  </div>
                </div>
              </div>

            {/* CHANGE: replace inline, parent-controlled form with the local-state CreateEditRouteModalContent */}
            <Dialog
              open={isCreateOpen}
              onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) setEditingRouteId(null);
              }}
            >
              {/* prevent expensive auto-focus work to reduce typing lag in Edit/Add BIN Route modal */}
              <DialogContent
                className="sm:max-w-[720px] rounded-3xl"
                onOpenAutoFocus={(e) => {
                  // Prevent focus thrash when opening the dialog to keep UI responsive
                  e.preventDefault();
                }}
              >
                <CreateEditRouteModalContent
                  title={
                    editingRouteId ? "Edit BIN Route" : "Create New BIN Route"
                  }
                  initialForm={createForm}
                  acquirers={acquirers}
                  gatewaysMeta={gatewaysMeta}
                  issuers={issuers}
                  onCancel={() => {
                    setIsCreateOpen(false);
                    setEditingRouteId(null);
                  }}
                  onSubmit={handleCreateEditSubmit}
                />
              </DialogContent>
            </Dialog>

            {detailsRoute && (
              <RouteDetailsModal
                isOpen={!!detailsRoute}
                onClose={() => setDetailsRoute(null)}
                route={detailsRoute}
                connection={selectedConnection}
                canEdit={canCrud}
                acquirers={acquirers}
                issuers={issuers}
                gateways={gatewaysMeta}
                onUpdated={(updated) => {
                  setDetailsRoute(updated);
                  setRoutes((prev) =>
                    prev.map((r) =>
                      r.id === updated.id ? { ...r, ...updated } : r
                    )
                  );
                }}
              />
            )}

            {contextMenu.visible && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setContextMenu({
                      visible: false,
                      x: 0,
                      y: 0,
                      route: null,
                      cell: null,
                    })
                  }
                />
                <div
                  className="fixed bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 min-w-48"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                  onMouseLeave={() =>
                    setContextMenu({
                      visible: false,
                      x: 0,
                      y: 0,
                      route: null,
                      cell: null,
                    })
                  }
                >
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors disabled:opacity-50"
                    onClick={() => handleContextMenuAction("copy-cell")}
                    disabled={!contextMenu.cell}
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy selected cell</span>
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    onClick={() => handleContextMenuAction("copy-row")}
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy entire row</span>
                  </button>

                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    onClick={() => handleContextMenuAction("details")}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Show details</span>
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    onClick={() => handleContextMenuAction("edit")}
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    onClick={() => handleContextMenuAction("change-gateway")}
                  >
                    <Database className="h-4 w-4" />
                    <span>Change BIN Gateway</span>
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    onClick={() => handleContextMenuAction("change-route")}
                  >
                    <Code className="h-4 w-4" />
                    <span>Change Transaction Route</span>
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    onClick={() => handleContextMenuAction("duplicate")}
                  >
                    <Copy className="h-4 w-4" />
                    <span>Duplicate</span>
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                    onClick={() => handleContextMenuAction("delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}

            {deleteRoute && (
              <AlertDialog
                open={!!deleteRoute}
                onOpenChange={(open) => !open && setDeleteRoute(null)}
              >
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete route?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently remove
                      the selected route
                      {deleteRoute ? (
                        <>
                          :{" "}
                          <span className="font-medium">
                            ID {deleteRoute.id} — {deleteRoute.acq_name || ""} →{" "}
                            {deleteRoute.gateway_name || ""}
                          </span>
                        </>
                      ) : null}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-red-600 hover:bg-red-700"
                      onClick={handleConfirmDelete}
                    >
                      Confirm delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* CHANGE: replace inline Change BIN Gateway modal with isolated component to avoid parent re-renders on input typing */}
            {gatewayModalRoute && (
              <GatewayChangeModal
                route={gatewayModalRoute}
                gatewaysMeta={gatewaysMeta}
                onClose={() => setGatewayModalRoute(null)}
                onSave={(routeId, gid) => saveGatewayChange(routeId, gid)}
              />
            )}

            {/* CHANGE: replace inline Change Transaction Route modal with isolated component to avoid parent re-renders on input typing */}
            {issuerModalRoute && (
              <IssuerChangeModal
                route={issuerModalRoute}
                gatewaysMeta={gatewaysMeta}
                issuers={issuers}
                onClose={() => setIssuerModalRoute(null)}
                onSave={(routeId, issId, pr, gid) =>
                  saveIssuerChange(routeId, issId, pr, gid)
                }
              />
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
