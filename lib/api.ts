// API configuration and utilities with JWT authentication
import { tokenManager } from "@/lib/auth"
import { getApiBaseUrl } from "@/lib/api-base"
import type { ParticipantSearchResponse as ParticipantSearchResponseInterface } from "./types"
import type { ParticipantSearchParams as ParticipantSearchParamsInterface } from "./types"
import axios from "axios"
import type { ConnectionProfile } from "./types"

const API_TIMEOUT = Number.parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000")
const getBaseUrl = () => getApiBaseUrl()

// Define a generic API response structure
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ConnectionProfilesResponse {
  profiles: ConnectionProfile[]
}

export interface TransactionFilter {
  field: string
  operator: string
  value: string
}

export interface TransactionSearchParams {
  connectionId: string
  dateStart: string
  dateEnd: string
  filters: TransactionFilter[]
  page: number
  pageSize: number
}

// Updated Transaction interface to match actual API response
export interface Transaction {
  "Trx ID": number
  TID: string
  UUID: string
  RRN: string
  "Card Number": string
  Procode: string
  Amount: number
  "RC Host": string | null
  Result: number
  "RC EFTS": string
  "Result Desc": string
  "Acq ID": number
  "Acquier Name": string
  "Iss ID": number
  "Issuer Name": string
  "Gateway ID": string
  "Gateway Name": string
  "Principal Code": string | null
  "Msg Class": number
  "Msg Class Description": string
  "Msg Type": number
  "Msg Type Description": string
  "Trx Status": number
  "Trx Status Description": string
  "Ref UUID": string
  "Reversal Tries": number
  "Date n Time": string
  "Date n Time Time Out": string
}

// Updated response interface to match actual API structure
export interface TransactionSearchResponse {
  results: Transaction[]
  page: number
  page_size: number
  execution_time: number
  error: string | null
  total_count?: number // Add total count for proper pagination
  total_pages?: number // Add total pages
  total_rows?: number
  executed_sql?: string // Add executed_sql
}

export interface SaveTransactionRequest {
  connection: string
  saveName: string
  description?: string
  saveGraylog: boolean
  transactions: Array<{
    trx_id: number
    uuid: string
  }>
}

export interface SavedTransactionSimple {
  saved_id: string
  save_name: string
  description: string
  created_at: string
  transaction_count: number
  transactions: {
    trx_id: string
    uuid: string
  }[]
}

export interface SavedTransaction {
  id: number
  save_name: string
  description?: string
  connection: string
  transactions_count: number
  attributes_count: number
  endpoints_count: number
  graylog_count: number
  graylog_enabled: boolean
  created_at: string
  updated_at: string
}

export interface SavedTransactionDetailsResponse {
  saved_transaction: {
    id: number
    save_name: string
    description: string
    created_at: string
    trx_id: string
    uuid: string
    user_id: string
    saved_id: string
  }
  transaction_details_count: number
  attributes_count: number
  endpoints_count: number
  graylog_count: number
  transaction_details: Transaction[]
  attributes: any[]
  endpoints: any[]
  graylog_data: any[]
}

export interface SavedTransactionDetails {
  id: number
  save_name: string
  description?: string
  connection: string
  transactions: Transaction[]
  created_at: string
  updated_at: string
}

// Network Packet interfaces
export interface NetworkPacket {
  id: number
  name: string
  ascii?: string
  hex: string
  address: string
  port: number
  protocol: string
  folder: string
  comment?: string
  created_at: string
  updated_at: string
}

export interface CreatePacketRequest {
  name: string
  hex: string
  address: string
  port: number
  protocol: string
  ascii?: string
  folder?: string
  comment?: string
}

export interface UpdatePacketRequest {
  name: string
  hex: string
  address: string
  port: number
  protocol: string
  ascii?: string
  folder?: string
  comment?: string
}

export interface TrafficLog {
  id: number
  time: string
  fromIP: string
  fromPort: string
  toAddress: string
  toPort: string
  method: string
  data: string
  error: string
  type: "IN" | "OUT"
  packet_id: number
  created_at?: string
}

export interface ConnectionLog {
  id: number
  time: string
  connectionId: string
  status: "ESTABLISHING" | "ESTABLISHED" | "CLOSED" | "FAILED" | "INFO"
  protocol: string
  localAddress: string
  remoteAddress: string
  details: string
  duration: string
  packet_id: number
  message: string
  created_at?: string
}

export interface SendPacketRequest {
  packet: {
    id?: number
    name?: string
    hex: string
    address: string
    port: number
    protocol: string
    ascii?: string
  }
  persistentTcp?: boolean
}

export interface SendPacketResponse {
  success: boolean
  message: string
  trafficLogs?: TrafficLog[]
  connectionLogs?: ConnectionLog[]
  data?: {
    trafficLogs?: TrafficLog[]
    connectionLogs?: ConnectionLog[]
  }
  error?: string
}

export interface StressTestRequest {
  packet_id?: number
  packet: {
    hex: string
    address: string
    port: number
    protocol: string
    ascii?: string
  }
  mode: "count" | "duration"
  count: number
  duration_sec: number
  concurrency: number
  delay_ms: number
  increment_stan: boolean
}

export interface StressTestSnapshot {
  job_id: string
  status: "running" | "completed" | "stopped" | "failed"
  mode: "count" | "duration"
  duration_sec: number
  total: number
  completed: number
  success_count: number
  fail_count: number
  elapsed_ms: number
  rps: number
  tps?: number
  latency_ms: {
    min: number
    avg: number
    max: number
    p95: number
  }
  errors: Array<{ message: string; count: number }>
  target: string
  protocol: string
  rows?: StressTestReportRow[]
  rows_truncated?: boolean
}

export interface StressTestReportRow {
  time: string
  stan: string
  rrn: string
  transaction_type: string
  success: boolean
  latency_ms: number
}

export interface ExportTransactionRequest {
  rows: Transaction[]
  columns: string[]
}

// Add these new interfaces after the existing ones
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

// New types for Participant
export interface Participant {
  id: number
  ext_id: string
  participant_type: string
  name: string
  container_plugin_name: string
  network_type: string
  active: number // 0 or 1
  display_on_ui: string // "Y" or "N"
  comments: string
}

export interface ParticipantSearchResponse extends ParticipantSearchResponseInterface { }
export interface ParticipantSearchParams extends ParticipantSearchParamsInterface { }

// New types for Container Plugin
export interface ContainerPlugin {
  id: number
  container_id: number
  plugin_id: number
  name: string
  state_startup: number
  port_listen: number
  cnt_instances: number
  in_next_plugin: string
  out_next_plugin: string
  connectto_ipport: string
  comments: string // Added comments field
  queue_threshold: number
  node_type: number
  startup_order: number
  flapping_ignore_time: number
  max_dynamic_instances: number
  dynamic_creation_mode: number
  response_timeout: number
}

export interface ContainerPluginSearchParams {
  profileId: string
  name: string
}

// New types for Participant Duplication
export interface ParticipantDuplicateInfoRequest {
  profileId: string
  container_plugin_name: string
}

export interface ParticipantDuplicateRequest {
  profileId: string
  participant: any
  container_plugins: any[]
  container_plugin_attrs: any[]
  online_configs: any[]
  is_query_downloaded?: boolean // Added new field
}

export interface ParticipantDuplicateResponse {
  success: boolean
  message: string
  participant_id: number
  executed_sqls?: string[] // Added executed_sqls field
}

export interface CreateParticipantRequest {
  profileId: string
  id?: number | string
  ext_id?: string
  participant_type?: string
  name: string
  container_plugin_name?: string
  network_type?: string
  active?: number
  display_on_ui?: string
  comments?: string
}

export interface UpdateParticipantRequest {
  profileId: string
  ext_id?: string
  participant_type?: string
  name?: string
  container_plugin_name?: string
  network_type?: string
  active?: number
  display_on_ui?: string
  comments?: string
}

// New types for Transaction Flow and Insights
export type TransactionFlow = {}

export type TransactionInsight = {}

// New types for Database Comparison
export type ComparisonSetup = {}

export type ComparisonResult = {}

export type ComparisonQueueItem = {}

// Define interfaces for Query and QueryExecution based on API responses
export interface QueryParameter {
  name: string
  type: string
  default: string
  description: string
}

export interface SavedQuery {
  id: number
  name: string
  sql_script: string
  description?: string
  created_at: string
  updated_at: string
  parameters: QueryParameter[]
}

export interface GetQueriesResponse {
  queries: SavedQuery[]
}

export interface ExecuteQueryRequest {
  parameters: Record<string, string>
  profileId: string
}

export interface ExecuteQueryResponse {
  query_id: number
  columns: string[]
  data: any[]
  row_count: number
  executed_sql: string
  parameters_used: string[]
  profile_id: string
  message?: string // For error messages from API
  error_details?: {
    // For detailed error messages
    error_type: string
    error_message: string
    possible_causes: string[]
  }
}

// New types for Raw Query Execution
export interface RawQueryRequest {
  sql_script: string
  profileId: string
}

export interface RawQueryResponse {
  columns: string[]
  data: any[]
  row_count: number
  executed_sql: string
  message?: string // For error messages from API
  error_details?: {
    // For detailed error messages
    error_type: string
    error_message: string
    possible_causes: string[]
  }
}

// New types for Create/Update Query
export interface CreateQueryRequest {
  name: string
  sql_script: string
  description?: string
  parameters?: QueryParameter[]
}

export interface UpdateQueryRequest {
  name?: string
  sql_script?: string
  description?: string
  parameters?: QueryParameter[]
}

// New types for AI Query Generation
export interface AiQueryRequest {
  request: string
  profileId: string
}

export interface AiQueryResponseData {
  Message: string
  Query: string
}

export interface AiQueryResponse {
  success: boolean
  ai_response?: AiQueryResponseData
  user_request?: string
  profile_id?: string
  message?: string // For error messages from API
  error?: string
  error_details?: {
    error_type?: string
    error_message?: string
    possible_causes?: string[]
  }
}

// Gateway API interfaces based on the comprehensive brief
export interface Gateway {
  id: string
  name: string
  bin_count: number
}

export interface BinDetail {
  id: string
  gateway_id: string
  bin_lower: string
  bin_upper: string
  bin_type: number
  country: string
  currency: string
  region: string
  bin_holder_name?: string
  gateway_name?: string
}

export interface GatewaySearchParams {
  connection?: string
  search?: string
  page?: number
  page_size?: number
}

export interface GatewaySearchResponse {
  success: boolean
  data: Gateway[]
  pagination: {
    page: number
    page_size: number
    total_count: number
    total_pages: number
  }
  execution_time: number
  executed_sql?: string
  connection: string
}

export interface BinSearchParams {
  connection?: string
  search?: string
  page?: number
  page_size?: number
  use_range?: boolean
}

export interface BinSearchResponse {
  success: boolean
  data: BinDetail[]
  pagination: {
    page: number
    page_size: number
    total_count: number
    total_pages: number
  }
  execution_time: number
  executed_sql?: string
  gateway_id?: string
  connection: string
}

export interface CreateGatewayRequest {
  connection?: string
  id?: string
  name: string
}

export interface CreateBinRequest {
  connection?: string
  bin_lower: string
  bin_upper: string
  bin_type?: number
  country?: string
  currency?: string
  region?: string
}

export interface UpdateGatewayRequest {
  connection?: string
  name: string
}

export interface UpdateBinRequest {
  connection?: string
  bin_lower?: string
  bin_upper?: string
  bin_type?: number
  country?: string
  currency?: string
  region?: string
  gateway_id?: number
  bin_holder_name?: string // Added missing bin_holder_name field to interface
}

export interface MoveBinsRequest {
  connection?: string
  bin_ids: string[]
  target_gateway_id: number
}

// BIN Routing API
export interface BinRoutingListRequest {
  profileId: string
  page?: number
  page_size?: number
  sort?: string
  acquirer_id?: number | string
  issuer_id?: number | string
  bin?: string
  gateway_id?: number | string
  search?: string
}

export interface BinRoutingListResponse {
  results: BinRouting[]
  total_rows: number
  page: number
  page_size: number
  execution_time: number
  error: string | null
  executed_sql?: string
}

export interface BinRouting {
  id: number
  connection: string
  participant_acq_id: number
  participant_acq_name: string
  bin: string
  gateway_id: number
  gateway_name: string
  priority: number
  participant_iss_id: number
  participant_iss_name: string
  rule: string
  description: string
  created_at: string
  updated_at: string
}

export interface SimpleIdName {
  id: number
  name: string
}

// Generic API call function with JWT authentication
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const fullUrl = `${getBaseUrl()}${endpoint}`
    console.log(`🌐 Making API call to: ${fullUrl}`)
    console.log(`📋 Method: ${options.method || "GET"}`)
    if (options.body) {
      console.log(`📦 Request body:`, JSON.parse(options.body as string))
    }

    // Get JWT token and build headers
    const token = tokenManager.getToken()
    const baseHeaders: HeadersInit = {
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
    }

    // Add Authorization header if token exists
    if (token) {
      baseHeaders.Authorization = `Bearer ${token}`
      console.log("🔐 Added JWT Authorization header")
    }

    // If the caller supplied a body or explicitly asked for another method than GET,
    // we attach the JSON header so the backend knows how to parse it
    const headers: HeadersInit =
      options.body || (options.method && options.method !== "GET")
        ? { ...baseHeaders, "Content-Type": "application/json", ...options.headers }
        : { ...baseHeaders, ...options.headers }

    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      mode: "cors", // Explicitly set CORS mode
      credentials: "omit", // Don't send credentials with JWT
      headers,
    })

    clearTimeout(timeoutId)

    console.log(`📊 API Response status: ${response.status} ${response.statusText}`)
    console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()))

    // Always try to parse JSON if content-type indicates it, even on error responses
    const contentType = response.headers.get("content-type")
    const isJson = contentType && contentType.includes("application/json")
    let data: any = null
    let errorText = ""

    if (isJson) {
      try {
        data = await response.json()
        console.log(`✅ API Response data (or error data):`, data)
      } catch (e) {
        console.error(`❌ Could not parse JSON response`, e)
        errorText = `Could not parse JSON response: ${e instanceof Error ? e.message : String(e)}`
      }
    } else {
      try {
        errorText = await response.text()
        console.error(`❌ Non-JSON Response: ${errorText}`)
      } catch (e) {
        console.error(`❌ Could not read error response text`, e)
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        console.log("🔐 JWT token expired or invalid, removing from storage")
        tokenManager.removeToken()
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
      }

      // Prioritize error message from data if available, otherwise use text or status text
      const finalErrorMessage = data?.error || data?.message || errorText || response.statusText

      return {
        success: false,
        error: `HTTP ${response.status}: ${finalErrorMessage}`,
        data: data, // Return data even if success: false, so error_details can be accessed
      }
    }

    if (!isJson) {
      throw new Error(`Expected JSON response but got ${contentType}`)
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === "AbortError") {
      console.error("⏰ API call timed out")
      return {
        success: false,
        error: `Request timed out after ${API_TIMEOUT}ms`,
      }
    }

    if (error.message.includes("CORS")) {
      console.error("🚫 CORS Error detected")
      return {
        success: false,
        error: "CORS error - please check backend CORS configuration",
      }
    }

    if (error.message.includes("Failed to fetch")) {
      console.error("🌐 Network Error detected")
      return {
        success: false,
        error: "Network error - please check if the API server is running and accessible",
      }
    }

    console.error("❌ API call failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown network error occurred",
    }
  }
}

// Special API call function for file downloads with JWT
async function apiFileDownload(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<Blob>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const fullUrl = `${getBaseUrl()}${endpoint}`
    console.log(`📥 Making file download API call to: ${fullUrl}`)
    console.log(`📋 Method: ${options.method || "GET"}`)

    // Get JWT token and build headers
    const token = tokenManager.getToken()
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...options.headers,
    }

    // Add Authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`
      console.log("🔐 Added JWT Authorization header for file download")
    }

    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      mode: "cors",
      credentials: "omit",
      headers,
    })

    clearTimeout(timeoutId)

    console.log(`📊 File download response status: ${response.status} ${response.statusText}`)
    console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      let errorText = ""
      try {
        errorText = await response.text()
        console.error(`❌ File download error: ${errorText}`)
      } catch (e) {
        console.error(`❌ Could not read error response`)
      }

      // Handle token expiration
      if (response.status === 401) {
        console.log("🔐 JWT token expired during file download")
        tokenManager.removeToken()
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
      }

      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
    }

    // Get the file as a blob
    const blob = await response.blob()
    console.log(`✅ File downloaded successfully, size: ${blob.size} bytes`)

    return {
      success: true,
      data: blob,
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === "AbortError") {
      console.error("⏰ File download timed out")
      return {
        success: false,
        error: `File download timed out after ${API_TIMEOUT}ms`,
      }
    }

    console.error("❌ File download failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown file download error occurred",
    }
  }
}

// API functions
export const rnaApi = {
  // Get available database connection profiles (general profiles for the database page)
  getConnectionProfiles: async (): Promise<ApiResponse<ConnectionProfile[]>> => {
    try {
      console.log("🔍 Fetching general connection profiles...")
      const response = await apiCall<ConnectionProfilesResponse>("/core/connections/profiles")

      if (response.success && response.data) {
        console.log("✅ General connection profiles fetched successfully:", response.data)
        return {
          success: true,
          data: response.data.profiles,
        }
      }

      console.log("⚠️ API response was not successful:", response)
      return response as ApiResponse<ConnectionProfile[]>
    } catch (error) {
      console.error("❌ Error in getConnectionProfiles:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch connection profiles",
      }
    }
  },

  // New: Graylog Configuration API
  getGraylogConfigurations: async (): Promise<
    ApiResponse<{
      configurations: Array<{
        environment: string
        config: {
          BASE_URL: string
          PASSWORD: string
          USERNAME: string
        }
      }>
    }>
  > => {
    console.log("🔍 Fetching Graylog configurations...")
    return apiCall<{
      configurations: Array<{
        environment: string
        config: {
          BASE_URL: string
          PASSWORD: string
          USERNAME: string
        }
      }>
    }>("/graylog/config/configurations")
  },

  // Create a new Graylog configuration
  createGraylogConfiguration: async (config: {
    environment: string
    config: {
      BASE_URL: string
      PASSWORD: string
      USERNAME: string
    }
  }): Promise<ApiResponse<{ message: string }>> => {
    console.log("➕ Creating Graylog configuration:", config.environment)
    return apiCall<{ message: string }>("/graylog/config/configurations", {
      method: "POST",
      body: JSON.stringify(config),
    })
  },

  // Update an existing Graylog configuration
  updateGraylogConfiguration: async (
    originalEnvironment: string,
    config: {
      environment: string
      config: {
        BASE_URL: string
        PASSWORD: string
        USERNAME: string
      }
    },
  ): Promise<ApiResponse<{ message: string }>> => {
    console.log(`✏️ Updating Graylog configuration: ${originalEnvironment}`)
    return apiCall<{ message: string }>(`/graylog/config/configurations/${originalEnvironment}`, {
      method: "PUT",
      body: JSON.stringify(config),
    })
  },

  // Delete a Graylog configuration
  deleteGraylogConfiguration: async (environment: string): Promise<ApiResponse<{ message: string }>> => {
    console.log(`🗑️ Deleting Graylog configuration: ${environment}`)
    return apiCall<{ message: string }>(`/graylog/config/configurations/${environment}`, {
      method: "DELETE",
    })
  },

  // SSH Client APIs
  sshClientServerStatus: async (
    connection_name: string,
    fields: string[] = ["cpu", "memory", "disk", "hostname", "uptime"],
  ): Promise<ApiResponse<any>> => {
    return apiCall("/ssh/client/server-status", {
      method: "POST",
      body: JSON.stringify({ connection_name, fields }),
    })
  },

  sshClientConnectionStatus: async (
    connection_name: string,
  ): Promise<ApiResponse<{ connected: boolean; message?: string }>> => {
    return apiCall(`/ssh/client/connection/status/${encodeURIComponent(connection_name)}`)
  },

  sshClientEstablish: async (
    connection_name: string,
  ): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
    return apiCall("/ssh/client/connection/establish", {
      method: "POST",
      body: JSON.stringify({ connection_name }),
    })
  },

  sshClientExecute: async (
    connection_name: string,
    command: string,
  ): Promise<ApiResponse<{ success: boolean; output?: string; error?: string; exit_code?: number }>> => {
    return apiCall("/ssh/client/execute", {
      method: "POST",
      body: JSON.stringify({ connection_name, command }),
    })
  },

  sshClientCommand: async (
    connection_name: string,
    command: string,
  ): Promise<ApiResponse<{ success: boolean; output?: string; error?: string }>> => {
    return apiCall("/ssh/client/command", {
      method: "POST",
      body: JSON.stringify({ connection: { name: connection_name }, command }),
    })
  },

  sshClientExecuteSnippet: async (
    connection_name: string,
    snippet_id: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      snippet_name?: string
      commands?: string[]
      outputs?: string[]
      error?: string
    }>
  > => {
    return apiCall("/ssh/client/execute-snippet", {
      method: "POST",
      body: JSON.stringify({ connection_name, snippet_id }),
    })
  },

  sshClientClose: async (
    connection_name: string,
  ): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
    return apiCall("/ssh/client/close", {
      method: "POST",
      body: JSON.stringify({ connection_name }),
    })
  },

  sshClientSnippets: async (): Promise<
    ApiResponse<{
      results: Array<{ id: number; name: string; description?: string; commands: string }>
    }>
  > => {
    return apiCall("/ssh/client/snippets")
  },

  sshClientSnippetGet: async (
    snippet_id: number,
  ): Promise<ApiResponse<{ id: number; name: string; description?: string; commands: string }>> => {
    return apiCall(`/ssh/client/snippet/${snippet_id}`)
  },

  sshClientSnippetUpsert: async (
    payload: { id?: number; name: string; description?: string; commands: string },
  ): Promise<ApiResponse<{ success: boolean; id: number }>> => {
    return apiCall("/ssh/client/snippet", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  sshClientSnippetDelete: async (
    snippet_id: number,
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiCall(`/ssh/client/snippet/${snippet_id}`, {
      method: "DELETE",
    })
  },

  // RENJS APIs
  renjsDefaultPath: async (): Promise<
    ApiResponse<{ success: boolean; data: { path: string }; error: string | null }>
  > => {
    return apiCall("/renjs/files/default-path")
  },

  renjsListRoots: async (): Promise<
    ApiResponse<{
      success: boolean
      data: {
        roots: Array<{ name: string; path: string; is_dir: boolean }>
      }
      execution_time?: number
      error: string | null
    }>
  > => {
    return apiCall("/renjs/files/roots")
  },

  renjsListFiles: async (
    path: string,
    pattern?: string,
    options?: { dirs_only?: boolean },
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        path: string
        entries: Array<{
          name: string
          path: string
          is_dir: boolean
          size: number
          modified_at: string
          editable: boolean
        }>
      }
      execution_time?: number
      error: string | null
    }>
  > => {
    return apiCall("/renjs/files/list", {
      method: "POST",
      body: JSON.stringify({
        path,
        pattern: pattern ?? "*",
        dirs_only: options?.dirs_only ?? false,
      }),
    })
  },

  renjsReadFile: async (
    path: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        path: string
        name: string
        content: string
        size: number
        mtime?: number
        modified_at?: string
      }
      execution_time?: number
      error: string | null
    }>
  > => {
    return apiCall("/renjs/files/read", {
      method: "POST",
      body: JSON.stringify({ path }),
    })
  },

  renjsStatFile: async (
    path: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        path: string
        size: number
        mtime: number
        modified_at?: string
      }
      error: string | null
    }>
  > => {
    return apiCall("/renjs/files/stat", {
      method: "POST",
      body: JSON.stringify({ path }),
    })
  },

  renjsWriteFile: async (
    path: string,
    content: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        path: string
        name: string
        size: number
        mtime?: number
        modified_at?: string
      }
      execution_time?: number
      error: string | null
    }>
  > => {
    return apiCall("/renjs/files/write", {
      method: "POST",
      body: JSON.stringify({ path, content }),
    })
  },

  renjsDeleteFile: async (
    path: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        path: string
        name: string
      }
      execution_time?: number
      error: string | null
    }>
  > => {
    return apiCall("/renjs/files/delete", {
      method: "POST",
      body: JSON.stringify({ path }),
    })
  },

  renjsGetAttrs: async (
    profileId: string,
    container_plugin_name: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        plugin: {
          id: number
          name: string
          plugin_id?: number
          container_id?: number
          comments?: string
        }
        attrs: Array<{
          id: number
          container_plugin_id: number
          field: string
          content: string
        }>
      }
      execution_time?: number
      error: string | null
    }>
  > => {
    return apiCall("/renjs/attrs", {
      method: "POST",
      body: JSON.stringify({ profileId, container_plugin_name }),
    })
  },

  renjsListWorkspaces: async (): Promise<
    ApiResponse<{
      success: boolean
      data: {
        workspaces: Array<{
          id: number
          name: string
          path: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }>
      }
      error: string | null
    }>
  > => {
    return apiCall("/renjs/workspaces")
  },

  renjsGetWorkspace: async (
    workspaceId: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        workspace: {
          id: number
          name: string
          path: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      error: string | null
    }>
  > => {
    return apiCall(`/renjs/workspaces/${workspaceId}`)
  },

  renjsSaveWorkspace: async (payload: {
    id?: number
    name: string
    path: string
    description?: string
  }): Promise<
    ApiResponse<{
      success: boolean
      data: {
        id: number
        workspace: {
          id: number
          name: string
          path: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      error: string | null
    }>
  > => {
    return apiCall("/renjs/workspaces", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  renjsDeleteWorkspace: async (
    workspaceId: number,
  ): Promise<ApiResponse<{ success: boolean; data: { id: number }; error: string | null }>> => {
    return apiCall(`/renjs/workspaces/${workspaceId}`, {
      method: "DELETE",
    })
  },

  renjsListScripts: async (
    profileId: string,
    search?: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        scripts: Array<{
          id: number
          group_name: string
          name: string
          checksum?: string
          comment?: string | null
          last_update?: string
        }>
      }
      error: string | null
    }>
  > => {
    return apiCall("/renjs/scripts/list", {
      method: "POST",
      body: JSON.stringify({ profileId, search: search || "" }),
    })
  },

  renjsGetScript: async (
    profileId: string,
    id: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        script: {
          id: number
          group_name: string
          name: string
          content: string
          checksum?: string
          comment?: string | null
          last_update?: string
        }
      }
      error: string | null
    }>
  > => {
    return apiCall("/renjs/scripts/get", {
      method: "POST",
      body: JSON.stringify({ profileId, id }),
    })
  },

  renjsSaveScript: async (payload: {
    profileId: string
    mode: "overwrite" | "new"
    content: string
    id?: number
    group_name?: string
    name?: string
    comment?: string
  }): Promise<
    ApiResponse<{
      success: boolean
      data: {
        mode: string
        script: {
          id: number
          group_name: string
          name: string
          content?: string
          checksum?: string
          comment?: string | null
          last_update?: string
        }
      }
      error: string | null
    }>
  > => {
    return apiCall("/renjs/scripts/save", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  renjsScriptHistory: async (
    profileId: string,
    id: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        history: Array<{
          id: number
          script_id: number
          version?: number
          checksum?: string
          comment?: string | null
          created_at?: string
          content_length?: number
        }>
      }
      error: string | null
    }>
  > => {
    return apiCall("/renjs/scripts/history", {
      method: "POST",
      body: JSON.stringify({ profileId, id }),
    })
  },

  renjsScriptHistoryGet: async (
    profileId: string,
    history_id: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        history: {
          id: number
          script_id: number
          version?: number
          content: string
          checksum?: string
          comment?: string | null
          created_at?: string
        }
      }
      error: string | null
    }>
  > => {
    return apiCall("/renjs/scripts/history/get", {
      method: "POST",
      body: JSON.stringify({ profileId, history_id }),
    })
  },

  renjsScriptHistoryDelete: async (
    profileId: string,
    history_id: number,
  ): Promise<ApiResponse<{ success: boolean; data: { id: number; deleted: number }; error: string | null }>> => {
    return apiCall("/renjs/scripts/history/delete", {
      method: "POST",
      body: JSON.stringify({ profileId, history_id }),
    })
  },

  renjsScriptHistoryClear: async (
    profileId: string,
    id: number,
  ): Promise<
    ApiResponse<{ success: boolean; data: { script_id: number; deleted: number }; error: string | null }>
  > => {
    return apiCall("/renjs/scripts/history/clear", {
      method: "POST",
      body: JSON.stringify({ profileId, id }),
    })
  },

  // GMM XSLT mapping APIs (gmm_xslt_mapping)
  gmmListXslt: async (
    profileId: string,
    search?: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        mappings: Array<{
          id: number
          name: string
          usercomment: string
          hash?: string | null
          last_mod?: string
        }>
      }
      error: string | null
    }>
  > => {
    return apiCall("/gmm/xslt/list", {
      method: "POST",
      body: JSON.stringify({ profileId, search: search || "" }),
    })
  },

  gmmGetXslt: async (
    profileId: string,
    id: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        mapping: {
          id: number
          name: string
          usercomment: string
          content: string
          hash?: string | null
          last_mod?: string
        }
      }
      error: string | null
    }>
  > => {
    return apiCall("/gmm/xslt/get", {
      method: "POST",
      body: JSON.stringify({ profileId, id }),
    })
  },

  gmmSaveXslt: async (payload: {
    profileId: string
    mode: "overwrite" | "new"
    content: string
    id?: number
    name?: string
    usercomment?: string
  }): Promise<
    ApiResponse<{
      success: boolean
      data: {
        mode: string
        mapping: {
          id: number
          name: string
          usercomment: string
          content?: string
          hash?: string | null
          last_mod?: string
        }
      }
      error: string | null
    }>
  > => {
    return apiCall("/gmm/xslt/save", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  gmmXsltHistory: async (
    profileId: string,
    id: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        history: Array<{
          id: number
          mapping_id: number
          version?: number
          hash?: string
          checksum?: string
          usercomment?: string | null
          comment?: string | null
          created_at?: string
          content_length?: number
        }>
      }
      error: string | null
    }>
  > => {
    return apiCall("/gmm/xslt/history", {
      method: "POST",
      body: JSON.stringify({ profileId, id }),
    })
  },

  gmmXsltHistoryGet: async (
    profileId: string,
    history_id: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        history: {
          id: number
          mapping_id: number
          version?: number
          content: string
          hash?: string
          checksum?: string
          usercomment?: string | null
          comment?: string | null
          created_at?: string
        }
      }
      error: string | null
    }>
  > => {
    return apiCall("/gmm/xslt/history/get", {
      method: "POST",
      body: JSON.stringify({ profileId, history_id }),
    })
  },

  gmmXsltHistoryDelete: async (
    profileId: string,
    history_id: number,
  ): Promise<ApiResponse<{ success: boolean; data: { id: number; deleted: number }; error: string | null }>> => {
    return apiCall("/gmm/xslt/history/delete", {
      method: "POST",
      body: JSON.stringify({ profileId, history_id }),
    })
  },

  gmmXsltHistoryClear: async (
    profileId: string,
    id: number,
  ): Promise<
    ApiResponse<{ success: boolean; data: { mapping_id: number; deleted: number }; error: string | null }>
  > => {
    return apiCall("/gmm/xslt/history/clear", {
      method: "POST",
      body: JSON.stringify({ profileId, id }),
    })
  },

  // GMM ISO8583 plugin APIs (gmm_iso8583_plugin)
  gmmListIso8583: async (
    profileId: string,
    search?: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        columns: string[]
        plugins: Array<Record<string, unknown>>
      }
      error: string | null
    }>
  > => {
    return apiCall("/gmm/iso8583/list", {
      method: "POST",
      body: JSON.stringify({ profileId, search: search || "" }),
    })
  },

  // GMM data definition APIs (gmm_data_definition)
  gmmGetDataDefinition: async (
    profileId: string,
    id: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        definition: Record<string, unknown>
      }
      error: string | null
    }>
  > => {
    return apiCall("/gmm/data-definition/get", {
      method: "POST",
      body: JSON.stringify({ profileId, id }),
    })
  },

  gmmUpdateDataDefinition: async (payload: {
    profileId: string
    id: number
    fields: Record<string, unknown>
  }): Promise<
    ApiResponse<{
      success: boolean
      data: {
        definition: Record<string, unknown>
      }
      error: string | null
    }>
  > => {
    return apiCall("/gmm/data-definition/update", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // SSH Log Extractor APIs
  sshExtractorStart: async (
    body: {
      uuid: string
      profileId?: string
      ssh_host?: string
      ssh_username?: string
      ssh_password?: string
      download_dir?: string
      compress_files?: boolean
      force_new?: boolean
      log_date?: string
      connection_timeout?: number
      retry_count?: number
      context_before?: number
      context_after?: number
      log_path_current?: string
      log_path_backup?: string
      file_name_pattern?: string
      verbose_logging?: boolean
      auto_download?: boolean
      timeout_seconds?: number
    },
  ): Promise<ApiResponse<any>> => {
    return apiCall("/ssh/extractor/start", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  sshExtractorStatus: async (
    task_id: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        state: "PENDING" | "SUCCESS" | "FAILURE" | "CANCELED"
        status: string
        progress: number
        files_found: number
        result_files: string[]
        ssh_connection?: string
        log_entries?: string[]
        created_at?: string
        expires_at?: string
        context_before?: number
        context_after?: number
      }
      execution_time: number
      error: string | null
    }>
  > => {
    return apiCall("/ssh/extractor/status", {
      method: "POST",
      body: JSON.stringify({ task_id }),
    })
  },

  sshExtractorTail: async (
    task_id: string,
    from_index: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        entries: string[]
        next_index: number
        status: string
        progress: number
        current_file?: string
        success?: boolean
        error_message?: string | null
      }
      execution_time: number
      error: string | null
    }>
  > => {
    return apiCall("/ssh/extractor/logs/tail", {
      method: "POST",
      body: JSON.stringify({ task_id, from_index }),
    })
  },

  sshExtractorCancel: async (
    task_id: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: { state: "CANCELED"; task_id: string; status: string; progress: number }
      execution_time: number
      error: string | null
    }>
  > => {
    return apiCall("/ssh/extractor/cancel", {
      method: "POST",
      body: JSON.stringify({ task_id }),
    })
  },

  sshExtractorLocalList: async (
    path: string,
    pattern?: string,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: { entries: Array<{ name: string; path: string; is_dir: boolean; size: number; modified_at: string }> }
      execution_time: number
      error: string | null
    }>
  > => {
    return apiCall("/ssh/extractor/local/list", {
      method: "POST",
      body: JSON.stringify({ path, pattern: pattern ?? "*" }),
    })
  },

  sshExtractorLocalRead: async (
    path: string,
    offset_bytes: number = 0,
    max_bytes: number = 1048576,
  ): Promise<
    ApiResponse<{
      success: boolean
      data: {
        path: string
        offset_bytes: number
        read_bytes: number
        total_bytes: number
        content_b64: string
      }
      execution_time: number
      error: string | null
    }>
  > => {
    return apiCall("/ssh/extractor/local/read", {
      method: "POST",
      body: JSON.stringify({ path, offset_bytes, max_bytes }),
    })
  },

  sshExtractorLocalDownload: async (
    filename: string,
    path: string,
  ): Promise<ApiResponse<Blob>> => {
    const params = new URLSearchParams()
    params.append("filename", filename)
    params.append("path", path)
    return apiFileDownload(`/ssh/extractor/local/list/download?${params.toString()}`, {
      method: "GET",
    })
  },

  sshExtractorClearCache: async (): Promise<
    ApiResponse<{
      success: boolean
      data: { cleared_count: number }
      execution_time: number
      error: string | null
    }>
  > => {
    return apiCall("/ssh/extractor/clear-cache", {
      method: "POST",
    })
  },

  // Create a new general database connection profile
  createConnectionProfile: async (profile: ConnectionProfile): Promise<ApiResponse<ConnectionProfile>> => {
    console.log("➕ Creating general connection profile:", profile.name)
    return apiCall<ConnectionProfile>("/core/connections/profiles", {
      method: "POST",
      body: JSON.stringify(profile),
    })
  },

  // Update an existing general database connection profile
  updateConnectionProfile: async (
    originalName: string,
    profile: ConnectionProfile,
  ): Promise<ApiResponse<ConnectionProfile>> => {
    console.log(`✏️ Updating general connection profile: ${originalName}`)
    return apiCall<ConnectionProfile>(`/core/connections/profiles/${originalName}`, {
      method: "PUT",
      body: JSON.stringify(profile),
    })
  },

  // Delete a general database connection profile
  deleteConnectionProfile: async (profileName: string): Promise<ApiResponse<{ message: string }>> => {
    console.log(`🗑️ Deleting general connection profile: ${profileName}`)
    return apiCall<{ message: string }>(`/core/connections/profiles/${profileName}`, {
      method: "DELETE",
    })
  },

  // Test database connection (for RNA transaction optimized profiles)
  testConnection: async (profileId: string): Promise<ApiResponse<{ status: string }>> => {
    console.log(`🧪 Testing connection for RNA profile: ${profileId}`)
    return apiCall<{ status: string }>(`/transactions/profiles/${profileId}/test`, {
      method: "POST",
      body: JSON.stringify({ profileId }),
    })
  },

  // Test generic connection profile (for database management page)
  testConnectionProfile: async (profileName: string): Promise<ApiResponse<{ status: string }>> => {
    console.log(`🧪 Testing generic connection profile: ${profileName}`)
    return apiCall<{ status: string }>("/core/connections/test", {
      method: "POST",
      body: JSON.stringify({ name: profileName }),
    })
  },

  // Search transactions - updated to handle proper pagination
  searchTransactions: async (params: any): Promise<ApiResponse<TransactionSearchResponse>> => {
    console.log("🔍 Searching transactions with params:", params)
    const response = await apiCall<TransactionSearchResponse>("/transactions/", {
      method: "POST",
      body: JSON.stringify(params),
    })

    // Transform the response to include proper pagination info
    if (response.success && response.data) {
      const transformedData = {
        ...response.data,
        transactions: response.data.results || [],
        total: response.data.total_rows || response.data.results?.length || 0,
        totalPages: Math.ceil((response.data.total_rows || 0) / (response.data.page_size || 10)),
        executionTime: Math.round((response.data.execution_time || 0) * 1000), // Convert to ms
        query: response.data.executed_sql || "SQL query executed on backend", // Use executed_sql if available
        currentPage: response.data.page || 1,
        pageSize: response.data.page_size || 10,
      }

      console.log("📊 Transformed pagination data:", {
        total_rows: response.data.total_rows,
        page: response.data.page,
        page_size: response.data.page_size,
        totalPages: transformedData.totalPages,
        resultsCount: transformedData.transactions.length,
      })

      return {
        success: true,
        data: transformedData,
      }
    }

    return response
  },

  // Get transaction details
  getTransactionDetails: async (profileId: string, transactionId: string): Promise<ApiResponse<Transaction>> => {
    console.log(`📋 Getting transaction details: ${transactionId} for profile: ${profileId}`)
    return apiCall<Transaction>(`/transactions/${transactionId}?profileId=${profileId}`)
  },

  // Get transaction attributes
  getTransactionAttributes: async (profileId: string, transactionId: string): Promise<ApiResponse<any[]>> => {
    console.log(`🏷️ Getting transaction attributes: ${transactionId} for profile: ${profileId}`)
    return apiCall<any[]>(`/transactions/${transactionId}/attributes?profileId=${profileId}`)
  },

  // Get transaction endpoint data
  getTransactionEndpoints: async (profileId: string, uuid: string): Promise<ApiResponse<any[]>> => {
    console.log(`🔗 Getting transaction endpoints: ${uuid} for profile: ${profileId}`)
    return apiCall<any[]>(`/transactions/${uuid}/endpoints?profileId=${profileId}`)
  },

  getGrayLogData: async (
    connection: string,
    uuid: string,
  ): Promise<
    ApiResponse<{
      uuid: string
      connection: string
      time_range: {
        from: string
        to: string
        days_back: number
      }
      total_messages: number
      messages: Array<{
        decoration_stats: any
        highlight_ranges: any
        index: string
        message: {
          EventReceivedTime: string
          Plugin: string
          Severity: string
          SourceModuleName: string
          SourceModuleType: string
          _id: string
          facility: string
          full_message: string
          gl2_accounted_message_size: number
          gl2_message_id: string
          gl2_remote_ip: string
          gl2_remote_port: number
          gl2_source_input: string
          gl2_source_node: string
          level: number
          message: string
          source: string
          streams: string[]
          timestamp: string
        }
      }>
      successful_queries: string[]
      search_info: {
        queries_tried: string[]
        successful_queries: string[]
        total_raw_messages: number
        total_unique_messages: number
      }
    }>
  > => {
    console.log(`📊 Getting GrayLog data for UUID: ${uuid} with connection: ${connection}`)
    return apiCall<{
      uuid: string
      connection: string
      time_range: {
        from: string
        to: string
        days_back: number
      }
      total_messages: number
      messages: Array<{
        decoration_stats: any
        highlight_ranges: any
        index: string
        message: {
          EventReceivedTime: string
          Plugin: string
          Severity: string
          SourceModuleName: string
          SourceModuleType: string
          _id: string
          facility: string
          full_message: string
          gl2_accounted_message_size: number
          gl2_message_id: string
          gl2_remote_ip: string
          gl2_remote_port: number
          gl2_source_input: string
          gl2_source_node: string
          level: number
          message: string
          source: string
          streams: string[]
          timestamp: string
        }
      }>
      successful_queries: string[]
      search_info: {
        queries_tried: string[]
        successful_queries: string[]
        total_raw_messages: number
        total_unique_messages: number
      }
    }>("/graylog/data/", {
      method: "POST",
      body: JSON.stringify({
        uuid: uuid,
        connection: connection,
        days_back: 7,
        limit: 100,
      }),
    })
  },

  saveTransactions: async (
    request: SaveTransactionRequest,
  ): Promise<
    ApiResponse<{
      saved_transaction_id: number
      save_name: string
      transactions_count: number
      attributes_count: number
      endpoints_count: number
      graylog_count: number
      graylog_enabled: boolean
    }>
  > => {
    console.log("💾 Saving transactions:", request)
    return apiCall<{
      saved_transaction_id: number
      save_name: string
      transactions_count: number
      attributes_count: number
      endpoints_count: number
      graylog_count: number
      graylog_enabled: boolean
    }>("/transaction/save", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  // Export transactions - Updated to handle file downloads
  exportTransactions: async (
    transactions: Transaction[],
    format: "csv", // Only CSV is supported via API now
  ): Promise<ApiResponse<Blob>> => {
    console.log(`📤 Exporting ${transactions.length} transactions as ${format}`)

    // Prepare the data in the format expected by the API
    const exportData = {
      rows: transactions,
      columns: transactions.length > 0 ? Object.keys(transactions[0]) : [],
    }

    return apiFileDownload(`/transactions/export/${format}`, {
      method: "POST",
      body: JSON.stringify(exportData),
    })
  },

  // Export transactions as HTML
  exportTransactionsHtml: async (requestBody: {
    connection: string
    search: string
    page: number
    page_size: number
    exportAll: boolean
    selectedTransactionIds: string[]
    scenarioData: {
      title: string
      scenarioTesting: string
      expectedResult: string
      actualResult: string
    }
    includeAttributes: boolean
    includeEndpoints: boolean
    includeGrayLog: boolean
    dateStart: string
    dateEnd: string
  }): Promise<ApiResponse<Blob>> => {
    console.log("📤 Exporting transactions as HTML with request body:", requestBody)
    return apiFileDownload("/transaction/export/html", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })
  },

  // Get system status
  getSystemStatus: async (): Promise<
    ApiResponse<{
      status: string
      activeConnections: number
      pendingTransactions: number
      alerts: number
    }>
  > => {
    console.log("📊 Getting system status...")
    return apiCall("/transactions/system/status")
  },

  // Get filter metadata (fields, operators, profiles)
  getFilterMetadata: async (): Promise<
    ApiResponse<{
      filterFields: Array<{ label: string; value: string }>
      filterOperators: Array<{ label: string; value: string }>
      profiles: ConnectionProfile[]
    }>
  > => {
    console.log("🔍 Fetching filter metadata...")
    // GET /transactions/ returns filterFields, filterOperators, and profiles
    return apiCall<{
      filterFields: Array<{ label: string; value: string }>
      filterOperators: Array<{ label: string; value: string }>
      profiles: ConnectionProfile[]
    }>("/transactions/", {
      method: "GET",
    })
  },

  // Database Tools API methods
  getSourceTables: async (profile: string): Promise<ApiResponse<{ tables: string[] }>> => {
    console.log(`📋 Getting tables for profile: ${profile}`)
    return apiCall<{ tables: string[] }>("/table/get_source_tables", {
      method: "POST",
      body: JSON.stringify({ profile }),
    })
  },

  getTableColumns: async (
    profile: string,
    table: string,
  ): Promise<
    ApiResponse<{
      table_name: string
      profile: string
      columns: string[]
      primary_keys: string[]
      unique_indexes: Record<string, any>
      column_details: Array<{
        Field: string
        Type: string
        Key: string
        Null: string
        Default: any
        Extra: string
      }>
    }>
  > => {
    console.log(`📋 Getting columns for table: ${table} in profile: ${profile}`)
    return apiCall<{
      table_name: string
      profile: string
      columns: string[]
      primary_keys: string[]
      unique_indexes: Record<string, any>
      column_details: Array<{
        Field: string
        Type: string
        Key: string
        Null: string
        Default: any
        Extra: string
      }>
    }>("/tables/get_table_columns", {
      method: "POST",
      body: JSON.stringify({ profile, table_name: table }),
    })
  },

  compareTables: async (request: TableComparisonRequest): Promise<ApiResponse<TableComparisonResponse>> => {
    console.log("🔍 Comparing tables:", request)
    return apiCall<TableComparisonResponse>("/tables/compare_tables", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  exportCompareResults: async (results: any[], format: "csv" | "excel"): Promise<ApiResponse<Blob>> => {
    console.log(`📤 Exporting comparison results as ${format}`)
    return apiFileDownload(`/core/tables/export_compare_results`, {
      method: "POST",
      body: JSON.stringify({ results, format }),
    })
  },

  // New: Get Participants
  getParticipants: async (params: ParticipantSearchParams): Promise<ApiResponse<ParticipantSearchResponse>> => {
    console.log("👥 Fetching participants with params:", params)
    const body: Record<string, unknown> = {
      profileId: params.profileId,
      page: params.page,
      page_size: params.page_size,
    }
    if (params.search) body.search = params.search
    if (params.column_filters && Object.keys(params.column_filters).length > 0) {
      body.column_filters = params.column_filters
    }
    if (params.filters && params.filters.length > 0) {
      body.filters = params.filters
    }
    const response = await apiCall<ParticipantSearchResponse>("/participant", {
      method: "POST",
      body: JSON.stringify(body),
    })

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          results: response.data.results || [],
          total_rows: response.data.total_rows || 0,
          page: response.data.page || params.page,
          page_size: response.data.page_size,
          execution_time: response.data.execution_time,
          error: response.data.error,
          executed_sql: response.data.executed_sql, // Ensure executed_sql is passed
        },
      }
    }
    return response
  },

  // New: Get Container Plugin Details
  getContainerPluginDetails: async (params: ContainerPluginSearchParams): Promise<ApiResponse<ContainerPlugin[]>> => {
    console.log("🔌 Fetching container plugin details with params:", params)
    const response = await apiCall<ContainerPlugin[]>("/participant/containerPlugin", {
      method: "POST",
      body: JSON.stringify({
        profileId: params.profileId,
        name: params.name,
      }),
    })

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
      }
    }
    return response
  },

  getContainerPluginFilterMeta: async (): Promise<
    ApiResponse<{
      filterFields: Array<{ label: string; value: string; table?: string }>
      filterOperators: Array<{ label: string; value: string }>
    }>
  > => {
    return apiCall("/participant/containerPlugin/meta", {
      method: "GET",
    })
  },

  listContainerPluginNames: async (params: {
    profileId: string
  }): Promise<
    ApiResponse<{
      success: boolean
      data: string[]
      error?: string | null
    }>
  > => {
    return apiCall("/participant/containerPlugin/names", {
      method: "POST",
      body: JSON.stringify(params),
    })
  },

  searchContainerPlugins: async (params: {
    profileId: string
    page?: number
    page_size?: number
    search?: string
    filters?: Array<{ field: string; operator: string; value: string }>
  }): Promise<
    ApiResponse<{
      success: boolean
      data: ContainerPlugin[]
      total_rows: number
      page: number
      page_size: number
      execution_time?: number
      filterFields?: Array<{ label: string; value: string; table?: string }>
      filterOperators?: Array<{ label: string; value: string }>
      error?: string | null
    }>
  > => {
    return apiCall("/participant/containerPlugin/search", {
      method: "POST",
      body: JSON.stringify(params),
    })
  },

  getContainerPluginDetailById: async (params: {
    profileId: string
    id?: number | string
    name?: string
    filters?: Array<{ field: string; operator: string; value: string }>
  }): Promise<
    ApiResponse<{
      success: boolean
      data: {
        plugin: ContainerPlugin
        attrs: Array<{
          id: number
          container_plugin_id: number
          field: string
          content: string
        }>
        filtered_attrs: Array<{
          id: number
          container_plugin_id: number
          field: string
          content: string
        }>
      }
      execution_time?: number
      error?: string | null
    }>
  > => {
    return apiCall("/participant/containerPlugin/detail", {
      method: "POST",
      body: JSON.stringify(params),
    })
  },

  updateContainerPlugin: async (
    pluginId: number | string,
    payload: {
      profileId: string
      [key: string]: unknown
      attrs?: Array<{
        id?: number
        field?: string
        content?: string
        _delete?: boolean
      }>
    },
  ): Promise<
    ApiResponse<{
      success: boolean
      message?: string
      data: {
        plugin: ContainerPlugin
        attrs: Array<{
          id: number
          container_plugin_id: number
          field: string
          content: string
        }>
      }
      error?: string
    }>
  > => {
    return apiCall(`/participant/containerPlugin/${pluginId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  getPluginTableDetail: async (params: {
    profileId: string
    id: number | string
  }): Promise<
    ApiResponse<{
      success: boolean
      data: Record<string, unknown>
      error?: string | null
    }>
  > => {
    return apiCall("/participant/plugin/detail", {
      method: "POST",
      body: JSON.stringify(params),
    })
  },

  updatePluginTableRow: async (
    pluginId: number | string,
    payload: { profileId: string; [key: string]: unknown },
  ): Promise<
    ApiResponse<{
      success: boolean
      message?: string
      data: Record<string, unknown>
      error?: string
    }>
  > => {
    return apiCall(`/participant/plugin/${pluginId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  getParticipantByContainerPluginName: async (params: {
    profileId: string
    container_plugin_name: string
  }): Promise<
    ApiResponse<{
      success: boolean
      data: Participant[]
      total_rows?: number
      error?: string | null
    }>
  > => {
    return apiCall("/participant/by-container-plugin", {
      method: "POST",
      body: JSON.stringify(params),
    })
  },

  // New: Participant Duplication methods
  getParticipantDuplicateInfo: async (params: ParticipantDuplicateInfoRequest): Promise<ApiResponse<any>> => {
    console.log("🔍 Fetching participant duplicate info with params:", params)
    return apiCall<any>("/participant/duplicate-info", {
      method: "POST",
      body: JSON.stringify(params),
    })
  },

  duplicateParticipant: async (request: ParticipantDuplicateRequest): Promise<ApiResponse<any>> => {
    console.log("🔄 Duplicating participant with request:", request)
    return apiCall<any>("/participant/duplicate", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  createParticipant: async (
    request: CreateParticipantRequest,
  ): Promise<ApiResponse<{ success: boolean; message: string; data: Participant }>> => {
    console.log("➕ Creating participant:", request.name)
    return apiCall<{ success: boolean; message: string; data: Participant }>("/participant/new", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  getParticipant: async (
    participantId: number | string,
    profileId: string,
  ): Promise<ApiResponse<{ success: boolean; data: Participant }>> => {
    console.log(`👥 Getting participant: ${participantId}`)
    const params = new URLSearchParams({ profileId })
    return apiCall<{ success: boolean; data: Participant }>(
      `/participant/${participantId}?${params.toString()}`,
    )
  },

  updateParticipant: async (
    participantId: number | string,
    request: UpdateParticipantRequest,
  ): Promise<ApiResponse<{ success: boolean; message: string; data: Participant }>> => {
    console.log(`✏️ Updating participant: ${participantId}`)
    return apiCall<{ success: boolean; message: string; data: Participant }>(`/participant/${participantId}`, {
      method: "PUT",
      body: JSON.stringify(request),
    })
  },

  deleteParticipant: async (
    participantId: number | string,
    profileId: string,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    console.log(`🗑️ Deleting participant: ${participantId}`)
    return apiCall<{ success: boolean; message: string }>(`/participant/${participantId}`, {
      method: "DELETE",
      body: JSON.stringify({ profileId }),
    })
  },

  // Placeholder for Transaction Insights API (if backend provides aggregated data)
  // For now, aggregation will be done client-side from searchTransactions
  getTransactionsInsights: async (params: {
    connectionId: string
    dateStart: string
    dateEnd: string
    filters?: TransactionFilter[]
  }): Promise<ApiResponse<any>> => {
    console.log("📊 Fetching transaction insights (placeholder, client-side aggregation assumed):", params)
    // In a real scenario, this would call a backend endpoint that returns aggregated data
    // For now, we'll just return a success response, and the insights component will use the raw transaction data
    return { success: true, data: {} }
  },

  // New: Transaction Flow API
  getTransactionFlow: async (id: string): Promise<ApiResponse<TransactionFlow[]>> => {
    console.log(`📋 Getting transaction flow: ${id}`)
    return apiCall<TransactionFlow[]>(`/transactions/${id}/flow`)
  },

  // New: Database Comparison API methods
  getComparisonQueue: async (): Promise<ApiResponse<ComparisonQueueItem[]>> => {
    console.log("🔍 Fetching comparison queue...")
    return apiCall<ComparisonQueueItem[]>("/database/compare/queue")
  },

  startComparison: async (setup: ComparisonSetup): Promise<ApiResponse<ComparisonQueueItem>> => {
    console.log("🔍 Starting comparison with setup:", setup)
    return apiCall<ComparisonQueueItem>("/database/compare/start", {
      method: "POST",
      body: JSON.stringify(setup),
    })
  },

  getComparisonResults: async (id: string): Promise<ApiResponse<ComparisonResult[]>> => {
    console.log(`🔍 Fetching comparison results for ID: ${id}`)
    return apiCall<ComparisonResult[]>(`/database/compare/${id}/results`)
  },
  // New: Graylog Rules API methods for CRUD operations
  // Get all graylog rules
  getGraylogRules: async (
    showInactive = true,
  ): Promise<
    ApiResponse<{
      success: boolean
      rules: Array<{
        id: number
        key_word: string
        action: string
        active: number
        rules_mode: string
        enable_link: number
        url: string
        extra_attributes: string
      }>
    }>
  > => {
    console.log("🎨 Fetching graylog rules...")
    const params = new URLSearchParams()
    if (!showInactive) params.append("show_inactive", "false")

    return apiCall<{
      success: boolean
      rules: Array<{
        id: number
        key_word: string
        action: string
        active: number
        rules_mode: string
        enable_link: number
        url: string
        extra_attributes: string
      }>
    }>(`/graylog/rules/?${params.toString()}`)
  },

  // Create new graylog rule
  createGraylogRule: async (rule: {
    key_word: string
    action: string
    active?: boolean
    rules_mode?: string
    enable_link?: boolean
    url?: string
    extra_attributes?: string
  }): Promise<
    ApiResponse<{
      success: boolean
      message: string
      rule: {
        id: number
        key_word: string
        action: string
        active: boolean
        rules_mode: string
        enable_link: boolean
        url: string
        extra_attributes: string
      }
    }>
  > => {
    console.log("➕ Creating graylog rule:", rule.key_word)
    return apiCall<{
      success: boolean
      message: string
      rule: {
        id: number
        key_word: string
        action: string
        active: boolean
        rules_mode: string
        enable_link: boolean
        url: string
        extra_attributes: string
      }
    }>("/graylog/rules/", {
      method: "POST",
      body: JSON.stringify(rule),
    })
  },

  // Update graylog rule
  updateGraylogRule: async (
    ruleId: number,
    rule: {
      key_word?: string
      action?: string
      active?: boolean
      rules_mode?: string
      enable_link?: boolean
      url?: string
      extra_attributes?: string
    },
  ): Promise<
    ApiResponse<{
      success: boolean
      message: string
      rule: {
        id: number
        key_word: string
        action: string
        active: number
        rules_mode: string
        enable_link: number
        url: string
        extra_attributes: string
      }
    }>
  > => {
    console.log(`✏️ Updating graylog rule: ${ruleId}`)
    return apiCall<{
      success: boolean
      message: string
      rule: {
        id: number
        key_word: string
        action: string
        active: number
        rules_mode: string
        enable_link: number
        url: string
        extra_attributes: string
      }
    }>(`/graylog/rules/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify(rule),
    })
  },

  // Delete graylog rule
  deleteGraylogRule: async (
    ruleId: number,
  ): Promise<
    ApiResponse<{
      success: boolean
      message: string
      rule: {
        id: number
        key_word: string
        action: string
        active: number
        rules_mode: string
        enable_link: number
        url: string
        extra_attributes: string
      }
    }>
  > => {
    console.log(`🗑️ Deleting graylog rule: ${ruleId}`)
    return apiCall<{
      success: boolean
      message: string
      rule: {
        id: number
        key_word: string
        action: string
        active: number
        rules_mode: string
        enable_link: number
        url: string
        extra_attributes: string
      }
    }>(`/graylog/rules/${ruleId}`, {
      method: "DELETE",
    })
  },

  // Test graylog rule pattern
  testGraylogRule: async (pattern: {
    key_word: string
    test_text: string
  }): Promise<
    ApiResponse<{
      success: boolean
      pattern: string
      test_text: string
      is_match: boolean
      matches: string[]
      match_count: number
    }>
  > => {
    console.log("🧪 Testing graylog rule pattern:", pattern.key_word)
    return apiCall<{
      success: boolean
      pattern: string
      test_text: string
      is_match: boolean
      matches: string[]
      match_count: number
    }>("/graylog/rules/test", {
      method: "POST",
      body: JSON.stringify(pattern),
    })
  },

  // Bulk update graylog rules
  bulkUpdateGraylogRules: async (
    rules: Array<{
      id: number
      active?: boolean
      action?: string
      key_word?: string
      rules_mode?: string
      enable_link?: boolean
      url?: string
      extra_attributes?: string
    }>,
  ): Promise<
    ApiResponse<{
      success: boolean
      message: string
      updated_count: number
      errors: any
    }>
  > => {
    console.log(`🔄 Bulk updating ${rules.length} graylog rules`)
    return apiCall<{
      success: boolean
      message: string
      updated_count: number
      errors: any
    }>("/graylog/rules/bulk-update", {
      method: "POST",
      body: JSON.stringify({ rules }),
    })
  },

  // Initialize default graylog rules
  initDefaultGraylogRules: async (): Promise<
    ApiResponse<{
      success: boolean
      message: string
    }>
  > => {
    console.log("🎯 Initializing default graylog rules")
    return apiCall<{
      success: boolean
      message: string
    }>("/graylog/rules/init-defaults", {
      method: "POST",
    })
  },

  searchRedmine: async (
    issueIds: string[],
  ): Promise<
    ApiResponse<{
      success: boolean
      search_type: string
      data: {
        found: Array<{
          issue_number: string
          title: string
          description: string
          status: string
          priority: string
          assignee: string
          created_date: string
          url: string
        }>
        not_found: any[]
        total_requested: number
        total_found: number
        total_not_found: number
      }
    }>
  > => {
    console.log("🔍 Searching Redmine issues:", issueIds)
    return apiCall<{
      success: boolean
      search_type: string
      data: {
        found: Array<{
          issue_number: string
          title: string
          description: string
          status: string
          priority: string
          assignee: string
          created_date: string
          url: string
        }>
        not_found: any[]
        total_requested: number
        total_found: number
        total_not_found: number
      }
    }>("/redmine/search", {
      method: "POST",
      body: JSON.stringify({ issue_ids: issueIds }),
    })
  },

  // BIN Routing API methods
  listBinRoutes: async (req: BinRoutingListRequest): Promise<ApiResponse<BinRoutingListResponse>> => {
    return apiCall<BinRoutingListResponse>("/bin-routing/routes/list", {
      method: "POST",
      body: JSON.stringify({
        profileId: req.profileId,
        page: req.page || 1,
        page_size: req.page_size || 20,
        sort: req.sort || "desc",
        ...(req.acquirer_id && { acquirer_id: Number(req.acquirer_id) }),
        ...(req.issuer_id && { issuer_id: Number(req.issuer_id) }),
        ...(req.bin && { bin: req.bin }),
        ...(req.gateway_id && { gateway_id: Number(req.gateway_id) }),
        ...(req.search && { search: req.search }),
      }),
    })
  },

  getBinAcquirers: async (profileId: string): Promise<ApiResponse<{ results: SimpleIdName[] }>> => {
    // Try POST /list (pattern-aligned)
    const postResp = await apiCall<{ results?: SimpleIdName[]; acquirers?: SimpleIdName[]; success?: boolean }>(
      "/bin-routing/acquirers/list",
      { method: "POST", body: JSON.stringify({ profileId }) },
    )

    if (postResp.success && postResp.data) {
      const results = postResp.data.results ?? postResp.data.acquirers ?? []
      if (Array.isArray(results) && results.length > 0) {
        return { success: true, data: { results } }
      }
    }

    // Fallback to GET shape: { success, acquirers }
    const getResp = await apiCall<{ success?: boolean; acquirers?: SimpleIdName[] }>(
      `/bin-routing/acquirers?connection=${encodeURIComponent(profileId)}`,
      { method: "GET" },
    )

    if (getResp.success && getResp.data) {
      return { success: true, data: { results: getResp.data.acquirers ?? [] } }
    }

    return {
      success: false,
      error: postResp.error || getResp.error || "Failed to fetch acquirers",
    }
  },

  getBinGateways: async (profileId: string): Promise<ApiResponse<{ results: SimpleIdName[] }>> => {
    // Try POST /list (pattern-aligned)
    const postResp = await apiCall<{ results?: SimpleIdName[]; gateways?: SimpleIdName[]; success?: boolean }>(
      "/bin-routing/gateways/list",
      { method: "POST", body: JSON.stringify({ profileId }) },
    )

    if (postResp.success && postResp.data) {
      const results = postResp.data.results ?? postResp.data.gateways ?? []
      if (Array.isArray(results) && results.length > 0) {
        return { success: true, data: { results } }
      }
    }

    // Fallback to GET shape: { success, gateways }
    const getResp = await apiCall<{ success?: boolean; gateways?: SimpleIdName[] }>(
      `/bin-routing/gateways?connection=${encodeURIComponent(profileId)}`,
      { method: "GET" },
    )

    if (getResp.success && getResp.data) {
      return { success: true, data: { results: getResp.data.gateways ?? [] } }
    }

    return {
      success: false,
      error: postResp.error || getResp.error || "Failed to fetch gateways",
    }
  },

  createBinRoute: async (payload: {
    connection: string
    participant_acq_id: number
    bin: string
    gateway_id: number
    priority: number
    participant_iss_id: number
    rule: string
    description?: string
    container_plugin_name?: string
    type?: string
    country?: string
    currency?: string
    region?: string
  }): Promise<ApiResponse<{ success: boolean; message: string; query?: string; execution_time?: number }>> => {
    return apiCall("/bin-routing/routes", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  updateBinRoute: async (
    routeId: number,
    payload: {
      connection: string
      priority?: number
      gateway_id?: number
      participant_iss_id?: number
      participant_acq_id?: number
      rule?: string
      description?: string
    },
  ): Promise<ApiResponse<{ success: boolean; message: string; updated_fields?: any }>> => {
    return apiCall(`/bin-routing/routes/${routeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  deleteBinRoute: async (
    routeId: number,
    connection: string,
  ): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
    return apiCall(`/bin-routing/routes/${routeId}`, {
      method: "DELETE",
      body: JSON.stringify({ connection }),
    })
  },

  updateGatewayForBinDetails: async (payload: {
    connection: string
    gateway_id: number
    bin_details_id: number
  }): Promise<ApiResponse<{ success: boolean; message: string; updated_fields?: any }>> => {
    return apiCall("/bin-routing/routes/gateway-update", {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  exportBinRoutes: async (params: {
    connection: string
    acquirer_id?: number | string
    issuer_id?: number | string
    bin?: string
    gateway_id?: number | string
    search?: string
  }): Promise<ApiResponse<Blob>> => {
    const q = new URLSearchParams()
    q.append("connection", params.connection)
    if (params.acquirer_id) q.append("acquirer_id", String(params.acquirer_id))
    if (params.issuer_id) q.append("issuer_id", String(params.issuer_id))
    if (params.bin) q.append("bin", params.bin)
    if (params.gateway_id) q.append("gateway_id", String(params.gateway_id))
    if (params.search) q.append("search", params.search)
    return apiFileDownload(`/bin-routing/export?${q.toString()}`, { method: "GET" })
  },

  // New simulation endpoints for routes and BIN gateway validation
  getSimulationRoutes: async (params: {
    connection: string
    acquirer_id?: number | string
    issuer_id?: number | string
    bin?: string
    gateway_id?: number | string
    search?: string
    page?: number
    pageSize?: number
  }): Promise<
    ApiResponse<{
      success: boolean
      routes: any[]
      total?: number
      pagination?: { current: number; total: number; pageSize: number }
      query?: string
    }>
  > => {
    const q = new URLSearchParams()
    q.append("connection", params.connection)
    if (params.acquirer_id) q.append("acquirer_id", String(params.acquirer_id))
    if (params.issuer_id) q.append("issuer_id", String(params.issuer_id))
    if (params.bin) q.append("bin", params.bin)
    if (params.gateway_id) q.append("gateway_id", String(params.gateway_id))
    if (params.search) q.append("search", params.search)
    q.append("page", String(params.page ?? 1))
    q.append("pageSize", String(params.pageSize ?? 20))

    return apiCall(`/bin-routing/routes/simulation?${q.toString()}`, { method: "GET" })
  },

  getBinGatewaysByPrefix: async (payload: {
    profileId: string
    pan_prefix: string
    country?: number
  }): Promise<
    ApiResponse<{
      results: Array<{ id: number | string; name?: string }>
      total_rows?: number
      page?: number
      page_size?: number
      execution_time?: number
      executed_sql?: string
      error?: string | null
    }>
  > => {
    return apiCall("/bin-routing/gateways/list", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // New: Get All Queries
  getQueries: async (): Promise<ApiResponse<SavedQuery[]>> => {
    try {
      const response = await apiCall<{ queries: SavedQuery[] }>("/queries")
      if (response.success && response.data) {
        return { success: true, data: response.data.queries }
      }
      return { success: false, error: response.error || response.data?.message || "Failed to fetch queries" }
    } catch (error) {
      console.error("Error fetching queries:", error)
      return { success: false, error: error instanceof Error ? error.message : "Network error" }
    }
  },

  // New: Execute Saved Query
  executeSavedQuery: async (
    queryId: number,
    request: ExecuteQueryRequest,
  ): Promise<ApiResponse<ExecuteQueryResponse>> => {
    const response = await apiCall<ExecuteQueryResponse>(`/queries/${queryId}/execute`, {
      method: "POST",
      body: JSON.stringify(request),
    })
    return response
  },

  // New: Execute Raw Query (for sandbox mode)
  executeRawQuery: async (request: RawQueryRequest): Promise<ApiResponse<RawQueryResponse>> => {
    const response = await apiCall<RawQueryResponse>(`/queries/execute-raw`, {
      method: "POST",
      body: JSON.stringify(request),
    })
    return response
  },

  // New: Create Query
  createQuery: async (queryData: CreateQueryRequest): Promise<ApiResponse<SavedQuery>> => {
    console.log("➕ Creating query:", queryData.name)
    return apiCall<SavedQuery>("/queries", {
      method: "POST",
      body: JSON.stringify(queryData),
    })
  },

  // New: Update Query
  updateQuery: async (queryId: number, queryData: UpdateQueryRequest): Promise<ApiResponse<SavedQuery>> => {
    console.log(`✏️ Updating query: ${queryId}`)
    return apiCall<SavedQuery>(`/queries/${queryId}`, {
      method: "PUT",
      body: JSON.stringify(queryData),
    })
  },

  // New: Delete Query
  deleteQuery: async (queryId: number): Promise<ApiResponse<{ message: string }>> => {
    console.log(`🗑️ Deleting query: ${queryId}`)
    return apiCall<{ message: string }>(`/queries/${queryId}`, {
      method: "DELETE",
    })
  },

  // New: Generate SQL from AI
  generateSqlFromAi: async (request: AiQueryRequest): Promise<ApiResponse<AiQueryResponse>> => {
    console.log("🧠 Requesting SQL generation from AI:", request)
    return apiCall<AiQueryResponse>("/queries/ai", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  // Gateway Management API methods
  getGateways: async (params: GatewaySearchParams = {}): Promise<ApiResponse<GatewaySearchResponse>> => {
    console.log("🏛️ Fetching gateways with params:", params)
    return apiCall<GatewaySearchResponse>("/gateway/", {
      method: "POST",
      body: JSON.stringify({
        connection: params.connection || "LOKAL",
        search: params.search || "",
        page: params.page || 1,
        page_size: params.page_size || 20,
      }),
    })
  },

  createGateway: async (
    request: CreateGatewayRequest,
  ): Promise<ApiResponse<{ success: boolean; message: string; data: Gateway }>> => {
    console.log("➕ Creating gateway:", request.name)
    return apiCall<{ success: boolean; message: string; data: Gateway }>("/gateway/new", {
      method: "POST",
      body: JSON.stringify({
        connection: request.connection || "LOKAL",
        name: request.name,
        ...(request.id && { id: request.id }),
      }),
    })
  },

  getGateway: async (
    gatewayId: string,
    connection?: string,
  ): Promise<ApiResponse<{ success: boolean; data: Gateway }>> => {
    console.log(`🏛️ Getting gateway: ${gatewayId}`)
    const params = new URLSearchParams()
    if (connection) params.append("connection", connection)

    return apiCall<{ success: boolean; data: Gateway }>(`/gateway/${gatewayId}?${params.toString()}`)
  },

  updateGateway: async (
    gatewayId: string,
    request: UpdateGatewayRequest,
  ): Promise<ApiResponse<{ success: boolean; message: string; data: Gateway }>> => {
    console.log(`✏️ Updating gateway: ${gatewayId}`)
    return apiCall<{ success: boolean; message: string; data: Gateway }>(`/gateway/${gatewayId}`, {
      method: "PUT",
      body: JSON.stringify({
        connection: request.connection || "LOKAL",
        name: request.name,
      }),
    })
  },

  deleteGateway: async (
    gatewayId: string,
    connection?: string,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    console.log(`🗑️ Deleting gateway: ${gatewayId}`)
    return apiCall<{ success: boolean; message: string }>(`/gateway/${gatewayId}`, {
      method: "DELETE",
      body: JSON.stringify({
        connection: connection || "LOKAL",
      }),
    })
  },

  // BIN Management API methods
  getGatewayBins: async (gatewayId: string, params: BinSearchParams = {}): Promise<ApiResponse<BinSearchResponse>> => {
    console.log(`🔢 Fetching BINs for gateway: ${gatewayId}`)
    return apiCall<BinSearchResponse>(`/gateway/${gatewayId}/bins`, {
      method: "POST",
      body: JSON.stringify({
        connection: params.connection || "LOKAL",
        search: params.search || "",
        page: params.page || 1,
        page_size: params.page_size || 20,
      }),
    })
  },

  createBin: async (
    gatewayId: string,
    request: CreateBinRequest,
  ): Promise<ApiResponse<{ success: boolean; message: string; data: BinDetail }>> => {
    console.log(`➕ Creating BIN for gateway: ${gatewayId}`)
    return apiCall<{ success: boolean; message: string; data: BinDetail }>(`/gateway/${gatewayId}/bins/new`, {
      method: "POST",
      body: JSON.stringify({
        connection: request.connection || "LOKAL",
        bin_lower: request.bin_lower,
        bin_upper: request.bin_upper,
        bin_type: request.bin_type || 1,
        country: request.country || "360",
        currency: request.currency || "360",
        region: request.region || "B",
      }),
    })
  },

  getBin: async (binId: string, connection?: string): Promise<ApiResponse<{ success: boolean; data: BinDetail }>> => {
    console.log(`🔢 Getting BIN: ${binId}`)
    const params = new URLSearchParams()
    if (connection) params.append("connection", connection)

    return apiCall<{ success: boolean; data: BinDetail }>(`/gateway/bins/${binId}?${params.toString()}`)
  },

  updateBin: async (
    binId: string,
    request: UpdateBinRequest,
  ): Promise<ApiResponse<{ success: boolean; message: string; data: BinDetail }>> => {
    console.log(`✏️ Updating BIN: ${binId}`, request)

    const updateData: any = {
      connection: request.connection || "LOKAL",
    }

    // Only include fields that are explicitly provided (not undefined)
    if (request.bin_lower !== undefined) updateData.bin_lower = request.bin_lower
    if (request.bin_upper !== undefined) updateData.bin_upper = request.bin_upper
    if (request.bin_type !== undefined) updateData.bin_type = request.bin_type
    if (request.country !== undefined) updateData.country = request.country
    if (request.currency !== undefined) updateData.currency = request.currency
    if (request.region !== undefined) updateData.region = request.region
    if (request.gateway_id !== undefined) updateData.gateway_id = request.gateway_id
    if (request.bin_holder_name !== undefined) updateData.bin_holder_name = request.bin_holder_name

    console.log(`✏️ Update payload:`, updateData)

    return apiCall<{ success: boolean; message: string; data: BinDetail }>(`/gateway/bins/${binId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    })
  },

  deleteBin: async (
    binId: string,
    connection?: string,
    keepBinHolderName?: boolean,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    console.log(`🗑️ Deleting BIN: ${binId}`)
    return apiCall<{ success: boolean; message: string }>(`/gateway/bins/${binId}`, {
      method: "DELETE",
      body: JSON.stringify({
        connection: connection || "LOKAL",
        keep_bin_holder_name: keepBinHolderName !== undefined ? keepBinHolderName : true,
      }),
    })
  },

  // Search and Utility API methods
  searchBins: async (params: BinSearchParams = {}): Promise<ApiResponse<BinSearchResponse>> => {
    console.log("🔍 Searching BINs across all gateways")
    return apiCall<BinSearchResponse>("/gateway/search", {
      method: "POST",
      body: JSON.stringify({
        connection: params.connection || "LOKAL",
        search: params.search || "",
        use_range: params.use_range || false,
        page: params.page || 1,
        page_size: params.page_size || 20,
      }),
    })
  },

  moveBins: async (
    request: MoveBinsRequest,
  ): Promise<ApiResponse<{ success: boolean; message: string; moved_count: number; target_gateway_id: number }>> => {
    console.log(`🔄 Moving ${request.bin_ids.length} BINs to gateway: ${request.target_gateway_id}`)
    return apiCall<{ success: boolean; message: string; moved_count: number; target_gateway_id: number }>(
      "/gateway/bins/move",
      {
        method: "POST",
        body: JSON.stringify({
          connection: request.connection || "LOKAL",
          bin_ids: request.bin_ids,
          target_gateway_id: request.target_gateway_id,
        }),
      },
    )
  },

  // Get saved transactions
  getSavedTransactions: async (): Promise<ApiResponse<SavedTransactionSimple[]>> => {
    console.log("📋 Fetching saved transactions...")
    return apiCall<SavedTransactionSimple[]>("/transaction/save/simple", {
      method: "GET",
    })
  },

  // Get details of a specific saved transaction including its transaction data
  getSavedTransactionDetails: async (
    savedTransactionId: string,
  ): Promise<ApiResponse<SavedTransactionDetailsResponse>> => {
    console.log(`📋 Fetching saved transaction details for ID: ${savedTransactionId}`)
    return apiCall<SavedTransactionDetailsResponse>(`/transaction/save/${savedTransactionId}`, {
      method: "GET",
    })
  },

  // Delete a saved transaction
  deleteSavedTransaction: async (savedId: string): Promise<ApiResponse<{ message: string }>> => {
    console.log(`🗑️ Deleting saved transaction: ${savedId}`)
    return apiCall<{ message: string }>(`/transaction/save/${savedId}`, {
      method: "DELETE",
    })
  },

  // Network Message API functions
  // Get all packets
  getAllPackets: async (): Promise<ApiResponse<{ data: NetworkPacket[]; count: number }>> => {
    console.log("📦 Fetching all network packets...")
    return apiCall<{ data: NetworkPacket[]; count: number }>("/network-message", {
      method: "GET",
    })
  },

  // Get packet by ID
  getPacketById: async (id: number): Promise<ApiResponse<{ data: NetworkPacket }>> => {
    console.log(`📦 Fetching network packet ${id}...`)
    return apiCall<{ data: NetworkPacket }>(`/network-message/${id}`, {
      method: "GET",
    })
  },

  // Create a new packet
  createPacket: async (packet: CreatePacketRequest): Promise<ApiResponse<{ success: boolean; message: string; packet_id: number }>> => {
    console.log("➕ Creating new network packet...")
    return apiCall<{ success: boolean; message: string; packet_id: number }>("/network-message", {
      method: "POST",
      body: JSON.stringify(packet),
    })
  },

  // Update a packet
  updatePacket: async (id: number, packet: UpdatePacketRequest): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    console.log(`✏️ Updating network packet ${id}...`)
    return apiCall<{ success: boolean; message: string }>(`/network-message/${id}`, {
      method: "PUT",
      body: JSON.stringify(packet),
    })
  },

  // Delete a packet
  deletePacket: async (id: number): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    console.log(`🗑️ Deleting network packet ${id}...`)
    return apiCall<{ success: boolean; message: string }>(`/network-message/${id}`, {
      method: "DELETE",
    })
  },

  // Search packets
  searchPackets: async (searchTerm: string): Promise<ApiResponse<{ data: NetworkPacket[]; count: number; search_term: string }>> => {
    console.log(`🔍 Searching network packets: ${searchTerm}...`)
    return apiCall<{ data: NetworkPacket[]; count: number; search_term: string }>(
      `/network-message/search?q=${encodeURIComponent(searchTerm)}`,
      {
        method: "GET",
      },
    )
  },

  // Get packet count
  getPacketCount: async (): Promise<ApiResponse<{ success: boolean; count: number }>> => {
    console.log("📊 Fetching network packet count...")
    return apiCall<{ success: boolean; count: number }>("/network-message/count", {
      method: "GET",
    })
  },

  // Get all folders
  getAllFolders: async (): Promise<ApiResponse<{ success: boolean; data: string[]; count: number }>> => {
    console.log("📁 Fetching all folders...")
    return apiCall<{ success: boolean; data: string[]; count: number }>("/network-message/folders", {
      method: "GET",
    })
  },

  // Get packets by folder
  getPacketsByFolder: async (folder: string): Promise<ApiResponse<{ success: boolean; data: NetworkPacket[]; count: number; folder: string }>> => {
    console.log(`📁 Fetching packets in folder: ${folder}...`)
    return apiCall<{ success: boolean; data: NetworkPacket[]; count: number; folder: string }>(
      `/network-message/folder/${encodeURIComponent(folder)}`,
      {
        method: "GET",
      },
    )
  },

  // Get packets by protocol
  getPacketsByProtocol: async (protocol: string): Promise<ApiResponse<{ success: boolean; data: NetworkPacket[]; count: number; protocol: string }>> => {
    console.log(`📡 Fetching packets for protocol: ${protocol}...`)
    return apiCall<{ success: boolean; data: NetworkPacket[]; count: number; protocol: string }>(
      `/network-message/protocol/${encodeURIComponent(protocol)}`,
      {
        method: "GET",
      },
    )
  },

  // Send a packet
  sendPacket: async (request: SendPacketRequest): Promise<ApiResponse<SendPacketResponse>> => {
    console.log("📤 Sending network packet...")
    return apiCall<SendPacketResponse>("/network-message/send", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  // Send a packet by ID
  // Backend route: POST /api/network-message/<packet_id>/send
  sendPacketById: async (id: number, persistentTcp?: boolean): Promise<ApiResponse<SendPacketResponse>> => {
    console.log(`📤 Sending network packet ${id}...`)
    return apiCall<SendPacketResponse>(`/network-message/${id}/send`, {
      method: "POST",
      body: JSON.stringify({ persistentTcp: persistentTcp || false }),
    })
  },

  startNetworkStressTest: async (
    request: StressTestRequest,
  ): Promise<ApiResponse<{ success: boolean; data: StressTestSnapshot }>> => {
    return apiCall<{ success: boolean; data: StressTestSnapshot }>("/network-message/stress-test", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  getNetworkStressTest: async (
    jobId: string,
  ): Promise<ApiResponse<{ success: boolean; data: StressTestSnapshot }>> => {
    return apiCall<{ success: boolean; data: StressTestSnapshot }>(
      `/network-message/stress-test/${jobId}`,
      { method: "GET" },
    )
  },

  stopNetworkStressTest: async (
    jobId: string,
  ): Promise<ApiResponse<{ success: boolean; data: StressTestSnapshot }>> => {
    return apiCall<{ success: boolean; data: StressTestSnapshot }>(
      `/network-message/stress-test/${jobId}/stop`,
      { method: "POST" },
    )
  },

  // SSH Transfer APIs
  uploadFilesSingle: async (request: {
    connection_name: string
    remote_path?: string
    files: string[]
  }): Promise<ApiResponse<{ transfer_id: string; message: string }>> => {
    console.log("📤 Uploading files to single server:", request.connection_name)
    return apiCall<{ transfer_id: string; message: string }>("/ssh/transfer", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  uploadFilesMultiple: async (request: {
    server_names: string[]
    remote_path?: string
    files: string[]
  }): Promise<ApiResponse<{ transfer_id: string; message: string }>> => {
    console.log("📤 Uploading files to multiple servers:", request.server_names)
    return apiCall<{ transfer_id: string; message: string }>("/ssh/transfer/multiple", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  getTransferProgress: async (
    transferId: string
  ): Promise<
    ApiResponse<{
      success: boolean
      type: "single_server" | "multi_server"
      status: "pending" | "transferring" | "completed" | "failed" | "paused" | "cancelled"
      connection_name?: string
      servers?: string[]
      progress: any
      all_completed?: boolean
      current_server?: string
      current_server_index?: number
      total_servers?: number
      server_statuses?: Record<string, string>
    }>
  > => {
    return apiCall(`/ssh/transfer/progress/${transferId}`, {
      method: "GET",
    })
  },

  pauseTransfer: async (transferId: string): Promise<ApiResponse<{ message: string }>> => {
    console.log("⏸️ Pausing transfer:", transferId)
    return apiCall<{ message: string }>(`/ssh/transfer/pause/${transferId}`, {
      method: "POST",
    })
  },

  resumeTransfer: async (transferId: string): Promise<ApiResponse<{ message: string }>> => {
    console.log("▶️ Resuming transfer:", transferId)
    return apiCall<{ message: string }>(`/ssh/transfer/resume/${transferId}`, {
      method: "POST",
    })
  },

  cancelTransfer: async (transferId: string): Promise<ApiResponse<{ message: string }>> => {
    console.log("❌ Cancelling transfer:", transferId)
    return apiCall<{ message: string }>(`/ssh/transfer/cancel/${transferId}`, {
      method: "POST",
    })
  },

  getActiveTransfers: async (): Promise<
    ApiResponse<{
      transfers: Array<{
        transfer_id: string
        type: "single_server" | "multi_server"
        status: string
        connection_name?: string | null
        servers?: string[] | null
        files_count: number
        result?: any
        error?: string | null
      }>
    }>
  > => {
    return apiCall("/ssh/transfer/active", {
      method: "GET",
    })
  },

  browseRemoteFiles: async (request: {
    connection_name: string
    path?: string
  }): Promise<
    ApiResponse<{
      success: boolean
      path: string
      files: Array<{
        name: string
        is_dir: boolean
        size: number
        mtime: number
      }>
      file_count?: number
      message?: string
      error?: string
    }>
  > => {
    return apiCall("/ssh/transfer/browse-remote", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  browseLocalFiles: async (request: {
    directory?: string
    extension?: string
  }): Promise<
    ApiResponse<{
      files: Array<{
        name: string
        path: string
        size: number
        size_formatted: string
      }>
      directory: string
    }>
  > => {
    return apiCall("/ssh/transfer/browse-local", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  verifyMD5: async (request: {
    connection_name: string
    files: Array<{
      remote_path: string
      local_path?: string
    }>
  }): Promise<
    ApiResponse<{
      results: Array<{
        remote_path: string
        local_path?: string
        remote_md5?: string
        local_md5?: string
        md5_match?: boolean
        success: boolean
      }>
    }>
  > => {
    return apiCall("/ssh/transfer/verify-md5", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  cleanupOldTransfers: async (currentTransferId?: string): Promise<
    ApiResponse<{
      message: string
      cleaned_count: number
      remaining_count: number
    }>
  > => {
    return apiCall("/ssh/transfer/cleanup", {
      method: "POST",
      body: JSON.stringify(currentTransferId ? { current_transfer_id: currentTransferId } : {}),
    })
  },

  // File Manager APIs
  fileManagerListDirectory: async (request: {
    connection_name: string
    path?: string
    filter?: string
  }): Promise<
    ApiResponse<{
      success: boolean
      path: string
      files: Array<{
        name: string
        is_dir: boolean
        size: number
        mtime: number
        permissions?: string
        owner?: string
        group?: string
        modified?: string
      }>
      file_count?: number
      warning?: string
      error?: string
    }>
  > => {
    console.log("📁 Listing directory:", request)
    return apiCall("/ssh/file-manager", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  fileManagerGetDiskUsage: async (request: {
    connection_name: string
  }): Promise<
    ApiResponse<{
      usage: {
        total: number
        used: number
        available: number
        percent: number
        total_formatted: string
        used_formatted: string
        available_formatted: string
      }
    }>
  > => {
    console.log("💾 Getting disk usage:", request)
    return apiCall("/ssh/file-manager/disk-usage", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  fileManagerDownloadFile: async (request: {
    connection_name: string
    path: string
  }): Promise<ApiResponse<Blob>> => {
    console.log("⬇️ Downloading file:", request)
    return apiFileDownload("/ssh/file-manager/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })
  },

  fileManagerBulkDownload: async (request: {
    connection_name: string
    path: string
    files: string[]
  }): Promise<ApiResponse<Blob>> => {
    console.log("⬇️ Bulk downloading files:", request)
    return apiFileDownload("/ssh/file-manager/bulk-download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })
  },

  fileManagerRename: async (request: {
    connection_name: string
    path: string
    old_name: string
    new_name: string
  }): Promise<ApiResponse<{ message: string }>> => {
    console.log("✏️ Renaming file:", request)
    return apiCall("/ssh/file-manager/rename", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  fileManagerDelete: async (request: {
    connection_name: string
    path: string
    files: string[]
  }): Promise<
    ApiResponse<{
      message: string
      deleted_count: number
      warnings?: string[]
    }>
  > => {
    console.log("🗑️ Deleting files:", request)
    return apiCall("/ssh/file-manager/delete", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  fileManagerCreateFolder: async (request: {
    connection_name: string
    path: string
    folder_name: string
  }): Promise<ApiResponse<{ message: string }>> => {
    console.log("📁 Creating folder:", request)
    return apiCall("/ssh/file-manager/create-folder", {
      method: "POST",
      body: JSON.stringify(request),
    })
  },

  fileManagerUpload: async (
    connection_name: string,
    path: string,
    files: FileList | File[]
  ): Promise<
    ApiResponse<{
      message: string
      uploaded_count: number
      warnings?: string[]
    }>
  > => {
    console.log("⬆️ Uploading files:", { connection_name, path, fileCount: files.length })

    try {
      const formData = new FormData()
      formData.append("connection_name", connection_name)
      formData.append("path", path)

      // Add files to form data
      const fileArray = Array.from(files)
      fileArray.forEach((file) => {
        formData.append("files", file)
      })

      const token = tokenManager.getToken()
      const headers: Record<string, string> = {}

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

      const response = await fetch(`${getBaseUrl()}/ssh/file-manager/upload`, {
        method: "POST",
        signal: controller.signal,
        headers,
        body: formData,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorText = ""
        try {
          const errorData = await response.json()
          errorText = errorData.error || response.statusText
        } catch (e) {
          errorText = response.statusText
        }

        if (response.status === 401) {
          tokenManager.removeToken()
          if (typeof window !== "undefined") {
            window.location.href = "/login"
          }
        }

        throw new Error(errorText)
      }

      const data = await response.json()
      console.log("✅ Files uploaded successfully:", data)

      return {
        success: true,
        data: {
          message: data.message || `Uploaded ${data.uploaded_count || fileArray.length} files`,
          uploaded_count: data.uploaded_count || fileArray.length,
          warnings: data.warnings || [],
        },
      }
    } catch (error) {
      console.error("❌ File upload failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown file upload error occurred",
      }
    }
  },

  fileManagerGetConnections: async (): Promise<
    ApiResponse<
      Array<{
        name: string
        host: string
        port: number
        username: string
      }>
    >
  > => {
    console.log("🔌 Getting file manager connections")
    return apiCall("/ssh/file-manager/connections", {
      method: "GET",
    }) 
  },
}

interface RnaApi {
  getParticipantDuplicateInfo: (
    params: { profileId: string; container_plugin_name: string },
    onSuccess: (data: any) => void,
    onError: (error: any) => void, 
  ) => void
  duplicateParticipant: (data: any, onSuccess: (response: any) => void, onError: (error: any) => void) => void
}

export const createRnaApi = (): RnaApi => {
  const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
      "Content-Type": "application/json",
    },
  })

  // Add JWT token to all requests
  api.interceptors.request.use((config) => {
    const token = tokenManager.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Handle token expiration
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        tokenManager.removeToken()
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
      }
      return Promise.reject(error)
    },
  )

  return {
    getParticipantDuplicateInfo: (params, onSuccess, onError) => {
      api
        .get(`/rna/participant/duplicate-info`, { params })
        .then((response) => {
          onSuccess(response.data)
        })
        .catch((error) => {
          onError(error.response?.data || error.message)
        })
    },
    duplicateParticipant: (data, onSuccess, onError) => {
      api
        .post(`/rna/participant/duplicate`, data)
        .then((response) => {
          onSuccess(response.data)
        })
        .catch((error) => {
          onError(error.response?.data || error.message)
        })
    },
  }
}