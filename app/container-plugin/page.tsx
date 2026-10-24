"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Cpu, Loader2 } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { ContainerPluginPanel } from "@/components/container-plugin/container-plugin-panel"

export default function ContainerPluginPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { loading: authLoading, isAuthenticated } = useAuth()
  const [activeSection, setActiveSection] = useState(
    pathname || "/container-plugin",
  )

  const handleNavigation = (href: string) => {
    router.push(href)
    setActiveSection(href)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <div className="flex-shrink-0">
          <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Jalin App</span>
              <span>/</span>
              <span className="text-gray-500">IDE</span>
              <span>/</span>
              <span className="text-gray-800 font-medium">Container Plugin</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {!isAuthenticated ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  <Cpu className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Authentication Required
                  </h3>
                  <p className="text-gray-600">
                    Silakan login untuk mengakses Container Plugin.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                          Container Plugin
                        </h1>
                        <p className="text-gray-600">
                          Filter container_plugin &amp; container_plugin_attr, lalu
                          klik ID untuk membuka detail di dialog
                        </p>
                      </div>
                      <Cpu className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <ContainerPluginPanel />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
