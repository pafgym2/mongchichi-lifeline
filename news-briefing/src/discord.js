// 디스코드 Webhook 전송 유틸

export async function postToDiscord(webhookUrl, payload) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord 전송 실패 ${res.status}: ${body}`);
  }
}

function clip(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// 임베드 field 하나 만들기 (value 1024자, name 256자 제한)
export function buildField(name, summary, link) {
  const value = clip(`${summary}\n[기사 보기](${link})`, 1024);
  return { name: clip(name, 256), value, inline: false };
}

// 긴 텍스트를 임베드 description 길이(약 4096자) 이하로 분할
export function splitForEmbed(text, size = 4000) {
  const chunks = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf("\n", size);
    if (cut < size * 0.5) cut = size;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.trim()) chunks.push(rest);
  return chunks;
}
