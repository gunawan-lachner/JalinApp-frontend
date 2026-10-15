"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { FileCode2, Loader2 } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { ExplorerTab } from "@/components/renjs/explorer-tab"
import { AtributTab } from "@/components/renjs/atribut-tab"

const RENJS_TABS = [
  {
    id: "explorer",
    label: "Explorer",
    description: "Browse dan edit file teks (.txt, .renjs, .md)",
  },
  {
    id: "atribut",
    label: "Atribut",
    description: "Lihat data container_plugin_attr",
  },
]

export default function RenjsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [activeSection, setActiveSection] = useState(pathname || "/renjs")
  const [activeTab, setActiveTab] = useState("explorer")

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
              <span className="text-gray-800 font-medium">RENJS</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {!isAuthenticated ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  <FileCode2 className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
                  <p className="text-gray-600">Silakan login untuk mengakses RENJS.</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-semibold text-gray-800 mb-2">RENJS</h1>
                        <p className="text-gray-600">
                          Kelola file konfigurasi lokal dan lihat atribut container plugin
                        </p>
                      </div>
                      <FileCode2 className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200">
                    <div className="border-b border-gray-200">
                      <div className="flex overflow-x-auto">
                        {RENJS_TABS.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === tab.id
                                ? "border-blue-600 text-blue-600 bg-blue-50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div className="text-left">
                              <div className="font-medium">{tab.label}</div>
                              <div className="text-xs text-gray-400 mt-1">{tab.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="p-6">
                      {activeTab === "explorer" ? <ExplorerTab /> : <AtributTab />}
                    </div>
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
