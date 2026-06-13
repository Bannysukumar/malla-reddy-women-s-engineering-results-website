import type {
  BacklogReport,
  ClassResult,
  ResultContrast,
  StudentResult,
} from "@/shared/types/results";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:3000" : "")
).replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

export async function fetchResults(hallTicket: string): Promise<StudentResult> {
  const res = await fetch(apiUrl(`/api/results/${encodeURIComponent(hallTicket)}`));
  return parseJson<StudentResult>(res);
}

export async function fetchBacklogReport(hallTicket: string): Promise<BacklogReport> {
  const res = await fetch(apiUrl("/api/backlog-report"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hallTicket }),
  });
  return parseJson<BacklogReport>(res);
}

export async function fetchResultContrast(hallTicketA: string, hallTicketB: string): Promise<ResultContrast> {
  const res = await fetch(apiUrl("/api/result-contrast"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hallTicketA, hallTicketB }),
  });
  return parseJson<ResultContrast>(res);
}

export async function streamClassResults(
  payload: {
    prefix?: string;
    sampleTicket: string;
    startRoll?: number;
    endRoll?: number;
    rollDigits?: number;
  },
  onEvent: (event: Record<string, unknown>) => void
): Promise<void> {
  const res = await fetch(apiUrl("/api/class-results"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, stream: true }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Could not fetch class results");
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

export function exportClassCsv(data: ClassResult) {
  const rows = [
    ["Rank", "Hall Ticket", "Name", "Branch", "CGPA", "Credits", "Due"],
    ...data.students.map((s, i) => [
      i + 1,
      s.hallTicket,
      s.studentName || "",
      s.branch || "",
      s.cgpa || "",
      s.creditsObtained && s.creditsTotal ? `${s.creditsObtained}/${s.creditsTotal}` : "",
      s.subjectsDue ?? "",
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.prefix || "class"}_results.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export const queryKeys = {
  results: (ticket: string) => ["results", ticket] as const,
  backlog: (ticket: string) => ["backlog", ticket] as const,
  contrast: (a: string, b: string) => ["contrast", a, b] as const,
};
