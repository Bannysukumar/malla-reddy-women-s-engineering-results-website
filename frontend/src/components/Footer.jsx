export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <strong className="font-display text-lg text-white">MRECW CONNECT</strong>
            <p className="mt-1 text-sm text-slate-500">
              Malla Reddy Engineering College for Women · Autonomous · Hyderabad
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="https://mrecwexamcell.com" target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:text-brand-200">
              Official Exam Cell
            </a>
            <a href="https://mrecw.ac.in/" target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:text-brand-200">
              MRECW Website
            </a>
            <a href="https://github.com/ThilakReddyy/JNTUHRESULTS-WEB" target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:text-brand-200">
              Inspired by JNTUH Results
            </a>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-slate-600">
          © 2026 MRECW CONNECT. Not affiliated with MRECW administration. Results sourced from official portal.
        </p>
      </div>
    </footer>
  );
}
