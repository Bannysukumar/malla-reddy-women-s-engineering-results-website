import { motion } from "framer-motion";
import { Suspense, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SEOHead } from "@/shared/components/SEOHead";
import { useTheme } from "@/shared/hooks/useTheme";
import { Footer } from "@/layouts/Footer";
import { MobileNav } from "@/layouts/MobileNav";
import { Sidebar } from "@/layouts/Sidebar";
import { TopNav } from "@/layouts/TopNav";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { toggle, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  function handleGlobalSearch() {
    const ticket = searchValue.trim().toUpperCase();
    if (!ticket) return;
    navigate(`/academic-results?ticket=${encodeURIComponent(ticket)}`);
  }

  return (
    <div className="min-h-screen bg-surface">
      <SEOHead path={location.pathname} />
      <div className="flex">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopNav
            onMenuOpen={() => setMobileOpen(true)}
            isDark={isDark}
            onToggleTheme={toggle}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSearchSubmit={handleGlobalSearch}
          />
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-auto w-full max-w-content flex-1 px-4 py-6 sm:px-6 lg:px-8"
          >
            <Suspense fallback={<div className="py-20 text-center text-muted">Loading…</div>}>
              <Outlet />
            </Suspense>
            <Footer />
          </motion.main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
