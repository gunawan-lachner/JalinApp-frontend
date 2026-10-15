"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Loader2 } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { UserManagementTab } from "@/components/settings/user-management-tab"
import { PageManagementTab } from "@/components/settings/page-management-tab"
import { GraylogConfigTab } from "@/components/settings/graylog-config-tab"
import { GraylogRulesTab } from "@/components/settings/graylog-rules-tab"
import { SshSnippetTab } from "@/components/settings/ssh-snippet-tab"

const SETTINGS_TABS = [
  {
    id: "users",
    label: "User Management",
    description: "Manage system users and access levels",
    adminOnly: true,
  },
  {
    id: "pages",
    label: "Page Management",
    description: "Manage page access and permissions",
    adminOnly: true,
  },
  {
    id: "graylog",
    label: "Graylog Config",
    description: "View and manage Graylog server configurations",
    adminOnly: true,
  },
  {
    id: "graylog-rules",
    label: "Graylog Rules",
    description: "Configure rule color message highlighting",
    adminOnly: true,
  },
  {
    id: "ssh-snippet",
    label: "SSH Snippet",
    description: "Manage reusable SSH command snippets",
    adminOnly: true,
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const { user: currentUser, isLoading: authLoading, isAuthenticated, checkAuth } = useAuth()
  const [activeSection, setActiveSection] = useState("/settings")
  const [activeTab, setActiveTab] = useState("users")

  const isAdmin = currentUser?.role_name === "admin"

  const handleNavigation = (href: string) => {
    router.push(href)
    setActiveSection(href)
  }

  const availableTabs = SETTINGS_TABS.filter((tab) => !tab.adminOnly || isAdmin)

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />
          <div className="flex-1">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Jalin App</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Settings</span>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-8">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
                  <p className="text-gray-600">Please log in to access settings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "users":
        return <UserManagementTab />
      case "pages":
        return <PageManagementTab />
      case "graylog":
        return <GraylogConfigTab />
      case "graylog-rules":
        return <GraylogRulesTab />
      case "ssh-snippet":
        return <SshSnippetTab />
      default:
        return <UserManagementTab />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <div className="flex-shrink-0">
          <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Jalin App</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Settings</span>
              </div>
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <div className="bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 text-xs font-medium">
                    Admin Access
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-800 mb-2">Settings</h1>
                    <p className="text-gray-600">Configure your application preferences and system settings</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200">
                <div className="border-b border-gray-200">
                  <div className="flex overflow-x-auto">
                    {availableTabs.map((tab) => (
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
                <div className="p-6">{renderTabContent()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
