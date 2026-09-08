# SNS 자동 포스팅

인스타그램, 네이버블로그, 스레드 등의 SNS에 올릴 콘텐츠를 자동으로 만들어주는 로컬 웹앱입니다.

> **현재 구현된 범위**: 인스타그램 게시물(사진), 인스타그램 릴스(해외 콘텐츠 번역·각색)까지입니다.
> 네이버 블로그 자동 발행은 아직 코드가 없고 계획서([`docs/PROJECT_PLAN.md`](./docs/PROJECT_PLAN.md))만 있는 상태입니다.
> 실제 SNS에 자동으로 업로드하는 기능(Instagram Graph API 연동)도 아직 없습니다 — 이 앱은 **콘텐츠를 로컬에서 만들고 다운로드**하는 데까지만 합니다. 만든 콘텐츠는 인스타그램 앱에서 직접 올려야 합니다.

---

## 1. 이 앱이 하는 일

| 기능 | 입력 | 결과물 |
|---|---|---|
| 인스타그램 게시물 | 키워드(자동발굴/체험단/브랜딩) **또는** 직접 촬영한 사진 | 캡션 + 해시태그 + 이미지 1~N장(캐러셀 옵션) |
| 인스타그램 릴스 | 해외 SNS 원문(텍스트/이미지) | 후킹 제목 3안 + 한국어 각색 본문 + 재생성 이미지 |

두 기능 모두 **완전히 로컬에서 동작**하고, 결과물은 화면에서 복사하거나 zip으로 다운로드해서 직접 인스타그램에 올리면 됩니다.

---

## 2. 시작하기 전에 — 반드시 필요한 것

| # | 항목 | 왜 필요한가 | 확인 방법 |
|---|---|---|---|
| 1 | **Node.js** (LTS 권장) | 앱을 실행하는 런타임 | `node --version` |
| 2 | **Claude Code CLI 설치 + 로그인** | 캡션·본문·이미지 프롬프트 생성을 담당 (API 키가 아니라 구독 계정으로 동작) | `claude --version` |

이 두 가지가 안 되면 아무것도 동작하지 않습니다. 아래 "실행하기" 전에 먼저 확인하세요.

### 선택 사항 — 있으면 더 좋은 것

| # | 항목 | 왜 필요한가 | 없으면 |
|---|---|---|---|
| 3 | **Cloudflare 계정 + Workers AI API 토큰** | AI 이미지 생성(FLUX 모델)에 사용 | 캡션/본문 생성은 정상 동작하지만 이미지는 만들어지지 않습니다(직접 촬영한 사진을 올리는 경우는 이것도 필요합니다 — 원본을 그대로 쓰지 않고 재생성하기 때문) |

---

## 3. 설치 및 실행 (배포 단계)

로컬 PC에서 실행하는 개인용 도구입니다. 별도 서버 배포는 필요 없습니다.

### 3-1. 저장소 받기

```bash
git clone https://github.com/James0083/sns_auto_posting.git
cd sns_auto_posting
```

### 3-2. 필요한 프로그램 설치

```bash
npm install
```

### 3-3. 열쇠(키) 파일 만들기

Cloudflare로 AI 이미지 생성을 쓰려면 아래를 진행하세요. **건너뛰어도 나머지 기능(캡션·본문 생성)은 정상 동작합니다.**

```bash
cp env.sample .env.local        # 윈도우: copy env.sample .env.local
```

`.env.local` 파일을 열어 아래 두 값을 채웁니다:

```
CLOUDFLARE_ACCOUNT_ID=여기에_계정_ID
CLOUDFLARE_API_TOKEN=여기에_API_토큰
```

- Cloudflare 대시보드(dash.cloudflare.com) → 오른쪽 사이드바에서 **Account ID** 확인
- **My Profile → API Tokens → Create Token**에서 **Workers AI** 권한이 포함된 토큰 발급
- 값을 채운 뒤에는 **앱을 껐다가 다시 켜야** 반영됩니다.

### 3-4. 앱 켜기

```bash
npm run dev
```

터미널에 주소가 뜨면 브라우저에서 **http://localhost:4123** 을 엽니다. 이 터미널 창은 켜둔 채로 두세요 — 닫으면 앱이 꺼집니다.

### 3-5. 화면 상단 상태 표시 확인

- **Claude CLI 연결됨** (초록 점) — 정상. 빨간/주황 점이면 `claude --version`이 터미널에서 정상 동작하는지 먼저 확인하세요.
- **AI 이미지 생성 설정됨 / 미설정** — 미설정이어도 캡션·본문 생성은 그대로 됩니다. 이미지까지 만들려면 3-3을 진행하세요.

---

## 4. 정상 사용을 위해 직접 해야 하는 설정 — 체크리스트

- [ ] Node.js 설치
- [ ] `claude` CLI 설치 후 로그인 (Claude 구독 계정)
- [ ] `npm install` 실행
- [ ] (선택) Cloudflare 계정 생성 + Workers AI 권한 API 토큰 발급
- [ ] (선택) `env.sample` → `.env.local` 복사 후 Cloudflare 값 입력
- [ ] (선택 값을 입력했다면) 앱 재시작
- [ ] `npm run dev` 로 앱 실행 후 http://localhost:4123 접속
- [ ] 상단 상태 표시에서 Claude CLI가 "연결됨"인지 확인

---

## 5. 폴더 구조

```
config.ts              전역 기본값
lib/
  claude.ts             claude -p CLI 래퍼
  db.ts / settings.ts    SQLite + 런타임 설정
  ai/                    캡션·본문·이미지 생성 로직
  pipeline/               ig(게시물) / reels(릴스) 오케스트레이션
  text/                   유니코드 볼드 변환, zip 생성
app/
  page.tsx               채널 선택 + 작성 화면
  components/             IgPanel / ReelsPanel / ImageDropzone 등
  api/                    ig/reels 잡 생성·조회·다운로드 라우트
docs/
  PROJECT_PLAN.md         전체(네이버+인스타그램) 통합 계획서
  reference/              원본 스펙 문서 3종 (네이버 블로그, 릴스 각색 규칙, 초기 릴스 계획서)
data/                    (git에 안 올라감) SQLite DB, 생성된 이미지가 저장되는 곳
```

---

## 6. 알려진 제한 사항

- **네이버 블로그 트랙 미구현** — 계획만 있고 코드는 없습니다([`docs/PROJECT_PLAN.md`](./docs/PROJECT_PLAN.md) 참고).
- **인스타그램 자동 업로드 없음** — 생성된 콘텐츠는 다운로드/복사해서 사용자가 직접 올려야 합니다.
- **릴스는 정지 이미지까지만** — 실제 동영상 생성·편집 기능은 없습니다.
- **한글은 인스타그램 캡션에서 "볼드"로 표시할 수 없습니다** — 유니코드 볼드 서체는 라틴 문자·숫자만 지원해서, 한글 강조는 별표만 제거되고 굵게 표시되지는 않습니다(`lib/text/boldConvert.ts` 참고).
- Windows 환경은 미검증입니다(macOS/Linux 기준 개발·테스트).

---

## 7. 개발자용 명령어

```bash
npm run dev        # 개발 서버 (포트 4123)
npm run build      # 프로덕션 빌드
npm run typecheck  # 타입 검사만
```
