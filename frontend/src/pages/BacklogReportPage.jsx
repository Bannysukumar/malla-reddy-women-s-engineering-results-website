import { useState } from "react";
import { fetchBacklogReport } from "../lib/api";
import ResultPageShell, { ResultButton, ShellInput } from "../components/ResultPageShell";

export default function BacklogReportPage() {
  const [hallTicket, setHallTicket] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const ticket = hallTicket.trim().toUpperCase();
    if (!ticket) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      setData(await fetchBacklogReport(ticket));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResultPageShell
      title="Backlog Report"
      error={error}
      loading={loading}
      results={
        data && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Student", value: data.studentName || "—" },
                { label: "Backlogs", value: data.backlogCount ?? 0 },
                { label: "Subjects Due", value: data.subjectsDue ?? "—" },
              ].map((s) => (
                <div key={s.label} className="card p-4 text-center">
                  <div className="text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">{s.label}</div>
                  <div className="mt-1 font-display text-xl font-bold text-brand-300">{s.value}</div>
                </div>
              ))}
            </div>
            {(data.backlogs || []).length === 0 ? (
              <div className="card p-6 text-center text-[rgb(var(--text-muted))]">No backlog subjects found.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border)/0.08)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgb(var(--border)/0.08)] bg-[rgb(var(--border)/0.04)] text-left text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Grades</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.backlogs.map((sub) => (
                      <tr key={`${sub.sno}-${sub.code}`} className="border-b border-[rgb(var(--border)/0.04)]">
                        <td className="px-4 py-3 font-mono text-xs">{sub.code}</td>
                        <td className="px-4 py-3">{sub.name}</td>
                        <td className="px-4 py-3">{(sub.grades || []).join(", ") || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-red-400">{sub.status || "F"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      }
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <ShellInput id="backlogTicket" value={hallTicket} onChange={(e) => setHallTicket(e.target.value.toUpperCase())} />
        <ResultButton loading={loading} />
      </form>
    </ResultPageShell>
  );
}
