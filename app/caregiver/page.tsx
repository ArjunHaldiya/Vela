"use client";
import Link from "next/link";
import { useAide } from "@/lib/useAide";
import { ackAlert, setItemStatus, updateCheckin } from "@/lib/store";
import { calendarLink, gmailCompose, mapsLink, telLink } from "@/lib/google-links";
import { daysLeft } from "@/lib/refill";
import { isLive } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const LEVEL_CLS: Record<string, string> = {
  emergency: "border-crit-500 bg-crit-50", urgent: "border-warn-500 bg-warn-50", refill: "border-blue-500 bg-blue-50", routine: "border-slate-300 bg-white",
};

export default function Caregiver() {
  const { patient, plan, checkins, alerts, loaded } = useAide();
  if (!loaded) return <main className="p-6">Loading…</main>;
  if (!patient) return <main className="p-6"><Link href="/" className="underline">Load the demo patient first</Link></main>;

  const open = alerts.filter((a) => !a.acknowledgedBy);
  const toReview = plan.filter((p) => !isLive(p.status));
  const liveMeds = plan.filter((p) => p.type === "med" && isLive(p.status));
  const appts = plan.filter((p) => p.type === "appointment" && isLive(p.status));
  const questions = checkins.flatMap((c) => c.pharmacistQuestions || []);
  const ph = patient.pharmacy;
  const me = patient.caregiverName;

  return (
    <main className="mx-auto max-w-2xl p-5 pb-16">
      <Link href="/" className="underline">← Home</Link>
      <h1 className="mt-2 text-3xl font-extrabold">Caring for {patient.name}</h1>
      <p className="text-lg text-slate-600">You are {me}</p>

      {open.length > 0 && (
        <section className="mt-5 space-y-3" aria-live="assertive">
          {open.map((a) => (
            <div key={a.id} className={`rounded-2xl border-2 p-4 ${LEVEL_CLS[a.level]}`}>
              <p className="text-sm font-bold uppercase tracking-wide">{a.level} · {new Date(a.createdAt).toLocaleTimeString()}</p>
              <p className="mt-1 text-lg">{a.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.level === "emergency" && <a className="btn-small" href="tel:911">Call 911</a>}
                {a.level === "refill" ? <a className="btn-small" href={telLink(ph.phone)}>Call pharmacy</a> : <a className="btn-small" href="#checkins">See check-in</a>}
                <button className="btn-small" onClick={() => ackAlert(a.id!, me)}>Acknowledge</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {toReview.length > 0 && (
        <section className="card mt-6">
          <h2 className="text-2xl font-bold">Confirm the plan</h2>
          <p className="text-base text-slate-600">Check each item against the paper. Nothing reaches the patient until you confirm it.</p>
          <ul className="mt-3 space-y-3">
            {toReview.map((it) => (
              <li key={it.id} className="rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-lg font-bold">{it.type === "warningSign" ? "Warning sign: " : it.type === "appointment" ? "Appointment: " : ""}{it.text} {it.dose}</p>
                  <StatusBadge status={it.status} />
                </div>
                {it.frequency && <p>{it.frequency}{it.quantity ? ` · qty ${it.quantity}` : ""}</p>}
                <p className="mt-1 rounded-lg bg-slate-50 p-2 font-mono text-sm">“{it.sourceLine}”</p>
                {it.reviewReason && <p className="mt-1 font-semibold text-warn-600">⚠ {it.reviewReason}. Check the paper or call the pharmacy before confirming.</p>}
                <button className="btn-small mt-2" onClick={() => setItemStatus(it.id!, "caregiverConfirmed", me)}>I checked this — confirm</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="checkins" className="mt-6">
        <h2 className="text-2xl font-bold">Check-ins</h2>
        {!patient.consent.shareWithCaregiver && <p className="mt-2 text-lg">{patient.name.split(" ")[0]} has chosen not to share check-in summaries with you. Safety alerts still reach you.</p>}
        {checkins.length === 0 && <p className="mt-2 text-slate-600">No check-ins yet.</p>}
        <ul className="mt-3 space-y-3">
          {checkins.map((c) => {
            const flagged = c.severity !== "routine";
            return (
              <li key={c.id} className={`rounded-2xl border-2 p-4 ${LEVEL_CLS[c.severity]}`}>
                <p className="text-sm font-bold uppercase">{c.severity} · {new Date(c.createdAt).toLocaleString()}</p>
                <p className="mt-2 whitespace-pre-wrap text-lg">{c.caregiverSummary || "(summary not shared)"}</p>
                {c.teachBack && <p className="mt-1 text-base">Teach-back: <b>{c.teachBack}</b></p>}
                {c.doctorAck && <p className="mt-2 font-semibold text-blue-800">✓ {c.doctorAck.by} acknowledged</p>}
                {flagged && patient.consent.shareWithDoctor && (
                  c.emailApprovedAt
                    ? <p className="mt-2 font-semibold text-calm-700">You approved sending this to {patient.doctorName} at {new Date(c.emailApprovedAt).toLocaleTimeString()}</p>
                    : <a className="btn-primary mt-3 !text-xl" target="_blank" rel="noreferrer"
                        onClick={() => updateCheckin(c.id!, { emailApprovedAt: Date.now() })}
                        href={gmailCompose(patient.doctorEmail, `[${c.severity.toUpperCase()}] Aide check-in: ${patient.name}`, `${c.doctorSummary}\n\nApproved and sent by ${me} (caregiver) via Aide.`)}>
                        Approve & email {patient.doctorName} (Gmail)
                      </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card mt-6">
        <h2 className="text-2xl font-bold">Pharmacy</h2>
        <p className="text-lg">{ph.name} · {ph.phone}</p>
        <ul className="mt-2 text-base">
          {liveMeds.map((m) => { const d = daysLeft(m); return <li key={m.id}>{m.text} {m.dose}{d !== null ? ` — ${d} days left` : ""}</li>; })}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="btn-small" href={telLink(ph.phone)}>Call</a>
          <a className="btn-small" target="_blank" rel="noreferrer" href={mapsLink(`${ph.name} ${ph.address || ""}`)}>Directions (Google Maps)</a>
          {ph.email && <a className="btn-small" target="_blank" rel="noreferrer" href={gmailCompose(ph.email, `Medication list update: ${patient.name}`, `Hello ${ph.name},\n\nCurrent confirmed medication list for ${patient.name}:\n${liveMeds.map((m) => `- ${m.text} ${m.dose} ${m.frequency}`).join("\n")}\n\n${questions.length ? `Questions from the patient:\n${questions.map((q) => `- ${q}`).join("\n")}\n\n` : ""}Sent by ${me} via Aide`)}>Send med list (Gmail)</a>}
        </div>
        {questions.length > 0 && (
          <div className="mt-4"><h3 className="font-bold">Ask-your-pharmacist list</h3><ul className="list-disc pl-6">{questions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
        )}
      </section>

      {appts.length > 0 && (
        <section className="card mt-6">
          <h2 className="text-2xl font-bold">Appointments</h2>
          {appts.map((a) => (
            <div key={a.id} className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg">{a.text}{a.when ? ` — ${new Date(a.when).toLocaleString()}` : ""}</p>
              <a className="btn-small" target="_blank" rel="noreferrer" href={calendarLink(a.text, a.when, `For ${patient.name}`)}>Add to Google Calendar</a>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
