import type { ColumnDef } from "@tanstack/react-table"

export interface User {
  id: number
  username: string
  email: string
  role_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ConnectionProfile {
  name: string
  category: string
  connection_type: string
  database: string
  host: string
  port: number
  user: string
  password: string
}

export interface Participant {
  id: number
  ext_id: string
  participant_type: string
  name: string
  container_plugin_name: string
  network_type: string
  active: number
  display_on_ui: string
  comments: string
  created_at: string
  updated_at: string
}

export interface ContainerPlugin {
  id: number
  name: string
  plugin_id: number
  node_type: number
  container_id: number
  in_next_plugin: string
  out_next_plugin: string
  connectto_ipport: string
  port_listen: number
  queue_threshold: number
  response_timeout: number
  startup_order: number
  state_startup: number
  dynamic_creation_mode: number
  max_dynamic_instances: number
  flapping_ignore_time: number
  cnt_instances: number
  comments: string
}

export interface ContainerPluginAttr {
  id: number
  container_plugin_id: number
  field: string
  content: string
}

export interface OnlineConfig {
  id: number
  container_plugin_name: string
  plugin_id: number
  key_type: number
  config_key: string
  config_value: string
  acq_participant_id: number
  iss_participant_id: number
}

export interface ParticipantDuplicateInfoResponse {
  participant: Participant
  container_plugins: ContainerPlugin[]
  container_plugin_attrs: ContainerPluginAttr[]
  online_configs: OnlineConfig[]
}

export interface ParticipantDuplicateInfoRequest {
  profileId: string
  container_plugin_name: string
}

export interface ParticipantDuplicateRequest {
  profileId: string
  participant: Partial<Participant> & { id?: number }
  container_plugins: (Partial<ContainerPlugin> & { id?: number })[]
  container_plugin_attrs: (Partial<ContainerPluginAttr> & { id?: number })[]
  online_configs: (Partial<OnlineConfig> & { id?: number })[]
  is_query_downloaded: boolean
}

export interface ParticipantDuplicateResponse {
  message: string
  participant_id: number
  success: boolean
  executed_sqls?: string[]
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface ParticipantFilter {
  name?: string
  ext_id?: string
  participant_type?: string
  network_type?: string
  active?: number
  display_on_ui?: string
}

export interface Transaction {
  id: number
  transaction_id: string
  transaction_type: string
  amount: number
  status: string
  timestamp: string
  // Add other fields as necessary
}

export interface TransactionFilter {
  transaction_id?: string
  transaction_type?: string
  status?: string
  startDate?: string
  endDate?: string
}

export interface TransactionFlow {
  id: number
  step: number
  description: string
  status: string
  timestamp: string
}

export interface TransactionInsight {
  totalTransactions: number
  successfulTransactions: number
  failedTransactions: number
  averageResponseTime: number
}

export interface ComparisonSetup {
  sourceDatabase: string
  targetDatabase: string
  tablesToCompare: string[]
  comparisonType: "schema" | "data" | "both"
}

export interface ComparisonResult {
  table: string
  status: "matched" | "mismatched" | "missing_source" | "missing_target"
  details?: string
}

export interface ComparisonQueueItem {
  id: string
  status: "pending" | "running" | "completed" | "failed"
  progress: number
  startTime: string
  endTime?: string
  setup: ComparisonSetup
  results?: ComparisonResult[]
}

export interface TableComparison {
  id: string
  sourceProfile: string
  targetProfile: string
  sourceTable: string
  targetTable: string
  columnMappings: ColumnMapping[]
  comparisonKey?: {
    type: "PRIMARY" | "CUSTOM"
    columns?: string[]
  }
  query?: string
  isQueryMode?: boolean
  status: "pending" | "running" | "completed" | "error"
  results?: TableComparisonResponse
  error?: string
}

export interface TableComparisonRequest {
  source_profile: string
  target_profile: string
  source_table: string
  target_table: string
  column_mapping?: Record<string, string>
  compare_options: {
    compare_all?: boolean
    only_in_source?: boolean
    only_in_target?: boolean
    different_records?: boolean
    identical_records?: boolean
    ignore_case?: boolean
    ignore_trailing_spaces?: boolean
    comparison_key?: string | string[]
  }
  compare_fields?: string[]
  is_query_mode?: boolean
  query?: string
}

export interface TableComparisonResponse {
  summary: {
    only_in_source: number
    only_in_target: number
    different: number
    identical: number
  }
  only_in_source: any[]
  only_in_target: any[]
  different: any[]
  identical: any[]
}

export interface ColumnMapping {
  sourceColumn: string
  targetColumn: string
  dataType?: string
  isMatched: boolean
}

export interface ParticipantSearchResponse {
  results: Participant[]
  total_rows: number
  page: number
  page_size: number
  execution_time?: number
  error?: string | null
  executed_sql?: string
}

export interface ParticipantSearchParams {
  profileId: string
  page: number
  page_size: number
  search?: string
  /** Applied server-side with pagination (AND with global search when both set). */
  column_filters?: Record<string, string>
}

export interface ContainerPluginSearchParams {
  profileId: string
  name: string
}

interface DuplicateFormData {
  id: string
  ext_id: string
  participant_type: string
  name: string
  newMainPluginName: string
  mainPluginInNext: string
  mainPluginOutNext: string
  newMainPluginId: string
  newComPluginId: string
  network_type: string
  active: number
  display_on_ui: string
  comments: string
  container_selected: string
  is_query_downloaded: boolean
  newMainPluginComments: string
  newComPluginConnectToIpPort: string
}

export const participantColumns: ColumnDef<Participant>[] = [
  {
    accessorKey: "ext_id",
    header: "Ext ID",
  },
  {
    accessorKey: "name",
    header: "Nama Member",
  },
  {
    accessorKey: "participant_type",
    header: "Jenis Member",
  },
  {
    accessorKey: "container_plugin_name",
    header: "Container Plugin",
  },
  {
    accessorKey: "network_type",
    header: "Tipe Jaringan",
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => (row.original.active === 1 ? "Aktif" : "Tidak Aktif"),
  },
  {
    accessorKey: "display_on_ui",
    header: "Tampilkan Display",
    cell: ({ row }) => (row.original.display_on_ui === "Y" ? "Ya" : "Tidak"),
  },
  {
    accessorKey: "comments",
    header: "Keterangan",
  },
]

export interface BinRoutingRoute {
  id: number
  participant_acq_id: number
  acq_name: string
  bin_lower: string
  bin_upper: string
  gateway_id: number
  gateway_name: string
  priority: number
  participant_iss_id: number
  iss_name: string
  container_plugin_name: string
  rule: string
  description: string
  bin_details_id?: number
  bin_holder_name?: string
  // Simulation-only fields
  match_status?: number
  status_reason?: string
  isMatch?: boolean
}

export interface BinRoutingListRequest {
  profileId: string
  page?: number
  page_size?: number
  sort?: "asc" | "desc"
  acquirer_id?: number | string
  issuer_id?: number | string
  bin?: string
  gateway_id?: number | string
  search?: string
}

export interface BinRoutingListResponse {
  results: BinRoutingRoute[]
  total_rows: number
  page: number
  page_size: number
  execution_time: number
  executed_sql?: string
  error?: string | null
}

export interface SimpleIdName {
  id: number
  name: string
}
