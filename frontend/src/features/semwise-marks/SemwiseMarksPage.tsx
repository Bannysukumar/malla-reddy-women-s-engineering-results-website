import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpenCheck, ExternalLink, GraduationCap } from "lucide-react";
import { useState } from "react";
import { CacheBadge } from "@/shared/components/CacheBadge";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { Badge } from "@/shared/components/ui/Badge";
import { Card } from "@/shared/components/ui/Card";
import { ResultSkeleton } from "@/shared/components/ui/Skeleton";
import { fetchSemwiseMarks, queryKeys } from "@/shared/lib/api";
import { useSearchHistory } from "@/shared/hooks/useSearchHistory";
import type { SemwiseMarksSemester, StudentSemwiseMarks } from "@/shared/types/results";

const OFFICIAL_URL = "https://mrecwexamcell.com/StudentLogin/Student/OverallMarksSemwise.aspx";

function SemesterMarksBlock({
  group,
  active,
}: {
  group: SemwiseMarksSemester;
  active: boolean;
}) {
  return (
    <Card className={active ? "ring-1 ring-primary/40" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 px-6 py-4">
        <div>
          <h3 className="font-display text-lg font-semibold">{group.semester}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {group.examMonth && <span>{group.examMonth}</span>}
            {active && <Badge variant="primary">Current semester</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-right text-sm">
          {group.sgpa != null && (
            <div>
              <div className="text-xs uppercase tracking-wider text-muted">SGPA</div>
              <div className="font-display text-xl font-bold text-primary-light">{group.sgpa.toFixed(2)}</div>
            </div>
          )}
          {group.cgpa != null && (
            <div>
              <div className="text-xs uppercase tracking-wider text-muted">CGPA</div>
              <div className="font-display text-xl font-bold">{group.cgpa.toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Credits</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {group.subjects.map((sub) => (
              <tr key={`${group.semester}-${sub.sno}-${sub.code}`} className="border-b border-foreground/5">
                <td className="px-4 py-3">{sub.sno}</td>
                <td className="px-4 py-3 font-mono text-xs">{sub.code}</td>
                <td className="px-4 py-3">{sub.name}</td>
                <td className="px-4 py-3">{(sub.grades || []).join(", ") || "—"}</td>
                <td className="px-4 py-3">{sub.credits || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={sub.status === "P" ? "success" : sub.status === "F" ? "error" : "default"}>
                    {sub.status || "—"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(group.subjectsPassed != null || group.totalCredits) && (
        <div className="flex flex-wrap gap-4 border-t border-foreground/10 px-6 py-3 text-sm text-muted">
          {group.subjectsPassed != null && <span>Subjects passed: {group.subjectsPassed}</span>}
          {group.totalCredits && <span>Semester credits: {group.totalCredits}</span>}
        </div>
      )}
    </Card>
  );
}

function SemwiseProfile({ data }: { data: StudentSemwiseMarks }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-gradient-to-br from-violet-600/20 via-transparent to-transparent p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
              <GraduationCap className="h-8 w-8" />
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "CGPA", value: data.cgpa || "—" },
              { label: "Percentage", value: data.percentage || "—" },
              {
                label: "Credits",
                value: data.creditsObtained && data.creditsTotal ? `${data.creditsObtained}/${data.creditsTotal}` : "—",
              },
              { label: "Due", value: data.subjectsDue != null ? `${data.subjectsDue}/${data.subjectsTotal}` : "—" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-center">
                <div className="text-xs uppercase tracking-wider text-muted">{stat.label}</div>
                <div className="mt-1 font-display text-lg font-bold">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function SemwiseMarksPage() {
  const [ticket, setTicket] = useState("");
  const { push } = useSearchHistory();

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.semwiseMarks(ticket),
    queryFn: () => fetchSemwiseMarks(ticket),
    enabled: !!ticket,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const hasCurrentSemester = (data?.semesters || []).some((s) => s.semester === data?.currentSemester);

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <BookOpenCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Semester-wise Marks</h1>
            <p className="mt-1 text-muted">
              Subject marks grouped by semester from the official MRECW exam cell portal
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

          <SemwiseProfile data={data} />

          {!hasCurrentSemester && data.currentSemester && data.semesters.length > 0 && (
            <div className="rounded-card border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Marks for {data.currentSemester} are not published yet. Showing completed semesters below.
            </div>
          )}

          {data.semesters.length === 0 ? (
            <Card className="py-12 text-center text-muted">
              {data.message || "No semester-wise marks found for this student."}
            </Card>
          ) : (
            <div className="space-y-6">
              {[...data.semesters].reverse().map((group) => (
                <SemesterMarksBlock
                  key={group.semester}
                  group={group}
                  active={group.semester === data.currentSemester}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
