// 라인(LINE) Messaging API 전송 유틸
// 본인에게 푸시하려면 채널 액세스 토큰과 본인 userId가 필요합니다.

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

function clip(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// 긴 텍스트를 maxLen 이하의 메시지 여러 개로 분할 (줄 단위로 자름)
export function splitText(text, maxLen = 4500) {
  const lines = text.split("\n");
  const chunks = [];
  let cur = "";
  for (const line of lines) {
    if (cur && (cur + "\n" + line).length > maxLen) {
      chunks.push(cur);
      cur = line;
    } else {
      cur = cur ? cur + "\n" + line : line;
    }
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

// texts(문자열 배열)를 라인으로 푸시. 1회 푸시당 최대 5개 메시지 → 초과 시 나눠 전송.
export async function pushToLine(token, userId, texts) {
  for (let i = 0; i < texts.length; i += 5) {
    const messages = texts
      .slice(i, i + 5)
      .map((t) => ({ type: "text", text: clip(t, 5000) }));
    const res = await fetch(LINE_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: userId, messages }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`LINE 전송 실패 ${res.status}: ${body}`);
    }
  }
}
