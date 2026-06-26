// ─────────────────────────────────────────────────────────────
// 운영 정보 (PRD §11) — 학교·교사 교체가 쉽도록 변수로 분리.
// 배포 시 이 파일만 수정하면 푸터·처리방침 전체가 바뀝니다.
// ─────────────────────────────────────────────────────────────

import type { Level } from "./types";

export const SITE = {
  appName: "코드쌤봇 2.0",
  schoolName: "장평중학교",
  department: "정보과",
  managerName: "이승엽",
  managerTitle: "정보 교사",
  managerContact: "kuekkuek85@naver.com",
  year: 2026,
};

/** 막힘 판정 임계 시간(분) — PRD §14 열린질문 1. 난이도별 차등. */
export const STUCK_THRESHOLD_MIN: Record<string, number> = {
  하: 8,
  중: 10,
  상: 12,
};

/** 완성하고 노는("붕뜸") 판정: 완료 후 이 시간(분) 동안 추가 행동 없으면 붕뜸. */
export const IDLE_THRESHOLD_MIN = 3;

/** "하를 너무 빨리 완성" = 잘못 고름 경고 임계(분). PRD §6 트리아지. */
export const TOO_FAST_MIN = 3;

/** 데모 모드 교사/학생 접속 코드. 실서비스에선 세션별로 발급. */
export const DEMO_TEACHER_CODE = "1234";
export const DEMO_ACCESS_CODE = "demo";

/**
 * 이번에 열어 둘 난이도. 여기에 없는 난이도는 항상 잠금(🔒)이고
 * 완성해도 해금되지 않는다. (현재: 하만 데모 시연)
 * 전체를 다시 열려면 ["하","중","상"]으로 바꾸면 된다.
 */
export const ACTIVE_LEVELS: Level[] = ["하"];
