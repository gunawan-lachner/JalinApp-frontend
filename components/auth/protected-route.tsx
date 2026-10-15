"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, hasPageAccess } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      // If not authenticated and not on login page, redirect to login
      if (!isAuthenticated && pathname !== "/login") {
        router.push("/login")
        return
      }

      // If authenticated but trying to access login page, redirect to dashboard
      if (isAuthenticated && pathname === "/login") {
        router.push("/")
        return
      }

      // If authenticated but doesn't have access to current page, redirect to dashboard
      if (isAuthenticated && pathname !== "/login" && !hasPageAccess(pathname)) {
        console.warn(`Access denied to ${pathname}, redirecting to dashboard`)
        router.push("/")
        return
      }
    }
  }, [isAuthenticated, loading, pathname, router, hasPageAccess])

  // Show loading spinner while checking authentication
  if (loading) {
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
  if (!isAuthenticated && pathname !== "/login") {
    return null
  }

  // If authenticated but no access to current page, don't render anything (redirect will happen)
  if (isAuthenticated && pathname !== "/login" && !hasPageAccess(pathname)) {
    return null
  }

  return <>{children}</>
}
