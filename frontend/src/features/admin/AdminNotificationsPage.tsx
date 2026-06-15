import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import {
  createAdminNotification,
  deleteAdminNotification,
  fetchAdminNotifications,
  updateAdminNotification,
} from "@/shared/lib/adminApi";
import type { NotificationItem } from "@/shared/types/settings";

function formatWhen(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [published, setPublished] = useState(true);
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState<NotificationItem | null>(null);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: fetchAdminNotifications,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const createItem = useMutation({
    mutationFn: () => createAdminNotification({ title, body, link, published }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setLink("");
      setPublished(true);
      setFormError("");
      invalidate();
    },
    onError: (err) => setFormError((err as Error).message),
  });

  const saveEdit = useMutation({
    mutationFn: () =>
      updateAdminNotification(editing!.id, {
        title: editing!.title,
        body: editing!.body,
        link: editing!.link,
        published: editing!.published,
      }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });

  const togglePublished = useMutation({
    mutationFn: ({ id, published: next }: { id: string; published: boolean }) =>
      updateAdminNotification(id, { published: next }),
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => deleteAdminNotification(id),
    onSuccess: invalidate,
  });

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Notifications"
        description="Publish portal updates and alerts shown on the student Notifications page"
      />

      <div className="admin-panel-card">
        <h2 className="font-display text-lg font-semibold">Add Notification</h2>
        <p className="mt-1 text-sm text-muted">Create a new alert for all students</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createItem.mutate();
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message"
            required
            rows={4}
            className="input-field min-h-[120px] w-full resize-y"
          />
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Optional link (e.g. /academic-results or https://...)"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="rounded border-foreground/20"
            />
            Publish immediately
          </label>
          <Button type="submit" loading={createItem.isPending}>
            <Bell className="mr-2 inline h-4 w-4" />
            Add Notification
          </Button>
        </form>
        {formError && <p className="mt-4 text-sm text-error">{formError}</p>}
      </div>

      {error && (
        <div className="rounded-card border border-error/30 bg-error/10 px-5 py-4 text-sm text-error">
          {(error as Error).message}
        </div>
      )}

      <div className="admin-panel-card">
        <h2 className="font-display text-lg font-semibold">All Notifications</h2>
        {isLoading ? (
          <p className="mt-6 text-muted">Loading notifications…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center text-muted">
            <Bell className="mb-4 h-12 w-12 opacity-40" />
            No notifications yet.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-foreground/10 bg-surface-elevated/30 p-5">
                {editing?.id === item.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editing.title}
                      onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                      placeholder="Title"
                    />
                    <textarea
                      value={editing.body}
                      onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                      rows={4}
                      className="input-field min-h-[120px] w-full resize-y"
                    />
                    <Input
                      value={editing.link || ""}
                      onChange={(e) => setEditing({ ...editing, link: e.target.value })}
                      placeholder="Optional link"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editing.published}
                        onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                        className="rounded border-foreground/20"
                      />
                      Published
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => saveEdit.mutate()} loading={saveEdit.isPending}>
                        Save
                      </Button>
                      <Button variant="secondary" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{item.title}</h3>
                        <Badge variant={item.published ? "success" : "default"}>
                          {item.published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted">{formatWhen(item.createdAt)}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{item.body}</p>
                    {item.link && (
                      <p className="mt-2 font-mono text-xs text-primary-light">{item.link}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="!px-3 !py-1.5 text-xs"
                        onClick={() => setEditing(item)}
                      >
                        <Pencil className="mr-1 inline h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        className="!px-3 !py-1.5 text-xs"
                        onClick={() => togglePublished.mutate({ id: item.id, published: !item.published })}
                      >
                        {item.published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        variant="secondary"
                        className="!px-3 !py-1.5 text-xs text-error"
                        onClick={() => {
                          if (window.confirm("Delete this notification?")) removeItem.mutate(item.id);
                        }}
                      >
                        <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
