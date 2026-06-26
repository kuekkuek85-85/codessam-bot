# Vercel 배포 가이드

이 앱은 표준 Next.js 14 앱이라 Vercel이 자동 인식합니다. 별도 설정 파일이 필요 없습니다.

## 1. 프로젝트 가져오기

1. https://vercel.com/new 접속 (GitHub 계정으로 로그인)
2. **Import Git Repository** → `kuekkuek85-85/codessam-bot` 선택
3. Framework Preset: **Next.js** (자동 감지됨)
4. Root Directory: `./` (그대로)
5. Build/Output 설정: 기본값 그대로 (`next build`)

## 2. 환경변수 설정 (Settings → Environment Variables)

아래 키들을 추가합니다. 값은 본인의 Firebase 콘솔 / Google AI Studio에서 확인하세요.
(로컬 `.env.local`과 동일한 값)

| Key | 비고 |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase 웹 설정 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 웹 설정 |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Realtime DB URL (필수) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 웹 설정 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase 웹 설정 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase 웹 설정 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase 웹 설정 |
| `GEMINI_API_KEY` | Google AI Studio (서버 전용, NEXT_PUBLIC 아님) |
| `GEMINI_MODEL` | `gemini-2.5-flash` |

> ⚠️ `GEMINI_API_KEY`는 `NEXT_PUBLIC_` 접두사를 붙이지 마세요. 서버(API 라우트)에서만
> 사용되어 브라우저에 노출되지 않아야 합니다.

환경변수가 하나도 없어도 빌드·배포는 됩니다(데모 모드 + AI 더미 폴백).
실시간 동기화·실제 AI를 쓰려면 위 값을 채우세요.

## 3. 배포

**Deploy** 버튼을 누르면 끝. 이후 `main`에 푸시할 때마다 자동 재배포됩니다.

## 4. 배포 후 필수 설정 — Firebase 보안 규칙

이 앱은 로그인이 없어, Realtime Database 규칙이 닫혀 있으면 화면이 데이터를
읽지 못합니다. **Firebase 콘솔 → Realtime Database → 규칙**에 저장소의
`database.rules.json` 내용을 붙여넣고 게시하세요.

## 5. (선택) CLI로 배포

```bash
npm i -g vercel
vercel login
vercel --prod
# 환경변수는 vercel env add 로 추가하거나 대시보드에서 설정
```
