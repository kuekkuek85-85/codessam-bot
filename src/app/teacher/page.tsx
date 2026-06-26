"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { db, STATE_STYLE } from "@/lib/db";
import { DEMO_SESSION_ID } from "@/lib/missions";
import { effectiveState, minutesSince } from "@/lib/state";
import {
  DEMO_TEACHER_CODE,
  DEMO_ACCESS_CODE,
  TOO_FAST_MIN,
  SITE,
} from "@/lib/config";
import type { Attempt, Student, StudentState, Warning } from "@/lib/types";

interface Detail {
  attempt: Attempt | null;
  lastHint: string | null;
}

const STUCK_ORDER: Record<StudentState, number> = {
  막힘: 0,
  붕뜸: 1,
  AI검증중: 2,
  혼자푸는중: 3,
  "완성·도전중": 4,
};

export default function TeacherPage() {
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [now, setNow] = useState<number>(0);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    if (!authed) return;
    setDemo(db().demo);
    setNow(Date.now());
    db().ensureSeed();
    const unsubS = db().subscribeStudents(DEMO_SESSION_ID, setStudents);
    const unsubW = db().subscribeWarnings(DEMO_SESSION_ID, setWarnings);
    const tick = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      unsubS();
      unsubW();
      clearInterval(tick);
    };
  }, [authed]);

  // 학생별 상세(생각 게이트·마지막 힌트) 로드
  useEffect(() => {
    if (!authed || students.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        students.map(async (s) => {
          const [attempt, lastHint] = await Promise.all([
            db().latestAttempt(s.id),
            db().lastAiHint(s.id),
          ]);
          return [s.id, { attempt, lastHint }] as const;
        })
      );
      if (!cancelled) setDetails(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, students]);

  const rows = useMemo(() => {
    const n = now || Date.now();
    return students
      .map((s) => ({ s, state: effectiveState(s, n) }))
      .sort(
        (a, b) =>
          STUCK_ORDER[a.state] - STUCK_ORDER[b.state] ||
          a.s.studentNo.localeCompare(b.s.studentNo)
      );
  }, [students, now]);

  const summary = useMemo(() => {
    const n = now || Date.now();
    const states = students.map((s) => effectiveState(s, n));
    return {
      total: students.length,
      done: students.filter((s) => details[s.id]?.attempt?.completedAt).length,
      verifyChallenge: states.filter(
        (st) => st === "AI검증중" || st === "완성·도전중"
      ).length,
      warnings: warnings.length,
      stuck: states.filter((st) => st === "막힘").length,
    };
  }, [students, warnings, details, now]);

  const warnedStudentIds = useMemo(
    () => new Set(warnings.map((w) => w.studentId)),
    [warnings]
  );

  function exportCsv() {
    const n = now || Date.now();
    const header = [
      "학번",
      "이름",
      "난이도",
      "상태",
      "경과(분)",
      "하고싶었던것",
      "실제로한것",
      "일어난일",
      "완료",
    ];
    const lines = students.map((s) => {
      const d = details[s.id];
      const tg = d?.attempt?.thoughtGate;
      const cells = [
        s.studentNo,
        s.name,
        s.currentLevel,
        effectiveState(s, n),
        String(minutesSince(s.lastActiveAt, n)),
        tg?.wanted ?? "",
        tg?.did ?? "",
        tg?.happened ?? "",
        d?.attempt?.completedAt ? "O" : "",
      ];
      return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
    });
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codessam_${new Date(n).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function clearAll() {
    if (
      !confirm(
        "이 세션의 모든 학생·시도·경고 데이터를 삭제합니다. 되돌릴 수 없어요. 계속할까요?"
      )
    )
      return;
    await db().clearAll(DEMO_SESSION_ID);
    setStudents([]);
    setWarnings([]);
    setDetails({});
  }

  // ── 교사 코드 게이트 ────────────────────────────────────
  if (!authed) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="card w-full max-w-sm">
          <h1 className="text-xl font-bold text-slate-900">👩‍🏫 교사 대시보드</h1>
          <p className="mt-1 text-sm text-slate-500">
            해제 코드를 입력하세요. (데모 코드:{" "}
            <code className="font-mono">{DEMO_TEACHER_CODE}</code>)
          </p>
          <input
            className="field mt-4"
            placeholder="해제 코드"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setCodeErr(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (code.trim() === DEMO_TEACHER_CODE) setAuthed(true);
                else setCodeErr(true);
              }
            }}
          />
          {codeErr && (
            <p className="mt-2 text-sm text-red-600">코드가 올바르지 않아요.</p>
          )}
          <button
            className="btn-primary mt-4 w-full"
            onClick={() =>
              code.trim() === DEMO_TEACHER_CODE
                ? setAuthed(true)
                : setCodeErr(true)
            }
          >
            입장
          </button>
          <Link
            href="/"
            className="mt-3 block text-center text-sm text-slate-400 hover:text-slate-600"
          >
            ← 홈으로
          </Link>
        </div>
      </main>
    );
  }

  // ── 대시보드 ───────────────────────────────────────────
  const n = now || Date.now();
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <Link href="/" className="text-lg font-bold text-slate-900">
              {SITE.appName} · 교사 대시보드
            </Link>
            <p className="text-sm text-slate-500">
              {demo ? (
                <span className="text-amber-600">
                  ● 데모 모드(이 브라우저 전용) — 실시간 다기기 동기화는 Firebase
                  설정 필요
                </span>
              ) : (
                <span className="text-emerald-600">
                  ● Realtime Database 실시간 연결
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={exportCsv}>
              ⬇ CSV 내보내기
            </button>
            <button
              className="btn-ghost text-red-600 ring-red-200 hover:bg-red-50"
              onClick={clearAll}
            >
              🗑 전체 삭제
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* 요약 지표 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Metric label="참여" value={summary.total} tone="text-slate-900" />
          <Metric label="완료" value={summary.done} tone="text-emerald-600" />
          <Metric
            label="검증·도전"
            value={summary.verifyChallenge}
            tone="text-violet-600"
          />
          <Metric label="막힘" value={summary.stuck} tone="text-red-600" />
          <Metric label="경고" value={summary.warnings} tone="text-rose-600" />
        </div>

        {/* 접속 안내 */}
        <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
          학생 접속 링크:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
            /student
          </code>{" "}
          · 접속 코드:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
            {DEMO_ACCESS_CODE}
          </code>
        </div>

        {/* 경고 패널 */}
        {warnings.length > 0 && (
          <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 p-4">
            <h2 className="font-bold text-red-700">
              ⚠️ 필터링 경고 {warnings.length}건
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-red-700">
              {warnings.slice(0, 6).map((w) => (
                <li key={w.id}>
                  [{w.type}] {w.studentNo} {w.studentName} — "{w.text}"
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 학생 카드 */}
        {rows.length === 0 ? (
          <div className="mt-10 rounded-xl bg-white p-10 text-center text-slate-400 ring-1 ring-slate-200">
            아직 입장한 학생이 없어요. 학생이{" "}
            <code className="font-mono">/student</code> 로 들어오면 여기에 실시간
            표시됩니다.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ s, state }) => (
              <StudentCard
                key={s.id}
                student={s}
                state={state}
                now={n}
                detail={details[s.id]}
                warned={warnedStudentIds.has(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-extrabold ${tone}`}>{value}</div>
    </div>
  );
}

function StudentCard({
  student,
  state,
  now,
  detail,
  warned,
}: {
  student: Student;
  state: StudentState;
  now: number;
  detail?: Detail;
  warned: boolean;
}) {
  const style = STATE_STYLE[state];
  const mins = minutesSince(student.lastActiveAt, now);
  const tg = detail?.attempt?.thoughtGate;
  const completed = detail?.attempt?.completedAt;
  const startMins = detail?.attempt
    ? minutesSince(detail.attempt.startedAt, now)
    : null;

  // 트리아지 메시지
  let triage: string | null = null;
  if (state === "막힘") triage = "🚶 코칭하러 가세요";
  else if (state === "붕뜸") triage = "🚀 도전 과제를 던지세요";
  else if (
    completed &&
    student.currentLevel === "하" &&
    startMins !== null &&
    startMins <= TOO_FAST_MIN
  )
    triage = "↗ 하를 너무 빨리 완성 — 중·상으로 안내";

  const showDetail = state === "막힘" || state === "붕뜸" || warned;

  return (
    <div
      className={`rounded-2xl bg-white p-4 ring-1 transition ${
        warned ? "ring-2 ring-red-400" : "ring-slate-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-slate-900">
            {student.studentNo} {student.name}
          </div>
          <div className="text-xs text-slate-400">
            난이도 {student.currentLevel} · 해금{" "}
            {student.unlockedLevels.join("·")}
          </div>
        </div>
        <span className={`pill ${style.bg} ${style.text}`}>
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          {state}
        </span>
      </div>

      <div className="mt-2 text-xs text-slate-400">
        마지막 활동 {mins}분 전
        {startMins !== null && ` · 시작 후 ${startMins}분`}
      </div>

      {warned && (
        <div className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
          ⚠️ 필터링 경고 이력 있음
        </div>
      )}

      {triage && (
        <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700">
          {triage}
        </div>
      )}

      {/* 막힘/붕뜸/경고 카드는 무엇에 막혔는지까지 펼쳐 보여줌 */}
      {showDetail && tg && (tg.wanted || tg.did || tg.happened) && (
        <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          {tg.wanted && (
            <p>
              <b>하고팠던것:</b> {tg.wanted}
            </p>
          )}
          {tg.did && (
            <p>
              <b>한것:</b> {tg.did}
            </p>
          )}
          {tg.happened && (
            <p>
              <b>일어난일:</b> {tg.happened}
            </p>
          )}
          {detail?.lastHint && (
            <p className="border-t border-slate-200 pt-1 text-violet-600">
              <b>마지막 AI 힌트:</b> {detail.lastHint.slice(0, 80)}
              {detail.lastHint.length > 80 ? "…" : ""}
            </p>
          )}
          {detail?.attempt?.imageUrl && (
            <div className="border-t border-slate-200 pt-1">
              <b>최근 캡처:</b>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detail.attempt.imageUrl}
                alt="학생 캡처"
                className="mt-1 max-h-36 rounded ring-1 ring-slate-200"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
