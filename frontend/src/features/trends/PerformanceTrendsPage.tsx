import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AnalyticsCharts, EmptyAnalytics } from "@/shared/components/AnalyticsCharts";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { ResultSkeleton } from "@/shared/components/ui/Skeleton";
import { fetchResults, queryKeys } from "@/shared/lib/api";

export default function PerformanceTrendsPage() {
  const [ticket, setTicket] = useState("");

  const { data, error, isFetching } = useQuery({
    queryKey: queryKeys.results(ticket),
    queryFn: () => fetchResults(ticket),
    enabled: !!ticket,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Performance Trends</h1>
        <p className="mt-2 text-muted">Semester SGPA, CGPA growth, pass rate and backlog analytics</p>
      </header>

      <HallTicketSearch onSearch={setTicket} loading={isFetching} />

      {error && <div className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{(error as Error).message}</div>}
      {isFetching && <ResultSkeleton />}
      {!ticket && !isFetching && <EmptyAnalytics />}
      {data && !isFetching && <AnalyticsCharts data={data} />}
    </div>
  );
}
