import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";

const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const AcademicResultsPage = lazy(() => import("@/features/results/AcademicResultsPage"));
const BacklogReportPage = lazy(() => import("@/features/backlog/BacklogReportPage"));
const ClassResultsPage = lazy(() => import("@/features/class-results/ClassResultsPage"));
const CreditsAnalyzerPage = lazy(() => import("@/features/credits/CreditsAnalyzerPage"));
const ResultComparePage = lazy(() => import("@/features/compare/ResultComparePage"));
const PerformanceTrendsPage = lazy(() => import("@/features/trends/PerformanceTrendsPage"));
const NotificationsPage = lazy(() => import("@/features/notifications/NotificationsPage"));
const HelpCenterPage = lazy(() => import("@/features/help/HelpCenterPage"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "academic-results", element: <AcademicResultsPage /> },
      { path: "backlog-report", element: <BacklogReportPage /> },
      { path: "class-results", element: <ClassResultsPage /> },
      { path: "credits-analyzer", element: <CreditsAnalyzerPage /> },
      { path: "result-compare", element: <ResultComparePage /> },
      { path: "performance-trends", element: <PerformanceTrendsPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "help-center", element: <HelpCenterPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
