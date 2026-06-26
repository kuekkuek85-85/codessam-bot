"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  image: string | null;
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
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

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

  // 학생별 상세(생각 게이트·마지막 힌트·캡처) 로드 — 무료 한도 보호 캐시.
  // ① 변경된 학생만 메타 재조회(한 명 움직여도 30명 전부 다시 안 읽음)
  // ② 캡처 이미지는 attemptId별 1회만 다운로드 후 캐시(재다운로드 방지)
  const detailsRef = useRef<Record<string, Detail>>({});
  const sigRef = useRef<Record<string, string>>({});
  const imgCacheRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!authed || students.length === 0) return;
    let cancelled = false;
    (async () => {
      const changed = students.filter(
        (s) =>
          sigRef.current[s.id] !==
          `${s.currentMissionId ?? ""}|${s.lastActiveAt}`
      );
      if (changed.length === 0) return;
      await Promise.all(
        changed.map(async (s) => {
          const [attempt, lastHint] = await Promise.all([
            db().latestAttempt(s.id),
            db().lastAiHint(s.id),
          ]);
          let image: string | null = null;
          if (attempt) {
            if (imgCacheRef.current[attempt.id]) {
              image = imgCacheRef.current[attempt.id];
            } else {
              // null이면 캐시하지 않음 — 학생이 나중에 첨부하면 다음에 잡힘.
              image = await db().getAttemptImage(attempt.id);
              if (image) imgCacheRef.current[attempt.id] = image;
            }
          }
          detailsRef.current[s.id] = { attempt, lastHint, image };
          sigRef.current[s.id] = `${s.currentMissionId ?? ""}|${
            s.lastActiveAt
          }`;
        })
      );
      if (!cancelled) setDetails({ ...detailsRef.current });
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

  async function reseed() {
    if (
      !confirm(
        "미션을 코드의 최신 시드(상·중·하)로 다시 심습니다. DB의 기존 미션 목록을 덮어써요. 계속할까요?"
      )
    )
      return;
    await db().reseedMissions();
    alert(
      "미션을 다시 심었어요. 학생은 새로고침(또는 다시 시작)하면 새 미션이 보입니다."
    );
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
            <button className="btn-ghost" onClick={reseed}>
              🔄 미션 다시 심기
            </button>
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
                onZoom={setZoomSrc}
              />
            ))}
          </div>
        )}
      </div>

      {/* 캡처 확대 보기 (라이트박스) */}
      {zoomSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setZoomSrc(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomSrc}
            alt="학생 캡처 확대"
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-6 top-6 rounded-full bg-white/90 px-4 py-2 font-semibold text-slate-800 shadow hover:bg-white"
            onClick={() => setZoomSrc(null)}
          >
            ✕ 닫기
          </button>
        </div>
      )}

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
  onZoom,
}: {
  student: Student;
  state: StudentState;
  now: number;
  detail?: Detail;
  warned: boolean;
  onZoom: (src: string) => void;
}) {
  const style = STATE_STYLE[state];
  const mins = minutesSince(student.lastActiveAt, now);
  const tg = detail?.attempt?.thoughtGate;
  const capture = detail?.image ?? undefined;
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

      {/* 캡처 썸네일 — 상태와 무관하게 항상 표시, 클릭 시 확대 */}
      {capture && (
        <button
          type="button"
          onClick={() => onZoom(capture)}
          className="group relative mt-2 block w-full overflow-hidden rounded-lg ring-1 ring-slate-200"
          title="클릭해 크게 보기"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capture}
            alt="학생 캡처"
            className="max-h-40 w-full object-cover transition group-hover:opacity-90"
          />
          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            🔍 캡처
          </span>
        </button>
      )}

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
        </div>
      )}
    </div>
  );
}
