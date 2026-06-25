"use client";

import { useState } from "react";

// 화면 0. 윤리 약속 (시작 게이트) — PRD §5
const PROMISES = [
  "AI에게 묻기 전 내 생각을 먼저 씁니다.",
  "개인정보·친구 이름을 입력하지 않습니다.",
  "욕설·음란 표현을 쓰지 않습니다.",
  "AI 결과를 그대로 제출하지 않습니다.",
];

export default function EthicsGate({
  onDone,
}: {
  onDone: (studentNo: string, name: string) => void;
}) {
  const [checks, setChecks] = useState<boolean[]>(PROMISES.map(() => false));
  const [studentNo, setStudentNo] = useState("");
  const [name, setName] = useState("");

  const allChecked = checks.every(Boolean);
  const canStart = allChecked && studentNo.trim() !== "" && name.trim() !== "";

  return (
    <div className="card">
      <h1 className="text-2xl font-bold text-slate-900">시작 전 약속 ✋</h1>
      <p className="mt-2 text-slate-600">
        아래 약속을 모두 체크하고, 학번과 이름을 입력하면 시작할 수 있어요.
      </p>

      <div className="mt-6 space-y-3">
        {PROMISES.map((p, i) => (
          <label
            key={i}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand-500"
              checked={checks[i]}
              onChange={(e) => {
                const next = [...checks];
                next[i] = e.target.checked;
                setChecks(next);
              }}
            />
            <span className="text-slate-800">{p}</span>
          </label>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">학번</label>
          <input
            className="field"
            placeholder="예: 10723"
            value={studentNo}
            onChange={(e) => setStudentNo(e.target.value)}
          />
        </div>
        <div>
          <label className="label">이름</label>
          <input
            className="field"
            placeholder="예: 홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <button
        className="btn-primary mt-6 w-full"
        disabled={!canStart}
        onClick={() => onDone(studentNo.trim(), name.trim())}
      >
        약속하고 시작하기
      </button>
      {!allChecked && (
        <p className="mt-2 text-center text-sm text-slate-400">
          약속을 모두 체크해야 시작할 수 있어요.
        </p>
      )}
    </div>
  );
}
