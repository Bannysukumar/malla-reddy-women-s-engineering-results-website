import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CircleHelp,
  GitCompare,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  Medal,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  description?: string;
}

export const MAIN_NAV: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, description: "Overview & quick actions" },
  { label: "Academic Results", path: "/academic-results", icon: GraduationCap, description: "Full marksheet & CGPA" },
  { label: "Backlog Report", path: "/backlog-report", icon: BookOpen, description: "Failed subjects report" },
  { label: "Class Results", path: "/class-results", icon: Medal, description: "Section rankings" },
  { label: "Credits Analyzer", path: "/credits-analyzer", icon: Wallet, description: "Credit completion tracker" },
  { label: "Result Compare", path: "/result-compare", icon: GitCompare, description: "Compare two students" },
  { label: "Performance Trends", path: "/performance-trends", icon: LineChart, description: "SGPA & analytics" },
  { label: "Notifications", path: "/notifications", icon: Bell, description: "Updates & alerts" },
  { label: "Help Center", path: "/help-center", icon: CircleHelp, description: "FAQ & support" },
];

export const DASHBOARD_CARDS = [
  {
    title: "Academic Result",
    description: "View complete semester marks, grades and CGPA instantly.",
    path: "/academic-results",
    icon: GraduationCap,
    gradient: "from-violet-600/30 to-indigo-600/10",
    stat: "Full marksheet",
  },
  {
    title: "Backlog Report",
    description: "Identify failed subjects and pending credits at a glance.",
    path: "/backlog-report",
    icon: BookOpen,
    gradient: "from-red-600/20 to-orange-600/10",
    stat: "Backlog scan",
  },
  {
    title: "Class Rank",
    description: "Compare CGPA rankings across your entire section.",
    path: "/class-results",
    icon: Medal,
    gradient: "from-amber-600/20 to-yellow-600/10",
    stat: "Section rank",
  },
  {
    title: "Credits Tracker",
    description: "Track earned vs required credits for progression.",
    path: "/credits-analyzer",
    icon: Wallet,
    gradient: "from-emerald-600/20 to-teal-600/10",
    stat: "Credit progress",
  },
  {
    title: "CGPA Analyzer",
    description: "Deep dive into semester performance trends.",
    path: "/performance-trends",
    icon: BarChart3,
    gradient: "from-purple-600/30 to-fuchsia-600/10",
    stat: "Analytics",
  },
  {
    title: "Compare Results",
    description: "Side-by-side comparison of two hall tickets.",
    path: "/result-compare",
    icon: GitCompare,
    gradient: "from-blue-600/20 to-cyan-600/10",
    stat: "Head-to-head",
  },
] as const;
