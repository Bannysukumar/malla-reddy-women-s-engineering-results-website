import { FAQ_ITEMS } from "../lib/api";
import PageHeader from "../components/PageHeader";

export default function HelpCenterPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Help center"
        description="Find answers to common questions about checking MRECW exam results."
      />

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <details key={item.q} className="group card overflow-hidden" open={i === 0}>
            <summary className="cursor-pointer px-5 py-4 font-semibold marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {item.q}
                <span className="text-brand-400 transition group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="border-t border-[rgb(var(--border)/0.08)] px-5 py-4 text-sm leading-relaxed text-[rgb(var(--text-muted))]">
              {item.a}
            </p>
          </details>
        ))}
      </div>

      <div className="card mt-8 p-6">
        <h2 className="font-display text-lg font-bold">Need more help?</h2>
        <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">
          Use <strong>Academic Result</strong> for full marksheets, <strong>Backlog Report</strong> for failed subjects,
          <strong> Class Result</strong> for section rankings, and <strong>Result Contrast</strong> to compare two students.
        </p>
      </div>
    </div>
  );
}
