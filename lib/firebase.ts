import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let authReady: Promise<unknown> | null = null;

export function getDb(): Firestore {
  if (!app) {
    app = getApps()[0] ?? initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
