import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, CloudUpload, Loader2, Users, XCircle } from "lucide-react";
import { CacheBadge } from "@/shared/components/CacheBadge";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { exportClassCsv, fetchClassResults, streamClassResults } from "@/shared/lib/api";
import { filterClassResultToRange, parseClassTicketRange, rangeFromPayload, toClassPayload, type ClassTicketRange } from "@/shared/lib/classRange";
import type { ClassResult, ClassStudent } from "@/shared/types/results";

const PENDING_KEY = "mrecw_class_scrape_pending";
const POLL_MS = 2500;

type ClassPayload = ReturnType<typeof toClassPayload>;

type ActivityEntry = {
  id: string;
  type: "progress" | "student" | "failed" | "done";
  text: string;
};

function isInProgress(data: ClassResult | null) {
  return data?.scrapeStatus === "in_progress" || data?._meta?.inProgress === true;
}

function sortStudents(students: ClassStudent[]) {
  return [...students].sort((a, b) => parseFloat(b.cgpa || "0") - parseFloat(a.cgpa || "0"));
}

function progressFromData(data: ClassResult | null) {
  const p = data?.scrapeProgress;
  if (!p) return null;
  const pct = p.total > 0 ? Math.round((p.current / p.total) * 100) : 0;
  const remaining = p.remaining ?? Math.max(0, p.total - p.current);
  const cachedCount = p.cachedCount ?? data?.successCount ?? 0;
  return {
    pct,
    current: p.current,
    total: p.total,
    remaining,
    cachedCount,
    text: p.hallTicket
      ? `${remaining} remaining · ${cachedCount} in Firebase · checking ${p.hallTicket} (${p.current}/${p.total})`
      : `${remaining} remaining · ${cachedCount} in Firebase · starting (${p.current}/${p.total})`,
  };
}

export default function ClassResultsPage() {
  const [firstTicket, setFirstTicket] = useState("");
  const [lastTicket, setLastTicket] = useState("");
  const [rangePreview, setRangePreview] = useState<ClassTicketRange | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{
    pct: number;
    current: number;
    total: number;
    remaining: number;
    cachedCount: number;
    text: string;
  } | null>(null);
  const [loadedFromFirebase, setLoadedFromFirebase] = useState(false);
  const [data, setData] = useState<ClassResult | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [backgroundNote, setBackgroundNote] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityId = useRef(0);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pushActivity = useCallback((type: ActivityEntry["type"], text: string) => {
    activityId.current += 1;
    setActivity((prev) => [{ id: String(activityId.current), type, text }, ...prev.slice(0, 49)]);
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
    const prog = progressFromData(scoped);
    if (prog) setProgress(prog);
    if (finished) {
      stopPoll();
      sessionStorage.removeItem(PENDING_KEY);
      setBackgroundNote(false);
      setLoading(false);
      pushActivity("done", `Scrape complete — ${scoped.successCount} students saved to Firebase`);
    }
  }, [pushActivity, stopPoll]);

  const startPoll = useCallback((payload: ClassPayload) => {
    stopPoll();
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
    setBackgroundNote(true);

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
    setProgress(null);
    setActivity([]);
    setBackgroundNote(false);
    setLoadedFromFirebase(false);
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));

    pushActivity("progress", `Scraping ${range.firstTicket} → ${range.lastTicket} (${range.total} students)`);

    try {
      const initial = await fetchClassResults(payload);

      if (!isInProgress(initial) && initial.students.length > 0 && initial.scrapeStatus !== "in_progress") {
        setLoadedFromFirebase(Boolean(initial._meta?.cached));
        applyResult(initial, true, range);
        if (initial._meta?.cached) {
          pushActivity("done", `Loaded ${initial.successCount} students from Firebase (rolls ${range.startRoll}–${range.endRoll})`);
        }
        return;
      }

      if (initial.students.length > 0 || isInProgress(initial)) {
        applyResult(initial, false, range);
        if (initial._meta?.cached && initial.students.length > 0) {
          const remaining = initial.scrapeProgress?.remaining ?? range.total - initial.successCount;
          pushActivity(
            "progress",
            `${initial.successCount} loaded from Firebase · ${remaining} remaining to scrape`
          );
        }
      }
      setProgress({
        pct: initial.scrapeProgress
          ? Math.round(((initial.scrapeProgress.current / initial.scrapeProgress.total) * 100))
          : 0,
        current: initial.scrapeProgress?.current ?? 0,
        total: range.total,
        remaining: initial.scrapeProgress?.remaining ?? range.total,
        cachedCount: initial.scrapeProgress?.cachedCount ?? initial.successCount,
        text: progressFromData(initial)?.text ?? `Starting scrape for ${range.prefix}`,
      });

      startPoll(payload);

      try {
        await streamClassResults(payload, (event) => {
          const type = event.type as string;

          if (type === "partial") {
            const snapshot = event.result as ClassResult;
            applyResult(snapshot, false, range);
            pushActivity(
              "progress",
              `${event.cachedCount as number} from Firebase · ${event.remaining as number} remaining to scrape`
            );
          }

          if (type === "start") {
            const total = event.total as number;
            const cachedCount = (event.cachedCount as number) || 0;
            const remaining = (event.remaining as number) ?? total - cachedCount;
            setProgress({
              pct: total > 0 ? Math.round((cachedCount / total) * 100) : 0,
              current: cachedCount,
              total,
              remaining,
              cachedCount,
              text: `${remaining} remaining · ${cachedCount} in Firebase · scraping section ${event.prefix}`,
            });
            if (cachedCount > 0) {
              pushActivity("progress", `${cachedCount} already in Firebase · ${remaining} left to scrape`);
            }
          }

          if (type === "progress") {
            const current = event.current as number;
            const total = event.total as number;
            const hallTicket = event.hallTicket as string;
            const remaining = (event.remaining as number) ?? Math.max(0, total - current);
            const cachedCount = (event.cachedCount as number) ?? 0;
            const fromCache = Boolean(event.cached);
            setProgress({
              pct: total > 0 ? Math.round((current / total) * 100) : 0,
              current,
              total,
              remaining,
              cachedCount,
              text: `${remaining} remaining · ${cachedCount} in Firebase · checking ${hallTicket} (${current}/${total})`,
            });
            pushActivity(
              "progress",
              fromCache
                ? `${hallTicket} from Firebase (${current}/${total})`
                : `Scraping ${hallTicket} (${current}/${total})`
            );
          }

          if (type === "student") {
            const student = event.student as ClassStudent;
            const fromCache = Boolean(event.cached);
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
            pushActivity(
              "student",
              fromCache
                ? `${student.hallTicket} — ${student.studentName || "Student"} (Firebase, CGPA ${student.cgpa || "—"})`
                : `${student.hallTicket} — ${student.studentName || "Student"} (scraped, CGPA ${student.cgpa || "—"})`
            );
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
            pushActivity("failed", `${student.hallTicket} — ${student.error || "No result"}`);
          }

          if (type === "done") {
            applyResult(event.result as ClassResult, true, range);
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
      setProgress(null);
    }
  }, [applyResult, pushActivity, startPoll, stopPoll]);

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
  const liveStats = useMemo(
    () => ({
      found: data?.successCount ?? 0,
      failed: data?.failedCount ?? 0,
      remaining: progress?.remaining ?? Math.max(0, (data?.totalAttempted ?? 0) - (data?.successCount ?? 0) - (data?.failedCount ?? 0)),
      inFirebase: progress?.cachedCount ?? data?.successCount ?? 0,
      avg: data?.classAverageCgpa ?? "—",
    }),
    [data, progress]
  );

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

      {backgroundNote && isInProgress(data) && (
        <div className="flex items-start gap-3 rounded-card border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <CloudUpload className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
          <p>
            Scrape is running on the server and saving to Firebase. You can close this tab — reopen and use the same range to resume.
          </p>
        </div>
      )}

      {error && <div className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {showProgress && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary-light" />
              Live scrape in progress
            </div>
            {progress && (
              <span className="font-mono text-sm text-muted">
                {progress.current}/{progress.total} ({progress.pct}%)
              </span>
            )}
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress?.pct ?? 0}%` }}
            />
          </div>
          {progress && <p className="text-sm text-muted">{progress.text}</p>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "In Firebase", value: liveStats.inFirebase },
              { label: "Remaining", value: liveStats.remaining },
              { label: "Found", value: liveStats.found },
              { label: "Failed", value: liveStats.failed },
              { label: "Class Avg CGPA", value: liveStats.avg },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-center">
                <div className="text-xs uppercase tracking-wider text-muted">{s.label}</div>
                <div className="mt-1 font-display text-xl font-bold text-primary-light">{s.value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activity.length > 0 && showProgress && (
        <Card>
          <h3 className="font-display text-lg font-semibold">Live activity</h3>
          <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto text-sm">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2 font-mono">
                {entry.type === "student" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
                {entry.type === "failed" && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />}
                {entry.type === "progress" && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted" />}
                {entry.type === "done" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />}
                <span className="break-all">{entry.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Hall Ticket</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">CGPA</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s, i) => (
                  <tr key={s.hallTicket} className="border-b border-foreground/5">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.hallTicket}</td>
                    <td className="px-4 py-3">{s.studentName || "—"}</td>
                    <td className="px-4 py-3"><Badge variant="primary">{s.cgpa || "—"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
