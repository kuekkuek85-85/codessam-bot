// ─────────────────────────────────────────────────────────────
// 데이터 레이어 추상화.
// Firebase가 설정되어 있으면 Firestore 실시간, 아니면 localStorage 데모.
// 두 구현 모두 동일한 DB 인터페이스를 만족한다.
// ─────────────────────────────────────────────────────────────

"use client";

import {
  type Attempt,
  type Message,
  type Mission,
  type Student,
  type Warning,
  type Level,
  type StudentState,
} from "./types";
import { SEED_MISSIONS, DEMO_SESSION_ID } from "./missions";
import { FIREBASE_ENABLED, getDb } from "./firebase";

export interface DB {
  /** 데모(localStorage) 모드 여부 */
  readonly demo: boolean;

  ensureSeed(): Promise<void>;

  listMissions(sessionId: string): Promise<Mission[]>;
  getMission(missionId: string): Promise<Mission | null>;

  upsertStudent(s: Student): Promise<void>;
  getStudent(studentId: string): Promise<Student | null>;
  findStudent(
    sessionId: string,
    studentNo: string,
    name: string
  ): Promise<Student | null>;
  updateStudent(id: string, patch: Partial<Student>): Promise<void>;
  subscribeStudents(
    sessionId: string,
    cb: (rows: Student[]) => void
  ): () => void;

  createAttempt(a: Attempt): Promise<void>;
  getAttempt(id: string): Promise<Attempt | null>;
  updateAttempt(id: string, patch: Partial<Attempt>): Promise<void>;
  latestAttempt(studentId: string): Promise<Attempt | null>;
  lastAiHint(studentId: string): Promise<string | null>;

  addMessage(m: Message): Promise<void>;
  listMessages(attemptId: string): Promise<Message[]>;

  addWarning(w: Warning): Promise<void>;
  subscribeWarnings(
    sessionId: string,
    cb: (rows: Warning[]) => void
  ): () => void;

  clearAll(sessionId: string): Promise<void>;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

// ════════════════════════════════════════════════════════════
// localStorage 구현 (데모 모드). 같은 브라우저 내 탭 간 실시간은
// 'storage' 이벤트 + BroadcastChannel + 폴링으로 처리.
// ════════════════════════════════════════════════════════════

const LS_KEY = "codessam:data:v2";

interface Store {
  missions: Mission[];
  students: Student[];
  attempts: Attempt[];
  messages: Message[];
  warnings: Warning[];
}

function emptyStore(): Store {
  return { missions: [], students: [], attempts: [], messages: [], warnings: [] };
}

class LocalDB implements DB {
  demo = true;
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel("codessam");
    }
  }

  private read(): Store {
    if (typeof window === "undefined") return emptyStore();
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? { ...emptyStore(), ...JSON.parse(raw) } : emptyStore();
    } catch {
      return emptyStore();
    }
  }

  private write(s: Store) {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    this.channel?.postMessage("changed");
    // storage 이벤트는 다른 탭에서만 발화 → 현재 탭용 커스텀 이벤트도 발화
    window.dispatchEvent(new Event("codessam:changed"));
  }

  async ensureSeed() {
    const s = this.read();
    if (s.missions.length === 0) {
      s.missions = SEED_MISSIONS.map((m) => ({ ...m }));
      this.write(s);
    }
  }

  async listMissions(sessionId: string) {
    return this.read().missions.filter((m) => m.sessionId === sessionId);
  }
  async getMission(missionId: string) {
    return this.read().missions.find((m) => m.id === missionId) ?? null;
  }

  async upsertStudent(st: Student) {
    const s = this.read();
    const i = s.students.findIndex((x) => x.id === st.id);
    if (i >= 0) s.students[i] = st;
    else s.students.push(st);
    this.write(s);
  }
  async getStudent(id: string) {
    return this.read().students.find((x) => x.id === id) ?? null;
  }
  async findStudent(sessionId: string, studentNo: string, name: string) {
    return (
      this.read().students.find(
        (x) =>
          x.sessionId === sessionId &&
          x.studentNo === studentNo &&
          x.name === name
      ) ?? null
    );
  }
  async updateStudent(id: string, patch: Partial<Student>) {
    const s = this.read();
    const i = s.students.findIndex((x) => x.id === id);
    if (i >= 0) {
      s.students[i] = { ...s.students[i], ...patch };
      this.write(s);
    }
  }
  subscribeStudents(sessionId: string, cb: (rows: Student[]) => void) {
    const fire = () =>
      cb(
        this.read()
          .students.filter((x) => x.sessionId === sessionId)
          .sort((a, b) => a.studentNo.localeCompare(b.studentNo))
      );
    fire();
    const onChange = () => fire();
    window.addEventListener("storage", onChange);
    window.addEventListener("codessam:changed", onChange);
    this.channel?.addEventListener("message", onChange);
    const poll = setInterval(fire, 4000); // 시간 기반 상태(막힘 등) 갱신용
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("codessam:changed", onChange);
      this.channel?.removeEventListener("message", onChange);
      clearInterval(poll);
    };
  }

  async createAttempt(a: Attempt) {
    const s = this.read();
    s.attempts.push(a);
    this.write(s);
  }
  async getAttempt(id: string) {
    return this.read().attempts.find((x) => x.id === id) ?? null;
  }
  async updateAttempt(id: string, patch: Partial<Attempt>) {
    const s = this.read();
    const i = s.attempts.findIndex((x) => x.id === id);
    if (i >= 0) {
      s.attempts[i] = { ...s.attempts[i], ...patch };
      this.write(s);
    }
  }

  async latestAttempt(studentId: string) {
    const rows = this.read()
      .attempts.filter((a) => a.studentId === studentId)
      .sort((a, b) => b.startedAt - a.startedAt);
    return rows[0] ?? null;
  }
  async lastAiHint(studentId: string) {
    const rows = this.read()
      .messages.filter((m) => m.studentId === studentId && m.role === "ai")
      .sort((a, b) => b.createdAt - a.createdAt);
    return rows[0]?.text ?? null;
  }

  async addMessage(m: Message) {
    const s = this.read();
    s.messages.push(m);
    this.write(s);
  }
  async listMessages(attemptId: string) {
    return this.read()
      .messages.filter((x) => x.attemptId === attemptId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async addWarning(w: Warning) {
    const s = this.read();
    s.warnings.push(w);
    this.write(s);
  }
  subscribeWarnings(sessionId: string, cb: (rows: Warning[]) => void) {
    const studentIds = () =>
      new Set(
        this.read()
          .students.filter((x) => x.sessionId === sessionId)
          .map((x) => x.id)
      );
    const fire = () => {
      const ids = studentIds();
      cb(
        this.read()
          .warnings.filter((w) => ids.has(w.studentId))
          .sort((a, b) => b.createdAt - a.createdAt)
      );
    };
    fire();
    const onChange = () => fire();
    window.addEventListener("storage", onChange);
    window.addEventListener("codessam:changed", onChange);
    this.channel?.addEventListener("message", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("codessam:changed", onChange);
      this.channel?.removeEventListener("message", onChange);
    };
  }

  async clearAll(sessionId: string) {
    const s = this.read();
    const keepStudents = s.students.filter((x) => x.sessionId !== sessionId);
    const removedIds = new Set(
      s.students.filter((x) => x.sessionId === sessionId).map((x) => x.id)
    );
    s.students = keepStudents;
    s.attempts = s.attempts.filter((a) => !removedIds.has(a.studentId));
    s.messages = s.messages.filter((m) => !removedIds.has(m.studentId));
    s.warnings = s.warnings.filter((w) => !removedIds.has(w.studentId));
    this.write(s);
  }
}

// ════════════════════════════════════════════════════════════
// Firestore 구현 (실서비스 모드).
// ════════════════════════════════════════════════════════════

class FirestoreDB implements DB {
  demo = false;

  private async fs() {
    const db = getDb();
    if (!db) throw new Error("Firestore not initialized");
    const mod = await import("firebase/firestore");
    return { db, ...mod };
  }

  async ensureSeed() {
    const { db, collection, getDocs, query, where, writeBatch, doc } =
      await this.fs();
    const q = query(
      collection(db, "missions"),
      where("sessionId", "==", DEMO_SESSION_ID)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      const batch = writeBatch(db);
      for (const m of SEED_MISSIONS) {
        batch.set(doc(db, "missions", m.id), m);
      }
      await batch.commit();
    }
  }

  async listMissions(sessionId: string) {
    const { db, collection, getDocs, query, where } = await this.fs();
    const snap = await getDocs(
      query(collection(db, "missions"), where("sessionId", "==", sessionId))
    );
    return snap.docs.map((d) => d.data() as Mission);
  }
  async getMission(missionId: string) {
    const { db, doc, getDoc } = await this.fs();
    const d = await getDoc(doc(db, "missions", missionId));
    return d.exists() ? (d.data() as Mission) : null;
  }

  async upsertStudent(st: Student) {
    const { db, doc, setDoc } = await this.fs();
    await setDoc(doc(db, "students", st.id), st);
  }
  async getStudent(id: string) {
    const { db, doc, getDoc } = await this.fs();
    const d = await getDoc(doc(db, "students", id));
    return d.exists() ? (d.data() as Student) : null;
  }
  async findStudent(sessionId: string, studentNo: string, name: string) {
    const { db, collection, getDocs, query, where } = await this.fs();
    const snap = await getDocs(
      query(
        collection(db, "students"),
        where("sessionId", "==", sessionId),
        where("studentNo", "==", studentNo),
        where("name", "==", name)
      )
    );
    return snap.empty ? null : (snap.docs[0].data() as Student);
  }
  async updateStudent(id: string, patch: Partial<Student>) {
    const { db, doc, updateDoc } = await this.fs();
    await updateDoc(doc(db, "students", id), patch as Record<string, unknown>);
  }
  subscribeStudents(sessionId: string, cb: (rows: Student[]) => void) {
    let unsub = () => {};
    let cancelled = false;
    this.fs().then(({ db, collection, query, where, onSnapshot }) => {
      if (cancelled) return;
      const q = query(
        collection(db, "students"),
        where("sessionId", "==", sessionId)
      );
      // 시간 기반 상태(막힘/붕뜸)는 교사 페이지의 now 틱이 재계산한다.
      unsub = onSnapshot(q, (snap) => {
        cb(
          snap.docs
            .map((d) => d.data() as Student)
            .sort((a, b) => a.studentNo.localeCompare(b.studentNo))
        );
      });
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }

  async createAttempt(a: Attempt) {
    const { db, doc, setDoc } = await this.fs();
    await setDoc(doc(db, "attempts", a.id), a);
  }
  async getAttempt(id: string) {
    const { db, doc, getDoc } = await this.fs();
    const d = await getDoc(doc(db, "attempts", id));
    return d.exists() ? (d.data() as Attempt) : null;
  }
  async updateAttempt(id: string, patch: Partial<Attempt>) {
    const { db, doc, updateDoc } = await this.fs();
    await updateDoc(doc(db, "attempts", id), patch as Record<string, unknown>);
  }

  async latestAttempt(studentId: string) {
    const { db, collection, getDocs, query, where } = await this.fs();
    const snap = await getDocs(
      query(collection(db, "attempts"), where("studentId", "==", studentId))
    );
    const rows = snap.docs
      .map((d) => d.data() as Attempt)
      .sort((a, b) => b.startedAt - a.startedAt);
    return rows[0] ?? null;
  }
  async lastAiHint(studentId: string) {
    const { db, collection, getDocs, query, where } = await this.fs();
    const snap = await getDocs(
      query(
        collection(db, "messages"),
        where("studentId", "==", studentId),
        where("role", "==", "ai")
      )
    );
    const rows = snap.docs
      .map((d) => d.data() as Message)
      .sort((a, b) => b.createdAt - a.createdAt);
    return rows[0]?.text ?? null;
  }

  async addMessage(m: Message) {
    const { db, doc, setDoc } = await this.fs();
    await setDoc(doc(db, "messages", m.id), m);
  }
  async listMessages(attemptId: string) {
    const { db, collection, getDocs, query, where } = await this.fs();
    const snap = await getDocs(
      query(collection(db, "messages"), where("attemptId", "==", attemptId))
    );
    return snap.docs
      .map((d) => d.data() as Message)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async addWarning(w: Warning) {
    const { db, doc, setDoc } = await this.fs();
    await setDoc(doc(db, "warnings", w.id), w);
  }
  subscribeWarnings(sessionId: string, cb: (rows: Warning[]) => void) {
    let unsub = () => {};
    let cancelled = false;
    this.fs().then(
      async ({ db, collection, query, where, onSnapshot, getDocs }) => {
        if (cancelled) return;
        const sSnap = await getDocs(
          query(collection(db, "students"), where("sessionId", "==", sessionId))
        );
        const ids = new Set(sSnap.docs.map((d) => d.id));
        unsub = onSnapshot(collection(db, "warnings"), (snap) => {
          cb(
            snap.docs
              .map((d) => d.data() as Warning)
              .filter((w) => ids.has(w.studentId))
              .sort((a, b) => b.createdAt - a.createdAt)
          );
        });
      }
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }

  async clearAll(sessionId: string) {
    const { db, collection, getDocs, query, where, writeBatch } =
      await this.fs();
    const sSnap = await getDocs(
      query(collection(db, "students"), where("sessionId", "==", sessionId))
    );
    const ids = new Set(sSnap.docs.map((d) => d.id));
    const batch = writeBatch(db);
    sSnap.docs.forEach((d) => batch.delete(d.ref));
    for (const coll of ["attempts", "messages", "warnings"]) {
      const cs = await getDocs(collection(db, coll));
      cs.docs.forEach((d) => {
        const sid = (d.data() as { studentId?: string }).studentId;
        if (sid && ids.has(sid)) batch.delete(d.ref);
      });
    }
    await batch.commit();
  }
}

// ── 싱글턴 ────────────────────────────────────────────────
let _instance: DB | null = null;
export function db(): DB {
  if (_instance) return _instance;
  _instance = FIREBASE_ENABLED ? new FirestoreDB() : new LocalDB();
  return _instance;
}

// 상태 라벨 → 색상 (대시보드 공용)
export const STATE_STYLE: Record<
  StudentState,
  { bg: string; text: string; dot: string }
> = {
  혼자푸는중: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  막힘: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  AI검증중: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  "완성·도전중": {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  붕뜸: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
};

export function nextLevel(level: Level): Level | null {
  if (level === "하") return "중";
  if (level === "중") return "상";
  return null;
}
