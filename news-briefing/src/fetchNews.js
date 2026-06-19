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

// Google News 주요 헤드라인(톱뉴스) 피드 — 구글이 중요도순으로 정렬해 줌
const TOP_HEADLINES_URL = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";

function toArticle(item) {
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
}

// keepOrder=true 면 피드 순서(중요도) 유지, 아니면 최신순 정렬
async function fetchFeedUrl(url, withinHours, keepOrder = false) {
  const cutoff = Date.now() - withinHours * 60 * 60 * 1000;
  let feed;
  try {
    feed = await parser.parseURL(url);
  } catch (err) {
    console.error(`피드 수집 실패 [${url}]:`, err.message);
    return [];
  }

  const items = (feed.items || [])
    .map(toArticle)
    .filter(
      (it) => it.publishedAt && new Date(it.publishedAt).getTime() >= cutoff
    );

  if (!keepOrder) {
    items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  return items;
}

// 검색어 기반 뉴스 (최신순)
export function fetchNews(query, withinHours) {
  return fetchFeedUrl(googleNewsUrl(query), withinHours, false);
}

// 주요 헤드라인 (구글 중요도순 유지)
export function fetchTopHeadlines(withinHours) {
  return fetchFeedUrl(TOP_HEADLINES_URL, withinHours, true);
}
