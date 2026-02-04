/**
 * 자산 검증 시스템 타입 정의
 * - Self-Declared: 수동 입력 (대시보드용)
 * - Verified: AI OCR 검증 완료 (라운지 입장 자격)
 */

// 검증 상태 타입
export type VerificationStatus = 'self_declared' | 'pending' | 'verified' | 'rejected';

// 자산 검증 기록
export interface AssetVerification {
  id: string;
  user_id: string;
  portfolio_id: string;

  // 검증 상태
  status: VerificationStatus;

  // OCR 스크린샷 URL
  screenshot_url: string | null;

  // OCR 추출 데이터
  ocr_extracted_total: number | null;      // OCR로 추출한 총 자산
  ocr_extracted_items: OcrExtractedItem[]; // OCR로 추출한 개별 항목

  // 사기 탐지
  calculated_total: number | null;         // Sum(Quantity * Price) 계산값
  discrepancy_percent: number | null;      // 차이 비율 (%)
  is_fraud_suspected: boolean;             // 사기 의심 여부

  // 검증 결과
  verified_at: string | null;
  verified_by: 'ai' | 'admin' | null;
  rejection_reason: string | null;

  created_at: string;
  updated_at: string;
}

// OCR 추출 항목
export interface OcrExtractedItem {
  ticker: string;
  name: string;
  quantity: number;
  price: number;
  value: number;
}

// 검증 요청 입력
export interface VerificationRequest {
  portfolioId: string;
  screenshotBase64: string;
}

// 검증 결과
export interface VerificationResult {
  status: VerificationStatus;
  extractedTotal: number;
  extractedItems: OcrExtractedItem[];
  calculatedTotal: number;
  discrepancyPercent: number;
  isFraudSuspected: boolean;
  message: string;
}

// 사용자 검증 상태 (프로필에 표시)
export interface UserVerificationStatus {
  hasVerifiedAssets: boolean;        // 검증된 자산이 있는지
  totalVerifiedAssets: number;       // 검증된 총 자산액
  verifiedCount: number;             // 검증 완료된 자산 수
  lastVerifiedAt: string | null;     // 마지막 검증 일시
  canAccessLounge: boolean;          // 라운지 입장 가능 여부
}

// 사기 탐지 설정
export const FRAUD_DETECTION_CONFIG = {
  // 허용 오차 범위 (5%)
  ALLOWED_DISCREPANCY_PERCENT: 5,

  // 최소 검증 금액 (라운지 입장 기준)
  MINIMUM_VERIFIED_ASSETS: 100000000, // 1억 원
};

// 검증 배지 타입
export type VerificationBadge = 'none' | 'verified' | 'premium_verified';

// 검증 배지 설정
export const VERIFICATION_BADGES = {
  none: {
    label: '',
    icon: null,
    color: 'transparent',
  },
  verified: {
    label: 'Verified',
    icon: 'checkmark-circle',
    color: '#4CAF50',
  },
  premium_verified: {
    label: 'Premium Verified',
    icon: 'shield-checkmark',
    color: '#FFD700',
  },
};
