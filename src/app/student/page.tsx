"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { db, uid } from "@/lib/db";
import { DEMO_SESSION_ID } from "@/lib/missions";
import type {
  Attempt,
  AttemptMode,
  Level,
  Mission,
  Student,
  StudentState,
  ThoughtGate,
} from "@/lib/types";
import { SITE, ACTIVE_LEVELS } from "@/lib/config";

import EthicsGate from "@/components/student/EthicsGate";
import LevelSelect from "@/components/student/LevelSelect";
import MissionThoughtGate from "@/components/student/MissionThoughtGate";
import AiHelp from "@/components/student/AiHelp";
import Review from "@/components/student/Review";
import FinalBranch from "@/components/student/FinalBranch";

const STEPS = ["윤리 약속", "난이도", "미션·생각", "AI 도움", "검토·수정", "최종"];
const STUDENT_KEY = "codessam:studentId";

export default function StudentPage() {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [student, setStudent] = useState<Student | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [mission, setMission] = useState<Mission | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  // 시드 + 미션 로드 + 기존 학생 복구
  useEffect(() => {
    (async () => {
      await db().ensureSeed();
      const ms = await db().listMissions(DEMO_SESSION_ID);
      setMissions(ms);
      const savedId =
        typeof window !== "undefined" ? localStorage.getItem(STUDENT_KEY) : null;
      if (savedId) {
        const s = await db().getStudent(savedId);
        if (s) {
          setStudent(s);
          setStep(1); // 윤리 약속은 통과한 것으로
        }
      }
      setReady(true);
    })();
  }, []);

  async function touch(state: StudentState, patch: Partial<Student> = {}) {
    if (!student) return;
    const next = {
      ...student,
      state,
      lastActiveAt: Date.now(),
      ...patch,
    };
    setStudent(next);
    await db().updateStudent(student.id, {
      state,
      lastActiveAt: next.lastActiveAt,
      ...patch,
    });
  }

  // 화면 0 완료
  async function onEthicsDone(studentNo: string, name: string) {
    const existing = await db().findStudent(DEMO_SESSION_ID, studentNo, name);
    let s: Student;
    if (existing) {
      s = { ...existing, lastActiveAt: Date.now() };
    } else {
      s = {
        id: uid("stu"),
        sessionId: DEMO_SESSION_ID,
        studentNo,
        name,
        createdAt: Date.now(),
        currentMissionId: null,
        currentLevel: "하",
        unlockedLevels: ["하"],
        state: "혼자푸는중",
        lastActiveAt: Date.now(),
      };
    }
    await db().upsertStudent(s);
    if (typeof window !== "undefined") localStorage.setItem(STUDENT_KEY, s.id);
    setStudent(s);
    setStep(1);
  }

  // 화면 1 완료 — 난이도 선택 후 미션 지정
  async function onLevelChosen(level: Level) {
    if (!student) return;
    const m =
      missions.find((x) => x.level === level && x.set === "1차시") ??
      missions.find((x) => x.level === level) ??
      null;
    setMission(m);
    await touch("혼자푸는중", {
      currentLevel: level,
      currentMissionId: m?.id ?? null,
    });
    setStep(2);
  }

  // 화면 2 — 미션 시작(새 탭) 시 attempt 생성
  async function onMissionStart() {
    if (!student || !mission) return;
    const a: Attempt = {
      id: uid("att"),
      studentId: student.id,
      missionId: mission.id,
      thoughtGate: { wanted: "", did: "", happened: "" },
      hintLevel: 0,
      reviewGood: "",
      reviewFix: "",
      finalDraft: "",
      startedAt: Date.now(),
      completedAt: null,
      mode: "solve",
    };
    await db().createAttempt(a);
    setAttempt(a);
    await touch("혼자푸는중");
  }

  async function saveThoughtGate(tg: ThoughtGate) {
    if (!attempt) return;
    const next = { ...attempt, thoughtGate: tg };
    setAttempt(next);
    await db().updateAttempt(attempt.id, { thoughtGate: tg });
    await touch("혼자푸는중");
  }

  async function saveImage(dataUrl?: string) {
    if (!attempt) return;
    // 이미지는 학생 세션의 로컬 상태에 유지(AiHelp가 바로 표시·전송)하되,
    // DB에는 attempt 본문과 분리된 경로에 저장한다(대시보드 재다운로드 방지).
    const next = { ...attempt, imageUrl: dataUrl };
    setAttempt(next);
    await db().setAttemptImage(attempt.id, dataUrl ?? "");
    await touch("혼자푸는중");
  }

  async function onGateSubmitted(tg: ThoughtGate) {
    await saveThoughtGate(tg);
    setStep(3);
  }

  async function setHintLevel(n: number) {
    if (!attempt) return;
    const next = { ...attempt, hintLevel: n };
    setAttempt(next);
    await db().updateAttempt(attempt.id, { hintLevel: n });
    await touch("혼자푸는중");
  }

  async function onReviewDone(good: string, fix: string) {
    if (!attempt) return;
    const next = { ...attempt, reviewGood: good, reviewFix: fix };
    setAttempt(next);
    await db().updateAttempt(attempt.id, { reviewGood: good, reviewFix: fix });
    await touch("혼자푸는중");
    setStep(5);
  }

  async function onFinalSubmit(finalDraft: string) {
    if (!attempt || !student || !mission) return;
    await db().updateAttempt(attempt.id, {
      finalDraft,
      completedAt: Date.now(),
    });
    // 다음 난이도 해금 (단, 이번 데모에서 열어둔 난이도만)
    const order: Level[] = ["하", "중", "상"];
    const idx = order.indexOf(mission.level);
    const unlocked = new Set(student.unlockedLevels);
    const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
    if (next && ACTIVE_LEVELS.includes(next)) unlocked.add(next);
    await touch("완성·도전중", { unlockedLevels: Array.from(unlocked) });
  }

  async function setMode(mode: AttemptMode) {
    if (!attempt) return;
    const next = { ...attempt, mode };
    setAttempt(next);
    await db().updateAttempt(attempt.id, { mode });
    await touch(mode === "verify" ? "AI검증중" : "완성·도전중");
  }

  // 새 미션 시작(난이도 선택으로 돌아가기)
  function restart() {
    setMission(null);
    setAttempt(null);
    setStep(1);
  }

  const progressPct = useMemo(() => (step / (STEPS.length - 1)) * 100, [step]);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center text-slate-400">
        불러오는 중…
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* 상단 바 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link href="/" className="font-bold text-slate-800">
            {SITE.appName}
          </Link>
          {student && (
            <span className="text-sm text-slate-500">
              {student.studentNo} {student.name} · 난이도 {student.currentLevel}
            </span>
          )}
        </div>
        <div className="h-1 w-full bg-slate-100">
          <div
            className="h-1 bg-brand-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8">
        {/* 스텝 표시 */}
        <ol className="mb-6 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={
                i === step
                  ? "text-brand-600"
                  : i < step
                  ? "text-slate-400"
                  : "text-slate-300"
              }
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        {step === 0 && <EthicsGate onDone={onEthicsDone} />}

        {step === 1 && student && (
          <LevelSelect
            student={student}
            onChoose={onLevelChosen}
            onBackToFinalIfDone={
              attempt?.completedAt ? () => setStep(5) : undefined
            }
          />
        )}

        {step === 2 && student && mission && (
          <MissionThoughtGate
            student={student}
            mission={mission}
            attempt={attempt}
            onStart={onMissionStart}
            onSave={saveThoughtGate}
            onSubmit={onGateSubmitted}
            onImageChange={saveImage}
          />
        )}

        {step === 3 && student && mission && attempt && (
          <AiHelp
            student={student}
            mission={mission}
            attempt={attempt}
            onHintLevel={setHintLevel}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && student && mission && attempt && (
          <Review
            student={student}
            attempt={attempt}
            onDone={onReviewDone}
          />
        )}

        {step === 5 && student && mission && attempt && (
          <FinalBranch
            student={student}
            mission={mission}
            attempt={attempt}
            onSubmitFinal={onFinalSubmit}
            onSetMode={setMode}
            onRestart={restart}
          />
        )}
      </div>

      <Footer />
    </main>
  );
}
