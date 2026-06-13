import { ChevronLeft, GraduationCap } from "lucide-react";
import { NavLink } from "react-router-dom";
import { MAIN_NAV } from "@/shared/constants/navigation";
import { cn } from "@/shared/lib/cn";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <button type="button" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} aria-label="Close menu" />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-foreground/10 bg-surface-card transition-all duration-300 lg:sticky lg:top-0 lg:z-30 lg:h-screen",
          collapsed ? "w-[88px]" : "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-[72px] items-center gap-3 border-b border-foreground/10 px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary-light">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-bold">MRECW Results</div>
              <div className="truncate text-xs text-muted">Autonomous · Hyderabad</div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onClose}
              className={({ isActive }) => cn("sidebar-link", isActive && "sidebar-link-active")}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-foreground/10 p-3 lg:block">
          <button type="button" onClick={onToggle} className="sidebar-link">
            <ChevronLeft className={cn("h-[18px] w-[18px] transition", collapsed && "rotate-180")} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
