# 네이버 블로그 자동화 웹앱 — 빌드 프롬프트

> **사용법**: 이 파일 전체를 복사해 Claude Code(또는 동급 코딩 에이전트)에 그대로 붙여넣으세요.
> 빈 폴더에서 시작하면 됩니다. 이 문서 하나로 아래 앱이 처음부터 끝까지 만들어집니다.
>
> 이 문서는 실제로 이 앱을 만들면서 **깨져 본 것들의 기록**입니다.
> 특히 [7장 함정 목록](#7-함정-목록--모르면-반드시-막힌다)은 추측으로는 절대 도달할 수 없는 값들입니다.
> 셀렉터 하나, 정규식 하나까지 **그대로 쓰세요.** 더 우아해 보이는 대안은 대부분 이미 실패한 것들입니다.

> **개정 3판.** 이 프롬프트를 받아 **빈 폴더에서 끝까지 구현하고 실제 발행까지 성공시킨 두 번의 세션**에서
> 나온 피드백을 반영했습니다. 아래 값들은 전부 **살아 있는 에디터에서 측정**한 것입니다.
>
> - **1판 → 2판**: 공개 범위 지정(7-19) ★ · 캡션 절차(7-18) · 스크린샷 잘림(7-20) · 우측 도크(7-21) ·
>   UTC 날짜(7-22) · 한글 경로 NFC(7-23) · 지어낸 highlight(7-24) · 에디터 실측 단계 · 계정 유무별 검증 분리 · 윈도우
>   → *1판을 그대로 구현하면 첫 실발행이 전체공개로 나갔습니다.*
> - **2판 → 3판**: **9장 6.5의 순서 모순 해소** ★★ · **2단계 덤프 절차**(13개가 "안 잡힘"으로 나와 명세를 오판하기 쉬움) ★ ·
>   우측 도크가 `se-help-*` 계열이 **아닌** 환경(7-21) · **VS16 이모지 중복**(7-25) ·
>   본문 진입 실패 시 침묵(7-26) · `boundingBox` 30초 대기(7-27) · 글감 검색바 실측 셀렉터 · 수집 필터 누수
>
> **2판에서 재확인되어 문장을 바꾸지 않은 것**: 7-1·7-2(최소 재현 숫자까지 일치) · `tpb*i.publish` 의 `*` ·
> 7-19 라디오 `opacity:0`과 **네이버 기본값이 전체공개**(`checked=true` 실증) · UTC 날짜 · NFC · 뉴런 공식(표 전부 일치) ·
> stdin 전달 · 비전 `@경로` · 셀렉터 전반.

---

## 지시 (이 프롬프트를 받은 AI에게)

아래 명세대로 앱을 **처음부터 끝까지 구현하라.** 요약하거나 되묻지 말고 바로 만들기 시작하라.

- 9장의 순서대로 진행하고, 각 단계가 끝나면 실제로 실행해 동작을 확인한 뒤 다음으로 넘어가라.
- 7장의 셀렉터·정규식·순서는 **실측값이다. 그대로 사용하라.** 더 깔끔해 보이는 대안으로 바꾸지 마라.
- **의뢰인은 개발을 전혀 모른다.** 바로 아래 [대화 상대](#대화-상대--반드시-먼저-읽어라)와 [8-6](#8-6--초보자에게-다음-단계를-알려주는-법)의 방식대로 말하라. 코드·셀렉터·에러 원문을 사용자에게 넘기지 마라.
- **이 문서는 완전하지 않다.** 명세대로 했는데 안 되는 일이 반드시 생긴다. 그때 멈추거나 추측하지 말고 **[8-5의 진단·수정 루프](#8-5--이-문서에-없는-문제를-만났을-때--자가-진단-절차)** 를 스스로 돌려라 — 관찰 → 측정 → 가설 → 최소 수정 → **재검증**, 해결될 때까지. **코드 문제로 사용자에게 물어보지 마라. 답을 줄 수 없는 사람이다.** 명세에 없는 부분도 8장의 원칙에 따라 판단하라.
- 에디터 자동화(6-9)는 **반드시 연습 모드부터** 시작하고, 사용자의 명시적 요청 없이 실제 발행하지 마라.
- **공개 범위 기본값은 `비공개`다.** 발행 직전 `input.checked` 로 확인하고, 확인되지 않으면 발행하지 말고 중단하라.
- 로그인 전에는 **9장 6.5-a(로컬 하네스)** 로 입력 *순서*만 확정하라. 7장 셀렉터는 이 시점에 검증할 수 없으니 **그대로 쓴다.**
- 로그인 직후, 코드를 고치기 전에 **9장 6.5-b(에디터 실측)** 를 하라. 7장 값이 안 잡히면 **7장을 버리지 말고 후보 배열 앞에 추가**하라.
  ⚠️ **6.5-b 전에는 "에디터가 동작한다"고 절대 보고하지 마라.**
- 검증은 10장의 A(계정 불필요)를 전부 끝낸 뒤 B를 위해 사용자에게 로그인을 요청하라. **직접 확인하지 않은 것을 "됨"이라고 쓰지 마라.**
- `.env.local` 을 대신 작성하지 마라. `env.sample` 을 만들고 사용자에게 복사·입력을 안내하라.

작업을 시작하기 전에, 이 명세를 어떻게 이해했는지 **비유하거나 어려운 말 없이** 3~5문장으로 먼저 말하라.

---

## 대화 상대 — 반드시 먼저 읽어라

**이 앱을 만들어 달라고 한 사람은 개발을 전혀 모릅니다.**
터미널을 열어본 적이 없을 수도 있고, "환경변수"나 "의존성 설치"가 무슨 말인지 모릅니다.
**코드는 당신이 다 짜고, 사람에게는 "지금 뭘 하면 되는지"만 알려주세요.**

### 말할 때 지킬 것

1. **한 번에 하나씩.** 다음에 할 일 하나만 말하고, 그게 끝나면 그다음을 말합니다. 3단계를 한꺼번에 주지 마세요.
2. **왜 하는지 한 줄 먼저.** *"네이버에 대신 글을 올리려면 로그인이 한 번 필요합니다."* → 그다음에 방법.
3. **명령어는 복사해 붙여넣을 수 있는 형태로, 한 줄씩.** 어디에 붙여넣는지도 알려주세요.
4. **전문용어를 쓰지 마세요.** 꼭 써야 하면 한 번은 풀어서 씁니다.
5. **앱 화면에 있는 말과 똑같은 말을 쓰세요.** 화면에 "연습 모드"라고 쓰여 있으면 대화에서도 "연습 모드"입니다. `dryRun` 이라고 부르지 마세요.
6. **오래 걸리는 일은 미리 말하세요.** *"지금부터 3~5분쯤 걸립니다. 브라우저 창이 저절로 열리는데 닫지 말고 두세요."*
7. **선택지를 주지 말고 추천하세요.** 초보자는 고를 수 없습니다. 하나를 권하고 이유를 한 줄로 붙이세요.

### 절대 하지 말 것

| 하지 말 것 | 대신 |
|---|---|
| 에러 메시지를 통째로 붙여넣기 | **무슨 뜻인지 한 줄 + 어떻게 하면 되는지 한 줄** |
| *"Node.js를 설치하세요"* 로 끝내기 | 어디서 받는지, 다 됐는지 어떻게 확인하는지까지 |
| 사용자가 아는 걸 가정하기 | 터미널·폴더 경로·환경변수 — **모른다고 가정**하세요 |
| `selectors.ts`, DOM, iframe 같은 말 꺼내기 | 그건 당신이 알아서 할 일입니다. 말할 필요가 없습니다 |
| *"다 됐습니다"* 로 뭉뚱그리기 | **되는 것 / 아직 안 해본 것**을 나눠서 |

### 용어 바꿔 쓰기

| 쓰지 말 것 | 이렇게 |
|---|---|
| 터미널 / CLI | 명령어를 입력하는 창 (여는 법까지) |
| 의존성 설치 | 필요한 프로그램 내려받기 |
| dev 서버 실행 | 앱 켜기 |
| 세션 / storageState | 로그인 정보 |
| 환경변수 / `.env.local` | 열쇠(키)를 적어두는 파일 |
| dryRun | 연습 모드 |
| 셀렉터 / DOM / iframe | (말하지 마세요) |

> 상황별로 실제 어떻게 말하면 되는지는 **[8-6](#8-6--초보자에게-다음-단계를-알려주는-법)** 에 대사까지 있습니다.

---

## 0. 한 줄 요약

관심 키워드나 주제를 넣으면 **AI가 글감을 찾고 → 글을 쓰고 → 사진을 구하거나 만들고 → 네이버 블로그 에디터에 직접 타이핑해 발행까지** 끝내는 로컬 웹앱.

---

## 1. 만들 것

세 가지 작성 유형을 가진 로컬 대시보드입니다.

| 유형 | 입력 | 하는 일 |
|---|---|---|
| **자동 발굴** | 관심 키워드 | 네이버 뉴스·블로그를 긁어 트렌드를 읽고, 글감 5개를 만들어 1등을 골라 글을 씀 |
| **체험단** | 주제 + 핵심 내용 + 사진 | 1인칭 방문/사용 후기체로 씀 |
| **브랜딩·전문성** | 주제 + 핵심 내용 | 권위→실적→문제제기→프레임워크→반박제거→CTA 구조로 씀 |

세 유형 모두 사진 소스를 고를 수 있습니다: **내 사진 / 검색 크롤링 / AI 생성 / 없음**
(자동 발굴에는 '내 사진'이 없습니다 — 주제를 미리 모르므로.)

완성된 글은 **네이버 스마트에디터 ONE에 실제로 타이핑되어** 소제목·인용구·형광펜·구분선·이미지 서식까지 적용된 뒤 발행됩니다.

---

## 2. 절대 조건 (타협 불가)

이 다섯 가지는 이 프로젝트의 존재 이유입니다. 편의를 위해 바꾸지 마세요.

> **7장의 값들은 이 문서를 만든 사람이 살아 있는 에디터에서 클릭까지 확인한 것입니다.
> 리팩터링·정리·통합의 대상이 아닙니다.**
> 실제로 이 프롬프트를 받아 구현한 사람이 재확인했습니다 — 7-1(취소선), 7-5(인용구 탈출),
> 7-7(파일 선택창)이 없었다면 며칠을 태웠을 것이라고 했습니다.

### 2-1. AI 호출은 반드시 `claude -p` CLI로

Anthropic API 키를 쓰면 **종량 과금**이 됩니다. 이 앱은 사용자의 **Claude 구독요금제**로 돌아가야 합니다.
따라서 `@anthropic-ai/sdk` 를 쓰지 말고, 로컬에 설치된 `claude` CLI를 자식 프로세스로 실행하세요.

```
claude -p --output-format json     ← 프롬프트는 stdin 으로 전달
```

- 응답은 `{ type:"result", result:"...", is_error:false }` 형태 JSON. 본문은 **`.result` 필드**입니다.
  실제 응답에는 `usage`, `modelUsage`, `permission_denials`, `subagent_stats` 등 **필드가 20개 넘게 더 들어 있습니다.** 정상입니다 — `.result` 만 읽으면 되고, 모르는 필드가 많다고 파싱을 의심하지 마세요.
- 프롬프트를 argv로 넘기면 긴 한글에서 escaping이 깨집니다. **반드시 stdin**.
- **비전(이미지 판단)도 같은 방식으로 됩니다.** 프롬프트 끝에 `@/절대/경로/사진.jpg` 를 붙이면 claude가 이미지를 읽습니다. 프로젝트 밖의 절대경로도 동작합니다(검증됨).

### 2-2. 완전 로컬

DB(SQLite), 로그인 세션, 이미지, 스크린샷 전부 `./data/` 에. 외부로 나가는 건 네이버·구글 스크래핑과 (선택적) Cloudflare 이미지 생성뿐입니다.

### 2-3. 웹 자동화는 Playwright

`chromium.launch()` 가 "Executable doesn't exist" 로 실패하면 `npx playwright install chromium` 을 자동 실행하고 1회 재시도하세요.

### 2-4. 네이버 로그인은 자동화하지 않는다

보안문자·2차인증 때문입니다. **창을 띄워 사용자가 직접 로그인**하게 하고, `NID_SES` 쿠키가 생기면 `storageState` 를 저장해 재사용합니다.

### 2-5. 발행 안전장치를 반드시 넣는다

자동 발행은 계정 제재 위험이 있습니다. 기본값은 **안전 우선**:

- `연습 모드(dryRun)` 기본 **켜짐** — 발행하지 않고 완성 화면 스크린샷만 저장
- `전체 중단(killSwitch)` — 모든 발행 차단
- `하루 발행 수` 기본 3편
- `최소 발행 간격` 기본 30분

---

## 3. 기술 스택

```
Next.js 15 (App Router) + React 19 + TypeScript strict
better-sqlite3   — 로컬 DB
playwright       — 브라우저 자동화
zod              — AI 응답 구조 검증
```

- 개발 서버 포트는 **4123** (`next dev -p 4123`). 3000은 다른 프로젝트와 잘 부딪힙니다.
- `tsconfig.json` 의 `paths` 에 `"@/*": ["./*"]` 를 넣어 절대 import를 씁니다.
- 스타일은 **직접 쓴 CSS 하나**(`app/globals.css`)로 충분합니다. UI 프레임워크를 끌어오지 마세요.

> **⚠️ 검증 스크립트를 돌릴 방법을 처음에 마련하세요.**
> 9장은 "각 단계가 끝나면 실제로 실행해 확인하라"고 하는데, `@/*` 별칭 때문에 `node lib/x.ts` 가 그냥 안 됩니다.
> **둘 중 하나를 고르세요** — `tsx` 를 devDependency로 추가하거나, 20줄짜리 loader hook을 만들어
> `node --import ./scripts/register.mjs scripts/test-xxx.mts` 로 돌립니다.
> ("UI 프레임워크를 끌어오지 마세요"는 **런타임 의존성** 이야기입니다. 검증 도구는 여기 해당하지 않습니다 —
> 실제로 이 문장 때문에 구현자가 의존성 추가를 주저한 사례가 있습니다.)

---

## 4. 파일 구조

```
config.ts                    전역 기본값(환경변수로 오버라이드)
lib/
  claude.ts                  claude -p 래퍼 + JSON/Zod 검증 + 동시성 제한
  db.ts                      SQLite 싱글톤 + 스키마 + 마이그레이션
  settings.ts                런타임 설정(DB 저장, 범위 클램프)
  paths.ts                   data 디렉토리 보장 + 절대경로
  log.ts                     job_logs 기록
  playwright.ts              브라우저 실행 + chromium 자동설치
  types.ts                   Zod 스키마 전부
  pipeline.ts                전체 오케스트레이션
  localPhotos.ts             로컬 사진 목록·설명·배치
  naver/
    session.ts               로그인 창 + 세션 저장/검증
    publish.ts               ★ 에디터 작성·서식·발행 (가장 어려운 부분)
  scrape/
    selectors.ts             ★ 네이버 셀렉터 중앙 관리
    trends.ts                뉴스·블로그 수집
    images.ts                이미지 검색·다운로드·비전 채택
  ai/
    content.ts               글감·본문 생성 프롬프트
    templates.ts             체험단·브랜딩 유형별 프롬프트
    vision.ts                크롤링 이미지 판정(워터마크·초상권)
    imagegen.ts              AI 이미지 생성 3단계
    neurons.ts               Cloudflare 단가 계산(순수 함수)
    cfUsage.ts               사용량 조회(실측/추정)
app/
  layout.tsx  page.tsx  SettingsDrawer.tsx  globals.css
  api/
    status/  jobs/  jobs/[id]/  jobs/[id]/stream/
    naver/login/  naver/logout/  settings/  usage/  pick-folder/  file/
```

---

## 5. 데이터 모델 (SQLite)

```sql
settings   (key PK, value)                        -- 런타임 설정
jobs       (id, keyword, status, stage, auto, mode, inputs, error, created_at, updated_at)
sources    (id, job_id, type, title, summary, url, content, created_at)
ideas      (id, job_id, title, angle, rationale, chosen, created_at)
drafts     (id, job_id, idea_id, title, body_json, created_at)
images     (id, job_id, draft_id, query, src_url, local_path, source_site,
            verdict_ok, verdict_reason, section_index, gen_prompt, created_at)
posts      (id, job_id, draft_id, status, blog_url, screenshot, note, published_at, created_at)
job_logs   (id, job_id, level, message, created_at)
```

- `jobs.status`: `pending|scraping|writing|imaging|publishing|done|failed|canceled`
- `posts.status`: `pending|publishing|published|dry_run|failed|blocked`
- `images.source_site`: `naver|google|ai|local`
- `drafts.body_json`: 섹션 배열 JSON
- **`PRAGMA journal_mode = WAL`** 를 켜세요. SSE 폴링과 쓰기가 동시에 일어납니다.
- **`globalThis` 에 커넥션을 캐싱**하세요. Next.js dev의 HMR이 모듈을 여러 번 평가해 커넥션이 계속 늘어납니다.
- 스키마 변경은 `CREATE TABLE IF NOT EXISTS` + `PRAGMA table_info` 로 컬럼 존재를 확인해 `ALTER TABLE` 하는 방식으로. 기존 DB를 날리지 마세요.
- **⚠️ `datetime('now')` 는 UTC입니다.** 하루 한도·사용량 집계는 **로컬 날짜** 개념이므로 비교할 때 반드시 양쪽을 `localtime` 으로 변환하세요. → [7-22](#7-22-하루-한도가-시간대-때문에-샌다)

```sql
-- 틀림: UTC 날짜와 로컬 날짜를 비교한다
WHERE status='published' AND date(published_at)             = date('now','localtime')
-- 맞음
WHERE status='published' AND date(published_at,'localtime') = date('now','localtime')
```

---

## 6. 모듈별 상세 스펙

### 6-1. `lib/claude.ts` — AI 호출의 심장

```ts
export async function runClaude(
  prompt: string,
  opts?: { images?: string[]; system?: string },
): Promise<{ ok: true; text: string } | { ok: false; error: string }>
```

구현 요점:

1. **동시성 세마포어** — 설정값 `claudeConcurrency`(기본 2, 범위 1~6)만큼만 동시에 실행. claude 프로세스를 무제한으로 띄우면 머신이 죽습니다. 동시성은 **호출 시점에** `getSettings()` 에서 읽으세요(설정 변경이 즉시 반영되도록).
2. **타임아웃** — `claudeTimeoutSec`(기본 180초) 후 `SIGKILL`.
3. **이미지 첨부** — `opts.images` 를 `@경로` 로 변환해 프롬프트 끝에 공백 구분으로 붙입니다.
4. **stdin 전달** — `p.stdin.write(full); p.stdin.end();`
5. 응답 JSON 파싱 실패 시 raw stdout을 그대로 텍스트로 반환(폴백).

그리고 구조화 출력용 래퍼:

```ts
export async function runClaudeJson<T>(
  prompt: string, schema: z.ZodType<T>,
  opts?: { images?: string[]; system?: string; retries?: number },  // 기본 2회 재시도
)
```

- 시스템 프롬프트에 `"반드시 유효한 JSON 만 출력하라. 설명/마크다운/코드펜스 없이 JSON 객체 또는 배열만 반환하라."` 를 강제로 덧붙입니다.
- 응답에서 JSON을 추출할 때: ① ```` ```json ... ``` ```` 펜스를 먼저 찾고, ② 없으면 첫 `{` 또는 `[` 부터 마지막 짝 문자까지 잘라냅니다. AI는 지시해도 앞뒤에 말을 붙입니다.
- Zod 검증 실패도 재시도 사유입니다.

`checkClaude()` 로 `claude --version` 을 실행해 CLI 설치·로그인 여부를 대시보드에 표시하세요.

**⚠️ 구독 한도가 있습니다.** 크롤링 사진 판정은 자리 하나당 최대 `imageCandidates` 회 호출하므로,
자리 7개짜리 글 한 편에 **최대 70회**가 나갈 수 있습니다. 실제로 한도에 걸린 사례가 있습니다:

```
판정 실패: You've hit your session limit · resets 6pm (Asia/Seoul)
```

개발 중에는 `imageCandidates` 를 3~4로 낮추고, **사진 없이(`none`) 또는 AI 생성으로 파이프라인을
먼저 완성한 뒤** 크롤링을 붙이세요.

**⚠️ 윈도우**: npm 전역 바이너리는 `claude.cmd` 셸 심(shim)으로 깔리고, Node의 `spawn` 은
`.cmd` 를 직접 실행하지 못해 `ENOENT` 로 죽습니다.

```ts
const isWin = process.platform === "win32";
spawn(bin, ["-p", "--output-format", "json"], { shell: isWin });
```

**이 앱은 `shell: true` 를 써도 안전합니다** — 프롬프트를 argv가 아니라 **stdin으로 넘기기 때문에**
argv에는 `-p --output-format json` 밖에 없고 셸 인용부호 문제가 생길 여지가 없습니다.
("반드시 stdin" 결정이 여기서 한 번 더 값을 합니다.)
실패하면 `claude.cmd`/`claude.exe` 를 명시 시도하고, 그래도 안 되면 설치 경로를 직접 지정하는
설정(`CLAUDE_BIN`)을 제공하세요. (윈도우 동작은 **미검증**입니다.)

---

### 6-2. `lib/playwright.ts`

```ts
newContext({ headless, useNaverSession }) → { browser, context }
```

- 컨텍스트 옵션: `viewport 1366×900`, `locale "ko-KR"`, 데스크톱 Chrome User-Agent.
- `useNaverSession` 이면 저장된 `storageState` 파일을 입힙니다.
- chromium 미설치 자동 복구: launch 에러 메시지가 `/Executable doesn'?t exist|please run|install/i` 에 걸리면 설치 후 1회 재시도. 설치 Promise는 **모듈 레벨에 캐싱**해 중복 설치를 막으세요.

---

### 6-3. `lib/naver/session.ts`

**로그인** (`loginInteractive`)
- `headless: false` 로 창을 띄우고 `https://nid.naver.com/nidlogin.login` 로 이동.
- 1초 간격으로 `context.cookies()` 를 확인해 **`NID_SES`** 쿠키가 생기면 성공. 최대 5분 대기.
- 사용자가 창을 닫으면(`page.isClosed()`) 즉시 중단.
- 성공 시 `naver.com` 으로 한 번 이동해 쿠키를 안정화한 뒤 `storageState({path})` 저장.
- 동시 로그인 창 방지 플래그(`loginInFlight`)를 두세요.

**세션 검증** (`verifySession`) — ⚠️ 여기가 함정입니다. [7-9, 7-10](#7-함정-목록--모르면-반드시-막힌다) 을 반드시 읽으세요.
- 1단계: `blog.naver.com/MyBlog.naver` 로 이동 → `nid.naver.com` 으로 튕기면 만료. 튕기지 않으면 URL에서 blogId 추출.
- 2단계: `blog.naver.com/{blogId}?Redirect=Write&categoryNo=0` 까지 열어봅니다. **여기서 튕기면 "글쓰기 권한 만료"** — 읽기는 되는데 쓰기가 안 되는 상태가 실제로 존재합니다.
- 검증은 브라우저를 띄우므로 **TTL 5분 캐시**를 두고, 로그인 직후엔 `invalidateSessionCache()` 로 무효화하세요.

---

### 6-4. `lib/scrape/trends.ts` — 수집

- 뉴스: `search.naver.com/search.naver?where=news&query=…&sort=1`
- 블로그: `search.naver.com/search.naver?where=blog&query=…`

**셀렉터에 의존하지 마세요.** 네이버 검색 DOM은 자주 바뀝니다. `page.evaluate` 안에서 **모든 `a[href]` 를 훑는 일반 추출**로 구현합니다:

- 뉴스는 href에 `news.naver.com` / `/news/` / `n.news` 중 하나 포함
- 블로그는 href가 **게시글 패턴** `blog\.naver\.com\/[^/]+\/\d{6,}` 에 정확히 매칭 (블로그 홈 링크를 걸러내기 위해)
- 링크 텍스트 8자 미만 제외, `광고|로그인|더보기|바로가기|언론사 선정|구독` 텍스트 제외
- 요약은 `a.closest("li, div")` 의 텍스트에서 링크 텍스트를 뺀 나머지 260자
- **⚠️ `href` 에 `/news/` 포함 조건에 네이버 고객센터가 걸립니다.** [7-1](#7-1-has-text취소-가-취소선-버튼을-누른다-최악)·[7-2](#7-2-has-text발행-이-예약-발행-0건-을-누른다)와 **같은 부분일치 계열**입니다.
  ```
  https://help.naver.com/alias/news/news_21.naver
  → "뉴스 기사와 댓글로 인한 문제 발생시 24시간 센터로 접수해주세요" 가 AI 자료로 들어감
  ```
  `help.naver.com` / `/alias/` 를 제외 목록에 넣으세요.
- 링크 텍스트에서 **`새 ?창 ?열림`** 을 **먼저 제거한 뒤** 길이·노이즈 필터를 적용하세요. 스크린리더용 보조 텍스트인데 11자라서 길이 필터를 그냥 통과합니다(`네이버뉴스새 창 열림` 같은 항목이 남습니다).
- 같은 기사가 **[제목 링크] + [본문 스니펫 링크]** 로 두 번 잡힙니다. **URL당 하나만 남기되 제목이 더 짧은 쪽**을 고르세요(스니펫은 길고 문장형입니다). 같은 기사가 두 번 들어가면 AI 프롬프트가 오염됩니다.
- 제목 앞 40자를 키로 중복 제거, 상위 `scrapeTopN`(기본 8)개

---

### 6-5. `lib/ai/content.ts` + `lib/ai/templates.ts` — 글쓰기

**섹션 모델** — 글은 문자열이 아니라 섹션 배열입니다.

```ts
heading   { text }
paragraph { text, highlight? }   // highlight: text 안에 글자 그대로 있는 핵심 구절
quote     { text }
divider   { }
image     { query, caption? }
```

`highlight` 는 에디터에서 **형광펜(노랑) + 굵게**로 처리됩니다. AI에게 "문단당 최대 1개, 전체 문단의 30% 정도만" 이라고 지시하세요.

**자동 발굴 모드 2단계**
1. `generateIdeas(keyword, sources, 5)` — 수집 자료를 번호 매긴 텍스트 블록(각 400자)으로 압축해 프롬프트에 넣고, 제목·관점(angle)·근거(rationale)를 받습니다.
2. `generateDraft(keyword, idea, sources)` — 1등 글감으로 본문 작성.

본문 프롬프트에 **반드시** 넣을 지시:
- 수집 자료를 참고하되 문장을 그대로 베끼지 말 것
- 사람이 쓴 듯한 구어체, AI 티 나는 표현 금지
- 도입(공감/후킹) → 본문(소제목 2~4구획) → 마무리(요약/행동유도)
- **이미지 자리를 6~8개** 배치 (일부는 적합 사진을 못 찾으므로 넉넉히)
- 이미지 검색어는 **사람 얼굴이 주인공이 아닌** 사물·풍경·클로즈업·손동작 위주
- **마크다운 기호(`**`, `~~`, `~`, `#`, `>`, 백틱, `-` 목록)를 절대 쓰지 말 것** → [7-8](#7-8-스마트에디터가-마크다운을-자동-변환한다) 참조

그리고 Zod에 `.refine()` 으로 **이미지 섹션 6개 이상**을 강제하세요. 부족하면 `runClaudeJson` 이 자동 재시도합니다.

> **⚠️ 이 refine을 모든 모드에 적용하지 마세요.** 사진 소스가 **`local`(내 사진)** 이면 사진이 4장뿐일 수 있고,
> 그러면 6개는 애초에 만들 수 없어 재시도만 3번 돌다 실패합니다. **소스별로 스키마를 분기하세요:**
> - `crawl` / `ai` → 이미지 섹션 **6개 이상**
> - `local` → **정확히 사진 장수만큼**
> - `none` → 이미지 섹션 **0개**

**⚠️ AI는 본문에 없는 `highlight` 를 지어냅니다** — 실측 5개 중 1개(20%). 형광펜은 `text.indexOf(highlight)` 로 자리를 찾으므로 그대로 두면 서식이 엉뚱한 곳에 붙습니다.

```
text     : "…옆 사이트는 한 시간째 폴대와 씨름 중이더라고요. 그때 확신했습니다."
highlight: "예쁜 것보다 빨리 펴지는 게 훨씬 중요합니다"   ← 본문에 없음(AI가 결론을 지어냄)
```

생성 직후 **`sanitizeDraft()`** 를 통과시켜, `highlight` 가 같은 문단 `text` 안에 글자 그대로 없으면 **그 highlight만 떨어뜨리고 몇 개를 버렸는지 로그에 남기세요.**

> **⚠️ highlight 를 Zod `.refine()` 으로 초안 전체 반려 사유로 삼지 마세요.**
> 문단 30개짜리 글을 highlight 하나 때문에 버리는 건 나쁜 거래입니다(생성에 100초가 듭니다).
> **이미지 자리 개수는 재생성할 가치가 있지만 highlight는 아닙니다.**

타이핑 직전에도 **한 번 더** `indexOf` 로 확인하고, 못 찾으면 형광펜을 생략하세요(이중 방어).

**유형별 모드 프롬프트** (`templates.ts`)

두 유형 모두 공통으로:
- **소제목을 `heading` 이 아니라 `quote` 로** 만듭니다. 실제 상위 노출 블로그들의 문법이 그렇습니다. quote는 짧은 한 줄(15~30자).
- 문단은 2~4줄로 짧게.

*체험단*: 철저히 1인칭("저희는", "~했어요", "~더라구요"), "ㅎㅎ" "진짜" 같은 표현 자연스럽게, 도입에서 결론을 살짝 흘리기, 실용정보를 구획별로(가는 법/웨이팅/가격/언제 갈지/주의점), 문단 1~2개마다 사진 1장 리듬, 마무리는 총평+다시 간다면의 팁.

*브랜딩*: "~입니다" 전문가체. 구조 고정 — ① 권위 선점(숫자 실적) ② 독자의 문제/오해 짚기 ③ 왜 그 방법이 안 통하는지 ④ **이름 붙인 자체 프레임워크** ⑤ 예상 반박 Q&A ⑥ 정리 + 행동 유도. 구획 전환에 divider 1~2회. **숫자를 지어내지 말 것 — 사용자가 준 내용 안에서만.**

`photoHintFor(photoSource, count, descs?)` 로 사진 소스별 안내문을 프롬프트에 붙입니다:
- `none` → image 섹션을 만들지 마라
- `local` → 정확히 N개 만들고, query에는 검색어가 아니라 **"그 자리에 어떤 사진이 와야 하는지 설명"**. 사용 가능한 사진 목록도 함께 제시
- `ai` → query에 **"어떤 장면을 그려야 하는지 한국어로 구체 묘사"**
- `crawl` → query에 검색어

---

### 6-6. `lib/scrape/images.ts` + `lib/ai/vision.ts` — 크롤링 사진

한 자리(query)당: 네이버 이미지 검색 → 실패 시 구글 → 후보를 하나씩 다운로드 → **AI가 직접 보고 판정** → 첫 통과 이미지 채택.

후보 수집: `page.evaluate` 로 `img` 전부 훑되 `naturalWidth < 120` 제외, `/sprite|logo|icon|blank|\.svg/i` 제외, 중복 제거 후 `imageCandidates`(기본 10)개. lazy 로딩 유도를 위해 `mouse.wheel(0, 2200)` 한 번.

다운로드는 `context.request.get()`. **3000바이트 미만이면 버립니다**(아이콘/깨진 이미지).

**비전 판정은 세 축을 따로 묻습니다:**

```ts
{ fit: boolean, watermark: boolean, koreanPerson: boolean, reason: string }
```

- `watermark` — 워터마크/사이트 로고/저작권 표기/서명/스톡 출처표시가 **조금이라도** 보이면 true. 의심스러우면 true.
- `koreanPerson` — 한국인 얼굴이 식별 가능하면 true (**초상권 위험**). 얼굴이 안 보이거나(뒷모습·손·실루엣) 명백한 외국인 스톡이면 false. **애매하면 true**(안전한 쪽으로).
- `fit` — 위 둘이 문제없다는 전제에서 주제·위치에 어울리는가.

그리고 코드에서 **`watermark || koreanPerson` 이면 `fit` 을 강제로 false** 로 덮어쓰세요. AI가 fit=true로 답해도 무시해야 합니다.

**⚠️ 판정 호출이 실패했을 때 그 이미지를 채택하지 마세요.** `{ fit:false, reason:"판정 실패: …" }` 로 처리해야 claude 한도 초과가 "검증 안 된 이미지 통과"로 이어지지 않습니다.

**⚠️ 크롤링 채택률은 생각보다 훨씬 낮습니다.** 한 실측에서 네이버 이미지 검색 후보 **3장이 전부 워터마크로 탈락**했습니다
(네이버페이 배너 / 손글씨 서명 / 브랜드 로고 합성 썸네일). 즉 **`imageCandidates` 를 낮추면 그 자리가 그냥 빕니다.**
claude 한도와 이미지 확보율이 정면으로 상충하므로, 개발 중에는 낮추되 **실사용에서는 10 이상**을 권하고,
자리가 비는 것을 전제로 이미지 섹션을 넉넉히(6~8개) 배치하는 [6-5](#6-5-libaicontentts--libaitemplatests--글쓰기)의 지시가 그래서 중요합니다.

**탈락한 이미지도 DB에 기록하세요** — `verdict_ok=0` + 탈락 사유(`워터마크` / `국내 인물(초상권)` / `주제 불일치`). 워터마크·초상권 필터가 실제로 동작하는지 사용자가 확인할 **유일한 통로**입니다.

---

### 6-7. `lib/ai/imagegen.ts` — AI 이미지 생성 (Cloudflare Workers AI)

저작권·워터마크·초상권 문제가 **원천적으로 없고**, 크롤링보다 주제 적합도가 높습니다. 3단계:

**① `claude -p` 가 영문 프롬프트를 설계**

글 제목 + 그 자리의 캡션 + **앞뒤 문단 맥락(±3섹션에서 2개, 400자)** 을 주고 FLUX용 영문 프롬프트를 받습니다.

프롬프트 작성 규칙(고정):
- 영어, 한 문단, 40단어 이내
- 피사체 / 구도 / 조명 / 배경 / 질감을 명시
- 스타일 토큰 필수 포함:
  - `photo`: `photorealistic photograph, natural lighting, shallow depth of field, 50mm lens, high detail`
  - `illust`: `clean flat vector illustration, simple shapes, soft muted color palette, minimal, lots of white space`
- 끝에 반드시: `no text, no letters, no words, no watermark, no logo`
- 실존 인물·유명인·브랜드 로고 금지
- 사람이 필요하면 얼굴이 크게 안 나오는 구도(손·뒷모습·실루엣)
- 한국적 맥락은 반영하되 **한글 간판은 넣지 말 것** (생성 모델이 한글을 깨뜨립니다)

**② 생성**

```
POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell
Authorization: Bearer {API_TOKEN}
body: { prompt, steps }          // steps 최대 8
→ { result: { image: "<base64>" } }
```

**응답은 바이너리가 아니라 base64 JSON입니다.** `Buffer.from(b64, "base64")` 로 디코드해 저장하세요.
(SDXL 계열은 바이너리를 주므로 `content-type` 으로 분기해 두면 모델 교체가 쉽습니다.)
2000바이트 미만이면 생성 실패로 처리. 타임아웃 90초.

**③ 검증 — 크롤링용 판정함수를 재사용하지 마세요**

생성물에는 워터마크도 초상권도 없습니다. 별도 함수로 **"주제 불일치 / 형태 깨짐 / 글자 혼입 / 저품질"** 네 가지만 봅니다.
부적합하면 **그 이유를 프롬프트 설계에 되먹여 1회만 재생성**하고, 그래도 실패하면 그 자리는 건너뜁니다. (무한 루프 금지)

> **실측 관찰**: 계기판·다이얼·눈금이 있는 사물은 실사(photo) 생성 성공률이 낮습니다(7자리 중 4장 채택).
> 같은 글을 일러스트(illust)로 돌리면 5/5 통과했습니다. 재생성 루프가 `'Wmt13'`, `'HUMIDETRICE'` 같은 깨진 글자를 실제로 잡아냈습니다.

**단가 계산** (`lib/ai/neurons.ts` — 서버·클라이언트 공용 순수 함수)

```ts
neuronsPerImage(steps, size = 1024) {
  const tiles = Math.max(1, Math.round((size / 512) * (size / 512)));
  return tiles * (4.8 + Math.min(Math.max(steps, 1), 8) * 9.6);
}
```

**⚠️ 반환값은 정수가 아닙니다** (6스텝 = **249.6**). 표의 `250` 은 반올림값입니다.
계산은 실수로 하되 **화면에 표시할 때만 `Math.round()`** 하세요. 안 그러면 계량기에 소수점이 뜹니다.

⚠️ **스텝 요금은 이미지 1장이 아니라 타일마다 붙습니다.** [7-12](#7-12-뉴런-단가-공식) 참조. 무료 한도는 하루 10,000뉴런.

---

### 6-8. `lib/localPhotos.ts` — 내 사진 쓰기

- 폴더를 읽어 `.jpg .jpeg .png .webp .heic` 만, **파일명 자연순 정렬**(`localeCompare(a,b,"ko",{numeric:true})`). `~` 는 `$HOME` 으로 확장.
- **사용자가 직접 찍은 사진이므로 워터마크·초상권 필터를 적용하지 않습니다.**
- 배치 방식 두 가지:
  - `order` — 글 흐름 순서대로 순차 배치
  - `ai` — 사진마다 claude로 한 줄 설명(30자)을 만들고, 그 설명과 각 자리의 캡션을 매칭. **매칭 실패·누락분은 순서대로 채우는 폴백**을 반드시 두세요.
- 사진 설명은 **본문 생성 전에 한 번만** 만들고 그 결과를 프롬프트와 배치에 재사용하세요. 두 번 만들면 claude 호출이 배로 듭니다.

---

### 6-9. `lib/naver/publish.ts` — ★ 에디터 자동화

**여기가 이 프로젝트의 90%입니다.** 7장 함정 목록을 먼저 읽고 오세요.

진입: `https://blog.naver.com/{blogId}?Redirect=Write&categoryNo=0`
에디터는 **`iframe#mainFrame` 안**에 있습니다. `page.frameLocator("iframe#mainFrame")` 로 접근하세요.

**진입 직후 순서 (이 순서를 바꾸면 발행이 실패합니다)**

1. `page.on("filechooser")` **영구 핸들러 등록** — 페이지 열기 **전에**
2. 에디터 진입, 2.5초 대기
3. **'작성 중인 글이 있습니다' 복원 팝업 처리** — 있으면 '취소'로 닫아 새 글 시작. 못 닫으면 스크린샷 남기고 명확히 실패 처리(팝업이 떠 있으면 입력 자체가 안 됩니다)
4. **도움말/온보딩 패널 닫기**
5. 제목 입력 → **본문 클릭** → 섹션 순차 입력
   ⚠️ **본문 영역을 못 찾으면 Enter로 한 번 더 시도하고, 그래도 못 찾으면 스크린샷을 남기고 즉시 실패 처리하세요.**
   그냥 진행하면 **글 전체가 제목 칸에 들어갑니다** — 에러도 안 나고 스크린샷을 봐야만 압니다([7-26](#7-26-본문-영역을-못-찾으면-글-전체가-제목-칸에-들어간다))
6. **도움말 패널 + 오버레이 도크 닫기** ← ⚠️ 스크린샷 **앞**
7. **발행 직전 전체 스크린샷 저장** — 뷰포트를 키워서 찍습니다([7-20](#7-20-에디터-iframe은-뷰포트-높이를-그대로-따라간다))
8. 연습 모드면 여기서 종료
9. **다시 한 번 닫기** ← ⚠️ 스크린샷 **뒤**. 스크린샷 이후 재차 열렸을 수 있습니다
10. 발행 버튼 클릭
11. **공개 범위 선택 + `input.checked` 로 확인** ← ⚠️ 빠뜨리면 전체공개로 나갑니다([7-19](#7-19-공개-범위-라디오는-opacity0-이라-클릭되지-않는다))
12. 최종 확인 버튼
13. **실제 발행 검증** — URL이 게시글 주소로 바뀌는지 확인

> **⚠️ 오버레이 닫기를 스크린샷 앞뒤로 두 번** 하는 이유: **사진을 넣으면 우측 "라이브러리" 도크가
> 자동으로 열려** 본문 오른쪽을 덮습니다. 그 상태로 스크린샷이 찍히면 연습 모드의 유일한 산출물이
> 쓸모없어집니다.
>
> **⚠️ 이 도크의 클래스는 환경에 따라 다릅니다. 두 계열을 모두 닫으세요.**
> ```
> ① 도움말 계열:   .se-help-panel-close-button
> ② 사이드바 계열: .se-sidebar-close-button
>                  (ASIDE.se-sidebar / DIV.se-sidebar-container-library, 300×795)
> ③ 어느 쪽도 없으면 Escape
> ```
> 한 환경에서는 ①로 함께 닫혔지만, 다른 환경에서는 사진 삽입 직후 `.se-help-panel-close-button` 이
> **0개**이고 `.se-sidebar-close-button` 만 있었습니다([7-21](#7-21-사진을-넣으면-우측-도크가-열려-본문을-덮는다)).

**셀렉터 (실제 에디터에서 클릭 검증 완료 — 그대로 쓰세요)**

```ts
frame:            "iframe#mainFrame"
restorePopup:     [".se-popup-container", ".se-popup-dialog", ".se-popup", "[class*='popup_container']"]
restoreCancel:    ["button.se-popup-button-cancel", ".se-popup-button-cancel",
                   ".se-popup-container button:text-is('취소')", ...]   // ⚠️ 7-1 참조
title:            [".se-section-documentTitle .se-text-paragraph", ".se-documentTitle .se-text-paragraph", ".se-title-text"]
body:             [".se-section-text .se-text-paragraph", ".se-component-content .se-text-paragraph", ".se-main-container"]
imageButton:      ["button.se-image-toolbar-button", "button[data-name='image']",
                   "button[data-log='sti.image']", "button.se-toolbar-item-image"]
helpPanel:        [".se-help-container", ".se-help-panel"]
helpClose:        [".se-help-panel-close-button", ".se-help-header button"]
popupDim:         [".se-popup-dim"]

textFormatOpen:   [".se-text-format-toolbar-button"]
optHeading:       [".se-toolbar-option-text-format-sectionTitle-button"]
optBody:          [".se-toolbar-option-text-format-text-button"]
optQuote:         [".se-toolbar-option-text-format-quotation-button"]
dividerInsert:    [".se-insert-horizontal-line-default-toolbar-button"]
bold:             [".se-bold-toolbar-button"]
bgColorOpen:      [".se-background-color-toolbar-button"]
bgColorYellow:    ["button[title='#fff8b2']", ".se-color-palette[title='#fff8b2']"]
bgColorNone:      [".se-color-palette-no-color"]
contentComponents:[".se-content .se-component"]

publishOpen:      ["button[data-click-area='tpb.publish']", "button.publish_btn__m9KHH"]
publishConfirm:   ["button[data-click-area='tpb*i.publish']", "button.confirm_btn__WEaBq"]

// 공개 범위 — ⚠️ radio input 은 opacity:0 이라 클릭되지 않는다. label 을 눌러라
visibility: {
  public:   { label: 'label[for="open_public"]',        input: "#open_public" },   // value=2 (네이버 기본값)
  neighbor: { label: 'label[for="open_neighbor"]',      input: "#open_neighbor" },
  both:     { label: 'label[for="open_both_neighbor"]', input: "#open_both_neighbor" },
  private:  { label: 'label[for="open_private"]',       input: "#open_private" },  // value=0
}
caption:          [".se-caption"]                      // 펼쳐지면 se-is-on 이 붙는다
imageComponent:   [".se-content .se-component.se-image"]

// 우측 도크 — ⚠️ 환경에 따라 계열이 다르다. 둘 다 시도하라
sidebarClose:     [".se-help-panel-close-button", ".se-sidebar-close-button"]
sidebar:          [".se-sidebar", ".se-sidebar-container-library"]

// 하단 글감 검색바 — 여기로 타이핑이 샌다 (7-6)
bottomToolbar:    [".se-flayer-unified-toolbar-wrapper"]
bottomSearchInput:[".se-flayer-unified-search-input"]
```

각 항목은 **후보 배열**입니다. 위에서부터 `isVisible` 인 첫 번째를 클릭하는 헬퍼를 만드세요.

> **⚠️ `clickAnywhere`(iframe 안 → 바깥 문서 순으로 탐색)는 선택이 아니라 필수입니다.**
> **발행 버튼과 공개 범위 라디오가 어느 쪽에 있는지는 환경에 따라 다릅니다.**
> 이 문서를 쓴 환경에서는 iframe 밖이었고, 프롬프트를 받아 구현한 사람의 환경에서는 iframe 안이었습니다.
> **반드시 두 곳을 모두 뒤지세요.**

**섹션 타입별 입력 방법**

| 타입 | 방법 |
|---|---|
| `heading` | 문단서식 드롭다운 → 소제목 → 타이핑 → Enter → **본문으로 복귀** |
| `paragraph` | `highlight` 가 있으면 [앞부분] → 형광펜 ON + 굵게 ON → [강조구절] → 둘 다 OFF → [뒷부분]. 끝에 Enter 2번 |
| `quote` | 타이핑 → `Shift+Home` 으로 그 줄 선택 → 문단서식 인용구 → **`exitToNewParagraph()`** |
| `divider` | 구분선 컴포넌트 삽입 → **`exitToNewParagraph()`** |
| `image` | 아래 **캡션 절차**를 따르세요. 그냥 타이핑하면 캡션이 본문 줄이 됩니다 |

**이미지 + 캡션 절차** — ⚠️ 여기가 실제로 결함이 나온 지점입니다([7-18](#7-18-사진-캡션-칸은-업로드-직후-크기가-0이다))

1. `pendingUpload.path` 설정 → 이미지 버튼 클릭 → 영구 핸들러가 처리 → 완료 폴링(최대 20초) → **2.6초 대기**
2. **방금 넣은(=마지막) 이미지 컴포넌트를 클릭** — `.se-content .se-component.se-image` 의 `.last()`
   ⚠️ 캡션 칸은 업로드 직후 **크기가 0×0** 이라 곧바로 클릭할 수 없습니다. 이 클릭이 펼쳐줍니다.
   **⚠️ 크기 숫자를 판정 기준으로 쓰지 마세요** — 환경에 따라 `640×24` 이기도 `64×63` 이기도 합니다.
   **`.se-caption` 에 `se-is-on` 클래스가 붙는 것**이 "펼쳐졌다"의 안정적인 신호입니다.
3. 그 컴포넌트 안의 `.se-caption` 을 클릭하고 캡션을 타이핑
4. 캡션도 컴포넌트 안입니다 — **[7-5](#7-5-인용구가-다음-문단을-통째로-삼킨다)의 마우스 클릭 탈출을 여기서도** 해야 다음 문단이 캡션에 붙지 않습니다

`el.focus()` 로 우회하려 하지 마세요. `activeElement` 가 바뀌지 않아 글자가 사라집니다.

> **폴백 사다리**
> ① 위 순서대로 시도
> ② `.se-caption` 이 끝내 안 보이면 **캡션을 포기하고 경고 로그를 남깁니다.** 본문에 그냥 타이핑하면 사진 설명이 아니라 본문 줄이 되고 다음 문단과 합쳐지므로, 넣는 것보다 빼는 게 낫습니다
> ③ 이미지 자체는 이미 들어갔으므로 발행은 계속 진행
>
> **확인법**: 발행 후 `.se-caption` 의 클래스에 `se-is-empty` 가 남아 있으면 실패한 것입니다.

**발행 직전 스크린샷** — ⚠️ `fullPage: true` 만으로는 **마지막 한 화면(900px)밖에 안 담깁니다**

0. **⚠️ 모든 `boundingBox()` 에 `{ timeout: 800 }` 을 주세요.** 요소가 없으면 Playwright 기본 **30초**를 기다립니다. 탈출 클릭이 여러 번 있는 글에서 실행이 44초 → 5분 초과로 늘어난 사례가 있습니다([7-27](#7-27-boundingbox-는-요소가-없으면-30초를-기다린다)). 같은 값을 반복해 재지 말고 **한 번 재서 재사용**하세요.
1. `.se-content` 의 **`scrollHeight`** 를 읽습니다 — `locator.evaluate(el => el.scrollHeight)`
   ⚠️ `boundingBox().height` 로 계산하지 마세요. 실측 **761 vs 3637**, 5배 차이입니다
2. 뷰포트 높이를 `본문 상단 y + scrollHeight + 160` 으로 키웁니다(상한 9000)
3. 1.2초 기다린 뒤 `fullPage: true` 로 촬영
4. **뷰포트를 원래대로 되돌립니다**

> **폴백 사다리**
> ① 위 방식
> ② iframe 문서가 자체 스크롤을 갖는 환경(문서 `scrollHeight > clientHeight`)이면 스크롤 컨테이너를 최상단으로 올린 뒤 한 화면씩 여러 장 찍어 `-1`, `-2` 로 나눠 저장
> ③ 어느 쪽도 안 되면 보이는 화면이라도 저장하고 **"스크린샷이 일부만 담겼다"고 로그에 명시**

**공개 범위 선택** — ⚠️ **네이버 발행 레이어의 기본값은 전체공개입니다**

발행 버튼을 누른 뒤, 최종 확인 **전에** 공개 범위를 고릅니다.

1. `label[for="open_private"]` 등 **label을 클릭** (radio input은 `opacity:0` 이라 클릭 안 됩니다)
2. **`input.checked` 를 직접 읽어 확인**
3. 확인되지 않으면 **발행하지 말고 중단**

> **폴백 사다리**
> ① label 클릭 → `input.checked` 확인
> ② 라디오를 못 찾으면(레이어 구조가 다르면) **발행하지 말고** `failed` 로 남기고 "공개 범위를 확인할 수 없어 중단했다"고 정확히 보고
> ③ **절대 "일단 발행하고 나중에 바꾸자"로 가지 마세요** — 되돌릴 수 없습니다
>
> 이 가드는 실제 구현에서 한 번 발동해 발행을 막았습니다. **없었으면 첫 글이 공개로 나갔을 것입니다.**

- 인라인 서식(형광펜·굵게)은 **클릭 이후 새로 입력되는 글자**에 적용됩니다(실측 확인). 선택 후 적용이 아닙니다.
- 서식 클릭 사이에 250~450ms 대기를 넣으세요. 드롭다운 애니메이션이 있습니다.
- 타이핑은 `page.keyboard.type(text, { delay: 6~8 })`.
- 유형별 모드(체험단·브랜딩)는 `headingAsQuote: true` 로 넘겨 `heading` 도 인용구로 처리합니다.

**발행 가드** — 연습 모드가 아닐 때만 검사:
kill-switch / 오늘 발행 수 ≥ 한도 / 마지막 발행 후 경과 < 최소 간격 → `blocked` 로 즉시 반환.

---

### 6-10. `lib/pipeline.ts` — 오케스트레이션

```
auto:   수집 → 글감 → 본문 → (크롤링|AI생성|없음) → 발행
유형별:  (로컬사진 목록·설명) → 본문 → (로컬|크롤링|AI생성|없음) → 발행
```

> **⚠️ 이미지 채우기 함수는 `photoDescs` 를 인자로 받아야 합니다. 내부에서 만들지 마세요.**
> ```ts
> fillImages(jobId, draftId, draft, { photoSource, imageStyle, photos, photoDescs })
> ```
> 본문 생성 단계에서 만든 사진 설명을 그대로 넘겨 재사용합니다. 인자로 받지 않으면 이미지 단계에서
> 다시 만들게 되고 **claude 호출이 배로 듭니다.** (6-8이 이걸 경고하는데도, 파이프라인 구조가
> 그 실수를 유도합니다 — 실제 구현자가 처음에 그렇게 짰습니다.)

- `runJob(jobId)` 은 **fire-and-forget**. API 라우트에서 `await` 하지 말고 `.catch(console.error)` 만 붙여 즉시 응답하세요. 진행 상황은 SSE로 봅니다.
- 각 단계마다 `setJobStage()` 로 status/stage를 갱신하고 `jobLog()` 로 로그를 남깁니다.
- **발행 단계에 15분 상한**을 `Promise.race` 로 걸으세요. 에디터가 멈추면 잡이 영원히 `publishing` 으로 남습니다.
- 결과는 `posts` 테이블에 기록. `published` 일 때만 `published_at` 을 채웁니다(발행 한도 계산의 근거).

---

### 6-11. `lib/settings.ts` — 런타임 설정

10개 항목. `config.ts`/환경변수는 **최초 기본값**으로만 쓰이고 이후엔 DB 값이 우선합니다.

| 키 | 기본 | 범위 |
|---|---|---|
| `dryRun` | true | — |
| `killSwitch` | false | — |
| `visibility` | **`private`** | public / neighbor / both / private |
| `dailyPublishLimit` | 3 | 1~50 |
| `minPublishIntervalMin` | 30 | 0~720 |
| `scrapeTopN` | 8 | 3~30 |
| `imageCandidates` | 10 | 3~20 |
| `cfImageSteps` | 6 | 1~8 |
| `showBrowser` | false | — |
| `claudeTimeoutSec` | 180 | 30~900 |
| `claudeConcurrency` | 2 | 1~6 |

- 범위를 벗어난 값은 **저장 시 서버가 잘라냅니다**(클램프). UI에서 막지 말고 서버에서 보정하세요 — 입력 중에는 자유롭게 두는 게 편합니다.
- `LIMITS` 를 API로 내려보내 UI가 같은 규칙을 쓰게 하세요.
- **`visibility` 기본값은 반드시 `private`(비공개)** 로 두세요. 12장이 "첫 실발행은 비공개 테스트 글로"라고 지시하는데, 기본값이 전체공개면 그 지시를 지킬 방법이 없습니다.
- `resetSettings()` — settings 테이블을 비우면 전부 기본값으로 돌아갑니다.

---

### 6-12. API 라우트

전부 `runtime = "nodejs"`, `dynamic = "force-dynamic"`.

| 경로 | 하는 일 |
|---|---|
| `GET /api/status` | claude 설치·네이버 세션 유효성·Cloudflare 키 설정 여부·현재 설정. `?refresh=1` 로 세션 캐시 무효화 |
| `GET/POST /api/jobs` | 목록 / 생성+실행. **진행 중 잡이 있으면 409** 로 막습니다(중복 제출 방지) |
| `GET /api/jobs/[id]` | 잡 + 글감 + 초안 + 이미지 + 결과 한 번에 |
| `GET /api/jobs/[id]/stream` | **SSE**. `job_logs` 를 1초 폴링해 새 줄만 전송. 잡이 끝나면 `end` 보내고 닫습니다 |
| `POST /api/naver/login` | 로그인 창. `maxDuration = 600` 필수 |
| `GET/POST /api/settings` | 설정 조회/변경(+`reset`). 알 수 없는 키는 400 |
| `GET /api/usage` | 뉴런 사용량 + 오늘 발행 수 |
| `POST /api/pick-folder` | **네이티브 폴더 선택창** — [7-14](#7-14-브라우저는-폴더의-절대경로를-주지-않는다) |
| `GET /api/file?path=` | `./data` 내부 파일만 서빙. **경로 탈출 방지 필수** (`resolve` 후 `startsWith(dataRoot + sep)` 검사) + **NFC 정규화**(아래) |

---

> **⚠️ `/api/file` 의 경로 비교 전에 양쪽 모두 `.normalize("NFC")` 하세요.**
> macOS는 `process.cwd()` 의 한글을 **NFD**(자모 분해)로 주는데, 브라우저가 보내는 URL 파라미터는 **NFC**(완성형)입니다.
> 같은 폴더인데 `startsWith` 가 false가 되어 **한글 경로에서 모든 이미지 미리보기가 403** 이 됩니다.
> 이 앱은 한국 사용자용이고 폴더명에 한글이 들어갈 가능성이 높으니 **거의 확실히 밟는 지뢰입니다.**
>
> ```ts
> const norm = (x: string) => {
>   const n = path.resolve(x).normalize("NFC");
>   return process.platform === "win32" ? n.toLowerCase() : n;  // 윈도우는 대소문자 무시
> };
> ```
> 경로 탈출 방지 자체(`resolve` 후 접두사 검사)는 그대로 유지하고 **정규화만 추가**하세요.

**⚠️ Next.js App Router에서 `_` 로 시작하는 폴더는 라우팅에서 제외됩니다.** 개발용 임시 라우트를 `app/api/_selftest` 로 만들면 404가 나고 원인을 찾느라 시간을 씁니다.

---

### 6-13. UI

**성격**: 이건 대시보드가 아니라 **"내 실제 블로그에 대신 글을 올리는 기계의 조종석"** 입니다. 색은 장식이 아니라 신호로만 씁니다.

```
--safe  #3fb27f  브레이크 걸림(연습 모드)
--armed #e0603a  실제 발행됨 / 한도 임박
--live  #d6a419  작업 중
--act   #5b8def  조작 가능
```

**상태 레일** (화면 최상단) — 시스템 상태에 따라 색·문구·실행 버튼 라벨이 함께 바뀝니다:

| 상태 | 색 | 문구 | 버튼 |
|---|---|---|---|
| killSwitch | armed | 전체 중단 / 어떤 작업도 발행되지 않습니다 | — |
| dryRun | safe | 연습 모드 / 발행하지 않고 완성 화면만 저장합니다 | "연습으로 만들기" |
| 실발행 | armed | 실제 발행 / 완성되는 글이 블로그에 그대로 올라갑니다 | "글 만들고 발행하기" |

레일 우측에 연결 상태 점 3개(Claude · 네이버 · 이미지 생성)와 설정 버튼.

**계량기** — 한도가 코드에 숨어 있으면 안 됩니다. 항상 보이게:
- `오늘 발행 n / 3편` — 부제에 발행 간격, 한도 도달 시 "설정에서 늘릴 수 있습니다"
- `이미지 생성량 n / 10,000 뉴런` — 부제에 실측/추정 여부와 장당 단가
- 70% 넘으면 live, 90% 넘으면 armed 색으로. 숫자는 **`font-variant-numeric: tabular-nums`** (자릿수가 흔들리면 계기판이 아닙니다)

**설정 서랍** — 우측 슬라이드. 3개 묶음:
- *발행 안전장치* — 연습 모드 · 전체 중단 · **공개 범위** · 하루 발행 수 · 발행 간격
  (공개 범위는 전체공개 / 이웃공개 / 서로이웃공개 / **비공개(기본값)** 4지선다로 노출하세요.
   설정에만 숨기지 말고 작성 화면에서도 현재 값이 보이는 편이 안전합니다 — 실발행 직전에
   "지금 어디로 나가는지"를 사용자가 알아야 합니다.)
- *글감과 사진* — 검색 수집량 · 이미지 후보 · 생성 품질(스텝, **"지금은 장당 N 뉴런 — 무료 한도로 하루 M장"** 을 실시간 계산해 표시)
- *실행 방식* — 브라우저 보기 · AI 동시 실행 · AI 응답 대기

변경 즉시 저장. Esc로 닫기. 하단에 '기본값으로 되돌리기'.

**작성 화면** — 유형 카드 3개 → 선택된 유형의 입력 폼 → 사진 소스 선택 → (AI 선택 시) 그림체 → 실행 버튼.
사진 소스가 AI인데 Cloudflare 키가 없으면 경고 배지 + 실행 버튼 비활성화.

**최근 작업 목록** — `GET /api/jobs` 로 최근 30건을 표시하고, 클릭하면 우측에 상세가 열립니다.
각 행에 키워드 + 상태(진행 중이면 현재 단계까지). 이 화면이 없으면 `/api/jobs` 가 고아 API가 됩니다.

**진행/결과** — SSE 로그 실시간, 완료 후 초안 미리보기(섹션을 실제 서식으로 렌더 — heading/p/blockquote/hr/img), 발행 URL 링크. 연습 모드면 스크린샷 표시.

접근성 기본선: `:focus-visible` 아웃라인, 토글은 `role="switch"` + `aria-checked`, 선택 버튼은 `aria-pressed`, `prefers-reduced-motion` 존중.

---

## 7. 함정 목록 — 모르면 반드시 막힌다

전부 실제로 겪고 원인을 특정한 것들입니다. **각 항목의 "왜"까지 읽으세요.** 이유를 모르면 리팩터링하다 되살아납니다.

> **⚠️ 이 목록은 닫혀 있지 않습니다.** 1판 17개 → 2판 24개 → 3판 27개.
> **10개가 "명세대로 했는데 안 되더라"에서 나왔습니다.** 여기 없는 문제를 반드시 만납니다.
> 그때는 [8-5. 자가 진단 절차](#8-5--이-문서에-없는-문제를-만났을-때--자가-진단-절차)로 **직접 재서** 알아내세요.

### 7-1. `:has-text('취소')` 가 '취소선' 버튼을 누른다 ★최악

- **증상**: 발행된 글의 **모든 텍스트에 취소선**이 그어짐.
- **틀린 추측**: "한국어 물결표(`~~`)가 마크다운 취소선으로 변환됐다" — 그럴듯하지만 **아니었습니다**. DB의 초안에는 물결표도 결합문자도 하나도 없었습니다.
- **진짜 원인**: 복원 팝업을 닫으려고 쓴 `button:has-text('취소')` 가 **툴바의 '취소선' 버튼**에 부분일치했습니다. Playwright의 `has-text` 는 부분일치입니다. 취소선이 전역으로 켜진 채 글 전체가 타이핑된 것입니다.
- **해결**: 클래스 기반(`button.se-popup-button-cancel`)을 먼저 쓰고, 텍스트를 쓸 땐 **팝업 안으로 스코프 + `:text-is('취소')` 정확일치**. `:text-is` 는 '취소선'에 매칭되지 않습니다.
- **확인법**: 로컬 HTML로 `<button>취소</button>` 과 `<button>취소선</button>` 을 나란히 두고 두 셀렉터의 매칭 개수를 세보세요. 옛 셀렉터 2개, 새 셀렉터 1개.

### 7-2. `:has-text('발행')` 이 '예약 발행 0건' 을 누른다

같은 부분일치 함정입니다. **`button[data-click-area='tpb.publish']`** 처럼 데이터 속성을 쓰세요.
최종 확인 버튼은 `button[data-click-area='tpb*i.publish']` — `*` 가 들어간 값이 맞습니다.

### 7-3. `.se-popup-dim` 이 화면 전체 클릭을 막는다

복원 팝업이 뜰 때 **반투명 차단막**이 함께 깔립니다. 이게 남아 있으면 발행 버튼 클릭이 조용히 무시됩니다(에러도 안 납니다).
→ **팝업 취소 → 도움말 닫기 → 발행** 순서를 반드시 지키세요.

### 7-4. 도움말/온보딩 패널이 발행 버튼을 가린다

에디터 진입 시 네이버가 자동으로 띄웁니다. 우측 전체를 덮습니다.
`.se-help-panel-close-button` 으로 닫고, 실패하면 `Escape`. **진입 직후와 발행 직전에 각각 한 번씩** 닫으세요.

### 7-5. 인용구가 다음 문단을 통째로 삼킨다

- **증상**: 인용구를 쓰면 바로 다음 문단이 인용구 안으로 빨려 들어가고, 인용구 서식이 사라짐.
- **시도했으나 실패한 것들**: `ArrowDown`, `Enter` 두 번, `Escape`, `Ctrl+End` — 컴포넌트 안에서는 **어떤 키로도 탈출되지 않습니다.**
- **더 나쁜 것**: 인용구 안에서 '본문' 서식을 적용하면 **인용구가 통째로 평범한 텍스트로 환원**됩니다.
- **유일한 해결**: 마우스로 **마지막 컴포넌트 아래 빈 영역을 클릭**합니다.

```ts
const last = frame.locator(".se-content .se-component").last();
const lbox = await last.boundingBox();
let y = lbox.y + lbox.height + 30;
await page.mouse.click(x, y);
```

- **덤**: 툴바의 인용구 '컴포넌트 삽입' 버튼 대신, 텍스트를 먼저 치고 `Shift+Home` 으로 선택한 뒤 **문단 서식**으로 인용구를 적용하는 편이 훨씬 안정적입니다.

### 7-6. 화면 맨 아래 '글감 검색바'가 포커스를 훔친다

7-5의 클릭 y좌표를 아무렇게나 잡으면 하단 글감 바를 눌러버립니다. 그러면 **이후 캡션이 검색창에 타이핑되고 글감 패널이 열립니다.**

이 바에는 **이름이 있습니다.** 상수를 추측하지 말고 실제 위치를 재세요:

```
DIV.se-flayer-unified-toolbar-wrapper
  DIV.se-flayer-unified-toolbar se-flayer-unified-toolbar--expanded
    INPUT.se-flayer-unified-search-input     ← 여기로 타이핑이 샌다  (실측 y=815)
```

```ts
// 실측 기반 클램프. vh-150 은 폴백으로만 남긴다
const box = await frame.locator(".se-flayer-unified-toolbar-wrapper").first()
              .boundingBox({ timeout: 800 });        // ⚠️ timeout 필수 → 7-27
const maxY = Math.min(box ? box.y - 20 : vh - 150, canvasBottom - 20);
y = Math.max(140, Math.min(y, maxY));
```

아래 여백이 없으면 `mouse.wheel(0, 250)` 로 공간을 만든 뒤 다시 계산하세요.

### 7-7. 파일 선택창이 브라우저를 영구히 멈춘다 ★

- **증상**: 이미지 업로드에서 **7분간 정지, CPU 0%**. 에러도 타임아웃도 없음.
- **원인**: `page.waitForEvent("filechooser")` 같은 **일회성 리스너가 만료**된 뒤 이미지 버튼을 누르면, Playwright가 가로채지 못해 **OS 네이티브 파일 대화상자**가 뜹니다. 그 창은 브라우저를 블로킹하고, 자동화는 그걸 볼 수도 닫을 수도 없습니다.
- **플랫폼 무관**입니다. macOS 전용 문제가 아니라 윈도우의 네이티브 파일 대화상자도 똑같이 블로킹합니다. **영구 핸들러가 양쪽 모두의 정답입니다.**
- **해결**: 페이지를 열기 **전에** 영구 핸들러를 등록하고, 모듈 스코프 변수로 "지금 올릴 파일"을 넘깁니다.

```ts
const pendingUpload = { path: null as string | null, done: false };
page.on("filechooser", async (c) => {
  try { if (pendingUpload.path) await c.setFiles(pendingUpload.path); }
  finally { pendingUpload.done = true; }
});
```

업로드 완료는 `pendingUpload.done` 폴링(최대 20초)으로 기다립니다.

### 7-8. 스마트에디터가 마크다운을 자동 변환한다

`~~취소선~~`, `**굵게**`, 줄머리 `#` `>` `-` 를 입력 중에 서식으로 바꿉니다. 한국어 구어체의 물결표(`~`)가 특히 위험합니다.
**AI에게 마크다운을 쓰지 말라고 지시하는 것만으로는 부족합니다.** 타이핑 직전에 무력화하세요:

```ts
text.replace(/~+/g, "～")                  // 전각 물결표로 (어감은 보존)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*>[ \t]+/gm, "")
    .replace(/^[ \t]*[-*+][ \t]+/gm, "");
```

### 7-9. 네이버 메인의 로그인 링크로 세션을 판정하면 안 된다

`naver.com` 에는 **로그인 상태에서도 `nidlogin` 링크가 남아 있습니다.** 이걸로 판정하면 항상 "만료"로 나옵니다.
→ `blog.naver.com/MyBlog.naver` 로 이동해 **로그인 페이지로 튕기는지**로 판정하세요.

### 7-10. 읽기는 되는데 글쓰기만 만료된 상태가 있다

- **증상**: 세션 검증은 통과하는데 에디터에 들어가면 로그인 창이 뜸.
- **원인**: 로그인할 때 **"로그인 상태 유지"를 체크하지 않으면** 세션 쿠키가 브라우저 종료와 함께 사라집니다. 일부 읽기 경로만 살아남습니다.
- **해결**: 검증 2단계에서 **글쓰기 페이지까지** 열어보고, UI에 *"로그인할 때 **로그인 상태 유지**를 켜면 한 달간 유지됩니다"* 를 안내하세요. 체크하고 다시 로그인하면 1개월짜리 쿠키가 저장됩니다.

### 7-11. "발행 완료"를 거짓으로 보고하지 마라

발행 버튼을 눌렀다는 사실은 발행됐다는 뜻이 아닙니다. 한 번은 `blog_url` 에 **글쓰기 URL이 그대로** 기록돼 "발행 완료"라고 표시된 적이 있습니다. 실제로는 임시저장이었습니다.

```ts
// 게시글 주소로 이동해야 진짜 발행
/blog\.naver\.com\/[^/]+\/\d{6,}/.test(url)
```

20초간 폴링해 게시글 URL이 안 나오면 **`failed`** 로 기록하고, note에 *"글은 임시저장 상태로 남아 있습니다"* 를 정확히 쓰세요. 실패를 성공으로 보고하면 사용자가 확인할 방법이 없습니다.

### 7-12. 뉴런 단가 공식

문서만 보면 `타일 × 4.8 + 스텝 × 9.6` 처럼 읽히지만 **틀립니다.** 스텝 요금은 **타일마다** 붙습니다.

```
잘못:  4×4.8 + 6×9.6      =  76.8/장
맞음:  4×(4.8 + 6×9.6)    = 249.6/장     ← 실측 7,738 ÷ 31장 = 249.6 (오차 0.4)
```

1024×1024 = 4타일. 무료 10,000뉴런 기준 **6스텝이면 하루 40장**(잘못된 공식으로 계산하면 3.4배 과소평가합니다).

| 스텝 | 장당 | 하루 | 5장짜리 글 |
|---|---|---|---|
| 2 | 96 | 104장 | 20편 |
| 4 | 173 | 57장 | 11편 |
| 6 | 250 | 40장 | 8편 |
| 8 | 326 | 30장 | 6편 |

**실측을 보려면** API 토큰에 `Account Analytics: Read` 권한이 필요합니다(GraphQL `aiInferenceAdaptiveGroups`). 권한이 없으면 401이 아니라 `"not authorized"` **GraphQL 에러**로 옵니다 — 그때는 자체 생성 로그로 추정치를 계산하고 **"추정치"라고 화면에 표시**하세요.
토큰 권한을 나중에 추가할 땐 대시보드에서 **Edit**(Roll 아님 — Roll은 키를 재발급해 `.env.local` 이 무효가 됩니다).

### 7-13. 생성 이미지에 크롤링용 판정을 쓰지 마라

생성물에는 워터마크도 초상권도 없습니다. `koreanPerson` 필터를 그대로 돌리면 멀쩡한 생성 이미지가 탈락합니다. **판정 함수를 분리**하세요(6-7 참조).

### 7-14. 브라우저는 폴더의 절대경로를 주지 않는다

`<input webkitdirectory>` 는 보안상 상대 경로만 줍니다 — Playwright 업로드에 쓸 수 없습니다.
로컬 전용 앱이므로 **백엔드에서 OS 네이티브 대화상자**를 띄우세요:

```
osascript -e 'POSIX path of (choose folder with prompt "…")'
```

- 끝의 슬래시를 제거하세요 (`…/사진/` → `…/사진`)
- `User canceled` stderr는 에러가 아니라 **취소**입니다
- **2분 타임아웃** 필수 — 사용자가 대화상자를 방치하면 서버 요청이 영원히 안 끝납니다
- **윈도우는 PowerShell로 같은 대화상자를 띄웁니다** (미검증):
  ```
  powershell -NoProfile -STA -Command
    "Add-Type -AssemblyName System.Windows.Forms;
     $f = New-Object System.Windows.Forms.FolderBrowserDialog;
     if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath }"
  ```
  **`-STA` 가 반드시 필요합니다** — WinForms 대화상자는 STA 아파트먼트에서만 뜹니다.
- **취소 판정이 플랫폼마다 다릅니다**: macOS는 stderr의 `User canceled`, 윈도우는 **stdout이 비어 있는 것**으로 판정
- 경로 끝 구분자 제거는 양쪽 공통(`/` 와 `\` 둘 다)
- 대화상자를 못 띄우는 플랫폼에서는 "직접 입력해 주세요" 를 반환. **경로 직접 입력 칸은 어느 플랫폼에서든 항상 제공하세요**

### 7-15. DB에서 잡을 취소해도 파이프라인은 멈추지 않는다

`runJob` 은 fire-and-forget 비동기 함수입니다. `jobs.status` 를 `canceled` 로 바꿔도 **실행 중인 코드는 계속 돕니다.**
또 실행 중에 브라우저 프로세스를 강제 종료하면 그 잡들은 `Target page, context or browser has been closed` 로 실패합니다.
→ 진짜 취소가 필요하면 `AbortController` 를 파이프라인 전체에 관통시키거나, **UI에서 취소를 제공하지 말고** 중복 실행만 막으세요(이 앱은 후자를 택했습니다).

### 7-16. 잡 중복 생성

버튼 연타·SSE 재연결로 같은 잡이 두 번 만들어집니다. `POST /api/jobs` 에서 **진행 중 잡이 있으면 409** 로 거절하고, 클라이언트도 `starting` 플래그로 잠그세요.

### 7-17. HMR이 SQLite 커넥션을 늘린다

Next.js dev는 모듈을 여러 번 평가합니다. `globalThis.__blogDb` 에 캐싱하지 않으면 파일 핸들이 계속 쌓입니다.

### 7-18. 사진 캡션 칸은 업로드 직후 크기가 0이다

- **증상**: 캡션이 사진 설명이 아니라 **본문 줄**로 들어가고, 뒤따르는 문단과 **한 컴포넌트로 합쳐진다.**

```
[se-text] 화분 옆에서 마신 아메리카노정리하면, 조용히 책 읽고 싶은 날 가기 딱 좋은 곳…
          └ 캡션 ┘└ 다음 문단 ┘   ← 붙어버림
```

- **원인**: 업로드 직후 `.se-caption` 은 DOM에 있지만 **0×0** 이라 `isVisible()` 이 false입니다.

| 시점 | `.se-caption` 상태 |
|---|---|
| 업로드 직후 | 존재하나 **0×0** — `se-module se-module-text __se-unit se-is-empty se-caption` |
| `el.focus()` 호출 후 | `activeElement` 안 바뀜, 글자 안 들어감 (**안 통합니다**) |
| **이미지 컴포넌트를 클릭한 뒤** | 펼쳐짐 — 클래스에 **`se-is-on` 추가** → 그제서야 클릭·타이핑 가능 |

**⚠️ 크기 숫자를 판정 기준으로 쓰지 마세요.** 두 환경에서 각각 `640×24` 와 `64×63` 이 나왔습니다.
**핵심 현상(0×0 → 클릭해야 펼쳐짐)은 양쪽 100% 동일**했으므로, **`se-is-on` 클래스가 붙는지**로 판정하세요.

- **해결**: **이미지 컴포넌트를 먼저 클릭**해 캡션 칸을 펼치고, 그 다음 캡션을 클릭해 타이핑. 캡션 뒤에도 [7-5](#7-5-인용구가-다음-문단을-통째로-삼킨다)의 마우스 탈출이 필요합니다.
- **확인법**: 발행 후 `.se-caption` 에 `se-is-empty` 가 남아 있으면 실패입니다.

### 7-19. 공개 범위 라디오는 opacity:0 이라 클릭되지 않는다

- **증상**: 비공개로 지정했는데 전체공개로 발행된다(또는 클릭이 조용히 무시된다).
- **원인**: `#open_private` 등 radio input은 13×13이지만 **`opacity: 0`** 입니다. 실제로 눌러야 하는 건 label(58×18)입니다.
- **해결**: `label[for="open_private"]` 을 클릭하고, **`input.checked` 를 직접 확인**하세요. 확인되지 않으면 **발행하지 말고 중단**하세요 — **네이버 기본값이 전체공개**입니다.
- **왜 중요한가**: 이 가드가 없으면 "첫 실발행은 비공개로"라는 지시를 지킬 방법이 없습니다. 실제 구현에서 이 가드가 한 번 발동해 공개 발행을 막았습니다.

### 7-20. 에디터 iframe은 뷰포트 높이를 그대로 따라간다

- **증상**: `fullPage: true` 로 찍은 "전체 스크린샷"에 **마지막 한 화면만** 담긴다. 연습 모드의 산출물이 스크린샷 하나뿐인데 글의 끝부분만 보이면 검증이 불가능합니다.
- **원인**: iframe 문서의 `scrollHeight === clientHeight ===` 뷰포트 높이. `fullPage` 가 무의미해집니다.

```
에디터 iframe 문서:  scrollHeight 900 === clientHeight 900 === 뷰포트 900
.se-content boundingBox().height =  761   ← 잘린 높이
.se-content scrollHeight         = 3637   ← 진짜 글 길이
뷰포트를 4000으로 키우면 → 문서도 4000 (전체가 담김)
```

- **해결**: `.se-content` 의 **`scrollHeight`** 만큼 뷰포트를 키우고 찍은 뒤 되돌립니다. **`boundingBox().height` 로 계산하지 마세요** — 761 vs 3637, 5배 차이입니다.

### 7-21. 사진을 넣으면 우측 도크가 열려 본문을 덮는다

- **원인**: 이미지 삽입 과정에서 우측 "라이브러리" 도크가 **자동으로** 열립니다.
- **⚠️ 이 도크의 클래스는 환경에 따라 다릅니다.** 한 환경에서는 도움말 패널과 같은 계열이라 `.se-help-panel-close-button` 으로 함께 닫혔지만, 다른 환경에서는 **별개 컴포넌트**였습니다:

```
ASIDE.se-sidebar se-sidebar-interaction               300×795 @1066,105
DIV.se-sidebar-container se-sidebar-container-library 301×795 @1066,105
  닫기 버튼: .se-sidebar-close-button  "팝업 닫기"    35×35 @1322,115

이 시점에 .se-help-panel-close-button → 0개
           .se-help-header button      → 0개
```

- **해결**: **두 계열을 모두 닫으세요.** ① `.se-help-panel-close-button` ② `.se-sidebar-close-button` ③ 어느 쪽도 없으면 `Escape`. 오버레이 닫기를 **스크린샷 앞뒤로 두 번** 하는 것은 그대로 유지합니다.
- **왜 중요한가**: 연습 모드의 산출물은 스크린샷 하나뿐입니다. 우측이 가려지면 **검증 자체가 불가능**해집니다.

### 7-22. 하루 한도가 시간대 때문에 샌다

- **원인**: SQLite의 `datetime('now')` 는 **UTC** 인데 "오늘 몇 편 발행했나"는 **로컬 날짜** 개념입니다.
- **재현**: 한국시간 새벽 2시 발행 → UTC로는 어제 17시로 저장 → 오늘 집계에서 **누락**. 실측 2편인데 1편으로 셌습니다. 하루 3편 브레이크가 조용히 느슨해집니다.
- **해결**: `date(published_at,'localtime') = date('now','localtime')` — **양쪽 다** localtime으로.

### 7-23. 한글 경로에서 NFD/NFC 때문에 파일 서빙이 전부 막힌다

- **증상**: 한글이 들어간 경로에서 **모든 이미지 미리보기가 403**.
- **원인**: macOS의 `process.cwd()` 는 한글을 **NFD**(자모 분해)로 주는데 브라우저가 보내는 URL 파라미터는 **NFC**(완성형)입니다. 같은 폴더인데 `startsWith` 가 false가 됩니다.
- **해결**: 경로 비교 전에 **양쪽 모두 `.normalize("NFC")`**. 윈도우에서는 대소문자도 통일하세요(`C:\Users` 와 `c:\users` 는 같은 경로인데 `startsWith` 는 다르다고 봅니다).
- 이 앱은 한국 사용자용입니다. **거의 확실히 밟는 지뢰입니다.**

### 7-24. AI가 본문에 없는 highlight를 지어낸다

- **빈도**: 실측 5개 중 1개(20%).
- **증상**: 형광펜이 `text.indexOf(highlight)` 로 자리를 찾으므로 서식이 엉뚱한 곳에 붙습니다.
- **해결**: 생성 직후 **그 highlight만 떨어뜨리고** 몇 개 버렸는지 로그에 남기세요. 타이핑 직전에도 한 번 더 확인(이중 방어).
- **⚠️ 초안 전체를 재생성시키지 마세요.** 문단 30개를 highlight 하나 때문에 버리는 건 나쁜 거래입니다(생성에 100초). 이미지 자리 개수는 재생성할 가치가 있지만 highlight는 아닙니다.

### 7-25. VS16 이모지가 중복 입력된다 ★

- **증상**: `⚠️` 를 타이핑하면 화면에 **`⚠⚠️`** 로 나옵니다.
- **원인**: 코드포인트로 확인했습니다 — **변이 선택자(VS16, `U+FE0F`)가 붙은 글자만 base 문자가 하나 더 남습니다.**

```
보냄: U+5B U+26A0 U+FE0F U+5D          ("[⚠️]")
받음: U+5B U+26A0 U+26A0 U+FE0F U+5D   ("[⚠⚠️]")   ❌

U+26A0 단독              → 정상
U+1F600 (😀)             → 정상
ZWJ 가족 (👨‍👩‍👦)           → 정상
한글 + ASCII             → 정상
```

`❤️ ✔️ ☀️ ⚠️ 1️⃣` 등이 전부 해당합니다. 체험단 모드에서 이모지는 충분히 나옵니다.

- **⚠️ 해법의 함정**: 고치겠다고 `keyboard.insertText()` 로 **문단 전체**를 넣으면 **이모지 하나만 남고 나머지 글이 통째로 사라집니다**(실측). 실제로 구현자가 이 실수를 했습니다.
- **정답**: **VS16 클러스터만 잘라서 그 조각만** `insertText`, 나머지는 명세대로 `keyboard.type`.

```ts
const HAS_VS16 = /\uFE0F/;
const VS16_CLUSTER = /([\s\S]\uFE0F\u20E3?)/;   // ⚠️ ❤️ ✔️ ☀️ 1️⃣
for (const part of text.split(VS16_CLUSTER)) {
  if (!part) continue;
  if (HAS_VS16.test(part)) await page.keyboard.insertText(part);
  else await page.keyboard.type(part, { delay: 7 });
}
```

### 7-26. 본문 영역을 못 찾으면 글 전체가 제목 칸에 들어간다

- **증상**: 제목 칸에 글 전체가 들어감. **에러도 안 나고, 스크린샷을 봐야만 압니다.**
- **원인**: 본문 후보를 못 찾았을 때 "제목에서 Enter 치면 본문으로 가겠지" 하고 넘어가는 코드 경로. 자연스럽게 이렇게 짜게 됩니다:

```ts
const bodyEl = await firstVisible(frame, EDITOR.body);
if (bodyEl) await bodyEl.click();
else await page.keyboard.press("Enter");   // ← 커서가 제목에 남는다
```

- **해결**: Enter로 한 번 더 시도하고, **그래도 본문 포커스가 확인되지 않으면 스크린샷을 남기고 즉시 실패 처리**하세요. 조용히 진행하는 것이 최악입니다.
- **확인법**: 로컬 하네스([9장 6.5-a](#9-진행-순서))에서 재현됩니다 — 계정 없이 잡을 수 있는 결함입니다.

### 7-27. `boundingBox()` 는 요소가 없으면 30초를 기다린다

- **증상**: 글이 길수록 발행이 **수 분씩** 느려짐. 한 사례에서 하네스 실행이 44초 → **5분 초과**.
- **원인**: [7-5](#7-5-인용구가-다음-문단을-통째로-삼킨다) 탈출 계산에서 쓰는 `boundingBox()` 를 없는 셀렉터에 부르면 Playwright **기본 30초**를 기다립니다. 탈출 클릭은 인용구·구분선·캡션마다 있으므로 누적됩니다.
- **해결**: **`boundingBox({ timeout: 800 })`** 또는 `count()` 선검사. 그리고 같은 값을 반복해 재지 말고 **한 번 재서 재사용**하세요.

---

## 8. 작업 원칙

이 프로젝트를 만들 때 사용자가 명시적으로 요구한 방식입니다. **그대로 따르세요.**

### 8-1. 원인을 추측하지 말고 증거로 특정하라

> "문제의 원인을 추정하지말고, **정확한 원인을 확인해서** 수정해줘"

7-1의 취소선 버그가 이 원칙이 나온 계기입니다. 첫 시도는 그럴듯한 추측(마크다운 물결표)이었고 **틀렸습니다.**
실제 해결은 이렇게 했습니다:

1. DB에서 초안 텍스트를 꺼내 물결표·결합문자를 **직접 세어봤다** → 0개. 가설 기각.
2. 저장된 세션으로 에디터를 띄워 **툴바 버튼의 활성 상태를 읽었다** → 취소선이 켜져 있었다.
3. 켜지는 지점을 역추적 → 복원 팝업 닫기 코드.
4. 로컬 HTML로 **최소 재현**을 만들어 셀렉터 매칭 개수를 셌다 → 2개(버그) vs 1개(수정).

살아 있는 DOM에 직접 물어보는 것이 이 프로젝트에서 가장 강력한 도구였습니다. 셀렉터를 상상하지 말고 **측정하세요.**

### 8-2. 실패를 성공으로 보고하지 마라

발행이 안 됐으면 안 됐다고, 건너뛴 이미지가 있으면 몇 개인지 정확히 쓰세요. 로그와 `posts.note` 에 남는 문장이 사용자가 상황을 아는 **유일한 통로**입니다.

그리고 한 가지 더:

> **내가 실행해 확인하지 않은 것을 "됨"이라고 쓰지 마세요.**
> 사용자 자격증명이나 비밀키가 필요해 검증하지 못한 항목은 **"구현했으나 미검증 — 이유"** 로 분리해 보고하세요.
> 특히 **네이버 로그인·실발행·AI 이미지 생성**이 여기에 해당합니다.

### 8-3. 안전장치를 테스트 때문에 낮췄으면 반드시 되돌려라

발행 간격 30분은 테스트에 걸립니다. 임시로 낮췄다면 **끝나고 원복**하고, 낮췄다는 사실을 사용자에게 말하세요.

### 8-4. 비밀값은 사용자가 직접 넣는다

`.env.local` 을 대신 쓰지 마세요. **`env.sample` 을 만들고** `cp env.sample .env.local` 을 안내한 뒤, 사용자가 키를 채우게 하세요. 키를 넣은 후엔 **dev 서버 재시작이 필요**하다는 것도 함께 안내해야 합니다.

### 8-5. ★ 이 문서에 없는 문제를 만났을 때 — 자가 진단 절차

**이 문서는 완전하지 않습니다. 반드시 여기 없는 문제를 만납니다.**

근거: 1판은 함정 17개였습니다. 실제로 구현해 보니 2판에서 7개, 3판에서 3개가 더 나왔습니다.
**27개 중 10개가 "1판을 그대로 따랐는데 안 되더라"에서 나온 것들입니다.** 앞으로도 늘어납니다 —
네이버는 예고 없이 DOM을 바꾸고, 계정·시점·A/B에 따라 마크업이 다릅니다.

그러니 **막혔을 때 멈추지 말고 스스로 알아내세요.** 아래가 그 절차입니다.

#### 절대 하지 말 것

| 하지 말 것 | 왜 |
|---|---|
| 셀렉터를 바꿔가며 될 때까지 시도 | 우연히 되면 **왜 되는지 모른 채** 넘어가고, 다음 환경에서 다시 깨집니다 |
| `try/catch` 로 실패를 삼키고 진행 | 취소선 버그가 정확히 이 형태였습니다 — 에러 없이 **글 전체가 망가집니다** |
| "아마 ~ 때문일 것"으로 보고 | 마크다운 물결표 가설이 그럴듯했지만 틀렸습니다([7-1](#7-1-has-text취소-가-취소선-버튼을-누른다-최악)) |
| 명세 값을 지우고 새 값으로 교체 | 다른 환경에서 되던 것이 깨집니다. **후보 배열 앞에 추가**하세요 |

#### 진단·수정 루프 — 스스로 돌리세요 ★

**중요: 이 앱을 만들어 달라고 한 사람은 개발을 모릅니다.** 막혔다고 사용자에게 물어봐도
답을 줄 수 없습니다. **코드 문제는 당신이 끝까지 돌려서 해결해야 합니다.**

```
        ┌──────────────────────────────────────────┐
        │  ① 관찰 — 무엇이 어떻게 잘못됐나          │
        │       (스크린샷 / DOM / 로그 = 실제 증거) │
        │  ② 측정 — 도구상자로 원인 후보를 좁힌다   │
        │  ③ 가설 하나 — 기각 가능한 형태로         │
        │  ④ 최소 수정 — 한 번에 한 곳만            │
        │  ⑤ 재검증 — 같은 방법으로 다시 재서       │
        │            증상이 사라졌는지 확인          │
        └───────────────┬──────────────────────────┘
                        ▼
              ┌─── 해결됐나? ───┐
       예 ────┘                 └──── 아니오
        │                              │
   주석 + selectors.ts 반영      새 정보를 얻었나?
   사용자에겐 결과만 짧게         ├ 예   → ①로 (라운드 +1)
                                 └ 아니오 → 접근 축을 바꾼다
                                            (셀렉터→타이밍→포커스→순서)
```

**⑤ 재검증이 이 루프의 핵심입니다.** 고쳤다고 생각하고 넘어가지 마세요.
증상을 확인했던 **바로 그 방법으로 다시 재서** 사라진 것을 확인해야 "해결"입니다.

**멈춰야 할 때** — 아래에 해당하면 루프를 끝내고 사용자에게 말하세요.

| 조건 | 왜 |
|---|---|
| 같은 가설을 두 번 시도했다 | 같은 것을 반복하고 있다는 뜻입니다 |
| **3라운드 동안 새 측정값이 하나도 안 나왔다** | 정보 없이 도는 중입니다 |
| **사용자만 할 수 있는 일이다** | 네이버 로그인, 열쇠(키) 입력, 공개 여부 결정 |
| 되돌릴 수 없는 행동이 필요하다 | 실제 발행 — 반드시 먼저 확인받으세요 |

**멈추지 말아야 할 때** — 아래는 전부 당신이 해결할 문제입니다. 사용자에게 넘기지 마세요.

> 셀렉터가 안 맞는다 · 클릭이 무시된다 · 타이밍이 안 맞는다 · 포커스가 엉뚱한 데 있다 ·
> 서식이 이상하게 들어간다 · 스크린샷이 잘린다 · 느리다 · 파싱이 실패한다

**루프를 도는 동안** 사용자를 붙잡아두지 마세요. 한 줄만 말하고 계속 작업하세요:

> *"글은 잘 써졌는데 사진 밑 설명이 엉뚱한 곳에 들어가고 있어요. 원인을 찾고 있습니다 — 2~3분 걸립니다."*

시도할 때마다 중계하지 마세요(*"이번엔 이걸 해봤는데 안 되네요"* × 5회). **끝나고 결과만** 말하면 됩니다.

#### 루프 안에서 각 단계를 어떻게 하나

**① 증상을 최소 형태로 좁힌다**
어느 섹션 타입에서? 몇 번째부터? 사진이 있을 때만? 첫 글에서만?
*"발행이 안 된다"* 는 증상이 아닙니다. *"이미지 3장 넣은 글에서만, 발행 버튼 클릭이 무시된다"* 가 증상입니다.

**② 그 순간의 DOM을 통째로 덤프한다**
[9장 6.5-b](#9-진행-순서)의 덤프를 **문제가 일어나는 시점에** 실행하세요. 진입 직후가 아니라 **막힌 그 지점**에서.

**③ 아래 도구로 "무엇이 실제로 일어나고 있는지"를 잰다**

**④ 가설을 하나만 세우고, 기각 가능한 형태로 검증한다**
*"복원 팝업 닫기 코드가 취소선을 켠다"* → **그 코드를 지우고 다시 돌린다.** 취소선이 사라지면 확정.
두 가지를 동시에 바꾸지 마세요. 뭐가 고친 건지 모르게 됩니다.

**⑤ 최소 재현으로 확정한다**
로컬 HTML 몇 줄로 같은 현상을 만들 수 있으면 그게 원인입니다. 계정도 네트워크도 필요 없어 **몇 초 만에 반복**할 수 있습니다.

#### 증상별 도구상자

**클릭이 무시된다 / 엉뚱한 게 눌린다** — 그 좌표에 **실제로** 뭐가 있는지 보세요. 오버레이 문제의 결정적 도구입니다.

```ts
await frame.evaluate(([x, y]) => {
  const chain = [];
  for (let e = document.elementFromPoint(x, y); e; e = e.parentElement) {
    const cs = getComputedStyle(e);
    chain.push({ tag: e.tagName, cls: e.className, z: cs.zIndex, pe: cs.pointerEvents });
  }
  return chain.slice(0, 6);
}, [x, y]);
```

> Playwright 에러 메시지도 그냥 지나치지 마세요. 가로채는 요소를 **직접 이름으로 알려줍니다**:
> `<header class="se-help-header se-help-header-dark"> … intercepts pointer events`
> [7-4](#7-4-도움말온보딩-패널이-발행-버튼을-가린다)가 이 메시지로 확인됐습니다.

**타이핑이 딴 데로 간다** — 포커스가 어디 있는지 추적하세요.

```ts
await frame.evaluate(() => {
  const a = document.activeElement as HTMLElement;
  return { tag: a?.tagName, cls: a?.className, editable: a?.isContentEditable,
           text: a?.textContent?.slice(0, 60) };
});
```

[7-6](#7-6-화면-맨-아래-글감-검색바가-포커스를-훔친다)(글감 검색바)과 [7-26](#7-26-본문-영역을-못-찾으면-글-전체가-제목-칸에-들어간다)(제목 칸)이 둘 다 이걸로 잡힙니다.

**처음 보는 패널·팝업이 떴다** — 이름을 모를 때 씁니다. **동작 전후를 비교**하면 새로 생긴 것만 남습니다.

```ts
const snap = () => frame.evaluate(() =>
  [...document.querySelectorAll("*")]
    .filter(e => e.getBoundingClientRect().width > 80)
    .map(e => e.tagName + "." + e.className));

const before = await snap();
/* …문제를 일으키는 동작… */
const after = await snap();
console.log(after.filter(x => !before.includes(x)));   // 새로 생긴 것만
```

[7-21](#7-21-사진을-넣으면-우측-도크가-열려-본문을-덮는다)의 `.se-sidebar-container-library` 가 정확히 이 방식으로 발견됐습니다.
**"명세에 있는 `.se-help-*` 가 안 잡힌다"** 에서 멈추지 않고, **"그럼 대신 뭐가 생겼나"** 를 물었기 때문입니다.

**글자가 이상하게 들어간다** — 눈으로 보지 말고 **코드포인트**로 비교하세요.

```ts
const dump = (t: string) => [...t].map(c => "U+" + c.codePointAt(0)!.toString(16).toUpperCase()).join(" ");
console.log("보냄:", dump(sent), "\n받음:", dump(await el.textContent() ?? ""));
```

[7-25](#7-25-vs16-이모지가-중복-입력된다)(VS16 이모지)가 이걸로 확정됐습니다. `⚠⚠️` 를 눈으로 보면 "폰트 문제인가" 싶습니다.

**요소를 못 찾는다** — **조건부 요소**일 수 있습니다. 드롭다운·팔레트·발행 레이어 안의 것들은 **열어놓지 않으면 DOM에 없습니다.** [9장 6.5-b](#9-진행-순서)의 3단계 절차대로 열어놓고 재세요. 한 사례에서 13개가 "안 잡힘"으로 나왔지만 **13개 전부 명세 값이 맞았습니다.**

**비정상적으로 느리다** — Playwright 기본 타임아웃은 **30초**입니다. 없는 셀렉터를 기다리고 있을 가능성이 큽니다 → [7-27](#7-27-boundingbox-는-요소가-없으면-30초를-기다린다)

**조용히 실패한다(에러 없이 결과만 이상하다)** — 가장 위험한 유형입니다. **각 단계 뒤에 결과를 검증**하세요.
제목을 넣었으면 제목 칸에 들어갔는지, 서식을 적용했으면 실제로 적용됐는지, 캡션을 넣었으면 `se-is-empty` 가 빠졌는지.
27개 함정 중 취소선·제목 칸·캡션·이모지·스크린샷 잘림 **5개가 이 유형**이었습니다.

#### 루프를 끝내고 사용자에게 말할 때

**해결했으면** — 무엇이 문제였는지 한 줄, 지금 어떤지 한 줄. 그게 전부입니다.

> *"사진 밑 설명이 본문으로 들어가던 문제를 고쳤습니다. 지금은 사진 아래 설명 칸에 제대로 들어갑니다."*

과정을 늘어놓지 마세요. 코드나 셀렉터 이름은 꺼내지 마세요.

**못 고쳤으면** — 숨기지 말고, 다만 **막막하게 들리지 않게** 말하세요.

> *"사진 5장 중 2장은 잘 들어가는데 3장이 빈 채로 남습니다. 네이버가 최근에 화면을 바꾼 것 같아
> 제가 확인할 수 있는 범위를 넘었습니다.*
> *지금 상태로도 글은 발행됩니다 — 사진만 빠집니다. 두 가지 중에 고르시면 됩니다:*
> *① 사진 없이 일단 써본다  ② 사진을 직접 골라 넣는 방식으로 바꾼다 (이쪽을 권합니다)"*

**반드시 포함할 것**: ⓐ 지금 되는 것 ⓑ 안 되는 것 ⓒ **그래서 사용자가 지금 뭘 할 수 있는지**
ⓒ가 없으면 사용자는 아무것도 못 합니다.

#### 알아낸 것을 어디에 남기나

1. **`selectors.ts` 후보 배열의 <ins>앞</ins>에 추가** — 기존 값은 **지우지 말고 뒤에** 남깁니다
2. **`⚠️` 주석에 "왜"와 "틀린 추측"을 함께** — 이유 없는 규칙은 다음 세션의 당신이 리팩터링으로 지웁니다
3. **사용자에게 보고할 때는 측정값과 함께** — *"셀렉터를 고쳤습니다"* 가 아니라 *"`.se-help-*` 가 0개였고 대신 `.se-sidebar-close-button` 이 있어서 둘 다 닫도록 했습니다"*

### 8-6. ★ 초보자에게 다음 단계를 알려주는 법

맨 앞의 **[대화 상대](#대화-상대--반드시-먼저-읽어라)** 를 먼저 읽으세요. 여기는 상황별 대사입니다.

#### 다음 단계를 말하는 기본 틀

```
[왜]     한 줄. 이걸 왜 하는지.
[할 일]  사용자가 할 것 하나. 명령어면 복사할 수 있게 한 줄.
[확인]   어떻게 되면 성공인지. 눈에 보이는 것으로.
[다음]   끝나면 뭐라고 말해달라고.
```

예시:

> **네이버에 대신 글을 올리려면 로그인을 한 번 해두어야 합니다.**
>
> 화면 위쪽 **[네이버 로그인]** 버튼을 눌러주세요. 새 창이 뜨면 평소처럼 로그인하시면 됩니다.
> **"로그인 상태 유지"에 꼭 체크해 주세요.** 안 하면 몇 시간 뒤에 다시 로그인해야 합니다.
>
> 로그인이 끝나면 창이 저절로 닫히고, 화면의 "네이버" 표시에 초록불이 켜집니다.
> 그렇게 되면 알려주세요.

#### 이 프로젝트에서 사용자가 직접 해야 하는 일 — 전부 8곳입니다

| # | 시점 | 사용자가 하는 일 | 놓치면 |
|---|---|---|---|
| 1 | 맨 처음 | Node.js 설치 확인 | 아무것도 안 돌아감 |
| 2 | 맨 처음 | `claude` 설치 + 로그인 | AI가 안 돌아감 |
| 3 | 만들고 나서 | 앱 켜기 | — |
| 4 | 발행 전 | **네이버 로그인** ★ | 글을 못 올림 |
| 5 | (선택) | Cloudflare 열쇠 입력 | AI 사진 생성만 못 씀 |
| 6 | (선택) | 사진 폴더 고르기 | — |
| 7 | 실발행 전 | **연습 모드 끄기 결정** ★★ | 계속 연습만 함 |
| 8 | 발행 후 | 올라간 글 확인 | — |

**1·2번은 앱을 만들기 전에 확인하세요.** 다 만들고 나서 "그런데 Node.js가 없네요"는 최악입니다.

#### 상황별 대사

**① 시작할 때 — 준비물 확인**

> 시작하기 전에 두 가지만 확인할게요. 30초면 됩니다.
>
> **명령어를 입력하는 창**을 열어주세요.
> (맥: `Command + 스페이스` → "터미널" 입력 → 엔터 / 윈도우: 시작 → "터미널")
>
> 아래를 붙여넣고 엔터를 눌러주세요.
> ```bash
> node --version && claude --version
> ```
> 숫자 두 줄이 나오면 준비 끝입니다. 그 결과를 그대로 알려주세요.

없다고 나오면 — **"설치하세요"로 끝내지 말고** 받는 곳과 확인 방법까지 주세요.

**② 앱을 켤 때**

> 다 만들었습니다. 이제 앱을 켜볼게요.
> ```bash
> npm run dev
> ```
> 잠시 뒤 주소가 나오면 브라우저에서 **http://localhost:4123** 을 열어주세요.
> 검은 배경에 위쪽이 초록색인 화면이 뜨면 성공입니다.
>
> ⚠️ 이 창은 **켜둔 채로** 두세요. 닫으면 앱이 꺼집니다.

**③ 네이버 로그인** — 위의 예시 그대로.
**"로그인 상태 유지" 체크를 반드시 강조**하세요. 안 하면 몇 시간 뒤 다시 로그인해야 하고,
읽기는 되는데 글쓰기만 막히는 헷갈리는 상태가 됩니다([7-10](#7-10-읽기는-되는데-글쓰기만-만료된-상태가-있다)).

**④ Cloudflare 열쇠(선택)** — 안 해도 앱이 돌아간다는 걸 **먼저** 말하세요.

> 사진을 **AI가 직접 그리게** 할 수 있습니다. 인터넷에서 사진을 가져오는 것보다 저작권 걱정이 없습니다.
> **안 하셔도 앱은 다 돌아갑니다.** 사진을 검색해서 가져오거나, 직접 찍은 사진을 쓰면 됩니다.
>
> 하시겠다면 5분 정도 걸립니다. 무료 한도로 하루 8편 정도 쓸 수 있습니다.
> (그다음에 단계를 하나씩)

⚠️ **열쇠 파일은 사용자가 직접 채우게 하세요.** 당신이 대신 쓰지 마세요.
`cp env.sample .env.local` 을 안내하고, 파일을 여는 방법까지 알려주고, **넣은 뒤 앱을 껐다 켜야 한다**는 것도요.

**⑤ 첫 실행 — 연습 모드**

> 이제 글을 하나 만들어 볼게요. **연습 모드**라서 **실제로 올라가지는 않습니다.** 마음 놓고 해보세요.
>
> 관심 있는 분야를 한 단어로 넣고 **[연습으로 만들기]** 를 눌러주세요. (예: 제주도 여행, 홈카페)
> 3~7분 정도 걸립니다. 중간에 브라우저 창이 저절로 열렸다 닫히는데 **건드리지 마세요.**
> 다 되면 완성된 글과 사진이 화면에 보입니다.

**⑥ 실발행 결정** ★★ — **가장 조심할 지점입니다.** 되돌릴 수 없습니다.

> 연습으로 만든 글을 보시고 마음에 드시면, 이제 진짜로 올릴 수 있습니다.
>
> **여기서부터는 되돌릴 수 없습니다.** 글이 실제 블로그에 올라갑니다.
> 처음에는 **비공개**로 올려보시길 권합니다. 나만 볼 수 있어서, 어떻게 나오는지 확인하고
> 나중에 공개로 바꿀 수 있습니다. (설정에서 이미 비공개로 되어 있습니다)
>
> 준비되셨으면 설정에서 **연습 모드**를 꺼주세요.

사용자가 **공개 발행**을 원하면 막지 말되, **무엇이 올라가는지 먼저 보여주고 확인받으세요**(12장).

**⑦ 발행 후**

> 올렸습니다. 주소는 여기입니다: (링크)
> 열어서 글과 사진이 제대로 들어갔는지 봐주세요.
> 테스트로 올린 글이라면 지우셔도 됩니다 — 블로그에서 글 오른쪽 위 **[삭제]** 를 누르시면 됩니다.

#### 로그인 전 중간 보고 — 이렇게 나누세요

[10장](#10-검증-체크리스트)의 A를 끝내고 B로 넘어갈 때가 옵니다.
체크리스트를 그대로 보여주지 말고 **일상어로 옮기세요.**

> 여기까지 됐습니다.
>
> **확인한 것** — AI가 글감을 찾고 글을 쓰는 것까지 실제로 돌려봤습니다.
> 안전장치(하루 몇 편까지, 얼마나 자주)도 제대로 막히는 걸 확인했습니다.
>
> **아직 못 해본 것** — 네이버에 실제로 글을 쓰는 부분입니다.
> 로그인이 필요해서 제가 혼자 확인할 수 없습니다.
>
> **다음에 하실 일** — 네이버 로그인 한 번만 해주시면 나머지를 이어서 확인하겠습니다.

⚠️ **"다 됐습니다"라고 하지 마세요.** 확인한 것과 안 해본 것을 반드시 나누세요([8-2](#8-2-실패를-성공으로-보고하지-마라)).

#### 에러가 났을 때

에러 원문을 붙여넣지 마세요. **무슨 뜻인지 + 어떻게 하는지**로 바꿔서 말하세요.

| 실제 에러 | 이렇게 말하세요 |
|---|---|
| `ENOENT: claude` | AI를 실행하는 프로그램이 아직 깔려 있지 않습니다. 설치 방법을 알려드릴게요. |
| `You've hit your session limit` | 오늘 AI 사용량을 다 썼습니다. 저녁 6시쯤 다시 쓸 수 있습니다. |
| `세션 만료` | 네이버 로그인이 풀렸습니다. **[네이버 로그인]** 을 한 번 더 눌러주세요. 이번엔 **"로그인 상태 유지"** 를 꼭 체크해 주세요. |
| `EADDRINUSE :4123` | 앱이 이미 켜져 있습니다. 브라우저에서 http://localhost:4123 을 열어보세요. |
| `Cloudflare 키 없음` | 사진을 AI로 만들려면 열쇠가 필요합니다. 지금은 사진을 **검색해서 가져오기**로 바꾸면 그냥 쓸 수 있습니다. |

**원인이 코드에 있으면 사용자에게 알리기 전에 [8-5의 루프](#8-5--이-문서에-없는-문제를-만났을-때--자가-진단-절차)를 먼저 도세요.**
사용자가 할 수 있는 일이 있을 때만 부르는 겁니다.

---

## 9. 진행 순서

한 번에 다 만들지 말고 이 순서로. 각 단계가 끝날 때마다 실제로 돌려서 확인하세요.

> **🙋 표시가 붙은 곳은 사용자가 직접 해야 합니다.** 그 지점마다 [8-6](#8-6--초보자에게-다음-단계를-알려주는-법)의 대사를 쓰세요.
> **0단계(준비물 확인)를 맨 먼저 하세요** — 다 만들고 나서 "그런데 Node.js가 없네요"는 최악입니다.

**0. 🙋 준비물 확인** — `node --version && claude --version` 이 둘 다 나오는지. 없으면 설치부터 안내.

1. **뼈대** — Next.js + TS + SQLite 스키마 + `config.ts` + `settings.ts`. 대시보드에 설정이 뜨는 것까지.
2. **claude 래퍼** — `checkClaude()` 로 버전이 화면에 뜨면 성공. 이어서 `runClaudeJson` 을 간단한 스키마로 시험.
3. **🙋 네이버 로그인** — 창이 뜨고, 로그인 후 세션 파일이 생기고, 세션 유효 표시가 켜지는 것까지. (7-9, 7-10 주의) **"로그인 상태 유지" 체크를 반드시 안내하세요.**
4. **수집** — 키워드로 뉴스·블로그가 실제로 긁히는지. 셀렉터 없이 앵커 기반으로.
5. **글쓰기** — 글감 5개 → 본문 섹션 배열. DB에 저장되고 화면에 미리보기가 뜨는 것까지. **여기까지는 브라우저 자동화 없이 검증됩니다.**
6. **이미지** — 크롤링+비전 판정 먼저, 그 다음 AI 생성.
> **⚠️ 3번(네이버 로그인)은 사용자에게 의존합니다.** 계정이 없는 동안에는 4~6과 아래 **6.5-a** 까지
> 진행하고, 로그인을 받은 뒤 **6.5-b** 로 넘어가세요. 순서를 이렇게 나누는 이유는 아래에 있습니다.

**6.5-a. (로그인 전) 로컬 하네스로 입력 "순서"를 확정한다**

에디터 자동화는 프로젝트의 90%인데 **네이버 로그인 전에는 한 줄도 검증할 수 없습니다.**
`iframe#mainFrame` 안에 복원 팝업·도움말 패널·툴바(**취소선 버튼 포함**)·contenteditable 본문·하단 글감 검색바·file input을 흉내 낸 HTML을 만들고, 발행 함수에 **테스트 전용 `entryUrl` 옵션**을 두어 여기에 붙이세요.

계정 없이 이만큼 확인됩니다:

- 취소선 버튼이 **0회** 눌렸는가 (7-1)  ·  팝업 차단막이 제거됐는가 (7-3)
- 글감 검색바에 타이핑이 새지 않았는가 (7-6)  ·  파일 선택창이 처리됐는가 (7-7)
- 인용구 다음 문단이 인용구 밖에 있는가 (7-5)  ·  마크다운이 무력화됐는가 (7-8)
- **본문을 못 찾았을 때 제목 칸으로 새지 않는가 (7-26)** ← 실제로 이 방식으로 잡힌 결함입니다
- VS16 이모지가 중복되지 않는가 (7-25)

> **⚠️ 이 시점에 7장 셀렉터는 검증할 수 없습니다. 그대로 쓰세요.**
> 하네스는 **입력 순서**를 검증하는 것이지 **셀렉터**를 검증하는 것이 아닙니다.
>
> **하네스의 한계 — 모르면 헛다리를 짚습니다**
> - 텍스트 입력을 가로채 span을 직접 붙이지 마세요. 캐럿과 싸우다 **한글 순서가 뒤섞입니다.** 네이티브 `contenteditable` 이 처리하게 두고 결과만 읽으세요.
> - 형광펜을 `execCommand('hiliteColor')` 로 흉내 내면 **접힌 캐럿에서 실제 에디터와 다르게 동작합니다.** (하네스에서는 형광펜이 한 구간 밀려 나왔지만 **실제 에디터에서는 정확했습니다.**) 하네스 결과를 실제 에디터의 증거로 쓰지 마세요.

**6.5-b. (로그인 직후, 코드를 고치기 전) 살아 있는 에디터에 물어본다** ★★

8-1의 "추측하지 말고 측정하라"는 원칙이 아니라 **단계**입니다.
**⚠️ 이 단계를 마치기 전에는 "에디터가 동작한다"고 절대 보고하지 마세요.**

> **⚠️ 진입 직후 한 번만 덤프하면 안 됩니다.** 에디터 요소의 절반은 **조건부로 생깁니다.**
> 한 번만 찍으면 이런 결과가 나옵니다:
>
> ```
> ❌ imageComponent, caption          → 사진을 넣어야 생김
> ❌ optHeading, optBody, optQuote    → 문단서식 드롭다운을 열어야 생김
> ❌ bgColorYellow, bgColorNone       → 색상 팔레트를 열어야 생김
> ❌ publishConfirm, 공개범위 라디오   → 발행 레이어를 열어야 생김
> ❌ helpPanel, helpClose             → 덤프 전에 이미 닫아버려서
> ❌ restorePopup, restoreCancel      → 덤프 전에 이미 닫아버려서 + 새 글이라 안 뜸
> ```
>
> **"7장이 전부 틀렸다"고 오판하기 딱 좋은 상태입니다.** 실제로 이 13개를 다시 열어놓고 재보니
> **13개 중 13개가 명세 값 그대로 맞았습니다.**

**그래서 3단계로 재세요:**

```
① 진입 직후, "닫기 전에" 잰다
   restorePopup / restoreCancel / popupDim / helpPanel / helpClose

② 닫은 뒤, 각각 열어놓고 잰다
   - 문단서식 드롭다운 클릭 → optHeading / optBody / optQuote
   - 배경색 버튼 클릭       → bgColorYellow / bgColorNone
   - 사진 1장 삽입          → imageComponent / caption
                             (0×0 확인 → 컴포넌트 클릭 → se-is-on 붙는지 재측정)
                             + 우측 도크가 어느 계열인지 (se-help-* / se-sidebar-*)
   - 발행 버튼 클릭         → publishConfirm / 공개범위 label·input
                             ⚠️ 확정 버튼은 절대 누르지 마라

③ iframe 안/밖 양쪽에서 각각 count + isVisible 을 재라
   발행 버튼·공개범위 라디오의 위치는 환경마다 다르다(양쪽 사례 모두 확인됨)
```

기본 덤프 스크립트:

```ts
await frame.evaluate(() => ({
  components: [...document.querySelectorAll(".se-content .se-component")].map(c => c.className),
  toolbar:    [...document.querySelectorAll(".se-toolbar button")].map(b => b.className),
  scroll:     { doc: document.documentElement.scrollHeight,
                content: document.querySelector(".se-content")?.scrollHeight },
  overlays:   [...document.querySelectorAll("[class*='panel'],[class*='layer'],[class*='sidebar']")]
                .filter(e => e.getBoundingClientRect().width > 100).map(e => e.className),
}));
```

> **7장의 셀렉터가 여기서 안 잡히면 7장을 버리지 말고, 잡힌 값을 `selectors.ts` 후보 배열의 <ins>앞</ins>에 추가하세요.**
> 기존 값은 배열 뒤에 남겨둡니다 — 다른 계정·시점·A/B에서는 그쪽이 맞을 수 있습니다.
> **"명세가 틀렸다"고 단정하고 갈아엎으면 다른 환경에서 되던 것이 깨집니다.**

이 단계 하나가 우측 도크·캡션 클래스·발행 버튼 위치 같은 환경차를 **스스로 발견**하게 합니다.

7. **에디터 자동화** — ★ 가장 오래 걸립니다. **반드시 연습 모드(dryRun)로 시작**하세요. 스크린샷을 보면서 셀렉터를 하나씩 맞춥니다. 7장을 옆에 두고 진행하세요.
8. **🙋 첫 실발행** — **비공개 테스트 글**로. 되돌릴 수 없으므로 **반드시 사용자에게 먼저 확인받으세요.** 발행 후 실제 글 주소를 열어 서식이 제대로 들어갔는지 눈으로 확인.
9. **UI 다듬기** — 상태 레일·계량기·설정 서랍·최근 작업 목록.

> **잔 함정 둘**
> - `npm run build` 후 `next dev` 를 그대로 띄우면 `.next` 의 프로덕션 산출물과 충돌해 **500**이 납니다. 전환할 때 `.next` 를 지우세요.
> - 윈도우에서 `better-sqlite3` 설치가 네이티브 빌드로 넘어가 실패하면, Node LTS(짝수 버전)로 맞추거나 `npm rebuild better-sqlite3`. Visual Studio Build Tools가 필요할 수 있습니다.

---

## 10. 검증 체크리스트

기능이 "됐다"고 말하기 전에 아래를 실제로 확인하세요.
**A와 B를 구분하는 것이 중요합니다** — 구현하는 쪽은 사용자의 네이버 계정 없이 시작하는 경우가 많고,
이 구분이 없으면 "다 됐다"고 거짓 보고하거나 반대로 아무것도 확인 못 한 채 멈춥니다.

### A. 계정 없이 확인 가능 — **여기까지는 반드시 끝내고 사용자에게 넘기세요**

**AI 호출**
- [ ] `claude --version` 이 대시보드에 표시된다
- [ ] 프롬프트가 길어도(2,000자 이상 한글) 깨지지 않는다
- [ ] 이미지 첨부(`@절대경로`)로 사진 내용을 실제로 설명한다 — 프로젝트 **밖** 경로도
- [ ] AI가 코드펜스를 붙여도 JSON이 파싱된다

**수집·글쓰기**
- [ ] 키워드로 뉴스·블로그가 실제로 긁힌다(건수 확인)
- [ ] `새 창 열림` 노이즈와 같은 URL 중복이 제거된다 ← 6-4
- [ ] 초안 텍스트에 마크다운 기호 유출 0
- [ ] `highlight` 가 전부 같은 문단 `text` 안에 글자 그대로 있다(없는 건 버려졌는지) ← 7-24

**계산·안전장치**
- [ ] 뉴런 공식이 [7-12](#7-12-뉴런-단가-공식)의 표(96/173/250/326, 104/57/40/30장)와 일치한다
- [ ] 하루 집계가 **로컬 날짜** 기준이다 — 새벽 시간대 기록을 넣어 확인 ← 7-22
- [ ] 설정 범위 클램프·리셋이 동작한다
- [ ] 발행 가드 3종(kill-switch / 한도 / 간격)이 각각 `blocked` 를 만든다
- [ ] 경로 탈출 방지: 정상 파일 200, `/etc/passwd` 403
- [ ] **한글이 든 경로**에서 이미지 미리보기가 200이다 ← 7-23

**최소 재현으로 확인 (계정 불필요)**
- [ ] 로컬 HTML에 `취소`/`취소선` 버튼을 나란히 두고 옛 셀렉터 **2개** vs `:text-is` **1개** ← 7-1
- [ ] 같은 방식으로 `발행`/`예약 발행 0건` → `:has-text` **2개** vs 데이터속성 **1개** ← 7-2

**로컬 하네스로 확인 (9장 6.5-a, 계정 불필요)**
- [ ] 취소선 버튼이 **0회** 눌렸다  ·  팝업 차단막이 제거됐다
- [ ] 글감 검색바에 타이핑이 새지 않았다  ·  파일 선택창이 처리됐다
- [ ] 인용구 다음 문단이 인용구 밖에 있다  ·  마크다운이 무력화됐다
- [ ] **본문을 못 찾았을 때 제목 칸으로 새지 않고 실패 처리된다** ← 7-26
- [ ] **`⚠️` 를 타이핑해도 `⚠⚠️` 가 되지 않는다** ← 7-25

### B. 계정이 있어야 확인 가능 — **사용자에게 로그인을 요청하고, 그 전에는 "완료"라고 말하지 마세요**

**세션 · 실측**
- [ ] 로그인 후 세션 파일이 생기고, 브라우저를 껐다 켜도 "유효"로 뜬다
- [ ] **9장 6.5-b(3단계 실측)를 끝냈다** — 조건부 요소까지 열어놓고 쟀고, 7장과 대조했다
      ⚠️ 이걸 하기 전에는 아래 항목을 "됨"으로 표시하지 마세요
- [ ] "로그인 상태 유지" 없이 로그인하면 **글쓰기 단계에서** 만료로 잡힌다 ← 7-10

**에디터** (연습 모드로)
- [ ] 스크린샷에 **취소선이 하나도 없다** ← 7-1
- [ ] 소제목·인용구·형광펜·구분선이 각각 제대로 보인다
- [ ] **인용구 다음 문단이 인용구 안에 있지 않다** ← 7-5
- [ ] 캡션이 **사진 설명 칸**에 들어갔다 — `.se-caption` 에 `se-is-empty` 가 없다 ← 7-18
- [ ] 이모지가 중복되지 않았다(`⚠⚠️` 아님) ← 7-25
- [ ] 글 전체 입력이 비정상적으로 느리지 않다(`boundingBox` timeout) ← 7-27
- [ ] 캡션이 하단 글감 검색창에 들어가지 않았다 ← 7-6
- [ ] 이미지 업로드에서 멈추지 않는다(네이티브 창이 안 뜬다) ← 7-7
- [ ] **스크린샷에 글 전체가 담겼다** — 마지막 한 화면만 나오지 않는다 ← 7-20
- [ ] 스크린샷에 우측 도크가 본문을 덮지 않았다 ← 7-21
- [ ] '작성 중인 글' 팝업이 있어도 진행된다

**발행**
- [ ] 연습 모드에서는 절대 발행되지 않는다
- [ ] **공개 범위가 실제로 선택됐다** — `input.checked` 로 확인, 미확인 시 중단한다 ← 7-19
- [ ] 발행 성공 시 `blog_url` 이 **게시글 주소**다(글쓰기 URL 아님) ← 7-11
- [ ] 발행 실패 시 `failed` 로 기록되고 note에 임시저장 안내가 있다
- [ ] **첫 실발행이 비공개로 나갔다** — 블로그에서 직접 확인

**이미지**
- [ ] 워터마크 있는 사진이 실제로 탈락하고 **DB에 사유가 남는다**
- [ ] 국내 인물 사진이 탈락한다
- [ ] 판정 호출이 실패한 이미지가 **채택되지 않는다** ← 6-6
- [ ] 한 글에 5장 이상 들어간다
- [ ] AI 생성: `data/images/` 에 실제 파일이 생기고, 깨진 글자가 있으면 재생성이 1회만 돈다
- [ ] `images.gen_prompt` 에 프롬프트가 남는다
- [ ] 로컬 사진 설명이 **한 번만** 생성된다(claude 호출 수로 확인) ← 6-10

---

## 11. 크로스 플랫폼 — 윈도우에서 막히는 곳

> ⚠️ **이 장의 윈도우 동작은 미검증입니다.** macOS에서만 검증했고, 아래는 "맥 전용 가정이 명시 없이
> 섞여 있는 지점"과 그 대안입니다. 구현할 때 **양쪽 다 만들되, 윈도우는 미검증임을 사용자에게 밝히세요.**

| # | 막히는 곳 | 대응 |
|---|---|---|
| 1 | **`spawn("claude", …)` 가 ENOENT로 죽는다** — npm 전역 바이너리가 `claude.cmd` 셸 심이라서 | `shell: process.platform === "win32"`. 프롬프트를 stdin으로 넘기므로 argv에 사용자 입력이 없어 **안전합니다** → [2-1](#2-1-ai-호출은-반드시-claude--p-cli로) |
| 2 | `npx playwright install chromium` 도 같은 이유로 막힌다 | 위와 동일 처리 |
| 3 | **폴더 선택 대화상자** — `osascript` 는 맥 전용 | PowerShell `FolderBrowserDialog` + **`-STA` 필수** → [7-14](#7-14-브라우저는-폴더의-절대경로를-주지-않는다) |
| 4 | 취소 신호가 다르다 | macOS는 stderr `User canceled`, 윈도우는 **stdout이 빈 것** |
| 5 | **경로 대소문자** — `C:\Users` 와 `c:\users` 는 같은 경로 | NFC 정규화에 더해 `toLowerCase()` → [7-23](#7-23-한글-경로에서-nfdnfc-때문에-파일-서빙이-전부-막힌다) |
| 6 | `better-sqlite3` 네이티브 빌드 실패 | Node LTS로 맞추거나 `npm rebuild better-sqlite3`. VS Build Tools 필요할 수 있음 |
| 7 | README의 `cp env.sample .env.local` | 윈도우는 `copy env.sample .env.local` — **병기하세요** |

**플랫폼 무관인 것들** (혼동 방지):

- **[7-7](#7-7-파일-선택창이-브라우저를-영구히-멈춘다) 파일 선택창 멈춤은 맥 전용이 아닙니다.** 윈도우 네이티브 대화상자도 똑같이 블로킹합니다. 영구 핸들러가 양쪽 모두의 정답입니다.
- 한글 타이핑: Playwright는 CJK를 keydown이 아니라 `Input.insertText` 로 보냅니다. 양쪽 동일.
- 스크린샷 뷰포트 확대·셀렉터·서식 조작 순서는 브라우저 동작이라 플랫폼 무관.

---

## 12. 반드시 지킬 것 (법적·윤리적)

이 앱을 만들 때 **사용자에게 명확히 알려야 하는** 내용입니다. README와 UI 양쪽에 쓰세요.

- **자동 발행은 네이버 이용약관상 계정 제재 위험이 있습니다.** 그래서 연습 모드가 기본값이고, 발행 한도·간격·kill-switch가 있습니다. 이 안전장치를 "편의를 위해" 제거하지 마세요.
- 하루 발행 수와 간격은 **네이버가 정한 값이 아니라 이 앱의 자체 브레이크**입니다. 네이버의 실제 한도는 공개돼 있지 않으니 보수적으로 두는 편이 안전합니다.
- **검색으로 가져온 이미지는 저작권 분쟁 소지가 있습니다.** 워터마크·초상권 필터가 있어도 라이선스를 보장하지 않습니다. 상업적 사용 전에는 직접 확인해야 하며, 그래서 **AI 생성이 더 안전한 선택지**입니다.
- **국내 인물 사진은 초상권 위험**이 있어 애매하면 배제하는 쪽으로 판정합니다.
- 수집 자료는 **참고용**입니다. 프롬프트에서 "그대로 베끼지 말라"고 지시하고, 브랜딩 모드에서는 **실적 숫자를 지어내지 말라**고 명시하세요.
- **사용자가 공개 발행을 요청하면 막지 말고 진행하되, "무엇이" 올라가는지 먼저 보여주고 확인받으세요.**
  연습용 테스트 문구나 AI가 지어낸 후기가 공개 블로그에 올라가면 되돌리기 어렵습니다.
  실제 사례에서 구현자가 이 지점에서 사용자를 한 번 멈춰 세워(테스트 문구 대신 실제 수집 자료 기반의 새 글로 유도),
  결과적으로 공개해도 무방한 글이 나갔습니다. **명세에 이 지침이 없어 스스로 판단해야 했던 부분입니다.**
- 첫 실발행은 반드시 **비공개 테스트 글**로 하세요. **그리고 그 방법이 앱 안에 있어야 합니다** — `visibility` 설정 기본값을 `private` 으로 두고, 발행 직전에 `input.checked` 로 확인하세요([7-19](#7-19-공개-범위-라디오는-opacity0-이라-클릭되지-않는다)). 지시만 하고 방법을 주지 않으면 **네이버 기본값인 전체공개로 나갑니다.**

---

## 13. 마지막 당부 (이 프롬프트를 받은 에이전트에게)

- 7장의 셀렉터와 정규식은 **살아 있는 네이버 에디터에서 측정한 값**입니다. 추론으로 다시 만들 수 없습니다. 그대로 쓰세요.
- 네이버 DOM이 바뀌어 셀렉터가 깨지면, **`lib/scrape/selectors.ts` 한 파일만 고치면 되도록** 설계를 유지하세요. 셀렉터를 코드 여기저기에 흩뿌리지 마세요.
- 코드 주석에 **"왜"** 를 남기세요. 특히 7장의 함정들은 주석이 없으면 다음 사람(또는 다음 세션의 당신)이 "이 이상한 코드 정리해야지" 하고 되살립니다. 실제로 각 함정 옆에 `⚠️` 주석을 달아두는 것이 이 프로젝트에서 효과가 있었습니다.
- 막히면 **살아 있는 DOM에 물어보세요.** 저장된 세션으로 페이지를 띄우고 `.se-component` 를 덤프하거나 버튼의 활성 상태를 읽으면, 추측 열 번보다 빠릅니다. [9장 6.5-b](#9-진행-순서)에 알려진 항목을 재는 절차가, [8-5](#8-5--이-문서에-없는-문제를-만났을-때--자가-진단-절차)에 **모르는 문제를 재는 절차**가 있습니다.
- **이 문서가 틀린 것 같으면, 틀렸을 수 있습니다.** 다만 "틀렸다"고 단정하기 전에 8-5로 재보세요. 지금까지 "7장이 틀렸다"고 보였던 사례 13개 중 **13개가 명세가 맞았고**, 실제로 달랐던 것은 3개였습니다(우측 도크 계열·캡션 크기·발행 버튼 위치). **재고 나서 판단하면 둘 다 구분됩니다.**

**이 프롬프트에서 가장 잘 작동한 것** — 개정할 때 잃지 말아야 할 것들입니다(실제 구현자의 평가):

1. **"실측값이다. 그대로 써라"는 태도.** 이게 없었으면 `:has-text('취소')` 를 우아하다고 여기고 썼을 것입니다.
2. **함정마다 "왜"를 적은 것.** 이유가 없는 규칙은 다음 세션의 자신이 리팩터링으로 지웁니다. 실제로 7-1의 "틀린 추측(마크다운 물결표)" 기록이 같은 함정을 다시 파는 걸 막았습니다.
3. **안전 기본값(연습 모드 켜짐).** 덕분에 실제 에디터에서 결함 4개를 **발행 없이** 찾아냈습니다.
4. **8-1(추측 말고 측정).** 2·3판에서 나온 결함을 전부 이 방식으로 잡았습니다. 그래서 원칙에서 **단계로 승격**시켰습니다(9장 6.5-a/6.5-b).
5. **"후보 배열 앞에 추가하되 기존 값은 남겨라".** 한 환경에서는 발행 버튼이 iframe 밖, 다른 환경에서는 안이었습니다. 값을 지웠다면 한쪽이 깨졌을 것입니다.
6. **검증 가능한 숫자를 준 것.** `761 vs 3637`, `5개 중 1개(20%)`, `7,738 ÷ 31 = 249.6` — 구현자가 대조할 수 있는 형태였고 전부 일치했습니다.

**"추측 열 번보다 DOM 한 번"** — 두 번의 구현 세션에서 원인을 특정한 사례입니다. 전부 이 방식이었습니다:

| 문제 | 추측했다면 | 실제 원인 (측정) |
|---|---|---|
| 글 전체에 취소선 | "물결표가 마크다운 취소선으로" | `:has-text('취소')` 가 **'취소선' 버튼**에 부분일치 |
| 글쓰기만 만료 | "쿠키가 만료됐나" | `NID_AUT/NID_SES` 가 **만료시각 없는 세션 쿠키**(로그인 상태 유지 꺼짐) |
| 스크린샷 우측 가림 | "도움말이 안 닫혔나" | **별개 컴포넌트** `.se-sidebar-close-button` |
| `⚠⚠️` 중복 | "폰트/렌더링 문제" | **VS16 앞 base 문자가 남음**(코드포인트로 확인) |
| 글이 제목 칸에 | "셀렉터가 틀렸나" | **본문 못 찾았을 때 Enter로 넘어가는 코드 경로** |
| 뉴스에 고객센터 링크 | "네이버가 바뀌었나" | `/news/` 에 `help.naver.com/alias/news/` 가 부분일치 |
| 사용량이 추정의 3.4배 | "추정이 좀 빗나갔나" | **공식이 틀림** — 스텝 요금이 타일마다 붙음 |

**환경차를 만나면** — 네이버 에디터는 계정·시점·A/B에 따라 마크업이 다를 수 있습니다.
"명세가 틀렸다"고 단정하고 갈아엎으면 **다른 환경에서 되던 것이 깨집니다.** 항상 이 형태로 처리하세요:

```
① 명세대로 시도한다.
② 실패하면(구체적 판정 기준) 이렇게 한다.
③ 그래도 실패하면 → 8-5의 자가 진단 절차로 DOM을 직접 재서 원인을 특정한다.
   찾아낸 값은 후보 배열 "앞에 추가"한다(기존 값은 지우지 않는다).
④ 진단해도 원인이 특정되지 않으면 그때 비로소 중단하고,
   "무엇을 쟀고 무엇이 나왔는지"를 스크린샷과 함께 보고한다.
   ⚠️ 추측으로 진행하거나, 될 때까지 셀렉터를 바꿔보지 마라.
```

**즉 "중단하고 보고"는 진단을 해본 뒤의 마지막 수단입니다.** 막히자마자 손드는 것이 아닙니다.
