import { useState } from "react";
import SEOHead from "./components/SEOHead";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import IndividualResults from "./components/IndividualResults";
import ClassResults from "./components/ClassResults";
import Features from "./components/Features";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";

export default function App() {
  const [tab, setTab] = useState("individual");

  return (
    <>
      <SEOHead />
      <Navbar />
      <Hero />

      <main id="results" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Check Results</h2>
        <p className="mt-2 text-slate-400">
          Individual student or whole class — like{" "}
          <a href="https://jntuhconnect.dhethi.com/" target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:underline">
            JNTUH CONNECT
          </a>
          .
        </p>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist">
          {[
            { id: "individual", label: "Individual Results" },
            { id: "class", label: "Class Results" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === t.id
                  ? "bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-lg"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6" role="tabpanel">
          {tab === "individual" ? <IndividualResults /> : <ClassResults />}
        </div>
      </main>

      <Features />
      <FAQ />
      <Footer />
    </>
  );
}
