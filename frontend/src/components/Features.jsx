const FEATURES = [
  {
    icon: "🎓",
    title: "Individual Results",
    desc: "Enter hall ticket and get complete overall marks — all semesters, subject grades, CGPA and credits.",
  },
  {
    icon: "📊",
    title: "Class Rankings",
    desc: "Fetch CGPA rankings for your entire section. Compare with classmates like JNTUH class results.",
  },
  {
    icon: "⚡",
    title: "No ERP Login",
    desc: "Skip Bee ERP login. We fetch from the official mrecwexamcell.com portal automatically.",
  },
  {
    icon: "📥",
    title: "Export CSV",
    desc: "Download class results as CSV for analysis, sharing or offline records.",
  },
];

export default function Features() {
  return (
    <section id="features" className="border-t border-white/10 bg-slate-900/50 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Why MRECW CONNECT?</h2>
        <p className="mt-2 text-slate-400">Built for MRECW students — inspired by JNTUH CONNECT.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article key={f.title} className="card p-6 transition hover:border-brand-500/30">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-display font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
