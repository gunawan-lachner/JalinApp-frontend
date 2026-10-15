"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  Route,
  Database,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Settings as LucideSettings,
  User,
  Users,
  GitCompare,
  FileText,
  Activity,
  Shield,
  FileCode2,
} from "lucide-react";
import type { IconType } from "react-icons";
import { getFeatherIcon } from "../settings/icon-catalog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";

// Icon mapping for different page types
const getIconForPage = (name: string, path: string): React.ElementType => {
  const lowerName = name.toLowerCase();
  const lowerPath = path.toLowerCase();

  if (lowerName.includes("dashboard") || lowerPath.includes("dashboard"))
    return Home;
  if (lowerName.includes("transaction") || lowerPath.includes("transaction"))
    return Route;
  if (lowerName.includes("participant") || lowerPath.includes("participant"))
    return Users;
  if (lowerName.includes("connection") || lowerPath.includes("connection"))
    return Database;
  if (lowerName.includes("compare") || lowerPath.includes("compare"))
    return GitCompare;
  if (lowerName.includes("setting") || lowerPath.includes("setting"))
    return LucideSettings;
  if (lowerName.includes("user") || lowerPath.includes("user")) return User;
  if (lowerName.includes("report") || lowerPath.includes("report"))
    return FileText;
  if (lowerName.includes("monitor") || lowerPath.includes("monitor"))
    return Activity;
  if (lowerName.includes("config") || lowerPath.includes("config"))
    return Shield;
  if (lowerName.includes("renjs") || lowerPath.includes("renjs"))
    return FileCode2;

  // Default icon
  return FileText;
};

interface SidebarProps {
  activeSection: string;
  onNavigate: (href: string) => void;
}

export function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user, accessiblePages, logout } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebar:expanded");
      // default to expanded if not stored
      return stored ? stored === "1" : true;
    }
    return true;
  });

  const setExpanded = (value: boolean) => {
    setIsExpanded(value);
    try {
      localStorage.setItem("sidebar:expanded", value ? "1" : "0");
    } catch {
      // ignore write errors
    }
  };

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollContainerRef.current && typeof window !== "undefined") {
      const savedScrollPosition = localStorage.getItem(
        "sidebar:scrollPosition"
      );
      if (savedScrollPosition) {
        const scrollTop = parseInt(savedScrollPosition, 10);
        // Use setTimeout to ensure the DOM is fully rendered
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollTop;
          }
        }, 0);
      }
    }
  }, []);

  // Save scroll position when scrolling
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      try {
        localStorage.setItem(
          "sidebar:scrollPosition",
          scrollContainer.scrollTop.toString()
        );
      } catch {
        // ignore write errors
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleItemClick = (path: string) => {
    onNavigate(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Build navigation items from accessible pages
  const navigationItems = accessiblePages.map((page) => {
    // Prefer backend-provided Feather icon name (e.g., "FiHome"). Fallback to heuristic.
    let IconComp: React.ElementType;
    const pageIconName = (page as any)?.icon as unknown;
    if (typeof pageIconName === "string" && pageIconName.trim().length > 0) {
      const FeatherIcon: IconType = getFeatherIcon(pageIconName);
      IconComp = FeatherIcon as unknown as React.ElementType;
    } else {
      IconComp = getIconForPage(page.name, page.path);
    }

    return {
      title: page.name,
      icon: IconComp,
      id: `page-${page.id_page}`,
      href: page.path,
      adminOnly: false, // Access control is now handled by the API
    };
  });

  // Always add dashboard if not present (fallback)
  const hasDashboard = navigationItems.some(
    (item) => item.href === "/" || item.href === "/dashboard"
  );
  if (!hasDashboard) {
    navigationItems.unshift({
      title: "Dashboard",
      icon: Home,
      id: "dashboard",
      href: "/",
      adminOnly: false,
    });
  }

  return (
    <div
      className={`${
        isExpanded ? "w-72" : "w-20"
      } bg-white border-r border-gray-200 h-screen transition-all duration-300 ease-in-out flex flex-col sticky top-0`}
    >
      {/* Header with Profile and Collapse */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* User Profile */}
          {user && isExpanded && (
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 rounded-2xl p-3 flex-shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="secondary"
                    className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border-blue-200 text-left"
                  >
                    {/* Safely access role_name and apply transformations */}
                    {user.role_name === "admin"
                      ? "Admin"
                      : user.role_name?.replace("_", " ").toUpperCase() || ""}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Online • Active
                </p>
              </div>
            </div>
          )}

          {/* Collapse Button - Only show when expanded */}
          {isExpanded && user && (
            <Button
              onClick={() => setExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
              className="rounded-xl p-2 hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-all duration-200"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Expand Button - Only show when collapsed */}
        {!isExpanded && (
          <div className="flex justify-center">
            <Button
              onClick={() => setExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
              className="rounded-xl p-2 hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-all duration-200"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Section */}
      <div ref={scrollContainerRef} className="p-4 flex-1 overflow-y-auto">
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = activeSection === item.href;

            return (
              <div key={item.id}>
                <button
                  onClick={() => handleItemClick(item.href)}
                  className={`w-full group relative flex items-center ${
                    isExpanded
                      ? "justify-between px-4 py-3"
                      : "justify-center p-3"
                  } rounded-2xl text-left transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                  title={!isExpanded ? item.title : undefined}
                >
                  <div
                    className={`flex items-center ${
                      isExpanded ? "space-x-3" : "justify-center"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-600"
                      }`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                    </div>
                    {isExpanded && (
                      <div className="flex-1">
                        <span className="font-medium text-sm">
                          {item.title}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        {/* Logout Button */}
        {isExpanded && (
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full rounded-2xl bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 transition-all duration-200 flex items-center justify-center font-medium"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="text-sm">Sign Out</span>
          </Button>
        )}
      </div>
    </div>
  );
}
