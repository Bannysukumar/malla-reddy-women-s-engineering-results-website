import { BellIcon, MenuIcon, MoonIcon, SunIcon } from "../components/Icons";

export default function TopBar({ theme, onToggleTheme, onMenuOpen }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[rgb(var(--border)/0.08)] bg-[rgb(var(--surface)/0.92)] px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          className="rounded-lg p-2 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--border)/0.06)] lg:hidden"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <span className="font-display text-base font-bold tracking-wide lg:text-lg">MRECW Results</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border)/0.1)] bg-[rgb(var(--surface-card)/0.5)] transition hover:bg-[rgb(var(--border)/0.06)]"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border)/0.1)] bg-[rgb(var(--surface-card)/0.5)] text-[rgb(var(--text-muted))] transition hover:bg-[rgb(var(--border)/0.06)]"
          aria-label="Notifications"
        >
          <BellIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
