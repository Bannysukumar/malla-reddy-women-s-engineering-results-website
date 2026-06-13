import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/shared/components/ui/Card";
import type { StudentResult } from "@/shared/types/results";

const COLORS = ["#7C3AED", "#A78BFA", "#22C55E", "#F59E0B", "#EF4444", "#6366F1"];

function buildAnalytics(data: StudentResult) {
  const subjects = data.subjects || [];
  const semesterMap = new Map<string, { sgpa: number; count: number; passed: number; failed: number }>();

  subjects.forEach((sub, i) => {
    const sem = `Sem ${Math.floor(i / 6) + 1}`;
    const entry = semesterMap.get(sem) || { sgpa: 0, count: 0, passed: 0, failed: 0 };
    entry.count += 1;
    if (sub.status === "P") entry.passed += 1;
    if (sub.status === "F") entry.failed += 1;
    const grade = sub.grades?.[sub.grades.length - 1];
    const points: Record<string, number> = { O: 10, A: 9, B: 8, C: 7, D: 6, F: 0 };
    entry.sgpa += points[grade?.replace("+", "") || ""] ?? 7;
    semesterMap.set(sem, entry);
  });

  const semesterData = Array.from(semesterMap.entries()).map(([name, v]) => ({
    name,
    sgpa: v.count ? Number((v.sgpa / v.count).toFixed(2)) : 0,
    passed: v.passed,
    failed: v.failed,
  }));

  const cgpa = parseFloat(data.cgpa || "0") || 0;
  const cgpaGrowth = semesterData.map((s, i) => ({
    name: s.name,
    cgpa: Number((cgpa * ((i + 1) / Math.max(semesterData.length, 1))).toFixed(2)),
  }));

  const obtained = parseFloat(data.creditsObtained || "0") || 0;
  const total = parseFloat(data.creditsTotal || "1") || 1;
  const creditData = [
    { name: "Earned", value: obtained },
    { name: "Remaining", value: Math.max(total - obtained, 0) },
  ];

  const passed = subjects.filter((s) => s.status === "P").length;
  const failed = subjects.filter((s) => s.status === "F").length;
  const passPct = subjects.length ? Math.round((passed / subjects.length) * 100) : 0;

  const backlogData = [
    { name: "Passed", value: passed },
    { name: "Backlog", value: failed },
  ];

  return { semesterData, cgpaGrowth, creditData, backlogData, passPct };
}

export function AnalyticsCharts({ data }: { data: StudentResult }) {
  const { semesterData, cgpaGrowth, creditData, backlogData, passPct } = buildAnalytics(data);

  if (!data.subjects?.length) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 font-display text-lg font-semibold">Semester Wise SGPA</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={semesterData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
            <YAxis stroke="#94A3B8" fontSize={12} domain={[0, 10]} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff15", borderRadius: 12 }} />
            <Bar dataKey="sgpa" fill="#7C3AED" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 className="mb-4 font-display text-lg font-semibold">CGPA Growth</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={cgpaGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
            <YAxis stroke="#94A3B8" fontSize={12} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff15", borderRadius: 12 }} />
            <Area type="monotone" dataKey="cgpa" stroke="#A78BFA" fill="#7C3AED33" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 className="mb-4 font-display text-lg font-semibold">Pass Percentage · {passPct}%</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={semesterData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
            <YAxis stroke="#94A3B8" fontSize={12} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff15", borderRadius: 12 }} />
            <Legend />
            <Line type="monotone" dataKey="passed" stroke="#22C55E" strokeWidth={2} />
            <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 className="mb-4 font-display text-lg font-semibold">Credit Completion</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={creditData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
              {creditData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff15", borderRadius: 12 }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="mb-4 font-display text-lg font-semibold">Backlog Analysis</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={backlogData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#94A3B8" />
            <YAxis stroke="#94A3B8" />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #ffffff15", borderRadius: 12 }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              <Cell fill="#22C55E" />
              <Cell fill="#EF4444" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

export function EmptyAnalytics() {
  return (
    <Card className="py-12 text-center text-muted">
      Search a hall ticket to view performance analytics and charts.
    </Card>
  );
}
