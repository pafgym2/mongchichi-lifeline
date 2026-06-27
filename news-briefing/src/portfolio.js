// 가족 포트폴리오 일일 리포트 — 라인(LINE) 전송
// 시세: 미국=Yahoo Finance, 한국=Naver(폴백 Yahoo). 환율=Yahoo USD/KRW.
// ※ 정보 제공용이며 투자 조언이 아닙니다.

import { OWNERS, CASH_NOTES } from "./holdings.js";
import { pushToLine, splitText } from "./line.js";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const USER_ID = process.env.LINE_USER_ID;
if (!TOKEN || !USER_ID) {
  console.error("LINE_CHANNEL_ACCESS_TOKEN / LINE_USER_ID 환경변수가 없습니다.");
  process.exit(1);
}

const won = (n) => Math.round(n).toLocaleString("ko-KR") + "원";
const pct = (n) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const sign = (n) => (n >= 0 ? "+" : "") + won(n);

async function getJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function yahooPrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const j = await getJSON(url);
  const r = j?.chart?.result?.[0]?.meta;
  if (!r || r.regularMarketPrice == null) throw new Error("no price " + ticker);
  return { price: r.regularMarketPrice, prev: r.chartPreviousClose ?? r.previousClose ?? null };
}

async function naverPrice(code) {
  const url = `https://polling.finance.naver.com/api/realtime/domestic/stock/${code}`;
  const j = await getJSON(url);
  const d = j?.datas?.[0];
  if (!d) throw new Error("no naver " + code);
  const price = Number(String(d.closePrice).replace(/,/g, ""));
  const rate = d.fluctuationsRatio != null ? Number(d.fluctuationsRatio) : null;
  return { price, dayPct: rate };
}

async function getFX() {
  try {
    const { price } = await yahooPrice("KRW=X");
    if (price > 500) return price;
  } catch {}
  return 1390; // 폴백
}

async function priceOf(pos, fx) {
  // 반환: { krw: 주당 현재가(원), dayPct: 당일등락(있으면) }
  if (pos.market === "KR") {
    try {
      const n = await naverPrice(pos.ticker);
      return { krw: n.price, dayPct: n.dayPct };
    } catch {
      const suffix = pos.ticker.length === 6 ? ".KS" : "";
      const y = await yahooPrice(pos.ticker + (suffix || ".KS"));
      const dayPct = y.prev ? ((y.price - y.prev) / y.prev) * 100 : null;
      return { krw: y.price, dayPct };
    }
  }
  const y = await yahooPrice(pos.ticker);
  const dayPct = y.prev ? ((y.price - y.prev) / y.prev) * 100 : null;
  return { krw: y.price * fx, dayPct, usd: y.price };
}

async function main() {
  const fx = await getFX();
  const failed = [];

  let gEval = 0, gCost = 0;
  const ownerBlocks = [];
  const movers = [];
  const allPositions = [];

  for (const o of OWNERS) {
    let oEval = 0, oCost = 0;
    const acctLines = [];
    for (const acc of o.accounts) {
      let aEval = 0, aCost = 0;
      const lines = [];
      for (const p of acc.positions) {
        let pr;
        try {
          pr = await priceOf(p, fx);
        } catch (e) {
          failed.push(`${o.owner}/${p.name}(${p.ticker})`);
          continue;
        }
        const ev = p.shares * pr.krw;
        const co = p.shares * p.avgKRW;
        const ret = co > 0 ? ((ev - co) / co) * 100 : 0;
        aEval += ev; aCost += co;
        lines.push(`· ${p.name} ${pct(ret)} (${won(ev)})`);
        movers.push({ owner: o.owner, name: p.name, ret });
        allPositions.push({ owner: o.owner, name: p.name, ev, retPct: ret, dayPct: pr.dayPct ?? null });
      }
      oEval += aEval; oCost += aCost;
      const aRet = aCost > 0 ? ((aEval - aCost) / aCost) * 100 : 0;
      acctLines.push(`〔${acc.account}〕 ${won(aEval)} (${pct(aRet)})\n${lines.join("\n")}`);
    }
    gEval += oEval; gCost += oCost;
    const oRet = oCost > 0 ? ((oEval - oCost) / oCost) * 100 : 0;
    ownerBlocks.push(`👤 ${o.owner} — ${won(oEval)} · ${pct(oRet)}\n${acctLines.join("\n\n")}`);
  }

  const gRet = gCost > 0 ? ((gEval - gCost) / gCost) * 100 : 0;
  const netWorth = gEval + CASH_NOTES.dcPensionKRW + CASH_NOTES.bankDepositKRW;

  const today = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  const header = `📊 가족 포트폴리오 리포트\n${today}  ·  환율 ${Math.round(fx).toLocaleString("ko-KR")}원/USD`;

  const summary =
    "━━━ 🏠 가구 종합 ━━━\n" +
    `주식 평가액: ${won(gEval)}\n` +
    `평가손익: ${sign(gEval - gCost)} (${pct(gRet)})\n` +
    `순자산(주식+예금+연금): ${won(netWorth)}`;

  const up = [...movers].sort((a, b) => b.ret - a.ret).slice(0, 3)
    .map((m) => `▲ ${m.name}(${m.owner[0]}) ${pct(m.ret)}`);
  const down = [...movers].sort((a, b) => a.ret - b.ret).slice(0, 3)
    .map((m) => `▼ ${m.name}(${m.owner[0]}) ${pct(m.ret)}`);
  const moversSec = "━━━ 📈 수익률 상·하위 ━━━\n" + up.join("\n") + "\n" + down.join("\n");

  // 집중도 경고: 가구 총 평가액 대비 비중 25% 이상 종목
  let concentrationSec = "";
  if (gEval > 0) {
    const heavy = allPositions
      .map((p) => ({ ...p, weight: (p.ev / gEval) * 100 }))
      .filter((p) => p.weight >= 25)
      .sort((a, b) => b.weight - a.weight);
    if (heavy.length) {
      concentrationSec = "━━━ ⚠️ 집중도 ━━━\n"
        + heavy.map((p) => `${p.name}(${p.owner}) — 비중 ${Math.round(p.weight)}% (${won(p.ev)})`).join("\n")
        + "\n한 종목 비중이 높아요. 분산 상태를 참고하세요.";
    }
  }

  // 당일 급등락: dayPct 절대값 5% 이상 종목 (등락 큰 순)
  let bigMoveSec = "";
  const bigMoves = allPositions
    .filter((p) => p.dayPct != null && Math.abs(p.dayPct) >= 5)
    .sort((a, b) => Math.abs(b.dayPct) - Math.abs(a.dayPct));
  if (bigMoves.length) {
    bigMoveSec = "━━━ 📊 오늘 큰 변동 ━━━\n"
      + bigMoves.map((p) => `${p.dayPct >= 0 ? "▲" : "▼"} ${p.name}(${p.owner}) 당일 ${pct(p.dayPct)}`).join("\n");
  }

  const pension =
    "━━━ 💰 알림 ━━━\n" +
    `김경아 DC형 퇴직연금 ${won(CASH_NOTES.dcPensionKRW)} 전액 미투자(현금성) 상태입니다.`;

  const foot = "※ 정보 제공용이며 투자 조언이 아닙니다. 거래 전 증권사 앱에서 시세를 확인하세요."
    + (failed.length ? `\n⚠️ 시세 조회 실패: ${failed.join(", ")}` : "");

  const full = [header, summary, ...ownerBlocks, moversSec, concentrationSec, bigMoveSec, pension, foot]
    .filter(Boolean).join("\n\n");
  await pushToLine(TOKEN, USER_ID, splitText(full, 4500));
  console.log("포트폴리오 리포트 전송 완료" + (failed.length ? ` (실패 ${failed.length})` : ""));
}

main().catch((err) => { console.error(err); process.exit(1); });
