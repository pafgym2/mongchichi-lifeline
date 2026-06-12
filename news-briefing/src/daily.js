import { STOCKS, HOT_CATEGORIES, MAX_HOT_ISSUES } from "./config.js";
import { fetchNews } from "./fetchNews.js";
import { summarizeBatch, selectHotIssues } from "./summarize.js";
import { postToDiscord, buildField } from "./discord.js";

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
if (!WEBHOOK) {
  console.error("DISCORD_WEBHOOK_URL 환경변수가 없습니다.");
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
  const stockFields = stockArticles.map((x) => {
    if (!x.article) {
      return buildField(
        `📈 ${x.stock}`,
        "최근 24시간 내 새 뉴스가 없습니다.",
        "https://news.google.com"
      );
    }
    return buildField(`📈 ${x.stock}`, summaries[si++], x.article.link);
  });

  // 2) 핫이슈 후보 수집 (최근 24시간, 카테고리별 상위 8건) → Claude가 선별
  let id = 0;
  const candidates = [];
  for (const cat of HOT_CATEGORIES) {
    const items = (await fetchNews(cat.query, 24)).slice(0, 8);
    for (const it of items) candidates.push({ id: id++, category: cat.name, ...it });
  }
  const issues = await selectHotIssues(candidates, MAX_HOT_ISSUES);
  const issueFields = issues.map((it) =>
    buildField(`🔥 [${it.category}] ${it.title}`, it.summary, it.link)
  );

  // 3) 디스코드 전송
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const embeds = [
    { title: `📊 보유 종목 뉴스 — ${today}`, color: 0x2f6df6, fields: stockFields },
  ];
  if (issueFields.length) {
    embeds.push({ title: "🔥 오늘의 핫이슈", color: 0xf25c54, fields: issueFields });
  }

  await postToDiscord(WEBHOOK, { username: "📰 뉴스 브리핑", embeds });
  console.log("데일리 브리핑 전송 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
