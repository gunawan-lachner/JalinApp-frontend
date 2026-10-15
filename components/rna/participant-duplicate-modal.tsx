"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Copy, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react"
import { useRnaApi } from "@/hooks/useRnaApi"
import type { Participant, ParticipantDuplicateInfoResponse, ParticipantDuplicateRequest } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

interface ParticipantDuplicateModalProps {
  isOpen: boolean
  onClose: () => void
  participant: Participant | null
  profileId: string
  onSuccess?: () => void
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

interface ParticipantCache {
  participantId: number
  hasError: boolean
  errorMessage: string
  isContainerPluginError: boolean
  data: ParticipantDuplicateInfoResponse | null
}

const TOTAL_STEPS = 5

export function ParticipantDuplicateModal({
  isOpen,
  onClose,
  participant,
  profileId,
  onSuccess,
}: ParticipantDuplicateModalProps) {
  const api = useRnaApi()
  const { toast } = useToast()

  // Cache for participant data and errors
  const participantCacheRef = useRef<Map<number, ParticipantCache>>(new Map())

  // State management
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoadingInfo, setIsLoadingInfo] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [duplicateData, setDuplicateData] = useState<ParticipantDuplicateInfoResponse | null>(null)
  const [hasLoadingError, setHasLoadingError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isContainerPluginError, setIsContainerPluginError] = useState(false)

  const [formData, setFormData] = useState<DuplicateFormData>({
    id: "",
    ext_id: "",
    participant_type: "",
    name: "",
    newMainPluginName: "",
    mainPluginInNext: "CORE",
    mainPluginOutNext: "",
    newMainPluginId: "",
    newComPluginId: "",
    network_type: "",
    active: 1,
    display_on_ui: "Y",
    comments: "",
    container_selected: "",
    is_query_downloaded: false,
    newMainPluginComments: "",
    newComPluginConnectToIpPort: "",
  })

  // Utility Functions
  const parseErrorResponse = (error: any): string => {
    try {
      if (typeof error === "string") {
        return error
      }

      if (error && typeof error === "object" && error.error) {
        return error.error
      }

      if (error && typeof error === "object" && error.message) {
        return error.message
      }

      if (typeof error === "string") {
        try {
          const parsed = JSON.parse(error)
          if (parsed.error) {
            return parsed.error
          }
          if (parsed.message) {
            return parsed.message
          }
        } catch {
          return error
        }
      }

      return "An unexpected error occurred"
    } catch {
      return "An unexpected error occurred"
    }
  }

  const downloadSQLFile = (sqlQueries: string[], participantName: string) => {
    try {
      console.log("📥 Starting SQL file download...")

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const header = `-- SQL Queries for Participant Duplication\n-- Participant: ${participantName}\n-- Generated: ${new Date().toLocaleString()}\n-- Total Queries: ${sqlQueries.length}\n\n`

      const formattedQueries = sqlQueries
        .map((query) => {
          return `${query};\n`
        })
        .join("\n")

      const content = header + formattedQueries

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `participant_duplicate_queries_${participantName.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.txt`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      console.log("✅ SQL file downloaded successfully")

      toast({
        title: "SQL Download Complete!",
        description: `SQL queries have been downloaded as ${link.download}`,
        variant: "default",
      })
    } catch (error) {
      console.error("❌ Error downloading SQL file:", error)
      toast({
        title: "Download Failed",
        description: "Failed to download SQL queries. Please try again.",
        variant: "destructive",
      })
    }
  }

  const resetAllStates = () => {
    setDuplicateData(null)
    setCurrentStep(1)
    setHasLoadingError(false)
    setIsLoadingInfo(false)
    setIsDuplicating(false)
    setErrorMessage("")
    setIsContainerPluginError(false)
  }

  const resetFormData = () => {
    if (!participant) return

    setFormData({
      id: "",
      ext_id: participant.ext_id || "",
      participant_type: participant.participant_type || "",
      name: participant.name || "",
      newMainPluginName: participant.container_plugin_name || "",
      mainPluginInNext: "CORE",
      mainPluginOutNext: "",
      newMainPluginId: "",
      newComPluginId: "",
      network_type: participant.network_type || "",
      active: 1,
      display_on_ui: "Y",
      comments: "",
      container_selected: participant.container_plugin_name || "",
      is_query_downloaded: false,
      newMainPluginComments: "",
      newComPluginConnectToIpPort: "",
    })
  }

  const setLoadingState = (loading: boolean) => {
    setIsLoadingInfo(loading)
  }

  const setErrorState = (hasError: boolean, message = "") => {
    setHasLoadingError(hasError)
    setErrorMessage(message)
    setIsLoadingInfo(false)

    const isContainerError = hasError && message.toLowerCase().includes("container plugin not paired")
    setIsContainerPluginError(isContainerError)

    // Cache the error for this participant
    if (hasError && participant?.id) {
      participantCacheRef.current.set(participant.id, {
        participantId: participant.id,
        hasError: true,
        errorMessage: message,
        isContainerPluginError: isContainerError,
        data: null,
      })
      console.log(`🔴 Cached error for participant ${participant.id}:`, message)
    }
  }

  const clearErrorState = () => {
    setHasLoadingError(false)
    setErrorMessage("")
    setIsContainerPluginError(false)
  }

  const setCachedData = (data: ParticipantDuplicateInfoResponse) => {
    if (participant?.id) {
      participantCacheRef.current.set(participant.id, {
        participantId: participant.id,
        hasError: false,
        errorMessage: "",
        isContainerPluginError: false,
        data: data,
      })
      console.log(`🟢 Cached data for participant ${participant.id}`)
    }
  }

  const getCachedResult = (participantId: number): ParticipantCache | null => {
    return participantCacheRef.current.get(participantId) || null
  }

  // Memoize original plugin data for mapping
  const { originalMainPlugin, originalComPlugin } = useMemo(() => {
    if (!duplicateData?.container_plugins || !participant?.container_plugin_name) {
      return { originalMainPlugin: null, originalComPlugin: null }
    }

    const mainPlugin = duplicateData.container_plugins.find((cp: any) => cp.name === participant.container_plugin_name)
    const comPlugin = duplicateData.container_plugins.find(
      (cp: any) => cp.name?.startsWith("COM") && cp.in_next_plugin === participant.container_plugin_name,
    )
    return { originalMainPlugin: mainPlugin || null, originalComPlugin: comPlugin || null }
  }, [duplicateData, participant])

  // API Functions
  const fetchDuplicateInfo = async () => {
    console.log("🔄 Starting fetchDuplicateInfo...")

    if (!participant?.container_plugin_name || !profileId) {
      const errorMsg = "Missing container plugin name or participant information."
      console.error("❌ Validation failed:", errorMsg)
      setErrorState(true, errorMsg)
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
      return
    }

    // Check cache first
    if (participant.id) {
      const cached = getCachedResult(participant.id)
      if (cached) {
        console.log(`📋 Using cached result for participant ${participant.id}`)
        if (cached.hasError) {
          console.log(`🔴 Restoring cached error: ${cached.errorMessage}`)
          setErrorState(true, cached.errorMessage)
          return
        } else if (cached.data) {
          console.log(`🟢 Restoring cached data`)
          setDuplicateData(cached.data)

          // Restore form data from cached data
          const mainPlugin = cached.data.container_plugins?.find(
            (cp: any) => cp?.name === participant.container_plugin_name,
          )
          const comPlugin = cached.data.container_plugins?.find(
            (cp: any) => cp?.name?.startsWith("COM") && cp?.in_next_plugin === participant.container_plugin_name,
          )

          setFormData((prev) => ({
            ...prev,
            newMainPluginName: mainPlugin?.name || prev.newMainPluginName,
            mainPluginOutNext: comPlugin?.name || "",
            mainPluginInNext: "CORE",
            newMainPluginComments: mainPlugin?.comments || "",
            newComPluginConnectToIpPort: comPlugin?.connectto_ipport || "",
          }))
          return
        }
      }
    }

    // Clear any previous errors and start loading
    clearErrorState()
    setLoadingState(true)

    try {
      console.log("📡 Making API call...")

      api.getParticipantDuplicateInfo(
        {
          profileId,
          container_plugin_name: participant.container_plugin_name,
        },
        (data) => {
          console.log("✅ API Success - Processing data...")

          try {
            if (!data) {
              throw new Error("No data received from server")
            }

            setDuplicateData(data)
            setCachedData(data)

            // Safely identify the main and COM plugins
            const mainPlugin = data.container_plugins?.find((cp: any) => cp?.name === participant.container_plugin_name)
            const comPlugin = data.container_plugins?.find(
              (cp: any) => cp?.name?.startsWith("COM") && cp?.in_next_plugin === participant.container_plugin_name,
            )

            setFormData((prev) => ({
              ...prev,
              newMainPluginName: mainPlugin?.name || prev.newMainPluginName,
              mainPluginOutNext: comPlugin?.name || "",
              mainPluginInNext: "CORE",
              newMainPluginComments: mainPlugin?.comments || "",
              newComPluginConnectToIpPort: comPlugin?.connectto_ipport || "",
            }))

            // Success - clear loading state
            setLoadingState(false)
            console.log("✅ Data processing completed successfully")
          } catch (processingError) {
            console.error("❌ Error processing data:", processingError)
            const errorMsg = "Failed to process participant information. Please try again."
            setErrorState(true, errorMsg)
            toast({
              title: "Data Processing Error",
              description: errorMsg,
              variant: "destructive",
            })
          }
        },
        (error) => {
          console.error("❌ API Error:", error)
          const errorMsg = parseErrorResponse(error)
          setErrorState(true, errorMsg)
          toast({
            title: "Loading Error",
            description: errorMsg,
            variant: "destructive",
          })
        },
      )
    } catch (error) {
      console.error("❌ Unexpected error in fetchDuplicateInfo:", error)
      const errorMsg = "An unexpected error occurred while loading participant information."
      setErrorState(true, errorMsg)
      toast({
        title: "Unexpected Error",
        description: errorMsg,
        variant: "destructive",
      })
    }
  }

  const handleDuplicateSubmission = async () => {
    if (!duplicateData || !profileId) {
      const errorMsg = "Required participant data is missing. Please reload and try again."
      toast({
        title: "Missing Data",
        description: errorMsg,
        variant: "destructive",
      })
      return
    }

    setIsDuplicating(true)

    try {
      // Prepare the participant object
      const newParticipant = {
        ...duplicateData.participant,
        id: formData.id ? Number.parseInt(formData.id) : undefined,
        ext_id: formData.ext_id,
        participant_type: formData.participant_type,
        name: formData.name,
        container_plugin_name: formData.newMainPluginName,
        network_type: formData.network_type,
        active: formData.active,
        display_on_ui: formData.display_on_ui,
        comments: formData.comments,
      }

      // Prepare the container_plugins array
      const newContainerPlugins =
        duplicateData.container_plugins?.map((cp: any) => {
          const newCp = { ...cp }
          if (originalMainPlugin && cp.name === originalMainPlugin.name) {
            newCp.name = formData.newMainPluginName
            newCp.id = formData.newMainPluginId ? Number.parseInt(formData.newMainPluginId) : undefined
            newCp.in_next_plugin = formData.mainPluginInNext
            newCp.out_next_plugin = formData.mainPluginOutNext
            newCp.comments = formData.newMainPluginComments
          } else if (originalComPlugin && cp.name === originalComPlugin.name) {
            newCp.name = formData.mainPluginOutNext
            newCp.id = formData.newComPluginId ? Number.parseInt(formData.newComPluginId) : undefined
            newCp.in_next_plugin = formData.newMainPluginName
            newCp.out_next_plugin = ""
            // Only update connectto_ipport if out_next_plugin is empty (i.e., it's the COM plugin)
            if (newCp.out_next_plugin === "") {
              newCp.connectto_ipport = formData.newComPluginConnectToIpPort
            }
          }
          return newCp
        }) || []

      // Prepare the container_plugin_attrs array
      const newContainerPluginAttrs =
        duplicateData.container_plugin_attrs?.map((attr: any) => {
          const newAttr = { ...attr }
          if (originalMainPlugin && attr.container_plugin_id === originalMainPlugin.id) {
            newAttr.container_plugin_id = formData.newMainPluginId
              ? Number.parseInt(formData.newMainPluginId)
              : undefined
          } else if (originalComPlugin && attr.container_plugin_id === originalComPlugin.id) {
            newAttr.container_plugin_id = formData.newComPluginId ? Number.parseInt(formData.newComPluginId) : undefined
          }
          return newAttr
        }) || []

      // Prepare the online_configs array
      const newOnlineConfigs =
        duplicateData.online_configs?.map((oc: any) => {
          const newOc = { ...oc }
          newOc.container_plugin_name = formData.newMainPluginName

          if (newOc.acq_participant_id === duplicateData.participant.id) {
            newOc.acq_participant_id = newParticipant.id
          }
          if (newOc.iss_participant_id === duplicateData.participant.id) {
            newOc.iss_participant_id = newParticipant.id
          }
          return newOc
        }) || []

      const duplicateRequest: ParticipantDuplicateRequest = {
        profileId,
        participant: newParticipant,
        container_plugins: newContainerPlugins,
        container_plugin_attrs: newContainerPluginAttrs,
        online_configs: newOnlineConfigs,
        is_query_downloaded: formData.is_query_downloaded,
      }

      api.duplicateParticipant(
        duplicateRequest,
        (response) => {
          console.log("✅ Participant duplicated successfully:", response)

          toast({
            title: "Success!",
            description: `Participant "${formData.name}" has been duplicated successfully.`,
            variant: "default",
          })

          if (formData.is_query_downloaded && response.executed_sqls && response.executed_sqls.length > 0) {
            console.log("📥 SQL queries available for download:", response.executed_sqls.length)
            downloadSQLFile(response.executed_sqls, formData.name)
          } else if (formData.is_query_downloaded) {
            console.log("⚠️ SQL download requested but no queries available")
            toast({
              title: "No SQL Queries",
              description: "SQL download was requested but no queries were returned from the server.",
              variant: "default",
            })
          }

          onSuccess?.()
          onClose()
        },
        (error) => {
          console.error("❌ Failed to duplicate participant:", error)
          const errorMsg = parseErrorResponse(error)

          toast({
            title: "Duplication Failed",
            description: errorMsg,
            variant: "destructive",
          })
          setIsDuplicating(false)
        },
      )
    } catch (error) {
      console.error("❌ Unexpected error during duplication:", error)
      const errorMsg = "An unexpected error occurred during duplication. Please try again."
      toast({
        title: "Unexpected Error",
        description: errorMsg,
        variant: "destructive",
      })
      setIsDuplicating(false)
    }
  }

  // Event Handlers
  const handleInputChange = (field: keyof DuplicateFormData, value: string | number | boolean) => {
    if (field === "ext_id" && typeof value === "string" && value.length > 3) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleRetry = () => {
    console.log("🔄 Retry button clicked - clearing cache and refetching...")

    // Clear cache for this participant
    if (participant?.id) {
      participantCacheRef.current.delete(participant.id)
      console.log(`🗑️ Cleared cache for participant ${participant.id}`)
    }

    clearErrorState()
    fetchDuplicateInfo()
  }

  const handleClose = () => {
    if (!isDuplicating) {
      resetAllStates()
      onClose()
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleDuplicate = async () => {
    if (!validateStep(TOTAL_STEPS)) {
      return
    }
    await handleDuplicateSubmission()
  }

  // Validation Functions
  const validateStep = (step: number): boolean => {
    let isValid = true
    let errorMessage = ""

    try {
      switch (step) {
        case 1:
          if (!formData.ext_id?.trim()) {
            errorMessage = "Ext ID is required."
            isValid = false
          } else if (formData.ext_id.length > 3) {
            errorMessage = "Ext ID cannot exceed 3 characters."
            isValid = false
          } else if (!formData.participant_type?.trim()) {
            errorMessage = "Jenis Member is required."
            isValid = false
          } else if (!formData.name?.trim()) {
            errorMessage = "Nama Member is required."
            isValid = false
          }
          break
        case 2:
          if (!formData.newMainPluginName?.trim()) {
            errorMessage = "Container Plugin name is required."
            isValid = false
          } else if (!formData.mainPluginOutNext?.trim()) {
            errorMessage = "Container Plugin Out name is required."
            isValid = false
          } else if (formData.mainPluginInNext !== "CORE") {
            errorMessage = "Container Plugin In must be 'CORE'."
            isValid = false
          }
          break
        case 3:
          if (formData.newMainPluginId && isNaN(Number(formData.newMainPluginId))) {
            errorMessage = "Container Plugin ID must be a valid number."
            isValid = false
          } else if (formData.newComPluginId && isNaN(Number(formData.newComPluginId))) {
            errorMessage = "Container Plugin Out ID must be a valid number."
            isValid = false
          }
          break
        case 4:
          break
        case 5:
          break
        default:
          break
      }

      if (!isValid) {
        toast({
          title: "Validation Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Error in validation:", error)
      toast({
        title: "Validation Error",
        description: "An error occurred during validation. Please check your inputs.",
        variant: "destructive",
      })
      isValid = false
    }

    return isValid
  }

  // Effects
  useEffect(() => {
    if (isOpen && participant) {
      console.log(`🚀 Modal opened for participant ${participant.id} - initializing...`)
      resetAllStates()
      resetFormData()
      fetchDuplicateInfo()
    }
  }, [isOpen, participant])

  // Effect to update comments and connectto_ipport when duplicateData is loaded
  useEffect(() => {
    if (duplicateData && originalMainPlugin && originalComPlugin) {
      setFormData((prev) => ({
        ...prev,
        newMainPluginComments: originalMainPlugin.comments || "",
        newComPluginConnectToIpPort: originalComPlugin.connectto_ipport || "",
      }))
    }
  }, [duplicateData, originalMainPlugin, originalComPlugin])

  // Constants
  const stepTitles = [
    "Basic Participant Information",
    "Container Plugin Names",
    "Container Plugin IDs",
    "Other Details",
    "Summary & Download",
  ]

  const canProceed = !isLoadingInfo && !hasLoadingError && duplicateData

  // Render Functions
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <span className="text-lg text-gray-700">Loading participant information...</span>
      <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the required data.</p>
    </div>
  )

  const renderErrorState = () => {
    const isSpecificError = errorMessage === "Missing container plugin name or participant information."
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Error:</strong> {errorMessage}
            </AlertDescription>
          </Alert>
          <div className="text-center">
            {!isSpecificError && (
              <Button
                onClick={handleRetry}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                disabled={isLoadingInfo}
              >
                {isLoadingInfo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Try Again"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Basic Participant Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id">ID</Label>
                <Input
                  id="id"
                  type="number"
                  placeholder="Leave blank for auto-increment"
                  value={formData.id}
                  onChange={(e) => handleInputChange("id", e.target.value)}
                  disabled={isDuplicating}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ext_id">
                  Ext ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ext_id"
                  value={formData.ext_id}
                  onChange={(e) => handleInputChange("ext_id", e.target.value)}
                  disabled={isDuplicating}
                  className="rounded-xl"
                  maxLength={3}
                  placeholder="Max 3 characters"
                />
                <p className="text-xs text-gray-500">Maximum 3 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="participant_type">
                  Jenis Member <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.participant_type}
                  onValueChange={(value) => handleInputChange("participant_type", value)}
                  disabled={isDuplicating}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select member type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACQ">ACQ</SelectItem>
                    <SelectItem value="ISS">ISS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nama Member <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  disabled={isDuplicating}
                  className="rounded-xl"
                />
              </div>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Container Plugin Names</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newMainPluginName">
                  Nama Container Plugin <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="newMainPluginName"
                  value={formData.newMainPluginName}
                  onChange={(e) => handleInputChange("newMainPluginName", e.target.value)}
                  disabled={isDuplicating}
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500">New name for the container plugin (e.g., VISASMS)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainPluginInNext">
                  Nama Container Plugin In <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mainPluginInNext"
                  value={formData.mainPluginInNext}
                  onChange={(e) => handleInputChange("mainPluginInNext", e.target.value)}
                  disabled={true}
                  className="rounded-xl bg-gray-100"
                />
                <p className="text-xs text-gray-500">This must be 'CORE' for the plugin.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainPluginOutNext">
                  Nama Container Plugin Out <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mainPluginOutNext"
                  value={formData.mainPluginOutNext}
                  onChange={(e) => handleInputChange("mainPluginOutNext", e.target.value)}
                  disabled={isDuplicating}
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500">
                  This is the new name for the container plugin (e.g., COM2VISASMS)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newComPluginConnectToIpPort">Connect To IP:Port (COM Plugin)</Label>
                <Input
                  id="newComPluginConnectToIpPort"
                  value={formData.newComPluginConnectToIpPort}
                  onChange={(e) => handleInputChange("newComPluginConnectToIpPort", e.target.value)}
                  disabled={isDuplicating}
                  className="rounded-xl"
                  placeholder="e.g., 192.168.1.1:8080"
                />
                <p className="text-xs text-gray-500">
                  IP and Port for the COM plugin (only applicable if 'Out Next Plugin' is empty).
                </p>
              </div>
              <div className="space-y-2 col-span-full">
                <Label htmlFor="newMainPluginComments">Keterangan Container Plugin</Label>
                <Textarea
                  id="newMainPluginComments"
                  value={formData.newMainPluginComments}
                  onChange={(e) => handleInputChange("newMainPluginComments", e.target.value)}
                  disabled={isDuplicating}
                  rows={3}
                  className="rounded-xl"
                  placeholder="Comments for the new container plugin"
                />
                <p className="text-xs text-gray-500">Comments for the new container plugin.</p>
              </div>
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Container Plugin IDs</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newComPluginId">ID Container Plugin Out</Label>
                <Input
                  id="newComPluginId"
                  type="number"
                  placeholder="Leave blank for auto-increment"
                  value={formData.newComPluginId}
                  onChange={(e) => handleInputChange("newComPluginId", e.target.value)}
                  disabled={isDuplicating}
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500">New ID for the container plugin</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newMainPluginId">ID Container Plugin</Label>
                <Input
                  id="newMainPluginId"
                  type="number"
                  placeholder="Leave blank for auto-increment"
                  value={formData.newMainPluginId}
                  onChange={(e) => handleInputChange("newMainPluginId", e.target.value)}
                  disabled={isDuplicating}
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500">New ID for the container plugin</p>
              </div>
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Other Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="network_type">Tipe Jaringan</Label>
                <Input
                  id="network_type"
                  value={formData.network_type}
                  onChange={(e) => handleInputChange("network_type", e.target.value)}
                  disabled={isDuplicating}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="active">Status</Label>
                <Select
                  value={formData.active.toString()}
                  onValueChange={(value) => handleInputChange("active", Number.parseInt(value))}
                  disabled={isDuplicating}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - Tidak Aktif</SelectItem>
                    <SelectItem value="1">1 - Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_on_ui">Tampilkan Display</Label>
                <Select
                  value={formData.display_on_ui}
                  onValueChange={(value) => handleInputChange("display_on_ui", value)}
                  disabled={isDuplicating}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Y">Y - Ya</SelectItem>
                    <SelectItem value="N">N - Tidak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-full">
                <Label htmlFor="comments">Keterangan</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => handleInputChange("comments", e.target.value)}
                  disabled={isDuplicating}
                  rows={3}
                  className="rounded-xl"
                />
              </div>
            </CardContent>
          </Card>
        )

      case 5:
        return (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Summary & Download Options</CardTitle>
              <p className="text-sm text-gray-500">Review the changes before duplicating the participant.</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Before Section */}
              <Card className="rounded-xl border-blue-200 bg-blue-50 shadow-inner">
                <CardHeader>
                  <CardTitle className="text-md text-blue-700">Original Participant Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-2">
                  <p>
                    <strong>ID:</strong> {participant?.id || "N/A"}
                  </p>
                  <p>
                    <strong>Ext ID:</strong> {participant?.ext_id || "N/A"}
                  </p>
                  <p>
                    <strong>Jenis Member:</strong> {participant?.participant_type || "N/A"}
                  </p>
                  <p>
                    <strong>Nama Member:</strong> {participant?.name || "N/A"}
                  </p>
                  <p>
                    <strong>Nama Container Plugin:</strong> {participant?.container_plugin_name || "N/A"}
                  </p>
                  <p>
                    <strong>Nama Container Plugin In:</strong> {originalMainPlugin?.in_next_plugin || "N/A"}
                  </p>
                  <p>
                    <strong>Nama Container Plugin Out:</strong> {originalMainPlugin?.out_next_plugin || "N/A"}
                  </p>
                  <p>
                    <strong>ID Container Plugin:</strong> {originalMainPlugin?.id || "N/A"}
                  </p>
                  <p>
                    <strong>ID Container Plugin Out:</strong> {originalComPlugin?.id || "N/A"}
                  </p>
                  <p>
                    <strong>Connect To IP:Port (COM Plugin):</strong> {originalComPlugin?.connectto_ipport || "N/A"}
                  </p>
                  <p>
                    <strong>Keterangan Container Plugin:</strong> {originalMainPlugin?.comments || "N/A"}
                  </p>
                  <p>
                    <strong>Tipe Jaringan:</strong> {participant?.network_type || "N/A"}
                  </p>
                  <p>
                    <strong>Status:</strong> {participant?.active === 1 ? "Aktif" : "Tidak Aktif"}
                  </p>
                  <p>
                    <strong>Tampilkan Display:</strong> {participant?.display_on_ui === "Y" ? "Ya" : "Tidak"}
                  </p>
                  <p>
                    <strong>Keterangan:</strong> {participant?.comments || "N/A"}
                  </p>
                </CardContent>
              </Card>

              {/* After Section */}
              <Card className="rounded-xl border-green-200 bg-green-50 shadow-inner">
                <CardHeader>
                  <CardTitle className="text-md text-green-700">New Participant Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-2">
                  <p>
                    <strong>ID:</strong> {formData.id || "Auto-increment"}
                  </p>
                  <p>
                    <strong>Ext ID:</strong> {formData.ext_id || "N/A"}
                  </p>
                  <p>
                    <strong>Jenis Member:</strong> {formData.participant_type || "N/A"}
                  </p>
                  <p>
                    <strong>Nama Member:</strong> {formData.name || "N/A"}
                  </p>
                  <p>
                    <strong>Nama Container Plugin:</strong> {formData.newMainPluginName || "N/A"}
                  </p>
                  <p>
                    <strong>Nama Container Plugin In:</strong> {formData.mainPluginInNext || "N/A"}
                  </p>
                  <p>
                    <strong>Nama Container Plugin Out:</strong> {formData.mainPluginOutNext || "N/A"}
                  </p>
                  <p>
                    <strong>ID Container Plugin:</strong> {formData.newMainPluginId || "Auto-increment"}
                  </p>
                  <p>
                    <strong>ID Container Plugin Out:</strong> {formData.newComPluginId || "Auto-increment"}
                  </p>
                  <p>
                    <strong>Connect To IP:Port (COM Plugin):</strong> {formData.newComPluginConnectToIpPort || "N/A"}
                  </p>
                  <p>
                    <strong>Keterangan Container Plugin:</strong> {formData.newMainPluginComments || "N/A"}
                  </p>
                  <p>
                    <strong>Tipe Jaringan:</strong> {formData.network_type || "N/A"}
                  </p>
                  <p>
                    <strong>Status:</strong> {formData.active === 1 ? "Aktif" : "Tidak Aktif"}
                  </p>
                  <p>
                    <strong>Tampilkan Display:</strong> {formData.display_on_ui === "Y" ? "Ya" : "Tidak"}
                  </p>
                  <p>
                    <strong>Keterangan:</strong> {formData.comments || "N/A"}
                  </p>
                </CardContent>
              </Card>

              {/* Download Query Toggle */}
              <div className="col-span-full pt-4 border-t border-gray-200 mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-4 shadow-sm">
                <Label
                  htmlFor="is_query_downloaded"
                  className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Download SQL Query
                  <p className="text-xs text-gray-500 mt-1">
                    Toggle to download the generated SQL queries after successful duplication.
                  </p>
                </Label>
                <Switch
                  id="is_query_downloaded"
                  checked={formData.is_query_downloaded}
                  onCheckedChange={(checked) => handleInputChange("is_query_downloaded", checked as boolean)}
                  disabled={isDuplicating}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  const renderContainerPluginError = () => (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-gray-700 mb-2">Container Plugin Configuration Issue</p>
          <p className="text-sm text-gray-500">
            The selected participant has an incomplete container plugin configuration that cannot be duplicated.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto rounded-2xl border-0 shadow-2xl p-0">
        <DialogHeader className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl p-3">
                <Copy className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-800">Duplicate Participant</DialogTitle>
                {formData.container_selected && (
                  <p className="text-sm text-gray-500 mt-1">Container Selected: {formData.container_selected}</p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Step Navigation */}
        <div className="border-b border-gray-200 px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-8 rounded-full ${currentStep >= index + 1 ? "bg-blue-600" : "bg-gray-300"}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              Step {currentStep} of {TOTAL_STEPS}: {stepTitles[currentStep - 1]}
            </span>
          </div>
        </div>

        {/* Content */}
        {isLoadingInfo ? (
          renderLoadingState()
        ) : hasLoadingError && isContainerPluginError ? (
          renderContainerPluginError()
        ) : hasLoadingError ? (
          renderErrorState()
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-6 p-6">{renderStepContent()}</div>
          </div>
        )}

        <DialogFooter className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
          {/* Show error message in footer for container plugin errors */}
          {hasLoadingError && isContainerPluginError ? (
            <div className="flex-1 mr-4">
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Error:</strong> {errorMessage}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isDuplicating || isLoadingInfo || hasLoadingError}
              className="rounded-xl px-4 py-2 bg-transparent"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDuplicating}
              className="rounded-xl px-4 py-2 bg-transparent"
            >
              Cancel
            </Button>
            {!(hasLoadingError && isContainerPluginError) &&
              (currentStep < TOTAL_STEPS ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed || isDuplicating}
                  className="rounded-xl px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleDuplicate}
                  disabled={!canProceed || isDuplicating}
                  className="rounded-xl px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isDuplicating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Duplicating...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Participant
                    </>
                  )}
                </Button>
              ))}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
