"use client";
import { useState } from "react";
import { isLive, Lang, PlanItem } from "@/lib/types";
import { t } from "@/lib/i18n";

type Mark = "done" | "missed";
const key = (p: PlanItem) => p.id || p.text;

function daysUntil(when?: string) {
  if (!when) return null;
  return Math.ceil((Date.parse(when) - Date.now()) / 864e5);
}

function TimelineItem({ item, lang, mark, onMark }: { item: PlanItem; lang: Lang; mark?: Mark; onMark: (m: Mark) => void }) {
  const badge = item.type === "med" ? t("medicationBadge", lang) : t("followUpBadge", lang);
  const detail = item.type === "med"
    ? [item.dose, item.frequency].filter(Boolean).join(" · ")
    : item.when ? new Date(item.when).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { dateStyle: "medium" }) : "";
  return (
    <div className={`rounded-2xl border p-4 ${mark === "missed" ? "border-crit-500 bg-crit-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-lg font-bold ${mark === "done" ? "text-slate-400 line-through" : ""}`}>{item.text}</p>
        <span className="shrink-0 rounded-full border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600">{badge}</span>
      </div>
      {detail && <p className="text-sm text-slate-500">{detail}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => onMark("done")}
          className={`rounded-xl px-3 py-1.5 text-sm font-bold ${mark === "done" ? "bg-calm-600 text-white" : "border border-calm-600 text-calm-700"}`}>
          ✓ {t("done", lang)}
        </button>
        <button onClick={() => onMark("missed")}
          className={`rounded-xl px-3 py-1.5 text-sm font-bold ${mark === "missed" ? "bg-crit-600 text-white" : "border border-crit-500 text-crit-600"}`}>
          ✕ {t("missed", lang)}
        </button>
      </div>
    </div>
  );
}

export default function CareTimeline({ plan, lang }: { plan: PlanItem[]; lang: Lang }) {
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const live = plan.filter((p) => isLive(p.status));
  const meds = live.filter((p) => p.type === "med");
  const apptsThisWeek = live.filter((p) => p.type === "appointment" && daysUntil(p.when) !== null && (daysUntil(p.when) as number) <= 7);
  const apptsUpcoming = live.filter((p) => p.type === "appointment" && daysUntil(p.when) !== null && (daysUntil(p.when) as number) > 7);
  const warnings = live.filter((p) => p.type === "warningSign");
  const pending = plan.filter((p) => !isLive(p.status));

  const setMark = (p: PlanItem, m: Mark) => setMarks((s) => ({ ...s, [key(p)]: m }));

  return (
    <section className="card flex h-full flex-col overflow-hidden">
      <h2 className="text-xl font-bold">{t("careTimeline", lang)}</h2>
      <div className="mt-3 flex-1 space-y-6 overflow-y-auto pr-1">
        {meds.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t("today", lang)}</h3>
            <div className="mt-2 space-y-3">
              {meds.map((m) => <TimelineItem key={key(m)} item={m} lang={lang} mark={marks[key(m)]} onMark={(mk) => setMark(m, mk)} />)}
            </div>
          </div>
        )}
        {apptsThisWeek.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t("thisWeek", lang)}</h3>
            <div className="mt-2 space-y-3">
              {apptsThisWeek.map((a) => <TimelineItem key={key(a)} item={a} lang={lang} mark={marks[key(a)]} onMark={(mk) => setMark(a, mk)} />)}
            </div>
          </div>
        )}
        {apptsUpcoming.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t("upcoming", lang)}</h3>
            <div className="mt-2 space-y-3">
              {apptsUpcoming.map((a) => <TimelineItem key={key(a)} item={a} lang={lang} mark={marks[key(a)]} onMark={(mk) => setMark(a, mk)} />)}
            </div>
          </div>
        )}
        {pending.length > 0 && (
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-600">{t("waiting", lang)}:</p>
            <p className="text-base text-slate-500">{pending.map((p) => p.text).join(", ")}</p>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="rounded-2xl border border-crit-500 bg-crit-50 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-crit-600">{t("warningSignsTitle", lang)}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-crit-700">
              {warnings.map((w) => <li key={key(w)}>{w.text}</li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
