import { STOCKS, MARKET_QUERIES } from "./config.js";
import { fetchNews } from "./fetchNews.js";
import { weeklyOutlook } from "./summarize.js";
import { postToDiscord, splitForEmbed } from "./discord.js";

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
if (!WEBHOOK) {
  console.error("DISCORD_WEBHOOK_URL 환경변수가 없습니다.");
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
  const chunks = splitForEmbed(outlook, 4000);
  const embeds = chunks.map((c, i) => ({
    title: i === 0 ? `🔮 주간 전망 — ${monday}` : "🔮 주간 전망 (계속)",
    description: c,
    color: 0x9b59b6,
  }));

  await postToDiscord(WEBHOOK, { username: "🔮 주간 전망", embeds });
  console.log("주간 전망 전송 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
