import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/shared/components/ui/Input";

interface TopNavProps {
  onMenuOpen: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
}

export function TopNav({
  onMenuOpen,
  isDark,
  onToggleTheme,
  searchValue,
  onSearchChange,
  onSearchSubmit,
}: TopNavProps) {
  const navigate = useNavigate();

  return (
    <header className="glass-nav sticky top-0 z-20 flex h-[72px] items-center gap-4 px-4 lg:px-6">
      <button type="button" onClick={onMenuOpen} className="rounded-xl p-2 text-muted hover:bg-foreground/5 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
            placeholder="Search hall ticket…"
            className="h-11 py-2 pl-10 text-sm"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 transition hover:bg-foreground/10"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 transition hover:bg-foreground/10"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="hidden items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary-light">M</div>
          <div className="text-left leading-tight">
            <div className="text-xs font-semibold">MRECW Student</div>
            <div className="text-[10px] text-muted">Quick Access</div>
          </div>
        </div>
      </div>
    </header>
  );
}
