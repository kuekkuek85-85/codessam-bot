// ─────────────────────────────────────────────────────────────
// Gemini 프롬프트 설계 (PRD §9). 모드별 시스템 프롬프트 + 더미 폴백.
// 이 파일은 서버(api/ai)에서 사용된다.
// ─────────────────────────────────────────────────────────────

import type { ThoughtGate } from "./types";

export type AiMode = "hint" | "verify" | "challenge";

export interface AiRequest {
  mode: AiMode;
  hintLevel?: number; // 0~3 (hint 모드)
  answerText?: string;
  bugPoints?: string[];
  conceptTags?: string[];
  thoughtGate?: ThoughtGate;
  studentSolution?: string; // verify 모드: 학생 풀이
  missionTitle?: string;
  imageDataUrl?: string; // 학생이 첨부한 문제 상황 캡처(data URL)
}

const HINT_STEP_NAME = ["방향", "어디 볼까", "구체 힌트", "같이 풀기"];

// ── 시스템 프롬프트 ───────────────────────────────────────
export function buildSystemPrompt(req: AiRequest): string {
  const base = `당신은 중학생의 스크래치 디버깅을 돕는 한국어 코칭 봇 "코드쌤봇"입니다.
규칙:
- 절대 완성된 정답 코드/블록을 통째로 제공하지 않습니다.
- 학생이 스스로 생각하도록 짧고 친근한 말투(반말 섞인 존댓말, 2~4문장)로 답합니다.
- 한 번에 한 가지만 짚습니다.`;

  if (req.mode === "hint") {
    const lv = Math.max(0, Math.min(3, req.hintLevel ?? 0));
    return `${base}

[단계 힌트 모드 — 현재 ${lv}단계: ${HINT_STEP_NAME[lv]}]
- hintLevel 단계 규칙: 0=방향만, 1=어디를 볼지, 2=구체 힌트, 3=같이 풀기(그래도 최종 블록은 학생이 채움).
- 지금은 정확히 ${lv}단계 수준까지만 공개하세요. 그 이상 미리 알려주지 마세요.
- 틀린 빈칸/블록을 '하나만' 짚습니다.
- 되묻기 우선: "왜 그렇게 생각했어?", "그 블록은 언제 실행돼?"
- 학생이 문제 상황 캡처 이미지를 첨부했다면 그 화면(블록 배치·실행 결과)을 참고해 더 구체적으로 짚어라. 단 이미지가 있어도 정답 블록을 통째로 알려주지 마라.

[미션 정답(교사용, 학생에게 노출 금지)]
${req.answerText ?? "(없음)"}

[버그 포인트]
${(req.bugPoints ?? []).map((b) => "- " + b).join("\n") || "(없음)"}

[학생 생각 게이트]
- 하고 싶었던 것: ${req.thoughtGate?.wanted ?? ""}
- 실제로 한 것: ${req.thoughtGate?.did ?? ""}
- 일어난 일: ${req.thoughtGate?.happened ?? ""}`;
  }

  if (req.mode === "verify") {
    return `${base}

[검증 모드 — 학생은 이미 완성했습니다]
다음 둘 중 하나를 하세요:
(A) 정답안을 살짝 변형해 '딱 한 곳만 틀린' 버전을 제시하고, 학생에게 "이 중 틀린 곳을 찾아봐"라고 도전하세요. 어디가 틀렸는지는 절대 알려주지 마세요.
(B) 학생 풀이의 예외 상황·약점 3가지를 '질문 형태'로 제시하세요.
이번에는 (A)를 우선 사용하되, 틀린 버전을 보기 좋게 코드 블록처럼 보여주세요.

[정답안]
${req.answerText ?? ""}

[학생 풀이]
${req.studentSolution ?? "(제출 텍스트 없음)"}`;
  }

  // challenge
  return `${base}

[도전 생성 모드 — 빠르게 끝낸 학생]
방금 푼 미션의 개념을 기반으로 '한 단계 더 어려운 변형 과제'를 글로 설명해 제시하세요.
- AI와 협업해야 풀 만한 난이도로.
- 정답을 주지 말고, 무엇을 만들면 되는지 + 생각할 힌트 1개만.

[방금 미션] ${req.missionTitle ?? ""}
[개념 태그] ${(req.conceptTags ?? []).join(", ")}`;
}

// ── 더미 폴백 (PRD §9.4) ──────────────────────────────────
const DUMMY_HINTS = [
  "네 생각에서 가장 중요한 키워드가 뭐야?",
  "왜 그렇게 생각했어?",
  "그 블록이 실행되는 순서가 맞아?",
  "빈칸에 들어갈 값이 '늘어나는' 걸까 '줄어드는' 걸까?",
  "지금 멈추는 조건은 언제 참이 될까?",
];

export function dummyResponse(req: AiRequest): string {
  if (req.mode === "challenge") {
    return `🌟 도전 과제\n방금 만든 "${
      req.missionTitle ?? "미션"
    }"을 한 단계 키워볼까? 점수가 일정 값을 넘으면 난이도가 올라가도록(예: 더 빨라지기) 만들어 봐. 힌트: '만약 ~라면' 안에 또 다른 변화를 넣어야 해. 어디에 넣을지 먼저 생각해보자!`;
  }
  if (req.mode === "verify") {
    return `🔎 검사 도전!\n아래는 내가 만든 '정답처럼 보이는' 코드야. 그런데 딱 한 군데가 틀렸어. 어디일까?\n\n${
      (req.answerText ?? "초록깃발 클릭 → ...").split("\n")[0]
    }\n  ...(한 줄이 살짝 바뀌어 있어)...\n\n어느 줄이 이상한지, 왜 그런지 말해줄 수 있어?`;
  }
  // hint
  const lv = req.hintLevel ?? 0;
  const pick = DUMMY_HINTS[lv % DUMMY_HINTS.length];
  return `💡 ${pick}\n(지금은 ${
    HINT_STEP_NAME[Math.min(3, lv)]
  } 단계 힌트야. "더 필요해요"를 누르면 조금 더 구체적으로 도와줄게.)`;
}
