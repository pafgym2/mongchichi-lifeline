// ───────────────────────────────────────────────────────────
// 보유내역 설정 — 거래가 바뀌면 이 파일만 수정하면 됩니다.
// avgKRW = 앱에 표시되는 "내 평균"(주당 평균단가, 원화 환산). shares = 보유수량.
// market: "US" 면 야후에서 USD 시세를 받아 환율로 원화 환산,
//         "KR" 면 네이버에서 원화 시세를 직접 받습니다.
// ───────────────────────────────────────────────────────────

export const OWNERS = [
  {
    owner: "유지훈",
    accounts: [
      {
        account: "KakaoPay 종합계좌",
        positions: [
          { name: "SK하이닉스", ticker: "000660", market: "KR", shares: 7, avgKRW: 2186142 },
          { name: "삼성전자", ticker: "005930", market: "KR", shares: 7, avgKRW: 338607 },
          { name: "KODEX 200", ticker: "069500", market: "KR", shares: 7, avgKRW: 128370 },
          { name: "씨에스윈드", ticker: "112610", market: "KR", shares: 4, avgKRW: 53675 },
          { name: "블리츠웨이엔터", ticker: "369370", market: "KR", shares: 1, avgKRW: 1129 },
          { name: "테슬라", ticker: "TSLA", market: "US", shares: 26.8876, avgKRW: 626988 },
          { name: "알파벳A", ticker: "GOOGL", market: "US", shares: 6.842, avgKRW: 441116 },
          { name: "메타", ticker: "META", market: "US", shares: 3, avgKRW: 968655 },
          { name: "엔비디아", ticker: "NVDA", market: "US", shares: 7.216, avgKRW: 276996 },
          { name: "리게티", ticker: "RGTI", market: "US", shares: 48, avgKRW: 66413 },
          { name: "VOO", ticker: "VOO", market: "US", shares: 1.181, avgKRW: 913996 },
          { name: "팔란티어", ticker: "PLTR", market: "US", shares: 5.34, avgKRW: 248112 },
          { name: "아이렌", ticker: "IREN", market: "US", shares: 8, avgKRW: 98848 },
          { name: "써클", ticker: "CRCL", market: "US", shares: 4, avgKRW: 191931 },
          { name: "비자", ticker: "V", market: "US", shares: 1.024, avgKRW: 483938 },
          { name: "아이온큐", ticker: "IONQ", market: "US", shares: 3.37, avgKRW: 104721 },
          { name: "아르킷퀀텀", ticker: "ARQQ", market: "US", shares: 12, avgKRW: 74283 },
          { name: "비트마인", ticker: "BMNR", market: "US", shares: 10, avgKRW: 63756 },
          { name: "오라클", ticker: "ORCL", market: "US", shares: 0.74, avgKRW: 347235 },
          { name: "BTQ", ticker: "BTQQF", market: "US", shares: 29, avgKRW: 14457 },
          { name: "퀀텀컴퓨팅", ticker: "QUBT", market: "US", shares: 2, avgKRW: 23190 },
        ],
      },
    ],
  },
  {
    owner: "김경아",
    accounts: [
      {
        account: "타사 계좌 161-119516",
        positions: [
          { name: "블리츠웨이엔터", ticker: "369370", market: "KR", shares: 67760, avgKRW: 395 },
        ],
      },
      {
        account: "KakaoPay 종합계좌",
        positions: [
          { name: "엔비디아", ticker: "NVDA", market: "US", shares: 28.896, avgKRW: 268342 },
          { name: "알파벳A", ticker: "GOOGL", market: "US", shares: 12.172, avgKRW: 422362 },
          { name: "테슬라", ticker: "TSLA", market: "US", shares: 11.2025, avgKRW: 613930 },
          { name: "VOO", ticker: "VOO", market: "US", shares: 5.28, avgKRW: 903268 },
          { name: "메타", ticker: "META", market: "US", shares: 3.32, avgKRW: 949899 },
          { name: "팔란티어", ticker: "PLTR", market: "US", shares: 10, avgKRW: 259912 },
          { name: "리게티", ticker: "RGTI", market: "US", shares: 20, avgKRW: 56079 },
          { name: "아이온큐", ticker: "IONQ", market: "US", shares: 3.08, avgKRW: 95072 },
        ],
      },
    ],
  },
];

// 참고용 현금성 자산 (시세 조회 대상 아님)
export const CASH_NOTES = {
  owner: "김경아",
  dcPensionKRW: 100000000, // DC형 퇴직연금 — 미투자(현금성)
  bankDepositKRW: 6215441, // 은행 예금·입출금 합계
};
