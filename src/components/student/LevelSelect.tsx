"use client";

import { useState } from "react";
import type { Level, Student } from "@/lib/types";
import { LEVELS } from "@/lib/types";

// 화면 1. 난이도 자기선택 (자기선택 + 완성 시 해금) — PRD §5
const META: Record<Level, { emoji: string; desc: string; tone: string }> = {
  하: { emoji: "🌱", desc: "기본 블록 한 칸 채우기", tone: "ring-emerald-200" },
  중: { emoji: "🔥", desc: "반복·조건이 얽힌 버그 찾기", tone: "ring-amber-200" },
  상: { emoji: "🚀", desc: "변수·좌표·리스트 복합 디버깅", tone: "ring-rose-200" },
};

const SELF_CHECK = [
  "변수를 직접 만들어봤다",
  "반복문을 써봤다",
  "디버깅(오류 고치기)을 해봤다",
];

export default function LevelSelect({
  student,
  onChoose,
  onBackToFinalIfDone,
}: {
  student: Student;
  onChoose: (level: Level) => void;
  onBackToFinalIfDone?: () => void;
}) {
  const [selfCheck, setSelfCheck] = useState<boolean[]>(
    SELF_CHECK.map(() => false)
  );
  const [showCheck, setShowCheck] = useState(false);

  const score = selfCheck.filter(Boolean).length;
  const recommended: Level = score <= 1 ? "하" : score === 2 ? "중" : "상";

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-slate-900">난이도 고르기 🎯</h1>
        <p className="mt-2 text-slate-600">
          시험으로 줄 세우지 않아요. <b>직접 고르고</b>, 완성하면 다음 난이도가
          열려요. 잘 모르겠으면 아래 자가체크를 해봐도 좋아요.
        </p>

        <button
          className="mt-4 text-sm font-semibold text-brand-600 hover:underline"
          onClick={() => setShowCheck((v) => !v)}
        >
          {showCheck ? "자가체크 접기" : "1분 자가체크 (선택)"}
        </button>

        {showCheck && (
          <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-4">
            {SELF_CHECK.map((q, i) => (
              <label key={i} className="flex items-center gap-3 text-slate-700">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-brand-500"
                  checked={selfCheck[i]}
                  onChange={(e) => {
                    const next = [...selfCheck];
                    next[i] = e.target.checked;
                    setSelfCheck(next);
                  }}
                />
                {q}
              </label>
            ))}
            <p className="pt-1 text-sm text-brand-700">
              추천 시작 난이도: <b>{recommended}</b> (참고만 하세요, 강제 아님)
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {LEVELS.map((lv) => {
          const unlocked = student.unlockedLevels.includes(lv);
          const m = META[lv];
          return (
            <button
              key={lv}
              disabled={!unlocked}
              onClick={() => onChoose(lv)}
              className={`card text-left transition ${
                unlocked
                  ? `ring-2 ${m.tone} hover:-translate-y-0.5 hover:shadow-md`
                  : "cursor-not-allowed opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{m.emoji}</span>
                {!unlocked && <span title="잠김">🔒</span>}
                {recommended === lv && unlocked && (
                  <span className="pill bg-brand-100 text-brand-700">추천</span>
                )}
              </div>
              <h3 className="mt-3 text-xl font-bold text-slate-900">{lv}</h3>
              <p className="mt-1 text-sm text-slate-600">{m.desc}</p>
              {!unlocked && (
                <p className="mt-2 text-xs text-slate-400">
                  아래 난이도를 완성하면 열려요
                </p>
              )}
            </button>
          );
        })}
      </div>

      {onBackToFinalIfDone && (
        <button className="btn-ghost w-full" onClick={onBackToFinalIfDone}>
          ← 방금 완성한 미션의 검증·도전으로 돌아가기
        </button>
      )}
    </div>
  );
}
