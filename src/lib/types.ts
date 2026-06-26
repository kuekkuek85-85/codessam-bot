// ─────────────────────────────────────────────────────────────
// 코드쌤봇 2.0 — 도메인 타입 (PRD §8 Firestore 데이터 모델)
// ─────────────────────────────────────────────────────────────

export type Level = "하" | "중" | "상";
export const LEVELS: Level[] = ["하", "중", "상"];

/** 학생 상태 (PRD §6 대시보드 state) */
export type StudentState =
  | "혼자푸는중"
  | "막힘"
  | "AI검증중"
  | "완성·도전중"
  | "붕뜸";

/** 시도 모드 (AI 역할 사다리 — PRD §3.1) */
export type AttemptMode = "solve" | "verify" | "challenge";

export type WarningType = "욕설" | "개인정보" | "주제이탈";

export interface Session {
  id: string;
  title: string;
  accessCode: string; // 학생 접속 코드
  teacherCode: string; // 교사 해제 코드
  createdAt: number;
  status: "active" | "closed";
}

export interface Mission {
  id: string;
  sessionId: string;
  level: Level;
  set: string; // "1차시" / "3차시"
  title: string;
  skeletonText: string; // 스켈레톤 블록(텍스트)
  answerText: string; // 정답 블록(텍스트)
  bugPoints: string[]; // 버그 위치·핵심 개념
  conceptTags: string[];
  sb3Url: string; // 학생용 .sb3 (새 탭으로 여는 대상)
  goalDescription: string;
  videoUrl?: string;
  debugVideoUrl?: string; // 초기 상태(버그) 시연 영상
  targetVideoUrl?: string; // 목표 상태 시연 영상
}

export interface Student {
  id: string;
  sessionId: string;
  studentNo: string;
  name: string;
  createdAt: number;
  currentMissionId: string | null;
  currentLevel: Level;
  unlockedLevels: Level[];
  state: StudentState;
  lastActiveAt: number;
}

export interface ThoughtGate {
  wanted: string; // 뭘 하고 싶었어?
  did: string; // 실제로 뭘 했어?
  happened: string; // 뭐가 일어났어?
}

export interface Attempt {
  id: string;
  studentId: string;
  missionId: string;
  thoughtGate: ThoughtGate;
  hintLevel: number; // 0~3
  reviewGood: string;
  reviewFix: string;
  finalDraft: string;
  imageUrl?: string;
  startedAt: number;
  completedAt: number | null;
  mode: AttemptMode;
}

export interface Message {
  id: string;
  attemptId: string;
  studentId: string;
  role: "user" | "ai";
  text: string;
  createdAt: number;
}

export interface Warning {
  id: string;
  studentId: string;
  studentName?: string;
  studentNo?: string;
  type: WarningType;
  text: string;
  createdAt: number;
}
