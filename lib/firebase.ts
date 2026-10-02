import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let authReady: Promise<unknown> | null = null;

export function getDb(): Firestore {
  if (!app) {
    app = getApps()[0] ?? initializeApp({
      apiKey: "AIzaSyAzAD3T-t_G_8cL-HWKr2ckmJNSWLweb7k",
      authDomain: "vela-826a6.firebaseapp.com",
      projectId: "vela-826a6",
      appId: "1:570616547676:web:43eb3747527b65a003d999",
    });
  }
  if (!db) db = getFirestore(app);
  return db;
}

export function ensureAuth(): Promise<unknown> {
  getDb();
  if (!authReady) authReady = signInAnonymously(getAuth(app!)).catch((e) => console.warn("anon auth", e));
  return authReady;
}
