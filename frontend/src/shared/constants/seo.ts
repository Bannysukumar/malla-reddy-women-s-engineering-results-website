export const SITE_URL = import.meta.env.VITE_SITE_URL || "https://mrecwexamcell.vercel.app";

export const SEO = {
  defaultTitle: "MRECW Results Portal — Malla Reddy Engineering College for Women",
  defaultDescription:
    "Fast, secure and smart academic insights for MRECW students. Check results, backlog reports, class rankings, credits and analytics without login.",
  keywords:
    "MRECW results, Malla Reddy Engineering College for Women, MRECW exam results, MRECW CGPA, backlog report, class results Hyderabad",
  siteName: "MRECW Results Portal",
  locale: "en_IN",
};

export const PAGE_SEO: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard — MRECW Results Portal",
    description: "Academic dashboard for MRECW students with instant results, analytics and class insights.",
  },
  "/academic-results": {
    title: "Academic Results — MRECW Results Portal",
    description: "Check individual academic results, CGPA and semester grades by hall ticket.",
  },
  "/backlog-report": {
    title: "Backlog Report — MRECW Results Portal",
    description: "View backlog subjects and failed courses for MRECW students.",
  },
  "/class-results": {
    title: "Class Results — MRECW Results Portal",
    description: "Section-wide CGPA rankings and class performance for MRECW.",
  },
  "/credits-analyzer": {
    title: "Credits Analyzer — MRECW Results Portal",
    description: "Analyze credit completion and academic progression at MRECW.",
  },
  "/result-compare": {
    title: "Result Compare — MRECW Results Portal",
    description: "Compare academic performance between two MRECW hall tickets.",
  },
  "/performance-trends": {
    title: "Performance Trends — MRECW Results Portal",
    description: "Semester-wise SGPA, CGPA growth and academic analytics.",
  },
  "/notifications": {
    title: "Notifications — MRECW Results Portal",
    description: "Portal updates and academic notifications for MRECW students.",
  },
  "/help-center": {
    title: "Help Center — MRECW Results Portal",
    description: "FAQ and support for using the MRECW Results Portal.",
  },
};

export const FAQ_ITEMS = [
  {
    q: "How do I check my MRECW results?",
    a: "Enter your hall ticket on the dashboard or Academic Results page. Results appear within about 20–30 seconds without any login.",
  },
  {
    q: "What is the hall ticket format?",
    a: "Example: 23RH1A0511 — batch year, college code, section, and roll number combined.",
  },
  {
    q: "How do class results work?",
    a: "Enter any hall ticket from your section. The portal derives the section prefix and fetches ranked CGPA for the class.",
  },
  {
    q: "Is this portal free?",
    a: "Yes. MRECW Results Portal is completely free for all MRECW students.",
  },
];
