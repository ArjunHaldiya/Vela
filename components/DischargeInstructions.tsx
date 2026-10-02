"use client";
import { Lang, Patient, PlanItem } from "@/lib/types";
import { t } from "@/lib/i18n";

export default function DischargeInstructions({ plan, lang }: { patient: Patient; plan: PlanItem[]; lang: Lang }) {
  const meds = plan.filter((p) => p.type === "med");
  const appts = plan.filter((p) => p.type === "appointment");
  const warnings = plan.filter((p) => p.type === "warningSign");

  return (
    <section className="card flex h-full flex-col overflow-hidden">
      <h2 className="text-xl font-bold">{t("dischargeInstructions", lang)}</h2>
      <div className="mt-3 flex-1 space-y-5 overflow-y-auto pr-1 text-base">
        {meds.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t("medicationsSection", lang)}</h3>
            <ul className="mt-2 space-y-3">
              {meds.map((m) => (
                <li key={m.id || m.text}>
                  <p className="font-semibold">{m.text} {m.dose} {m.frequency ? `— ${m.frequency}` : ""}</p>
                  <p className="text-sm text-slate-500">&ldquo;{m.sourceLine}&rdquo;</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {appts.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t("followUpSection", lang)}</h3>
            <ul className="mt-2 space-y-3">
              {appts.map((a) => (
                <li key={a.id || a.text}>
                  <p className="font-semibold">{a.text}</p>
                  <p className="text-sm text-slate-500">&ldquo;{a.sourceLine}&rdquo;</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-crit-600">{t("warningSignsTitle", lang)}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {warnings.map((w) => <li key={w.id || w.text}>{w.text}</li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
