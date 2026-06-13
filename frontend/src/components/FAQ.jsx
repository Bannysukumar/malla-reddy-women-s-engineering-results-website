import { FAQ_ITEMS } from "../lib/api";

export default function FAQ() {
  return (
    <section id="faq" className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Frequently Asked Questions</h2>
        <div className="mt-8 space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={item.q}
              className="group card overflow-hidden"
              open={i === 0}
            >
              <summary className="cursor-pointer px-5 py-4 font-semibold text-white marker:content-none">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-brand-400 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-slate-400">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
