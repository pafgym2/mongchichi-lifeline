import { STOCKS, HOT_CATEGORIES, MAX_HOT_ISSUES } from "./config.js";
import { fetchNews } from "./fetchNews.js";
import { summarizeBatch, selectHotIssues } from "./summarize.js";
import { pushToLine, splitText } from "./line.js";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const USER_ID = process.env.LINE_USER_ID;
if (!TOKEN || !USER_ID) {
  console.error("LINE_CHANNEL_ACCESS_TOKEN / LINE_USER_ID 환경변수가 없습니다.");
  process.exit(1);
}

async function main() {
  // 1) 보유 종목: 종목당 최신 1건 (최근 24시간)
  const stockArticles = [];
  for (const s of STOCKS) {
    const items = await fetchNews(s.query, 24);
    stockArticles.push({ stock: s.name, article: items[0] || null });
  }

  const toSummarize = stockArticles
    .filter((x) => x.article)
    .map((x) => x.article);
  const summaries = await summarizeBatch(toSummarize);

  let si = 0;
  const stockLines = stockArticles.map((x) => {
    if (!x.article) return `📈 ${x.stock}\n· 최근 24시간 내 새 뉴스 없음`;
    return `📈 ${x.stock}\n· ${summaries[si++]}\n🔗 ${x.article.link}`;
  });

  // 2) 핫이슈 후보 수집 (최근 24시간, 카테고리별 상위 8건) → Claude가 선별
  let id = 0;
  const candidates = [];
  for (const cat of HOT_CATEGORIES) {
    const items = (await fetchNews(cat.query, 24)).slice(0, 8);
    for (const it of items) candidates.push({ id: id++, category: cat.name, ...it });
  }
  const issues = await selectHotIssues(candidates, MAX_HOT_ISSUES);
  const issueLines = issues.map(
    (it) => `🔥 [${it.category}] ${it.title}\n· ${it.summary}\n🔗 ${it.link}`
  );

  // 3) 메시지 조립 후 라인 전송
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const header = `📊 오늘의 뉴스 브리핑\n${today}`;
  const stockSection = "━━━ 📈 보유 종목 ━━━\n\n" + stockLines.join("\n\n");
  const issueSection = issueLines.length
    ? "━━━ 🔥 오늘의 핫이슈 ━━━\n\n" + issueLines.join("\n\n")
    : "";

  const full = [header, stockSection, issueSection].filter(Boolean).join("\n\n");
  await pushToLine(TOKEN, USER_ID, splitText(full, 4500));
  console.log("데일리 브리핑 전송 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
