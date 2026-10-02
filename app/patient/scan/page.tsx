"use client";
import Link from "next/link";
import { useState } from "react";
import { useAide } from "@/lib/useAide";
import { addPlanItems, savePatient } from "@/lib/store";
import { SAMPLE_DISCHARGE_TEXT } from "@/lib/demo-data";
import { PlanItem } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

async function compress(file: File): Promise<{ data: string; mimeType: string }> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.85);
  return { data: url.split(",")[1], mimeType: "image/jpeg" };
}

export default function Scan() {
  const { patient } = useAide();
  const [mode, setMode] = useState<"scan" | "type">("scan");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ items: PlanItem[]; pharmacy: any; modelUsed: string; ocrUsed: boolean } | null>(null);
  const [saved, setSaved] = useState(false);

  async function run(body: any) {
    setBusy(true); setErr(""); setResult(null); setSaved(false);
    try {
      const r = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setResult(j);
    } catch (e: any) { setErr(e.message || "Something went wrong"); }
    setBusy(false);
  }

  async function onFile(f?: File | null) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    const { data, mimeType } = await compress(f);
    run({ imageBase64: data, mimeType });
  }

  async function save() {
    if (!result) return;
    await addPlanItems(result.items);
    const ph = result.pharmacy;
    if (ph?.phone && patient) await savePatient({ pharmacy: { ...patient.pharmacy, name: ph.name || patient.pharmacy.name, phone: ph.phone, address: ph.address || patient.pharmacy.address } });
    setSaved(true);
  }

  return (
    <main className="mx-auto max-w-md p-5 pb-16">
      <Link href="/patient" className="text-lg underline">← Back</Link>
      <h1 className="mt-3 text-3xl font-extrabold">Add a prescription</h1>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1" role="tablist">
        {(["scan", "type"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`rounded-xl py-3 text-xl font-bold ${mode === m ? "bg-white shadow" : "text-slate-600"}`}>{m === "scan" ? "Scan it" : "Type it"}</button>
        ))}
      </div>

      {mode === "scan" ? (
        <div className="card mt-4">
          <p className="text-lg">Point your camera at the discharge papers or the pill bottle label.</p>
          <label className="btn-primary mt-4 cursor-pointer">
            Take a photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <p className="mt-2 text-sm text-slate-500">Lens-style scanning: Google Cloud Vision reads the text, Gemma 4 builds the plan.</p>
          {preview && <img src={preview} alt="Your scanned document" className="mt-4 max-h-64 w-full rounded-2xl object-contain" />}
        </div>
      ) : (
        <div className="card mt-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="Type or paste the instructions here"
            className="w-full rounded-2xl border-2 border-slate-300 p-3 text-lg" />
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" disabled={busy || !text.trim()} onClick={() => run({ text })}>Read it</button>
          </div>
          <button className="btn-small mt-3" onClick={() => setText(SAMPLE_DISCHARGE_TEXT)}>Use sample discharge sheet</button>
        </div>
      )}

      {busy && <p className="mt-6 text-xl font-semibold" aria-live="polite">Reading your papers…</p>}
      {err && <p className="mt-6 rounded-2xl bg-crit-50 p-4 text-lg text-crit-600">{err}</p>}

      {result && (
        <section className="mt-6">
          <h2 className="text-2xl font-bold">Draft plan</h2>
          <p className="text-base text-slate-600">Nothing is active until your caregiver confirms it. Read by {result.modelUsed}{result.ocrUsed ? " + Cloud Vision" : ""}.</p>
          <ul className="mt-3 grid gap-3">
            {result.items.map((it, i) => (
              <li key={i} className="card">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xl font-bold">{it.text} {it.dose}</p>
                  <StatusBadge status={it.status} />
                </div>
                {it.frequency && <p className="text-lg">{it.frequency}{it.quantity ? ` · qty ${it.quantity}` : ""}</p>}
                {it.when && <p className="text-lg">{it.when}</p>}
                <p className="mt-2 rounded-xl bg-slate-50 p-2 font-mono text-sm text-slate-600">“{it.sourceLine}”</p>
                {it.reviewReason && <p className="mt-1 text-base font-semibold text-warn-600">⚠ {it.reviewReason}</p>}
              </li>
            ))}
          </ul>
          {result.pharmacy?.phone && <p className="mt-3 text-lg">Pharmacy found: <b>{result.pharmacy.name}</b> {result.pharmacy.phone}</p>}
          {saved ? <p className="mt-4 rounded-2xl bg-calm-50 p-4 text-xl font-semibold text-calm-700">Sent to your caregiver for review.</p>
            : <button className="btn-primary mt-4" onClick={save}>Send to my caregiver to confirm</button>}
        </section>
      )}
    </main>
  );
}
