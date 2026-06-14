import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarCheck, ExternalLink, UserCheck } from "lucide-react";
import { useState } from "react";
import { CacheBadge } from "@/shared/components/CacheBadge";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { Badge } from "@/shared/components/ui/Badge";
import { Card } from "@/shared/components/ui/Card";
import { ResultSkeleton } from "@/shared/components/ui/Skeleton";
import { fetchAttendance, queryKeys } from "@/shared/lib/api";
import { useSearchHistory } from "@/shared/hooks/useSearchHistory";
import type { AttendanceSemester, StudentAttendance } from "@/shared/types/results";

const OFFICIAL_URL = "https://mrecwexamcell.com/StudentLogin/Student/StudentOverallAttendance.aspx";

function pctClass(value: number | null | undefined) {
  if (value == null) return "text-foreground";
  if (value >= 75) return "text-success";
  if (value >= 65) return "text-warning";
  return "text-error";
}

function AttendanceSemesterBlock({
  group,
  active,
}: {
  group: AttendanceSemester;
  active: boolean;
}) {
  const summary = group.summary;

  return (
    <Card className={active ? "ring-1 ring-primary/40" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 px-6 py-4">
        <div>
          <h3 className="font-display text-lg font-semibold">{group.semester}</h3>
          {active && <Badge variant="primary">Current semester</Badge>}
        </div>
        {summary?.percentage != null && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted">Semester total</div>
            <div className={`font-display text-2xl font-bold ${pctClass(summary.percentage)}`}>
              {summary.percentage.toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Conducted</th>
              <th className="px-4 py-3">Attended</th>
              <th className="px-4 py-3">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {group.months.map((row) => (
              <tr key={`${group.semester}-${row.month}`} className="border-b border-foreground/5">
                <td className="px-4 py-3 font-medium">{row.month}</td>
                <td className="px-4 py-3">{row.conducted ?? "—"}</td>
                <td className="px-4 py-3">{row.attended ?? "—"}</td>
                <td className={`px-4 py-3 font-semibold ${pctClass(row.percentage)}`}>
                  {row.percentage != null ? `${row.percentage.toFixed(2)}%` : "—"}
                </td>
              </tr>
            ))}
            {summary && (
              <tr className="bg-foreground/[0.03] font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3">{summary.conducted ?? "—"}</td>
                <td className="px-4 py-3">{summary.attended ?? "—"}</td>
                <td className={`px-4 py-3 ${pctClass(summary.percentage)}`}>
                  {summary.percentage != null ? `${summary.percentage.toFixed(2)}%` : "—"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AttendanceProfile({ data }: { data: StudentAttendance }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-gradient-to-br from-emerald-600/15 via-transparent to-transparent p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
              <UserCheck className="h-8 w-8" />
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
              <div className="text-xs uppercase tracking-wider text-muted">Active semester</div>
              <div className="mt-1 font-display text-lg font-bold">{data.activeSemester || "—"}</div>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-center">
              <div className="text-xs uppercase tracking-wider text-muted">Overall %</div>
              <div className={`mt-1 font-display text-2xl font-bold ${pctClass(data.overallPercentage)}`}>
                {data.overallPercentage != null ? `${data.overallPercentage.toFixed(2)}%` : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function AttendancePage() {
  const [ticket, setTicket] = useState("");
  const { push } = useSearchHistory();

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.attendance(ticket),
    queryFn: () => fetchAttendance(ticket),
    enabled: !!ticket,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const sortedSemesters = [...(data?.semesters || [])].reverse();

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <CalendarCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Overall Attendance</h1>
            <p className="mt-1 text-muted">
              Month-wise and semester-wise attendance from the official MRECW portal
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

          <AttendanceProfile data={data} />

          {sortedSemesters.length === 0 ? (
            <Card className="py-12 text-center text-muted">
              {data.message || "No attendance records found for this student."}
            </Card>
          ) : (
            <div className="space-y-6">
              {data.currentSemesterAvailable === false && data.activeSemester && (
                <div className="rounded-card border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                  Attendance for {data.activeSemester} is not published on the portal yet. Showing historical semesters below.
                </div>
              )}
              {sortedSemesters.map((group) => (
                <AttendanceSemesterBlock
                  key={group.semester}
                  group={group}
                  active={group.semester === data.activeSemester}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
