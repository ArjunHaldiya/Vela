"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAide } from "@/lib/useAide";
import { addAlert, savePatient } from "@/lib/store";
import { lowMeds } from "@/lib/refill";
import { isLive, Lang } from "@/lib/types";
import { t } from "@/lib/i18n";
import PharmacyButton from "@/components/PharmacyButton";
import RefillPopup from "@/components/RefillPopup";
import EmergencyScreen from "@/components/EmergencyScreen";
import DischargeInstructions from "@/components/DischargeInstructions";
import CareTimeline from "@/components/CareTimeline";
import CareCall from "@/components/CareCall";

const REFILL_POPUP_DELAY_MS = 10_000;

export default function PatientHome() {
  const { patient, plan, checkins, alerts, loaded } = useAide();
  const lang: Lang = patient?.language || "en";
  const [showRefill, setShowRefill] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const refillLogged = useRef(false);

  const low = useMemo(() => lowMeds(plan.filter((p) => isLive(p.status))), [plan]);
  const lastAck = checkins.find((c) => c.doctorAck);

  useEffect(() => {
    if (!patient || !low.length || refillLogged.current) return;
    refillLogged.current = true;
    const today = new Date().toDateString();
    for (const l of low) {
      const reason = `Refill: ${l.item.text} runs out in ${l.days} days`;
      const dup = alerts.some((a) => a.level === "refill" && a.reason.startsWith(`Refill: ${l.item.text}`) && new Date(a.createdAt).toDateString() === today);
      if (!dup) addAlert({ level: "refill", reason, createdAt: Date.now(), acknowledgedBy: null });
    }
    // Let the patient settle into the page before interrupting with the refill popup.
    const timer = setTimeout(() => setShowRefill(true), REFILL_POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [patient, low, alerts]);

  if (!loaded) return <main className="p-6 text-xl">Loading…</main>;
  if (!patient) return <main className="p-6 text-xl">No patient yet. <Link className="underline" href="/">Load the demo patient</Link>.</main>;

  return (
    <main className="mx-auto max-w-7xl p-5 pb-28">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{t("hi", lang)}, {patient.name.split(" ")[0]}</h1>
          <Link href="/patient/scan" className="text-base underline">{t("addRx", lang)}</Link>
        </div>
        <div className="flex overflow-hidden rounded-xl border-2 border-calm-600" role="group" aria-label="Language">
          {(["en", "es"] as Lang[]).map((l) => (
            <button key={l} onClick={() => savePatient({ language: l })} aria-pressed={lang === l}
              className={`px-3 py-1 text-lg font-bold ${lang === l ? "bg-calm-600 text-white" : "text-calm-700"}`}>{l.toUpperCase()}</button>
          ))}
        </div>
      </header>

      {lastAck && (
        <p className="mt-3 rounded-2xl bg-blue-50 p-3 text-base text-blue-900">✓ {patient.doctorName} {t("doctorSeen", lang)}</p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="md:h-[72vh]"><DischargeInstructions patient={patient} plan={plan} lang={lang} /></div>
        <div className="md:h-[72vh]"><CareTimeline plan={plan} lang={lang} /></div>
        <div className="md:h-[72vh]"><CareCall patient={patient} plan={plan} lang={lang} onEmergency={() => setEmergency(true)} /></div>
      </div>

      <section className="card mt-6 max-w-md">
        <h2 className="text-lg font-bold">{t("sharing", lang)}</h2>
        {([["shareWithCaregiver", "shareCaregiver"], ["shareWithDoctor", "shareDoctor"]] as const).map(([k, label]) => (
          <label key={k} className="mt-3 flex items-center justify-between text-base">
            <span>{t(label, lang)}</span>
            <input type="checkbox" className="h-6 w-6 accent-calm-600" checked={!!patient.consent?.[k]}
              onChange={(e) => savePatient({ consent: { ...patient.consent, [k]: e.target.checked } })} />
          </label>
        ))}
      </section>

      {showRefill && <RefillPopup low={low} patient={patient} lang={lang} onClose={() => setShowRefill(false)} />}
      {emergency && <EmergencyScreen lang={lang} onClose={() => setEmergency(false)} />}
      <PharmacyButton pharmacy={patient.pharmacy} lang={lang} />
    </main>
  );
}
