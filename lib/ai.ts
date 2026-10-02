// Groq (OpenAI-compatible) behind the same interface the routes already use.
const GROQ = "https://api.groq.com/openai/v1";
export const GEMINI_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
export const GEMMA_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const key = () => process.env.GROQ_API_KEY || "";

export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e: any) {
      last = e;
      if (!/429|503|rate/i.test(String(e?.message))) throw e;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
    }
  }
  throw last;
}

async function transcribe(b64: string, mime: string): Promise<string> {
  const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
  const fd = new FormData();
  fd.append("file", new Blob([Buffer.from(b64, "base64")], { type: mime }), `audio.${ext}`);
  fd.append("model", process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  const r = await fetch(`${GROQ}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${key()}` }, body: fd });
  if (!r.ok) throw new Error(`groq stt ${r.status}: ${await r.text()}`);
  return (await r.json()).text || "";
}

async function chat(model: string, parts: any[], json: boolean, temperature = 0.3): Promise<string> {
  const content: any[] = [];
  let hasImage = false;
  for (const p of parts) {
    if (p.text) content.push({ type: "text", text: p.text });
    else if (p.inlineData?.mimeType?.startsWith("image/")) {
      hasImage = true;
      content.push({ type: "image_url", image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } });
    } else if (p.inlineData?.mimeType?.startsWith("audio/")) {
      const t = await transcribe(p.inlineData.data, p.inlineData.mimeType);
      content.push({ type: "text", text: `\nThe patient's audio reply, transcribed by Whisper: "${t}". Use this as their newest reply.` });
    }
  }
  const body: any = {
    model: hasImage ? GEMMA_MODEL : model,
    messages: [{ role: "user", content: hasImage ? content : content.map((c) => c.text).join("\n") }],
    temperature,
  };
  if (json && !hasImage) body.response_format = { type: "json_object" };
  return withRetry(async () => {
    const r = await fetch(`${GROQ}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`groq ${r.status}: ${await r.text()}`);
    return (await r.json()).choices[0].message.content as string;
  });
}

const client = {
  models: {
    generateContent: async ({ model, contents, config }: any) => ({
      text: await chat(model, contents?.[0]?.parts || [], config?.responseMimeType === "application/json"),
    }),
  },
};
export const geminiClient = () => client;
export const gemmaClient = () => client;

export function parseJson<T = any>(text: string | undefined): T {
  if (!text) throw new Error("empty model response");
  const t = text.replace(/```json|```/g, "");
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("no JSON in model response");
  return JSON.parse(t.slice(s, e + 1));
}

export async function geminiJson<T = any>(prompt: string, parts: any[] = []): Promise<T> {
  return parseJson<T>(await chat(GEMINI_MODEL, [{ text: prompt }, ...parts], true));
}

// Verbatim OCR with the Groq vision model, one page image at a time.
export async function transcribeImage(data: string, mimeType: string): Promise<string> {
  const text = await chat(GEMMA_MODEL, [
    { text: "Transcribe ALL text in this document image exactly as written, line by line. Do not summarize, correct, or add anything. If a word is unreadable, write [unreadable]. Output only the transcription." },
    { inlineData: { mimeType, data } },
  ], false, 0);
  return text.trim();
}
