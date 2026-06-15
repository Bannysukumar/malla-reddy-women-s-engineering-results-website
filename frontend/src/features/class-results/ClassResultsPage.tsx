import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { CacheBadge } from "@/shared/components/CacheBadge";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { ClassStudentCard } from "@/features/class-results/ClassStudentCard";
import { exportClassCsv, fetchClassResults, streamClassResults } from "@/shared/lib/api";
import { filterClassResultToRange, parseClassTicketRange, rangeFromPayload, toClassPayload, type ClassTicketRange } from "@/shared/lib/classRange";
import type { ClassResult, ClassStudent } from "@/shared/types/results";

const PENDING_KEY = "mrecw_class_scrape_pending";
const POLL_MS = 2500;

type ClassPayload = ReturnType<typeof toClassPayload>;

function isInProgress(data: ClassResult | null) {
  return data?.scrapeStatus === "in_progress" || data?._meta?.inProgress === true;
}

function sortStudents(students: ClassStudent[]) {
  return [...students].sort((a, b) => parseFloat(b.cgpa || "0") - parseFloat(a.cgpa || "0"));
}

export default function ClassResultsPage() {
  const [firstTicket, setFirstTicket] = useState("");
  const [lastTicket, setLastTicket] = useState("");
  const [rangePreview, setRangePreview] = useState<ClassTicketRange | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedFromFirebase, setLoadedFromFirebase] = useState(false);
  const [data, setData] = useState<ClassResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const applyResult = useCallback((result: ClassResult, finished: boolean, range?: ClassTicketRange) => {
    const scoped = range ? filterClassResultToRange(result, range) : result;
    const students = sortStudents(scoped.students || []);
    const cgpaValues = students.map((s) => parseFloat(s.cgpa || "0")).filter((v) => !Number.isNaN(v));
    setData({
      ...scoped,
      students,
      successCount: students.length,
      failedCount: scoped.failed?.length ?? 0,
      totalAttempted: range?.total ?? scoped.totalAttempted,
      classAverageCgpa: cgpaValues.length
        ? Math.round((cgpaValues.reduce((sum, v) => sum + v, 0) / cgpaValues.length) * 100) / 100
        : scoped.classAverageCgpa ?? null,
    });
    if (finished) {
      stopPoll();
      sessionStorage.removeItem(PENDING_KEY);
      setLoading(false);
    }
  }, [stopPoll]);

  const startPoll = useCallback((payload: ClassPayload) => {
    stopPoll();
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));

    pollRef.current = setInterval(async () => {
      try {
        const result = await fetchClassResults(payload);
        const finished = !isInProgress(result);
        applyResult(result, finished, rangeFromPayload(payload));
      } catch {
        /* scrape may still be running server-side */
      }
    }, POLL_MS);
  }, [applyResult, stopPoll]);

  const runScrape = useCallback(async (payload: ClassPayload, range: ClassTicketRange) => {
    setLoading(true);
    setError("");
    setData(null);
    setLoadedFromFirebase(false);
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));

    try {
      const initial = await fetchClassResults(payload);

      if (!isInProgress(initial) && initial.students.length > 0 && initial.scrapeStatus !== "in_progress") {
        setLoadedFromFirebase(Boolean(initial._meta?.cached));
        applyResult(initial, true, range);
        return;
      }

      if (initial.students.length > 0 || isInProgress(initial)) {
        applyResult(initial, false, range);
      }

      startPoll(payload);

      try {
        await streamClassResults(payload, (event) => {
          const type = event.type as string;

          if (type === "partial") {
            const snapshot = event.result as ClassResult;
            applyResult(snapshot, false, range);
          }

          if (type === "student") {
            const student = event.student as ClassStudent;
            setData((prev) => {
              const merged = sortStudents([
                ...(prev?.students || []).filter((s) => s.hallTicket !== student.hallTicket),
                student,
              ]);
              const failed = prev?.failed || [];
              const cgpaValues = merged.map((s) => parseFloat(s.cgpa || "0")).filter((v) => !Number.isNaN(v));
              const current = merged.length + failed.length;
              return {
                prefix: payload.prefix,
                startRoll: payload.startRoll,
                endRoll: payload.endRoll,
                rollDigits: payload.rollDigits,
                totalAttempted: range.total,
                successCount: merged.length,
                failedCount: failed.length,
                classAverageCgpa: cgpaValues.length
                  ? Math.round((cgpaValues.reduce((sum, v) => sum + v, 0) / cgpaValues.length) * 100) / 100
                  : null,
                students: merged,
                failed,
                scrapeStatus: "in_progress",
                scrapeProgress: {
                  current,
                  total: range.total,
                  remaining: Math.max(0, range.total - current),
                  cachedCount: merged.length,
                  hallTicket: student.hallTicket,
                },
              };
            });
          }

          if (type === "failed") {
            const student = event.student as { hallTicket: string; error?: string };
            setData((prev) => {
              const failed = [
                ...(prev?.failed || []).filter((f) => f.hallTicket !== student.hallTicket),
                { hallTicket: student.hallTicket, error: student.error || "Failed" },
              ];
              return {
                prefix: payload.prefix,
                startRoll: payload.startRoll,
                endRoll: payload.endRoll,
                rollDigits: payload.rollDigits,
                totalAttempted: range.total,
                successCount: prev?.students.length || 0,
                failedCount: failed.length,
                classAverageCgpa: prev?.classAverageCgpa ?? null,
                students: prev?.students || [],
                failed,
                scrapeStatus: "in_progress",
              };
            });
          }

          if (type === "done") {
            applyResult(event.result as ClassResult, true, range);
          }

          if (type === "error") {
            setError(String(event.message || "Class scrape failed. Please try again."));
            stopPoll();
            setLoading(false);
          }
        });
      } catch {
        const latest = await fetchClassResults(payload).catch(() => null);
        if (latest) {
          applyResult(latest, !isInProgress(latest), range);
        }
      }
    } catch (err) {
      setError((err as Error).message);
      stopPoll();
      setLoading(false);
    }
  }, [applyResult, startPoll, stopPoll]);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as ClassPayload;
      if (payload.firstTicket) setFirstTicket(payload.firstTicket);
      if (payload.lastTicket) setLastTicket(payload.lastTicket);
      const resumeRange = rangeFromPayload(payload);

      void (async () => {
        setLoading(true);
        const result = await fetchClassResults(payload);
        if (isInProgress(result)) {
          applyResult(result, false, resumeRange);
          startPoll(payload);
        } else if (result.students.length > 0) {
          applyResult(result, true, resumeRange);
        }
      })();
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
    }

    return () => stopPoll();
  }, [applyResult, startPoll, stopPoll]);

  function handlePreview() {
    setError("");
    try {
      setRangePreview(parseClassTicketRange(firstTicket, lastTicket));
    } catch (err) {
      setRangePreview(null);
      setError((err as Error).message);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const range = parseClassTicketRange(firstTicket, lastTicket);
      setRangePreview(range);
      void runScrape(toClassPayload(range), range);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const showProgress = (loading || isInProgress(data)) && !error;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Class Results</h1>
        <p className="mt-2 text-muted">Scrape section-wide CGPA rankings from a hall ticket range</p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">First hall ticket</label>
              <Input
                value={firstTicket}
                onChange={(e) => {
                  setFirstTicket(e.target.value.toUpperCase());
                  setRangePreview(null);
                }}
                onBlur={handlePreview}
                placeholder="e.g. 23RH1A0501"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Last hall ticket</label>
              <Input
                value={lastTicket}
                onChange={(e) => {
                  setLastTicket(e.target.value.toUpperCase());
                  setRangePreview(null);
                }}
                onBlur={handlePreview}
                placeholder="e.g. 23RH1A0560"
                required
                autoComplete="off"
              />
            </div>
          </div>

          {rangePreview && (
            <p className="text-sm text-muted">
              Section <span className="font-mono text-foreground">{rangePreview.prefix}</span>
              {" · "}
              Roll {rangePreview.startRoll}–{rangePreview.endRoll}
              {" · "}
              {rangePreview.total} students
              {" · "}
              Only this range is shown (even if more exist in Firebase)
            </p>
          )}

          <Button type="submit" loading={loading} className="sm:min-w-[160px]">
            <Users className="mr-2 inline h-4 w-4" />
            Scrape Class Results
          </Button>
        </form>
      </Card>

      {showProgress && (
        <div className="flex items-center gap-3 rounded-card border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-light" />
          <p>Getting results, please wait…</p>
        </div>
      )}

      {error && <div className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {loadedFromFirebase && data && !isInProgress(data) && (
        <div className="rounded-card border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          All {data.successCount} students loaded instantly from Firebase — no scrape needed.
        </div>
      )}

      {data && data.students.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CacheBadge meta={data._meta} />
            {!isInProgress(data) && <Button variant="secondary" onClick={() => exportClassCsv(data)}>Export CSV</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Students", value: data.successCount },
              { label: "Failed", value: data.failedCount },
              { label: "Class Avg CGPA", value: data.classAverageCgpa ?? "—" },
              { label: "Section", value: data.prefix },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <div className="text-xs uppercase tracking-wider text-muted">{s.label}</div>
                <div className="mt-2 font-display text-2xl font-bold text-primary-light">{s.value}</div>
              </Card>
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="font-display text-lg font-semibold">Class Rankings</h3>
            {data.students.map((s, i) => (
              <ClassStudentCard key={s.hallTicket} student={s} rank={i + 1} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
