// ─────────────────────────────────────────────────────────────
// 안전·필터링 1차 규칙 엔진 (PRD §10)
// 욕설·개인정보(전화·주소·실명 패턴) 키워드 즉시 차단.
// ─────────────────────────────────────────────────────────────

import type { WarningType } from "./types";

// 의도적으로 일부만 — 운영하며 추가. 한글 욕설 + 변형 일부.
const PROFANITY = [
  "씨발",
  "시발",
  "ㅅㅂ",
  "병신",
  "ㅄ",
  "개새",
  "지랄",
  "좆",
  "꺼져",
  "엿먹",
  "닥쳐",
  "fuck",
  "shit",
  "bitch",
];

// 개인정보 패턴
const PHONE_RE = /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/;
const RRN_RE = /\d{6}[-\s]?\d{7}/; // 주민등록번호 형태
const ADDRESS_RE =
  /(시|군|구|동|읍|면|로|길)\s?\d+(번지|동|호)?/;

export interface FilterResult {
  blocked: boolean;
  type?: WarningType;
  reason?: string;
  /** 학생에게 보여줄 안내 문구 */
  notice?: string;
}

export function filterText(input: string): FilterResult {
  const text = (input || "").toLowerCase();
  const raw = input || "";

  for (const word of PROFANITY) {
    if (text.includes(word.toLowerCase())) {
      return {
        blocked: true,
        type: "욕설",
        reason: `욕설 표현 감지: "${word}"`,
        notice:
          "욕설·비속어는 입력할 수 없어요. 표현을 바꿔서 다시 시도해 주세요.",
      };
    }
  }

  if (PHONE_RE.test(raw) || RRN_RE.test(raw)) {
    return {
      blocked: true,
      type: "개인정보",
      reason: "전화번호/주민번호 형태 감지",
      notice:
        "전화번호·주민번호 같은 개인정보는 입력하지 않아요. 빼고 다시 써 주세요.",
    };
  }

  if (ADDRESS_RE.test(raw) && /\d/.test(raw)) {
    // 주소 형태 + 숫자 — 약한 신호라 동·로 + 번지 조합만
    if (/(\d+(번지|동|호))/.test(raw)) {
      return {
        blocked: true,
        type: "개인정보",
        reason: "주소 형태 감지",
        notice:
          "집 주소 같은 개인정보는 입력하지 않아요. 빼고 다시 써 주세요.",
      };
    }
  }

  return { blocked: false };
}
