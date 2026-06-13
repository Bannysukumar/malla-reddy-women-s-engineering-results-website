import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { Badge } from "@/shared/components/ui/Badge";
import { Card } from "@/shared/components/ui/Card";
import { ResultSkeleton } from "@/shared/components/ui/Skeleton";
import { fetchBacklogReport, queryKeys } from "@/shared/lib/api";
import { useSearchHistory } from "@/shared/hooks/useSearchHistory";

export default function BacklogReportPage() {
  const [ticket, setTicket] = useState("");
  const { push } = useSearchHistory();

  const { data, error, isFetching } = useQuery({
    queryKey: queryKeys.backlog(ticket),
    queryFn: () => fetchBacklogReport(ticket),
    enabled: !!ticket,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Backlog Report</h1>
        <p className="mt-2 text-muted">Failed subjects and pending credits at a glance</p>
      </header>

      <HallTicketSearch
        onSearch={(value) => {
          setTicket(value);
          push(value);
        }}
        loading={isFetching}
      />

      {error && (
        <div className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {(error as Error).message}
        </div>
      )}

      {isFetching && <ResultSkeleton />}

      {data && !isFetching && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Student", value: data.studentName || "—" },
              { label: "Backlogs", value: data.backlogCount },
              { label: "Subjects Due", value: data.subjectsDue ?? "—" },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <div className="text-xs uppercase tracking-wider text-muted">{s.label}</div>
                <div className="mt-2 font-display text-2xl font-bold text-primary-light">{s.value}</div>
              </Card>
            ))}
          </div>

          {data.backlogs.length === 0 ? (
            <Card className="py-12 text-center text-muted">No backlog subjects found. Excellent performance!</Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Grades</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.backlogs.map((sub) => (
                    <tr key={`${sub.sno}-${sub.code}`} className="border-b border-foreground/5">
                      <td className="px-4 py-3 font-mono text-xs">{sub.code}</td>
                      <td className="px-4 py-3">{sub.name}</td>
                      <td className="px-4 py-3">{(sub.grades || []).join(", ") || "—"}</td>
                      <td className="px-4 py-3"><Badge variant="error">{sub.status || "F"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
