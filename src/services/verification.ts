/**
 * 자산 검증 서비스
 * - AI OCR로 스크린샷에서 자산 정보 추출
 * - 사기 탐지 (Sum(Quantity * Price) vs Total Asset 비교)
 * - 검증 상태 관리
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import supabase from './supabase';
import {
  VerificationStatus,
  VerificationResult,
  OcrExtractedItem,
  UserVerificationStatus,
  FRAUD_DETECTION_CONFIG,
} from '../types/verification';

// Gemini AI 초기화
// ⚠️ 보안: EXPO_PUBLIC_ 키는 클라이언트 번들에 포함됩니다. 프로덕션에서는 서버 프록시 권장.
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

/**
 * AI OCR로 증권사 스크린샷에서 자산 정보 추출
 */
export const extractAssetsFromScreenshot = async (
  base64Image: string
): Promise<{ items: OcrExtractedItem[]; total: number }> => {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3-flash-preview' });

    const prompt = `
이 증권사/은행 앱 스크린샷에서 자산 정보를 추출해주세요.

다음 JSON 형식으로 응답해주세요 (다른 텍스트 없이 JSON만):
{
  "items": [
    {
      "ticker": "종목코드 또는 자산명",
      "name": "종목 한글명",
      "quantity": 수량(숫자),
      "price": 현재가(숫자),
      "value": 평가금액(숫자)
    }
  ],
  "total": 총평가금액(숫자)
}

주의사항:
- 숫자에서 콤마, 원, ₩ 등 기호를 제거하고 순수 숫자만 추출
- 수량이 없으면 1로 설정
- 가격 정보가 없으면 value를 사용하여 역산
- 총액이 명시되어 있으면 그 값을 total로 사용
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image,
        },
      },
    ]);

    const response = result.response.text();

    // JSON 파싱
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('OCR 결과를 파싱할 수 없습니다');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      items: parsed.items || [],
      total: parsed.total || 0,
    };
  } catch (error) {
    console.error('OCR 추출 실패:', error);
    throw new Error('스크린샷에서 자산 정보를 추출하는 데 실패했습니다');
  }
};

/**
 * 사기 탐지: Sum(Quantity * Price) vs Total Asset 비교
 * 5% 이상 차이나면 사기 의심
 */
export const detectFraud = (
  extractedItems: OcrExtractedItem[],
  extractedTotal: number
): { calculatedTotal: number; discrepancyPercent: number; isFraudSuspected: boolean } => {
  // 개별 항목의 합계 계산
  const calculatedTotal = extractedItems.reduce((sum, item) => {
    // value가 있으면 value 사용, 없으면 quantity * price 계산
    const itemValue = item.value || (item.quantity * item.price);
    return sum + itemValue;
  }, 0);

  // 차이 비율 계산 (절대값)
  const discrepancyPercent = extractedTotal > 0
    ? Math.abs((calculatedTotal - extractedTotal) / extractedTotal) * 100
    : 0;

  // 5% 초과 시 사기 의심
  const isFraudSuspected = discrepancyPercent > FRAUD_DETECTION_CONFIG.ALLOWED_DISCREPANCY_PERCENT;

  return {
    calculatedTotal,
    discrepancyPercent: Math.round(discrepancyPercent * 100) / 100,
    isFraudSuspected,
  };
};

/**
 * 자산 검증 실행
 * 1. OCR로 스크린샷 분석
 * 2. 사기 탐지
 * 3. 검증 기록 저장
 */
export const verifyAsset = async (
  userId: string,
  portfolioId: string,
  screenshotBase64: string
): Promise<VerificationResult> => {
  try {
    // 1. OCR 추출
    const { items, total } = await extractAssetsFromScreenshot(screenshotBase64);

    // 2. 사기 탐지
    const fraudCheck = detectFraud(items, total);

    // 3. 검증 상태 결정
    let status: VerificationStatus;
    let message: string;

    if (fraudCheck.isFraudSuspected) {
      status = 'rejected';
      message = `검증 실패: 추출된 총액(${total.toLocaleString()}원)과 계산된 총액(${fraudCheck.calculatedTotal.toLocaleString()}원)의 차이가 ${fraudCheck.discrepancyPercent}%로, 허용 범위(5%)를 초과합니다.`;
    } else {
      status = 'verified';
      message = '자산 검증이 완료되었습니다.';
    }

    // 4. 검증 기록 저장
    const { error } = await supabase.from('asset_verifications').insert({
      user_id: userId,
      portfolio_id: portfolioId,
      status,
      ocr_extracted_total: total,
      ocr_extracted_items: items,
      calculated_total: fraudCheck.calculatedTotal,
      discrepancy_percent: fraudCheck.discrepancyPercent,
      is_fraud_suspected: fraudCheck.isFraudSuspected,
      verified_at: status === 'verified' ? new Date().toISOString() : null,
      verified_by: 'ai',
      rejection_reason: status === 'rejected' ? message : null,
    });

    if (error) {
      console.error('검증 기록 저장 실패:', error);
    }

    // 5. 포트폴리오 검증 상태 업데이트
    if (status === 'verified') {
      await supabase
        .from('portfolios')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_value: total,
        })
        .eq('id', portfolioId);
    }

    return {
      status,
      extractedTotal: total,
      extractedItems: items,
      calculatedTotal: fraudCheck.calculatedTotal,
      discrepancyPercent: fraudCheck.discrepancyPercent,
      isFraudSuspected: fraudCheck.isFraudSuspected,
      message,
    };
  } catch (error: any) {
    console.error('자산 검증 실패:', error);
    return {
      status: 'rejected',
      extractedTotal: 0,
      extractedItems: [],
      calculatedTotal: 0,
      discrepancyPercent: 0,
      isFraudSuspected: false,
      message: error.message || '검증 중 오류가 발생했습니다',
    };
  }
};

/**
 * 사용자의 검증 상태 조회
 */
export const getUserVerificationStatus = async (
  userId: string
): Promise<UserVerificationStatus> => {
  try {
    // 검증된 포트폴리오 조회
    const { data: portfolios, error } = await supabase
      .from('portfolios')
      .select('id, current_value, is_verified, verified_at, verified_value')
      .eq('user_id', userId)
      .eq('is_verified', true);

    if (error) {
      console.error('검증 상태 조회 실패:', error);
      return {
        hasVerifiedAssets: false,
        totalVerifiedAssets: 0,
        verifiedCount: 0,
        lastVerifiedAt: null,
        canAccessLounge: false,
      };
    }

    const verifiedPortfolios = portfolios || [];
    const totalVerifiedAssets = verifiedPortfolios.reduce(
      (sum, p) => sum + (p.verified_value || p.current_value || 0),
      0
    );

    // 마지막 검증 일시
    const lastVerifiedAt = verifiedPortfolios.length > 0
      ? verifiedPortfolios
          .map(p => p.verified_at)
          .filter(Boolean)
          .sort()
          .reverse()[0] || null
      : null;

    // 라운지 입장 가능 여부: 검증된 자산 1억 이상
    const canAccessLounge = totalVerifiedAssets >= FRAUD_DETECTION_CONFIG.MINIMUM_VERIFIED_ASSETS;

    return {
      hasVerifiedAssets: verifiedPortfolios.length > 0,
      totalVerifiedAssets,
      verifiedCount: verifiedPortfolios.length,
      lastVerifiedAt,
      canAccessLounge,
    };
  } catch (error) {
    console.error('검증 상태 조회 중 오류:', error);
    return {
      hasVerifiedAssets: false,
      totalVerifiedAssets: 0,
      verifiedCount: 0,
      lastVerifiedAt: null,
      canAccessLounge: false,
    };
  }
};
