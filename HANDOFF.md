# 📋 인수인계 메모 (HANDOFF)

> 이 파일 하나면 어떤 세션/도구에서든 이 프로젝트를 이어서 작업할 수 있도록 정리한 문서입니다.
> 코드 상세는 [`news-briefing/README.md`](./news-briefing/README.md) 참고.

## 한 줄 요약
매일/매주 보유 종목·핫이슈 뉴스를 모아 **Claude로 요약**하고 **라인(LINE)** 으로 보내주는 봇.
서버 없이 **GitHub Actions(무료 예약 실행)** 로 동작한다.

---

## 무엇을 만들었나
- **매일 오전 10시(KST)** — 데일리 브리핑
  - 보유 6종목 각 1건: 테슬라 · SK하이닉스 · 알파벳(구글) · 메타 · 엔비디아 · 삼성전자
  - 핫이슈 최대 10건 (구글 "주요 헤드라인" 중요도순 + 카테고리 검색 → Claude가 선별)
  - 각 항목: 헤드라인 + AI 한국어 요약 + 링크
- **매주 월요일 오전 10시(KST)** — 주간 전망 (보유 종목 + 시장 전체)
- **두 가지 버전 존재**
  - **요약 버전**(유료, Claude 사용): `src/daily.js` + `.github/workflows/daily-briefing.yml` (매일 자동)
  - **무료 버전**(요약 없이 제목+링크): `src/dailyFree.js` + `.github/workflows/daily-free.yml` (현재 수동 실행)

## 뉴스 출처
구글 뉴스 RSS (검색어 기반 + 주요 헤드라인 피드). 링크는 클릭 시 원 언론사로 이동.

---

## 저장소 구조
```
news-briefing/
  src/
    config.js      # 종목·카테고리·모델 설정 (여기만 고치면 대부분 커스터마이즈)
    fetchNews.js   # 구글뉴스 RSS 수집(검색/주요헤드라인) + 기간 필터
    summarize.js   # Claude 요약 / 핫이슈 선별 / 주간 전망
    line.js        # 라인(LINE) push 전송
    daily.js       # 데일리(요약 버전) 실행
    dailyFree.js   # 데일리(무료 버전) 실행
    weekly.js      # 주간 전망 실행
  README.md        # 설정/실행 상세 안내
.github/workflows/
  daily-briefing.yml   # 매일 10시(KST=01:00 UTC) 요약 버전 cron
  daily-free.yml       # 무료 버전 (수동 실행 전용)
  weekly-outlook.yml   # 매주 월 10시 주간 전망 cron
HANDOFF.md
```

---

## 설정 (이미 완료됨)
GitHub → Settings → Secrets and variables → Actions 에 등록 완료:
| Secret | 용도 |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | 라인 채널 액세스 토큰 |
| `LINE_USER_ID` | 수신자(본인) userId (`U…`) |
| `ANTHROPIC_API_KEY` | Claude API 키 (개인 조직, 크레딧 충전됨) |

- 라인 공식계정: **몽치치 뉴스봇** (`@925brjug`) — 봇을 라인에서 **친구 추가**해야 메시지 수신됨.
- Anthropic: 개인 조직(유지훈) + 크레딧 충전 완료.

## 실행 / 테스트 방법
- **자동**: 매일/매주 10시(KST) cron (기본 브랜치 `main`에 워크플로우가 있어야 작동).
- **수동 테스트**: GitHub → Actions 탭 → 워크플로우 선택 → **Run workflow**.
- **로컬**:
  ```bash
  cd news-briefing && npm install
  export ANTHROPIC_API_KEY=... LINE_CHANNEL_ACCESS_TOKEN=... LINE_USER_ID=...
  npm run daily    # 요약 버전
  npm run weekly   # 주간 전망
  node src/dailyFree.js  # 무료 버전
  ```

## 커스터마이즈 (`news-briefing/src/config.js`)
- `STOCKS` — 종목 추가/변경 (`name`, `query`)
- `HOT_CATEGORIES` — 핫이슈 카테고리
- `MAX_HOT_ISSUES` — 핫이슈 최대 개수
- `MODEL` — 기본 `claude-opus-4-8`. 더 저렴·빠르게: `claude-haiku-4-5`

---

## 내린 결정들 (요구사항)
- 전달 채널: 라인 (디스코드에서 변경됨)
- 시간대: 한국시간(KST) 오전 10시 / 주간은 월요일
- 보유 종목: 비중 상위 6개 (위 목록), 종목당 1건, ETF(KODEX200·VOO) 제외
- 핫이슈: 정치·경제·사회·부동산, AI 종합 판단(중요도순), 최대 10건 유동
- 주간 전망 대상: 보유 종목 + 시장 전체 (둘 다)
- 용도: 개인용

## 남은 결정 / TODO
- [ ] **자동 발송을 "요약 버전" vs "무료 버전" 중 무엇으로 할지 최종 결정**
  - 현재 매일 cron은 **요약 버전**으로 설정됨.
  - 무료로 하려면 `daily-briefing.yml`이 `src/dailyFree.js`를 실행하도록 바꾸면 됨(시크릿 ANTHROPIC 불필요).
- [ ] 뉴스 선별 품질 추가 튜닝 여지 (종목 뉴스 정확도, 카테고리 비중 등)
- [ ] (선택) 비용 절감 위해 `MODEL`을 `claude-haiku-4-5`로 변경 검토

## 비용 메모
- 요약 버전: 월 약 $1.5~3 (Opus 4.8) / Haiku로 바꾸면 월 약 $0.3~1
- 무료 버전: $0 (Claude 미사용)

## 알아둘 점 (함정)
- 예약(cron) 실행은 **기본 브랜치(main)** 의 워크플로우만 작동.
- GitHub Actions 예약은 부하에 따라 몇 분~십수 분 **지연** 가능(정확히 10:00 아닐 수 있음).
- 라인은 **봇을 친구 추가한 사용자**에게만 push 가능.
