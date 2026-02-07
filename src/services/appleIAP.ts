/**
 * Apple IAP 서비스 — Apple App Store 인앱결제 래퍼
 * react-native-iap를 감싸서 연결/해제, 상품 조회, 구매, 영수증 완료를 관리
 *
 * 비유: "앱 안의 애플 결제 창구"
 * - connectToStore(): 결제 창구 열기
 * - disconnectFromStore(): 결제 창구 닫기
 * - fetchIAPProducts(): 판매 중인 상품 목록 가져오기
 * - purchaseProduct(): 고객이 상품 구매 요청
 * - completePurchase(): 구매 영수증 처리 완료
 */

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ErrorCode,
  type Purchase,
  type PurchaseError,
  type Product,
} from 'react-native-iap';
import { CREDIT_PACKAGES } from '../types/marketplace';

// ============================================================================
// 상수
// ============================================================================

/** Apple Product ID 목록 (App Store Connect에 등록한 것과 동일해야 함) */
export const APPLE_PRODUCT_IDS = CREDIT_PACKAGES.map(pkg => pkg.appleProductId);

// ============================================================================
// 연결 관리
// ============================================================================

/** IAP 스토어 연결 초기화 — 화면 진입 시 호출 */
export async function connectToStore(): Promise<boolean> {
  try {
    if (Platform.OS !== 'ios') {
      console.log('[IAP] iOS가 아닌 환경 — 연결 스킵');
      return false;
    }
    const result = await initConnection();
    console.log('[IAP] 스토어 연결 성공:', result);
    return true;
  } catch (err) {
    console.warn('[IAP] 스토어 연결 실패:', err);
    return false;
  }
}

/** IAP 스토어 연결 해제 — 화면 퇴장 시 호출 */
export async function disconnectFromStore(): Promise<void> {
  try {
    await endConnection();
    console.log('[IAP] 스토어 연결 해제');
  } catch (err) {
    console.warn('[IAP] 스토어 연결 해제 실패:', err);
  }
}

// ============================================================================
// 상품 조회
// ============================================================================

/** Apple 스토어에서 상품 정보 조회 (실제 가격 포함) */
export async function fetchIAPProducts(): Promise<Product[]> {
  try {
    const products = await fetchProducts({ skus: APPLE_PRODUCT_IDS });
    // fetchProducts는 Product[] | ProductSubscription[] | null 반환
    // Consumable 상품이므로 Product[]로 캐스팅
    const result = (products ?? []) as Product[];
    console.log('[IAP] 상품 조회 성공:', result.length, '개');
    return result;
  } catch (err) {
    console.warn('[IAP] 상품 조회 실패:', err);
    return [];
  }
}

// ============================================================================
// 구매 실행
// ============================================================================

/** Apple IAP 구매 요청 (Consumable 상품) */
export async function purchaseProduct(appleProductId: string): Promise<void> {
  try {
    console.log('[IAP] 구매 요청:', appleProductId);
    // 최신 react-native-iap API: type + request 구조
    await requestPurchase({
      type: 'in-app',
      request: {
        apple: { sku: appleProductId },
      },
    });
    // 결과는 purchaseUpdatedListener에서 수신됨
  } catch (err) {
    console.warn('[IAP] 구매 요청 실패:', err);
    throw err;
  }
}

// ============================================================================
// 영수증 완료 처리
// ============================================================================

/** 구매 완료 처리 — Apple에 소비 확인 전송 (Consumable 필수) */
export async function completePurchase(purchase: Purchase): Promise<void> {
  try {
    await finishTransaction({ purchase, isConsumable: true });
    console.log('[IAP] 트랜잭션 완료 처리:', purchase.id);
  } catch (err) {
    console.warn('[IAP] 트랜잭션 완료 실패:', err);
    throw err;
  }
}

// ============================================================================
// 리스너 등록
// ============================================================================

/** 구매 성공/에러 리스너 등록 — 화면 마운트 시 호출 */
export function setupPurchaseListeners(
  onPurchaseSuccess: (purchase: Purchase) => void,
  onPurchaseError: (error: PurchaseError) => void
): { remove: () => void } {
  const updateSubscription = purchaseUpdatedListener(onPurchaseSuccess);
  const errorSubscription = purchaseErrorListener(onPurchaseError);

  return {
    remove: () => {
      updateSubscription.remove();
      errorSubscription.remove();
    },
  };
}

// ============================================================================
// 유틸리티
// ============================================================================

/** Apple Product ID → 앱 패키지 ID 변환 */
export function appleProductIdToPackageId(appleProductId: string): string | null {
  const pkg = CREDIT_PACKAGES.find(p => p.appleProductId === appleProductId);
  return pkg?.id ?? null;
}

/** 사용자 취소 에러인지 확인 */
export function isUserCancelledError(error: PurchaseError): boolean {
  return error.code === ErrorCode.UserCancelled;
}

/** Expo Go 환경인지 감지 (IAP 사용 불가) */
export function isExpoGo(): boolean {
  try {
    const Constants = require('expo-constants').default;
    return Constants.executionEnvironment !== 'standalone'
      && Constants.executionEnvironment !== 'storeClient';
  } catch {
    return false;
  }
}

// 타입 re-export (credits.tsx에서 사용)
export { ErrorCode };
export type { Purchase, PurchaseError, Product };
