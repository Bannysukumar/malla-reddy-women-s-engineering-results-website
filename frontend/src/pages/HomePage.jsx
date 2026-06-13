import { ArrowRightIcon } from "../components/Icons";
import { HOME_CARDS, navigateTo } from "../lib/routes";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Welcome to <span className="gradient-text">MRECW Results</span>!!
        </h1>
        <div className="mx-auto mt-5 inline-flex rounded-full border border-[rgb(var(--border)/0.12)] bg-[rgb(var(--surface-card)/0.8)] px-5 py-2 text-sm text-[rgb(var(--text-muted))]">
          Malla Reddy Engineering College for Women, Hyderabad
        </div>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {HOME_CARDS.map((card) => (
          <button
            key={card.pageId}
            type="button"
            onClick={() => navigateTo(card.pageId)}
            className="home-card group text-left"
          >
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              {card.title}
              <ArrowRightIcon className="transition group-hover:translate-x-1" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--text-muted))]">{card.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
