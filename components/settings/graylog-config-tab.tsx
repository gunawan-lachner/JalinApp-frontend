"use client"

import { useState, useEffect } from "react"
import { Server, Eye, EyeOff, Loader2, RefreshCw, AlertCircle, Plus, Edit, Trash2, CheckCircle } from "lucide-react"
import { rnaApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface GraylogConfig {
  environment: string
  config: {
    BASE_URL: string
    PASSWORD: string
    USERNAME: string
  }
}

interface GraylogConfigResponse {
  configurations: GraylogConfig[]
}

interface GraylogFormData {
  environment: string
  baseUrl: string
  username: string
  password: string
}

export function GraylogConfigTab() {
  const [configurations, setConfigurations] = useState<GraylogConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<GraylogConfig | null>(null)
  const [formData, setFormData] = useState<GraylogFormData>({
    environment: "",
    baseUrl: "",
    username: "",
    password: "",
  })

  const fetchConfigurations = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await rnaApi.getGraylogConfigurations()

      if (response.success && response.data) {
        setConfigurations(response.data.configurations)
      } else {
        setError(response.error || "Failed to fetch Graylog configurations")
      }
    } catch (err) {
      console.error("Error fetching Graylog configurations:", err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigurations()
  }, [])

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const togglePasswordVisibility = (environment: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [environment]: !prev[environment],
    }))
  }

  const getEnvironmentColor = (environment: string) => {
    if (environment.includes("PRODUCTION")) {
      return "bg-red-50 border-red-200 text-red-800"
    } else if (environment.includes("DEVELOPMENT")) {
      return "bg-blue-50 border-blue-200 text-blue-800"
    }
    return "bg-gray-50 border-gray-200 text-gray-800"
  }

  const getEnvironmentBadgeColor = (environment: string) => {
    if (environment.includes("PRODUCTION")) {
      return "bg-red-100 text-red-700 border-red-300"
    } else if (environment.includes("DEVELOPMENT")) {
      return "bg-blue-100 text-blue-700 border-blue-300"
    }
    return "bg-gray-100 text-gray-700 border-gray-300"
  }

  // Reset form data
  const resetForm = () => {
    setFormData({
      environment: "",
      baseUrl: "",
      username: "",
      password: "",
    })
    setSelectedConfig(null)
    setError(null)
  }

  // Open edit modal
  const openEditModal = (config: GraylogConfig) => {
    setSelectedConfig(config)
    setFormData({
      environment: config.environment,
      baseUrl: config.config.BASE_URL,
      username: config.config.USERNAME,
      password: config.config.PASSWORD,
    })
    setShowEditModal(true)
  }

  // Open delete dialog
  const openDeleteDialog = (config: GraylogConfig) => {
    setSelectedConfig(config)
    setShowDeleteDialog(true)
  }

  // Handle create configuration
  const handleCreateConfig = async () => {
    if (!formData.environment || !formData.baseUrl || !formData.username || !formData.password) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setFormLoading(true)
      setError(null)

      // Format the data for the API
      const configData: GraylogConfig = {
        environment: formData.environment.startsWith("GRAYLOG_")
          ? formData.environment
          : `GRAYLOG_${formData.environment}`,
        config: {
          BASE_URL: formData.baseUrl,
          USERNAME: formData.username,
          PASSWORD: formData.password,
        },
      }

      const response = await rnaApi.createGraylogConfiguration(configData)

      if (response.success) {
        setSuccess("Graylog configuration created successfully")
        setShowCreateModal(false)
        resetForm()
        await fetchConfigurations()
      } else {
        setError(response.error || "Failed to create configuration")
      }
    } catch (err) {
      console.error("Error creating Graylog configuration:", err)
      setError("An unexpected error occurred")
    } finally {
      setFormLoading(false)
    }
  }

  // Handle update configuration
  const handleUpdateConfig = async () => {
    if (!selectedConfig || !formData.environment || !formData.baseUrl || !formData.username) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setFormLoading(true)
      setError(null)

      // Format the data for the API
      const configData: GraylogConfig = {
        environment: formData.environment.startsWith("GRAYLOG_")
          ? formData.environment
          : `GRAYLOG_${formData.environment}`,
        config: {
          BASE_URL: formData.baseUrl,
          USERNAME: formData.username,
          PASSWORD: formData.password || selectedConfig.config.PASSWORD,
        },
      }

      const response = await rnaApi.updateGraylogConfiguration(selectedConfig.environment, configData)

      if (response.success) {
        setSuccess("Graylog configuration updated successfully")
        setShowEditModal(false)
        resetForm()
        await fetchConfigurations()
      } else {
        setError(response.error || "Failed to update configuration")
      }
    } catch (err) {
      console.error("Error updating Graylog configuration:", err)
      setError("An unexpected error occurred")
    } finally {
      setFormLoading(false)
    }
  }

  // Handle delete configuration
  const handleDeleteConfig = async () => {
    if (!selectedConfig) return

    try {
      setFormLoading(true)
      setError(null)

      const response = await rnaApi.deleteGraylogConfiguration(selectedConfig.environment)

      if (response.success) {
        setSuccess(`Configuration "${selectedConfig.environment}" deleted successfully`)
        setShowDeleteDialog(false)
        setSelectedConfig(null)
        await fetchConfigurations()
      } else {
        setError(response.error || "Failed to delete configuration")
      }
    } catch (err) {
      console.error("Error deleting Graylog configuration:", err)
      setError("An unexpected error occurred")
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Graylog configurations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConfigurations}
            className="rounded-full border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="h-5 w-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Graylog Configurations ({configurations.length})</h3>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 rounded-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        </div>

        <div className="p-4">
          {configurations.length === 0 ? (
            <div className="text-center py-12">
              <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No Graylog configurations found</p>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(true)}
                className="mt-4 rounded-full border-gray-300 bg-transparent"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Configuration
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {configurations.map((config) => (
                <div
                  key={config.environment}
                  className={`rounded-2xl border p-6 transition-all hover:shadow-md ${getEnvironmentColor(config.environment)}`}
                >
                  {/* Environment Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      
                      <h3 className="text-lg font-semibold">{config.environment.replace("GRAYLOG_", "")}</h3>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getEnvironmentBadgeColor(config.environment)}`}
                    >
                      {config.environment.includes("PRODUCTION") ? "PROD" : "DEV"}
                    </span>
                  </div>

                  {/* Configuration Details */}
                  <div className="space-y-4">
                    {/* Base URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <code className="text-sm text-gray-800 font-mono">{config.config.BASE_URL}</code>
                      </div>
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <code className="text-sm text-gray-800 font-mono">{config.config.USERNAME}</code>
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                        <code className="text-sm text-gray-800 font-mono flex-1">
                          {visiblePasswords[config.environment]
                            ? config.config.PASSWORD
                            : "•".repeat(config.config.PASSWORD.length)}
                        </code>
                        <button
                          onClick={() => togglePasswordVisibility(config.environment)}
                          className="ml-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title={visiblePasswords[config.environment] ? "Hide password" : "Show password"}
                        >
                          {visiblePasswords[config.environment] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(config)}
                      className="rounded-full border-gray-300"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(config)}
                      className="rounded-full border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Configuration Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New Graylog Configuration</DialogTitle>
            <DialogDescription>Add a new Graylog server configuration for your environment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-environment">Environment</Label>
              <Input
                id="create-environment"
                value={formData.environment}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    environment: e.target.value,
                  }))
                }
                placeholder="e.g., DEVELOPMENT, PRODUCTION"
                className="rounded-full border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1">
                "GRAYLOG_" prefix will be added automatically if not included
              </p>
            </div>
            <div>
              <Label htmlFor="create-baseurl">Base URL</Label>
              <Input
                id="create-baseurl"
                value={formData.baseUrl}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    baseUrl: e.target.value,
                  }))
                }
                placeholder="e.g., http://graylog.example.com:9000"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="create-username">Username</Label>
              <Input
                id="create-username"
                value={formData.username}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
                placeholder="Enter username"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Enter password"
                className="rounded-full border-gray-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
              disabled={formLoading}
              className="rounded-full border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConfig}
              disabled={formLoading}
              className="bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Configuration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Configuration Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Graylog Configuration</DialogTitle>
            <DialogDescription>Update the Graylog server configuration details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-environment">Environment</Label>
              <Input
                id="edit-environment"
                value={formData.environment}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    environment: e.target.value,
                  }))
                }
                placeholder="e.g., DEVELOPMENT, PRODUCTION"
                className="rounded-full border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1">
                "GRAYLOG_" prefix will be added automatically if not included
              </p>
            </div>
            <div>
              <Label htmlFor="edit-baseurl">Base URL</Label>
              <Input
                id="edit-baseurl"
                value={formData.baseUrl}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    baseUrl: e.target.value,
                  }))
                }
                placeholder="e.g., http://graylog.example.com:9000"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
                placeholder="Enter username"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">Password (leave empty to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Enter new password"
                className="rounded-full border-gray-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false)
                resetForm()
              }}
              disabled={formLoading}
              className="rounded-full border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateConfig}
              disabled={formLoading}
              className="bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Configuration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Configuration Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{selectedConfig?.environment}" configuration? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formLoading} className="rounded-full border-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfig}
              disabled={formLoading}
              className="bg-red-600 hover:bg-red-700 rounded-full"
            >
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Configuration"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
