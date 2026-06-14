import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  CalendarCheck,
  Database,
  GraduationCap,
  HardDriveDownload,
  ListOrdered,
  Medal,
  RefreshCw,
  Search,
  Ticket,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import {
  type AdminScrapeJobType,
  fetchAdminStats,
  streamAdminScrape,
} from "@/shared/lib/adminApi";

interface ScrapeLogEntry {
  id: string;
  type: "updated" | "unchanged" | "failed";
  hallTicket: string;
  message?: string;
}

const SCRAPE_JOBS: {
  id: AdminScrapeJobType;
  label: string;
  description: string;
  icon: LucideIcon;
  statKey?: keyof import("@/shared/lib/adminApi").AdminStats;
}[] = [
  {
    id: "results",
    label: "Academic Results",
    description: "Re-scrape full marksheets for all stored hall tickets",
    icon: GraduationCap,
    statKey: "storedStudents",
  },
  {
    id: "semwise-marks",
    label: "Semester-wise Marks",
    description: "Refresh semester-grouped marks for all stored students",
    icon: BookOpenCheck,
    statKey: "storedSemwiseMarks",
  },
  {
    id: "overall-result",
    label: "Overall Result",
    description: "Refresh SGPA/CGPA summary for all stored students",
    icon: ListOrdered,
    statKey: "storedOverallResults",
  },
  {
    id: "attendance",
    label: "Overall Attendance",
    description: "Refresh attendance records for all stored students",
    icon: CalendarCheck,
    statKey: "storedAttendance",
  },
  {
    id: "exam-hall-tickets",
    label: "Exam Hall Tickets",
    description: "Refresh external exam hall tickets for all stored students",
    icon: Ticket,
    statKey: "storedExamHallTickets",
  },
  {
    id: "class-results",
    label: "Class Results",
    description: "Re-scrape all cached class/section rankings in Firebase",
    icon: Medal,
    statKey: "storedClassResults",
  },
];

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [activeJob, setActiveJob] = useState<AdminScrapeJobType | null>(null);
  const [scrapeLogs, setScrapeLogs] = useState<ScrapeLogEntry[]>([]);
  const [scrapeProgress, setScrapeProgress] = useState<{ current: number; total: number; ticket?: string } | null>(null);
  const [scrapeSummary, setScrapeSummary] = useState<{ updated: number; unchanged: number; failed: number; total: number } | null>(null);
  const [scrapeError, setScrapeError] = useState("");
  const logId = useRef(0);

  const { data: stats, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    refetchInterval: (q) => {
      const running = q.state.data?.bulkScrapeRunning;
      return running && Object.values(running).some(Boolean) ? 3000 : false;
    },
  });

  const bulkScrape = useMutation({
    mutationFn: async (jobType: AdminScrapeJobType) => {
      setActiveJob(jobType);
      setScrapeLogs([]);
      setScrapeSummary(null);
      setScrapeProgress(null);
      setScrapeError("");

      await streamAdminScrape(jobType, (event) => {
        const type = event.type as string;

        if (type === "start") {
          setScrapeProgress({ current: 0, total: 0 });
        } else if (type === "progress") {
          setScrapeProgress({
            current: event.current as number,
            total: event.total as number,
            ticket: event.hallTicket as string | undefined,
          });
        } else if (type === "updated" || type === "unchanged" || type === "failed") {
          logId.current += 1;
          setScrapeLogs((prev) => [
            {
              id: String(logId.current),
              type: type as ScrapeLogEntry["type"],
              hallTicket: event.hallTicket as string,
              message: type === "failed" ? (event.error as string) : undefined,
            },
            ...prev.slice(0, 49),
          ]);
        } else if (type === "done") {
          setScrapeSummary({
            updated: (event.updated as number) || 0,
            unchanged: (event.unchanged as number) || 0,
            failed: (event.failed as number) || 0,
            total: (event.total as number) || 0,
          });
          setScrapeProgress(null);
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        } else if (type === "error") {
          throw new Error((event.message as string) || "Bulk scrape failed");
        }
      });
    },
    onError: (err) => {
      setScrapeError((err as Error).message);
      setScrapeProgress(null);
    },
    onSettled: () => {
      setActiveJob(null);
    },
  });

  const statCards = [
    { label: "Stored Students", value: stats?.storedStudents ?? 0, icon: Users, color: "text-primary-light", bg: "bg-primary/10" },
    { label: "Total Searches", value: stats?.totalSearches ?? 0, icon: Search, color: "text-sky-400", bg: "bg-sky-500/10" },
    { label: "Unique Students Searched", value: stats?.uniqueStudentsSearched ?? 0, icon: Database, color: "text-success", bg: "bg-success/10" },
    { label: "Stored Backlogs", value: stats?.storedBacklogs ?? 0, icon: HardDriveDownload, color: "text-warning", bg: "bg-warning/10" },
  ];

  const handleScrape = useCallback(
    (job: (typeof SCRAPE_JOBS)[number]) => {
      if (!window.confirm(`Start bulk scrape for ${job.label}? This may take a long time.`)) return;
      bulkScrape.mutate(job.id);
    },
    [bulkScrape]
  );

  const isJobRunning = (jobId: AdminScrapeJobType) =>
    bulkScrape.isPending && activeJob === jobId || stats?.bulkScrapeRunning?.[jobId];

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Admin Dashboard"
        description="Monitor portal usage and refresh cached student data"
        action={
          <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 inline h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Stats
          </Button>
        }
      />

      {!stats?.firebaseEnabled && (
        <div className="flex items-center gap-3 rounded-card border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          Firebase is not configured on the backend. Stats and bulk scrape require Firestore.
        </div>
      )}

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
          {statCards.map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="admin-stat-card">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-3xl font-bold tabular-nums tracking-tight">{isLoading ? "—" : card.value.toLocaleString()}</div>
                  <div className="mt-1 text-sm text-muted">{card.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Bulk Scrape by Page</h2>
        <p className="mb-6 text-sm text-muted">
          Re-scrape and store data in Firebase for every stored hall ticket (or cached class section). Each button runs independently on the server.
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SCRAPE_JOBS.map((job) => {
            const Icon = job.icon;
            const count = job.statKey && stats ? (stats[job.statKey] as number | undefined) ?? 0 : undefined;
            const running = isJobRunning(job.id);
            return (
              <div key={job.id} className="admin-panel-card flex flex-col">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-light">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold">{job.label}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{job.description}</p>
                    {count != null && (
                      <p className="mt-2 font-mono text-xs text-muted">{count.toLocaleString()} cached records</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => handleScrape(job)}
                    loading={bulkScrape.isPending && activeJob === job.id}
                    disabled={!stats?.firebaseEnabled || running}
                  >
                    <HardDriveDownload className="mr-2 inline h-4 w-4" />
                    Scrape All
                  </Button>
                  {running && <Badge variant="warning">Running</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {(scrapeProgress || scrapeSummary || scrapeError) && (
        <section className="admin-panel-card">
          <h2 className="font-display text-lg font-semibold">
            Scrape Progress{activeJob ? `: ${SCRAPE_JOBS.find((j) => j.id === activeJob)?.label ?? activeJob}` : ""}
          </h2>

          {scrapeProgress && (
            <div className="mt-6 space-y-3 rounded-xl border border-foreground/10 bg-surface-elevated/50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Progress</span>
                <span className="font-mono font-medium">
                  {scrapeProgress.current} / {scrapeProgress.total}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: scrapeProgress.total
                      ? `${(scrapeProgress.current / scrapeProgress.total) * 100}%`
                      : "0%",
                  }}
                />
              </div>
              {scrapeProgress.ticket && (
                <p className="font-mono text-xs text-muted">Current: {scrapeProgress.ticket}</p>
              )}
            </div>
          )}

          {scrapeSummary && (
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-4 w-4" /> {scrapeSummary.updated} updated
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <CheckCircle2 className="h-4 w-4" /> {scrapeSummary.unchanged} unchanged
              </span>
              <span className="flex items-center gap-1.5 text-error">
                <XCircle className="h-4 w-4" /> {scrapeSummary.failed} failed
              </span>
            </div>
          )}

          {scrapeError && <p className="mt-4 text-sm text-error">{scrapeError}</p>}
        </section>
      )}

      {scrapeLogs.length > 0 && (
        <div className="admin-panel-card">
          <h2 className="font-display text-lg font-semibold">Scrape Activity</h2>
          <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-foreground/10 bg-surface-elevated/30 p-4 text-sm">
            {scrapeLogs.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 font-mono">
                {entry.type === "updated" && <Badge variant="success">updated</Badge>}
                {entry.type === "unchanged" && <Badge>unchanged</Badge>}
                {entry.type === "failed" && <Badge variant="error">failed</Badge>}
                <span>{entry.hallTicket}</span>
                {entry.message && <span className="truncate text-error">— {entry.message}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="admin-panel-card">
        <h2 className="font-display text-lg font-semibold">Other Cache Collections</h2>
        <dl className="mt-4 space-y-0 text-sm">
          {[
            ["Result Compares", stats?.storedResultCompares ?? 0],
            ["Credits Compares", stats?.storedCreditsCompares ?? 0],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-center justify-between border-b border-foreground/10 py-4 last:border-0">
              <dt className="text-muted">{label}</dt>
              <dd className="font-mono text-base font-semibold tabular-nums">{value as number}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
