"use client";
import Link from "next/link";
import { useState } from "react";
import { seedDemo } from "@/lib/store";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mt-6 text-5xl font-extrabold text-calm-700">Aide</h1>
      <p className="mt-2 text-xl">Aide drafts, checks in, and escalates. <b>People decide.</b></p>
      <div className="mt-8 grid gap-4">
        <Link href="/patient" className="btn-primary">I'm the patient</Link>
        <Link href="/caregiver" className="btn-secondary">I'm the caregiver</Link>
        <Link href="/doctor" className="btn-secondary">I'm the doctor</Link>
      </div>
      <div className="card mt-10">
        <p className="text-base text-slate-600">Demo uses a synthetic patient (Rosa). No real health data.</p>
        <button disabled={busy} className="btn-small mt-3" onClick={async () => {
          setBusy(true); setMsg("");
          try { await seedDemo(); setMsg("Demo patient loaded."); } catch (e: any) { setMsg("Error: " + e.message); }
          setBusy(false);
        }}>{busy ? "Loading…" : "Load / reset demo patient"}</button>
        {msg && <p className="mt-2 text-base">{msg}</p>}
      </div>
    </main>
  );
}
