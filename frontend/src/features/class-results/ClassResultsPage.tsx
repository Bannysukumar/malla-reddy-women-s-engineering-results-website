import { useState } from "react";
import { motion } from "framer-motion";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { exportClassCsv, streamClassResults } from "@/shared/lib/api";
import type { ClassResult } from "@/shared/types/results";

const ROLL_DIGITS = 2;
const END_ROLL = 60;

export default function ClassResultsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ pct: number; text: string } | null>(null);
  const [data, setData] = useState<ClassResult | null>(null);

  async function handleSearch(ticket: string) {
    const prefix = ticket.slice(0, -ROLL_DIGITS);
    setLoading(true);
    setError("");
    setData(null);
    setProgress({ pct: 0, text: "Starting class fetch…" });

    try {
      await streamClassResults(
        { prefix, sampleTicket: ticket, startRoll: 1, endRoll: END_ROLL, rollDigits: ROLL_DIGITS },
        (event) => {
          if (event.type === "progress") {
            setProgress({
              pct: Math.round(((event.current as number) / (event.total as number)) * 100),
              text: `Checking ${event.hallTicket} (${event.current}/${event.total})`,
            });
          }
          if (event.type === "done") setData(event.result as ClassResult);
        }
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Class Results</h1>
        <p className="mt-2 text-muted">Section-wide CGPA rankings and class average</p>
      </header>

      <HallTicketSearch onSearch={handleSearch} loading={loading} placeholder="Enter any hall ticket from your section" />

      {error && <div className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {progress && (
        <Card>
          <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">{progress.text}</p>
        </Card>
      )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => exportClassCsv(data)}>Export CSV</Button>
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
