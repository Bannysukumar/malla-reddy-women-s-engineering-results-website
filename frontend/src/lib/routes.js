export const PAGES = {
  home: { id: "home", path: "home", label: "Home", hash: "#/" },
  academicResult: { id: "academic-result", path: "academic-result", label: "Academic Result", hash: "#/academic-result" },
  backlogReport: { id: "backlog-report", path: "backlog-report", label: "Backlog Report", hash: "#/backlog-report" },
  classResult: { id: "class-result", path: "class-result", label: "Class Result", hash: "#/class-result" },
  resultContrast: { id: "result-contrast", path: "result-contrast", label: "Result Contrast", hash: "#/result-contrast" },
  helpCenter: { id: "help-center", path: "help-center", label: "Help center", hash: "#/help-center" },
};

export const NAV_ITEMS = [
  PAGES.home,
  PAGES.academicResult,
  PAGES.backlogReport,
  PAGES.classResult,
  PAGES.resultContrast,
  PAGES.helpCenter,
];

export const HOME_CARDS = [
  {
    pageId: PAGES.academicResult.id,
    title: "Academic Result",
    description: "Access your overall academic performance with just a hall ticket.",
  },
  {
    pageId: PAGES.backlogReport.id,
    title: "Backlog Report",
    description: "View your backlog subjects and pending credits in one clear report.",
  },
  {
    pageId: PAGES.classResult.id,
    title: "Class Result",
    description: "View class rankings and compare performance across your section.",
  },
  {
    pageId: PAGES.resultContrast.id,
    title: "Result Contrast",
    description: "Compare CGPA and subject grades between two hall tickets side by side.",
  },
];

export function getPageIdFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  if (!raw || raw === "home") return PAGES.home.id;
  const match = NAV_ITEMS.find((item) => item.path === raw);
  return match ? match.id : PAGES.home.id;
}

export function navigateTo(pageId) {
  const page = NAV_ITEMS.find((item) => item.id === pageId) || PAGES.home;
  window.location.hash = page.hash;
}
