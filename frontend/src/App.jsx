import { useEffect, useState } from "react";
import SEOHead from "./components/SEOHead";
import DashboardLayout from "./layout/DashboardLayout";
import { getPageIdFromHash, PAGES } from "./lib/routes";
import HomePage from "./pages/HomePage";
import AcademicResultPage from "./pages/AcademicResultPage";
import BacklogReportPage from "./pages/BacklogReportPage";
import ClassResultPage from "./pages/ClassResultPage";
import ResultContrastPage from "./pages/ResultContrastPage";
import HelpCenterPage from "./pages/HelpCenterPage";

const PAGE_COMPONENTS = {
  [PAGES.home.id]: HomePage,
  [PAGES.academicResult.id]: AcademicResultPage,
  [PAGES.backlogReport.id]: BacklogReportPage,
  [PAGES.classResult.id]: ClassResultPage,
  [PAGES.resultContrast.id]: ResultContrastPage,
  [PAGES.helpCenter.id]: HelpCenterPage,
};

export default function App() {
  const [activePage, setActivePage] = useState(getPageIdFromHash);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("mrecw-theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("mrecw-theme", theme);
  }, [theme]);

  useEffect(() => {
    function onHashChange() {
      setActivePage(getPageIdFromHash());
      window.scrollTo(0, 0);
    }
    if (!window.location.hash) window.location.hash = PAGES.home.hash;
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  const Page = PAGE_COMPONENTS[activePage] || HomePage;

  return (
    <>
      <SEOHead pageId={activePage} />
      <DashboardLayout activePage={activePage} theme={theme} onToggleTheme={toggleTheme}>
        <Page />
      </DashboardLayout>
    </>
  );
}
