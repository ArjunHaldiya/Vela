"use client";
import { useEffect, useState } from "react";
import { watch } from "./store";
import { Alert, CheckIn, Patient, PlanItem } from "./types";

export function useAide() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const u = [
      watch<Patient | null>("patient", (p) => { setPatient(p); setLoaded(true); }),
      watch<PlanItem[]>("plan", setPlan),
      watch<CheckIn[]>("checkins", setCheckins),
      watch<Alert[]>("alerts", setAlerts),
    ];
    return () => u.forEach((f) => f());
  }, []);
  return { patient, plan, checkins, alerts, loaded };
}
