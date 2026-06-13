const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:3000" : "")
).replace(/\/$/, "");

export const SITE_URL = import.meta.env.VITE_SITE_URL || "https://mrecwexamcell.vercel.app";

export const SEO = {
  title: "MRECW Results — Check CGPA, Overall Marks & Class Rankings | Malla Reddy Engineering College for Women",
  description:
    "Check MRECW exam results instantly. View individual CGPA, overall marks, semester grades, and whole class rankings by hall ticket — fast, free, and no login required.",
  keywords:
    "MRECW results, Malla Reddy Engineering College for Women results, MRECW exam results, MRECW hall ticket results, MRECW CGPA checker, MRECW overall marks, MRECW class results, Hyderabad engineering college results, autonomous college results Telangana",
};

export const FAQ_ITEMS = [
  {
    q: "How do I check my MRECW results?",
    a: "Enter your hall ticket number (e.g. 23RH1A0511) in the search box and click Get Results. Your overall marks, semester grades, and CGPA appear within about 20 seconds.",
  },
  {
    q: "How do I view whole class results?",
    a: "Switch to the Class Results tab, enter your section prefix (e.g. 23RH1A05) and roll range (1–60). You'll receive a ranked CGPA list with the class average.",
  },
  {
    q: "What is the MRECW hall ticket format?",
    a: "A typical format is 23RH1A0511 — batch year (23), college code (RH), branch/section (1A), and roll number (0511). The class prefix is everything except the last two digits.",
  },
  {
    q: "Is MRECW Results free to use?",
    a: "Yes. MRECW Results is completely free. You can check individual and class results without creating an account or logging in.",
  },
  {
    q: "Is MRECW an autonomous college?",
    a: "Yes. Malla Reddy Engineering College for Women (MRECW) is an autonomous engineering institution in Hyderabad, Telangana.",
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

export async function fetchBacklogReport(hallTicket) {
  const res = await fetch(apiUrl("/api/backlog-report"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hallTicket }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not fetch backlog report");
  return data;
}

export async function fetchResultContrast(hallTicketA, hallTicketB) {
  const res = await fetch(apiUrl("/api/result-contrast"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hallTicketA, hallTicketB }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not compare results");
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
