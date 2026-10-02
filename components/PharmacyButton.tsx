"use client";
import { telLink } from "@/lib/google-links";
import { Pharmacy, Lang } from "@/lib/types";
import { t } from "@/lib/i18n";

export default function PharmacyButton({ pharmacy, lang }: { pharmacy?: Pharmacy; lang: Lang }) {
  if (!pharmacy?.phone) return null;
  return (
    <a href={telLink(pharmacy.phone)} aria-label={`${t("callPharmacy", lang)}: ${pharmacy.name}`}
      className="fixed bottom-5 left-5 z-40 flex items-center gap-3 rounded-full bg-calm-600 px-6 py-4 text-xl font-bold text-white shadow-lg active:scale-95">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
      </svg>
      {t("pharmacy", lang)}
    </a>
  );
}
