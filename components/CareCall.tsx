"use client";
import { useEffect, useRef, useState } from "react";
import { addAlert, addCheckin } from "@/lib/store";
import { Lang, Patient, PlanItem, Severity, SEV_RANK, Turn, maxSeverity } from "@/lib/types";
import { t } from "@/lib/i18n";

const toB64 = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onloadend = () => res(String(r.result).split(",")[1]); r.readAsDataURL(b); });

async function speak(text: string, lang: Lang, onDone: () => void) {
  try {
    const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: lang }) });
    if (!r.ok) throw new Error("tts");
    const { audioContent } = await r.json();
    const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
    audio.onended = onDone;
    await audio.play();
  } catch {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "es" ? "es-US" : "en-US"; u.rate = 0.9;
      u.onend = onDone;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } else onDone();
  }
}

type DisplayTurn = Turn & { time: number };
type CallStatus = "idle" | "speaking" | "listening" | "thinking";

export default function CareCall({ patient, plan, lang, onEmergency }: {
  patient: Patient; plan: PlanItem[]; lang: Lang; onEmergency: () => void;
}) {
  const [turns, setTurns] = useState<DisplayTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [typed, setTyped] = useState("");
  const [severity, setSeverity] = useState<Severity>("routine");
  const [fired, setFired] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [teachBack, setTeachBack] = useState<"passed" | "failed" | null>(null);
  const [finished, setFinished] = useState(false);
  const [err, setErr] = useState("");
  const started = useRef(false);
  const alerted = useRef<Severity>("routine");
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const state = useRef({ turns, severity, fired, questions, teachBack });
  state.current = { turns, severity, fired, questions, teachBack };
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  async function turn(input: { audioBase64?: string; mimeType?: string; text?: string }) {
    setBusy(true); setErr(""); setStatus("thinking");
    try {
      const r = await fetch("/api/checkin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, history: state.current.turns, language: lang, plan, patientName: patient.name.split(" ")[0] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const now = Date.now();
      const next: DisplayTurn[] = [...state.current.turns];
      if (j.patientSaid) next.push({ role: "patient", text: j.patientSaid, english: j.patientSaidEnglish, time: now });
      next.push({ role: "aide", text: j.reply, time: now });
      const sev = maxSeverity(state.current.severity, j.severity);
      const allFired = Array.from(new Set([...state.current.fired, ...j.fired]));
      const qs = j.pharmacistQuestion ? [...state.current.questions, j.pharmacistQuestion] : state.current.questions;
      const tb = j.teachBack || state.current.teachBack;
      setTurns(next); setSeverity(sev); setFired(allFired); setQuestions(qs); setTeachBack(tb);
      state.current = { turns: next, severity: sev, fired: allFired, questions: qs, teachBack: tb };

      if (SEV_RANK[j.severity as Severity] > SEV_RANK[alerted.current]) {
        alerted.current = j.severity;
        addAlert({ level: j.severity, reason: `${patient.name}: ${j.fired.join("; ") || "reported a concerning symptom"}`, createdAt: Date.now(), acknowledgedBy: null });
      }
      if (j.severity === "emergency") onEmergency();
      setStatus("speaking");
      speak(j.reply, lang, () => setStatus("idle"));
      if (j.done) await finish();
    } catch (e: any) {
      setErr(e.message || "Something went wrong. Try typing your answer.");
      setStatus("idle");
    }
    setBusy(false);
  }

  async function finish() {
    if (finished) return;
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
      createdAt: Date.now(),
      transcript: s.turns.map(({ role, text, english }) => ({ role, text, english })),
      severity: s.severity, firedRules: s.fired,
      caregiverSummary: patient.consent.shareWithCaregiver ? caregiverSummary : "",
      doctorSummary: patient.consent.shareWithDoctor ? doctorSummary : "",
      pharmacistQuestions: s.questions, teachBack: s.teachBack, doctorAck: null, emailApprovedAt: null,
    });
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    turn({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleRecord() {
    if (recording) { rec.current?.stop(); setRecording(false); setStatus("thinking"); return; }
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
      mr.start(); rec.current = mr; setRecording(true); setStatus("listening");
    } catch {
      setErr("Microphone not available. Please type your answer below.");
    }
  }

  const statusLabel = status === "speaking" ? t("velaSpeaking", lang)
    : status === "listening" ? t("listening", lang)
    : status === "thinking" ? t("thinking", lang) : "";

  return (
    <section className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
          </svg>
          {t("careCall", lang)}
        </h2>
        {statusLabel && <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{statusLabel}</span>}
      </div>

      {severity !== "routine" && (
        <span className={`mt-2 w-fit rounded-full px-3 py-1 text-xs font-bold text-white ${severity === "emergency" ? "bg-crit-600" : "bg-warn-500"}`}>{severity.toUpperCase()}</span>
      )}

      <div className="mt-3 flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t("transcript", lang)}</p>
        <ol className="space-y-3" aria-live="polite">
          {turns.map((tu, i) => (
            <li key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-base ${tu.role === "aide" ? "bg-white shadow-sm" : "ml-auto bg-calm-600 text-white"}`}>
              <p>{tu.text}</p>
              <p className={`mt-1 text-xs ${tu.role === "aide" ? "text-slate-400" : "text-calm-100"}`}>
                {new Date(tu.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
            </li>
          ))}
          {busy && <li className="text-sm text-slate-500">{t("thinking", lang)}</li>}
        </ol>
        <div ref={bottomRef} />
      </div>

      {err && <p className="mt-2 rounded-xl bg-crit-50 p-2 text-sm text-crit-600">{err}</p>}

      {finished ? (
        <p className="mt-3 text-center text-sm font-semibold text-slate-600">
          {t("sentTo", lang)} {[patient.consent.shareWithCaregiver && patient.caregiverName, patient.consent.shareWithDoctor && patient.doctorName].filter(Boolean).join(" & ") || "—"}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-center gap-4">
            <button onClick={toggleRecord} disabled={busy && !recording} aria-label={recording ? t("tapStop", lang) : t("tapTalk", lang)}
              className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg disabled:opacity-50 ${recording ? "animate-pulse bg-crit-500" : "bg-calm-600"}`}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor" stroke="none" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </button>
            <button onClick={finish} disabled={busy || turns.length < 2} aria-label={t("endCheckin", lang)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-crit-600 text-white shadow disabled:opacity-40">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M21 15.5c-1.2 0-2.5-.2-3.6-.6a1 1 0 0 0-1 .2l-2.2 2.2a15.1 15.1 0 0 1-6.6-6.6l2.2-2.2a1 1 0 0 0 .3-1A11.4 11.4 0 0 1 9.5 3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-4.5a1 1 0 0 0-1-1z" />
              </svg>
            </button>
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { turn({ text: typed.trim() }); setTyped(""); } }}>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("orType", lang)}
              className="min-w-0 flex-1 rounded-2xl border-2 border-slate-300 px-3 py-2 text-base" />
            <button className="btn-small" disabled={busy}>{t("send", lang)}</button>
          </form>
        </div>
      )}
    </section>
  );
}
