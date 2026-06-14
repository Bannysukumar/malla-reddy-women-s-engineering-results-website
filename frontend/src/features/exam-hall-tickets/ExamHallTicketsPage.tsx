import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ExternalLink, Ticket } from "lucide-react";
import { useState } from "react";
import { CacheBadge } from "@/shared/components/CacheBadge";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { Badge } from "@/shared/components/ui/Badge";
import { Card } from "@/shared/components/ui/Card";
import { ResultSkeleton } from "@/shared/components/ui/Skeleton";
import { fetchExamHallTickets, queryKeys } from "@/shared/lib/api";
import { useSearchHistory } from "@/shared/hooks/useSearchHistory";

const OFFICIAL_PORTAL_URL =
  "https://mrecwexamcell.com/StudentLogin/Student/StudentHallTicketDownload.aspx";

export default function ExamHallTicketsPage() {
  const [ticket, setTicket] = useState("");
  const { push } = useSearchHistory();

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.examHallTickets(ticket),
    queryFn: () => fetchExamHallTickets(ticket),
    enabled: !!ticket,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const hasTickets = (data?.tickets?.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-light">
            <Ticket className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Exam Hall Tickets</h1>
            <p className="mt-1 text-muted">
              External exam hall tickets from the official MRECW exam cell portal
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
            <CacheBadge meta={data._meta} />
            <a
              href={data.sourceUrl || OFFICIAL_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs text-muted transition hover:text-foreground"
            >
              Official portal
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Student", value: data.studentName || "—" },
              { label: "Hall Ticket", value: data.hallTicket },
              { label: "Branch", value: data.branch || "—" },
              { label: "Sessions", value: data.sessionsFound ?? data.tickets.length },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <div className="text-xs uppercase tracking-wider text-muted">{s.label}</div>
                <div className="mt-2 font-display text-lg font-bold text-primary-light">{s.value}</div>
              </Card>
            ))}
          </div>

          {!hasTickets ? (
            <Card className="space-y-3 py-12 text-center">
              <p className="text-muted">
                {data.message ||
                  "No external exam hall tickets are published for this student right now."}
              </p>
              <p className="text-sm text-muted">
                When the college publishes hall tickets on the exam cell portal, they will appear here
                after you search again.
              </p>
              <a
                href={OFFICIAL_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary-light hover:underline"
              >
                Open official hall ticket page
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-4 py-3">Exam Type</th>
                    <th className="px-4 py-3">Semester</th>
                    <th className="px-4 py-3">Month / Year</th>
                    <th className="px-4 py-3">Exam Date</th>
                    <th className="px-4 py-3">Center</th>
                    <th className="px-4 py-3">Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tickets.map((entry, index) => (
                    <tr key={`${entry.examType}-${entry.semester}-${entry.monthYear}-${index}`} className="border-b border-foreground/5 align-top">
                      <td className="px-4 py-3">{entry.examType || "—"}</td>
                      <td className="px-4 py-3">{entry.semester || "—"}</td>
                      <td className="px-4 py-3">{entry.monthYear || "—"}</td>
                      <td className="px-4 py-3">{entry.examDate || "—"}</td>
                      <td className="px-4 py-3 max-w-[200px]">{entry.examCenter || "—"}</td>
                      <td className="px-4 py-3">
                        {entry.subjects?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.subjects.map((code) => (
                              <Badge key={code} variant="default">
                                {code}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
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
