"use client";

import { useState } from "react";
import GuardedTextarea from "./GuardedTextarea";
import type { Attempt, Mission, Student, ThoughtGate } from "@/lib/types";

// 화면 2. 미션 + 생각 게이트 (★ HITL 핵심) — PRD §5
export default function MissionThoughtGate({
  student,
  mission,
  attempt,
  onStart,
  onSave,
  onSubmit,
}: {
  student: Student;
  mission: Mission;
  attempt: Attempt | null;
  onStart: () => void;
  onSave: (tg: ThoughtGate) => void;
  onSubmit: (tg: ThoughtGate) => void;
}) {
  const [started, setStarted] = useState<boolean>(!!attempt);
  const [tg, setTg] = useState<ThoughtGate>(
    attempt?.thoughtGate ?? { wanted: "", did: "", happened: "" }
  );

  const filled =
    tg.wanted.trim() !== "" &&
    tg.did.trim() !== "" &&
    tg.happened.trim() !== "";

  function startMission() {
    window.open(mission.sb3Url, "_blank", "noopener");
    onStart();
    setStarted(true);
  }

  function update(patch: Partial<ThoughtGate>) {
    const next = { ...tg, ...patch };
    setTg(next);
    onSave(next);
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-2">
          <span className="pill bg-slate-100 text-slate-600">
            {mission.level} · {mission.set}
          </span>
          {mission.conceptTags.map((t) => (
            <span key={t} className="pill bg-brand-50 text-brand-700">
              #{t}
            </span>
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          {mission.title}
        </h1>
        <p className="mt-2 text-slate-600">🎯 {mission.goalDescription}</p>

        <div className="mt-4 rounded-xl bg-slate-900 p-4 font-mono text-sm leading-relaxed text-slate-100">
          <div className="mb-2 text-xs text-slate-400">
            현재 블록 (디버깅 대상 — 어디가 잘못됐을까?)
          </div>
          <pre className="whitespace-pre-wrap">{mission.skeletonText}</pre>
        </div>

        <button className="btn-primary mt-4 w-full" onClick={startMission}>
          ▶ 미션 시작 (.sb3 내려받기 → 스크래치에서 열기)
        </button>
        {started && (
          <p className="mt-2 text-center text-sm text-emerald-600">
            ✓ 시작했어요. 스크래치에서 고쳐본 뒤, 막히면 아래 생각 게이트를
            채우세요.
          </p>
        )}
      </div>

      <div className={`card ${!started ? "pointer-events-none opacity-50" : ""}`}>
        <h2 className="text-lg font-bold text-slate-900">
          🚪 생각 게이트 — AI에게 묻기 전에 먼저!
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          세 칸을 모두 채워야 AI 도움 버튼이 열려요. (이 내용은 선생님 화면에도
          바로 보여요)
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="label">1. 뭘 하고 싶었어? (목표 상태)</label>
            <GuardedTextarea
              value={tg.wanted}
              onChange={(v) => update({ wanted: v })}
              studentId={student.id}
              studentName={student.name}
              studentNo={student.studentNo}
              placeholder="예: 타이머가 10에서 0까지 줄어들게 하고 싶었어"
            />
          </div>
          <div>
            <label className="label">
              2. 실제로 뭘 했어? (어떤 블록을 어디에 넣었어?)
            </label>
            <GuardedTextarea
              value={tg.did}
              onChange={(v) => update({ did: v })}
              studentId={student.id}
              studentName={student.name}
              studentNo={student.studentNo}
              placeholder="예: 반복 안에 '타이머를 1만큼 바꾸기'를 넣었어"
            />
          </div>
          <div>
            <label className="label">3. 뭐가 일어났어? (현재 상태)</label>
            <GuardedTextarea
              value={tg.happened}
              onChange={(v) => update({ happened: v })}
              studentId={student.id}
              studentName={student.name}
              studentNo={student.studentNo}
              placeholder="예: 숫자가 줄지 않고 계속 늘어나기만 해"
            />
          </div>
        </div>

        <button
          className="btn-primary mt-6 w-full"
          disabled={!filled}
          onClick={() => onSubmit(tg)}
        >
          🤖 AI 도움받기
        </button>
        {!filled && (
          <p className="mt-2 text-center text-sm text-slate-400">
            세 칸을 모두 채우면 AI 도움 버튼이 열려요.
          </p>
        )}
      </div>
    </div>
  );
}
