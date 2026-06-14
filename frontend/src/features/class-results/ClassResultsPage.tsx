import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CloudUpload } from "lucide-react";
import { CacheBadge } from "@/shared/components/CacheBadge";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { exportClassCsv, fetchClassResults, streamClassResults } from "@/shared/lib/api";
import type { ClassResult } from "@/shared/types/results";

const ROLL_DIGITS = 2;
const END_ROLL = 60;
const PENDING_KEY = "mrecw_class_scrape_pending";
const POLL_MS = 3000;

type ClassPayload = {
  prefix: string;
  sampleTicket: string;
  startRoll: number;
  endRoll: number;
  rollDigits: number;
};

function isInProgress(data: ClassResult | null) {
  return data?.scrapeStatus === "in_progress" || data?._meta?.inProgress === true;
}

function progressFromData(data: ClassResult | null) {
  const p = data?.scrapeProgress;
  if (!p) return null;
  const pct = p.total > 0 ? Math.round((p.current / p.total) * 100) : 0;
  return {
    pct,
    text: p.hallTicket
      ? `Checking ${p.hallTicket} (${p.current}/${p.total}) — saved to Firebase`
      : `Starting class scrape (${p.current}/${p.total})`,
  };
}

export default function ClassResultsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ pct: number; text: string } | null>(null);
  const [data, setData] = useState<ClassResult | null>(null);
  const [backgroundNote, setBackgroundNote] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const payloadRef = useRef<ClassPayload | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const applyResult = useCallback((result: ClassResult, finished: boolean) => {
    setData(result);
    const prog = progressFromData(result);
    setProgress(prog);
    if (finished) {
      stopPoll();
      sessionStorage.removeItem(PENDING_KEY);
      setBackgroundNote(false);
      setLoading(false);
    }
  }, [stopPoll]);

  const startPoll = useCallback((payload: ClassPayload) => {
    stopPoll();
    payloadRef.current = payload;
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
    setBackgroundNote(true);

    pollRef.current = setInterval(async () => {
      try {
        const result = await fetchClassResults(payload);
        const finished = !isInProgress(result);
        applyResult(result, finished);
      } catch {
        /* keep polling — scrape may still be running server-side */
      }
    }, POLL_MS);
  }, [applyResult, stopPoll]);

  const runSearch = useCallback(async (payload: ClassPayload) => {
    setLoading(true);
    setError("");
    setData(null);
    setProgress(null);
    setBackgroundNote(false);
    payloadRef.current = payload;
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));

    try {
      const initial = await fetchClassResults(payload);

      if (!isInProgress(initial) && initial._meta?.cached && initial.scrapeStatus !== "in_progress") {
        applyResult(initial, true);
        return;
      }

      if (isInProgress(initial)) {
        applyResult(initial, false);
      }

      startPoll(payload);

      try {
        await streamClassResults(payload, (event) => {
          if (event.type === "progress") {
            setProgress({
              pct: Math.round(((event.current as number) / (event.total as number)) * 100),
              text: `Checking ${event.hallTicket} (${event.current}/${event.total})`,
            });
          }
          if (event.type === "done") {
            applyResult(event.result as ClassResult, true);
          }
        });
      } catch {
        const latest = await fetchClassResults(payload).catch(() => null);
        if (latest) {
          applyResult(latest, !isInProgress(latest));
        }
      }
    } catch (err) {
      setError((err as Error).message);
      stopPoll();
      setLoading(false);
      setProgress(null);
    }
  }, [applyResult, startPoll, stopPoll]);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as ClassPayload;
      void (async () => {
        setLoading(true);
        const result = await fetchClassResults(payload);
        if (isInProgress(result)) {
          applyResult(result, false);
          startPoll(payload);
        } else if (result.students.length > 0) {
          applyResult(result, true);
        }
      })();
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
    }

    return () => stopPoll();
  }, [applyResult, startPoll, stopPoll]);

  function handleSearch(ticket: string) {
    const prefix = ticket.slice(0, -ROLL_DIGITS);
    void runSearch({
      prefix,
      sampleTicket: ticket,
      startRoll: 1,
      endRoll: END_ROLL,
      rollDigits: ROLL_DIGITS,
    });
  }

  const showProgress = (loading || isInProgress(data)) && !error;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Class Results</h1>
        <p className="mt-2 text-muted">Section-wide CGPA rankings and class average</p>
      </header>

      <HallTicketSearch onSearch={handleSearch} loading={loading && !data} placeholder="Enter any hall ticket from your section" />

      {backgroundNote && isInProgress(data) && (
        <div className="flex items-start gap-3 rounded-card border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <CloudUpload className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
          <p>
            Class scrape is running on the server and saving to Firebase. You can close this tab — come back later and search the same section to see results.
          </p>
        </div>
      )}

      {error && <div className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {showProgress && progress && (
        <Card>
          <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">{progress.text}</p>
        </Card>
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
