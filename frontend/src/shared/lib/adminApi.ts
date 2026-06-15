import type { AdminUser, FeedbackItem, FooterSettings, NotificationItem } from "@/shared/types/settings";

const ADMIN_TOKEN_KEY = "mrecw_admin_token";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:3000" : "")
).replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export interface AdminStats {
  firebaseEnabled: boolean;
  storedStudents: number;
  totalSearches: number;
  uniqueStudentsSearched: number;
  storedBacklogs: number;
  storedClassResults: number;
  storedResultCompares: number;
  storedCreditsCompares: number;
  storedExamHallTickets?: number;
  storedAttendance?: number;
  storedOverallResults?: number;
  storedSemwiseMarks?: number;
  lastAnalyticsUpdate?: string;
  hardScrapeRunning?: boolean;
  bulkScrapeRunning?: Record<string, boolean>;
}

export type AdminScrapeJobType =
  | "results"
  | "attendance"
  | "overall-result"
  | "semwise-marks"
  | "exam-hall-tickets"
  | "class-results";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function adminHeaders(): HeadersInit {
  const token = getAdminToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export async function adminLogin(username: string, password: string) {
  const res = await fetch(apiUrl("/api/admin/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  setAdminToken(data.token);
  return data as { token: string; username: string };
}

export async function verifyAdminSession() {
  const token = getAdminToken();
  if (!token) return false;
  const res = await fetch(apiUrl("/api/admin/verify"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    setAdminToken(null);
    return false;
  }
  return true;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch(apiUrl("/api/admin/stats"), { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load stats");
  return data as AdminStats;
}

export async function streamHardScrape(onEvent: (event: Record<string, unknown>) => void) {
  return streamAdminScrape("results", onEvent);
}

export async function streamAdminScrape(jobType: AdminScrapeJobType, onEvent: (event: Record<string, unknown>) => void) {
  const res = await fetch(apiUrl(`/api/admin/scrape/${encodeURIComponent(jobType)}`), {
    method: "POST",
    headers: adminHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Bulk scrape failed to start");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      onEvent(JSON.parse(line.slice(6)));
    }
  }
}

export function adminLogout() {
  setAdminToken(null);
}

export async function fetchAdminFeedback(): Promise<FeedbackItem[]> {
  const res = await fetch(apiUrl("/api/admin/feedback"), { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load feedback");
  return data.items as FeedbackItem[];
}

export async function updateFeedbackStatus(id: string, status: FeedbackItem["status"]) {
  const res = await fetch(apiUrl(`/api/admin/feedback/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update feedback");
  return data as FeedbackItem;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch(apiUrl("/api/admin/users"), { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load users");
  return data.items as AdminUser[];
}

export async function createAdminUser(payload: { username: string; password: string; role?: string }) {
  const res = await fetch(apiUrl("/api/admin/users"), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create user");
  return data as AdminUser;
}

export async function updateAdminUser(id: string, payload: { role?: string; active?: boolean; password?: string }) {
  const res = await fetch(apiUrl(`/api/admin/users/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update user");
  return data as AdminUser;
}

export async function deleteAdminUser(id: string) {
  const res = await fetch(apiUrl(`/api/admin/users/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: adminHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete user");
}

export async function fetchAdminFooter(): Promise<FooterSettings> {
  const res = await fetch(apiUrl("/api/admin/settings/footer"), { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load footer");
  return data as FooterSettings;
}

export async function saveAdminFooter(settings: FooterSettings) {
  const res = await fetch(apiUrl("/api/admin/settings/footer"), {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save footer");
  return data as FooterSettings;
}

export async function fetchAdminNotifications(): Promise<NotificationItem[]> {
  const res = await fetch(apiUrl("/api/admin/notifications"), { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load notifications");
  return data.items as NotificationItem[];
}

export async function createAdminNotification(payload: {
  title: string;
  body: string;
  published?: boolean;
  link?: string;
}) {
  const res = await fetch(apiUrl("/api/admin/notifications"), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create notification");
  return data as NotificationItem;
}

export async function updateAdminNotification(
  id: string,
  payload: Partial<Pick<NotificationItem, "title" | "body" | "published" | "link">>
) {
  const res = await fetch(apiUrl(`/api/admin/notifications/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update notification");
  return data as NotificationItem;
}

export async function deleteAdminNotification(id: string) {
  const res = await fetch(apiUrl(`/api/admin/notifications/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: adminHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete notification");
}
