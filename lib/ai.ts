import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
export const GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

let gemini: GoogleGenAI | null = null;
let gemma: GoogleGenAI | null = null;

// Gemini: Vertex AI (billed to hackathon credits) when USE_VERTEX=true, else Gemini Developer API.
export function geminiClient() {
  if (!gemini) {
    gemini = process.env.USE_VERTEX === "true"
      ? new GoogleGenAI({ vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1" })
      : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return gemini;
}
// Gemma 4 is served through the Gemini API (key-based).
export function gemmaClient() {
  if (!gemma) gemma = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return gemma;
}

export function parseJson<T = any>(text: string | undefined): T {
  if (!text) throw new Error("empty model response");
  const t = text.replace(/```json|```/g, "");
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("no JSON in model response");
  return JSON.parse(t.slice(s, e + 1));
}

// Free-tier keys hit per-minute limits: retry 429/503 with backoff.
export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e: any) {
      last = e;
      const msg = String(e?.status || e?.message || "");
      if (!/429|503|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded/i.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
    }
  }
  throw last;
}

export async function geminiJson<T = any>(prompt: string, parts: any[] = []): Promise<T> {
  const res = await withRetry(() => geminiClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }, ...parts] }],
    config: { responseMimeType: "application/json", temperature: 0.3 },
  }));
  return parseJson<T>(res.text);
}

// Free-tier replacement for Cloud Vision OCR: a separate verbatim transcription.
export async function transcribeImage(data: string, mimeType: string): Promise<string> {
  const res = await withRetry(() => geminiClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [
      { text: "Transcribe ALL text in this document image exactly as written, line by line. Do not summarize, correct, or add anything. If a word is unreadable, write [unreadable]." },
      { inlineData: { mimeType, data } },
    ] }],
    config: { temperature: 0 },
  }));
  return (res.text || "").trim();
}