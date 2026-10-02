# Vela V2 — a human-centered care companion

**Vela drafts, checks in, and escalates. People decide.**

Older adults leave the hospital with dense discharge papers, new medications and warning signs to watch for. Vela turns those papers into a plan, checks in with the patient by voice in their own language, and keeps the caregiver, the doctor and the pharmacy in the loop. A person confirms every step.

## Features
- **Scan or type a prescription.** Lens-style scanning: Cloud Vision reads the text, **Gemma 4** structures it into medications, appointments, warning signs and the pharmacy, each with its source line.
- **Verifier.** Every item must match a line in the scanned text and every dose needs a number and unit; otherwise it is marked *Needs review*.
- **Caregiver confirms** each item before it reaches the patient. The doctor can mark items *Clinician-verified*.
- **Voice check-in** (English/Spanish) with **Gemini**: doses, symptoms and a **teach-back** question. Cloud Text-to-Speech voice.
- **Rules-first red-flag triage.** Fixed emergency phrases and the patient's own discharge warning signs fire without AI; Gemini can raise severity, never lower it. Emergency shows a full-screen *Call 911*.
- **Two summaries** after each check-in: plain-language for the caregiver, structured for the doctor (with the patient's original words + translation).
- **Urgent summary to the doctor via Gmail, only after the caregiver approves** it.
- **Pharmacy:** a call button (bottom-left) on every patient screen, refill countdown with a pop-up at ≤3 days, refill request and medication list via Gmail, Google Maps directions.
- **Google Calendar** button for follow-up appointments.
- **Patient-controlled sharing:** the patient chooses whether the caregiver and the doctor receive summaries. Safety alerts always reach the caregiver.

## Google technologies
| Product | Role |
|---|---|
| Gemini (`gemini-flash-latest`, optionally via Vertex AI) | Check-in conversation, audio transcription, triage, summaries |
| **Gemma 4** (`gemma-4-26b-a4b-it`) via the Gemini API | Structures prescriptions and discharge papers ([Gemma terms](https://ai.google.dev/gemma/terms)) |
| Cloud Vision API | OCR for scanned documents |
| Cloud Text-to-Speech | Vela's voice in English and Spanish |
| Firebase Auth + Firestore | Roles, plan, live caregiver feed and alerts |
| Cloud Run | Hosting, on the hackathon credits |
| Gmail, Google Calendar, Google Maps | Human-approved emails, follow-up events, pharmacy directions |

## Safety and responsible AI
1. Nothing goes live until a human confirms it.
2. Every extracted item shows the exact line it came from.
3. Vela reminds and escalates; it never diagnoses, changes a dose, or answers "should I take this?". Those questions go to an ask-your-pharmacist list.
4. Red flags: rules first, AI second; the AI can only raise severity.
5. Three levels: emergency (911 screen + caregiver alert), urgent (caregiver alert + doctor summary flagged), routine.
6. Patient-controlled sharing; Vela identifies itself as an assistant, not a doctor; saying "stop" ends the check-in.
7. Photos are not stored; only the structured plan is kept.

**This is a prototype using synthetic data. It is not HIPAA-compliant.** Production path: Vertex AI under a Google Cloud BAA, role-based Firestore rules keyed on the consent map, audit logs, clinician review.

## Run locally
```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev                  # http://localhost:3000, then "Load / reset demo patient"
```
Firebase: create a project, enable Firestore and **Anonymous** sign-in, deploy `firestore.rules`.
Google Cloud: enable Cloud Vision API and Cloud Text-to-Speech API, create an API key (`GOOGLE_API_KEY`).
Gemini/Gemma: create a key in Google AI Studio (`GEMINI_API_KEY`).

## Deploy to Cloud Run
Put the `NEXT_PUBLIC_*` values in `.env.production` (they are public Firebase config and are baked in at build time), then:
```bash
gcloud run deploy aide --source . --region us-central1 --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=...,GOOGLE_API_KEY=...,GEMMA_MODEL=gemma-4-26b-a4b-it
```

## License
MIT
