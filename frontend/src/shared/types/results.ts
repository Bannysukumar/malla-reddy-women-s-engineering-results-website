export interface Subject {
  sno: string;
  code: string;
  name: string;
  grades: string[];
  credits: string;
  status: string;
}

export interface ResultMeta {
  source: "firebase" | "scraped" | "scraped_and_cached" | "scraped_and_updated" | "mixed";
  cached: boolean;
  cachedAt?: string;
  updated?: boolean;
  responseMs?: number;
  cachedAtA?: string;
  cachedAtB?: string;
  inProgress?: boolean;
}

export interface StudentResult {
  hallTicket: string;
  studentName?: string;
  branch?: string;
  cgpa?: string;
  percentage?: string;
  creditsObtained?: string;
  creditsTotal?: string;
  subjectsDue?: string;
  subjectsTotal?: string;
  subjects?: Subject[];
  error?: string;
  _meta?: ResultMeta;
}

export interface BacklogReport {
  hallTicket: string;
  studentName?: string;
  branch?: string;
  cgpa?: string;
  creditsObtained?: string;
  creditsTotal?: string;
  subjectsDue?: string;
  subjectsTotal?: string;
  backlogCount: number;
  backlogs: Subject[];
  error?: string;
  _meta?: ResultMeta;
}

export interface CreditsProfile {
  hallTicket: string;
  studentName?: string;
  branch?: string;
  cgpa?: string;
  creditsObtained?: string;
  creditsTotal?: string;
  creditsRemaining?: number | null;
  completionPercent?: number | null;
  subjectsDue?: string;
  subjectsTotal?: string;
  subjects?: Subject[];
}

export interface CreditsCompareMetric {
  label: string;
  first: string | number | null;
  second: string | number | null;
}

export interface CreditsCompare {
  first: CreditsProfile;
  second: CreditsProfile;
  comparison: {
    creditsDifference: number | null;
    completionPercentDifference: number | null;
    metrics: CreditsCompareMetric[];
  };
  error?: string;
  _meta?: ResultMeta;
}

export interface ContrastStudent extends StudentResult {
  backlogCount?: number;
}

export interface ContrastMetric {
  label: string;
  first: string | number | null;
  second: string | number | null;
}

export interface ResultContrast {
  first: ContrastStudent;
  second: ContrastStudent;
  comparison: {
    cgpaDifference: number | null;
    creditsDifference: number | null;
    backlogCountFirst: number;
    backlogCountSecond: number;
    metrics: ContrastMetric[];
  };
  error?: string;
  _meta?: ResultMeta;
}

export interface ClassStudent {
  hallTicket: string;
  studentName?: string;
  branch?: string;
  cgpa?: string;
  creditsObtained?: string;
  creditsTotal?: string;
  subjectsDue?: string;
}

export interface ClassScrapeProgress {
  current: number;
  total: number;
  remaining?: number;
  cachedCount?: number;
  hallTicket?: string | null;
}

export interface ClassResult {
  prefix: string;
  startRoll: number;
  endRoll: number;
  rollDigits: number;
  totalAttempted: number;
  successCount: number;
  failedCount: number;
  classAverageCgpa?: number | null;
  students: ClassStudent[];
  failed: { hallTicket: string; error: string }[];
  scrapeStatus?: "in_progress" | "complete";
  scrapeProgress?: ClassScrapeProgress;
  _meta?: ResultMeta;
}

export interface ExamHallTicketEntry {
  examType?: string | null;
  semester?: string | null;
  monthYear?: string | null;
  hallTicketNumber?: string | null;
  examDate?: string | null;
  examCenter?: string | null;
  subjects: string[];
  rawText?: string;
}

export interface ExamHallTickets {
  hallTicket: string;
  studentName?: string | null;
  branch?: string | null;
  program?: string | null;
  sourceUrl?: string;
  sessionsFound?: number;
  tickets: ExamHallTicketEntry[];
  message?: string | null;
  error?: string;
  _meta?: ResultMeta;
}

export interface AttendanceMonth {
  month: string;
  conducted: number | null;
  attended: number | null;
  percentage: number | null;
}

export interface AttendanceSemesterSummary {
  conducted: number | null;
  attended: number | null;
  percentage: number | null;
}

export interface AttendanceSemester {
  semester: string;
  months: AttendanceMonth[];
  summary: AttendanceSemesterSummary | null;
}

export interface StudentAttendance {
  hallTicket: string;
  studentName?: string | null;
  branch?: string | null;
  program?: string | null;
  currentSemester?: string | null;
  activeSemester?: string | null;
  overallPercentage?: number | null;
  currentSemesterAvailable?: boolean;
  pendingSemester?: string | null;
  sourceUrl?: string;
  semesters: AttendanceSemester[];
  message?: string | null;
  error?: string;
  _meta?: ResultMeta;
}

export interface OverallResultSemester {
  sno?: string | null;
  semester: string;
  sgpa: number | null;
  cgpa: number | null;
  semesterEndAttendance: number | null;
}

export interface StudentOverallResult {
  hallTicket: string;
  studentName?: string | null;
  branch?: string | null;
  program?: string | null;
  currentSemester?: string | null;
  latestSemester?: string | null;
  latestCgpa?: number | null;
  currentSemesterAvailable?: boolean;
  pendingSemester?: string | null;
  sourceUrl?: string;
  semesters: OverallResultSemester[];
  message?: string | null;
  error?: string;
  _meta?: ResultMeta;
}

export interface SemwiseMarksSemester {
  semester: string;
  examMonth?: string | null;
  sgpa?: number | null;
  cgpa?: number | null;
  totalCredits?: string | null;
  subjectsPassed?: number | null;
  subjects: Subject[];
}

export interface StudentSemwiseMarks {
  hallTicket: string;
  studentName?: string | null;
  branch?: string | null;
  program?: string | null;
  currentSemester?: string | null;
  pendingSemester?: string | null;
  cgpa?: string | null;
  percentage?: string | null;
  creditsObtained?: string | null;
  creditsTotal?: string | null;
  subjectsDue?: string | null;
  subjectsTotal?: string | null;
  sourceUrl?: string;
  semesters: SemwiseMarksSemester[];
  message?: string | null;
  error?: string;
  _meta?: ResultMeta;
}

