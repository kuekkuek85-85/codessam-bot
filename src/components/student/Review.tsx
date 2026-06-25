"use client";

import { useState } from "react";
import GuardedTextarea from "./GuardedTextarea";
import type { Attempt, Student } from "@/lib/types";

// 화면 4. 검토·수정 — PRD §5
export default function Review({
  student,
  attempt,
  onDone,
}: {
  student: Student;
  attempt: Attempt;
  onDone: (good: string, fix: string) => void;
}) {
  const [good, setGood] = useState(attempt.reviewGood);
  const [fix, setFix] = useState(attempt.reviewFix);

  const canNext = good.trim() !== "" && fix.trim() !== "";

  return (
    <div className="space-y-5">
      <div className="context-box">
        <div className="mb-1 font-semibold text-slate-500">🚪 내가 쓴 생각</div>
        <p>• 하고 싶었던 것: {attempt.thoughtGate.wanted}</p>
        <p>• 일어난 일: {attempt.thoughtGate.happened}</p>
      </div>

      <div className="card">
        <h1 className="text-xl font-bold text-slate-900">✏️ AI 힌트 검토하기</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI 말을 그대로 받아들이지 말고, 두 칸을 모두 채워야 다음으로 가요.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="label">👍 AI에서 좋은 점 (도움이 된 것)</label>
            <GuardedTextarea
              value={good}
              onChange={setGood}
              studentId={student.id}
              studentName={student.name}
              studentNo={student.studentNo}
              placeholder="예: '그 블록이 언제 실행돼?'라는 질문 덕분에 순서를 다시 봤다"
            />
          </div>
          <div>
            <label className="label">🛠️ 내가 고칠 점 (내가 바꿀 것)</label>
            <GuardedTextarea
              value={fix}
              onChange={setFix}
              studentId={student.id}
              studentName={student.name}
              studentNo={student.studentNo}
              placeholder="예: '1만큼 바꾸기'를 '-1만큼 바꾸기'로 바꿔야겠다"
            />
          </div>
        </div>

        <button
          className="btn-primary mt-6 w-full"
          disabled={!canNext}
          onClick={() => onDone(good, fix)}
        >
          최종본으로 →
        </button>
      </div>
    </div>
  );
}
