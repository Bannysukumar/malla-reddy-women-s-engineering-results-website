const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:3000" : "")
).replace(/\/$/, "");

export const SITE_URL = import.meta.env.VITE_SITE_URL || "https://mrecwconnect.vercel.app";

export const SEO = {
  title: "MRECW CONNECT — Malla Reddy Engineering College for Women Results | CGPA & Overall Marks",
  description:
    "Check MRECW (Malla Reddy Engineering College for Women) exam results instantly. View individual CGPA, overall marks, semester grades and whole class results by hall ticket — no login required.",
  keywords:
    "MRECW results, Malla Reddy Engineering College for Women, MRECW exam results, MRECW hall ticket, MRECW CGPA, MRECW overall marks, MRECW autonomous college, MRECW exam cell, mrecwexamcell, Hyderabad engineering results",
};

export const FAQ_ITEMS = [
  {
    q: "How to check MRECW results without login?",
    a: "Enter your hall ticket number (e.g. 23RH1A0511) in Individual Results and click Get Results. Your overall marks and CGPA appear within ~20 seconds.",
  },
  {
    q: "How to check whole class results?",
    a: "Switch to Class Results, enter section prefix (23RH1A05) and roll range (1–60). You'll get a ranked CGPA list with class average.",
  },
  {
    q: "What is MRECW hall ticket format?",
    a: "Format: 23RH1A0511 — batch year (23), college code (RH), branch/section (1A), roll number (0511). Class prefix is everything except the last 2 digits.",
  },
  {
    q: "Is this the official MRECW website?",
    a: "No. MRECW CONNECT is an unofficial student tool. For official records visit mrecwexamcell.com.",
  },
  {
    q: "Is MRECW an autonomous college?",
    a: "Yes. Malla Reddy Engineering College for Women (MRECW) is an autonomous engineering institution in Hyderabad, affiliated with JNTUH.",
  },
];

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export async function fetchIndividualResults(hallTicket) {
  const res = await fetch(apiUrl(`/api/results/${encodeURIComponent(hallTicket)}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not fetch results");
  return data;
}

export async function streamClassResults(payload, onEvent) {
  const res = await fetch(apiUrl("/api/class-results"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, stream: true }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Could not fetch class results");
  }

  const reader = res.body.getReader();
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

export function exportClassCsv(data) {
  const rows = [
    ["Rank", "Hall Ticket", "Name", "Branch", "CGPA", "Credits Obtained", "Credits Total", "Subjects Due"],
  ];
  data.students.forEach((s, i) => {
    rows.push([
      i + 1,
      s.hallTicket,
      s.studentName || "",
      s.branch || "",
      s.cgpa || "",
      s.creditsObtained || "",
      s.creditsTotal || "",
      s.subjectsDue || "",
    ]);
  });
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.prefix || "class"}_results.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
