// @ts-nocheck
// ============================================================================
// Task F: 부동산 시세 업데이트 (Real Estate Price Update)
// Gemini 미사용 — 국토부 API only (API 키 없으면 graceful skip)
//
// [데이터 소스]
// - 국토교통부 실거래가 공개시스템 API (공동주택 실거래 자료)
// - 법정동코드(LAWD_CD) + 거래년월(DEAL_YMD)로 조회
//
// [업데이트 흐름]
// 1. portfolios에서 RE_ 티커 자산 조회
// 2. 법정동코드별 국토부 API 호출
// 3. 단지명 + 면적 매칭 → 최근 3건 평균가 계산
// 4. realestate_price_cache UPSERT (캐시)
// 5. portfolios current_value 업데이트
//
// [에러 처리]
// - API 키 미설정 시 graceful skip (로그만 남기고 종료)
// - 법정동코드별 API 호출 실패 시 해당 구간만 스킵, 다음 구간 계속 진행
// - Rate limit 방지: 법정동코드 간 500ms 딜레이
// ============================================================================

import { supabase, logTaskResult } from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

export interface RealEstateUpdateResult {
  skipped: boolean;
  assetsUpdated: number;
  cacheUpdated: number;
}

// ============================================================================
// Task F: 부동산 시세 업데이트
// ============================================================================

/**
 * Task F: 보유 부동산 자산의 실거래가 캐시 업데이트
 *
 * [업데이트 로직]
 * 1. portfolios에서 ticker LIKE 'RE_%' 자산 조회
 * 2. 법정동코드별 그룹핑 (API 호출 최소화)
 * 3. 국토부 API로 실거래가 데이터 조회 (최근 100건)
 * 4. 단지명 + 전용면적(±3㎡) 매칭 → 최근 5건 중 3건 평균
 * 5. realestate_price_cache UPSERT (캐시)
 * 6. portfolios current_value, current_price 업데이트
 *
 * [매칭 기준]
 * - 단지명 부분 일치 (e.g., "래미안" 포함)
 * - 전용면적 ±3㎡ 이내
 * - 최근 거래일 순 정렬 → 상위 3건 평균
 *
 * [API 키 관리]
 * - 환경변수 MOLIT_API_KEY 필요
 * - 키 미설정 시 { skipped: true } 반환 (에러 아님)
 *
 * @returns { skipped, assetsUpdated, cacheUpdated }
 */
export async function updateRealEstatePrices(): Promise<RealEstateUpdateResult> {
  const startTime = Date.now();

  try {
    // 환경변수에서 API 키 가져오기
    const MOLIT_API_KEY = Deno.env.get('MOLIT_API_KEY');

    // API 키 없으면 스킵 (Mock 환경)
    if (!MOLIT_API_KEY) {
      console.log('[Task F] 국토부 API 키 미설정 → 부동산 시세 업데이트 스킵');
      const elapsed = Date.now() - startTime;
      await logTaskResult('realestate', 'SKIPPED', elapsed, { reason: 'API_KEY_MISSING' });
      return { skipped: true, assetsUpdated: 0, cacheUpdated: 0 };
    }

  console.log('[Task F] 부동산 시세 업데이트 시작...');

  // 1. RE_ 티커를 가진 모든 포트폴리오 조회
  const { data: realEstateAssets, error: queryError } = await supabase
    .from('portfolios')
    .select('id, user_id, ticker, lawd_cd, complex_name, unit_area, current_value')
    .like('ticker', 'RE_%')
    .not('lawd_cd', 'is', null);

  if (queryError || !realEstateAssets || realEstateAssets.length === 0) {
    console.log('[Task F] 부동산 자산 없음 또는 조회 실패');
    return { skipped: false, assetsUpdated: 0, cacheUpdated: 0 };
  }

  console.log(`[Task F] 부동산 자산 ${realEstateAssets.length}건 발견`);

  // 2. 법정동코드별 그룹핑 (API 호출 최소화)
  const lawdGroups = new Map<string, typeof realEstateAssets>();
  for (const asset of realEstateAssets) {
    if (!asset.lawd_cd) continue;
    if (!lawdGroups.has(asset.lawd_cd)) {
      lawdGroups.set(asset.lawd_cd, []);
    }
    lawdGroups.get(asset.lawd_cd)!.push(asset);
  }

  let cacheUpdated = 0;
  let assetsUpdated = 0;
  const today = new Date();
  const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

  // 3. 법정동코드별 국토부 API 호출
  for (const [lawdCd, assets] of lawdGroups) {
    try {
      const apiUrl = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${MOLIT_API_KEY}&LAWD_CD=${lawdCd}&DEAL_YMD=${yearMonth}&pageNo=1&numOfRows=100&type=json`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.warn(`[Task F] API 호출 실패 (${lawdCd}): ${response.status}`);
        continue;
      }

      const data = await response.json();
      const items = data?.response?.body?.items?.item || [];

      if (items.length === 0) {
        console.log(`[Task F] ${lawdCd}: 거래 데이터 없음`);
        continue;
      }

      // 4. 단지별 매칭 및 캐시 업데이트
      for (const asset of assets) {
        if (!asset.complex_name || !asset.unit_area) continue;

        // 단지명 + 면적 매칭
        const matchingTx = items
          .filter((item: any) =>
            item.aptNm?.includes(asset.complex_name) &&
            Math.abs(Number(item.excluUseAr || 0) - asset.unit_area) <= 3
          )
          .sort((a: any, b: any) => {
            const dateA = `${a.dealYear}-${String(a.dealMonth).padStart(2, '0')}-${String(a.dealDay).padStart(2, '0')}`;
            const dateB = `${b.dealYear}-${String(b.dealMonth).padStart(2, '0')}-${String(b.dealDay).padStart(2, '0')}`;
            return dateB.localeCompare(dateA);
          })
          .slice(0, 5);

        if (matchingTx.length === 0) continue;

        // 최근 3건 평균가 계산
        const recent3 = matchingTx.slice(0, 3);
        const latestPrice = Number(String(matchingTx[0].dealAmount || '0').replace(/,/g, '')) * 10000;
        const avg3 = Math.round(
          recent3.reduce((s: number, t: any) => {
            return s + Number(String(t.dealAmount || '0').replace(/,/g, '')) * 10000;
          }, 0) / recent3.length
        );

        // realestate_price_cache UPSERT
        const { error: cacheError } = await supabase
          .from('realestate_price_cache')
          .upsert(
            {
              lawd_cd: lawdCd,
              complex_name: asset.complex_name,
              unit_area: asset.unit_area,
              latest_price: latestPrice,
              avg_price_3: avg3,
              last_transaction_date: `${matchingTx[0].dealYear}-${String(matchingTx[0].dealMonth).padStart(2, '0')}-${String(matchingTx[0].dealDay).padStart(2, '0')}`,
              transaction_count: matchingTx.length,
              raw_transactions: matchingTx.slice(0, 5),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'lawd_cd,complex_name,unit_area' }
          );

        if (!cacheError) cacheUpdated++;

        // portfolios current_value 업데이트
        const { error: updateError } = await supabase
          .from('portfolios')
          .update({
            current_value: avg3,
            current_price: avg3,
            last_price_updated_at: new Date().toISOString(),
          })
          .eq('id', asset.id);

        if (!updateError) assetsUpdated++;
      }

      // Rate limit 방지
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[Task F] 법정동 ${lawdCd} 처리 실패:`, err);
    }
  }

  console.log(`[Task F] 완료: 캐시 ${cacheUpdated}건, 포트폴리오 ${assetsUpdated}건 업데이트`);

  const elapsed = Date.now() - startTime;
  await logTaskResult('realestate', 'SUCCESS', elapsed, { assetsUpdated, cacheUpdated });

  return { skipped: false, assetsUpdated, cacheUpdated };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('realestate', 'FAILED', elapsed, null, error.message);
    throw error;
  }
}
