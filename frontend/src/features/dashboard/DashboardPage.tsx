import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { HallTicketSearch } from "@/shared/components/HallTicketSearch";
import { Card } from "@/shared/components/ui/Card";
import { DASHBOARD_CARDS } from "@/shared/constants/navigation";
import { useSearchHistory } from "@/shared/hooks/useSearchHistory";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { history } = useSearchHistory();

  return (
    <div className="space-y-10">
      <section className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
        >
          Academic Results Portal
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mx-auto mt-4 max-w-2xl text-base text-muted sm:text-lg"
        >
          Fast, Secure and Smart Academic Insights for MRECW Students
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-8 max-w-xl"
        >
          <HallTicketSearch
            onSearch={(ticket) => navigate(`/academic-results?ticket=${encodeURIComponent(ticket)}`)}
          />
        </motion.div>
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold">Recent Results</h2>
          <div className="flex flex-wrap gap-2">
            {history.map((ticket) => (
              <Link
                key={ticket}
                to={`/academic-results?ticket=${encodeURIComponent(ticket)}`}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-sm transition hover:border-primary/30 hover:bg-primary/10"
              >
                {ticket}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Quick Actions</h2>
            <p className="mt-1 text-sm text-muted">Premium tools for every academic need</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {DASHBOARD_CARDS.map((card, i) => (
            <motion.div
              key={card.path}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <Link to={card.path} className="block h-full">
                <Card className={`group h-full bg-gradient-to-br ${card.gradient} transition hover:border-primary/30 hover:shadow-glow`}>
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <card.icon className="h-6 w-6 text-primary-light" />
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {card.stat}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{card.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-light">
                    Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
