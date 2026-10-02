export type Status = "draft" | "needsReview" | "caregiverConfirmed" | "clinicianVerified";
export type Severity = "routine" | "urgent" | "emergency";
export type Lang = "en" | "es";

export interface PlanItem {
  id?: string;
  type: "med" | "appointment" | "warningSign";
  text: string;            // med name / appointment title / warning sign
  dose?: string;           // "25 mg"
  frequency?: string;      // "twice daily"
  dosesPerDay?: number;
  quantity?: number;       // pills dispensed
  fillDate?: string;       // ISO date
  when?: string;           // appointment date/time (ISO if possible)
  sourceLine: string;      // exact line from the document
  status: Status;
  reviewReason?: string;
  confirmedBy?: string;
}

export interface Pharmacy { name: string; phone: string; address?: string; email?: string }

export interface Patient {
  name: string;
  language: Lang;
  caregiverName: string;
  caregiverEmail: string;
  doctorName: string;
  doctorEmail: string;
  pharmacy: Pharmacy;
  consent: { shareWithCaregiver: boolean; shareWithDoctor: boolean };
}

export interface Turn { role: "aide" | "patient"; text: string; english?: string }

export interface CheckIn {
  id?: string;
  createdAt: number;
  transcript: Turn[];
  severity: Severity;
  firedRules: string[];
  caregiverSummary: string;
  doctorSummary: string;
  pharmacistQuestions: string[];
  teachBack?: "passed" | "failed" | null;
  doctorAck?: { by: string; at: number } | null;
  emailApprovedAt?: number | null;
}

export interface Alert {
  id?: string;
  level: Severity | "refill";
  reason: string;
  createdAt: number;
  acknowledgedBy?: string | null;
}

export const SEV_RANK: Record<Severity, number> = { routine: 0, urgent: 1, emergency: 2 };
export const maxSeverity = (a: Severity, b: Severity): Severity => (SEV_RANK[a] >= SEV_RANK[b] ? a : b);
export const isLive = (s: Status) => s === "caregiverConfirmed" || s === "clinicianVerified";
