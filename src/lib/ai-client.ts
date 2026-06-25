"use client";

import type { AiRequest } from "./gemini";

export async function askAi(
  req: AiRequest
): Promise<{ text: string; source: string }> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error("ai route error");
    return (await res.json()) as { text: string; source: string };
  } catch {
    return {
      text: "💡 잠깐 연결이 안 됐어. 네 생각에서 가장 중요한 키워드부터 다시 말해줄래?",
      source: "client-error",
    };
  }
}
