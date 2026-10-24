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
  ChevronDown,
  LogOut,
  Settings as LucideSettings,
  User,
  Users,
  GitCompare,
  FileText,
  Activity,
  Shield,
  FileCode2,
  Code2,
  Cpu,
  Layers,
} from "lucide-react";
import type { IconType } from "react-icons";
import { getFeatherIcon } from "../settings/icon-catalog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

type NavItem = {
  title: string;
  icon: React.ElementType;
  id: string;
  href: string;
  pageId?: number;
  parentId?: number | null;
  adminOnly: boolean;
};

type NavGroup = {
  type: "group";
  id: string;
  title: string;
  icon: React.ElementType;
  href?: string;
  children: NavItem[];
};

type NavEntry = ({ type: "item" } & NavItem) | NavGroup;

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
  if (
    lowerName.includes("container plugin") ||
    lowerPath.includes("container-plugin")
  )
    return Cpu;
  if (lowerName.includes("gmm") || lowerPath.includes("gmm")) return Layers;
  if (lowerName.includes("ide") || lowerPath.includes("ide")) return Code2;

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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("sidebar:expandedGroups");
          if (stored) return JSON.parse(stored) as Record<string, boolean>;
        } catch {
          // ignore parse errors
        }
      }
      return {};
    }
  );

  const setExpanded = (value: boolean) => {
    setIsExpanded(value);
    try {
      localStorage.setItem("sidebar:expanded", value ? "1" : "0");
    } catch {
      // ignore write errors
    }
  };

  const setGroupExpanded = (groupId: string, value: boolean) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: value };
      try {
        localStorage.setItem("sidebar:expandedGroups", JSON.stringify(next));
      } catch {
        // ignore write errors
      }
      return next;
    });
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

  // Auto-expand parent group when a child route is active
  useEffect(() => {
    const currentPath = activeSection || pathname;
    const activeChild = accessiblePages.find((page) => page.path === currentPath);
    if (!activeChild?.parent_id) return;
    const groupId = `group-${activeChild.parent_id}`;
    setExpandedGroups((prev) => {
      if (prev[groupId]) return prev;
      const next = { ...prev, [groupId]: true };
      try {
        localStorage.setItem("sidebar:expandedGroups", JSON.stringify(next));
      } catch {
        // ignore write errors
      }
      return next;
    });
  }, [activeSection, pathname, accessiblePages]);

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
  const flatItems: NavItem[] = accessiblePages
    .slice()
    .sort(
      (a, b) =>
        (a.page_order ?? 0) - (b.page_order ?? 0) ||
        a.name.localeCompare(b.name)
    )
    .map((page) => {
      // Prefer backend-provided Feather icon name (e.g., "FiHome"). Fallback to heuristic.
      let IconComp: React.ElementType;
      const pageIconName = page.icon;
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
        pageId: page.id_page,
        parentId: page.parent_id ?? null,
        adminOnly: false, // Access control is now handled by the API
      };
    });

  // Always add dashboard if not present (fallback)
  const hasDashboard = flatItems.some(
    (item) => item.href === "/" || item.href === "/dashboard"
  );
  if (!hasDashboard) {
    flatItems.unshift({
      title: "Dashboard",
      icon: Home,
      id: "dashboard",
      href: "/",
      adminOnly: false,
    });
  }

  // Build nested menu entries from parent_id
  const childrenByParent = new Map<number, NavItem[]>();
  for (const item of flatItems) {
    if (item.parentId != null) {
      const list = childrenByParent.get(item.parentId) || [];
      list.push(item);
      childrenByParent.set(item.parentId, list);
    }
  }

  const navigationEntries: NavEntry[] = [];
  const insertedParentIds = new Set<number>();

  for (const item of flatItems) {
    // Skip child pages; they render under their parent group
    if (item.parentId != null) continue;

    const children =
      item.pageId != null ? childrenByParent.get(item.pageId) || [] : [];

    if (children.length > 0 && item.pageId != null) {
      navigationEntries.push({
        type: "group",
        id: `group-${item.pageId}`,
        title: item.title,
        icon: item.icon,
        href: item.href,
        children,
      });
      insertedParentIds.add(item.pageId);
      continue;
    }

    navigationEntries.push({ type: "item", ...item });
  }

  // Orphan children whose parent is missing from accessible pages
  for (const [parentId, children] of childrenByParent.entries()) {
    if (insertedParentIds.has(parentId) || children.length === 0) continue;
    navigationEntries.push({
      type: "group",
      id: `group-${parentId}`,
      title: "Menu",
      icon: Code2,
      children,
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
            <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
              <div className="bg-blue-500 rounded-2xl p-3 flex-shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold text-gray-900 truncate"
                  title={`${(user.full_name || user.username || "").trim()} (${(
                    user.role_name || ""
                  )
                    .replace(/_/g, " ")
                    .toUpperCase()})`}
                >
                  {(user.full_name || user.username || "").trim()}
                  {user.role_name
                    ? ` (${user.role_name.replace(/_/g, " ").toUpperCase()})`
                    : ""}
                </p>
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
          {navigationEntries.map((entry) => {
            if (entry.type === "group") {
              const isGroupOpen = !!expandedGroups[entry.id];
              const isGroupActive = entry.children.some(
                (child) =>
                  activeSection === child.href || pathname === child.href
              );

              return (
                <div key={entry.id}>
                  <button
                    onClick={() => {
                      if (!isExpanded) {
                        setExpanded(true);
                        setGroupExpanded(entry.id, true);
                        return;
                      }
                      setGroupExpanded(entry.id, !isGroupOpen);
                    }}
                    className={`w-full group relative flex items-center ${
                      isExpanded
                        ? "justify-between px-4 py-3"
                        : "justify-center p-3"
                    } rounded-2xl text-left transition-all duration-200 ${
                      isGroupActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                    title={!isExpanded ? entry.title : undefined}
                  >
                    <div
                      className={`flex items-center ${
                        isExpanded ? "space-x-3" : "justify-center"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl transition-all duration-200 ${
                          isGroupActive
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-600"
                        }`}
                      >
                        <entry.icon className="h-4 w-4 flex-shrink-0" />
                      </div>
                      {isExpanded && (
                        <div className="flex-1">
                          <span className="font-medium text-sm">
                            {entry.title}
                          </span>
                        </div>
                      )}
                    </div>
                    {isExpanded &&
                      (isGroupOpen ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      ))}
                  </button>

                  {isExpanded && isGroupOpen && (
                    <div className="mt-1 ml-4 space-y-1 border-l border-gray-200 pl-2">
                      {entry.children.map((child) => {
                        const isActive =
                          activeSection === child.href ||
                          pathname === child.href;

                        return (
                          <button
                            key={child.id}
                            onClick={() => handleItemClick(child.href)}
                            className={`w-full group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                              isActive
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`p-1.5 rounded-lg transition-all duration-200 ${
                                  isActive
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-600"
                                }`}
                              >
                                <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                              </div>
                              <span className="font-medium text-sm">
                                {child.title}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const item = entry;
            const isActive =
              activeSection === item.href || pathname === item.href;

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
