"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { FileText, Plus, Edit, Trash2, Loader2, AlertCircle, CheckCircle, RefreshCw, GripVertical } from "lucide-react"
import * as Fi from "react-icons/fi"
import type { IconType } from "react-icons"
import { ICON_CATALOG, getFeatherIcon } from "./icon-catalog"
import { useAuth } from "@/contexts/auth-context"
import { tokenManager } from "@/lib/auth"
import { getApiBaseUrl } from "@/lib/api-base"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// removed dropdown selector; using modal picker instead
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

interface Page {
  id_page: number
  name: string
  path: string
  page_order: number
  role_names: string[]
  role_ids: number[]
  icon?: string | null
  parent_id?: number | null
}

interface Role {
  id_role: number
  role_name: string
}

interface PagesResponse {
  success: boolean
  pages: Page[]
}

interface RolesResponse {
  success: boolean
  roles: Role[]
}

interface PageFormData {
  name: string
  path: string
  role_ids: number[]
  icon: string
  parent_id: number | null
}

// Define role color mapping with pastel colors
const ROLE_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  admin: { bg: "bg-red-100", border: "border-red-300", text: "text-red-700" },
  user: { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-700" },
  viewer: { bg: "bg-green-100", border: "border-green-300", text: "text-green-700" },
  manager: { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-700" },
  default: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700" },
}

export function PageManagementTab() {
  const { user: currentUser, isAuthenticated, checkAuth } = useAuth()

  // State management for Pages
  const [pages, setPages] = useState<Page[]>([])
  const [loadingPages, setLoadingPages] = useState(true)
  const [showCreatePageModal, setShowCreatePageModal] = useState(false)
  const [showEditPageModal, setShowEditPageModal] = useState(false)
  const [showDeletePageDialog, setShowDeletePageDialog] = useState(false)
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [pageFormData, setPageFormData] = useState<PageFormData>({
    name: "",
    path: "",
    role_ids: [],
    icon: "FiFileText",
    parent_id: null,
  })
  const [pageFormLoading, setPageFormLoading] = useState(false)
  // Icon picker modal state
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [iconPickerTarget, setIconPickerTarget] = useState<"create" | "edit">("create")
  const [iconSearch, setIconSearch] = useState("")

  // State management for Roles (needed for dropdowns)
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [formError, setFormError] = useState("")

  // Check if current user is admin
  const isAdmin = currentUser?.role_name === "admin"

  const defaultRoleIds = () => {
    const adminRole = roles.find((r) => r.role_name === "admin")
    if (adminRole) return [adminRole.id_role]
    return roles[0] ? [roles[0].id_role] : []
  }

  const openCreatePageModal = () => {
    setPageFormData({
      name: "",
      path: "",
      role_ids: defaultRoleIds(),
      icon: "FiFileText",
      parent_id: null,
    })
    setSelectedPage(null)
    setFormError("")
    setError("")
    setShowCreatePageModal(true)
  }

  const suggestPathFromName = (name: string) => {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    return slug ? `/${slug}` : ""
  }

  // Drag and drop state variables
  const [draggedPageId, setDraggedPageId] = useState<number | null>(null)
  const [dragOverPageId, setDragOverPageId] = useState<number | null>(null)
  const [dragOverMode, setDragOverMode] = useState<"before" | "after" | "into" | null>(null)
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false)

  // Filtered icons from centralized catalog
  const filteredIcons = ICON_CATALOG.filter((i) => i.label.toLowerCase().includes(iconSearch.toLowerCase()))

  const renderIconPicker = () => (
    <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Select Icon</DialogTitle>
          <DialogDescription>Choose an outlined icon to represent the page. All icons are Feather (Fi*) outline.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Search icons e.g. Home, Settings, Users..."
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              className="rounded-full border-gray-300"
            />
          </div>
          <div className="grid grid-cols-4 gap-3 max-h-80 overflow-auto pr-1">
            {filteredIcons.map(({ name, label, Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setPageFormData((prev) => ({ ...prev, icon: name }))
                  setIconPickerOpen(false)
                }}
                className={`group flex flex-col items-center justify-center p-3 border rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors ${
                  pageFormData.icon === name ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
                title={label}
              >
                <Icon className="h-6 w-6 text-gray-700 group-hover:text-blue-600" />
                <span className="mt-2 text-[11px] text-gray-700 truncate w-full text-center">{label}</span>
              </button>
            ))}
            {filteredIcons.length === 0 && (
              <div className="col-span-4 text-center text-sm text-gray-500 py-6">No icons match your search.</div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIconPickerOpen(false)} className="rounded-full border-gray-300">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // Generic API call function
  const apiCall = useCallback(
    async <T,>(
      endpoint: string,
      options: RequestInit = {},
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      try {
        const token = tokenManager.getToken()
        if (!token) {
          throw new Error("No authentication token found")
        }

        const fullUrl = `${getApiBaseUrl()}${endpoint}`

        const response = await fetch(fullUrl, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
            ...options.headers,
          },
          mode: "cors",
          credentials: "omit",
        })

        if (!response.ok) {
          let errorText = ""
          try {
            const errorData = await response.json()
            errorText = errorData.error || errorData.message || response.statusText
          } catch (e) {
            errorText = response.statusText
          }
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        return { success: true, data }
      } catch (err) {
        console.error("API call failed:", err)
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error occurred",
        }
      }
    },
    [],
  )

  // Fetch all pages
  const fetchPages = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) {
      setLoadingPages(false)
      return
    }

    try {
      setLoadingPages(true)
      setError("")
      const response = await apiCall<PagesResponse>("/auth/pages")

      if (response.success && response.data?.pages) {
        setPages(response.data.pages)
        setSuccess(`Successfully loaded ${response.data.pages.length} pages`)
      } else {
        const errorMsg = response.error || "Failed to fetch pages"
        setError(errorMsg)
        if (errorMsg.includes("Authentication") || errorMsg.includes("401")) {
          await checkAuth()
        }
      }
    } catch (err) {
      setError("Network error occurred while fetching pages")
    } finally {
      setLoadingPages(false)
    }
  }, [isAuthenticated, isAdmin, checkAuth, apiCall])

  // Fetch all roles (needed for form dropdowns)
  const fetchRoles = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) {
      setLoadingRoles(false)
      return
    }

    try {
      setLoadingRoles(true)
      const response = await apiCall<RolesResponse>("/auth/roles")

      if (response.success && response.data?.roles) {
        setRoles(response.data.roles)
        // Set default role for page creation if not already set
        if (pageFormData.role_ids.length === 0 && response.data.roles.length > 0) {
          setPageFormData((prev) => ({ ...prev, role_ids: [] }))
        }
      } else {
        const errorMsg = response.error || "Failed to fetch roles"
        setError(errorMsg)
      }
    } catch (err) {
      setError("Network error occurred while fetching roles")
    } finally {
      setLoadingRoles(false)
    }
  }, [isAuthenticated, isAdmin, apiCall, pageFormData.role_ids.length])

  // Update individual page order
  const updatePageOrder = useCallback(
    async (pageId: number, newOrder: number) => {
      try {
        setIsUpdatingOrder(true)
        // Preserve other fields including icon when updating order
        const current = pages.find((p) => p.id_page === pageId)
        // Only update order — do not send other fields or parent_id may be wiped to null
        const response = await apiCall(`/auth/pages/${pageId}`, {
          method: "PUT",
          body: JSON.stringify({
            page_order: newOrder,
          }),
        })

        if (response.success) {
          setSuccess("Page order updated successfully")
          // Don't refresh immediately, let the optimistic update handle it
          setTimeout(() => {
            fetchPages()
          }, 500)
        } else {
          setError(response.error || "Failed to update page order")
          // Revert optimistic update on error
          await fetchPages()
        }
      } catch (err) {
        setError("Network error occurred while updating page order")
        // Revert optimistic update on error
        await fetchPages()
      } finally {
        setIsUpdatingOrder(false)
      }
    },
    [apiCall, fetchPages],
  )

  // Reset page form
  const resetPageForm = () => {
    setPageFormData({
      name: "",
      path: "",
      role_ids: defaultRoleIds(),
      icon: "FiFileText",
      parent_id: null,
    })
    setSelectedPage(null)
    setError("")
    setFormError("")
  }

  // Open edit page modal
  const openEditPageModal = (page: Page) => {
    setSelectedPage(page)
    setPageFormData({
      name: page.name,
      path: page.path,
      role_ids: page.role_ids.length > 0 ? page.role_ids : defaultRoleIds(),
      icon: page.icon || "FiFileText",
      parent_id: page.parent_id ?? null,
    })
    setFormError("")
    setError("")
    setShowEditPageModal(true)
  }

  const getParentName = (parentId?: number | null) => {
    if (!parentId) return null
    return pages.find((p) => p.id_page === parentId)?.name || null
  }

  // Top-level pages that can act as parent menus (no parent themselves)
  const getParentOptions = (excludePageId?: number | null) => {
    return pages
      .filter((p) => !p.parent_id && p.id_page !== excludePageId)
      .sort((a, b) => a.page_order - b.page_order)
  }

  const renderParentSelect = (excludePageId?: number | null) => {
    const hasChildren =
      !!excludePageId && pages.some((p) => p.parent_id === excludePageId)

    return (
      <div>
        <Label htmlFor="page-parent">Parent Menu</Label>
        <select
          id="page-parent"
          value={pageFormData.parent_id ?? ""}
          onChange={(e) =>
            setPageFormData((prev) => ({
              ...prev,
              parent_id: e.target.value ? Number(e.target.value) : null,
            }))
          }
          disabled={hasChildren}
          className="mt-1 flex h-10 w-full rounded-full border border-gray-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">None (top-level menu)</option>
          {getParentOptions(excludePageId).map((parent) => (
            <option key={parent.id_page} value={parent.id_page}>
              {parent.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {hasChildren
            ? "This page already has submenu items, so it must stay top-level."
            : "Choose a parent to nest this page as a submenu (e.g. RENJS under IDE)."}
        </p>
      </div>
    )
  }

  // Open delete page dialog
  const openDeletePageDialog = (page: Page) => {
    setSelectedPage(page)
    setShowDeletePageDialog(true)
  }

  // Get role badge color
  const getRoleColor = (roleName: string) => {
    return ROLE_COLOR_MAP[roleName] || ROLE_COLOR_MAP.default
  }

  // Get role label
  const getRoleLabel = (roleName: string) => {
    return roleName.charAt(0).toUpperCase() + roleName.slice(1).replace(/_/g, " ")
  }

  // Toggle role selection
  const toggleRoleSelection = (roleId: number) => {
    setPageFormData((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }))
  }

  const pageHasChildren = useCallback(
    (pageId: number) => pages.some((p) => p.parent_id === pageId),
    [pages],
  )

  /** Hierarchical list: top-level pages with their children directly underneath */
  const getDisplayPages = useCallback(() => {
    const sorted = [...pages].sort((a, b) => a.page_order - b.page_order || a.name.localeCompare(b.name))
    const topLevel = sorted.filter((p) => !p.parent_id)
    const result: Page[] = []
    for (const parent of topLevel) {
      result.push(parent)
      const children = sorted.filter((p) => p.parent_id === parent.id_page)
      result.push(...children)
    }
    // Orphans (parent missing from list)
    const listed = new Set(result.map((p) => p.id_page))
    for (const page of sorted) {
      if (!listed.has(page.id_page)) result.push(page)
    }
    return result
  }, [pages])

  const clearDragState = () => {
    setDraggedPageId(null)
    setDragOverPageId(null)
    setDragOverMode(null)
  }

  const resolveDropMode = (
    e: React.DragEvent,
    targetPage: Page,
    dragged: Page | undefined,
  ): "before" | "after" | "into" | null => {
    if (!dragged || dragged.id_page === targetPage.id_page) return null

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const yRatio = (e.clientY - rect.top) / rect.height
    const canNestInto =
      !targetPage.parent_id &&
      !pageHasChildren(dragged.id_page) &&
      dragged.id_page !== targetPage.id_page

    if (canNestInto && yRatio > 0.28 && yRatio < 0.72) return "into"
    if (yRatio < 0.5) return "before"
    return "after"
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, page: Page) => {
    setDraggedPageId(page.id_page)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", page.id_page.toString())
    const target = e.currentTarget as HTMLElement
    target.style.opacity = "0.5"
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = "1"
    clearDragState()
  }

  const handleDragOver = (e: React.DragEvent, page: Page) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (!draggedPageId || draggedPageId === page.id_page) return
    const dragged = pages.find((p) => p.id_page === draggedPageId)
    const mode = resolveDropMode(e, page, dragged)
    setDragOverPageId(page.id_page)
    setDragOverMode(mode)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverPageId(null)
      setDragOverMode(null)
    }
  }

  const persistPageUpdates = async (
    updates: Array<{ id_page: number; page_order?: number; parent_id?: number | null }>,
  ) => {
    const results = await Promise.all(
      updates.map((u) => {
        const body: Record<string, unknown> = {}
        if (u.page_order !== undefined) body.page_order = u.page_order
        if (u.parent_id !== undefined) body.parent_id = u.parent_id
        return apiCall(`/auth/pages/${u.id_page}`, {
          method: "PUT",
          body: JSON.stringify(body),
        })
      }),
    )
    return results.every((r) => r.success)
  }

  const handleDrop = async (e: React.DragEvent, targetPage: Page) => {
    e.preventDefault()

    if (!draggedPageId || draggedPageId === targetPage.id_page || isUpdatingOrder) {
      clearDragState()
      return
    }

    const draggedPage = pages.find((p) => p.id_page === draggedPageId)
    if (!draggedPage) {
      clearDragState()
      return
    }

    const mode = dragOverMode || resolveDropMode(e, targetPage, draggedPage)
    if (!mode) {
      clearDragState()
      return
    }

    setIsUpdatingOrder(true)
    setError("")

    try {
      if (mode === "into") {
        if (targetPage.parent_id || pageHasChildren(draggedPage.id_page)) {
          setError("Hanya bisa menaruh submenu di bawah menu top-level, dan halaman yang punya anak tidak bisa jadi submenu")
          await fetchPages()
          return
        }

        const siblings = pages
          .filter((p) => p.parent_id === targetPage.id_page && p.id_page !== draggedPage.id_page)
          .sort((a, b) => a.page_order - b.page_order)
        const nextOrder =
          siblings.length > 0
            ? Math.max(...siblings.map((s) => s.page_order)) + 1
            : targetPage.page_order + 1

        setPages((prev) =>
          prev.map((p) =>
            p.id_page === draggedPage.id_page
              ? { ...p, parent_id: targetPage.id_page, page_order: nextOrder }
              : p,
          ),
        )

        const ok = await persistPageUpdates([
          { id_page: draggedPage.id_page, parent_id: targetPage.id_page, page_order: nextOrder },
        ])
        if (!ok) {
          setError("Gagal memindahkan ke parent menu. Memuat ulang...")
          await fetchPages()
        } else {
          setSuccess(`"${draggedPage.name}" dipindah ke submenu ${targetPage.name}`)
          await fetchPages()
        }
        return
      }

      // Reorder before/after — inherit parent of target (or top-level)
      const newParentId = targetPage.parent_id ?? null
      if (newParentId && pageHasChildren(draggedPage.id_page)) {
        setError("Halaman yang punya submenu tidak bisa menjadi submenu")
        return
      }

      const display = getDisplayPages().filter((p) => p.id_page !== draggedPage.id_page)
      const targetIndex = display.findIndex((p) => p.id_page === targetPage.id_page)
      if (targetIndex === -1) return

      const insertAt = mode === "before" ? targetIndex : targetIndex + 1
      const moved: Page = { ...draggedPage, parent_id: newParentId }
      const nextDisplay = [...display]
      nextDisplay.splice(insertAt, 0, moved)

      const updatedPages = nextDisplay.map((page, index) => ({
        ...page,
        page_order: index + 1,
      }))

      // Keep non-displayed pages (shouldn't happen) with high order
      const updatedIds = new Set(updatedPages.map((p) => p.id_page))
      const rest = pages
        .filter((p) => !updatedIds.has(p.id_page))
        .map((p, i) => ({ ...p, page_order: updatedPages.length + i + 1 }))

      const allUpdated = [...updatedPages, ...rest]
      setPages(allUpdated)

      const updates = allUpdated
        .map((page) => {
          const original = pages.find((p) => p.id_page === page.id_page)
          if (!original) return null
          const changedOrder = original.page_order !== page.page_order
          const changedParent = (original.parent_id ?? null) !== (page.parent_id ?? null)
          if (!changedOrder && !changedParent) return null
          return {
            id_page: page.id_page,
            ...(changedOrder ? { page_order: page.page_order } : {}),
            ...(changedParent ? { parent_id: page.parent_id ?? null } : {}),
          }
        })
        .filter(Boolean) as Array<{ id_page: number; page_order?: number; parent_id?: number | null }>

      const ok = await persistPageUpdates(updates)
      if (!ok) {
        setError("Sebagian urutan gagal disimpan. Memuat ulang...")
        await fetchPages()
      } else {
        setSuccess("Urutan menu berhasil diperbarui")
      }
    } catch {
      setError("Gagal memperbarui menu via drag & drop")
      await fetchPages()
    } finally {
      setIsUpdatingOrder(false)
      clearDragState()
    }
  }

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("")
        setSuccess("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  // Fetch pages and roles when component mounts or auth state changes
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchRoles() // Fetch roles first as pages depend on them
      fetchPages()
    }
  }, [isAuthenticated, isAdmin, fetchPages, fetchRoles])

  useEffect(() => {
    if (roles.length > 0 && pageFormData.role_ids.length === 0 && !showEditPageModal) {
      setPageFormData((prev) => ({ ...prev, role_ids: [] }))
    }
  }, [roles, pageFormData.role_ids.length, showEditPageModal])

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Access Required</h3>
        <p className="text-gray-600">You need administrator privileges to manage pages.</p>
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
            onClick={() => {
              fetchPages()
              fetchRoles()
            }}
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

      {/* Pages Table */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-gray-700" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">System Pages ({pages.length})</h3>
              <p className="text-sm text-gray-500">
                Seret baris untuk mengubah urutan. Taruh di tengah menu top-level untuk jadi submenu
                (mis. seret SSH Client ke SSH).
              </p>
            </div>
          </div>
          <Button
            onClick={openCreatePageModal}
            className="bg-blue-600 hover:bg-blue-700 rounded-full"
            disabled={loadingPages || roles.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Page
          </Button>
        </div>
        <div className="p-4">
          {loadingPages ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading pages...</p>
              </div>
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No pages found</p>
              {error && (
                <Button
                  variant="outline"
                  onClick={fetchPages}
                  className="mt-4 rounded-full border-gray-300 bg-transparent"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Loading
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 w-8"></th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Page Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Path</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Parent Menu</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Required Role</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getDisplayPages().map((page) => {
                      const parentName = getParentName(page.parent_id)
                      const isChild = !!page.parent_id
                      const isDragOver = dragOverPageId === page.id_page
                      const isNestTarget = isDragOver && dragOverMode === "into"
                      const showBeforeLine = isDragOver && dragOverMode === "before"
                      const showAfterLine = isDragOver && dragOverMode === "after"
                      return (
                      <tr
                        key={page.id_page}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${
                          isNestTarget
                            ? "bg-violet-50 ring-2 ring-violet-300 ring-inset"
                            : showBeforeLine
                              ? "border-t-2 border-t-blue-500 bg-blue-50/40"
                              : showAfterLine
                                ? "border-b-2 border-b-blue-500 bg-blue-50/40"
                                : ""
                        } ${draggedPageId === page.id_page ? "opacity-50" : ""} ${
                          isUpdatingOrder ? "pointer-events-none" : "cursor-move"
                        }`}
                        draggable={!isUpdatingOrder}
                        onDragStart={(e) => handleDragStart(e, page)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, page)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, page)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center" title="Seret untuk memindahkan">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className={`flex items-center space-x-3 ${isChild ? "pl-6" : ""}`}>
                            <div className={`rounded-full p-2 w-10 h-10 flex items-center justify-center ${
                              isNestTarget ? "bg-violet-200" : "bg-blue-100"
                            }`}>
                              {(() => {
                                const Icon = (Fi as Record<string, IconType>)[page.icon || "FiFileText"] || Fi.FiFileText
                                return <Icon className={`h-5 w-5 ${isNestTarget ? "text-violet-700" : "text-blue-600"}`} />
                              })()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {isChild ? `↳ ${page.name}` : page.name}
                                {isNestTarget && (
                                  <span className="ml-2 text-xs font-normal text-violet-700">
                                    Lepas untuk jadi submenu di sini
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500">ID: {page.id_page}</p>
                                <span className="text-gray-300">•</span>
                                <p className="text-sm text-gray-500">Order: {page.page_order}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                            {page.path}
                          </code>
                        </td>
                        <td className="py-4 px-4">
                          {parentName ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                              {parentName}
                            </span>
                          ) : pageHasChildren(page.id_page) ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Parent menu
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {page.role_names.map((roleName, index) => {
                              const roleColor = getRoleColor(roleName)
                              return (
                                <div
                                  key={index}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleColor.bg} ${roleColor.text}`}
                                >
                                  {getRoleLabel(roleName)}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditPageModal(page)}
                              className="rounded-full border-gray-300"
                              disabled={isUpdatingOrder}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeletePageDialog(page)}
                              className="rounded-full border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={isUpdatingOrder}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )})}
                </tbody>
              </table>
              {isUpdatingOrder && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Updating page order...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Page Modal */}
      <Dialog
        open={showCreatePageModal}
        onOpenChange={(open) => {
          setShowCreatePageModal(open)
          if (!open) resetPageForm()
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
            <DialogDescription>Add a new page to the system with specified access requirements.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div>
              <Label htmlFor="create-page-name">Page Name</Label>
              <Input
                id="create-page-name"
                value={pageFormData.name}
                onChange={(e) => {
                  const name = e.target.value
                  setPageFormData((prev) => {
                    const prevSuggested = suggestPathFromName(prev.name)
                    const shouldSuggest = !prev.path || prev.path === prevSuggested
                    return {
                      ...prev,
                      name,
                      path: shouldSuggest ? suggestPathFromName(name) : prev.path,
                    }
                  })
                }}
                placeholder="e.g., SSH, IDE, Users"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="create-page-path">Page Path</Label>
              <Input
                id="create-page-path"
                value={pageFormData.path}
                onChange={(e) => setPageFormData((prev) => ({ ...prev, path: e.target.value }))}
                placeholder="e.g., /ssh, /ide"
                className="rounded-full border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1">
                Path harus unik. Untuk menu grup (seperti IDE/SSH), gunakan path unik misalnya /ssh.
                Path yang sudah dipakai: /ssh-client, /file-transfer, dll.
              </p>
            </div>
            {renderParentSelect()}
            <div>
              <Label>Select Icon</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-2 w-10 h-10 flex items-center justify-center">
                  {(() => {
                    const IconPrev = getFeatherIcon(pageFormData.icon)
                    return <IconPrev className="h-5 w-5 text-blue-600" />
                  })()}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    setIconPickerTarget("create")
                    setIconPickerOpen(true)
                  }}
                >
                  Change Icon
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Saved as icon name, e.g., "FiHome"</p>
            </div>
            <div>
              <Label>Required Roles</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {roles.map((role) => {
                  const isSelected = pageFormData.role_ids.includes(role.id_role)
                  const roleColor = getRoleColor(role.role_name)

                  return (
                    <button
                      key={role.id_role}
                      type="button"
                      onClick={() => toggleRoleSelection(role.id_role)}
                      className={`
                        px-3 py-1 rounded-full text-xs font-medium border-2 transition-all duration-200 cursor-pointer
                        ${
                          isSelected
                            ? `${roleColor.bg} ${roleColor.text} ${roleColor.border}`
                            : `bg-white ${roleColor.text} ${roleColor.border} hover:bg-gray-50`
                        }
                      `}
                    >
                      {getRoleLabel(role.role_name)}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimal satu role harus dipilih.</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreatePageModal(false)
                resetPageForm()
              }}
              disabled={pageFormLoading}
              className="rounded-full border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!pageFormData.name.trim() || !pageFormData.path.trim() || pageFormData.role_ids.length === 0) {
                  setFormError("Lengkapi nama, path, dan pilih minimal satu role")
                  return
                }

                const normalizedPath = pageFormData.path.trim().startsWith("/")
                  ? pageFormData.path.trim()
                  : `/${pageFormData.path.trim()}`

                if (pages.some((p) => p.path === normalizedPath)) {
                  setFormError(`Path ${normalizedPath} sudah dipakai halaman lain`)
                  return
                }

                try {
                  setPageFormLoading(true)
                  setFormError("")
                  setError("")

                  const response = await apiCall("/auth/pages", {
                    method: "POST",
                    body: JSON.stringify({
                      name: pageFormData.name.trim(),
                      path: normalizedPath,
                      role_ids: pageFormData.role_ids,
                      icon: pageFormData.icon || null,
                      parent_id: pageFormData.parent_id,
                    }),
                  })

                  if (response.success) {
                    setSuccess("Page created successfully")
                    setShowCreatePageModal(false)
                    resetPageForm()
                    await fetchPages()
                  } else {
                    const msg = response.error || "Failed to create page"
                    setFormError(msg.replace(/^HTTP \d+:\s*/, ""))
                  }
                } catch (err) {
                  setFormError("Network error occurred while creating page")
                } finally {
                  setPageFormLoading(false)
                }
              }}
              disabled={pageFormLoading || roles.length === 0}
              className="bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              {pageFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Page"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Page Modal */}
      <Dialog
        open={showEditPageModal}
        onOpenChange={(open) => {
          setShowEditPageModal(open)
          if (!open) resetPageForm()
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Page</DialogTitle>
            <DialogDescription>Update page information and access requirements.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div>
              <Label htmlFor="edit-page-name">Page Name</Label>
              <Input
                id="edit-page-name"
                value={pageFormData.name}
                onChange={(e) => setPageFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter page name"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="edit-page-path">Page Path</Label>
              <Input
                id="edit-page-path"
                value={pageFormData.path}
                onChange={(e) => setPageFormData((prev) => ({ ...prev, path: e.target.value }))}
                placeholder="Enter page path"
                className="rounded-full border-gray-300"
              />
            </div>
            {renderParentSelect(selectedPage?.id_page)}
            <div>
              <Label>Select Icon</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-2 w-10 h-10 flex items-center justify-center">
                  {(() => {
                    const IconPrev = getFeatherIcon(pageFormData.icon)
                    return <IconPrev className="h-5 w-5 text-blue-600" />
                  })()}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    setIconPickerTarget("edit")
                    setIconPickerOpen(true)
                  }}
                >
                  Change Icon
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Saved as icon name, e.g., "FiHome"</p>
            </div>
            <div>
              <Label>Required Roles</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {roles.map((role) => {
                  const isSelected = pageFormData.role_ids.includes(role.id_role)
                  const roleColor = getRoleColor(role.role_name)

                  return (
                    <button
                      key={role.id_role}
                      type="button"
                      onClick={() => toggleRoleSelection(role.id_role)}
                      className={`
                        px-3 py-1 rounded-full text-xs font-medium border-2 transition-all duration-200 cursor-pointer
                        ${
                          isSelected
                            ? `${roleColor.bg} ${roleColor.text} ${roleColor.border}`
                            : `bg-white ${roleColor.text} ${roleColor.border} hover:bg-gray-50`
                        }
                      `}
                    >
                      {getRoleLabel(role.role_name)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditPageModal(false)
                resetPageForm()
              }}
              disabled={pageFormLoading}
              className="rounded-full border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (
                  !selectedPage ||
                  !pageFormData.name.trim() ||
                  !pageFormData.path.trim() ||
                  pageFormData.role_ids.length === 0
                ) {
                  setFormError("Lengkapi nama, path, dan pilih minimal satu role")
                  return
                }

                try {
                  setPageFormLoading(true)
                  setFormError("")
                  setError("")

                  const response = await apiCall(`/auth/pages/${selectedPage.id_page}`, {
                    method: "PUT",
                    body: JSON.stringify({
                      name: pageFormData.name.trim(),
                      path: pageFormData.path.trim(),
                      role_ids: pageFormData.role_ids,
                      icon: pageFormData.icon || null,
                      parent_id: pageFormData.parent_id,
                    }),
                  })

                  if (response.success) {
                    setSuccess("Page updated successfully")
                    setShowEditPageModal(false)
                    resetPageForm()
                    await fetchPages()
                  } else {
                    const msg = response.error || "Failed to update page"
                    setFormError(msg.replace(/^HTTP \d+:\s*/, ""))
                  }
                } catch (err) {
                  setFormError("Network error occurred while updating page")
                } finally {
                  setPageFormLoading(false)
                }
              }}
              disabled={pageFormLoading || roles.length === 0}
              className="bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              {pageFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Page"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Icon Picker Modal */}
      {renderIconPicker()}

      {/* Delete Page Dialog */}
      <AlertDialog open={showDeletePageDialog} onOpenChange={setShowDeletePageDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete page "{selectedPage?.name}" ({selectedPage?.path})? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pageFormLoading} className="rounded-full border-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedPage) {
                  setError("No page selected for deletion")
                  return
                }

                try {
                  setPageFormLoading(true)
                  setError("")

                  const response = await apiCall(`/auth/pages/${selectedPage.id_page}`, {
                    method: "DELETE",
                    body: JSON.stringify({
                      icon: selectedPage.icon || null,
                    }),
                  })

                  if (response.success) {
                    setSuccess(`Page "${selectedPage.name}" deleted successfully`)
                    setShowDeletePageDialog(false)
                    setSelectedPage(null)
                    await fetchPages() // Refresh the pages list
                  } else {
                    setError(response.error || "Failed to delete page")
                  }
                } catch (err) {
                  setError("Network error occurred while deleting page")
                } finally {
                  setPageFormLoading(false)
                  setShowDeletePageDialog(false)
                }
              }}
              disabled={pageFormLoading}
              className="bg-red-600 hover:bg-red-700 rounded-full"
            >
              {pageFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Page"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
