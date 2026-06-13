import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnalyticsCharts } from "@/shared/components/AnalyticsCharts";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { ResultView } from "@/shared/components/ResultView";
import { ResultSkeleton } from "@/shared/components/ui/Skeleton";
import { useSearchHistory } from "@/shared/hooks/useSearchHistory";
import { fetchResults, queryKeys } from "@/shared/lib/api";

export default function AcademicResultsPage() {
  const [params] = useSearchParams();
  const initial = params.get("ticket") || "";
  const [ticket, setTicket] = useState("");
  const { push } = useSearchHistory();

  useEffect(() => {
    if (initial) setTicket(initial);
  }, [initial]);

  const { data, error, isFetching } = useQuery({
    queryKey: queryKeys.results(ticket),
    queryFn: () => fetchResults(ticket),
    enabled: !!ticket,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  function handleSearch(value: string) {
    setTicket(value);
    push(value);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Academic Results</h1>
        <p className="mt-2 text-muted">Complete marksheet, CGPA and semester performance</p>
      </header>

      <HallTicketSearch onSearch={handleSearch} loading={isFetching} defaultValue={initial} />

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {(error as Error).message}
        </motion.div>
      )}

      {isFetching && <ResultSkeleton />}
      {data && !isFetching && (
        <>
          <ResultView data={data} />
          <AnalyticsCharts data={data} />
        </>
      )}
    </div>
  );
}
