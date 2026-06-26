// ─────────────────────────────────────────────────────────────
// AI 프록시 라우트 (서버). Gemini 호출 + 더미 폴백(PRD §9.4).
// GEMINI_API_KEY가 없으면 항상 더미 질문형 응답을 반환.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import {
  buildSystemPrompt,
  dummyResponse,
  type AiRequest,
} from "@/lib/gemini";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function POST(req: Request) {
  let body: AiRequest;
  try {
    body = (await req.json()) as AiRequest;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // 폴백: 키 없음 → 더미
  if (!apiKey) {
    return NextResponse.json({ text: dummyResponse(body), source: "dummy" });
  }

  try {
    const system = buildSystemPrompt(body);
    const userTurn =
      body.mode === "hint"
        ? "위 학생 상황에 맞는 단계 힌트를 줘."
        : body.mode === "verify"
        ? "검증 도전을 제시해줘."
        : "도전 과제를 만들어줘.";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userTurn }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          // Gemini 2.5는 thinking 모델 — 빠른 응답·짧은 힌트를 위해 thinking 끔.
          // (2.5가 아닌 모델은 이 필드를 무시함)
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({
        text: dummyResponse(body),
        source: "dummy-fallback",
      });
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      dummyResponse(body);

    return NextResponse.json({ text, source: "gemini" });
  } catch {
    return NextResponse.json({
      text: dummyResponse(body),
      source: "dummy-error",
    });
  }
}
