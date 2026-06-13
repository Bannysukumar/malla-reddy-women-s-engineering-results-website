export default function Hero() {
  return (
    <header className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-slate-950 to-indigo-950" />
      <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <span className="mb-4 inline-block rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200">
          Autonomous College · Hyderabad
        </span>
        <h1 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-5xl">
          Malla Reddy Engineering
          <br />
          <span className="bg-gradient-to-r from-brand-300 to-indigo-300 bg-clip-text text-transparent">
            College for Women
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Check <strong className="text-white">overall marks</strong>, <strong className="text-white">CGPA</strong>,
          semester grades &amp; <strong className="text-white">class rankings</strong> — instantly, without ERP login.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          {[
            { num: "1-Click", label: "Individual Results" },
            { num: "Class", label: "Section Rankings" },
            { num: "Free", label: "No Login Needed" },
          ].map((s) => (
            <div key={s.label} className="card px-5 py-3">
              <div className="font-display text-xl font-bold text-brand-300">{s.num}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
