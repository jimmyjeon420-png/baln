/**
 * stockList.ts - 인기 종목 로컬 데이터 (자동완성용)
 *
 * 역할: "종목 사전" — 사용자가 종목명, 영문명, 티커로 빠르게 검색
 * - 한국 대형주 25개
 * - 미국 대형주 30개
 * - 인기 ETF 15개
 * - 주요 암호화폐 15개
 * - 채권/현금 5개
 *
 * 검색은 순수 로컬에서 처리 (네트워크 불필요, 즉시 반응)
 */

export interface StockItem {
  ticker: string;        // 티커 심볼 (예: '005930.KS', 'NVDA', 'BTC')
  name: string;          // 한글 종목명
  nameEn: string;        // 영문 종목명
  category: 'kr_stock' | 'us_stock' | 'etf' | 'crypto' | 'bond' | 'cash';
}

export const POPULAR_STOCKS: StockItem[] = [
  // ─── 한국 대형주 (25개) ───
  { ticker: '005930.KS', name: '삼성전자', nameEn: 'Samsung Electronics', category: 'kr_stock' },
  { ticker: '000660.KS', name: 'SK하이닉스', nameEn: 'SK Hynix', category: 'kr_stock' },
  { ticker: '035720.KS', name: '카카오', nameEn: 'Kakao', category: 'kr_stock' },
  { ticker: '035420.KS', name: '네이버', nameEn: 'Naver', category: 'kr_stock' },
  { ticker: '005380.KS', name: '현대자동차', nameEn: 'Hyundai Motor', category: 'kr_stock' },
  { ticker: '006400.KS', name: '삼성SDI', nameEn: 'Samsung SDI', category: 'kr_stock' },
  { ticker: '051910.KS', name: 'LG화학', nameEn: 'LG Chem', category: 'kr_stock' },
  { ticker: '003670.KS', name: '포스코홀딩스', nameEn: 'POSCO Holdings', category: 'kr_stock' },
  { ticker: '105560.KS', name: 'KB금융', nameEn: 'KB Financial', category: 'kr_stock' },
  { ticker: '055550.KS', name: '신한지주', nameEn: 'Shinhan Financial', category: 'kr_stock' },
  { ticker: '012330.KS', name: '현대모비스', nameEn: 'Hyundai Mobis', category: 'kr_stock' },
  { ticker: '066570.KS', name: 'LG전자', nameEn: 'LG Electronics', category: 'kr_stock' },
  { ticker: '028260.KS', name: '삼성물산', nameEn: 'Samsung C&T', category: 'kr_stock' },
  { ticker: '207940.KS', name: '삼성바이오로직스', nameEn: 'Samsung Biologics', category: 'kr_stock' },
  { ticker: '068270.KS', name: '셀트리온', nameEn: 'Celltrion', category: 'kr_stock' },
  { ticker: '000270.KS', name: '기아', nameEn: 'Kia', category: 'kr_stock' },
  { ticker: '036570.KS', name: '엔씨소프트', nameEn: 'NCSoft', category: 'kr_stock' },
  { ticker: '034730.KS', name: 'SK', nameEn: 'SK Inc', category: 'kr_stock' },
  { ticker: '323410.KS', name: '카카오뱅크', nameEn: 'KakaoBank', category: 'kr_stock' },
  { ticker: '259960.KS', name: '크래프톤', nameEn: 'Krafton', category: 'kr_stock' },
  { ticker: '003550.KS', name: 'LG', nameEn: 'LG Corp', category: 'kr_stock' },
  { ticker: '096770.KS', name: 'SK이노베이션', nameEn: 'SK Innovation', category: 'kr_stock' },
  { ticker: '086790.KS', name: '하나금융지주', nameEn: 'Hana Financial', category: 'kr_stock' },
  { ticker: '373220.KS', name: 'LG에너지솔루션', nameEn: 'LG Energy Solution', category: 'kr_stock' },
  { ticker: '352820.KS', name: '하이브', nameEn: 'HYBE', category: 'kr_stock' },

  // ─── 미국 대형주 (30개) ───
  { ticker: 'NVDA', name: '엔비디아', nameEn: 'NVIDIA', category: 'us_stock' },
  { ticker: 'AAPL', name: '애플', nameEn: 'Apple', category: 'us_stock' },
  { ticker: 'TSLA', name: '테슬라', nameEn: 'Tesla', category: 'us_stock' },
  { ticker: 'MSFT', name: '마이크로소프트', nameEn: 'Microsoft', category: 'us_stock' },
  { ticker: 'AMZN', name: '아마존', nameEn: 'Amazon', category: 'us_stock' },
  { ticker: 'GOOGL', name: '알파벳(구글)', nameEn: 'Alphabet (Google)', category: 'us_stock' },
  { ticker: 'META', name: '메타(페이스북)', nameEn: 'Meta Platforms', category: 'us_stock' },
  { ticker: 'BRK-B', name: '버크셔 해서웨이', nameEn: 'Berkshire Hathaway', category: 'us_stock' },
  { ticker: 'JPM', name: 'JP모건', nameEn: 'JPMorgan Chase', category: 'us_stock' },
  { ticker: 'V', name: '비자', nameEn: 'Visa', category: 'us_stock' },
  { ticker: 'MA', name: '마스터카드', nameEn: 'Mastercard', category: 'us_stock' },
  { ticker: 'JNJ', name: '존슨앤존슨', nameEn: 'Johnson & Johnson', category: 'us_stock' },
  { ticker: 'UNH', name: '유나이티드헬스', nameEn: 'UnitedHealth', category: 'us_stock' },
  { ticker: 'HD', name: '홈디포', nameEn: 'Home Depot', category: 'us_stock' },
  { ticker: 'PG', name: 'P&G', nameEn: 'Procter & Gamble', category: 'us_stock' },
  { ticker: 'XOM', name: '엑슨모빌', nameEn: 'ExxonMobil', category: 'us_stock' },
  { ticker: 'COST', name: '코스트코', nameEn: 'Costco', category: 'us_stock' },
  { ticker: 'CRM', name: '세일즈포스', nameEn: 'Salesforce', category: 'us_stock' },
  { ticker: 'AMD', name: 'AMD', nameEn: 'Advanced Micro Devices', category: 'us_stock' },
  { ticker: 'NFLX', name: '넷플릭스', nameEn: 'Netflix', category: 'us_stock' },
  { ticker: 'DIS', name: '디즈니', nameEn: 'Walt Disney', category: 'us_stock' },
  { ticker: 'INTC', name: '인텔', nameEn: 'Intel', category: 'us_stock' },
  { ticker: 'BA', name: '보잉', nameEn: 'Boeing', category: 'us_stock' },
  { ticker: 'NKE', name: '나이키', nameEn: 'Nike', category: 'us_stock' },
  { ticker: 'COIN', name: '코인베이스', nameEn: 'Coinbase', category: 'us_stock' },
  { ticker: 'PLTR', name: '팔란티어', nameEn: 'Palantir', category: 'us_stock' },
  { ticker: 'SOFI', name: '소파이', nameEn: 'SoFi Technologies', category: 'us_stock' },
  { ticker: 'MSTR', name: '마이크로스트래티지', nameEn: 'MicroStrategy', category: 'us_stock' },
  { ticker: 'ARM', name: 'ARM홀딩스', nameEn: 'Arm Holdings', category: 'us_stock' },
  { ticker: 'AVGO', name: '브로드컴', nameEn: 'Broadcom', category: 'us_stock' },

  // ─── 인기 ETF (15개) ───
  { ticker: 'SPY', name: 'S&P 500 ETF', nameEn: 'SPDR S&P 500', category: 'etf' },
  { ticker: 'QQQ', name: '나스닥 100 ETF', nameEn: 'Invesco QQQ', category: 'etf' },
  { ticker: 'VOO', name: '뱅가드 S&P 500', nameEn: 'Vanguard S&P 500', category: 'etf' },
  { ticker: 'VTI', name: '뱅가드 토탈마켓', nameEn: 'Vanguard Total Market', category: 'etf' },
  { ticker: 'IVV', name: 'iShares S&P 500', nameEn: 'iShares Core S&P 500', category: 'etf' },
  { ticker: 'ARKK', name: 'ARK 혁신 ETF', nameEn: 'ARK Innovation', category: 'etf' },
  { ticker: 'VGT', name: '뱅가드 IT ETF', nameEn: 'Vanguard Info Tech', category: 'etf' },
  { ticker: 'SCHD', name: 'Schwab 배당 ETF', nameEn: 'Schwab US Dividend', category: 'etf' },
  { ticker: 'JEPI', name: 'JP모건 인컴 ETF', nameEn: 'JPMorgan Equity Premium Income', category: 'etf' },
  { ticker: 'SOXL', name: '반도체 3배 ETF', nameEn: 'Direxion Semiconductor 3X', category: 'etf' },
  { ticker: 'TQQQ', name: '나스닥 3배 ETF', nameEn: 'ProShares UltraPro QQQ', category: 'etf' },
  { ticker: 'AGG', name: 'iShares 채권 ETF', nameEn: 'iShares Core US Aggregate Bond', category: 'etf' },
  { ticker: 'GLD', name: 'SPDR 금 ETF', nameEn: 'SPDR Gold Shares', category: 'etf' },
  { ticker: 'VNQ', name: '뱅가드 리츠 ETF', nameEn: 'Vanguard Real Estate', category: 'etf' },
  { ticker: 'EEM', name: '신흥국 ETF', nameEn: 'iShares MSCI Emerging Markets', category: 'etf' },

  // ─── 암호화폐 (15개) ───
  { ticker: 'BTC', name: '비트코인', nameEn: 'Bitcoin', category: 'crypto' },
  { ticker: 'ETH', name: '이더리움', nameEn: 'Ethereum', category: 'crypto' },
  { ticker: 'SOL', name: '솔라나', nameEn: 'Solana', category: 'crypto' },
  { ticker: 'XRP', name: '리플', nameEn: 'XRP', category: 'crypto' },
  { ticker: 'ADA', name: '에이다', nameEn: 'Cardano', category: 'crypto' },
  { ticker: 'DOGE', name: '도지코인', nameEn: 'Dogecoin', category: 'crypto' },
  { ticker: 'AVAX', name: '아발란체', nameEn: 'Avalanche', category: 'crypto' },
  { ticker: 'DOT', name: '폴카닷', nameEn: 'Polkadot', category: 'crypto' },
  { ticker: 'LINK', name: '체인링크', nameEn: 'Chainlink', category: 'crypto' },
  { ticker: 'MATIC', name: '폴리곤', nameEn: 'Polygon', category: 'crypto' },
  { ticker: 'UNI', name: '유니스왑', nameEn: 'Uniswap', category: 'crypto' },
  { ticker: 'ATOM', name: '코스모스', nameEn: 'Cosmos', category: 'crypto' },
  { ticker: 'BNB', name: '바이낸스코인', nameEn: 'BNB', category: 'crypto' },
  { ticker: 'LTC', name: '라이트코인', nameEn: 'Litecoin', category: 'crypto' },
  { ticker: 'NEAR', name: '니어프로토콜', nameEn: 'NEAR Protocol', category: 'crypto' },

  // ─── 채권/현금 (5개) ───
  { ticker: 'TLT', name: '미국 장기국채 ETF', nameEn: 'iShares 20+ Year Treasury Bond', category: 'bond' },
  { ticker: 'SHY', name: '미국 단기국채 ETF', nameEn: 'iShares 1-3 Year Treasury Bond', category: 'bond' },
  { ticker: 'BND', name: '뱅가드 채권 ETF', nameEn: 'Vanguard Total Bond Market', category: 'bond' },
  { ticker: 'USDT', name: '테더', nameEn: 'Tether (USDT)', category: 'crypto' },
  { ticker: 'USDC', name: 'USD코인', nameEn: 'USD Coin', category: 'crypto' },
];

/**
 * 종목 검색 함수 — 한글명, 영문명, 티커 모두 매칭
 * @param query 검색어 (2글자 이상 추천)
 * @returns 최대 10개의 매칭 결과
 */
export function searchStocks(query: string): StockItem[] {
  const q = query.toLowerCase().trim();
  if (q.length === 0) return [];

  return POPULAR_STOCKS.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.nameEn.toLowerCase().includes(q) ||
    s.ticker.toLowerCase().includes(q)
  ).slice(0, 10);
}

/**
 * 카테고리별 한국어 라벨
 */
export function getCategoryLabel(category: StockItem['category']): string {
  switch (category) {
    case 'kr_stock': return '한국주식';
    case 'us_stock': return '미국주식';
    case 'etf': return 'ETF';
    case 'crypto': return '암호화폐';
    case 'bond': return '채권';
    case 'cash': return '현금';
    default: return '기타';
  }
}

/**
 * 카테고리별 색상
 */
export function getCategoryColor(category: StockItem['category']): string {
  switch (category) {
    case 'kr_stock': return '#4CAF50';
    case 'us_stock': return '#2196F3';
    case 'etf': return '#FF9800';
    case 'crypto': return '#F7931A';
    case 'bond': return '#64B5F6';
    case 'cash': return '#78909C';
    default: return '#9E9E9E';
  }
}
