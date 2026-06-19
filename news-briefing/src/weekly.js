import { STOCKS, MARKET_QUERIES } from "./config.js";
import { fetchNews } from "./fetchNews.js";
import { weeklyOutlook } from "./summarize.js";
import { pushToLine, splitText } from "./line.js";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const USER_ID = process.env.LINE_USER_ID;
if (!TOKEN || !USER_ID) {
  console.error("LINE_CHANNEL_ACCESS_TOKEN / LINE_USER_ID 환경변수가 없습니다.");
  process.exit(1);
}

async function main() {
  // 지난 7일간 보유 종목 헤드라인 모으기
  const stockBlocks = [];
  for (const s of STOCKS) {
    const items = (await fetchNews(s.query, 24 * 7)).slice(0, 4);
    const lines = items.map((i) => `- ${i.title}`).join("\n") || "- (해당 뉴스 없음)";
    stockBlocks.push(`■ ${s.name}\n${lines}`);
  }

  // 지난 7일간 시장·경제 헤드라인 모으기
  const marketBlocks = [];
  for (const q of MARKET_QUERIES) {
    const items = (await fetchNews(q, 24 * 7)).slice(0, 4);
    const lines = items.map((i) => `- ${i.title}`).join("\n") || "- (해당 뉴스 없음)";
    marketBlocks.push(`■ ${q}\n${lines}`);
  }

  const outlook = await weeklyOutlook(
    stockBlocks.join("\n\n"),
    marketBlocks.join("\n\n")
  );

  const monday = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const full = `🔮 주간 전망\n${monday}\n\n${outlook}`;
  await pushToLine(TOKEN, USER_ID, splitText(full, 4500));
  console.log("주간 전망 전송 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
