// ─────────────────────────────────────────────────────────────
// Firebase 초기화 (선택적).
// 설정(databaseURL 포함)이 있으면 Realtime Database 인스턴스를 반환, 아니면 null.
// null이면 데이터 레이어(db.ts)가 localStorage 데모 모드로 동작.
// ─────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Realtime Database 모드에는 databaseURL이 반드시 필요하다.
export const FIREBASE_ENABLED = Boolean(
  cfg.apiKey && cfg.projectId && cfg.databaseURL
);

let _rtdb: Database | null = null;

export function getRtdb(): Database | null {
  if (!FIREBASE_ENABLED) return null;
  if (_rtdb) return _rtdb;
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(cfg);
  _rtdb = getDatabase(app);
  return _rtdb;
}
