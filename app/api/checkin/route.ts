import { NextRequest } from "next/server";
import { geminiJson } from "@/lib/ai";
import { ruleTriage } from "@/lib/redflags";
import { PlanItem, Turn, maxSeverity, Severity, isLive } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const LANG_NAME: Record<string, string> = { en: "English", es: "Spanish" };
const EMERGENCY_REPLY: Record<string, string> = {
  en: "This could be serious. Please call 911 now, or press the red button on your screen. I am alerting your caregiver right away.",
  es: "Esto podría ser grave. Por favor llame al 911 ahora, o presione el botón rojo en su pantalla. Estoy avisando a su cuidadora ahora mismo.",
};

export async function POST(req: NextRequest) {
  try {
    const { audioBase64, mimeType, text, history = [], language = "en", plan = [], patientName = "the patient" } = await req.json();
    const meds = (plan as PlanItem[]).filter((p) => p.type === "med" && isLive(p.status)).map((m) => `${m.text} ${m.dose || ""} ${m.frequency || ""}`.trim());
    const signs = (plan as PlanItem[]).filter((p) => p.type === "warningSign").map((w) => w.text);
    const isStart = !audioBase64 && !text;

    const prompt = `You are Vela, a warm voice assistant doing a short daily check-in with ${patientName}, an older adult recently discharged from hospital.
Speak ${LANG_NAME[language] || "English"} only. Short, simple sentences. One question at a time. Be kind and patient.
Their confirmed medicines: ${meds.join("; ") || "none confirmed yet"}.
Their discharge warning signs: ${signs.join("; ") || "none listed"}.

STRICT SAFETY RULES:
- You are an assistant, not a doctor. Never diagnose, never change or suggest a dose, never say whether to take or skip a medicine.
- If asked a medical or medicine question, say you will pass it to their pharmacist or doctor, and put the question in "pharmacistQuestion".
- Ask whether they took each medicine today, and how they feel (breathing, swelling, chest, dizziness).
- TEACH-BACK: once during the call, after confirming one medicine, ask them to say back when they take it. If wrong, gently restate it. Report "passed" or "failed" in "teachBack".
- When meds, symptoms and teach-back are covered, thank them, say their caregiver and doctor will get a summary, and set "done": true.
${isStart ? "- This is the START: introduce yourself ('I'm Vela, an assistant, not a doctor'), say they can say 'stop' anytime, then ask your first question." : ""}

Conversation so far:
${(history as Turn[]).map((t) => `${t.role === "aide" ? "Vela" : "Patient"}: ${t.text}`).join("\n") || "(none)"}
${isStart ? "" : audioBase64 ? "The patient's newest reply is the attached audio. Transcribe it exactly." : `Patient's newest reply: ${text}`}

Return ONLY JSON:
{"patientSaid": string (exact words of the newest reply in their language, "" at start),
 "patientSaidEnglish": string (English translation, "" at start),
 "reply": string (what Vela says next),
 "triage": {"level": "routine"|"urgent"|"emergency", "reason": string},
 "pharmacistQuestion": string|null,
 "teachBack": "passed"|"failed"|null,
 "done": boolean}
Triage: emergency = chest pain, can't breathe, stroke signs, fainting; urgent = any discharge warning sign or new worrying symptom; else routine.`;

    const parts = audioBase64 ? [{ inlineData: { mimeType: (mimeType || "audio/webm").split(";")[0], data: audioBase64 } }] : [];
    const out = await geminiJson(prompt, parts);

    const saidStop = /\b(stop|para|alto|basta)\b/i.test(`${out.patientSaid} ${text || ""}`);
    const rules = ruleTriage([out.patientSaid, out.patientSaidEnglish, text || ""], signs);
    const aiLevel: Severity = ["routine", "urgent", "emergency"].includes(out?.triage?.level) ? out.triage.level : "routine";
    const level = maxSeverity(rules.level, aiLevel); // AI can raise, never lower
    const fired = [...rules.fired, ...(aiLevel !== "routine" ? [`AI triage (${aiLevel}): ${out.triage.reason}`] : [])];

    return Response.json({
      patientSaid: out.patientSaid || text || "",
      patientSaidEnglish: out.patientSaidEnglish || "",
      reply: level === "emergency" ? EMERGENCY_REPLY[language] || EMERGENCY_REPLY.en : out.reply,
      severity: level,
      fired,
      pharmacistQuestion: out.pharmacistQuestion || null,
      teachBack: out.teachBack || null,
      done: !!out.done || saidStop || level === "emergency",
    });
  } catch (e: any) {
    console.error(e);
    return Response.json({ error: e?.message || "check-in failed" }, { status: 500 });
  }
}
