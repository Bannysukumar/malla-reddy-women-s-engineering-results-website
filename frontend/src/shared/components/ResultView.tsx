import { motion } from "framer-motion";
import { GraduationCap, TrendingUp } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";
import { Card } from "@/shared/components/ui/Card";
import type { StudentResult } from "@/shared/types/results";

interface ResultViewProps {
  data: StudentResult;
}

export function ResultView({ data }: ResultViewProps) {
  const passed = (data.subjects || []).filter((s) => s.status === "P").length;
  const failed = (data.subjects || []).filter((s) => s.status === "F").length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-br from-primary/20 via-transparent to-transparent p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary-light">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">{data.studentName || "Student"}</h2>
                <p className="mt-1 font-mono text-sm text-primary-light">{data.hallTicket}</p>
                {data.branch && <p className="mt-1 text-sm text-muted">{data.branch}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="primary">Autonomous · MRECW</Badge>
                  <Badge variant="success">{passed} Passed</Badge>
                  {failed > 0 && <Badge variant="error">{failed} Backlogs</Badge>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "CGPA", value: data.cgpa || "—" },
                { label: "Percentage", value: data.percentage || "—" },
                {
                  label: "Credits",
                  value: data.creditsObtained && data.creditsTotal ? `${data.creditsObtained}/${data.creditsTotal}` : "—",
                },
                { label: "Due", value: data.subjectsDue != null ? `${data.subjectsDue}/${data.subjectsTotal}` : "—" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-center">
                  <div className="text-xs uppercase tracking-wider text-muted">{stat.label}</div>
                  <div className="mt-1 font-display text-xl font-bold">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-foreground/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-light" />
            <h3 className="font-display text-lg font-semibold">Subject Performance</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Grades</th>
                <th className="px-4 py-3">Credits</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.subjects || []).map((sub) => (
                <tr key={`${sub.sno}-${sub.code}`} className="border-b border-foreground/5 hover:bg-foreground/[0.02]">
                  <td className="px-4 py-3">{sub.sno}</td>
                  <td className="px-4 py-3 font-mono text-xs">{sub.code}</td>
                  <td className="px-4 py-3">{sub.name}</td>
                  <td className="px-4 py-3">
                    {(sub.grades || []).map((g) => (
                      <Badge key={g} variant={g === "F" ? "error" : "primary"} className="mr-1">
                        {g}
                      </Badge>
                    ))}
                  </td>
                  <td className="px-4 py-3">{sub.credits || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={sub.status === "P" ? "success" : sub.status === "F" ? "error" : "default"}>
                      {sub.status || "—"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}
