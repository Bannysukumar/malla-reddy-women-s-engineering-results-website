import { MAIN_NAV } from "@/shared/constants/navigation";
import { cn } from "@/shared/lib/cn";
import { NavLink } from "react-router-dom";

export function MobileNav() {
  const items = MAIN_NAV.slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/10 bg-surface-card/95 backdrop-blur-glass lg:hidden" aria-label="Mobile navigation">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium",
                isActive ? "bg-primary/15 text-primary-light" : "text-muted"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span className="truncate">{item.label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
