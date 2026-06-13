import { useState } from "react";
import { fetchResultContrast } from "../lib/api";
import ResultPageShell, { ResultButton, ShellInput } from "../components/ResultPageShell";

export default function ResultContrastPage() {
  const [ticketA, setTicketA] = useState("");
  const [ticketB, setTicketB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const a = ticketA.trim().toUpperCase();
    const b = ticketB.trim().toUpperCase();
    if (!a || !b) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      setData(await fetchResultContrast(a, b));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const cgpaDiff = data?.comparison?.cgpaDifference;

  return (
    <ResultPageShell
      title="Result Contrast"
      error={error}
      loading={loading}
      loadingMessage="Comparing results… this may take up to 60 seconds."
      results={
        data && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {[data.first, data.second].map((r) => (
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
                      <dt className="text-xs text-[rgb(var(--text-muted))]">Backlogs</dt>
                      <dd className="font-display text-xl font-bold">{r.backlogCount ?? "—"}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            {cgpaDiff != null && (
              <div className="card p-4 text-center text-sm">
                CGPA difference (first − second):{" "}
                <span className={`font-display text-lg font-bold ${cgpaDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {cgpaDiff > 0 ? "+" : ""}
                  {cgpaDiff}
                </span>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border)/0.08)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgb(var(--border)/0.08)] bg-[rgb(var(--border)/0.04)] text-left text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">
                    <th className="px-4 py-3">Metric</th>
                    <th className="px-4 py-3">{data.first.hallTicket}</th>
                    <th className="px-4 py-3">{data.second.hallTicket}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.comparison?.metrics || []).map((row) => (
                    <tr key={row.label} className="border-b border-[rgb(var(--border)/0.04)]">
                      <td className="px-4 py-3 font-medium">{row.label}</td>
                      <td className="px-4 py-3">{row.first ?? "—"}</td>
                      <td className="px-4 py-3">{row.second ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <ShellInput
            id="ticketA"
            value={ticketA}
            onChange={(e) => setTicketA(e.target.value.toUpperCase())}
            placeholder="Enter first hallticket no"
          />
          <ShellInput
            id="ticketB"
            value={ticketB}
            onChange={(e) => setTicketB(e.target.value.toUpperCase())}
            placeholder="Enter second hall ticket no"
          />
        </div>
        <ResultButton loading={loading} />
      </form>
    </ResultPageShell>
  );
}
