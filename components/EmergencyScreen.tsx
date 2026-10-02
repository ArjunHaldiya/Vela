"use client";
import { Lang } from "@/lib/types";
import { t } from "@/lib/i18n";

export default function EmergencyScreen({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  return (
    <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-crit-600 p-8 text-center text-white">
      <h1 className="text-4xl font-extrabold">{t("emergencyTitle", lang)}</h1>
      <p className="text-2xl">{t("emergencyBody", lang)}</p>
      <a href="tel:911" className="w-full max-w-sm rounded-2xl bg-white py-6 text-3xl font-extrabold text-crit-600 shadow-xl">{t("call911", lang)}</a>
      <button onClick={onClose} className="text-xl underline">{t("imSafe", lang)}</button>
    </div>
  );
}
