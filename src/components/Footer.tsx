"use client";

import { useState } from "react";
import { SITE } from "@/lib/config";

// 운영 정보 푸터 (PRD §11) — 학운위/에듀집 대비.
export default function Footer() {
  const [open, setOpen] = useState<null | "privacy" | "terms">(null);

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-slate-500">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            className="font-semibold text-slate-700 hover:text-brand-600"
            onClick={() => setOpen("privacy")}
          >
            개인정보처리방침
          </button>
          <span className="text-slate-300">·</span>
          <button
            className="font-semibold text-slate-700 hover:text-brand-600"
            onClick={() => setOpen("terms")}
          >
            이용약관
          </button>
          <span className="text-slate-300">·</span>
          <span>
            정보관리책임자: {SITE.managerName}({SITE.managerTitle},{" "}
            {SITE.schoolName} {SITE.department}) · {SITE.managerContact}
          </span>
        </div>
        <p className="mt-3">
          © {SITE.year} {SITE.schoolName} {SITE.department}. {SITE.appName}.
        </p>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {open === "privacy" ? <PrivacyBody /> : <TermsBody />}
            <button
              className="btn-primary mt-6 w-full"
              onClick={() => setOpen(null)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}

function PrivacyBody() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      <h2 className="text-lg font-bold text-slate-900">개인정보처리방침</h2>
      <p>
        <b>1. 처리 목적</b> — {SITE.appName}은(는) 스크래치 디버깅 수업 운영 및
        학습 상태 모니터링을 위해 최소한의 정보를 처리합니다.
      </p>
      <p>
        <b>2. 처리 항목</b> — 학번, 이름(식별용), 학습 활동 기록(생각 게이트
        입력, AI 대화, 미션 진행 상태).
      </p>
      <p>
        <b>3. 보유 기간</b> — 해당 학년도 종료 또는 졸업·진급 시까지 보유 후
        파기합니다. 교사는 대시보드에서 언제든 전체 데이터를 삭제할 수 있습니다.
      </p>
      <p>
        <b>4. 제3자 제공</b> — AI 힌트 제공을 위해 학생이 입력한 학습 텍스트가
        AI(Gemini) API로 전송될 수 있으며, 개인 식별정보는 전송하지 않습니다.
      </p>
      <p>
        <b>5. 책임자</b> — {SITE.managerName} ({SITE.managerContact})
      </p>
    </div>
  );
}

function TermsBody() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      <h2 className="text-lg font-bold text-slate-900">이용약관</h2>
      <p>1. 본 서비스는 {SITE.schoolName} 정보 수업 학습 목적으로만 사용합니다.</p>
      <p>2. 욕설·개인정보·타인 비방 표현 입력은 금지되며 자동 차단됩니다.</p>
      <p>3. AI의 답변은 학습 보조용이며 항상 옳지 않을 수 있습니다. 비판적으로 검토하세요.</p>
      <p>4. AI 결과를 그대로 제출하지 않으며, 본인의 사고 과정을 남깁니다.</p>
    </div>
  );
}
