import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Award, ExternalLink, TrendingUp } from "lucide-react";
import { useState } from "react";
import { CacheBadge } from "@/shared/components/CacheBadge";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { Badge } from "@/shared/components/ui/Badge";
import { Card } from "@/shared/components/ui/Card";
import { ResultSkeleton } from "@/shared/components/ui/Skeleton";
import { fetchOverallResult, queryKeys } from "@/shared/lib/api";
import { inferPendingSemester, sortBySemesterAsc } from "@/shared/lib/semesterSort";
import { useSearchHistory } from "@/shared/hooks/useSearchHistory";
import type { StudentOverallResult } from "@/shared/types/results";

const OFFICIAL_URL = "https://mrecwexamcell.com/StudentLogin/Student/OverallResultStudent.aspx";

function cgpaClass(value: number | null | undefined) {
  if (value == null) return "text-foreground";
  if (value >= 9) return "text-success";
  if (value >= 7.5) return "text-primary-light";
  if (value >= 6) return "text-warning";
  return "text-error";
}

function OverallResultProfile({ data }: { data: StudentOverallResult }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-gradient-to-br from-indigo-600/20 via-transparent to-transparent p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
              <Award className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">{data.studentName || "Student"}</h2>
              <p className="mt-1 font-mono text-sm text-primary-light">{data.hallTicket}</p>
              {data.branch && <p className="mt-1 text-sm text-muted">{data.branch}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {data.currentSemester && <Badge variant="primary">{data.currentSemester}</Badge>}
                <CacheBadge meta={data._meta} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-center">
              <div className="text-xs uppercase tracking-wider text-muted">Latest semester</div>
              <div className="mt-1 font-display text-lg font-bold">{data.latestSemester || "—"}</div>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-center">
              <div className="text-xs uppercase tracking-wider text-muted">Latest CGPA</div>
              <div className={`mt-1 font-display text-2xl font-bold ${cgpaClass(data.latestCgpa)}`}>
                {data.latestCgpa != null ? data.latestCgpa.toFixed(2) : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function OverallResultPage() {
  const [ticket, setTicket] = useState("");
  const { push } = useSearchHistory();

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.overallResult(ticket),
    queryFn: () => fetchOverallResult(ticket),
    enabled: !!ticket,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const sortedSemesters = sortBySemesterAsc(data?.semesters || [], (row) => row.semester);
  const pendingSemester =
    data?.pendingSemester ??
    inferPendingSemester(
      (data?.semesters || []).map((row) => row.semester),
      data?.currentSemester
    );

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <TrendingUp className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Overall Result</h1>
            <p className="mt-1 text-muted">
              Semester-wise SGPA and CGPA from the official MRECW exam cell portal
            </p>
          </div>
        </div>
      </header>

      <HallTicketSearch
        onSearch={(value) => {
          setTicket(value);
          push(value);
        }}
        loading={isFetching && !data}
      />

      {error && (
        <div className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {(error as Error).message}
        </div>
      )}

      {isLoading && <ResultSkeleton />}

      {data && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={data.sourceUrl || OFFICIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs text-muted transition hover:text-foreground"
            >
              Official portal
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>

          <OverallResultProfile data={data} />

          {pendingSemester && (
            <div className="rounded-card border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Results for {pendingSemester} are not published on the portal yet. Showing completed semesters below.
            </div>
          )}

          {sortedSemesters.length === 0 ? (
            <Card className="py-12 text-center text-muted">
              {data.message || "No overall result records found for this student."}
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-foreground/10 px-6 py-4">
                <h3 className="font-display text-lg font-semibold">Semester-wise SGPA / CGPA</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-xs uppercase tracking-wider text-muted">
                      <th className="px-4 py-3">S.No</th>
                      <th className="px-4 py-3">Semester</th>
                      <th className="px-4 py-3">SGPA</th>
                      <th className="px-4 py-3">CGPA</th>
                      <th className="px-4 py-3">Sem End Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSemesters.map((row, index) => {
                      const isCurrent = row.semester === data.currentSemester;
                      const isLatest = row.semester === data.latestSemester;
                      return (
                        <tr
                          key={`${row.semester}-${index}`}
                          className={`border-b border-foreground/5 ${isCurrent || isLatest ? "bg-primary/5" : ""}`}
                        >
                          <td className="px-4 py-3">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{row.semester}</span>
                              {isCurrent && <Badge variant="primary">Current</Badge>}
                              {isLatest && !isCurrent && <Badge variant="success">Latest</Badge>}
                            </div>
                          </td>
                          <td className={`px-4 py-3 font-semibold ${cgpaClass(row.sgpa)}`}>
                            {row.sgpa != null ? row.sgpa.toFixed(2) : "—"}
                          </td>
                          <td className={`px-4 py-3 font-semibold ${cgpaClass(row.cgpa)}`}>
                            {row.cgpa != null ? row.cgpa.toFixed(2) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {row.semesterEndAttendance != null ? `${row.semesterEndAttendance.toFixed(2)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
