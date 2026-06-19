import Parser from "rss-parser";

const parser = new Parser({ timeout: 15000 });

// Google News RSS 검색 URL (한국어/한국 기준)
export function googleNewsUrl(query) {
  return (
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(query) +
    "&hl=ko&gl=KR&ceid=KR:ko"
  );
}

// 검색어로 뉴스를 가져와 최근 withinHours 시간 이내 기사만 최신순으로 반환.
export async function fetchNews(query, withinHours) {
  const cutoff = Date.now() - withinHours * 60 * 60 * 1000;
  let feed;
  try {
    feed = await parser.parseURL(googleNewsUrl(query));
  } catch (err) {
    console.error(`피드 수집 실패 [${query}]:`, err.message);
    return [];
  }

  return (feed.items || [])
    .map((item) => {
      // Google News 제목 형식: "헤드라인 - 언론사"
      const raw = item.title || "";
      const parts = raw.split(" - ");
      const source = parts.length > 1 ? parts.pop() : item.creator || "";
      const title = parts.length ? parts.join(" - ") : raw;
      return {
        title,
        source,
        link: item.link || "",
        snippet: (item.contentSnippet || "").replace(/<[^>]*>/g, "").trim(),
        publishedAt: item.isoDate || item.pubDate || null,
      };
    })
    .filter(
      (it) => it.publishedAt && new Date(it.publishedAt).getTime() >= cutoff
    )
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}
