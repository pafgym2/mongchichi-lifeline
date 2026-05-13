const STORAGE_KEY = "mongchichi-lifeline-v2";
const PHOTO_BUCKET = "event-photos";

const defaultTimelines = [
  { id: "family", title: "몽치치패밀리", color: "#23966b" },
  { id: "daughter", title: "딸 성장기록", color: "#ef7b64" },
  { id: "son", title: "아들 성장기록", color: "#427aa1" },
  { id: "travel", title: "가족여행", color: "#d6a23d" },
  { id: "books", title: "영어책", color: "#7b6fd6" }
];

const defaultEvent = {
  id: "local-start",
  timelineId: "family",
  title: "가족 라이프라인 시작",
  eventDate: new Date().toISOString().slice(0, 10),
  person: "가족",
  category: "기념일",
  significance: "중요",
  location: "우리집",
  youtubeUrl: "",
  description: "몽치치패밀리의 소중한 순간들을 날짜순으로 모으기 시작한 날.",
  photos: []
};

const seedState = {
  user: null,
  timelines: defaultTimelines,
  events: [defaultEvent],
  selectedTimelineId: "family",
  filters: { q: "", category: "", person: "", significance: "" },
  loading: true,
  message: ""
};

const supabaseConfig = window.MONGCHICHI_SUPABASE ?? {};
const hasSupabaseConfig =
  Boolean(supabaseConfig.url) &&
  Boolean(supabaseConfig.anonKey) &&
  !String(supabaseConfig.url).includes("YOUR_") &&
  !String(supabaseConfig.anonKey).includes("YOUR_");

const supabaseClient =
  hasSupabaseConfig && window.supabase
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : null;

let state = loadLocalState();
let modal = null;

init();

async function init() {
  if (!supabaseClient) {
    state.loading = false;
    render();
    return;
  }

  render();
  const { data } = await supabaseClient.auth.getSession();
  state.user = data.session?.user ?? null;

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    state.user = session?.user ?? null;
    if (state.user) await loadCloudData();
    state.loading = false;
    render();
  });

  if (state.user) await loadCloudData();
  state.loading = false;
  render();
}

function loadLocalState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seedState);

  try {
    return { ...structuredClone(seedState), ...JSON.parse(saved), loading: true, message: "" };
  } catch {
    return structuredClone(seedState);
  }
}

function saveLocalState() {
  if (!supabaseClient) localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, loading: false, message: "" }));
}

function updateState(next) {
  state = { ...state, ...next };
  saveLocalState();
  render();
}

async function loadCloudData() {
  state.loading = true;
  render();

  const { data: timelines, error: timelineError } = await supabaseClient
    .from("timelines")
    .select("id,title,color,created_at")
    .order("created_at", { ascending: true });

  if (timelineError) {
    state.message = timelineError.message;
    state.loading = false;
    render();
    return;
  }

  if (!timelines.length) {
    await Promise.all(
      defaultTimelines.map((timeline) =>
        supabaseClient.from("timelines").insert({
          title: timeline.title,
          color: timeline.color,
          user_id: state.user.id
        })
      )
    );
    await loadCloudData();
    return;
  }

  const { data: events, error: eventError } = await supabaseClient
    .from("events")
    .select(
      "id,timeline_id,title,event_date,person,category,significance,location,youtube_url,description,photo_urls,created_at"
    )
    .order("event_date", { ascending: false });

  if (eventError) {
    state.message = eventError.message;
    state.loading = false;
    render();
    return;
  }

  state.timelines = timelines.map(rowToTimeline);
  state.events = events.map(rowToEvent);
  state.selectedTimelineId = state.timelines.some((timeline) => timeline.id === state.selectedTimelineId)
    ? state.selectedTimelineId
    : state.timelines[0]?.id;
  state.loading = false;
  state.message = "";
}

function rowToTimeline(row) {
  return { id: row.id, title: row.title, color: row.color };
}

function rowToEvent(row) {
  return {
    id: row.id,
    timelineId: row.timeline_id,
    title: row.title,
    eventDate: row.event_date,
    person: row.person ?? "",
    category: row.category ?? "",
    significance: row.significance ?? "",
    location: row.location ?? "",
    youtubeUrl: row.youtube_url ?? "",
    description: row.description ?? "",
    photos: (row.photo_urls ?? []).map((url) => ({ name: "사진", data: url }))
  };
}

function timelineToRow(timeline) {
  return {
    title: timeline.title,
    color: timeline.color,
    user_id: state.user.id
  };
}

function eventToRow(event) {
  return {
    user_id: state.user.id,
    timeline_id: event.timelineId,
    title: event.title,
    event_date: event.eventDate,
    person: event.person,
    category: event.category,
    significance: event.significance,
    location: event.location,
    youtube_url: event.youtubeUrl,
    description: event.description,
    photo_urls: event.photos.map((photo) => photo.data)
  };
}

function formatDate(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  return {
    year: date.getFullYear(),
    short: date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
  };
}

function uniqueValues(key) {
  return [...new Set(state.events.map((event) => event[key]).filter(Boolean))].sort();
}

function timelineCounts() {
  return state.timelines.reduce((acc, timeline) => {
    acc[timeline.id] = state.events.filter((event) => event.timelineId === timeline.id).length;
    return acc;
  }, {});
}

function getVisibleEvents() {
  const { q, category, person, significance } = state.filters;
  return state.events
    .filter((event) => event.timelineId === state.selectedTimelineId)
    .filter((event) => {
      const haystack = [
        event.title,
        event.person,
        event.category,
        event.significance,
        event.location,
        event.description
      ]
        .join(" ")
        .toLowerCase();
      return !q || haystack.includes(q.toLowerCase());
    })
    .filter((event) => !category || event.category === category)
    .filter((event) => !person || event.person === person)
    .filter((event) => !significance || event.significance === significance)
    .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
}

function render() {
  const root = document.querySelector("#app");
  if (state.loading) {
    root.innerHTML = loadingTemplate();
    return;
  }

  root.innerHTML = state.user ? appTemplate() : authTemplate();
  bindEvents();
}

function loadingTemplate() {
  return `
    <main class="auth-screen">
      <section class="panel auth-card">
        <div class="brand-mark">몽</div>
        <h1>몽치치패밀리 라이프라인</h1>
        <p>가족 기록장을 준비하는 중이에요.</p>
      </section>
    </main>
  `;
}

function authTemplate() {
  const modeLabel = supabaseClient ? "온라인 가족 기록장" : "로컬 미리보기";
  return `
    <main class="auth-screen">
      <section class="panel auth-card">
        <div class="brand-mark">몽</div>
        <h1>몽치치패밀리 라이프라인</h1>
        <p>가족의 여행, 성장, 기념일, 취미 기록을 한 곳에 모아 날짜순으로 다시 볼 수 있어요.</p>
        <div class="notice">${modeLabel}</div>
        ${state.message ? `<div class="error">${escapeHtml(state.message)}</div>` : ""}
        <form id="authForm" class="form-grid">
          <label class="field full">
            <span>이메일</span>
            <input name="email" type="email" placeholder="family@example.com" required />
          </label>
          <label class="field full">
            <span>비밀번호</span>
            <input name="password" type="password" placeholder="8자 이상" required />
          </label>
          <button class="button" name="intent" value="signin" type="submit">로그인</button>
          <button class="button secondary" name="intent" value="signup" type="submit">회원가입</button>
        </form>
      </section>
    </main>
  `;
}

function appTemplate() {
  const selected = state.timelines.find((timeline) => timeline.id === state.selectedTimelineId);
  return `
    <div class="app-shell">
      ${sidebarTemplate()}
      <main class="main">
        <div class="topbar">
          <div class="title-block">
            <h2>${escapeHtml(selected?.title ?? "타임라인")}</h2>
            <p>날짜, 대상, 카테고리, 사진을 함께 남겨두면 훗날 가족 앨범처럼 다시 펼쳐볼 수 있어요.</p>
            ${state.message ? `<div class="error">${escapeHtml(state.message)}</div>` : ""}
          </div>
          <div class="action-row">
            <button class="button secondary" id="addTimelineBtn" type="button">타임라인 추가</button>
            <button class="button" id="addEventBtn" type="button">이벤트 추가</button>
          </div>
        </div>
        <select class="mobile-timeline-select" id="mobileTimeline">
          ${state.timelines
            .map(
              (timeline) =>
                `<option value="${timeline.id}" ${timeline.id === state.selectedTimelineId ? "selected" : ""}>${escapeHtml(timeline.title)}</option>`
            )
            .join("")}
        </select>
        ${toolbarTemplate()}
        ${timelineTemplate()}
      </main>
    </div>
    ${modal ? modalTemplate() : ""}
  `;
}

function sidebarTemplate() {
  const counts = timelineCounts();
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">몽</div>
        <div>
          <h1>몽치치패밀리</h1>
          <p>Family Lifeline</p>
        </div>
      </div>
      <div class="user-line">${escapeHtml(state.user.email)}</div>
      <div class="notice">${supabaseClient ? "Supabase 연결됨" : "로컬 저장 중"}</div>
      <div class="sidebar-section">
        <div class="section-title">타임라인 <button class="button icon secondary" id="quickTimelineBtn" type="button" title="타임라인 추가">+</button></div>
        <div class="timeline-list">
          ${state.timelines
            .map(
              (timeline) => `
                <button class="timeline-button ${timeline.id === state.selectedTimelineId ? "active" : ""}" data-timeline="${timeline.id}" type="button">
                  <span class="dot" style="background:${escapeAttr(timeline.color)}"></span>
                  <span>${escapeHtml(timeline.title)}</span>
                  <span class="count-pill">${counts[timeline.id] ?? 0}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </div>
      <div class="sidebar-section">
        <button class="button secondary" id="logoutBtn" type="button">로그아웃</button>
      </div>
    </aside>
  `;
}

function toolbarTemplate() {
  return `
    <section class="panel toolbar">
      <div class="filters">
        <input class="search" id="searchInput" value="${escapeAttr(state.filters.q)}" placeholder="제목, 장소, 설명 검색" />
        ${filterSelect("category", "카테고리", uniqueValues("category"))}
        ${filterSelect("person", "대상", uniqueValues("person"))}
        ${filterSelect("significance", "중요도", uniqueValues("significance"))}
        <button class="button secondary" id="clearFiltersBtn" type="button">초기화</button>
      </div>
    </section>
  `;
}

function filterSelect(key, label, values) {
  return `
    <select data-filter="${key}" aria-label="${label}">
      <option value="">${label} 전체</option>
      ${values
        .map((value) => `<option value="${escapeAttr(value)}" ${state.filters[key] === value ? "selected" : ""}>${escapeHtml(value)}</option>`)
        .join("")}
    </select>
  `;
}

function timelineTemplate() {
  const events = getVisibleEvents();
  if (!events.length) {
    return `
      <section class="panel empty">
        <h3>아직 기록이 없어요</h3>
        <p>첫 이벤트를 추가해서 이 타임라인을 채워보세요.</p>
        <button class="button" id="emptyAddBtn" type="button">이벤트 추가</button>
      </section>
    `;
  }

  return `<section class="timeline">${events.map(eventTemplate).join("")}</section>`;
}

function eventTemplate(event) {
  const date = formatDate(event.eventDate);
  const timeline = state.timelines.find((item) => item.id === event.timelineId);
  return `
    <article class="event-card" style="--event-color:${escapeAttr(timeline?.color ?? "#23966b")}">
      <time class="event-date" datetime="${escapeAttr(event.eventDate)}">
        <strong>${date.short}</strong>
        ${date.year}
      </time>
      <div class="panel event-body">
        <div class="event-head">
          <div>
            <h3>${escapeHtml(event.title)}</h3>
            <div class="event-meta">
              ${event.person ? `<span class="tag">${escapeHtml(event.person)}</span>` : ""}
              ${event.category ? `<span class="tag">${escapeHtml(event.category)}</span>` : ""}
              ${event.significance ? `<span class="importance">${escapeHtml(event.significance)}</span>` : ""}
              ${event.location ? `<span>${escapeHtml(event.location)}</span>` : ""}
            </div>
          </div>
          <div class="action-row">
            <button class="button icon secondary" data-edit="${event.id}" type="button" title="수정">✎</button>
            <button class="button icon danger" data-delete="${event.id}" type="button" title="삭제">×</button>
          </div>
        </div>
        ${event.description ? `<p class="event-description">${escapeHtml(event.description)}</p>` : ""}
        ${event.youtubeUrl ? `<a class="youtube-link" href="${escapeAttr(event.youtubeUrl)}" target="_blank" rel="noreferrer">유튜브 보기</a>` : ""}
        ${
          event.photos?.length
            ? `<div class="photo-strip">${event.photos
                .map((photo) => `<img src="${escapeAttr(photo.data)}" alt="${escapeAttr(photo.name)}" />`)
                .join("")}</div>`
            : ""
        }
      </div>
    </article>
  `;
}

function modalTemplate() {
  if (modal.type === "timeline") {
    return `
      <div class="modal-backdrop">
        <form class="panel modal" id="timelineForm">
          <h2>타임라인 추가</h2>
          <div class="form-grid">
            <label class="field">
              <span>이름</span>
              <input name="title" placeholder="예: 제주 여행" required />
            </label>
            <label class="field">
              <span>색상</span>
              <input name="color" type="color" value="#23966b" />
            </label>
          </div>
          <div class="modal-actions">
            <button class="button secondary" data-close-modal type="button">취소</button>
            <button class="button" type="submit">저장</button>
          </div>
        </form>
      </div>
    `;
  }

  const event = modal.event ?? {
    id: "",
    title: "",
    eventDate: new Date().toISOString().slice(0, 10),
    timelineId: state.selectedTimelineId,
    person: "",
    category: "",
    significance: "보통",
    location: "",
    youtubeUrl: "",
    description: "",
    photos: []
  };

  return `
    <div class="modal-backdrop">
      <form class="panel modal" id="eventForm">
        <h2>${event.id ? "이벤트 수정" : "이벤트 추가"}</h2>
        <input type="hidden" name="id" value="${escapeAttr(event.id)}" />
        <div class="form-grid">
          <label class="field full">
            <span>제목</span>
            <input name="title" value="${escapeAttr(event.title)}" required />
          </label>
          <label class="field">
            <span>날짜</span>
            <input name="eventDate" type="date" value="${escapeAttr(event.eventDate)}" required />
          </label>
          <label class="field">
            <span>타임라인</span>
            <select name="timelineId">
              ${state.timelines
                .map(
                  (timeline) =>
                    `<option value="${timeline.id}" ${timeline.id === event.timelineId ? "selected" : ""}>${escapeHtml(timeline.title)}</option>`
                )
                .join("")}
            </select>
          </label>
          <label class="field">
            <span>대상</span>
            <input name="person" value="${escapeAttr(event.person)}" placeholder="가족, 딸, 아들" />
          </label>
          <label class="field">
            <span>카테고리</span>
            <input name="category" value="${escapeAttr(event.category)}" placeholder="여행, 성장, 독서" />
          </label>
          <label class="field">
            <span>중요도</span>
            <select name="significance">
              ${["아주 중요", "중요", "보통", "가벼운 기록"]
                .map((value) => `<option ${value === event.significance ? "selected" : ""}>${value}</option>`)
                .join("")}
            </select>
          </label>
          <label class="field">
            <span>장소</span>
            <input name="location" value="${escapeAttr(event.location)}" />
          </label>
          <label class="field full">
            <span>유튜브 링크</span>
            <input name="youtubeUrl" value="${escapeAttr(event.youtubeUrl)}" placeholder="https://youtube.com/..." />
          </label>
          <label class="field full">
            <span>설명</span>
            <textarea name="description">${escapeHtml(event.description)}</textarea>
          </label>
          <label class="field full">
            <span>사진</span>
            <input name="photos" type="file" accept="image/*" multiple />
            <span class="file-hint">${supabaseClient ? "사진은 가족 온라인 저장소에 업로드됩니다." : "사진은 이 브라우저에 저장됩니다."}</span>
          </label>
        </div>
        <div class="modal-actions">
          <button class="button secondary" data-close-modal type="button">취소</button>
          <button class="button" type="submit">저장</button>
        </div>
      </form>
    </div>
  `;
}

function bindEvents() {
  document.querySelector("#authForm")?.addEventListener("submit", handleAuthSubmit);
  document.querySelector("#logoutBtn")?.addEventListener("click", handleLogout);
  document.querySelector("#addEventBtn")?.addEventListener("click", () => openEventModal());
  document.querySelector("#emptyAddBtn")?.addEventListener("click", () => openEventModal());
  document.querySelector("#addTimelineBtn")?.addEventListener("click", () => openTimelineModal());
  document.querySelector("#quickTimelineBtn")?.addEventListener("click", () => openTimelineModal());
  document.querySelector("#clearFiltersBtn")?.addEventListener("click", () =>
    updateState({ filters: { q: "", category: "", person: "", significance: "" } })
  );

  document.querySelectorAll("[data-timeline]").forEach((button) => {
    button.addEventListener("click", () => updateState({ selectedTimelineId: button.dataset.timeline }));
  });

  document.querySelector("#mobileTimeline")?.addEventListener("change", (event) => {
    updateState({ selectedTimelineId: event.target.value });
  });

  document.querySelector("#searchInput")?.addEventListener("input", (event) => {
    state.filters.q = event.target.value;
    saveLocalState();
    render();
  });

  document.querySelectorAll("[data-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      state.filters[select.dataset.filter] = select.value;
      saveLocalState();
      render();
    });
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteEvent(button.dataset.delete));
  });

  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEventModal(state.events.find((item) => item.id === button.dataset.edit)));
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.querySelector(".modal-backdrop")?.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) closeModal();
  });

  document.querySelector("#timelineForm")?.addEventListener("submit", handleTimelineSubmit);
  document.querySelector("#eventForm")?.addEventListener("submit", handleEventSubmit);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const submitter = event.submitter;
  const form = new FormData(event.currentTarget);
  const email = String(form.get("email")).trim();
  const password = String(form.get("password"));

  if (!supabaseClient) {
    updateState({ user: { email }, message: "" });
    return;
  }

  state.loading = true;
  render();
  const authMethod = submitter?.value === "signup" ? "signUp" : "signInWithPassword";
  const { error } = await supabaseClient.auth[authMethod]({ email, password });

  if (error) {
    state.loading = false;
    state.message = error.message;
    render();
  }
}

async function handleLogout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  updateState({ user: null, message: "" });
}

function openEventModal(event = null) {
  modal = { type: "event", event };
  render();
}

function openTimelineModal() {
  modal = { type: "timeline" };
  render();
}

function closeModal() {
  modal = null;
  render();
}

async function handleTimelineSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const timeline = {
    id: crypto.randomUUID(),
    title: String(form.get("title")).trim(),
    color: form.get("color") || "#23966b"
  };

  if (supabaseClient) {
    const { data, error } = await supabaseClient.from("timelines").insert(timelineToRow(timeline)).select().single();
    if (error) return showError(error.message);
    timeline.id = data.id;
  }

  modal = null;
  updateState({
    timelines: [...state.timelines, timeline],
    selectedTimelineId: timeline.id,
    message: ""
  });
}

async function handleEventSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const id = form.get("id") || crypto.randomUUID();
  const oldEvent = state.events.find((item) => item.id === id);
  const filePhotos = await readPhotos(form.getAll("photos"), id);
  const nextEvent = {
    id,
    title: String(form.get("title")).trim(),
    eventDate: form.get("eventDate"),
    timelineId: form.get("timelineId"),
    person: String(form.get("person")).trim(),
    category: String(form.get("category")).trim(),
    significance: form.get("significance"),
    location: String(form.get("location")).trim(),
    youtubeUrl: String(form.get("youtubeUrl")).trim(),
    description: String(form.get("description")).trim(),
    photos: filePhotos.length ? [...(oldEvent?.photos ?? []), ...filePhotos] : oldEvent?.photos ?? []
  };

  if (supabaseClient) {
    const row = eventToRow(nextEvent);
    const response = oldEvent
      ? await supabaseClient.from("events").update(row).eq("id", id)
      : await supabaseClient.from("events").insert({ ...row, id });

    if (response.error) return showError(response.error.message);
  }

  modal = null;
  updateState({
    selectedTimelineId: nextEvent.timelineId,
    events: oldEvent
      ? state.events.map((item) => (item.id === id ? nextEvent : item))
      : [...state.events, nextEvent],
    message: ""
  });
}

async function deleteEvent(id) {
  const eventItem = state.events.find((item) => item.id === id);
  if (!eventItem || !confirm(`'${eventItem.title}' 기록을 삭제할까요?`)) return;

  if (supabaseClient) {
    const { error } = await supabaseClient.from("events").delete().eq("id", id);
    if (error) return showError(error.message);
  }

  updateState({ events: state.events.filter((item) => item.id !== id), message: "" });
}

async function readPhotos(files, eventId) {
  const imageFiles = files.filter((file) => file && file.size);
  if (!supabaseClient) {
    return Promise.all(
      imageFiles.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: file.name, data: reader.result });
            reader.readAsDataURL(file);
          })
      )
    );
  }

  const uploads = [];
  for (const file of imageFiles) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${state.user.id}/${eventId}/${Date.now()}-${safeName}`;
    const { error } = await supabaseClient.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: false });
    if (error) {
      showError(error.message);
      continue;
    }
    const { data } = supabaseClient.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    uploads.push({ name: file.name, data: data.publicUrl });
  }
  return uploads;
}

function showError(message) {
  state.message = message;
  state.loading = false;
  render();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}
