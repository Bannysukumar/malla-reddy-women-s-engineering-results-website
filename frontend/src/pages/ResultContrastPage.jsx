import { useState } from "react";
import { fetchIndividualResults } from "../lib/api";
import PageHeader from "../components/PageHeader";

export default function ResultContrastPage() {
  const [ticketA, setTicketA] = useState("");
  const [ticketB, setTicketB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const a = ticketA.trim().toUpperCase();
    const b = ticketB.trim().toUpperCase();
    if (!a || !b) return;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const [dataA, dataB] = await Promise.all([fetchIndividualResults(a), fetchIndividualResults(b)]);
      setResults({ a: dataA, b: dataB });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const cgpaDiff =
    results?.a?.cgpa && results?.b?.cgpa
      ? (parseFloat(results.a.cgpa) - parseFloat(results.b.cgpa)).toFixed(2)
      : null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Result Contrast"
        description="Compare CGPA, credits, and academic summary between two hall tickets."
      />

      <form onSubmit={handleSubmit} className="card grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-[rgb(var(--text-muted))]">Hall Ticket 1</label>
          <input
            type="text"
            value={ticketA}
            onChange={(e) => setTicketA(e.target.value.toUpperCase())}
            placeholder="e.g. 23RH1A0511"
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-[rgb(var(--text-muted))]">Hall Ticket 2</label>
          <input
            type="text"
            value={ticketB}
            onChange={(e) => setTicketB(e.target.value.toUpperCase())}
            placeholder="e.g. 23RH1A0512"
            className="input-field"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary sm:w-auto" disabled={loading}>
            {loading ? "Comparing…" : "Compare Results"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
          {error}
        </div>
      )}

      {results && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {[results.a, results.b].map((r) => (
              <div key={r.hallTicket} className="card p-5">
                <h3 className="font-display text-lg font-bold">{r.studentName || "Student"}</h3>
                <p className="text-sm text-brand-400">{r.hallTicket}</p>
                {r.branch && <p className="text-sm text-[rgb(var(--text-muted))]">{r.branch}</p>}
                <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <dt className="text-xs text-[rgb(var(--text-muted))]">CGPA</dt>
                    <dd className="font-display text-xl font-bold text-brand-300">{r.cgpa || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[rgb(var(--text-muted))]">Credits</dt>
                    <dd className="font-display text-xl font-bold">
                      {r.creditsObtained && r.creditsTotal ? `${r.creditsObtained}/${r.creditsTotal}` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[rgb(var(--text-muted))]">Due</dt>
                    <dd className="font-display text-xl font-bold">{r.subjectsDue ?? "—"}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {cgpaDiff != null && (
            <div className="card p-4 text-center">
              <span className="text-sm text-[rgb(var(--text-muted))]">CGPA Difference (Ticket 1 − Ticket 2): </span>
              <span className={`font-display text-lg font-bold ${parseFloat(cgpaDiff) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {parseFloat(cgpaDiff) > 0 ? "+" : ""}
                {cgpaDiff}
              </span>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border)/0.08)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border)/0.08)] bg-[rgb(var(--border)/0.04)] text-left text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">{results.a.hallTicket}</th>
                  <th className="px-4 py-3">{results.b.hallTicket}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["CGPA", results.a.cgpa, results.b.cgpa],
                  ["Credits", `${results.a.creditsObtained}/${results.a.creditsTotal}`, `${results.b.creditsObtained}/${results.b.creditsTotal}`],
                  ["Subjects Due", results.a.subjectsDue, results.b.subjectsDue],
                  ["Backlogs", countBacklogs(results.a), countBacklogs(results.b)],
                ].map(([label, valA, valB]) => (
                  <tr key={label} className="border-b border-[rgb(var(--border)/0.04)]">
                    <td className="px-4 py-3 font-medium">{label}</td>
                    <td className="px-4 py-3">{valA ?? "—"}</td>
                    <td className="px-4 py-3">{valB ?? "—"}</td>
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

function countBacklogs(data) {
  return (data.subjects || []).filter((s) => s.status === "F" || s.status === "f").length;
}
