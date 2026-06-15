import { useQuery } from "@tanstack/react-query";
import { Bell, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/shared/components/ui/Card";
import { ResultSkeleton } from "@/shared/components/ui/Skeleton";
import { fetchNotifications, queryKeys } from "@/shared/lib/api";

function formatWhen(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function NotificationLink({ href }: { href: string }) {
  const isExternal = href.startsWith("http://") || href.startsWith("https://");

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-sm text-primary-light hover:underline"
      >
        Learn more
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    );
  }

  return (
    <Link to={href} className="mt-2 inline-flex items-center gap-1 text-sm text-primary-light hover:underline">
      Learn more
    </Link>
  );
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: fetchNotifications,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Notifications</h1>
        <p className="mt-2 text-muted">Portal updates and academic alerts</p>
      </header>

      {error && (
        <div className="rounded-card border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {(error as Error).message}
        </div>
      )}

      {isLoading && <ResultSkeleton />}

      {!isLoading && notifications.length === 0 && !error && (
        <Card className="py-12 text-center text-muted">
          <Bell className="mx-auto mb-4 h-10 w-10 opacity-40" />
          No notifications right now. Check back later for updates.
        </Card>
      )}

      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-light">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold">{n.title}</h3>
                <span className="shrink-0 text-xs text-muted">{formatWhen(n.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{n.body}</p>
              {n.link && <NotificationLink href={n.link} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
