import { useState } from "react";
import { fetchIndividualResults } from "../lib/api";
import { SearchIcon } from "../components/Icons";
import PageHeader from "../components/PageHeader";

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
      setData(await fetchIndividualResults(ticket));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const backlogs = (data?.subjects || []).filter(
    (s) => s.status === "F" || s.status === "f" || (s.grades || []).some((g) => g === "F")
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Backlog Report"
        description="View your backlog subjects and pending credits with your hall ticket."
      />

      <form onSubmit={handleSubmit} className="card p-6">
        <label htmlFor="backlogTicket" className="mb-2 block text-sm font-medium text-[rgb(var(--text-muted))]">
          Hall Ticket Number
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
          <input
            id="backlogTicket"
            type="text"
            value={hallTicket}
            onChange={(e) => setHallTicket(e.target.value.toUpperCase())}
            placeholder="Enter Hall Ticket (e.g. 23RH1A0511)"
            className="input-field pl-12"
            required
          />
        </div>
        <button type="submit" className="btn-primary mt-4 sm:w-auto" disabled={loading}>
          {loading ? "Fetching…" : "Get Backlog Report"}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Student", value: data.studentName || "—" },
              { label: "Backlogs", value: backlogs.length },
              { label: "Subjects Due", value: data.subjectsDue ?? "—" },
            ].map((s) => (
              <div key={s.label} className="card p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">{s.label}</div>
                <div className="mt-1 font-display text-xl font-bold text-brand-300">{s.value}</div>
              </div>
            ))}
          </div>

          {backlogs.length === 0 ? (
            <div className="card p-6 text-center text-[rgb(var(--text-muted))]">
              No backlog subjects found. Great job!
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border)/0.08)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgb(var(--border)/0.08)] bg-[rgb(var(--border)/0.04)] text-left text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Grades</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {backlogs.map((sub) => (
                    <tr key={`${sub.sno}-${sub.code}`} className="border-b border-[rgb(var(--border)/0.04)]">
                      <td className="px-4 py-3">{sub.sno}</td>
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
      )}
    </div>
  );
}
