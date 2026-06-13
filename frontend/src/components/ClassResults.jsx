import { useState } from "react";
import { exportClassCsv, streamClassResults } from "../lib/api";

const DEFAULT = {
  sampleTicket: "23RH1A0511",
  prefix: "23RH1A05",
  startRoll: 1,
  endRoll: 60,
  rollDigits: 2,
};

export default function ClassResults() {
  const [form, setForm] = useState(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);
  const [data, setData] = useState(null);

  function updateField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "sampleTicket" && value.length >= 4) {
        const digits = parseInt(next.rollDigits, 10);
        next.prefix = value.trim().toUpperCase().slice(0, -digits);
      }
      if (key === "rollDigits" && prev.sampleTicket.length >= 4) {
        next.prefix = prev.sampleTicket.trim().toUpperCase().slice(0, -parseInt(value, 10));
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setData(null);
    setProgress({ pct: 0, text: "Preparing…" });

    const payload = {
      prefix: form.prefix.trim().toUpperCase(),
      sampleTicket: form.sampleTicket.trim().toUpperCase(),
      startRoll: parseInt(form.startRoll, 10),
      endRoll: parseInt(form.endRoll, 10),
      rollDigits: parseInt(form.rollDigits, 10),
    };

    try {
      await streamClassResults(payload, (event) => {
        if (event.type === "progress") {
          setProgress({
            pct: Math.round((event.current / event.total) * 100),
            text: `Checking ${event.hallTicket} (${event.current}/${event.total})`,
          });
        }
        if (event.type === "done") {
          setData(event.result);
          setProgress(null);
          document.getElementById("class-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } catch (err) {
      setError(err.message);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[rgb(var(--text-muted))]">Sample Hall Ticket</label>
            <input
              type="text"
              value={form.sampleTicket}
              onChange={(e) => updateField("sampleTicket", e.target.value.toUpperCase())}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[rgb(var(--text-muted))]">Section Prefix</label>
            <input
              type="text"
              value={form.prefix}
              onChange={(e) => updateField("prefix", e.target.value.toUpperCase())}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[rgb(var(--text-muted))]">Roll Digits</label>
            <select
              value={form.rollDigits}
              onChange={(e) => updateField("rollDigits", e.target.value)}
              className="input-field"
            >
              <option value="2">2 digits (01–60)</option>
              <option value="3">3 digits</option>
              <option value="4">4 digits</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[rgb(var(--text-muted))]">Start</label>
              <input
                type="number"
                value={form.startRoll}
                onChange={(e) => updateField("startRoll", e.target.value)}
                className="input-field"
                min="1"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[rgb(var(--text-muted))]">End</label>
              <input
                type="number"
                value={form.endRoll}
                onChange={(e) => updateField("endRoll", e.target.value)}
                className="input-field"
                min="1"
                required
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary sm:w-auto" disabled={loading}>
            {loading ? "Fetching Class…" : "Fetch Class Results"}
          </button>
          {data?.students?.length > 0 && (
            <button type="button" className="btn-secondary" onClick={() => exportClassCsv(data)}>
              Export CSV
            </button>
          )}
        </div>
        <p className="text-xs text-[rgb(var(--text-muted))]">
          Section {form.prefix}01–{form.prefix}
          {String(form.endRoll).padStart(form.rollDigits, "0")} · ranked by CGPA
        </p>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
          {error}
        </div>
      )}

      {progress && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--border)/0.08)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-300"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{progress.text}</p>
        </div>
      )}

      {data && (
        <div id="class-output" className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Students Found", value: data.successCount },
              { label: "Failed", value: data.failedCount },
              { label: "Class Avg CGPA", value: data.classAverageCgpa ?? "—" },
              { label: "Section", value: data.prefix },
            ].map((s) => (
              <div key={s.label} className="card p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">{s.label}</div>
                <div className="font-display text-2xl font-bold text-brand-300">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border)/0.08)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border)/0.08)] bg-[rgb(var(--border)/0.04)] text-left text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Hall Ticket</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">CGPA</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Due</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s, i) => (
                  <tr key={s.hallTicket} className="border-b border-[rgb(var(--border)/0.04)] hover:bg-[rgb(var(--border)/0.02)]">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.hallTicket}</td>
                    <td className="px-4 py-3">{s.studentName || "—"}</td>
                    <td className="px-4 py-3">{s.branch || "—"}</td>
                    <td className="px-4 py-3 font-bold text-brand-300">{s.cgpa || "—"}</td>
                    <td className="px-4 py-3">
                      {s.creditsObtained && s.creditsTotal ? `${s.creditsObtained}/${s.creditsTotal}` : "—"}
                    </td>
                    <td className="px-4 py-3">{s.subjectsDue ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.failed?.length > 0 && (
            <details className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
              <summary className="cursor-pointer font-semibold">Failed lookups ({data.failed.length})</summary>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {data.failed.map((f) => (
                  <li key={f.hallTicket}>
                    {f.hallTicket}: {f.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
