import { Bell } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";

const NOTIFICATIONS = [
  { title: "Results portal updated", body: "MRECW Results Portal now includes analytics and compare features.", time: "Today" },
  { title: "Class results available", body: "Fetch section-wide CGPA rankings from the Class Results page.", time: "This week" },
  { title: "No login required", body: "Check results instantly using your hall ticket only.", time: "Always" },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Notifications</h1>
        <p className="mt-2 text-muted">Portal updates and academic alerts</p>
      </header>
      <div className="space-y-3">
        {NOTIFICATIONS.map((n) => (
          <Card key={n.title} className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-light">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold">{n.title}</h3>
                <span className="text-xs text-muted">{n.time}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{n.body}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
