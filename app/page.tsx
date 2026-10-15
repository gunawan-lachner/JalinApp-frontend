"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Route,
  Activity,
  Users,
  Database,
  Settings,
  FileText,
  Network,
  ShieldCheck,
  Terminal,
  FileCode2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import type { IconType } from "react-icons";
import { getFeatherIcon } from "@/components/settings/icon-catalog";
import { useAuth } from "@/contexts/auth-context";

const stats = [
  { title: "Total Transactions", value: "2.4M", icon: CreditCard },
  { title: "Active Routes", value: "156", icon: Route },
  { title: "System Uptime", value: "99.9%", icon: Activity },
  { title: "Connected Users", value: "1,247", icon: Users },
];

const pages = [
  {
    title: "Transaction Routing",
    href: "/transaction-routing",
    description: "Explore routing rules and analyze route effectiveness.",
    icon: Route,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Routing Simulation",
    href: "/routing-simulation",
    description: "Simulate transactions, validate syntax, and test outcomes.",
    icon: Activity,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    title: "Transactions",
    href: "/transaction",
    description: "Search, inspect, and troubleshoot transaction details.",
    icon: CreditCard,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Database",
    href: "/database",
    description: "Compare datasets, run queries, and view results.",
    icon: Database,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    title: "Queries",
    href: "/queries",
    description: "Craft, save, and share SQL queries for analysis.",
    icon: FileText,
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    title: "Gateway",
    href: "/gateway",
    description: "Monitor gateway performance and connectivity.",
    icon: Network,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    title: "Participants",
    href: "/participant",
    description: "Manage issuers, acquirers, and related metadata.",
    icon: Users,
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    title: "SSH Client",
    href: "/ssh-client",
    description: "Securely connect to servers directly from the app.",
    icon: Terminal,
    color: "text-gray-700",
    bg: "bg-gray-100",
  },
  {
    title: "RENJS",
    href: "/renjs",
    description: "Browse local config files and view container plugin attributes.",
    icon: FileCode2,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    title: "Settings",
    href: "/settings",
    description: "Configure environments, users, and preferences.",
    icon: Settings,
    color: "text-gray-700",
    bg: "bg-gray-100",
  },
];

export default function JalinApp() {
  const router = useRouter();
  const { user, accessiblePages } = useAuth();
  const [activeSection, setActiveSection] = useState("/");

  const handleNavigation = (href: string) => {
    router.push(href);
    setActiveSection(href);
  };

  const renderContent = () => {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Message */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-gray-600">
            Here’s an overview of your platform and quick links to key tools.
          </p>
        </div>

        {/* Stats Grid */}
        {/* Placeholder for Stats Grid */}

        {/* Quick Actions */}
        {/* Placeholder for Quick Actions */}

        {/* Explore Pages */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          {(() => {
            const metaMap: Record<
              string,
              {
                icon: any;
                color: string;
                bg: string;
                description: string;
              }
            > = {
              "/transaction-routing": {
                icon: Route,
                color: "text-blue-600",
                bg: "bg-blue-50",
                description:
                  "Explore routing rules and analyze route effectiveness.",
              },
              "/routing-simulation": {
                icon: Activity,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
                description:
                  "Simulate transactions, validate syntax, and test outcomes.",
              },
              "/transaction": {
                icon: CreditCard,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                description:
                  "Search, inspect, and troubleshoot transaction details.",
              },
              "/database": {
                icon: Database,
                color: "text-amber-600",
                bg: "bg-amber-50",
                description: "Compare datasets, run queries, and view results.",
              },
              "/queries": {
                icon: FileText,
                color: "text-teal-600",
                bg: "bg-teal-50",
                description: "Craft, save, and share SQL queries for analysis.",
              },
              "/gateway": {
                icon: Network,
                color: "text-rose-600",
                bg: "bg-rose-50",
                description: "Monitor gateway performance and connectivity.",
              },
              "/participant": {
                icon: Users,
                color: "text-sky-600",
                bg: "bg-sky-50",
                description: "Manage issuers, acquirers, and related metadata.",
              },
              "/ssh-client": {
                icon: Terminal,
                color: "text-gray-700",
                bg: "bg-gray-100",
                description:
                  "Securely connect to servers directly from the app.",
              },
              "/renjs": {
                icon: FileCode2,
                color: "text-violet-600",
                bg: "bg-violet-50",
                description: "Browse local config files and view container plugin attributes.",
              },
              "/settings": {
                icon: Settings,
                color: "text-gray-700",
                bg: "bg-gray-100",
                description: "Configure environments, users, and preferences.",
              },
            };

            const fallback = {
              icon: ShieldCheck,
              color: "text-gray-700",
              bg: "bg-gray-100",
              description: "Access this section based on your role.",
            };

            const pagesToShow =
              accessiblePages && accessiblePages.length > 0
                ? accessiblePages.map((p) => {
                    const meta = metaMap[p.path] ?? fallback;
                    const iconName = (p as any)?.icon as unknown;
                    let IconComp: any = meta.icon;
                    if (
                      typeof iconName === "string" &&
                      iconName.trim().length > 0
                    ) {
                      const FeatherIcon: IconType = getFeatherIcon(iconName);
                      IconComp = FeatherIcon as unknown as any;
                    }
                    return {
                      title: p.name,
                      href: p.path,
                      description: "",
                      icon: IconComp,
                      color: "text-blue-600",
                      bg: "bg-blue-50",
                    };
                  })
                : pages.map((p) => ({
                    ...p,
                    color: "text-blue-600",
                    bg: "bg-blue-50",
                    // strip any static description as requested
                    description: "",
                  }));

            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Explore
                  </h3>
                  <span className="text-xs text-gray-500">
                    {pagesToShow.length} sections available for your role
                  </span>
                </div>

                <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-blue-600" />
                  <p>
                    Access to sections and actions varies by role. Some users
                    may not see certain pages, and permissions such as Read,
                    Update, and Delete can be restricted. For additional access,
                    please contact an administrator.
                  </p>
                </div>

                {pagesToShow.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-sm text-gray-600">
                      You don't have access to any sections yet. Contact an
                      administrator for permissions.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pagesToShow.map((p) => (
                      <div
                        key={p.href}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNavigation(p.href)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleNavigation(p.href)
                        }
                        className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`${p.bg} rounded-xl p-3`}>
                            <p.icon className={`h-5 w-5 ${p.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-900">
                                {p.title}
                              </h4>
                              <span className="text-xs text-gray-500 group-hover:text-gray-700">
                                Open →
                              </span>
                            </div>
                            {/* Description removed as requested */}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* System Health */}
        {/* Placeholder for System Health */}

        {/* Overview Fallback */}
        {/* Placeholder for Overview Fallback */}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar - Fixed */}
        <div className="flex-shrink-0">
          <Sidebar
            activeSection={activeSection}
            onNavigate={handleNavigation}
          />
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - Fixed */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Jalin App</span>
                <span>/</span>
                <span className="text-gray-800 font-medium capitalize">
                  Dashboard
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Logged in as{" "}
                  <span className="font-medium">{user?.username}</span>
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {user?.user_level}
                </span>
              </div>
            </div>
          </div>

          {/* Page Content - Scrollable */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
