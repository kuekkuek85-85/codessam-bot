// ─────────────────────────────────────────────────────────────
// 학생 상태(state) 계산 (PRD §3.3, §6).
// 클릭/질문 타임스탬프 기반으로 '막힘/붕뜸'을 추론한다.
// ─────────────────────────────────────────────────────────────

import { STUCK_THRESHOLD_MIN, IDLE_THRESHOLD_MIN } from "./config";
import type { Student, StudentState } from "./types";

/** 저장된 state를 시간 경과로 보정해 '표시용' state를 만든다. */
export function effectiveState(s: Student, now: number): StudentState {
  const idleMin = (now - s.lastActiveAt) / 60000;

  // 이미 완료/검증/도전 상태면 그대로(붕뜸은 별도 판정)
  if (s.state === "완성·도전중") {
    if (idleMin >= IDLE_THRESHOLD_MIN) return "붕뜸";
    return "완성·도전중";
  }
  if (s.state === "AI검증중") return "AI검증중";
  if (s.state === "붕뜸") return "붕뜸";

  // 풀이 중인데 일정 시간 조용 → 막힘
  const threshold = STUCK_THRESHOLD_MIN[s.currentLevel] ?? 10;
  if (s.state === "혼자푸는중" && idleMin >= threshold) return "막힘";

  return s.state;
}

export function minutesSince(ts: number, now: number): number {
  return Math.max(0, Math.floor((now - ts) / 60000));
}
