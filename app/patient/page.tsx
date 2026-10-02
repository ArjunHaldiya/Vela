"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAide } from "@/lib/useAide";
import { addAlert, savePatient } from "@/lib/store";
import { lowMeds, daysLeft } from "@/lib/refill";
import { calendarLink } from "@/lib/google-links";
import { isLive, Lang } from "@/lib/types";
import { t } from "@/lib/i18n";
import PharmacyButton from "@/components/PharmacyButton";
import RefillPopup from "@/components/RefillPopup";

export default function PatientHome() {
  const { patient, plan, checkins, alerts, loaded } = useAide();
  const lang: Lang = patient?.language || "en";
  const [showRefill, setShowRefill] = useState(false);
  const refillLogged = useRef(false);

  const meds = plan.filter((p) => p.type === "med");
  const live = meds.filter((m) => isLive(m.status));
  const pending = meds.filter((m) => !isLive(m.status));
  const appts = plan.filter((p) => p.type === "appointment" && isLive(p.status));
  const low = useMemo(() => lowMeds(plan.filter((p) => isLive(p.status))), [plan]);
  const lastAck = checkins.find((c) => c.doctorAck);

  useEffect(() => {
    if (!patient || !low.length || refillLogged.current) return;
    refillLogged.current = true;
    setShowRefill(true);
    const today = new Date().toDateString();
    for (const l of low) {
      const reason = `Refill: ${l.item.text} runs out in ${l.days} days`;
      const dup = alerts.some((a) => a.level === "refill" && a.reason.startsWith(`Refill: ${l.item.text}`) && new Date(a.createdAt).toDateString() === today);
      if (!dup) addAlert({ level: "refill", reason, createdAt: Date.now(), acknowledgedBy: null });
    }
  }, [patient, low, alerts]);

  if (!loaded) return <main className="p-6 text-xl">Loading…</main>;
  if (!patient) return <main className="p-6 text-xl">No patient yet. <Link className="underline" href="/">Load the demo patient</Link>.</main>;

  return (
    <main className="mx-auto max-w-md p-5 pb-32">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">{t("hi", lang)}, {patient.name.split(" ")[0]}</h1>
        <div className="flex overflow-hidden rounded-xl border-2 border-calm-600" role="group" aria-label="Language">
          {(["en", "es"] as Lang[]).map((l) => (
            <button key={l} onClick={() => savePatient({ language: l })} aria-pressed={lang === l}
              className={`px-3 py-1 text-lg font-bold ${lang === l ? "bg-calm-600 text-white" : "text-calm-700"}`}>{l.toUpperCase()}</button>
          ))}
        </div>
      </header>

      {lastAck && (
        <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-lg text-blue-900">✓ {patient.doctorName} {t("doctorSeen", lang)}</p>
      )}

      <div className="mt-6 grid gap-4">
        <Link href="/patient/checkin" className="btn-primary">{t("startCheckin", lang)}</Link>
        <Link href="/patient/scan" className="btn-secondary">{t("addRx", lang)}</Link>
      </div>

      <section className="card mt-6">
        <h2 className="text-2xl font-bold">{t("todayMeds", lang)}</h2>
        <ul className="mt-3 divide-y">
          {live.map((m) => {
            const d = daysLeft(m);
            return (
              <li key={m.id} className="py-3">
                <p className="text-xl font-bold">{m.text} {m.dose}</p>
                <p className="text-lg text-slate-700">{m.frequency}</p>
                {d !== null && <p className={`text-base ${d <= 3 ? "font-bold text-warn-600" : "text-slate-500"}`}>{d} {t("daysLeft", lang)}</p>}
              </li>
            );
          })}
        </ul>
        {pending.length > 0 && (
          <div className="mt-3 rounded-2xl bg-slate-50 p-3">
            <p className="text-base font-semibold text-slate-600">{t("waiting", lang)}:</p>
            <p className="text-lg text-slate-500">{pending.map((p) => p.text).join(", ")}</p>
          </div>
        )}
      </section>

      {appts.length > 0 && (
        <section className="card mt-6">
          <h2 className="text-2xl font-bold">{t("appointments", lang)}</h2>
          {appts.map((a) => (
            <div key={a.id} className="mt-3">
              <p className="text-xl font-semibold">{a.text}</p>
              {a.when && <p className="text-lg text-slate-700">{new Date(a.when).toLocaleString(lang === "es" ? "es-US" : "en-US", { dateStyle: "full", timeStyle: "short" })}</p>}
              <a className="btn-small mt-2" target="_blank" rel="noreferrer" href={calendarLink(a.text, a.when, `Aide care plan for ${patient.name}`)}>{t("addCal", lang)}</a>
            </div>
          ))}
        </section>
      )}

      <section className="card mt-6">
        <h2 className="text-xl font-bold">{t("sharing", lang)}</h2>
        {([["shareWithCaregiver", "shareCaregiver"], ["shareWithDoctor", "shareDoctor"]] as const).map(([k, label]) => (
          <label key={k} className="mt-3 flex items-center justify-between text-lg">
            <span>{t(label, lang)}</span>
            <input type="checkbox" className="h-7 w-7 accent-calm-600" checked={!!patient.consent?.[k]}
              onChange={(e) => savePatient({ consent: { ...patient.consent, [k]: e.target.checked } })} />
          </label>
        ))}
      </section>

      {showRefill && <RefillPopup low={low} patient={patient} lang={lang} onClose={() => setShowRefill(false)} />}
      <PharmacyButton pharmacy={patient.pharmacy} lang={lang} />
    </main>
  );
}
