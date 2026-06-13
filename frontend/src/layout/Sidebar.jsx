import { NAV_ICONS } from "../components/Icons";
import { NAV_ITEMS, navigateTo } from "../lib/routes";

export default function Sidebar({ activePage, mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[rgb(var(--border)/0.08)] bg-[rgb(var(--surface-elevated)/0.98)] transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[rgb(var(--border)/0.08)] px-5 py-4 lg:hidden">
          <span className="font-display text-sm font-bold tracking-wide">MRECW Results</span>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[rgb(var(--border)/0.06)]" aria-label="Close">
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id] || NAV_ICONS.home;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigateTo(item.id);
                  onClose?.();
                }}
                className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
