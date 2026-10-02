import { Patient, PlanItem } from "./types";

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const inDays = (n: number, hour = 10) => { const d = new Date(Date.now() + n * 864e5); d.setHours(hour, 0, 0, 0); return d.toISOString(); };

// Synthetic patient. No real person or pharmacy.
export const DEMO_PATIENT: Patient = {
  name: "Rosa Martinez",
  language: "es",
  caregiverName: "Ana (daughter)",
  caregiverEmail: process.env.NEXT_PUBLIC_DEMO_CAREGIVER_EMAIL || "caregiver@example.com",
  doctorName: "Dr. Lee",
  doctorEmail: process.env.NEXT_PUBLIC_DEMO_DOCTOR_EMAIL || "doctor@example.com",
  pharmacy: {
    name: "Lakeside Demo Pharmacy",
    phone: process.env.NEXT_PUBLIC_DEMO_PHARMACY_PHONE || "+14155550123",
    address: "1 Demo Way, San Francisco, CA",
    email: process.env.NEXT_PUBLIC_DEMO_PHARMACY_EMAIL || "pharmacy@example.com",
  },
  consent: { shareWithCaregiver: true, shareWithDoctor: true },
};

export const demoPlan = (): PlanItem[] => [
  { type: "med", text: "Metoprolol", dose: "25 mg", frequency: "twice daily", dosesPerDay: 2, quantity: 60, fillDate: daysAgo(28), sourceLine: "Metoprolol tartrate 25 mg - take 1 tablet by mouth twice daily", status: "caregiverConfirmed" },
  { type: "med", text: "Furosemide", dose: "20 mg", frequency: "every morning", dosesPerDay: 1, quantity: 30, fillDate: daysAgo(3), sourceLine: "Furosemide 20 mg - take 1 tablet every morning", status: "caregiverConfirmed" },
  { type: "med", text: "Atorvastatin", dose: "40 mg", frequency: "at bedtime", dosesPerDay: 1, quantity: 30, fillDate: daysAgo(3), sourceLine: "Atorvastatin 40 mg - take 1 tablet at bedtime", status: "caregiverConfirmed" },
  { type: "med", text: "Aspirin", dose: "", frequency: "once daily", dosesPerDay: 1, quantity: 90, fillDate: daysAgo(3), sourceLine: "Aspirin _ mg once daily", status: "needsReview", reviewReason: "Dose is missing or unreadable" },
  { type: "appointment", text: "Cardiology follow-up with Dr. Lee", when: inDays(7), sourceLine: "Follow up with Dr. Lee, Cardiology, in 1 week", status: "caregiverConfirmed" },
  { type: "warningSign", text: "Shortness of breath when walking or lying down", sourceLine: "Shortness of breath when walking or lying down", status: "caregiverConfirmed" },
  { type: "warningSign", text: "Chest pain or pressure", sourceLine: "Chest pain or pressure", status: "caregiverConfirmed" },
  { type: "warningSign", text: "Swelling in legs or ankles", sourceLine: "Swelling in legs or ankles", status: "caregiverConfirmed" },
  { type: "warningSign", text: "Weight gain of more than 3 pounds in 2 days", sourceLine: "Weight gain of more than 3 pounds in 2 days", status: "caregiverConfirmed" },
];

export const SAMPLE_DISCHARGE_TEXT = `DISCHARGE INSTRUCTIONS - SYNTHETIC DEMO
Patient: Rosa Martinez   Discharged: Cardiology unit
Pharmacy: Lakeside Demo Pharmacy, (415) 555-0123, 1 Demo Way, San Francisco, CA

MEDICATIONS
Metoprolol tartrate 25 mg - take 1 tablet by mouth twice daily. Qty 60.
Furosemide 20 mg - take 1 tablet every morning. Qty 30.
Atorvastatin 40 mg - take 1 tablet at bedtime. Qty 30.
Lisinopril 10 mg - take 1 tablet once daily. Qty 30.

FOLLOW-UP
Follow up with Dr. Lee, Cardiology, in 1 week.

CALL YOUR DOCTOR IF YOU HAVE:
Shortness of breath when walking or lying down
Chest pain or pressure (call 911)
Swelling in legs or ankles
Weight gain of more than 3 pounds in 2 days`;
