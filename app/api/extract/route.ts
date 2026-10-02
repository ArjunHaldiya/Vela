import { NextRequest } from "next/server";
import { GEMMA_MODEL, GEMINI_MODEL, gemmaClient, geminiClient, parseJson, transcribeImage, withRetry } from "@/lib/ai";import { PlanItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PROMPT = `You read hospital discharge papers and prescription labels for an older adult's care plan.
Return ONLY JSON in exactly this shape:
{"pharmacy":{"name":string|null,"phone":string|null,"address":string|null},
 "meds":[{"name":string,"dose":string|null,"frequency":string|null,"dosesPerDay":number|null,"quantity":number|null,"fillDate":"YYYY-MM-DD"|null,"sourceLine":string}],
 "appointments":[{"title":string,"when":string|null,"sourceLine":string}],
 "warningSigns":[{"text":string,"sourceLine":string}]}
Rules:
- sourceLine must be copied VERBATIM from the document, the single line the item came from.
- Never invent or guess. If a dose, quantity or date is missing or unreadable, use null.
- Do not add medical advice. Do not add items that are not in the document.`;

async function visionOcr(imageBase64: string): Promise<string> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return "";
  const r = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ image: { content: imageBase64 }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }] }] }),
  });
  if (!r.ok) { console.warn("vision", r.status, await r.text()); return ""; }
  const j = await r.json();
  return j.responses?.[0]?.fullTextAnnotation?.text || "";
}

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function foundInSource(line: string, src: string) {
  const n = norm(line), s = norm(src);
  if (!n || !s) return false;
  if (s.includes(n)) return true;
  const toks = n.split(" "), set = new Set(s.split(" "));
  return toks.filter((t) => set.has(t)).length / toks.length >= 0.85;
}
const DOSE_RE = /\d+(\.\d+)?\s*(mg|mcg|g|ml|units?|iu|tablets?|tabs?|capsules?|caps?|puffs?|drops?)\b/i;

function verify(parsed: any, src: string): PlanItem[] {
  const items: PlanItem[] = [];
  const check = (line: string) => (src ? (foundInSource(line, src) ? null : "Source line not found in the scanned text") : "No text to check against (OCR unavailable)");
  for (const m of parsed.meds || []) {
    let reason = check(m.sourceLine);
    if (!reason && !(m.dose && DOSE_RE.test(m.dose))) reason = "Dose is missing or has no unit";
    items.push({
      type: "med", text: m.name, dose: m.dose || "", frequency: m.frequency || "", dosesPerDay: m.dosesPerDay || undefined,
      quantity: m.quantity || undefined, fillDate: m.fillDate || new Date().toISOString().slice(0, 10), sourceLine: m.sourceLine || "",
      status: reason ? "needsReview" : "draft", reviewReason: reason || undefined,
    });
  }
  for (const a of parsed.appointments || []) {
    const reason = check(a.sourceLine);
    items.push({ type: "appointment", text: a.title, when: a.when || undefined, sourceLine: a.sourceLine || "", status: reason ? "needsReview" : "draft", reviewReason: reason || undefined });
  }
  for (const w of parsed.warningSigns || []) {
    const reason = check(w.sourceLine);
    items.push({ type: "warningSign", text: w.text, sourceLine: w.sourceLine || "", status: reason ? "needsReview" : "draft", reviewReason: reason || undefined });
  }
  return items;
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, text } = await req.json();
    let source = (text || "").trim();
        let ocr: "none" | "cloud-vision" | "gemini" = "none";
    if (imageBase64 && !source) { source = await visionOcr(imageBase64); if (source) ocr = "cloud-vision"; }
    if (imageBase64 && !source) {
      try { source = await transcribeImage(imageBase64, mimeType || "image/jpeg"); if (source) ocr = "gemini"; }
      catch (e) { console.warn("transcribe failed", e); }
    }

    const parts: any[] = [{ text: PROMPT + (source ? `\n\nDOCUMENT TEXT:\n${source}` : "\n\nThe document is the attached image.") }];
    if (imageBase64 && !source) parts.push({ inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } });

    let modelUsed = GEMMA_MODEL, raw: string | undefined;
    try {
      const r = await gemmaClient().models.generateContent({ model: GEMMA_MODEL, contents: [{ role: "user", parts }] });
      raw = r.text;
      parseJson(raw);
    } catch (e) {
      console.warn("gemma failed, falling back to gemini", e);
      modelUsed = GEMINI_MODEL;
      const r = await geminiClient().models.generateContent({ model: GEMINI_MODEL, contents: [{ role: "user", parts }], config: { responseMimeType: "application/json" } });
      raw = r.text;
    }
    const parsed = parseJson(raw);
    return Response.json({ items: verify(parsed, source), pharmacy: parsed.pharmacy || null, modelUsed, ocrUsed, sourceText: source });
  } catch (e: any) {
    console.error(e);
    return Response.json({ error: e?.message || "extract failed" }, { status: 500 });
  }
}
