# 📰 뉴스 브리핑 봇 (라인 전송)

매일/매주 자동으로 뉴스를 모아 **Claude로 요약**하고 **라인(LINE)** 으로 보내주는 봇입니다.
서버나 웹사이트 없이 **GitHub Actions(무료 예약 실행)** 로 동작합니다.

## 무엇을 보내주나요?

**🗓️ 매일 오전 10시 (한국시간) — 데일리 브리핑**
- 📈 보유 종목 6개 각 1건: 테슬라 · SK하이닉스 · 알파벳(구글) · 메타 · 엔비디아 · 삼성전자
- 🔥 정치·경제·사회·부동산 핫이슈: 최대 10개 (Claude가 중요도순 선별)
- 각 항목: 헤드라인 + AI 한국어 요약 + 기사 링크

**🗓️ 매주 월요일 오전 10시 — 주간 전망**
- 보유 종목 흐름 + 시장 전체 관전 포인트 (지난 한 주 뉴스를 Claude가 종합)
- ※ 투자 자문이 아니라 뉴스 기반 관점 정리입니다.

> 월요일에는 데일리 브리핑과 주간 전망이 모두 도착합니다.

---

## ⚙️ 처음 한 번만 설정하기

### 1. 라인 Messaging API 채널 만들기
1. https://developers.line.biz/console/ 접속 → 라인 계정으로 로그인
2. **Provider 생성**(아무 이름) → **Create a Messaging API channel** 선택해 채널 생성
3. 채널 들어가서 **Messaging API** 탭 →
   - **Channel access token (long-lived)** → **Issue** 눌러 토큰 발급 → 복사해서 보관
   - 같은 화면의 **QR 코드**를 라인 앱으로 스캔해 이 봇을 **친구 추가** (그래야 메시지를 받을 수 있어요)

### 2. 내 userId 확인하기
- 채널의 **Basic settings** 탭 맨 아래 **"Your user ID"** 값(`U`로 시작)을 복사해 보관
- 이게 "나에게 보내기" 대상 주소예요.

### 3. Claude API 키 준비
- https://console.anthropic.com → API Keys 에서 키 발급

### 4. GitHub Secrets 등록
저장소 → **Settings → Secrets and variables → Actions → New repository secret** 에서 3개 등록:

| 이름 | 값 |
|------|-----|
| `LINE_CHANNEL_ACCESS_TOKEN` | 1번에서 발급한 채널 액세스 토큰 |
| `LINE_USER_ID` | 2번에서 복사한 내 userId (`U…`) |
| `ANTHROPIC_API_KEY` | Claude API 키 |

### 5. 예약 실행 활성화 (중요)
- 예약(cron) 실행은 **기본 브랜치(main)** 에 워크플로우 파일이 있어야 작동합니다. 이 브랜치를 **main에 머지**해 주세요.
- 저장소 **Actions** 탭에서 워크플로우가 활성화돼 있는지 확인하세요.

---

## ▶️ 바로 테스트하기 (10시까지 안 기다리고)

GitHub 저장소 → **Actions** 탭 → "데일리 뉴스 브리핑" 또는 "주간 전망 브리핑"
→ **Run workflow** 버튼으로 즉시 실행해 라인으로 잘 오는지 확인할 수 있어요.

### 로컬에서 테스트
```bash
cd news-briefing
npm install
export ANTHROPIC_API_KEY="sk-ant-..."
export LINE_CHANNEL_ACCESS_TOKEN="..."
export LINE_USER_ID="U..."
npm run daily     # 데일리 브리핑 테스트
npm run weekly    # 주간 전망 테스트
```

---

## 🔧 커스터마이징

`src/config.js` 에서 바꿀 수 있어요:
- **종목 추가/변경**: `STOCKS` 의 `name`(표시 이름), `query`(뉴스 검색어)
- **핫이슈 카테고리**: `HOT_CATEGORIES`
- **핫이슈 최대 개수**: `MAX_HOT_ISSUES`
- **모델**: `MODEL` — 기본 `claude-opus-4-8`. 더 저렴·빠르게 하려면 `claude-haiku-4-5` 로 변경

## 📁 구조
```
news-briefing/
  src/
    config.js      # 종목·카테고리·모델 설정
    fetchNews.js   # Google News RSS 수집 + 기간 필터
    summarize.js   # Claude 요약 / 핫이슈 선별 / 주간 전망
    line.js        # 라인(LINE) 전송
    daily.js       # 데일리 브리핑 실행
    weekly.js      # 주간 전망 실행
.github/workflows/
  daily-briefing.yml    # 매일 10시(KST) 예약
  weekly-outlook.yml    # 매주 월 10시(KST) 예약
```

## ⏰ 참고
- GitHub Actions 예약 실행은 서버 부하에 따라 **몇 분~십수 분 지연**될 수 있습니다(GitHub 정책). 정확히 10:00이 아닐 수 있어요.
- 라인 공식계정 **무료 요금제**의 메시지 한도 안에서 동작합니다(개인 하루 1~2회 수신은 충분). 너무 많은 메시지로 쪼개지면 한도에 영향을 줄 수 있어요.
- 뉴스 출처는 **구글 뉴스 RSS**(국내 여러 언론사 집계)이며, 링크는 클릭 시 원 기사로 이동합니다.
