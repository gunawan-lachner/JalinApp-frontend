"use client"

import { useState, useCallback, useRef } from "react"
import { rnaApi } from "@/lib/api"
import type {
  Transaction,
  ConnectionProfile,
  ParticipantSearchParams,
  ParticipantSearchResponse,
  ContainerPlugin, // Import ContainerPlugin
  ContainerPluginSearchParams, // Import ContainerPluginSearchParams
  ParticipantDuplicateInfoRequest,
  ParticipantDuplicateInfoResponse,
  ParticipantDuplicateRequest,
  ParticipantDuplicateResponse,
  CreateParticipantRequest,
  UpdateParticipantRequest,
  GatewaySearchParams,
  GatewaySearchResponse,
  BinSearchParams,
  BinSearchResponse,
  CreateGatewayRequest,
  CreateBinRequest,
  UpdateGatewayRequest,
  UpdateBinRequest,
  MoveBinsRequest,
  BinRoutingListRequest,
  BinRoutingListResponse,
  SimpleIdName,
} from "@/lib/types" // Import ConnectionProfile and new types

export function useRnaApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchAttempts = useRef<Set<string>>(new Set())

  const handleApiCall = useCallback(async (apiCall, onSuccess, onError, cacheKey?: string) => {
    // If we already failed this request, don't try again
    if (cacheKey && fetchAttempts.current.has(cacheKey)) {
      console.log(`Skipping repeated API call for: ${cacheKey}`)
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const response = await apiCall()

      if (response.success && response.data) {
        onSuccess?.(response.data)
        return response.data
      } else {
        const errorMessage = response.error || "An error occurred"
        setError(errorMessage)
        onError?.(errorMessage)

        // Mark this request as failed to prevent retries
        if (cacheKey) {
          fetchAttempts.current.add(cacheKey)
        }
        return null
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      onError?.(errorMessage)

      // Mark this request as failed to prevent retries
      if (cacheKey) {
        fetchAttempts.current.add(cacheKey)
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    clearError: () => {
      setError(null)
      fetchAttempts.current.clear() // Allow retries after manual error clear
    },

    // Connection profile methods
    getConnectionProfiles: useCallback(
      (onSuccess, onError) =>
        handleApiCall(() => rnaApi.getConnectionProfiles(), onSuccess, onError, "connection-profiles"),
      [handleApiCall],
    ),
    createConnectionProfile: useCallback(
      (profile: ConnectionProfile, onSuccess, onError) =>
        handleApiCall(() => rnaApi.createConnectionProfile(profile), onSuccess, onError),
      [handleApiCall],
    ),
    updateConnectionProfile: useCallback(
      (originalName: string, profile: ConnectionProfile, onSuccess, onError) =>
        handleApiCall(() => rnaApi.updateConnectionProfile(originalName, profile), onSuccess, onError),
      [handleApiCall],
    ),
    deleteConnectionProfile: useCallback(
      (profileName: string, onSuccess, onError) =>
        handleApiCall(() => rnaApi.deleteConnectionProfile(profileName), onSuccess, onError),
      [handleApiCall],
    ),
    testConnection: useCallback(
      (profileId: string, onSuccess, onError) =>
        handleApiCall(() => rnaApi.testConnection(profileId), onSuccess, onError, `test-connection-${profileId}`),
      [handleApiCall],
    ),
    testConnectionProfile: useCallback(
      (profileName: string, onSuccess, onError) =>
        handleApiCall(
          () => rnaApi.testConnectionProfile(profileName),
          onSuccess,
          onError,
          `test-connection-profile-${profileName}`,
        ),
      [handleApiCall],
    ),

    // Transaction methods
    searchTransactions: useCallback(
      (params, onSuccess, onError) => handleApiCall(() => rnaApi.searchTransactions(params), onSuccess, onError),
      [handleApiCall],
    ),

    getTransactionDetails: useCallback(
      (profileId, transactionId, onSuccess, onError) =>
        handleApiCall(
          () => rnaApi.getTransactionDetails(profileId, transactionId),
          onSuccess,
          onError,
          `transaction-details-${profileId}-${transactionId}`,
        ),
      [handleApiCall],
    ),

    getTransactionAttributes: useCallback(
      (profileId, transactionId, onSuccess, onError) =>
        handleApiCall(
          () => rnaApi.getTransactionAttributes(profileId, transactionId),
          onSuccess,
          onError,
          `transaction-attributes-${profileId}-${transactionId}`,
        ),
      [handleApiCall],
    ),

    getTransactionEndpoints: useCallback(
      (profileId, uuid, onSuccess, onError) =>
        handleApiCall(
          () => rnaApi.getTransactionEndpoints(profileId, uuid),
          onSuccess,
          onError,
          `transaction-endpoints-${profileId}-${uuid}`,
        ),
      [handleApiCall],
    ),

    getGrayLogData: useCallback(
      (profileId, transactionId, onSuccess, onError) =>
        handleApiCall(
          () => rnaApi.getGrayLogData(profileId, transactionId),
          onSuccess,
          onError,
          `graylog-data-${profileId}-${transactionId}`,
        ),
      [handleApiCall],
    ),

    // Save and export methods
    saveTransactions: useCallback(
      (request, onSuccess, onError) => handleApiCall(() => rnaApi.saveTransactions(request), onSuccess, onError),
      [handleApiCall],
    ),
    getSavedTransactions: useCallback(
      (onSuccess, onError) =>
        handleApiCall(() => rnaApi.getSavedTransactions(), onSuccess, onError, "saved-transactions"),
      [handleApiCall],
    ),
    getSavedTransactionDetails: useCallback(
      (savedId: string, onSuccess, onError) =>
        handleApiCall(
          () => rnaApi.getSavedTransactionDetails(savedId),
          onSuccess,
          onError,
          `saved-transaction-details-${savedId}`,
        ),
      [handleApiCall],
    ),
    deleteSavedTransaction: useCallback(
      (savedId: string, onSuccess, onError) =>
        handleApiCall(() => rnaApi.deleteSavedTransaction(savedId), onSuccess, onError),
      [handleApiCall],
    ),
    exportTransactions: useCallback(
      (
        transactions: Transaction[],
        format: "csv",
        onSuccess,
        onError, // Only CSV format
      ) => handleApiCall(() => rnaApi.exportTransactions(transactions, format), onSuccess, onError),
      [handleApiCall],
    ),

    // System methods
    getSystemStatus: useCallback(
      (onSuccess, onError) => handleApiCall(() => rnaApi.getSystemStatus(), onSuccess, onError, "system-status"),
      [handleApiCall],
    ),

    // Filter metadata method
    getFilterMetadata: useCallback(
      (onSuccess, onError) => handleApiCall(() => rnaApi.getFilterMetadata(), onSuccess, onError, "filter-metadata"),
      [handleApiCall],
    ),

    // Database Tools methods
    getSourceTables: useCallback(
      (profile: string, onSuccess, onError) =>
        handleApiCall(() => rnaApi.getSourceTables(profile), onSuccess, onError, `source-tables-${profile}`),
      [handleApiCall],
    ),

    getTableColumns: useCallback(
      (profile: string, table: string, onSuccess, onError) =>
        handleApiCall(
          () => rnaApi.getTableColumns(profile, table),
          onSuccess,
          onError,
          `table-columns-${profile}-${table}`,
        ),
      [handleApiCall],
    ),

    compareTables: useCallback(
      (request, onSuccess, onError) => handleApiCall(() => rnaApi.compareTables(request), onSuccess, onError),
      [handleApiCall],
    ),

    exportCompareResults: useCallback(
      (results: any[], format: "csv" | "excel", onSuccess, onError) =>
        handleApiCall(() => rnaApi.exportCompareResults(results, format), onSuccess, onError),
      [handleApiCall],
    ),

    // New: Participant methods
    getParticipants: useCallback(
      (params: ParticipantSearchParams, onSuccess: (data: ParticipantSearchResponse) => void, onError) =>
        handleApiCall(
          () => rnaApi.getParticipants(params),
          onSuccess,
          onError,
          `participants-${params.profileId}-${params.page}-${params.page_size}-${params.search || ""}-${JSON.stringify(params.column_filters || {})}`,
        ),
      [handleApiCall],
    ),

    // New: Container Plugin methods
    getContainerPluginDetails: useCallback(
      (params: ContainerPluginSearchParams, onSuccess: (data: ContainerPlugin[]) => void, onError) =>
        handleApiCall(
          () => rnaApi.getContainerPluginDetails(params),
          onSuccess,
          onError,
          `container-plugin-details-${params.profileId}-${params.name}`,
        ),
      [handleApiCall],
    ),

    // New: Participant Duplication methods
    getParticipantDuplicateInfo: useCallback(
      (params: ParticipantDuplicateInfoRequest, onSuccess: (data: ParticipantDuplicateInfoResponse) => void, onError) =>
        handleApiCall(
          () => rnaApi.getParticipantDuplicateInfo(params),
          onSuccess,
          onError,
          `participant-duplicate-info-${params.profileId}-${params.container_plugin_name}`,
        ),
      [handleApiCall],
    ),

    duplicateParticipant: useCallback(
      (request: ParticipantDuplicateRequest, onSuccess: (data: ParticipantDuplicateResponse) => void, onError) =>
        handleApiCall(() => rnaApi.duplicateParticipant(request), onSuccess, onError),
      [handleApiCall],
    ),

    createParticipant: useCallback(
      (request: CreateParticipantRequest, onSuccess, onError) =>
        handleApiCall(() => rnaApi.createParticipant(request), onSuccess, onError),
      [handleApiCall],
    ),

    getParticipant: useCallback(
      (participantId: number | string, profileId: string, onSuccess, onError) =>
        handleApiCall(
          () => rnaApi.getParticipant(participantId, profileId),
          onSuccess,
          onError,
          `participant-${participantId}-${profileId}`,
        ),
      [handleApiCall],
    ),

    updateParticipant: useCallback(
      (participantId: number | string, request: UpdateParticipantRequest, onSuccess, onError) =>
        handleApiCall(() => rnaApi.updateParticipant(participantId, request), onSuccess, onError),
      [handleApiCall],
    ),

    deleteParticipant: useCallback(
      (participantId: number | string, profileId: string, onSuccess, onError) =>
        handleApiCall(() => rnaApi.deleteParticipant(participantId, profileId), onSuccess, onError),
      [handleApiCall],
    ),

    // Gateway Management methods
    getGateways: useCallback(
      (params: GatewaySearchParams, onSuccess: (data: GatewaySearchResponse) => void, onError) =>
        handleApiCall(() => rnaApi.getGateways(params), onSuccess, onError, `gateways-${JSON.stringify(params)}`),
      [handleApiCall],
    ),

    createGateway: useCallback(
      (request: CreateGatewayRequest, onSuccess, onError) =>
        handleApiCall(() => rnaApi.createGateway(request), onSuccess, onError),
      [handleApiCall],
    ),

    getGateway: useCallback(
      (gatewayId: string, connection: string, onSuccess, onError) =>
        handleApiCall(
          () => rnaApi.getGateway(gatewayId, connection),
          onSuccess,
          onError,
          `gateway-${gatewayId}-${connection}`,
        ),
      [handleApiCall],
    ),

    updateGateway: useCallback(
      (gatewayId: string, request: UpdateGatewayRequest, onSuccess, onError) =>
        handleApiCall(() => rnaApi.updateGateway(gatewayId, request), onSuccess, onError),
      [handleApiCall],
    ),

    deleteGateway: useCallback(
      (gatewayId: string, connection: string, onSuccess, onError) =>
        handleApiCall(() => rnaApi.deleteGateway(gatewayId, connection), onSuccess, onError),
      [handleApiCall],
    ),

    // BIN Management methods
    getGatewayBins: useCallback(
      (gatewayId: string, params: BinSearchParams, onSuccess: (data: BinSearchResponse) => void, onError) =>
        handleApiCall(
          () => rnaApi.getGatewayBins(gatewayId, params),
          onSuccess,
          onError,
          `gateway-bins-${gatewayId}-${JSON.stringify(params)}`,
        ),
      [handleApiCall],
    ),

    createBin: useCallback(
      (gatewayId: string, request: CreateBinRequest, onSuccess, onError) =>
        handleApiCall(() => rnaApi.createBin(gatewayId, request), onSuccess, onError),
      [handleApiCall],
    ),

    getBin: useCallback(
      (binId: string, connection: string, onSuccess, onError) =>
        handleApiCall(() => rnaApi.getBin(binId, connection), onSuccess, onError, `bin-${binId}-${connection}`),
      [handleApiCall],
    ),

    updateBin: useCallback(
      (binId: string, request: UpdateBinRequest, onSuccess, onError) =>
        handleApiCall(() => rnaApi.updateBin(binId, request), onSuccess, onError),
      [handleApiCall],
    ),

    deleteBin: useCallback(
      (binId: string, connection: string, keepBinHolderName: boolean, onSuccess, onError) =>
        handleApiCall(() => rnaApi.deleteBin(binId, connection, keepBinHolderName), onSuccess, onError),
      [handleApiCall],
    ),

    // Search and Utility methods
    searchBins: useCallback(
      (params: BinSearchParams, onSuccess: (data: BinSearchResponse) => void, onError) =>
        handleApiCall(() => rnaApi.searchBins(params), onSuccess, onError, `search-bins-${JSON.stringify(params)}`),
      [handleApiCall],
    ),

    moveBins: useCallback(
      (request: MoveBinsRequest, onSuccess, onError) =>
        handleApiCall(() => rnaApi.moveBins(request), onSuccess, onError),
      [handleApiCall],
    ),

    // New: BIN routing methods
    listBinRoutes: useCallback(
      (req: BinRoutingListRequest, onSuccess: (data: BinRoutingListResponse) => void, onError) =>
        handleApiCall(() => rnaApi.listBinRoutes(req), onSuccess, onError, `bin-routes-${JSON.stringify(req)}`),
      [handleApiCall],
    ),
    getBinAcquirers: useCallback(
      (profileId: string, onSuccess: (data: { results: SimpleIdName[] }) => void, onError) =>
        handleApiCall(() => rnaApi.getBinAcquirers(profileId), onSuccess, onError, `bin-acq-${profileId}`),
      [handleApiCall],
    ),
    getBinGateways: useCallback(
      (profileId: string, onSuccess: (data: { results: SimpleIdName[] }) => void, onError) =>
        handleApiCall(() => rnaApi.getBinGateways(profileId), onSuccess, onError, `bin-gw-${profileId}`),
      [handleApiCall],
    ),
    createBinRoute: useCallback(
      (
        payload: {
          connection: string
          participant_acq_id: number
          bin: string
          gateway_id: number
          priority: number
          participant_iss_id: number
          rule: string
          description?: string
        },
        onSuccess,
        onError,
      ) => handleApiCall(() => rnaApi.createBinRoute(payload), onSuccess, onError),
      [handleApiCall],
    ),
    updateBinRoute: useCallback(
      (
        routeId: number,
        payload: {
          connection: string
          priority?: number
          gateway_id?: number
          participant_iss_id?: number
          participant_acq_id?: number
        },
        onSuccess,
        onError,
      ) => handleApiCall(() => rnaApi.updateBinRoute(routeId, payload), onSuccess, onError),
      [handleApiCall],
    ),
    deleteBinRoute: useCallback(
      (routeId: number, connection: string, onSuccess, onError) =>
        handleApiCall(() => rnaApi.deleteBinRoute(routeId, connection), onSuccess, onError),
      [handleApiCall],
    ),
    updateGatewayForBinDetails: useCallback(
      (payload: { connection: string; gateway_id: number; bin_details_id: number }, onSuccess, onError) =>
        handleApiCall(() => rnaApi.updateGatewayForBinDetails(payload), onSuccess, onError),
      [handleApiCall],
    ),
    exportBinRoutes: useCallback(
      (
        params: {
          connection: string
          acquirer_id?: number | string
          issuer_id?: number | string
          bin?: string
          gateway_id?: number | string
          search?: string
        },
        onSuccess,
        onError,
      ) => handleApiCall(() => rnaApi.exportBinRoutes(params), onSuccess, onError),
      [handleApiCall],
    ),

    // New: Simulation routes and bin gateways by prefix
    getSimulationRoutes: useCallback(
      (
        params: {
          connection: string
          acquirer_id?: number | string
          issuer_id?: number | string
          bin?: string
          gateway_id?: number | string
          search?: string
          page?: number
          pageSize?: number
        },
        onSuccess: (data: {
          success: boolean
          routes: any[]
          total?: number
          pagination?: { current: number; total: number; pageSize: number }
          query?: string
        }) => void,
        onError,
      ) =>
        handleApiCall(
          () => rnaApi.getSimulationRoutes(params),
          onSuccess,
          onError,
          `bin-sim-routes-${JSON.stringify(params)}`,
        ),
      [handleApiCall],
    ),

    getBinGatewaysByPrefix: useCallback(
      (
        payload: { profileId: string; pan_prefix: string; country?: number },
        onSuccess: (data: {
          results: Array<{ id: number | string; name?: string }>
          total_rows?: number
          page_size?: number
          executed_sql?: string
          error?: string | null
        }) => void,
        onError,
      ) =>
        handleApiCall(
          () => rnaApi.getBinGatewaysByPrefix(payload),
          onSuccess,
          onError,
          `bin-gw-prefix-${payload.profileId}-${payload.pan_prefix}-${payload.country ?? "na"}`,
        ),
      [handleApiCall],
    ),
  }
}
