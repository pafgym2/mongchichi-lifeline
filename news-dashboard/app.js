import { CATEGORIES } from "./config.js";

const tabsEl = document.getElementById("tabs");
const articlesEl = document.getElementById("articles");

const BOOKMARKS_KEY = "news_bookmarks";
const SUMMARY_KEY = "news_summaries";

let activeTab = CATEGORIES[0].id;

// --- localStorage 헬퍼 ---
function loadJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}
function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

// --- 탭 렌더링 ---
function renderTabs() {
  const tabs = [...CATEGORIES, { id: "__bookmarks__", label: "⭐ 북마크" }];
  tabsEl.innerHTML = "";
  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.textContent = tab.label;
    btn.className = "tab" + (tab.id === activeTab ? " active" : "");
    btn.onclick = () => {
      activeTab = tab.id;
      renderTabs();
      loadActive();
    };
    tabsEl.appendChild(btn);
  }
}

async function loadActive() {
  if (activeTab === "__bookmarks__") {
    renderBookmarks();
    return;
  }
  articlesEl.innerHTML = '<p class="status">불러오는 중…</p>';
  try {
    const res = await fetch(
      `/api/feeds?category=${encodeURIComponent(activeTab)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "불러오기 실패");
    renderArticles(data.items);
  } catch (err) {
    articlesEl.innerHTML = `<p class="status error">불러오지 못했습니다: ${err.message}</p>`;
  }
}

function renderArticles(items) {
  if (!items.length) {
    articlesEl.innerHTML =
      '<p class="status">최근 24시간 이내 기사가 없습니다.</p>';
    return;
  }
  articlesEl.innerHTML = "";
  const bookmarks = loadJSON(BOOKMARKS_KEY);
  for (const item of items) {
    articlesEl.appendChild(renderCard(item, !!bookmarks[item.link]));
  }
}

function renderBookmarks() {
  const items = Object.values(loadJSON(BOOKMARKS_KEY));
  if (!items.length) {
    articlesEl.innerHTML = '<p class="status">북마크한 기사가 없습니다.</p>';
    return;
  }
  articlesEl.innerHTML = "";
  for (const item of items) {
    articlesEl.appendChild(renderCard(item, true));
  }
}

function renderCard(item, bookmarked) {
  const card = document.createElement("article");
  card.className = "card";

  const time = item.publishedAt
    ? new Date(item.publishedAt).toLocaleString("ko-KR")
    : "";

  card.innerHTML = `
    <div class="card-head">
      <button class="star ${bookmarked ? "on" : ""}" title="북마크">★</button>
      <div class="meta">
        <span class="source">${escapeHtml(item.source)}</span>
        <span class="time">${time}</span>
      </div>
    </div>
    <h3 class="title"><a href="${item.link}" target="_blank" rel="noopener">${escapeHtml(
      item.title
    )}</a></h3>
    <p class="snippet">${escapeHtml(item.snippet || "")}</p>
    <div class="summary-area">
      <button class="summarize-btn">🤖 AI 요약 보기</button>
      <p class="summary"></p>
    </div>
  `;

  // 북마크 토글
  const star = card.querySelector(".star");
  star.onclick = () => {
    const bookmarks = loadJSON(BOOKMARKS_KEY);
    if (bookmarks[item.link]) {
      delete bookmarks[item.link];
      star.classList.remove("on");
    } else {
      bookmarks[item.link] = item;
      star.classList.add("on");
    }
    saveJSON(BOOKMARKS_KEY, bookmarks);
    if (activeTab === "__bookmarks__") loadActive();
  };

  // AI 요약 (클릭 시 생성, localStorage 캐시)
  const btn = card.querySelector(".summarize-btn");
  const summaryEl = card.querySelector(".summary");
  const cached = loadJSON(SUMMARY_KEY)[item.link];
  if (cached) {
    summaryEl.textContent = cached;
    btn.style.display = "none";
  }
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = "요약 생성 중…";
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.title, snippet: item.snippet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "요약 실패");
      summaryEl.textContent = data.summary;
      const summaries = loadJSON(SUMMARY_KEY);
      summaries[item.link] = data.summary;
      saveJSON(SUMMARY_KEY, summaries);
      btn.style.display = "none";
    } catch (err) {
      summaryEl.textContent = "요약 실패: " + err.message;
      btn.disabled = false;
      btn.textContent = "🤖 다시 시도";
    }
  };

  return card;
}

function escapeHtml(s) {
  return (s || "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}

renderTabs();
loadActive();
