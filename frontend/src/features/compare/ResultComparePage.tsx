import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { ResultSkeleton } from "@/shared/components/ui/Skeleton";
import { fetchResultContrast, queryKeys } from "@/shared/lib/api";

export default function ResultComparePage() {
  const [ticketA, setTicketA] = useState("");
  const [ticketB, setTicketB] = useState("");
  const [submitted, setSubmitted] = useState({ a: "", b: "" });

  const { data, error, isFetching } = useQuery({
    queryKey: queryKeys.contrast(submitted.a, submitted.b),
    queryFn: () => fetchResultContrast(submitted.a, submitted.b),
    enabled: !!submitted.a && !!submitted.b,
    staleTime: 5 * 60 * 1000,
  });

  function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted({ a: ticketA.trim().toUpperCase(), b: ticketB.trim().toUpperCase() });
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Result Compare</h1>
        <p className="mt-2 text-muted">Side-by-side academic comparison between two hall tickets</p>
      </header>

      <Card>
        <form onSubmit={handleCompare} className="grid gap-4 sm:grid-cols-2">
          <Input value={ticketA} onChange={(e) => setTicketA(e.target.value.toUpperCase())} placeholder="First hall ticket" required />
          <Input value={ticketB} onChange={(e) => setTicketB(e.target.value.toUpperCase())} placeholder="Second hall ticket" required />
          <div className="sm:col-span-2">
            <Button type="submit" loading={isFetching} className="sm:w-auto">Compare Results</Button>
          </div>
        </form>
      </Card>

      {error && <div className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{(error as Error).message}</div>}
      {isFetching && <ResultSkeleton />}

      {data && !isFetching && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {[data.first, data.second].map((r) => (
              <Card key={r.hallTicket}>
                <h3 className="font-display text-lg font-bold">{r.studentName || "Student"}</h3>
                <p className="text-sm text-primary-light">{r.hallTicket}</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xs text-muted">CGPA</div><div className="font-display text-xl font-bold">{r.cgpa || "—"}</div></div>
                  <div><div className="text-xs text-muted">Credits</div><div className="font-display text-xl font-bold">{r.creditsObtained && r.creditsTotal ? `${r.creditsObtained}/${r.creditsTotal}` : "—"}</div></div>
                  <div><div className="text-xs text-muted">Backlogs</div><div className="font-display text-xl font-bold">{r.backlogCount ?? "—"}</div></div>
                </div>
              </Card>
            ))}
          </div>
          {data.comparison.cgpaDifference != null && (
            <Card className="text-center">
              CGPA difference:{" "}
              <span className={`font-display text-xl font-bold ${data.comparison.cgpaDifference >= 0 ? "text-success" : "text-error"}`}>
                {data.comparison.cgpaDifference > 0 ? "+" : ""}{data.comparison.cgpaDifference}
              </span>
            </Card>
          )}
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">{data.first.hallTicket}</th>
                  <th className="px-4 py-3">{data.second.hallTicket}</th>
                </tr>
              </thead>
              <tbody>
                {data.comparison.metrics.map((row) => (
                  <tr key={row.label} className="border-b border-foreground/5">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3">{row.first ?? "—"}</td>
                    <td className="px-4 py-3">{row.second ?? "—"}</td>
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
