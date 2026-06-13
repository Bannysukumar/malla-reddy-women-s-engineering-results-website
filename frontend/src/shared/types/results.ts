export interface Subject {
  sno: string;
  code: string;
  name: string;
  grades: string[];
  credits: string;
  status: string;
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
}

export interface ContrastSummary {
  hallTicket: string;
  studentName?: string;
  branch?: string;
  cgpa?: string;
  creditsObtained?: string;
  creditsTotal?: string;
  subjectsDue?: string;
  subjectsTotal?: string;
  backlogCount?: number;
}

export interface ContrastMetric {
  label: string;
  first: string | number | null;
  second: string | number | null;
}

export interface ResultContrast {
  first: ContrastSummary;
  second: ContrastSummary;
  comparison: {
    cgpaDifference: number | null;
    creditsDifference: number | null;
    backlogCountFirst: number;
    backlogCountSecond: number;
    metrics: ContrastMetric[];
  };
  error?: string;
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
}

export interface ApiError {
  error: string;
}
