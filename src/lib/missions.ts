// ─────────────────────────────────────────────────────────────
// 시드 미션 데이터 (PRD §7) — 데모 모드 기본 미션.
// 실제 운영 시 .sb3 파싱 스크립트(scripts/parse-sb3.mjs)가
// 이 형태의 Firestore 미션 문서를 자동 생성합니다.
// ─────────────────────────────────────────────────────────────

import type { Mission } from "./types";

export const DEMO_SESSION_ID = "demo-session";

export const SEED_MISSIONS: Mission[] = [
  // ── 하 ──────────────────────────────────────────────
  {
    id: "m-low-1",
    sessionId: DEMO_SESSION_ID,
    level: "하",
    set: "1차시",
    title: "고양이를 10번 야옹하게 하기",
    skeletonText: [
      "초록깃발 클릭 했을 때",
      "  [   ] 번 반복하기",
      "    야옹 소리 재생하기",
      "    1 초 기다리기",
    ].join("\n"),
    answerText: [
      "초록깃발 클릭 했을 때",
      "  10 번 반복하기",
      "    야옹 소리 재생하기",
      "    1 초 기다리기",
    ].join("\n"),
    bugPoints: ["반복 횟수 빈칸 미설정 — '10번' 들어가야 함"],
    conceptTags: ["반복문", "정해진 횟수 반복"],
    sb3Url: "https://scratch.mit.edu/projects/editor/",
    goalDescription: "초록깃발을 누르면 고양이가 1초 간격으로 정확히 10번 야옹한다.",
  },
  {
    id: "m-low-2",
    sessionId: DEMO_SESSION_ID,
    level: "하",
    set: "3차시",
    title: "점수 변수 0에서 시작하기",
    skeletonText: [
      "초록깃발 클릭 했을 때",
      "  점수 를 [   ] 로 정하기",
      "스페이스 키를 눌렀을 때",
      "  점수 를 1 만큼 바꾸기",
    ].join("\n"),
    answerText: [
      "초록깃발 클릭 했을 때",
      "  점수 를 0 로 정하기",
      "스페이스 키를 눌렀을 때",
      "  점수 를 1 만큼 바꾸기",
    ].join("\n"),
    bugPoints: ["변수 초기값 미설정 — 게임 시작 시 0으로 정해야 점수가 누적되지 않음"],
    conceptTags: ["변수", "초기화"],
    sb3Url: "https://scratch.mit.edu/projects/editor/",
    goalDescription: "초록깃발을 누르면 점수가 0이 되고, 스페이스를 누를 때마다 1씩 오른다.",
  },

  // ── 중 ──────────────────────────────────────────────
  {
    id: "m-mid-1",
    sessionId: DEMO_SESSION_ID,
    level: "중",
    set: "1차시",
    title: "타이머 카운트다운 (10 → 0)",
    skeletonText: [
      "초록깃발 클릭 했을 때",
      "  타이머 를 10 로 정하기",
      "  타이머 > 0 까지 반복하기",
      "    타이머 를 [   ] 만큼 바꾸기",
      "    1 초 기다리기",
      "  '끝!' 말하기",
    ].join("\n"),
    answerText: [
      "초록깃발 클릭 했을 때",
      "  타이머 를 10 로 정하기",
      "  타이머 > 0 까지 반복하기",
      "    타이머 를 -1 만큼 바꾸기",
      "    1 초 기다리기",
      "  '끝!' 말하기",
    ].join("\n"),
    bugPoints: [
      "반복문 내 -1 감소 누락 — '1 만큼 바꾸기'면 타이머가 늘어 무한반복",
    ],
    conceptTags: ["변수", "조건 반복", "감소 연산"],
    sb3Url: "https://scratch.mit.edu/projects/editor/",
    goalDescription: "타이머가 10에서 1초마다 1씩 줄어 0이 되면 '끝!'이라고 말한다.",
  },
  {
    id: "m-mid-2",
    sessionId: DEMO_SESSION_ID,
    level: "중",
    set: "3차시",
    title: "벽에 닿으면 튕기기",
    skeletonText: [
      "초록깃발 클릭 했을 때",
      "  무한 반복하기",
      "    10 만큼 움직이기",
      "    만약 [   ] 에 닿았다면",
      "      방향을 180 도 바꾸기",
    ].join("\n"),
    answerText: [
      "초록깃발 클릭 했을 때",
      "  무한 반복하기",
      "    10 만큼 움직이기",
      "    만약 벽 에 닿았다면",
      "      방향을 180 도 바꾸기",
    ].join("\n"),
    bugPoints: ["조건 빈칸 — '벽'에 닿았는지 검사해야 화면 밖으로 안 나감"],
    conceptTags: ["조건문", "감지", "무한 반복"],
    sb3Url: "https://scratch.mit.edu/projects/editor/",
    goalDescription: "스프라이트가 계속 움직이다가 벽에 닿으면 반대로 튕긴다.",
  },

  // ── 상 ──────────────────────────────────────────────
  {
    id: "m-high-1",
    sessionId: DEMO_SESSION_ID,
    level: "상",
    set: "1차시",
    title: "사과 받기 게임 — 점수와 충돌",
    skeletonText: [
      "초록깃발 클릭 했을 때",
      "  점수 를 0 로 정하기",
      "  무한 반복하기",
      "    만약 바구니 에 닿았다면",
      "      점수 를 1 만큼 바꾸기",
      "      y 를 180 로 정하기   // 사과 위로 리셋",
      "    [   ] 만큼 y 바꾸기   // 사과 떨어지기",
    ].join("\n"),
    answerText: [
      "초록깃발 클릭 했을 때",
      "  점수 를 0 로 정하기",
      "  무한 반복하기",
      "    만약 바구니 에 닿았다면",
      "      점수 를 1 만큼 바꾸기",
      "      y 를 180 로 정하기",
      "    -5 만큼 y 바꾸기",
    ].join("\n"),
    bugPoints: [
      "낙하 빈칸 — 음수(-5) 들어가야 아래로 떨어짐. 양수면 위로 올라감",
      "충돌 직후 y 리셋이 조건 안에 있어야 함(들여쓰기 함정)",
    ],
    conceptTags: ["변수", "조건문", "좌표", "충돌 판정"],
    sb3Url: "https://scratch.mit.edu/projects/editor/",
    goalDescription:
      "사과가 위에서 떨어지고, 바구니에 닿으면 점수가 1 오르며 사과가 다시 위로 간다.",
  },
  {
    id: "m-high-2",
    sessionId: DEMO_SESSION_ID,
    level: "상",
    set: "3차시",
    title: "리스트로 퀴즈 채점하기",
    skeletonText: [
      "초록깃발 클릭 했을 때",
      "  맞은개수 를 0 로 정하기",
      "  i 를 1 로 정하기",
      "  문제리스트 의 길이 번 반복하기",
      "    (문제리스트 의 i 번째) 묻고 기다리기",
      "    만약 대답 = (정답리스트 의 [   ] 번째) 라면",
      "      맞은개수 를 1 만큼 바꾸기",
      "    i 를 1 만큼 바꾸기",
    ].join("\n"),
    answerText: [
      "초록깃발 클릭 했을 때",
      "  맞은개수 를 0 로 정하기",
      "  i 를 1 로 정하기",
      "  문제리스트 의 길이 번 반복하기",
      "    (문제리스트 의 i 번째) 묻고 기다리기",
      "    만약 대답 = (정답리스트 의 i 번째) 라면",
      "      맞은개수 를 1 만큼 바꾸기",
      "    i 를 1 만큼 바꾸기",
    ].join("\n"),
    bugPoints: [
      "정답 인덱스 빈칸 — 고정값이 아니라 변수 i를 써야 문제와 정답이 짝맞음",
    ],
    conceptTags: ["리스트", "인덱스 변수", "반복", "조건문"],
    sb3Url: "https://scratch.mit.edu/projects/editor/",
    goalDescription:
      "문제리스트의 문제를 차례로 묻고, 정답리스트의 같은 번째 답과 비교해 맞은 개수를 센다.",
  },
];
