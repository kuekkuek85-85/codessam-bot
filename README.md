# 코드쌤봇 2.0

> 스크래치 디버깅 AI 협업 수업을 위한 **Teacher-in-the-Loop** 웹앱
> 학생 수준차를 *사전 분류 없이* 흡수한다. 시간이 아니라 **AI의 역할**로 수업을 나눈다.

장평중 정보과 / 1교사 30학생 / 스크래치 스켈레톤 빈칸·디버깅 미션 / 순회 코칭 수업을 위해 만들어졌습니다.

---

## 핵심 아이디어 (PRD §3)

학생을 분류하지 않고, **상태(state)에 따라 AI의 역할만 바꿉니다.**

| 학생 상태 | AI 역할 | 학생이 하는 일 |
|---|---|---|
| 설계/시작 | 없음 | 생각 게이트에 혼자 입력 |
| 막힘 | 소크라테스식 질문자 + 단계 힌트 | 힌트 받아 다시 시도 |
| 완성함 | **검증자** | 일부러 틀린 AI 답에서 오류 찾기 |
| 빨리 끝남 | 도전 파트너 | 더 어려운 변형 과제 |

---

## 기술 스택

- **Next.js 14 (App Router) + TypeScript + Tailwind CSS**
- **Firebase / Realtime Database** — 실시간 대시보드 (선택)
- **Gemini API** — 단계 힌트·검증·도전 생성 (선택, 없으면 더미 폴백)
- **Vercel** 배포 권장

> 💡 **Firebase·Gemini 설정이 없어도 앱은 "데모 모드"로 완전히 동작합니다.**
> 데이터는 브라우저 localStorage에 저장되고, AI는 더미 질문형 응답으로 폴백됩니다(PRD §9.4).
> 같은 브라우저에서 학생 탭과 교사 탭을 함께 열면 실시간 연동을 체험할 수 있습니다.

---

## 빠른 시작

```bash
npm install
npm run dev
# http://localhost:3000
```

- 학생: `/student` — 윤리 약속 → 난이도 → 미션·생각 게이트 → AI 힌트 → 검토 → 최종/검증/도전
- 교사: `/teacher` — 해제 코드 `1234` (데모) → 실시간 대시보드

---

## 실서비스 설정 (여러 기기 실시간 동기화)

`.env.example`을 `.env.local`로 복사 후 채우세요.

```bash
cp .env.example .env.local
```

- **Firebase**: `NEXT_PUBLIC_FIREBASE_*` 값(특히 `DATABASE_URL`)을 채우면 자동으로 Realtime Database 실시간 모드로 전환됩니다.
- **Gemini**: `GEMINI_API_KEY`를 채우면 실제 AI 힌트가, 없으면 더미 응답이 나옵니다.

### Realtime Database 보안 규칙

이 앱은 로그인이 없어, RTDB 규칙이 닫혀 있으면 학생/교사 화면이 데이터를 읽지
못합니다. 저장소의 `database.rules.json`을 Firebase 콘솔
(Realtime Database → 규칙)에 붙여넣으세요. 수업이 끝나면 규칙을 닫거나
대시보드의 "전체 삭제"로 데이터를 비우는 것을 권장합니다.

```bash
# firebase-tools를 쓴다면
firebase deploy --only database
```

---

## 미션 만들기: .sb3 → 미션 데이터 (PRD §7)

선생님은 `.sb3`로 출제하고, 스크립트가 텍스트 의사코드로 변환합니다.

```bash
# .sb3 폴더(또는 파일들)를 변환해 미션 JSON 생성
node scripts/parse-sb3.mjs ./my-scratch-files > missions.json
```

출력 JSON에서 사람이 보완할 칸(`level`, `answerText`, `bugPoints`, `sb3Url` 등)을
채운 뒤 Realtime Database `missions` 경로에 업로드하세요.

기본 미션 3종(상·중·하)은 실제 수업 .sb3를 기반으로 `src/lib/missions.ts`에
들어 있고, 원본 파일은 `public/missions/{sang,jung,ha}.sb3`로 호스팅되어
'미션 시작' 버튼이 내려받게 합니다(학생 디버깅 대상). 각 미션의
`bugPoints`/`answerText`/`goalDescription`은 업로드 파일 분석 기반 추정값이라
의도와 다르면 해당 파일만 고치면 됩니다.

---

## 프로젝트 구조

```
src/
  app/
    page.tsx            홈(학생/교사 진입)
    student/page.tsx    학생 6화면 오케스트레이터
    teacher/page.tsx    교사 실시간 대시보드
    api/ai/route.ts     Gemini 프록시 + 더미 폴백
  components/
    Footer.tsx          운영정보·처리방침·약관 (PRD §11)
    student/            6개 화면 컴포넌트 + 안전필터 입력
  lib/
    types.ts            도메인 타입 (PRD §8 데이터 모델)
    db.ts               데이터 레이어 (Realtime Database ↔ localStorage)
    firebase.ts         Firebase 초기화(선택)
    gemini.ts           모드별 시스템 프롬프트 + 더미 (PRD §9)
    filter.ts           욕설·개인정보 1차 규칙 엔진 (PRD §10)
    state.ts            막힘/붕뜸 상태 계산 (PRD §3.3, §6)
    missions.ts         시드 미션
    config.ts           학교·책임자·임계값 (교체 쉽게 변수 분리)
scripts/
  parse-sb3.mjs         .sb3 → 미션 의사코드 변환 (PRD §7)
```

---

## 완성 기준 (PRD §13) 충족 현황

- [x] 브라우저에서 학생 6개 화면이 순서대로 열린다
- [x] 생각 게이트 3칸이 비면 AI 도움이 막힌다(disabled)
- [x] AI가 완성본을 주지 않고 단계 힌트만 준다 (0→3 한 칸씩)
- [x] 하를 완성하면 중이 해금된다
- [x] 완성한 학생에게 검증/도전이 제시된다
- [x] 교사 대시보드에 학생별 상태가 실시간 표시된다
- [x] 막힌 학생 카드에서 생각 게이트 3칸이 보인다
- [x] 욕설·개인정보 입력 시 차단 + 교사 경고
- [x] 푸터에 처리방침·약관·책임자·저작권이 있다

---

## 운영 정보 교체

`src/lib/config.ts`의 `SITE` 객체(학교명·교사명·연락처)와 임계 시간만 바꾸면
푸터·개인정보처리방침 전체가 갱신됩니다.
