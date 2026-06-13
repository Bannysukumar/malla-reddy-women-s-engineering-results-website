import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { Card } from "@/shared/components/ui/Card";
import { ResultSkeleton } from "@/shared/components/ui/Skeleton";
import { fetchResults, queryKeys } from "@/shared/lib/api";

export default function CreditsAnalyzerPage() {
  const [ticket, setTicket] = useState("");

  const { data, error, isFetching } = useQuery({
    queryKey: queryKeys.results(ticket),
    queryFn: () => fetchResults(ticket),
    enabled: !!ticket,
    staleTime: 5 * 60 * 1000,
  });

  const obtained = parseFloat(data?.creditsObtained || "0") || 0;
  const total = parseFloat(data?.creditsTotal || "1") || 1;
  const remaining = Math.max(total - obtained, 0);
  const pct = total ? Math.round((obtained / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Credits Analyzer</h1>
        <p className="mt-2 text-muted">Track credit completion and academic progression</p>
      </header>

      <HallTicketSearch onSearch={setTicket} loading={isFetching} />

      {error && <div className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{(error as Error).message}</div>}
      {isFetching && <ResultSkeleton />}

      {data && !isFetching && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="text-center">
            <p className="text-sm text-muted">{data.studentName} · {data.hallTicket}</p>
            <div className="mt-4 font-display text-5xl font-extrabold gradient-text">
              {data.creditsObtained}/{data.creditsTotal}
            </div>
            <p className="mt-2 text-sm text-muted">Credits earned vs required</p>
            <div className="mx-auto mt-6 h-3 max-w-lg overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-primary-light">{pct}% complete</p>
          </Card>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "CGPA", value: data.cgpa || "—" },
              { label: "Remaining Credits", value: remaining },
              { label: "Subjects Due", value: data.subjectsDue ?? "—" },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <div className="text-xs uppercase tracking-wider text-muted">{s.label}</div>
                <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
