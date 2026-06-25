import Link from "next/link";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/config";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 pt-16">
        <div className="text-center">
          <span className="pill bg-brand-100 text-brand-700">
            Teacher in the Loop
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            {SITE.appName}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            시간이 아니라 <b>AI의 역할</b>로 나눕니다. 모두 같은 미션을 풀되,
            막힌 학생에겐 단계 힌트를, 잘하는 학생에겐 <b>"AI를 검사해라"</b>를.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <Link href="/student" className="card group transition hover:shadow-md">
            <div className="text-3xl">🧑‍🎓</div>
            <h2 className="mt-3 text-xl font-bold text-slate-900">
              학생으로 시작
            </h2>
            <p className="mt-2 text-slate-600">
              윤리 약속 → 난이도 선택 → 미션 → 생각 게이트 → AI 도움 → 검토 →
              최종/검증/도전
            </p>
            <span className="mt-4 inline-block font-semibold text-brand-600 group-hover:underline">
              시작하기 →
            </span>
          </Link>

          <Link href="/teacher" className="card group transition hover:shadow-md">
            <div className="text-3xl">👩‍🏫</div>
            <h2 className="mt-3 text-xl font-bold text-slate-900">
              교사 대시보드
            </h2>
            <p className="mt-2 text-slate-600">
              30명을 혼자 보는 순회 코칭의 관제탑. 누가 막혔는지·놀고 있는지
              실시간으로.
            </p>
            <span className="mt-4 inline-block font-semibold text-brand-600 group-hover:underline">
              대시보드 열기 →
            </span>
          </Link>
        </div>

        <div className="mt-10 rounded-2xl bg-brand-50 p-6 text-sm text-brand-900 ring-1 ring-brand-100">
          <b>💡 데모 모드 안내</b> — Firebase 설정이 없으면 이 브라우저
          안에서만 데이터가 저장됩니다(localStorage). 학생 탭과 교사 탭을 같은
          브라우저에서 열면 실시간 연동을 체험할 수 있어요. 실제 수업(여러 기기
          동기화)에는 <code>.env</code>에 Firebase 설정을 채우세요.
        </div>
      </div>

      <Footer />
    </main>
  );
}
