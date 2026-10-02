import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch,
} from "firebase/firestore";
import { ensureAuth, getDb } from "./firebase";
import { Alert, CheckIn, Patient, PlanItem, Status } from "./types";
import { DEMO_PATIENT, demoPlan } from "./demo-data";

export const PID = "rosa"; // single demo patient

const pRef = () => doc(getDb(), "patients", PID);
const sub = (name: string) => collection(getDb(), "patients", PID, name);

export function watch<T>(kind: "patient" | "plan" | "checkins" | "alerts", cb: (v: T) => void): () => void {
  let unsub = () => {};
  let cancelled = false;
  ensureAuth().then(() => {
    if (cancelled) return;
    if (kind === "patient") {
      unsub = onSnapshot(pRef(), (s) => cb((s.exists() ? s.data() : null) as T));
    } else {
      const q = kind === "plan" ? sub("plan") : query(sub(kind), orderBy("createdAt", "desc"));
      unsub = onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })) as T));
    }
  });
  return () => { cancelled = true; unsub(); };
}

const clean = <T extends object>(o: T) => JSON.parse(JSON.stringify(o));

export async function savePatient(p: Partial<Patient>) { await ensureAuth(); await setDoc(pRef(), clean(p), { merge: true }); }

export async function addPlanItems(items: PlanItem[]) {
  await ensureAuth();
  const b = writeBatch(getDb());
  for (const it of items) { const { id, ...rest } = it; b.set(doc(sub("plan")), clean(rest)); }
  await b.commit();
}
export async function setItemStatus(id: string, status: Status, by: string) {
  await ensureAuth(); await updateDoc(doc(sub("plan"), id), { status, confirmedBy: by });
}
export async function addCheckin(c: CheckIn) { await ensureAuth(); const { id, ...rest } = c; return (await addDoc(sub("checkins"), clean(rest))).id; }
export async function updateCheckin(id: string, patch: Partial<CheckIn>) { await ensureAuth(); await updateDoc(doc(sub("checkins"), id), clean(patch)); }
export async function addAlert(a: Alert) { await ensureAuth(); const { id, ...rest } = a; await addDoc(sub("alerts"), clean(rest)); }
export async function ackAlert(id: string, by: string) { await ensureAuth(); await updateDoc(doc(sub("alerts"), id), { acknowledgedBy: by }); }

export async function seedDemo() {
  await ensureAuth();
  for (const name of ["plan", "checkins", "alerts"]) {
    const snap = await getDocs(sub(name));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  await setDoc(pRef(), clean(DEMO_PATIENT));
  await addPlanItems(demoPlan());
}
