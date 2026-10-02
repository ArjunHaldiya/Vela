import { Status } from "@/lib/types";
const MAP: Record<Status, [string, string]> = {
  draft: ["Draft", "bg-slate-100 text-slate-700 border-slate-300"],
  needsReview: ["Needs review", "bg-warn-50 text-warn-600 border-warn-500"],
  caregiverConfirmed: ["Caregiver-confirmed", "bg-calm-50 text-calm-700 border-calm-500"],
  clinicianVerified: ["Clinician-verified", "bg-blue-50 text-blue-800 border-blue-600"],
};
export default function StatusBadge({ status }: { status: Status }) {
  const [label, cls] = MAP[status] || MAP.draft;
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-sm font-semibold ${cls}`}>{label}</span>;
}
