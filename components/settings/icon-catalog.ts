import * as Fi from "react-icons/fi"
import type { IconType } from "react-icons"

export type IconCatalogItem = { name: string; label: string; Icon: IconType }

// Centralized outlined Feather Icons catalog for page icons
const NAMES = [
  "FiHome",
  "FiFileText",
  "FiSettings",
  "FiUsers",
  "FiUser",
  "FiUserCheck",
  "FiUserPlus",
  "FiDatabase",
  "FiBarChart2",
  "FiActivity",
  "FiMonitor",
  "FiLayers",
  "FiCompass",
  "FiGrid",
  "FiList",
  "FiMap",
  "FiMapPin",
  "FiBell",
  "FiLock",
  "FiKey",
  "FiServer",
  "FiTool",
  "FiBook",
  "FiBookmark",
  "FiBriefcase",
  "FiCalendar",
  "FiCheckSquare",
  "FiClipboard",
  "FiClock",
  "FiCloud",
  "FiCode",
  "FiCommand",
  "FiCpu",
  "FiCreditCard",
  "FiDollarSign",
  "FiDownload",
  "FiEdit",
  "FiExternalLink",
  "FiEye",
  "FiFeather",
  "FiFilter",
  "FiFlag",
  "FiFolder",
  "FiGlobe",
  "FiHeart",
  "FiHelpCircle",
  "FiInbox",
  "FiLink",
  "FiLogIn",
  "FiLogOut",
  "FiMail",
  "FiPieChart",
  "FiRefreshCw",
  "FiSearch",
  "FiSend",
  "FiSettings",
  "FiShield",
  "FiShoppingCart",
  "FiSidebar",
  "FiSliders",
  "FiStar",
  "FiSun",
  "FiTag",
  "FiTarget",
  "FiTerminal",
  "FiThumbsUp",
  "FiTrendingUp",
  "FiTrendingDown",
  "FiUpload",
  "FiZap",
] as const

// Ensure uniqueness to prevent duplicate keys in React lists
const UNIQUE_NAMES = Array.from(new Set(NAMES))

export const ICON_CATALOG: IconCatalogItem[] = UNIQUE_NAMES.map((n) => ({
  name: n,
  label: n.replace(/^Fi/, ""),
  Icon: (Fi as Record<string, IconType>)[n] || Fi.FiFileText,
}))

export function getFeatherIcon(name?: string): IconType {
  const Icon = (Fi as Record<string, IconType>)[name || "FiFileText"]
  return Icon || Fi.FiFileText
}
