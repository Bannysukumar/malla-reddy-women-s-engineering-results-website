import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  CircleHelp,
  GitCompare,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ListOrdered,
  Medal,
  Scale,
  Ticket,
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
  { label: "Semester-wise Marks", path: "/semwise-marks", icon: BookOpenCheck, description: "Marks grouped by semester" },
  { label: "Overall Result", path: "/overall-result", icon: ListOrdered, description: "Semester SGPA & CGPA summary" },
  { label: "Overall Attendance", path: "/attendance", icon: CalendarCheck, description: "Semester attendance report" },
  { label: "Backlog Report", path: "/backlog-report", icon: BookOpen, description: "Failed subjects report" },
  { label: "Exam Hall Tickets", path: "/exam-hall-tickets", icon: Ticket, description: "External exam hall tickets" },
  { label: "Class Results", path: "/class-results", icon: Medal, description: "Section rankings" },
  { label: "Credits Analyzer", path: "/credits-analyzer", icon: Wallet, description: "Credit completion tracker" },
  { label: "Credits Compare", path: "/credits-compare", icon: Scale, description: "Compare credits for two students" },
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
    title: "Semester-wise Marks",
    description: "Browse subject marks semester by semester with SGPA.",
    path: "/semwise-marks",
    icon: BookOpenCheck,
    gradient: "from-fuchsia-600/20 to-violet-600/10",
    stat: "By semester",
  },
  {
    title: "Overall Result",
    description: "Semester-wise SGPA and cumulative CGPA at a glance.",
    path: "/overall-result",
    icon: ListOrdered,
    gradient: "from-indigo-600/25 to-violet-600/10",
    stat: "SGPA / CGPA",
  },
  {
    title: "Overall Attendance",
    description: "Check month-wise and semester-wise attendance percentage.",
    path: "/attendance",
    icon: CalendarCheck,
    gradient: "from-emerald-600/20 to-teal-600/10",
    stat: "Attendance %",
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
    title: "Exam Hall Tickets",
    description: "Download external exam hall tickets from the official exam cell portal.",
    path: "/exam-hall-tickets",
    icon: Ticket,
    gradient: "from-sky-600/20 to-blue-600/10",
    stat: "Hall tickets",
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
    title: "Credits Compare",
    description: "Compare credit completion between two hall tickets.",
    path: "/credits-compare",
    icon: Scale,
    gradient: "from-teal-600/20 to-emerald-600/10",
    stat: "Credits vs credits",
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
