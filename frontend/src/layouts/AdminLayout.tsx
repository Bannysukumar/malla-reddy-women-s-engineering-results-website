import { LayoutDashboard, Link2, LogOut, MessageSquare, Shield, Users } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminLogout } from "@/shared/lib/adminApi";
import { cn } from "@/shared/lib/cn";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/footer", label: "Footer", icon: Link2 },
];

export function AdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    adminLogout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="glass-nav z-30 flex h-16 shrink-0 items-center justify-between border-b border-foreground/10 px-4 sm:px-6 lg:px-8">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary-light ring-1 ring-primary/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold leading-tight">MRECW Admin</div>
            <div className="text-xs text-muted">Portal control panel</div>
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="hidden rounded-btn px-3 py-2 text-sm text-muted transition hover:bg-foreground/5 hover:text-foreground sm:inline-flex"
          >
            Student Portal
          </Link>
          <button type="button" onClick={handleLogout} className="btn-secondary !px-3 !py-2 text-sm">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-foreground/10 bg-surface-card/40 md:flex md:flex-col">
          <nav className="flex flex-col gap-1 p-4 lg:p-5">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Menu</p>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-primary/15 text-primary-light shadow-glow ring-1 ring-primary/20"
                      : "text-muted hover:bg-foreground/5 hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="border-b border-foreground/10 bg-surface-elevated/30 px-4 py-3 md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition",
                      isActive ? "bg-primary/15 text-primary-light" : "bg-foreground/5 text-muted"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="admin-page mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
