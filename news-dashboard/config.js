// 뉴스 카테고리(키워드 탭) 정의 — 프론트엔드에서 사용합니다.
// 각 카테고리는 서버(api/feeds.js)에서 Google News RSS 검색 쿼리로 매핑됩니다.
// 카테고리를 추가/수정하려면 여기와 api/feeds.js의 QUERIES를 함께 바꿔주세요.
export const CATEGORIES = [
  { id: "AI", label: "AI" },
  { id: "cloud", label: "클라우드" },
  { id: "datacenter", label: "데이터센터" },
  { id: "economy", label: "경제" },
  { id: "startup", label: "스타트업" },
];
