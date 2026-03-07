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
 *
 * NOTE: react-native-iap uses NitroModules which crash in Expo Go.
 * All imports are lazy (require()) so Expo Go can still load this module.
 */

import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { CREDIT_PACKAGES, SUBSCRIPTION_PRODUCTS } from '../types/marketplace';

// Lazy-load react-native-iap to avoid NitroModules crash in Expo Go
function getIAP() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  return require('react-native-iap') as typeof import('react-native-iap');
}

// Re-export types (these are type-only, no runtime cost)
export type { Purchase, PurchaseError, Product } from 'react-native-iap';
export { ErrorCode } from 'react-native-iap';

// ============================================================================
// 상수
// ============================================================================

/** Apple Product ID 목록 — 소모품(크레딧) */
export const APPLE_PRODUCT_IDS = CREDIT_PACKAGES.map(pkg => pkg.appleProductId);

/** Apple Product ID 목록 — 구독(Premium) */
export const APPLE_SUBSCRIPTION_IDS = Object.values(SUBSCRIPTION_PRODUCTS).map(p => p.appleProductId);

// ============================================================================
// Expo Go 감지
// ============================================================================

/** Expo Go 환경인지 감지 (IAP 사용 불가) */
export function isExpoGo(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    return Constants.executionEnvironment !== 'standalone'
      && Constants.executionEnvironment !== 'storeClient';
  } catch {
    return false;
  }
}

// ============================================================================
// 연결 관리
// ============================================================================

/** IAP 스토어 연결 초기화 — 화면 진입 시 호출 */
export async function connectToStore(): Promise<boolean> {
  try {
    if (Platform.OS !== 'ios' || isExpoGo()) {
      if (__DEV__) console.log('[IAP] IAP not available in this environment');
      return false;
    }
    const { initConnection } = getIAP();
    const result = await initConnection();
    if (__DEV__) console.log('[IAP] Store connected:', result);
    return true;
  } catch (err) {
    console.warn('[IAP] Store connection failed:', err);
    Sentry.addBreadcrumb({
      category: 'api',
      message: 'IAP connectToStore failed',
      level: 'error',
      data: { error: String(err) },
    });
    return false;
  }
}

/** IAP 스토어 연결 해제 — 화면 퇴장 시 호출 */
export async function disconnectFromStore(): Promise<void> {
  try {
    if (isExpoGo()) return;
    const { endConnection } = getIAP();
    await endConnection();
    if (__DEV__) console.log('[IAP] Store disconnected');
  } catch (err) {
    console.warn('[IAP] Store disconnect failed:', err);
  }
}

// ============================================================================
// 상품 조회
// ============================================================================

/** Apple 스토어에서 상품 정보 조회 (실제 가격 포함) */
export async function fetchIAPProducts(): Promise<import('react-native-iap').Product[]> {
  try {
    if (isExpoGo()) return [];
    const { fetchProducts } = getIAP();
    const products = await fetchProducts({ skus: APPLE_PRODUCT_IDS });
    const result = (products ?? []) as import('react-native-iap').Product[];
    if (__DEV__) console.log('[IAP] Products fetched:', result.length);
    return result;
  } catch (err) {
    console.warn('[IAP] Product fetch failed:', err);
    return [];
  }
}

// ============================================================================
// 구매 실행
// ============================================================================

/** Apple IAP 구매 요청 (Consumable 상품 — 크레딧) */
export async function purchaseProduct(appleProductId: string): Promise<void> {
  try {
    if (isExpoGo()) throw new Error('IAP not available in Expo Go');
    if (__DEV__) console.log('[IAP] Purchase request:', appleProductId);
    const { requestPurchase } = getIAP();
    await requestPurchase({
      type: 'in-app',
      request: {
        apple: { sku: appleProductId },
      },
    });
  } catch (err) {
    console.warn('[IAP] Purchase failed:', err);
    Sentry.addBreadcrumb({
      category: 'api',
      message: `IAP purchaseProduct failed for ${appleProductId}`,
      level: 'error',
      data: { error: String(err), productId: appleProductId },
    });
    throw err;
  }
}

/** Apple IAP 구독 요청 (Auto-Renewable Subscription — Premium) */
export async function purchaseSubscription(appleProductId: string): Promise<void> {
  try {
    if (isExpoGo()) throw new Error('IAP not available in Expo Go');
    if (__DEV__) console.log('[IAP] Subscription request:', appleProductId);
    const { requestPurchase } = getIAP();
    await requestPurchase({
      type: 'subs',
      request: {
        apple: { sku: appleProductId },
      },
    });
  } catch (err) {
    console.warn('[IAP] Subscription failed:', err);
    throw err;
  }
}

// ============================================================================
// 영수증 완료 처리
// ============================================================================

/** 구매 완료 처리 — Apple에 소비 확인 전송 (Consumable 필수) */
export async function completePurchase(purchase: import('react-native-iap').Purchase): Promise<void> {
  try {
    if (isExpoGo()) return;
    const { finishTransaction } = getIAP();
    await finishTransaction({ purchase, isConsumable: true });
    if (__DEV__) console.log('[IAP] Transaction completed:', purchase.id);
  } catch (err) {
    console.warn('[IAP] Transaction completion failed:', err);
    throw err;
  }
}

// ============================================================================
// 리스너 등록
// ============================================================================

/** 구매 성공/에러 리스너 등록 — 화면 마운트 시 호출 */
export function setupPurchaseListeners(
  onPurchaseSuccess: (purchase: import('react-native-iap').Purchase) => void,
  onPurchaseError: (error: import('react-native-iap').PurchaseError) => void
): { remove: () => void } {
  if (isExpoGo()) {
    return { remove: () => {} };
  }
  const { purchaseUpdatedListener, purchaseErrorListener } = getIAP();
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
export function isUserCancelledError(error: import('react-native-iap').PurchaseError): boolean {
  const { ErrorCode: EC } = getIAP();
  return error.code === EC.UserCancelled;
}
