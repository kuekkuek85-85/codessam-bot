"use client";

import { useState } from "react";
import GuardedTextarea from "./GuardedTextarea";
import { askAi } from "@/lib/ai-client";
import { db, uid, nextLevel } from "@/lib/db";
import { ACTIVE_LEVELS } from "@/lib/config";
import type { Attempt, AttemptMode, Mission, Student } from "@/lib/types";

// 화면 5. 최종본 / 분기 (AI 역할 사다리) — PRD §5, §3.1
export default function FinalBranch({
  student,
  mission,
  attempt,
  onSubmitFinal,
  onSetMode,
  onRestart,
}: {
  student: Student;
  mission: Mission;
  attempt: Attempt;
  onSubmitFinal: (finalDraft: string) => void;
  onSetMode: (mode: AttemptMode) => void;
  onRestart: () => void;
}) {
  const [draft, setDraft] = useState(attempt.finalDraft);
  const [submitted, setSubmitted] = useState(!!attempt.completedAt);
  const [branch, setBranch] = useState<null | "verify" | "challenge">(null);
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);

  const next = nextLevel(mission.level);
  const unlocked = next && ACTIVE_LEVELS.includes(next) ? next : null;

  function submit() {
    onSubmitFinal(draft);
    setSubmitted(true);
  }

  async function openBranch(mode: "verify" | "challenge") {
    setBranch(mode);
    onSetMode(mode);
    setLoading(true);
    const { text } = await askAi({
      mode,
      answerText: mission.answerText,
      conceptTags: mission.conceptTags,
      studentSolution: draft,
      missionTitle: mission.title,
    });
    setAiText(text);
    await db().addMessage({
      id: uid("msg"),
      attemptId: attempt.id,
      studentId: student.id,
      role: "ai",
      text,
      createdAt: Date.now(),
    });
    setLoading(false);
  }

  // ── 5a. 최종본 제출 ─────────────────────────────────────
  if (!submitted) {
    return (
      <div className="card">
        <h1 className="text-xl font-bold text-slate-900">🏁 최종본 제출</h1>
        <p className="mt-1 text-sm text-slate-500">
          스크래치에서 직접 고친 <b>최종 결과</b>를 글로 정리해 제출하세요. 빈칸이면
          제출할 수 없어요.
        </p>
        <div className="mt-4">
          <GuardedTextarea
            value={draft}
            onChange={setDraft}
            studentId={student.id}
            studentName={student.name}
            studentNo={student.studentNo}
            rows={5}
            placeholder="예: 반복 안의 '타이머를 1만큼 바꾸기'를 '-1만큼 바꾸기'로 고쳤더니 10→0으로 줄어들고 '끝!'이라고 말했다."
          />
        </div>
        <button
          className="btn-primary mt-5 w-full"
          disabled={draft.trim() === ""}
          onClick={submit}
        >
          제출하고 완성하기
        </button>
      </div>
    );
  }

  // ── 제출 후: 해금 + 사다리 분기 ───────────────────────────
  return (
    <div className="space-y-5">
      <div className="card bg-emerald-50 ring-emerald-100">
        <h1 className="text-xl font-bold text-emerald-800">🎉 완성했어요!</h1>
        {unlocked ? (
          <p className="mt-1 text-emerald-700">
            <b>{unlocked}</b> 난이도가 해금됐어요. 더 풀어볼 수 있어요.
          </p>
        ) : (
          <p className="mt-1 text-emerald-700">
            최고 난이도까지 완성! 이제 AI를 검사하거나 도전 과제에 도전해봐요.
          </p>
        )}
      </div>

      {!branch && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            className="card text-left ring-2 ring-violet-200 transition hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => openBranch("verify")}
          >
            <div className="text-3xl">🕵️</div>
            <h3 className="mt-2 text-lg font-bold text-slate-900">
              AI 검사하기 (검증 모드)
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              봇이 <b>일부러 틀린</b> 답을 줘요. 틀린 곳을 잡아내면 너의 승리!
            </p>
          </button>
          <button
            className="card text-left ring-2 ring-rose-200 transition hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => openBranch("challenge")}
          >
            <div className="text-3xl">🚀</div>
            <h3 className="mt-2 text-lg font-bold text-slate-900">
              도전 과제 (빠른 친구용)
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              방금 미션을 키운 <b>더 어려운 변형</b>을 AI와 함께 풀어요.
            </p>
          </button>
        </div>
      )}

      {branch && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {branch === "verify" ? "🕵️ AI 검사 도전" : "🚀 도전 과제"}
            </h2>
            <button
              className="text-sm text-slate-400 hover:text-slate-600"
              onClick={() => {
                setBranch(null);
                setAiText("");
              }}
            >
              ← 다른 모드
            </button>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-slate-100">
            {loading ? (
              <p className="text-slate-400">생각 중…</p>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{aiText}</p>
            )}
          </div>
          {branch === "verify" && !loading && (
            <VerifyAnswer
              student={student}
              attemptId={attempt.id}
            />
          )}
        </div>
      )}

      <button className="btn-ghost w-full" onClick={onRestart}>
        🔁 다른 난이도 미션 풀러 가기
      </button>
    </div>
  );
}

// 검증 모드에서 학생이 "틀린 곳"을 적어 제출하는 미니 폼
function VerifyAnswer({
  student,
  attemptId,
}: {
  student: Student;
  attemptId: string;
}) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    await db().addMessage({
      id: uid("msg"),
      attemptId,
      studentId: student.id,
      role: "user",
      text,
      createdAt: Date.now(),
    });
    setDone(true);
  }

  if (done) {
    return (
      <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-700">
        ✓ 제출했어요! 선생님이 너의 검사 결과를 볼 수 있어요. AI도 틀릴 수
        있다는 걸 기억해요.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <label className="label">어디가 틀렸을까? 왜 그렇게 생각해?</label>
      <GuardedTextarea
        value={text}
        onChange={setText}
        studentId={student.id}
        studentName={student.name}
        studentNo={student.studentNo}
        placeholder="예: 3번째 줄의 값이 음수가 아니라 양수라서 위로 올라갈 것 같아"
      />
      <button
        className="btn-primary mt-3 w-full"
        disabled={text.trim() === ""}
        onClick={submit}
      >
        검사 결과 제출
      </button>
    </div>
  );
}
