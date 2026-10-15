"use client"

import { useState, useEffect } from "react"
import { Palette, Plus, Edit, Trash2, AlertCircle, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { useToast } from "@/hooks/use-toast"
import { rnaApi } from "@/lib/api"

interface GraylogRule {
  id: number
  key_word: string
  action: string
  active: number
  rules_mode: string
  enable_link: number
  url: string
  extra_attributes: string
  description: string // Added description field to interface
}

const PREDEFINED_COLORS = [
  { name: "Red", value: "#ef4444", bg: "bg-red-500" },
  { name: "Orange", value: "#f97316", bg: "bg-orange-500" },
  { name: "Yellow", value: "#eab308", bg: "bg-yellow-500" },
  { name: "Green", value: "#22c55e", bg: "bg-green-500" },
  { name: "Blue", value: "#3b82f6", bg: "bg-blue-500" },
  { name: "Purple", value: "#a855f7", bg: "bg-purple-500" },
  { name: "Pink", value: "#ec4899", bg: "bg-pink-500" },
  { name: "Gray", value: "#6b7280", bg: "bg-gray-500" },
]

const PREDEFINED_STYLES = [
  { name: "Background Color", value: "background-color: {color}; color: #fff; padding: 2px 6px; border-radius: 4px;" },
  { name: "Text Color", value: "color: {color}; font-weight: 600;" },
  { name: "Border Left", value: "color: {color}; border-left: 4px solid {color}; padding-left: 8px;" },
  {
    name: "Background + Border",
    value: "background-color: {color}; color: #fff; border: 2px solid {color}; padding: 2px 6px; border-radius: 4px;",
  },
]

export function GraylogRulesTab() {
  const [rules, setRules] = useState<GraylogRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedRule, setSelectedRule] = useState<GraylogRule | null>(null)
  const [formData, setFormData] = useState({
    key_word: "",
    action: "",
    active: true,
    rules_mode: "all",
    enable_link: false,
    url: "",
    extra_attributes: "{}",
    description: "", // Added description to form data
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState("#3b82f6")
  const [selectedStyle, setSelectedStyle] = useState(PREDEFINED_STYLES[0])
  const [customColor, setCustomColor] = useState("#3b82f6")

  const { toast } = useToast()

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const response = await rnaApi.getGraylogRules(true)
      if (response.success && response.data) {
        setRules(response.data.rules)
      } else {
        setError(response.error || "Failed to load graylog rules")
      }
    } catch (err) {
      setError("Failed to load graylog rules")
      console.error("Error loading graylog rules:", err)
    } finally {
      setLoading(false)
    }
  }

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

  const resetForm = () => {
    setFormData({
      key_word: "",
      action: "",
      active: true,
      rules_mode: "all",
      enable_link: false,
      url: "",
      extra_attributes: "{}",
      description: "", // Added description to reset form
    })
    setSelectedRule(null)
    setError(null)
  }

  const openEditModal = (rule: GraylogRule) => {
    setSelectedRule(rule)
    setFormData({
      key_word: rule.key_word,
      action: rule.action,
      active: rule.active === 1,
      rules_mode: rule.rules_mode,
      enable_link: rule.enable_link === 1,
      url: rule.url,
      extra_attributes: rule.extra_attributes,
      description: rule.description || "", // Added description to edit form data
    })
    setSelectedColor(extractColorFromCss(rule.action))
    setSelectedStyle(PREDEFINED_STYLES.find((style) => style.value === rule.action) || PREDEFINED_STYLES[0])
    setShowEditModal(true)
  }

  const openDeleteDialog = (rule: GraylogRule) => {
    setSelectedRule(rule)
    setShowDeleteDialog(true)
  }

  const handleCreateRule = async () => {
    if (!formData.key_word.trim()) {
      setError("Pattern is required")
      return
    }

    if (!formData.action.trim()) {
      setError("CSS Action is required")
      return
    }

    try {
      const response = await rnaApi.createGraylogRule(formData)
      if (response.success) {
        setSuccess("Graylog rule created successfully")
        setShowCreateModal(false)
        resetForm()
        loadRules() // Reload rules
      } else {
        setError(response.error || "Failed to create rule")
      }
    } catch (err) {
      setError("Failed to create rule")
      console.error("Error creating rule:", err)
    }
  }

  const handleUpdateRule = async () => {
    if (!selectedRule || !formData.key_word.trim()) {
      setError("Pattern is required")
      return
    }

    if (!formData.action.trim()) {
      setError("CSS Action is required")
      return
    }

    try {
      const response = await rnaApi.updateGraylogRule(selectedRule.id, formData)
      if (response.success) {
        setSuccess("Graylog rule updated successfully")
        setShowEditModal(false)
        resetForm()
        loadRules() // Reload rules
      } else {
        setError(response.error || "Failed to update rule")
      }
    } catch (err) {
      setError("Failed to update rule")
      console.error("Error updating rule:", err)
    }
  }

  const handleDeleteRule = async () => {
    if (!selectedRule) return

    try {
      const response = await rnaApi.deleteGraylogRule(selectedRule.id)
      if (response.success) {
        setSuccess(`Rule "${selectedRule.key_word}" deleted successfully`)
        setShowDeleteDialog(false)
        setSelectedRule(null)
        loadRules() // Reload rules
      } else {
        setError(response.error || "Failed to delete rule")
      }
    } catch (err) {
      setError("Failed to delete rule")
      console.error("Error deleting rule:", err)
    }
  }

  const toggleRuleStatus = async (rule: GraylogRule) => {
    const newActiveStatus = rule.active === 1 ? 0 : 1

    // Update local state immediately
    setRules((prevRules) => prevRules.map((r) => (r.id === rule.id ? { ...r, active: newActiveStatus } : r)))

    try {
      const response = await rnaApi.updateGraylogRule(rule.id, {
        active: rule.active === 1 ? false : true,
      })

      if (!response.success) {
        setRules((prevRules) => prevRules.map((r) => (r.id === rule.id ? { ...r, active: rule.active } : r)))
        setError(response.error || "Failed to toggle rule status")
      }
    } catch (err) {
      setRules((prevRules) => prevRules.map((r) => (r.id === rule.id ? { ...r, active: rule.active } : r)))
      setError("Failed to toggle rule status")
      console.error("Error toggling rule status:", err)
    }
  }

  const handleResetToDefault = async () => {
    try {
      const response = await rnaApi.initDefaultGraylogRules()
      if (response.success) {
        toast({
          title: "Rules Reset",
          description: "Default rules have been initialized successfully.",
          variant: "default",
        })
        loadRules() // Reload rules
      } else {
        setError(response.error || "Failed to initialize default rules")
      }
    } catch (err) {
      setError("Failed to initialize default rules")
      console.error("Error initializing default rules:", err)
    }
  }

  const generateCssAction = (color: string, style: string) => {
    return style.replace(/{color}/g, color)
  }

  const extractColorFromCss = (cssAction: string) => {
    const colorMatch = cssAction.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/)
    return colorMatch ? colorMatch[0] : "#3b82f6"
  }

  const getPreviewStyle = (cssAction: string) => {
    // Convert CSS string to React style object
    const styles: any = {}
    const declarations = cssAction.split(";").filter((d) => d.trim())

    declarations.forEach((declaration) => {
      const [property, value] = declaration.split(":").map((s) => s.trim())
      if (property && value) {
        const camelCaseProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
        styles[camelCaseProperty] = value
      }
    })

    return styles
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-sm border-0 rounded-2xl">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Parent container like Graylog Config */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200">
        {/* Header (neutral, like Page Management) */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-gray-700" />
            <div>
              <div className="text-lg font-semibold text-gray-900">Graylog Color Rules ({rules.length})</div>
              <p className="text-sm text-gray-600">Configure regex patterns and CSS styling for Graylog messages</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 rounded-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Rules Grid */}
          {rules.length === 0 ? (
            <Card className="shadow-sm border border-blue-200 bg-blue-50 rounded-2xl">
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Palette className="h-10 w-10 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Graylog rules configured</h3>
                  <p className="text-gray-600 mb-6">Create your first rule to start highlighting Graylog messages</p>
                  <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 rounded-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {rules.map((rule) => (
                <Card
                  key={rule.id}
                  className={`shadow-sm rounded-2xl transition-all hover:shadow-md border ${
                    rule.active ? "bg-blue-50 border-blue-200" : "bg-blue-50/70 border-blue-100"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                  {/* Rule Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-800 truncate max-w-[200px]" title={rule.key_word}>
                          {rule.key_word}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rule.active ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {rule.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-gray-700 mb-2 line-clamp-2">{rule.description}</p>
                      )}
                      <p className="text-xs text-gray-600 mb-3">
                        Mode: {rule.rules_mode} {rule.enable_link === 1 && "• Link enabled"}
                      </p>
                    </div>
                    <Switch
                      checked={rule.active === 1}
                      onCheckedChange={() => toggleRuleStatus(rule)}
                      className="ml-2 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                  </div>

                  {/* Color Preview */}
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Preview</Label>
                    <div
                      className="text-sm font-mono p-2 rounded-2xl bg-white border border-blue-100"
                      style={getPreviewStyle(rule.action)}
                    >
                      Sample log message with {rule.key_word}
                    </div>
                  </div>

                  {/* CSS Action */}
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">CSS Action</Label>
                    <div className="bg-blue-50 rounded-2xl border border-blue-100 p-3 text-xs font-mono text-gray-700 max-h-20 overflow-y-auto">
                      {rule.action}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(rule)}
                      className="flex-1 rounded-full border-blue-200"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(rule)}
                      className="rounded-full border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end"></div>

      {/* Create Rule Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold">Create New Graylog Rule</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Add a new regex pattern and CSS styling rule for Graylog message highlighting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-3">
              <div>
                <Label htmlFor="create-pattern" className="text-sm font-medium">
                  Graylog Rule
                </Label>
                <Textarea
                  id="create-pattern"
                  value={formData.key_word}
                  onChange={(e) => setFormData((prev) => ({ ...prev, key_word: e.target.value }))}
                  placeholder="e.g., error|exception|failed"
                  className="rounded-2xl border-gray-300 font-mono text-sm resize-y"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="create-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this rule"
                  className="rounded-2xl border-gray-300 text-sm resize-y"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Style Template</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PREDEFINED_STYLES.map((style, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedStyle(style)
                        setFormData((prev) => ({
                          ...prev,
                          action: generateCssAction(selectedColor, style.value),
                        }))
                      }}
                      className={`text-left p-2 rounded-2xl border transition-all text-xs ${
                        selectedStyle.name === style.name
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium">{style.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="create-mode" className="text-sm font-medium">
                    Mode
                  </Label>
                  <Select
                    value={formData.rules_mode}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, rules_mode: value }))}
                  >
                    <SelectTrigger className="rounded-full h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="matches">Matches Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="create-active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, active: checked }))}
                    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <Label htmlFor="create-active" className="text-sm">
                    Active
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="create-action" className="text-sm font-medium">
                  CSS Action
                </Label>
                <Textarea
                  id="create-action"
                  value={formData.action}
                  onChange={(e) => setFormData((prev) => ({ ...prev, action: e.target.value }))}
                  placeholder="CSS will be generated automatically..."
                  className="rounded-2xl border-gray-300 font-mono text-xs resize-y"
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column - Color & Style + Preview */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Color & Style</Label>
                <div className="bg-blue-50 rounded-2xl border border-blue-100 p-3 space-y-3">
                  <div className="grid grid-cols-4 gap-1">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color.value)
                          setFormData((prev) => ({
                            ...prev,
                            action: generateCssAction(color.value, selectedStyle.value),
                          }))
                        }}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          selectedColor === color.value ? "border-gray-400 scale-110" : "border-gray-200"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value)
                        setSelectedColor(e.target.value)
                        setFormData((prev) => ({
                          ...prev,
                          action: generateCssAction(e.target.value, selectedStyle.value),
                        }))
                      }}
                      className="w-8 h-8 rounded-full border border-blue-200"
                    />
                    <Input
                      value={selectedColor}
                      onChange={(e) => {
                        setSelectedColor(e.target.value)
                        setFormData((prev) => ({
                          ...prev,
                          action: generateCssAction(e.target.value, selectedStyle.value),
                        }))
                      }}
                      placeholder="#3b82f6"
                      className="flex-1 rounded-full border-gray-300 font-mono text-xs h-8"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Live Preview</Label>
                <div className="bg-blue-50 rounded-2xl border border-blue-100 p-3">
                  <div
                    className="text-xs font-mono p-2 rounded-2xl bg-white border border-blue-100"
                    style={formData.action ? getPreviewStyle(formData.action) : {}}
                  >
                    Sample log with {formData.key_word || "pattern"}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-3">
                <div className="text-xs font-medium text-blue-800 mb-1">Rule Info</div>
                <div className="text-xs text-blue-600 space-y-1">
                  <div>Pattern: {formData.key_word || "Not set"}</div>
                  <div>Description: {formData.description || "Not set"}</div>
                  <div>Mode: {formData.rules_mode}</div>
                  <div>Status: {formData.active ? "Active" : "Inactive"}</div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
              className="rounded-full border-gray-300"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateRule} className="bg-blue-600 hover:bg-blue-700 rounded-full">
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold">Edit Graylog Rule</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Update the regex pattern and CSS styling rule.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-3">
              <div>
                <Label htmlFor="edit-pattern" className="text-sm font-medium">
                  Graylog Rule
                </Label>
                <Textarea
                  id="edit-pattern"
                  value={formData.key_word}
                  onChange={(e) => setFormData((prev) => ({ ...prev, key_word: e.target.value }))}
                  placeholder="e.g., error|exception|failed"
                  className="rounded-2xl border-gray-300 font-mono text-sm resize-y"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this rule"
                  className="rounded-2xl border-gray-300 text-sm resize-y"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Style Template</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PREDEFINED_STYLES.map((style, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedStyle(style)
                        setFormData((prev) => ({
                          ...prev,
                          action: generateCssAction(selectedColor, style.value),
                        }))
                      }}
                      className={`text-left p-2 rounded-2xl border transition-all text-xs ${
                        selectedStyle.name === style.name
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium">{style.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="edit-mode" className="text-sm font-medium">
                    Mode
                  </Label>
                  <Select
                    value={formData.rules_mode}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, rules_mode: value }))}
                  >
                    <SelectTrigger className="rounded-full h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="matches">Matches Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="edit-active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, active: checked }))}
                    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <Label htmlFor="edit-active" className="text-sm">
                    Active
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-action" className="text-sm font-medium">
                  CSS Action
                </Label>
                <Textarea
                  id="edit-action"
                  value={formData.action}
                  onChange={(e) => setFormData((prev) => ({ ...prev, action: e.target.value }))}
                  placeholder="CSS will be generated automatically..."
                  className="rounded-2xl border-gray-300 font-mono text-xs resize-y"
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column - Color & Style + Preview */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Color & Style</Label>
                <div className="bg-blue-50 rounded-2xl border border-blue-100 p-3 space-y-3">
                  <div className="grid grid-cols-4 gap-1">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color.value)
                          setFormData((prev) => ({
                            ...prev,
                            action: generateCssAction(color.value, selectedStyle.value),
                          }))
                        }}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          selectedColor === color.value ? "border-gray-400 scale-110" : "border-gray-200"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value)
                        setSelectedColor(e.target.value)
                        setFormData((prev) => ({
                          ...prev,
                          action: generateCssAction(e.target.value, selectedStyle.value),
                        }))
                      }}
                      className="w-8 h-8 rounded-full border border-blue-200"
                    />
                    <Input
                      value={selectedColor}
                      onChange={(e) => {
                        setSelectedColor(e.target.value)
                        setFormData((prev) => ({
                          ...prev,
                          action: generateCssAction(e.target.value, selectedStyle.value),
                        }))
                      }}
                      placeholder="#3b82f6"
                      className="flex-1 rounded-full border-gray-300 font-mono text-xs h-8"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Live Preview</Label>
                <div className="bg-blue-50 rounded-2xl border border-blue-100 p-3">
                  <div
                    className="text-xs font-mono p-2 rounded-2xl bg-white border border-blue-100"
                    style={formData.action ? getPreviewStyle(formData.action) : {}}
                  >
                    Sample log with {formData.key_word || "pattern"}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-3">
                <div className="text-xs font-medium text-blue-800 mb-1">Rule Info</div>
                <div className="text-xs text-blue-600 space-y-1">
                  <div>Pattern: {formData.key_word || "Not set"}</div>
                  <div>Description: {formData.description || "Not set"}</div>
                  <div>Mode: {formData.rules_mode}</div>
                  <div>Status: {formData.active ? "Active" : "Inactive"}</div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              className="rounded-full border-gray-300"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRule} className="bg-blue-600 hover:bg-blue-700 rounded-full">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{selectedRule?.key_word}" rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRule} className="bg-red-600 hover:bg-red-700 rounded-full">
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
