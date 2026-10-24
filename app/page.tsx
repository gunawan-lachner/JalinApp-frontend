"use client";

import { useMemo, useState, type ElementType } from "react";
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
  Cpu,
  Layers,
  Loader2,
  Home,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { getFeatherIcon } from "@/components/settings/icon-catalog";
import { useAuth } from "@/contexts/auth-context";

/** Paths that should never appear as Explore shortcut cards */
const EXPLORE_HIDDEN_PATHS = new Set(["/", "/dashboard", "/login", "/ide"]);

const PATH_META: Record<
  string,
  { icon: ElementType; color: string; bg: string }
> = {
  "/": { icon: Home, color: "text-blue-600", bg: "bg-blue-50" },
  "/transaction-routing": {
    icon: Route,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  "/routing-simulation": {
    icon: Activity,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  "/transaction": {
    icon: CreditCard,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  "/database": { icon: Database, color: "text-amber-600", bg: "bg-amber-50" },
  "/queries": { icon: FileText, color: "text-teal-600", bg: "bg-teal-50" },
  "/gateway": { icon: Network, color: "text-rose-600", bg: "bg-rose-50" },
  "/participant": { icon: Users, color: "text-sky-600", bg: "bg-sky-50" },
  "/ssh-client": {
    icon: Terminal,
    color: "text-gray-700",
    bg: "bg-gray-100",
  },
  "/file-transfer": {
    icon: FileText,
    color: "text-gray-700",
    bg: "bg-gray-100",
  },
  "/renjs": { icon: FileCode2, color: "text-violet-600", bg: "bg-violet-50" },
  "/container-plugin": {
    icon: Cpu,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  "/gmm": { icon: Layers, color: "text-orange-600", bg: "bg-orange-50" },
  "/settings": { icon: Settings, color: "text-gray-700", bg: "bg-gray-100" },
  "/compare": { icon: Database, color: "text-amber-600", bg: "bg-amber-50" },
  "/log-extractor": {
    icon: FileText,
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  "/network-message": {
    icon: Activity,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  "/connections": {
    icon: Database,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
};

function formatRoleName(roleName?: string | null) {
  if (!roleName) return "Unknown";
  if (roleName === "admin") return "Admin";
  return roleName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function JalinApp() {
  const router = useRouter();
  const { user, accessiblePages, loading } = useAuth();
  const [activeSection, setActiveSection] = useState("/");

  const handleNavigation = (href: string) => {
    // Skip non-routable menu group stubs
    if (EXPLORE_HIDDEN_PATHS.has(href)) return;
    router.push(href);
    setActiveSection(href);
  };

  const roleLabel = formatRoleName(user?.role_name);

  const pagesToShow = useMemo(() => {
    const pages = accessiblePages || [];
    const parentIds = new Set(
      pages.map((p) => p.parent_id).filter((id): id is number => id != null),
    );
    const byId = new Map(pages.map((p) => [p.id_page, p]));

    return pages
      .filter((p) => {
        if (!p.path || EXPLORE_HIDDEN_PATHS.has(p.path)) return false;
        // Hide menu-group parents (IDE, SSH, …) — only show leaf pages
        if (parentIds.has(p.id_page)) return false;
        return true;
      })
      .sort(
        (a, b) =>
          (a.page_order ?? 0) - (b.page_order ?? 0) ||
          a.name.localeCompare(b.name),
      )
      .map((p) => {
        const meta = PATH_META[p.path] ?? {
          icon: ShieldCheck,
          color: "text-blue-600",
          bg: "bg-blue-50",
        };
        let IconComp: ElementType = meta.icon;
        if (typeof p.icon === "string" && p.icon.trim().length > 0) {
          IconComp = getFeatherIcon(p.icon) as unknown as ElementType;
        }
        const parentName = p.parent_id
          ? byId.get(p.parent_id)?.name || null
          : null;
        return {
          id: p.id_page,
          title: p.name,
          href: p.path,
          parentName,
          icon: IconComp,
          color: meta.color,
          bg: meta.bg,
        };
      });
  }, [accessiblePages]);

  const renderContent = () => {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Message */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome back,{" "}
                {(user?.full_name || user?.username || "").trim() || "User"}!
              </h2>
              <p className="text-gray-600">
                Quick links sesuai akses role Anda di bawah ini.
              </p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              Role: {roleLabel}
            </span>
          </div>
        </div>

        {/* Explore Pages — strictly from role-assigned pages */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Explore</h3>
            <span className="text-xs text-gray-500">
              {loading
                ? "Memuat akses..."
                : `${pagesToShow.length} halaman untuk role ${roleLabel}`}
            </span>
          </div>

          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-blue-600" />
            <p>
              Daftar di bawah hanya menampilkan halaman yang di-assign ke role{" "}
              <span className="font-semibold">{roleLabel}</span>. Atur akses di
              Settings → Page Management. Untuk akses tambahan, hubungi
              administrator.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Memuat halaman sesuai role...
            </div>
          ) : pagesToShow.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-600">
                Role Anda belum memiliki akses ke halaman mana pun. Hubungi
                administrator untuk permission.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {pagesToShow.map((p) => (
                <div
                  key={p.id}
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {p.title}
                          </h4>
                          {p.parentName && (
                            <p className="text-xs text-violet-600 mt-0.5">
                              {p.parentName}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 group-hover:text-gray-700 flex-shrink-0">
                          Open →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  <span className="font-medium">
                    {(user?.full_name || user?.username || "").trim()}
                    {user?.role_name
                      ? ` (${user.role_name.replace(/_/g, " ").toUpperCase()})`
                      : ""}
                  </span>
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
