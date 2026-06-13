import { useState } from "react";
import { ChevronRight, MessageCircle, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { FAQ_ITEMS } from "@/shared/constants/seo";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

export default function HelpCenterPage() {
  const [view, setView] = useState<"home" | "faq" | "feedback">("home");
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (view === "faq") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button type="button" onClick={() => setView("home")} className="text-sm text-primary-light hover:underline">← Back</button>
        <h1 className="font-display text-3xl font-bold">Frequent Questions</h1>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <details key={item.q} className="premium-card" open={i === 0}>
              <summary className="cursor-pointer font-semibold">{item.q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    );
  }

  if (view === "feedback") {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <button type="button" onClick={() => setView("home")} className="text-sm text-primary-light hover:underline">← Back</button>
        <h1 className="font-display text-3xl font-bold">Suggestion / Feedback</h1>
        {submitted ? (
          <Card className="py-12 text-center text-muted">Thank you for your feedback!</Card>
        ) : (
          <Card>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-4"
            >
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="input-field min-h-[140px] resize-y"
                placeholder="Share your suggestion…"
                required
              />
              <Button type="submit">Submit Feedback</Button>
            </form>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 text-center">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-wide text-sky-400 sm:text-4xl">Help Center</h1>
        <p className="mt-3 text-sm font-medium uppercase tracking-widest text-muted">How can we help you?</p>
      </div>
      <div className="space-y-4">
        {[
          {
            id: "faq" as const,
            title: "Frequent Questions",
            desc: "Browse common questions about MRECW results, CGPA, and how the portal works.",
            icon: HelpCircle,
            border: "border-sky-500/20 hover:border-sky-500/40",
            iconBg: "bg-sky-500/15 text-sky-400",
          },
          {
            id: "feedback" as const,
            title: "Suggestion / Feedback",
            desc: "Share feedback or ideas to help us improve your experience.",
            icon: MessageCircle,
            border: "border-primary/20 hover:border-primary/40",
            iconBg: "bg-primary/15 text-primary-light",
          },
        ].map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            type="button"
            onClick={() => setView(item.id)}
            className={`premium-card flex w-full items-center gap-4 text-left transition ${item.border}`}
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.iconBg}`}>
              <item.icon className="h-6 w-6" />
            </span>
            <span className="flex-1">
              <span className="block font-display text-lg font-bold">{item.title}</span>
              <span className="mt-1 block text-sm text-muted">{item.desc}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
