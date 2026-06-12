import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "./config.js";

// ANTHROPIC_API_KEY 환경변수를 자동으로 사용합니다.
const client = new Anthropic();

function parseJsonFromResponse(res) {
  const text = res.content.find((b) => b.type === "text")?.text || "";
  return JSON.parse(text);
}

// 여러 기사를 한 번의 API 호출로 요약 (비용 절감).
// articles: [{ title, snippet }] → 같은 순서의 요약 문자열 배열 반환.
export async function summarizeBatch(articles) {
  if (!articles.length) return [];
  const list = articles
    .map((a, i) => `[${i}] 제목: ${a.title}\n발췌: ${a.snippet || "(없음)"}`)
    .join("\n\n");

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system:
        "당신은 한국어 뉴스 요약 전문가입니다. 각 기사를 핵심만 1~2문장으로 간결히 요약하세요. 제공된 내용에만 근거하고 추측하지 마세요.",
      messages: [
        { role: "user", content: `다음 기사들을 각각 요약해 주세요.\n\n${list}` },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer" },
                    summary: { type: "string" },
                  },
                  required: ["index", "summary"],
                  additionalProperties: false,
                },
              },
            },
            required: ["results"],
            additionalProperties: false,
          },
        },
      },
    });
    const parsed = parseJsonFromResponse(res);
    const map = new Map(parsed.results.map((r) => [r.index, r.summary]));
    return articles.map((a, i) => map.get(i) || a.snippet || "요약 없음");
  } catch (err) {
    console.error("요약 실패, 발췌로 대체:", err.message);
    return articles.map((a) => a.snippet || "요약을 생성하지 못했습니다.");
  }
}

// 핫이슈 후보 중 중요한 것을 Claude가 선별 + 요약.
// candidates: [{ id, category, title, source, link, snippet }]
export async function selectHotIssues(candidates, maxN) {
  if (!candidates.length) return [];
  const list = candidates
    .map((c) => `[id ${c.id}] (${c.category}) ${c.title}`)
    .join("\n");

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system:
        "당신은 한국 뉴스 데스크 편집자입니다. 후보 헤드라인 중 오늘 가장 중요한 이슈를 선별하고, 각각 한국어 1~2문장 요약을 작성합니다.",
      messages: [
        {
          role: "user",
          content: `다음 후보 중 오늘 가장 중요한 이슈를 최대 ${maxN}개 선별하세요. 비슷한 주제는 하나로 묶고, 중요도가 높은 순서로 정렬하세요.\n\n${list}`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              issues: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    summary: { type: "string" },
                  },
                  required: ["id", "summary"],
                  additionalProperties: false,
                },
              },
            },
            required: ["issues"],
            additionalProperties: false,
          },
        },
      },
    });
    const parsed = parseJsonFromResponse(res);
    const byId = new Map(candidates.map((c) => [c.id, c]));
    return parsed.issues
      .map((it) => {
        const c = byId.get(it.id);
        if (!c) return null;
        return {
          title: c.title,
          source: c.source,
          link: c.link,
          category: c.category,
          summary: it.summary,
        };
      })
      .filter(Boolean)
      .slice(0, maxN);
  } catch (err) {
    console.error("핫이슈 선별 실패, 최신순으로 대체:", err.message);
    return candidates.slice(0, maxN).map((c) => ({
      title: c.title,
      source: c.source,
      link: c.link,
      category: c.category,
      summary: c.snippet || "(요약 없음)",
    }));
  }
}

// 주간 전망 코멘트 작성.
export async function weeklyOutlook(stockContext, marketContext) {
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system:
        "당신은 시장 뉴스를 정리하는 애널리스트입니다. 제공된 뉴스에 근거해 향후 흐름에 대한 관점을 간결히 정리하세요. 단정적인 투자 권유는 피하고, 뉴스 기반 관찰과 주목할 변수 위주로 작성합니다.",
      messages: [
        {
          role: "user",
          content: `다음은 지난 한 주간의 뉴스 헤드라인입니다.\n\n【보유 종목 관련】\n${stockContext}\n\n【시장·경제 전반】\n${marketContext}\n\n이를 바탕으로 한국어로 정리해 주세요:\n\n**📌 보유 종목 관전 포인트**\n(테슬라·SK하이닉스·알파벳·메타·엔비디아·삼성전자 흐름에서 주목할 점을 3~5개 불릿으로)\n\n**📌 시장 전체 관전 포인트**\n(이번 주 주목할 변수를 3~5개 불릿으로)\n\n※ 투자 자문이 아니라 뉴스 기반 관점 정리임을 전제로 작성하세요.`,
        },
      ],
    });
    return (
      res.content.find((b) => b.type === "text")?.text?.trim() ||
      "전망을 생성하지 못했습니다."
    );
  } catch (err) {
    console.error("주간 전망 생성 실패:", err.message);
    return "주간 전망 생성에 실패했습니다.";
  }
}
