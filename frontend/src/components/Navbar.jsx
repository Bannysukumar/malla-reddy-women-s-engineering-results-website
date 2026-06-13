export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 font-display text-lg font-bold text-white">
            M
          </span>
          <span className="font-display leading-tight">
            <span className="block text-base font-bold text-white">MRECW</span>
            <span className="block text-xs font-semibold tracking-widest text-brand-300">CONNECT</span>
          </span>
        </a>
        <div className="hidden items-center gap-6 text-sm font-medium text-slate-300 sm:flex">
          <a href="#results" className="transition hover:text-white">Results</a>
          <a href="#features" className="transition hover:text-white">Features</a>
          <a href="#faq" className="transition hover:text-white">FAQ</a>
          <a
            href="https://mrecwexamcell.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white/5 px-3 py-1.5 transition hover:bg-white/10"
          >
            Official Portal
          </a>
        </div>
      </div>
    </nav>
  );
}
