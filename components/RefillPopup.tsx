"use client";
import { gmailCompose, telLink } from "@/lib/google-links";
import { Lang, Patient, PlanItem } from "@/lib/types";
import { t } from "@/lib/i18n";

export default function RefillPopup({ low, patient, lang, onClose }: {
  low: { item: PlanItem; days: number | null }[]; patient: Patient; lang: Lang; onClose: () => void;
}) {
  if (!low.length) return null;
  const ph = patient.pharmacy;
  const body = `Hello ${ph.name},\n\nThis is a refill request for ${patient.name}:\n${low.map((l) => `- ${l.item.text} ${l.item.dose || ""} (${l.days} days left)`).join("\n")}\n\nPlease call ${patient.caregiverName} or the patient when it is ready.\n\nSent with Aide`;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-extrabold text-warn-600">{t("runningLow", lang)}</h2>
        <ul className="mt-3 space-y-2">
          {low.map((l) => (
            <li key={l.item.id || l.item.text} className="text-xl">
              <b>{l.item.text}</b> {t("runsOutIn", lang)} <b>{l.days} {t("days", lang)}</b>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid gap-3">
          <a href={telLink(ph.phone)} className="rounded-2xl bg-calm-600 py-4 text-center text-xl font-bold text-white">{t("callPharmacy", lang)}</a>
          {ph.email && (
            <a href={gmailCompose(ph.email, `Refill request: ${patient.name}`, body)} target="_blank" rel="noreferrer"
              className="rounded-2xl border-2 border-calm-600 py-4 text-center text-xl font-bold text-calm-700">{t("emailRefill", lang)}</a>
          )}
          <button onClick={onClose} className="py-2 text-lg text-slate-600 underline">{t("later", lang)}</button>
        </div>
      </div>
    </div>
  );
}
