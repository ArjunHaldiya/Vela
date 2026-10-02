import { PlanItem } from "./types";

export function daysLeft(item: PlanItem, now = Date.now()): number | null {
  if (!item.quantity || !item.dosesPerDay || !item.fillDate) return null;
  const fill = Date.parse(item.fillDate);
  if (Number.isNaN(fill)) return null;
  const supplyDays = item.quantity / item.dosesPerDay;
  const elapsed = (now - fill) / 864e5;
  return Math.max(0, Math.floor(supplyDays - elapsed));
}

export const REFILL_THRESHOLD_DAYS = 3;
export const lowMeds = (plan: PlanItem[]) =>
  plan.filter((p) => p.type === "med").map((p) => ({ item: p, days: daysLeft(p) }))
    .filter((x) => x.days !== null && x.days <= REFILL_THRESHOLD_DAYS);
