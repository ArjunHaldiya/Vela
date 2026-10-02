"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAide } from "@/lib/useAide";
import { addAlert, addCheckin } from "@/lib/store";
import { Lang, Severity, SEV_RANK, Turn, maxSeverity } from "@/lib/types";
import { t } from "@/lib/i18n";
import EmergencyScreen from "@/components/EmergencyScreen";
import PharmacyButton from "@/components/PharmacyButton";

const toB64 = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onloadend = () => res(String(r.result).split(",")[1]); r.readAsDataURL(b); });

async function speak(text: string, lang: Lang) {
  try {
    const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: lang }) });
    if (!r.ok) throw new Error("tts");
    const { audioContent } = await r.json();
    await new Audio(`data:audio/mp3;base64,${audioContent}`).play();
  } catch {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "es" ? "es-US" : "en-US"; u.rate = 0.9;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    }
  }
}

export default function CheckIn() {
  const { patient, plan, loaded } = useAide();
  const lang: Lang = patient?.language || "en";
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [typed, setTyped] = useState("");
  const [severity, setSeverity] = useState<Severity>("routine");
  const [fired, setFired] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [teachBack, setTeachBack] = useState<"passed" | "failed" | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [finished, setFinished] = useState(false);
  const [err, setErr] = useState("");
  const started = useRef(false);
  const alerted = useRef<Severity>("routine");
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const state = useRef({ turns, severity, fired, questions, teachBack });
  state.current = { turns, severity, fired, questions, teachBack };

  async function turn(input: { audioBase64?: string; mimeType?: string; text?: string }) {
    if (!patient) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/checkin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, history: state.current.turns, language: lang, plan, patientName: patient.name.split(" ")[0] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const next: Turn[] = [...state.current.turns];
      if (j.patientSaid) next.push({ role: "patient", text: j.patientSaid, english: j.patientSaidEnglish });
      next.push({ role: "aide", text: j.reply });
      const sev = maxSeverity(state.current.severity, j.severity);
      const allFired = Array.from(new Set([...state.current.fired, ...j.fired]));
      const qs = j.pharmacistQuestion ? [...state.current.questions, j.pharmacistQuestion] : state.current.questions;
      const tb = j.teachBack || state.current.teachBack;
      setTurns(next); setSeverity(sev); setFired(allFired); setQuestions(qs); setTeachBack(tb);
      state.current = { turns: next, severity: sev, fired: allFired, questions: qs, teachBack: tb };

      if (SEV_RANK[j.severity as Severity] > SEV_RANK[alerted.current]) {
        alerted.current = j.severity;
        // Safety alerts go out immediately, before the summary.
        addAlert({ level: j.severity, reason: `${patient.name}: ${j.fired.join("; ") || "reported a concerning symptom"}`, createdAt: Date.now(), acknowledgedBy: null });
      }
      if (j.severity === "emergency") setEmergency(true);
      speak(j.reply, lang);
      if (j.done) await finish();
    } catch (e: any) { setErr(e.message || "Something went wrong. Try typing your answer."); }
    setBusy(false);
  }

  async function finish() {
    if (!patient || finished) return;
    setFinished(true);
    const s = state.current;
    let caregiverSummary = "", doctorSummary = "";
    try {
      const r = await fetch("/api/summarize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: s.turns, severity: s.severity, fired: s.fired, patientName: patient.name, plan, pharmacistQuestions: s.questions, teachBack: s.teachBack }),
      });
      const j = await r.json();
      caregiverSummary = j.caregiverSummary || ""; doctorSummary = j.doctorSummary || "";
    } catch {}
    await addCheckin({
      createdAt: Date.now(), transcript: s.turns, severity: s.severity, firedRules: s.fired,
      caregiverSummary: patient.consent.shareWithCaregiver ? caregiverSummary : "",
      doctorSummary: patient.consent.shareWithDoctor ? doctorSummary : "",
      pharmacistQuestions: s.questions, teachBack: s.teachBack, doctorAck: null, emailApprovedAt: null,
    });
  }

  useEffect(() => {
    if (!loaded || !patient || started.current) return;
    started.current = true;
    turn({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, patient]);

  async function toggleRecord() {
    if (recording) { rec.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks.current, { type: mr.mimeType || type || "audio/webm" });
        turn({ audioBase64: await toB64(blob), mimeType: blob.type });
      };
      mr.start(); rec.current = mr; setRecording(true);
    } catch { setErr("Microphone not available. Please type your answer below."); }
  }

  if (!loaded) return <main className="p-6 text-xl">Loading…</main>;
  if (!patient) return <main className="p-6 text-xl"><Link href="/" className="underline">Load the demo patient first</Link></main>;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-5 pb-32">
      <div className="flex items-center justify-between">
        <Link href="/patient" className="text-lg underline">← {t("back", lang)}</Link>
        {severity !== "routine" && (
          <span className={`rounded-full px-3 py-1 text-base font-bold text-white ${severity === "emergency" ? "bg-crit-600" : "bg-warn-500"}`}>{severity.toUpperCase()}</span>
        )}
      </div>

      <ol className="mt-4 flex-1 space-y-3" aria-live="polite">
        {turns.map((tu, i) => (
          <li key={i} className={`max-w-[88%] rounded-3xl px-4 py-3 text-xl ${tu.role === "aide" ? "bg-white shadow-sm" : "ml-auto bg-calm-600 text-white"}`}>
            {tu.text}
          </li>
        ))}
        {busy && <li className="text-lg text-slate-500">{t("thinking", lang)}</li>}
      </ol>

      {err && <p className="mt-3 rounded-2xl bg-crit-50 p-3 text-lg text-crit-600">{err}</p>}

      {finished ? (
        <div className="card mt-4 text-center">
          <p className="text-xl font-semibold">
            {t("sentTo", lang)} {[patient.consent.shareWithCaregiver && patient.caregiverName, patient.consent.shareWithDoctor && patient.doctorName].filter(Boolean).join(" & ") || "—"}
          </p>
          <Link href="/patient" className="btn-primary mt-4">{t("back", lang)}</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <button onClick={toggleRecord} disabled={busy && !recording}
            className={`flex w-full items-center justify-center gap-3 rounded-full py-7 text-2xl font-extrabold text-white shadow-lg ${recording ? "animate-pulse bg-crit-500" : "bg-calm-600"} disabled:opacity-50`}>
            <span aria-hidden>{recording ? "■" : "●"}</span> {recording ? t("tapStop", lang) : t("tapTalk", lang)}
          </button>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { turn({ text: typed.trim() }); setTyped(""); } }}>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("orType", lang)}
              className="min-w-0 flex-1 rounded-2xl border-2 border-slate-300 px-3 py-3 text-lg" />
            <button className="btn-small" disabled={busy}>{t("send", lang)}</button>
          </form>
          <button onClick={finish} className="w-full py-2 text-lg underline" disabled={busy || turns.length < 2}>{t("endCheckin", lang)}</button>
        </div>
      )}

      {emergency && <EmergencyScreen lang={lang} onClose={() => setEmergency(false)} />}
      <PharmacyButton pharmacy={patient.pharmacy} lang={lang} />
    </main>
  );
}
