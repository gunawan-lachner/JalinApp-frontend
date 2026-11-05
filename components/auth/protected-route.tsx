"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
}

function normalizePath(path: string): string {
  if (!path) return "/"
  const trimmed = path.trim()
  if (trimmed === "/") return "/"
  return trimmed.replace(/\/+$/, "") || "/"
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, pagesLoaded, hasPageAccess } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const currentPath = normalizePath(pathname || "/")

  useEffect(() => {
    if (loading) return

    // If not authenticated and not on login page, redirect to login
    if (!isAuthenticated && currentPath !== "/login") {
      router.replace("/login")
      return
    }

    // If authenticated but trying to access login page, redirect to dashboard
    if (isAuthenticated && currentPath === "/login") {
      router.replace("/")
      return
    }

    // Wait until accessible pages are loaded before enforcing page ACL.
    // Redirecting too early (empty pages list) always dumps the user on Dashboard.
    if (
      isAuthenticated &&
      currentPath !== "/login" &&
      pagesLoaded &&
      !hasPageAccess(currentPath)
    ) {
      console.warn(`Access denied to ${currentPath}, redirecting to dashboard`)
      router.replace("/")
    }
  }, [
    isAuthenticated,
    loading,
    pagesLoaded,
    currentPath,
    router,
    hasPageAccess,
  ])

  // Show loading spinner while checking authentication
  if (loading || (isAuthenticated && !pagesLoaded && currentPath !== "/login")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated and not on login page, don't render anything (redirect will happen)
  if (!isAuthenticated && currentPath !== "/login") {
    return null
  }

  // If authenticated but no access to current page, don't render anything (redirect will happen)
  if (
    isAuthenticated &&
    currentPath !== "/login" &&
    pagesLoaded &&
    !hasPageAccess(currentPath)
  ) {
    return null
  }

  return <>{children}</>
}
