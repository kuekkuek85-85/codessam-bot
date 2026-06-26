"use client";

import { useEffect, useRef, useState } from "react";
import { askAi } from "@/lib/ai-client";
import { db, uid } from "@/lib/db";
import type { Attempt, Mission, Student } from "@/lib/types";

// 화면 3. AI 도움 (단계 힌트) — PRD §5, §9.1
const STEP_LABEL = ["방향", "어디 볼까", "구체 힌트", "같이 풀기"];

interface Bubble {
  level: number;
  text: string;
  source: string;
}

export default function AiHelp({
  student,
  mission,
  attempt,
  onHintLevel,
  onNext,
}: {
  student: Student;
  mission: Mission;
  attempt: Attempt;
  onHintLevel: (n: number) => void;
  onNext: () => void;
}) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [level, setLevel] = useState(attempt.hintLevel ?? 0);
  const [loading, setLoading] = useState(false);
  const fetchedOnce = useRef(false);

  async function fetchHint(lv: number) {
    setLoading(true);
    const { text, source } = await askAi({
      mode: "hint",
      hintLevel: lv,
      answerText: mission.answerText,
      bugPoints: mission.bugPoints,
      thoughtGate: attempt.thoughtGate,
      imageDataUrl: attempt.imageUrl || undefined,
    });
    setBubbles((b) => [...b, { level: lv, text, source }]);
    // 로그 기록 (PRD §8 messages)
    await db().addMessage({
      id: uid("msg"),
      attemptId: attempt.id,
      studentId: student.id,
      role: "ai",
      text,
      createdAt: Date.now(),
    });
    onHintLevel(lv);
    setLoading(false);
  }

  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;
    fetchHint(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function more() {
    const lv = Math.min(3, level + 1);
    setLevel(lv);
    fetchHint(lv);
  }

  return (
    <div className="space-y-5">
      {/* 생각 게이트 맥락 상시 표시 (PRD §5 화면3) */}
      <div className="context-box">
        <div className="mb-1 font-semibold text-slate-500">🚪 내가 쓴 생각</div>
        <p>• 하고 싶었던 것: {attempt.thoughtGate.wanted}</p>
        <p>• 실제로 한 것: {attempt.thoughtGate.did}</p>
        <p>• 일어난 일: {attempt.thoughtGate.happened}</p>
        {attempt.imageUrl && (
          <div className="mt-2">
            <span className="font-semibold text-slate-500">• 첨부 캡처:</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attempt.imageUrl}
              alt="첨부 캡처"
              className="mt-1 max-h-40 rounded-lg ring-1 ring-slate-200"
            />
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">🤖 코드쌤봇 힌트</h1>
          <span className="pill bg-violet-100 text-violet-700">
            {STEP_LABEL[level]} 단계 ({level}/3)
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {bubbles.map((b, i) => (
            <div
              key={i}
              className="rounded-2xl rounded-tl-sm bg-violet-50 p-4 text-slate-800"
            >
              <div className="mb-1 text-xs font-semibold text-violet-500">
                {STEP_LABEL[b.level]} 단계
                {b.source !== "gemini" && " · 더미"}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{b.text}</p>
            </div>
          ))}
          {loading && (
            <div className="rounded-2xl bg-violet-50 p-4 text-slate-400">
              생각 중…
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            className="btn-ghost flex-1"
            disabled={loading || level >= 3}
            onClick={more}
          >
            {level >= 3 ? "마지막 단계예요" : "🔎 더 필요해요 (한 칸 더)"}
          </button>
          <button className="btn-primary flex-1" onClick={onNext}>
            ✏️ 검토하기
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">
          AI는 완성본을 주지 않아요. 방향 → 어디 볼까 → 구체 힌트 → 같이 풀기
          순서로 한 칸씩만 도와줍니다.
        </p>
      </div>
    </div>
  );
}
