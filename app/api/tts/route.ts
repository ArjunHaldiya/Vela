import { NextRequest } from "next/server";

export const runtime = "nodejs";

const VOICE: Record<string, string> = { en: "en-US", es: "es-US" };

export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return Response.json({ error: "no GOOGLE_API_KEY" }, { status: 501 });
  const { text, language = "en" } = await req.json();
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: VOICE[language] || "en-US", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.9 },
    }),
  });
  if (!r.ok) return Response.json({ error: await r.text() }, { status: 502 });
  const j = await r.json();
  return Response.json({ audioContent: j.audioContent });
}
