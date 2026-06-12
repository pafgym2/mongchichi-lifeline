import Anthropic from "@anthropic-ai/sdk";

// ANTHROPIC_API_KEY 환경변수를 자동으로 사용합니다.
const client = new Anthropic();

// 요약에 사용할 모델.
// 기본값은 가장 똑똑한 claude-opus-4-8 입니다.
// 기사 수가 많아 비용/속도가 부담되면 아래를 "claude-haiku-4-5" 로 바꾸세요(훨씬 저렴·고속).
const MODEL = "claude-opus-4-8";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }

  const { title, snippet } = req.body || {};
  if (!title) {
    res.status(400).json({ error: "title이 필요합니다." });
    return;
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024, // 요약은 짧으므로 충분
      system:
        "당신은 한국어 뉴스 요약 전문가입니다. 주어진 기사 제목과 발췌문을 바탕으로 핵심만 2~3문장으로 간결하게 요약하세요. 제공된 내용에 근거해서만 작성하고, 추측하거나 없는 사실을 만들지 마세요.",
      messages: [
        {
          role: "user",
          content: `다음 뉴스를 한국어로 요약해 주세요.\n\n제목: ${title}\n\n발췌: ${
            snippet || "(발췌 내용 없음)"
          }`,
        },
      ],
    });

    const summary =
      response.content.find((b) => b.type === "text")?.text?.trim() || "";
    res.status(200).json({ summary });
  } catch (err) {
    res
      .status(502)
      .json({ error: "요약 생성에 실패했습니다.", detail: String(err) });
  }
}
