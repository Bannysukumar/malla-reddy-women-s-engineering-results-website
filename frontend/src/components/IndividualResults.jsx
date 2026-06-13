import { useState } from "react";
import { fetchIndividualResults } from "../lib/api";
import { SearchIcon } from "./Icons";

export default function IndividualResults() {
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
      const result = await fetchIndividualResults(ticket);
      setData(result);
      document.getElementById("results-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="card p-6">
        <label htmlFor="hallTicket" className="mb-2 block text-sm font-medium text-[rgb(var(--text-muted))]">
          Hall Ticket Number
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
          <input
            id="hallTicket"
            type="text"
            value={hallTicket}
            onChange={(e) => setHallTicket(e.target.value.toUpperCase())}
            placeholder="Enter Hall Ticket (e.g. 23RH1A0511)"
            className="input-field pl-12"
            required
            autoComplete="off"
            aria-label="Hall ticket number"
          />
        </div>
        <button type="submit" className="btn-primary mt-4 sm:w-auto" disabled={loading}>
          <SearchIcon className="h-4 w-4" />
          {loading ? "Fetching Results…" : "Get Results"}
        </button>
        <p className="mt-3 text-xs text-[rgb(var(--text-muted))]">
          View semester grades, overall marks, CGPA, and credits instantly.
        </p>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-4 rounded-xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
          Fetching your results… this may take up to 30 seconds.
        </div>
      )}

      {data && (
        <div id="results-output" className="mt-6 space-y-4">
          <div className="card flex flex-wrap items-start justify-between gap-6 p-6">
            <div>
              <h3 className="font-display text-2xl font-bold">{data.studentName || "Student"}</h3>
              <p className="mt-1 font-medium text-brand-400">{data.hallTicket}</p>
              {data.branch && <p className="text-sm text-[rgb(var(--text-muted))]">{data.branch}</p>}
            </div>
            <div className="flex gap-6">
              {[
                { label: "CGPA", value: data.cgpa || "—" },
                {
                  label: "Credits",
                  value: data.creditsObtained && data.creditsTotal ? `${data.creditsObtained}/${data.creditsTotal}` : "—",
                },
                {
                  label: "Due",
                  value: data.subjectsDue != null ? `${data.subjectsDue}/${data.subjectsTotal}` : "—",
                },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">{s.label}</div>
                  <div className="font-display text-2xl font-bold text-brand-300">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border)/0.08)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border)/0.08)] bg-[rgb(var(--border)/0.04)] text-left text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Grades</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.subjects || []).map((sub) => (
                  <tr key={`${sub.sno}-${sub.code}`} className="border-b border-[rgb(var(--border)/0.04)] hover:bg-[rgb(var(--border)/0.02)]">
                    <td className="px-4 py-3">{sub.sno}</td>
                    <td className="px-4 py-3 font-mono text-xs">{sub.code}</td>
                    <td className="px-4 py-3">{sub.name}</td>
                    <td className="px-4 py-3">
                      {(sub.grades || []).map((g) => (
                        <span key={g} className="mr-1 rounded-md bg-brand-600/15 px-2 py-0.5 text-xs text-brand-300">
                          {g}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3">{sub.credits || "—"}</td>
                    <td
                      className={`px-4 py-3 font-semibold ${sub.status === "P" ? "text-emerald-400" : sub.status === "F" ? "text-red-400" : ""}`}
                    >
                      {sub.status || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
