import Parser from "rss-parser";

const parser = new Parser({ timeout: 10000 });

// 카테고리 → Google News RSS 검색 쿼리 매핑 (config.js의 카테고리와 동일하게 유지)
const QUERIES = {
  AI: "AI 인공지능",
  cloud: "클라우드 컴퓨팅",
  datacenter: "데이터센터",
  economy: "경제",
  startup: "스타트업",
};

// 최근 24시간 이내 기사만, 카테고리별로 수집해 반환합니다.
export default async function handler(req, res) {
  const category = (req.query.category || "AI").toString();
  const query = QUERIES[category] || QUERIES.AI;

  const feedUrl =
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(query) +
    "&hl=ko&gl=KR&ceid=KR:ko";

  try {
    const feed = await parser.parseURL(feedUrl);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24시간 이내

    const items = (feed.items || [])
      .map((item) => {
        // Google News 제목 형식: "헤드라인 - 언론사"
        const rawTitle = item.title || "";
        const parts = rawTitle.split(" - ");
        const source =
          parts.length > 1 ? parts.pop() : item.creator || "출처 미상";
        const title = parts.length ? parts.join(" - ") : rawTitle;
        return {
          title,
          source,
          link: item.link || "",
          snippet: stripHtml(item.contentSnippet || item.content || ""),
          publishedAt: item.isoDate || item.pubDate || null,
        };
      })
      .filter((item) => {
        if (!item.publishedAt) return false;
        return new Date(item.publishedAt).getTime() >= cutoff;
      })
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

    // Vercel 엣지 캐시: 5분 캐시, 이후 10분간 stale 허용
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ category, count: items.length, items });
  } catch (err) {
    res
      .status(502)
      .json({ error: "피드를 불러오지 못했습니다.", detail: String(err) });
  }
}

function stripHtml(s) {
  return (s || "").replace(/<[^>]*>/g, "").trim();
}
