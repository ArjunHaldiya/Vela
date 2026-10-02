"use client";
import Link from "next/link";
import { useAide } from "@/lib/useAide";
import { setItemStatus, updateCheckin } from "@/lib/store";
import StatusBadge from "@/components/StatusBadge";

const SEV = { emergency: "bg-crit-600", urgent: "bg-warn-500", routine: "bg-slate-500" } as const;

export default function Doctor() {
  const { patient, plan, checkins, loaded } = useAide();
  if (!loaded) return <main className="p-6">Loading…</main>;
  if (!patient) return <main className="p-6"><Link href="/" className="underline">Load the demo patient first</Link></main>;
  const me = patient.doctorName;
  const confirmed = plan.filter((p) => p.status === "caregiverConfirmed");

  return (
    <main className="mx-auto max-w-4xl p-6 text-base">
      <Link href="/" className="underline">← Home</Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-extrabold">{patient.name} — post-discharge</h1>
        <p className="text-slate-600">Signed in as {me}</p>
      </div>
      <p className="mt-1 rounded-lg bg-slate-100 p-2 text-sm text-slate-700">Summaries are AI-generated and not clinically verified. Synthetic demo patient.</p>

      {!patient.consent.shareWithDoctor ? (
        <p className="card mt-6 text-lg">The patient has not shared check-ins with you.</p>
      ) : (
        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-bold">Check-ins</h2>
          {checkins.length === 0 && <p className="text-slate-600">No check-ins yet.</p>}
          {checkins.map((c) => (
            <article key={c.id} className="card">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-sm font-bold uppercase text-white ${SEV[c.severity]}`}>{c.severity}</span>
                  <span className="text-slate-600">{new Date(c.createdAt).toLocaleString()}</span>
                  {c.emailApprovedAt && <span className="text-sm text-calm-700">· emailed by caregiver</span>}
                </div>
                {c.doctorAck
                  ? <span className="font-semibold text-blue-800">✓ Acknowledged by {c.doctorAck.by}</span>
                  : <button className="btn-small !border-blue-700 !text-blue-800" onClick={() => updateCheckin(c.id!, { doctorAck: { by: me, at: Date.now() } })}>Acknowledge</button>}
              </header>
              <pre className="mt-3 whitespace-pre-wrap font-sans">{c.doctorSummary || "(summary not shared)"}</pre>
              {c.firedRules?.length > 0 && (
                <div className="mt-3"><h3 className="font-bold">Safety rules fired</h3><ul className="list-disc pl-6 text-sm">{c.firedRules.map((f, i) => <li key={i}>{f}</li>)}</ul></div>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer font-semibold">Transcript (original + English)</summary>
                <ul className="mt-2 space-y-1 text-sm">
                  {c.transcript.map((t, i) => (
                    <li key={i}><b>{t.role === "aide" ? "Aide" : "Patient"}:</b> {t.text}{t.english && t.english !== t.text && <span className="text-slate-500"> — [{t.english}]</span>}</li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </section>
      )}

      <section className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Care plan</h2>
          {confirmed.length > 0 && (
            <button className="btn-small" onClick={() => confirmed.forEach((p) => setItemStatus(p.id!, "clinicianVerified", me))}>Mark confirmed items clinician-verified</button>
          )}
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <thead><tr className="border-b"><th className="py-1">Item</th><th>Details</th><th>Source line</th><th>Status</th></tr></thead>
          <tbody>
            {plan.map((p) => (
              <tr key={p.id} className="border-b align-top">
                <td className="py-2 font-semibold">{p.text}</td>
                <td>{[p.dose, p.frequency, p.when && new Date(p.when).toLocaleDateString()].filter(Boolean).join(" · ")}</td>
                <td className="font-mono text-xs">{p.sourceLine}</td>
                <td><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
