// 무료 버전: Claude 요약 없이 헤드라인 + 링크만 라인으로 전송 (API 키 불필요)
import { STOCKS } from "./config.js";
import { fetchNews, fetchTopHeadlines } from "./fetchNews.js";
import { pushToLine, splitText } from "./line.js";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const USER_ID = process.env.LINE_USER_ID;
if (!TOKEN || !USER_ID) {
  console.error("LINE_CHANNEL_ACCESS_TOKEN / LINE_USER_ID 환경변수가 없습니다.");
  process.exit(1);
}

async function main() {
  // 보유 종목: 종목당 최신 1건 (제목 + 링크)
  const stockLines = [];
  for (const s of STOCKS) {
    const items = await fetchNews(s.query, 24);
    const a = items[0];
    stockLines.push(
      a
        ? `📈 ${s.name}\n${a.title}\n🔗 ${a.link}`
        : `📈 ${s.name}\n· 최근 24시간 내 새 뉴스 없음`
    );
  }

  // 핫이슈: 구글 '주요 헤드라인'(중요도순) 상위 10건 (AI 선별 없음)
  const top = await fetchTopHeadlines(24);
  const issueLines = top
    .slice(0, 10)
    .map((it) => `🔥 ${it.title}\n🔗 ${it.link}`);

  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const header = `🆓 [무료 버전] 오늘의 뉴스 — ${today}\n(AI 요약 없이 제목+링크만)`;
  const stockSection = "━━━ 📈 보유 종목 ━━━\n\n" + stockLines.join("\n\n");
  const issueSection = issueLines.length
    ? "━━━ 🔥 오늘의 주요 뉴스 (구글 톱) ━━━\n\n" + issueLines.join("\n\n")
    : "";

  const full = [header, stockSection, issueSection].filter(Boolean).join("\n\n");
  await pushToLine(TOKEN, USER_ID, splitText(full, 4500));
  console.log("무료 버전 전송 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
