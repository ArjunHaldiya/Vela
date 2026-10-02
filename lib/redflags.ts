import { Severity, maxSeverity } from "./types";

// Rules run BEFORE and independently of the AI. Either can raise the alarm; the AI can never lower it.
const EMERGENCY: string[] = [
  "chest pain", "chest pressure", "can't breathe", "cannot breathe", "can not breathe", "trouble breathing",
  "face drooping", "slurred speech", "can't move my arm", "fainted", "passed out", "unconscious",
  "severe bleeding", "coughing blood", "vomiting blood", "suicid",
  "dolor de pecho", "dolor en el pecho", "no puedo respirar", "me desmayé", "me desmaye", "sangrado fuerte",
];
const URGENT: string[] = [
  "short of breath", "shortness of breath", "out of breath", "swelling", "swollen", "fever", "dizzy",
  "dizziness", "lightheaded", "bleeding", "vomiting", "throwing up", "confused", "fell", "fall down", "rash",
  "falta de aire", "me falta el aire", "mareo", "mareada", "mareado", "fiebre", "hinchazón", "hinchada",
  "hinchado", "vómito", "me caí", "confundida",
];
const STOP = new Set(["when", "with", "that", "your", "more", "than", "have", "from", "call", "doctor", "about", "after", "while", "lying", "down", "days", "pounds", "there", "these", "this"]);

const words = (s: string) => s.toLowerCase().replace(/[^a-záéíóúñü0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w));
const stem = (w: string) => w.slice(0, 5);

export function ruleTriage(texts: string[], warningSigns: string[]): { level: Severity; fired: string[] } {
  const said = texts.filter(Boolean).join(" ").toLowerCase();
  const fired: string[] = [];
  let level: Severity = "routine";
  for (const p of EMERGENCY) if (said.includes(p)) { fired.push(`emergency phrase: "${p}"`); level = "emergency"; }
  for (const p of URGENT) if (said.includes(p)) { fired.push(`urgent phrase: "${p}"`); level = maxSeverity(level, "urgent"); }
  const saidStems = new Set(words(said).map(stem));
  for (const sign of warningSigns) {
    const ws = Array.from(new Set(words(sign).map(stem)));
    const hits = ws.filter((w) => saidStems.has(w)).length;
    if (ws.length && (hits >= 2 || (ws.length === 1 && hits === 1))) {
      fired.push(`discharge warning sign: "${sign}"`);
      level = maxSeverity(level, "urgent");
    }
  }
  return { level, fired };
}
