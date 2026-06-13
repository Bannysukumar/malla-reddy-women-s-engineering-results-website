import { useState } from "react";
import { fetchIndividualResults } from "../lib/api";

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
      document.getElementById("results-output")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="card p-6">
        <label htmlFor="hallTicket" className="mb-2 block text-sm font-medium text-slate-300">
          Hall Ticket Number
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="hallTicket"
            type="text"
            value={hallTicket}
            onChange={(e) => setHallTicket(e.target.value.toUpperCase())}
            placeholder="e.g. 23RH1A0511"
            className="input-field flex-1"
            required
            autoComplete="off"
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Fetching…" : "Get Results"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">View all semester overall marks, subject grades, CGPA &amp; credits.</p>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
          Fetching results from exam cell portal…
        </div>
      )}

      {data && (
        <div id="results-output" className="mt-6 space-y-4">
          <div className="card flex flex-wrap items-start justify-between gap-6 p-6">
            <div>
              <h3 className="font-display text-2xl font-bold text-white">{data.studentName || "Student"}</h3>
              <p className="mt-1 font-medium text-brand-300">{data.hallTicket}</p>
              {data.branch && <p className="text-sm text-slate-400">{data.branch}</p>}
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
                  <div className="text-xs uppercase tracking-wider text-slate-500">{s.label}</div>
                  <div className="font-display text-2xl font-bold text-brand-200">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400">
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
                  <tr key={`${sub.sno}-${sub.code}`} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">{sub.sno}</td>
                    <td className="px-4 py-3 font-mono text-xs">{sub.code}</td>
                    <td className="px-4 py-3">{sub.name}</td>
                    <td className="px-4 py-3">
                      {(sub.grades || []).map((g) => (
                        <span key={g} className="mr-1 rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-200">
                          {g}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3">{sub.credits || "—"}</td>
                    <td className={`px-4 py-3 font-semibold ${sub.status === "P" ? "text-emerald-400" : sub.status === "F" ? "text-red-400" : ""}`}>
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
