// ─────────────────────────────────────────────────────────────
// 데이터 레이어 추상화.
// Firebase가 설정되어 있으면 Realtime Database 실시간, 아니면 localStorage 데모.
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
import { FIREBASE_ENABLED, getRtdb } from "./firebase";

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

  /**
   * 캡처 이미지는 attempt 본문과 분리된 경로에 저장한다.
   * 교사 대시보드가 attempt 메타를 자주 다시 읽어도 무거운 이미지
   * 바이트를 재다운로드하지 않도록(무료 한도 보호) 하기 위함.
   */
  setAttemptImage(attemptId: string, dataUrl: string): Promise<void>;
  getAttemptImage(attemptId: string): Promise<string | null>;

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
  images: Record<string, string>; // attemptId -> data URL
}

function emptyStore(): Store {
  return {
    missions: [],
    students: [],
    attempts: [],
    messages: [],
    warnings: [],
    images: {},
  };
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

  async setAttemptImage(attemptId: string, dataUrl: string) {
    const s = this.read();
    if (dataUrl) s.images[attemptId] = dataUrl;
    else delete s.images[attemptId];
    this.write(s);
  }
  async getAttemptImage(attemptId: string) {
    return this.read().images[attemptId] ?? null;
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
    const removedAttempts = s.attempts
      .filter((a) => removedIds.has(a.studentId))
      .map((a) => a.id);
    s.students = keepStudents;
    s.attempts = s.attempts.filter((a) => !removedIds.has(a.studentId));
    s.messages = s.messages.filter((m) => !removedIds.has(m.studentId));
    s.warnings = s.warnings.filter((w) => !removedIds.has(w.studentId));
    for (const aid of removedAttempts) delete s.images[aid];
    this.write(s);
  }
}

// ════════════════════════════════════════════════════════════
// Realtime Database 구현 (실서비스 모드).
// 컬렉션 규모가 작아(한 차시 30명), 노드 전체를 읽어 JS에서 필터링한다.
// → .indexOn 보안규칙 없이도 동작하고 실시간(onValue) 구독을 단순화.
// ════════════════════════════════════════════════════════════

class RealtimeDB implements DB {
  demo = false;

  private async rt() {
    const db = getRtdb();
    if (!db) throw new Error("Realtime Database not initialized");
    const mod = await import("firebase/database");
    return { db, ...mod };
  }

  /** 노드 전체를 객체맵으로 읽어 배열로 변환 */
  private async readColl<T>(path: string): Promise<T[]> {
    const { db, ref, get } = await this.rt();
    const snap = await get(ref(db, path));
    const val = snap.val() as Record<string, T> | null;
    return val ? Object.values(val) : [];
  }

  async ensureSeed() {
    const missions = await this.readColl<Mission>("missions");
    const has = missions.some((m) => m.sessionId === DEMO_SESSION_ID);
    if (!has) {
      const { db, ref, update } = await this.rt();
      const updates: Record<string, Mission> = {};
      for (const m of SEED_MISSIONS) updates[`missions/${m.id}`] = m;
      await update(ref(db), updates);
    }
  }

  async listMissions(sessionId: string) {
    const all = await this.readColl<Mission>("missions");
    return all.filter((m) => m.sessionId === sessionId);
  }
  async getMission(missionId: string) {
    const { db, ref, get } = await this.rt();
    const snap = await get(ref(db, `missions/${missionId}`));
    return snap.exists() ? (snap.val() as Mission) : null;
  }

  async upsertStudent(st: Student) {
    const { db, ref, set } = await this.rt();
    await set(ref(db, `students/${st.id}`), st);
  }
  async getStudent(id: string) {
    const { db, ref, get } = await this.rt();
    const snap = await get(ref(db, `students/${id}`));
    return snap.exists() ? (snap.val() as Student) : null;
  }
  async findStudent(sessionId: string, studentNo: string, name: string) {
    const all = await this.readColl<Student>("students");
    return (
      all.find(
        (x) =>
          x.sessionId === sessionId &&
          x.studentNo === studentNo &&
          x.name === name
      ) ?? null
    );
  }
  async updateStudent(id: string, patch: Partial<Student>) {
    const { db, ref, update } = await this.rt();
    await update(ref(db, `students/${id}`), patch as Record<string, unknown>);
  }
  subscribeStudents(sessionId: string, cb: (rows: Student[]) => void) {
    let off = () => {};
    let cancelled = false;
    this.rt().then(({ db, ref, onValue }) => {
      if (cancelled) return;
      // 시간 기반 상태(막힘/붕뜸)는 교사 페이지의 now 틱이 재계산한다.
      off = onValue(ref(db, "students"), (snap) => {
        const val = snap.val() as Record<string, Student> | null;
        const rows = val ? Object.values(val) : [];
        cb(
          rows
            .filter((x) => x.sessionId === sessionId)
            .sort((a, b) => a.studentNo.localeCompare(b.studentNo))
        );
      });
    });
    return () => {
      cancelled = true;
      off();
    };
  }

  async createAttempt(a: Attempt) {
    const { db, ref, set } = await this.rt();
    await set(ref(db, `attempts/${a.id}`), a);
  }
  async getAttempt(id: string) {
    const { db, ref, get } = await this.rt();
    const snap = await get(ref(db, `attempts/${id}`));
    return snap.exists() ? (snap.val() as Attempt) : null;
  }
  async updateAttempt(id: string, patch: Partial<Attempt>) {
    const { db, ref, update } = await this.rt();
    await update(ref(db, `attempts/${id}`), patch as Record<string, unknown>);
  }

  async latestAttempt(studentId: string) {
    const all = await this.readColl<Attempt>("attempts");
    const rows = all
      .filter((a) => a.studentId === studentId)
      .sort((a, b) => b.startedAt - a.startedAt);
    return rows[0] ?? null;
  }
  async lastAiHint(studentId: string) {
    const all = await this.readColl<Message>("messages");
    const rows = all
      .filter((m) => m.studentId === studentId && m.role === "ai")
      .sort((a, b) => b.createdAt - a.createdAt);
    return rows[0]?.text ?? null;
  }

  async setAttemptImage(attemptId: string, dataUrl: string) {
    const { db, ref, set, remove } = await this.rt();
    // 무거운 이미지는 attempt와 분리된 경로에 저장(대시보드 재다운로드 방지).
    if (dataUrl) await set(ref(db, `attemptImages/${attemptId}`), dataUrl);
    else await remove(ref(db, `attemptImages/${attemptId}`));
  }
  async getAttemptImage(attemptId: string) {
    const { db, ref, get } = await this.rt();
    const snap = await get(ref(db, `attemptImages/${attemptId}`));
    return snap.exists() ? (snap.val() as string) : null;
  }

  async addMessage(m: Message) {
    const { db, ref, set } = await this.rt();
    await set(ref(db, `messages/${m.id}`), m);
  }
  async listMessages(attemptId: string) {
    const all = await this.readColl<Message>("messages");
    return all
      .filter((x) => x.attemptId === attemptId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async addWarning(w: Warning) {
    const { db, ref, set } = await this.rt();
    await set(ref(db, `warnings/${w.id}`), w);
  }
  subscribeWarnings(sessionId: string, cb: (rows: Warning[]) => void) {
    let offS = () => {};
    let offW = () => {};
    let cancelled = false;
    let students: Student[] = [];
    let warnings: Warning[] = [];
    const recompute = () => {
      const ids = new Set(
        students.filter((s) => s.sessionId === sessionId).map((s) => s.id)
      );
      cb(
        warnings
          .filter((w) => ids.has(w.studentId))
          .sort((a, b) => b.createdAt - a.createdAt)
      );
    };
    this.rt().then(({ db, ref, onValue }) => {
      if (cancelled) return;
      offS = onValue(ref(db, "students"), (snap) => {
        const v = snap.val() as Record<string, Student> | null;
        students = v ? Object.values(v) : [];
        recompute();
      });
      offW = onValue(ref(db, "warnings"), (snap) => {
        const v = snap.val() as Record<string, Warning> | null;
        warnings = v ? Object.values(v) : [];
        recompute();
      });
    });
    return () => {
      cancelled = true;
      offS();
      offW();
    };
  }

  async clearAll(sessionId: string) {
    const { db, ref, update } = await this.rt();
    const students = await this.readColl<Student>("students");
    const ids = new Set(
      students.filter((s) => s.sessionId === sessionId).map((s) => s.id)
    );
    const updates: Record<string, null> = {};
    for (const s of students) {
      if (s.sessionId === sessionId) updates[`students/${s.id}`] = null;
    }
    const removedAttemptIds: string[] = [];
    for (const coll of ["attempts", "messages", "warnings"] as const) {
      const rows = await this.readColl<{ id: string; studentId?: string }>(
        coll
      );
      for (const row of rows) {
        if (row.studentId && ids.has(row.studentId)) {
          updates[`${coll}/${row.id}`] = null;
          if (coll === "attempts") removedAttemptIds.push(row.id);
        }
      }
    }
    // 분리 저장된 캡처 이미지도 함께 삭제
    for (const aid of removedAttemptIds) updates[`attemptImages/${aid}`] = null;
    await update(ref(db), updates);
  }
}

// ── 싱글턴 ────────────────────────────────────────────────
let _instance: DB | null = null;
export function db(): DB {
  if (_instance) return _instance;
  _instance = FIREBASE_ENABLED ? new RealtimeDB() : new LocalDB();
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
