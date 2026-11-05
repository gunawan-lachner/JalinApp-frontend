"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { authApi, tokenManager, type AuthUser, type LoginResponse, type AccessiblePage } from "@/lib/auth"

interface AuthContextType {
  user: AuthUser | null
  accessiblePages: AccessiblePage[]
  isAuthenticated: boolean
  loading: boolean
  pagesLoaded: boolean
  canCrud: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; data?: LoginResponse; error?: string }>
  logout: () => void
  checkAuth: () => Promise<void>
  hasPageAccess: (path: string) => boolean
  refreshAccessiblePages: () => Promise<void>
  hasCrudPermission: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function normalizePath(path: string): string {
  if (!path) return "/"
  const trimmed = path.trim()
  if (trimmed === "/") return "/"
  return trimmed.replace(/\/+$/, "") || "/"
}

function readCachedPages(): AccessiblePage[] {
  if (typeof window === "undefined") return []
  try {
    const cached = localStorage.getItem("accessible_pages")
    if (!cached) return []
    const parsed = JSON.parse(cached)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessiblePages, setAccessiblePages] = useState<AccessiblePage[]>(() => readCachedPages())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pagesLoaded, setPagesLoaded] = useState(() => readCachedPages().length > 0)
  const [canCrud, setCanCrud] = useState(false)

  // Function to fetch user's accessible pages
  const fetchAccessiblePages = useCallback(async (): Promise<AccessiblePage[]> => {
    try {
      const response = await authApi.getUserPages()
      if (response.success && response.data?.pages) {
        const pages = response.data.pages
        // Store in localStorage for caching
        if (typeof window !== "undefined") {
          localStorage.setItem("accessible_pages", JSON.stringify(pages))
        }
        return pages
      }
      return []
    } catch (error) {
      console.error("Failed to fetch accessible pages:", error)
      return []
    }
  }, [])

  // Function to refresh accessible pages
  const refreshAccessiblePages = useCallback(async () => {
    const pages = await fetchAccessiblePages()
    setAccessiblePages(pages)
    setPagesLoaded(true)
  }, [fetchAccessiblePages])

  // Function to check if user has access to a specific page
  const hasPageAccess = useCallback(
    (path: string): boolean => {
      const normalized = normalizePath(path)

      // Always allow access to dashboard and login
      if (normalized === "/" || normalized === "/login") {
        return true
      }

      // Check if the path exists in user's accessible pages
      return accessiblePages.some(
        (page) => normalizePath(page.path) === normalized,
      )
    },
    [accessiblePages],
  )

  // Function to check CRUD permissions
  const hasCrudPermission = useCallback((): boolean => {
    return canCrud
  }, [canCrud])

  const checkAuth = useCallback(async () => {
    setLoading(true)
    const token = tokenManager.getToken()

    if (token) {
      try {
        // Fetch current user
        const userResponse = await authApi.getCurrentUser()
        if (userResponse.success && userResponse.user) {
          setUser(userResponse.user)
          setIsAuthenticated(true)

          // Set CRUD permission from user data or localStorage
          const crudPermission = userResponse.user.can_crud ?? tokenManager.getCrudPermission()
          setCanCrud(crudPermission)

          // Fetch accessible pages
          const pages = await fetchAccessiblePages()
          setAccessiblePages(pages)
          setPagesLoaded(true)
        } else {
          // Invalid token, clear everything
          tokenManager.clearToken()
          tokenManager.clearCrudPermission()
          if (typeof window !== "undefined") {
            localStorage.removeItem("accessible_pages")
          }
          setUser(null)
          setAccessiblePages([])
          setPagesLoaded(false)
          setIsAuthenticated(false)
          setCanCrud(false)
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error)
        tokenManager.clearToken()
        tokenManager.clearCrudPermission()
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessible_pages")
        }
        setUser(null)
        setAccessiblePages([])
        setPagesLoaded(false)
        setIsAuthenticated(false)
        setCanCrud(false)
      }
    } else {
      // No token — clear auth; keep any cached pages only for login UI consistency
      setAccessiblePages(readCachedPages())
      setPagesLoaded(false)
      setUser(null)
      setIsAuthenticated(false)
      setCanCrud(false)
    }
    setLoading(false)
  }, [fetchAccessiblePages])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true)
      try {
        const response = await authApi.login(username, password)
        if (response.success && response.user) {
          setUser(response.user)
          setIsAuthenticated(true)

          // Set CRUD permission from login response
          setCanCrud(response.user.can_crud ?? false)

          // Immediately fetch accessible pages after login
          const pages = await fetchAccessiblePages()
          setAccessiblePages(pages)
          setPagesLoaded(true)

          setLoading(false)
          return { success: true, data: response }
        } else {
          setLoading(false)
          return { success: false, error: response.message || "Login failed" }
        }
      } catch (error: any) {
        setLoading(false)
        return { success: false, error: error.message || "An unexpected error occurred" }
      }
    },
    [fetchAccessiblePages],
  )

  const logout = useCallback(() => {
    tokenManager.clearToken()
    tokenManager.clearCrudPermission()
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessible_pages")
    }
    setUser(null)
    setAccessiblePages([])
    setPagesLoaded(false)
    setIsAuthenticated(false)
    setCanCrud(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessiblePages,
        isAuthenticated,
        loading,
        pagesLoaded,
        canCrud,
        login,
        logout,
        checkAuth,
        hasPageAccess,
        refreshAccessiblePages,
        hasCrudPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
