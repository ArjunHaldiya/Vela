import { NextRequest } from "next/server";
import { geminiJson } from "@/lib/ai";
import { Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { transcript = [], severity = "routine", fired = [], patientName = "the patient", plan = [], pharmacistQuestions = [], teachBack = null } = await req.json();
    const lines = (transcript as Turn[]).map((t) => `${t.role === "aide" ? "Aide" : "Patient"}: ${t.text}${t.english && t.english !== t.text ? `  [English: ${t.english}]` : ""}`).join("\n");
    const drafts = plan.filter((p: any) => p.status === "draft" || p.status === "needsReview").map((p: any) => p.text);

    const out = await geminiJson(`Write two summaries of this check-in with ${patientName}. Use only facts in the transcript. Do not diagnose or recommend treatment.

Severity from the safety system: ${severity}. Rules fired: ${fired.join("; ") || "none"}. Teach-back: ${teachBack ?? "not done"}.
Plan items still unconfirmed: ${drafts.join(", ") || "none"}.
Questions for the pharmacist: ${pharmacistQuestions.join("; ") || "none"}.

TRANSCRIPT:
${lines}

Return ONLY JSON:
{"caregiverSummary": string (English, 3-5 short plain sentences for a family caregiver: how they are doing, doses taken or missed, anything to do today. Start with the action if urgent.),
 "doctorSummary": string (English, scannable, use these labeled lines: "Severity:", "Adherence:", "Symptoms reported:" (include the patient's exact words in their language in quotes followed by the English translation), "Safety rules fired:", "Teach-back:", "Patient questions:", "Unconfirmed plan items:". End with "AI-generated, not clinically verified.")}`);
    return Response.json({ caregiverSummary: out.caregiverSummary, doctorSummary: out.doctorSummary });
  } catch (e: any) {
    console.error(e);
    return Response.json({ error: e?.message || "summary failed" }, { status: 500 });
  }
}
