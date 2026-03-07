/**
 * 크레딧 충전소 — Apple IAP 인앱결제로 크레딧 패키지 구매
 * 비유: "앱 안의 편의점" — Apple 결제로 크레딧(게임 코인)을 충전하는 화면
 *
 * 흐름: 패키지 선택 → Apple 결제 시트 표시 → 결제 성공 → DB 크레딧 충전
 * Expo Go에서는 IAP 불가 → 안내 메시지 표시
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMyCredits, usePurchaseCredits, useCreditHistory } from '../../src/hooks/useCredits';
import { useHaptics } from '../../src/hooks/useHaptics';
import { CREDIT_PACKAGES, type CreditTransaction } from '../../src/types/marketplace';
import { CREDIT_TO_KRW, getLocaleCode } from '../../src/utils/formatters';
import { getMyReferralCode, applyReferralCode } from '../../src/services/rewardService';
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';
import {
  connectToStore,
  disconnectFromStore,
  fetchIAPProducts,
  purchaseProduct,
  completePurchase,
  setupPurchaseListeners,
  appleProductIdToPackageId,
  isExpoGo,
  isUserCancelledError,
  ErrorCode,
  type Purchase,
  type PurchaseError,
  type Product,
} from '../../src/services/appleIAP';

/** 충전 기능 오픈일 (6월 1일부터 활성화) */
const CHARGE_OPEN_DATE = new Date('2026-06-01T00:00:00');

function isChargingOpen(): boolean {
  return new Date() >= CHARGE_OPEN_DATE;
}

export default function CreditsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { mediumTap, heavyTap, success } = useHaptics();
  const { data: credits, isLoading: creditsLoading } = useMyCredits();
  const { data: history } = useCreditHistory(20);
  const purchaseMutation = usePurchaseCredits();
  const chargingOpen = isChargingOpen();

  const [iapConnected, setIapConnected] = useState(false);
  const [iapProducts, setIapProducts] = useState<Product[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [isExpoGoEnv, setIsExpoGoEnv] = useState(false);

  // 친구 추천 코드
  const [myReferralCode, setMyReferralCode] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [showReferralSection, setShowReferralSection] = useState(false);

  // 구매 중인 패키지 ID 추적 (리스너에서 참조)
  const purchasingPackageRef = useRef<string | null>(null);

  // ========================================================================
  // 친구 추천 코드 로드
  // ========================================================================

  useEffect(() => {
    getMyReferralCode().then(code => {
      if (code) setMyReferralCode(code);
    }).catch(err => console.warn('[크레딧] 추천 코드 로드 실패:', err));
  }, []);

  const handleShareReferral = async () => {
    mediumTap();
    try {
      await Share.share({
        message: t('credits.referral.share_message', { code: myReferralCode }),
      });
    } catch (err) {
      // 사용자가 공유를 취소한 경우에도 에러가 발생할 수 있으므로 경고만 로그
      console.warn('[크레딧] 공유 실패 또는 취소:', err);
    }
  };

  const handleApplyReferral = async () => {
    if (!friendCode.trim()) return;
    setReferralLoading(true);
    try {
      const result = await applyReferralCode(friendCode.trim());
      Alert.alert(result.success ? t('common.success') : t('credits.referral.fail'), result.message);
      if (result.success) setFriendCode('');
    } catch (err) {
      console.warn('[크레딧] 추천 코드 적용 실패:', err);
      Alert.alert(t('common.error'), t('credits.referral.apply_error'));
    } finally {
      setReferralLoading(false);
    }
  };

  // ========================================================================
  // 구매 리스너 핸들러
  // ========================================================================

  /** 구매 성공 — Apple 영수증 수신 → DB 크레딧 충전 → 트랜잭션 완료 */
  const handlePurchaseSuccess = useCallback(async (purchase: Purchase) => {
    try {
      const productId = purchase.productId;
      const packageId = appleProductIdToPackageId(productId);

      if (!packageId) {
        console.warn('[IAP] 알 수 없는 상품:', productId);
        setPurchasing(false);
        return;
      }

      // DB에 크레딧 충전 (트랜잭션 ID 함께 전달)
      await purchaseMutation.mutateAsync({
        packageId,
        iapReceiptId: purchase.id || undefined,
      });

      // Apple에 소비 완료 전송 (Consumable 상품이므로 필수)
      await completePurchase(purchase);

      success();
      const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
      Alert.alert(
        t('credits.purchase.complete_title'),
        t('credits.purchase.complete_message', { amount: (pkg?.credits ?? 0) + (pkg?.bonus ?? 0) })
      );
    } catch (err: unknown) {
      console.error('[IAP] 구매 후 처리 실패:', err);
      Alert.alert(t('common.error'), t('credits.purchase.charge_failed'));
    } finally {
      setPurchasing(false);
      purchasingPackageRef.current = null;
    }
  }, [purchaseMutation, success, t]);

  /** 구매 에러 — 사용자 취소 or 결제 실패 */
  const handlePurchaseError = useCallback((error: PurchaseError) => {
    setPurchasing(false);
    purchasingPackageRef.current = null;

    // 사용자가 직접 취소한 경우
    if (isUserCancelledError(error)) {
      // silently ignore - user cancelled purchase
      return;
    }

    console.error('[IAP] 구매 에러:', error);
    Alert.alert(t('credits.purchase.payment_failed'), error.message || t('credits.purchase.payment_error'));
  }, [t]);

  // ========================================================================
  // Apple IAP 초기화
  // ========================================================================

  useEffect(() => {
    // Expo Go 감지
    if (isExpoGo()) {
      setIsExpoGoEnv(true);
      return;
    }

    // iOS가 아니면 IAP 불가
    if (Platform.OS !== 'ios') {
      return;
    }

    let listenerCleanup: { remove: () => void } | null = null;

    const initIAP = async () => {
      // 1. 스토어 연결
      const connected = await connectToStore();
      setIapConnected(connected);

      if (!connected) return;

      // 2. 상품 목록 조회 (Apple에서 실제 가격 정보 수신)
      const products = await fetchIAPProducts();
      setIapProducts(products);

      // 3. 구매 리스너 등록
      listenerCleanup = setupPurchaseListeners(
        handlePurchaseSuccess,
        handlePurchaseError,
      );
    };

    initIAP();

    // 화면 퇴장 시 정리
    return () => {
      listenerCleanup?.remove();
      disconnectFromStore();
    };
  }, [handlePurchaseSuccess, handlePurchaseError]);

  // ========================================================================
  // 구매 실행
  // ========================================================================

  const _handlePurchase = async (packageId: string) => {
    heavyTap();

    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return;

    // Expo Go 또는 비-iOS → 시뮬레이션 모드
    if (isExpoGoEnv || Platform.OS !== 'ios') {
      Alert.alert(
        t('credits.purchase.title'),
        t('credits.purchase.sim_confirm', { name: pkg.name, amount: pkg.credits + pkg.bonus, price: pkg.priceLabel }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('credits.purchase.sim_buy'),
            onPress: async () => {
              try {
                await purchaseMutation.mutateAsync({ packageId });
                success();
                Alert.alert(t('credits.purchase.complete_title'), t('credits.purchase.complete_message', { amount: pkg.credits + pkg.bonus }));
              } catch (err: unknown) {
                Alert.alert(t('common.error'), (err instanceof Error ? err.message : undefined) || t('credits.purchase.buy_failed'));
              }
            },
          },
        ]
      );
      return;
    }

    // IAP 연결 안됨
    if (!iapConnected) {
      Alert.alert(t('credits.purchase.connection_error_title'), t('credits.purchase.connection_error_message'));
      return;
    }

    // 이미 구매 진행 중
    if (purchasing) return;

    // Apple 결제 시트 호출
    setPurchasing(true);
    purchasingPackageRef.current = packageId;

    try {
      await purchaseProduct(pkg.appleProductId);
      // 결과는 handlePurchaseSuccess / handlePurchaseError 리스너에서 처리됨
    } catch (err: unknown) {
      setPurchasing(false);
      purchasingPackageRef.current = null;
      // 사용자 취소가 아닌 경우에만 에러 표시
      if ((err as { code?: string })?.code !== ErrorCode.UserCancelled) {
        Alert.alert(t('credits.purchase.payment_error_title'), t('credits.purchase.payment_error_message'));
      }
    }
  };

  // ========================================================================
  // Apple 스토어 가격 표시 헬퍼
  // ========================================================================

  /** Apple 스토어에서 받은 실제 가격 (로컬라이즈됨) */
  const _getApplePrice = (appleProductId: string): string | null => {
    const product = iapProducts.find(p => p.id === appleProductId);
    return product?.displayPrice ?? null;
  };

  // ========================================================================
  // 거래 내역 헬퍼
  // ========================================================================

  const getTransactionLabel = (tx: CreditTransaction) => {
    const key = `credits.tx_type.${tx.type}`;
    const translated = t(key);
    return translated !== key ? translated : tx.type;
  };

  const getTransactionIcon = (tx: CreditTransaction) => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      purchase: 'add-circle',
      spend: 'remove-circle',
      refund: 'refresh-circle',
      bonus: 'gift',
      subscription_bonus: 'star',
    };
    return icons[tx.type] || 'ellipse';
  };

  // ========================================================================
  // 렌더링
  // ========================================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('credits.header_title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Expo Go 안내 배너 */}
        {isExpoGoEnv && (
          <View style={styles.expoGoBanner}>
            <Ionicons name="information-circle" size={20} color="#FFB74D" />
            <Text style={styles.expoGoBannerText}>
              {t('credits.expo_go_banner')}
            </Text>
          </View>
        )}

        {/* 현재 잔액 */}
        <View style={styles.balanceCard}>
          <Text style={{ fontSize: 64 }}>🌰</Text>
          <Text style={styles.balanceLabel}>{t('credits.balance_label')}</Text>
          <Text style={styles.balanceValue}>
            {creditsLoading ? '...' : t('credits.balance_count', { count: (credits?.balance ?? 0).toLocaleString() })}
          </Text>
          <Text style={styles.balanceKRW}>
            {creditsLoading ? '' : t('credits.balance_krw', { amount: ((credits?.balance ?? 0) * CREDIT_TO_KRW).toLocaleString() })}
          </Text>
        </View>

        {/* 무료 크레딧 획득 안내 (6/1 이전) */}
        {!chargingOpen && (
          <View style={styles.trialBanner}>
            <Ionicons name="gift" size={24} color="#4CAF50" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.trialTitle}>{t('credits.trial_title')}</Text>
              <Text style={styles.trialDesc}>
                {t('credits.trial_desc')}
              </Text>
            </View>
          </View>
        )}

        {/* 크레딧 획득 방법 카드 */}
        {!chargingOpen && (
          <View style={styles.earnSection}>
            <Text style={styles.sectionTitle}>{t('credits.earn_title')}</Text>
            {[
              { icon: 'calendar-outline' as const, labelKey: 'credits.earn.daily_checkin', credits: 2, descKey: 'credits.earn.daily_checkin_desc', route: null },
              { icon: 'checkmark-circle-outline' as const, labelKey: 'credits.earn.prediction_hit', credits: 3, descKey: 'credits.earn.prediction_hit_desc', route: '/(tabs)' as const },
              { icon: 'heart-outline' as const, labelKey: 'credits.earn.emotion_log', credits: 5, descKey: 'credits.earn.emotion_log_desc', route: '/(tabs)/rebalance' as const },
              { icon: 'share-social-outline' as const, labelKey: 'credits.earn.insta_share', credits: 5, descKey: 'credits.earn.insta_share_desc', route: '/analysis/what-if' as const },
              { icon: 'trophy-outline' as const, labelKey: 'credits.earn.badge_unlock', credits: '3~30', descKey: 'credits.earn.badge_unlock_desc', route: '/achievements' as const },
              { icon: 'people-outline' as const, labelKey: 'credits.earn.referral', credits: 50, descKey: 'credits.earn.referral_desc', route: 'referral' as const },
              { icon: 'wallet-outline' as const, labelKey: 'credits.earn.register_3_assets', credits: 20, descKey: 'credits.earn.register_3_assets_desc', route: '/add-asset' as const },
              { icon: 'sparkles-outline' as const, labelKey: 'credits.earn.welcome_bonus', credits: 10, descKey: 'credits.earn.welcome_bonus_desc', route: null },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.earnRow}
                activeOpacity={item.route ? 0.6 : 1}
                onPress={() => {
                  if (!item.route) return;
                  if (item.route === 'referral') {
                    mediumTap();
                    setShowReferralSection(prev => !prev);
                    return;
                  }
                  mediumTap();
                  router.push(item.route as never);
                }}
              >
                <View style={styles.earnIconWrap}>
                  <Ionicons name={item.icon} size={20} color="#4CAF50" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.earnLabel}>{t(item.labelKey)}</Text>
                  <Text style={styles.earnDesc}>{t(item.descKey)}</Text>
                </View>
                <View style={styles.earnBadge}>
                  <Text style={styles.earnBadgeText}>+{item.credits}</Text>
                </View>
                {item.route && (
                  <Ionicons name="chevron-forward" size={16} color="#555" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            ))}

            {/* 친구 추천 코드 섹션 (펼침) */}
            {showReferralSection && (
              <View style={styles.referralSection}>
                {/* 내 추천 코드 */}
                <View style={styles.referralMyCode}>
                  <Text style={styles.referralLabel}>{t('credits.referral.my_code')}</Text>
                  <View style={styles.referralCodeRow}>
                    <Text style={styles.referralCode}>{myReferralCode || '...'}</Text>
                    <TouchableOpacity style={styles.referralShareBtn} onPress={handleShareReferral}>
                      <Ionicons name="share-outline" size={16} color="#FFF" />
                      <Text style={styles.referralShareText}>{t('common.share')}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.referralHint}>{t('credits.referral.hint')}</Text>
                </View>

                {/* 친구 코드 입력 */}
                <View style={styles.referralInputSection}>
                  <Text style={styles.referralLabel}>{t('credits.referral.enter_code')}</Text>
                  <View style={styles.referralInputRow}>
                    <TextInput
                      style={styles.referralInput}
                      value={friendCode}
                      onChangeText={setFriendCode}
                      placeholder={t('credits.referral.code_placeholder')}
                      placeholderTextColor="#555"
                      maxLength={6}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[styles.referralApplyBtn, (!friendCode.trim() || referralLoading) && { opacity: 0.4 }]}
                      onPress={handleApplyReferral}
                      disabled={!friendCode.trim() || referralLoading}
                    >
                      {referralLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.referralApplyText}>{t('common.apply')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.earnTip}>
              <Ionicons name="information-circle" size={16} color="#7C4DFF" />
              <Text style={styles.earnTipText}>
                {t('credits.earn_tip')}
              </Text>
            </View>
          </View>
        )}

        {/* 크레딧 패키지 — IAP 상품 등록 후 오픈 예정 (App Store 심사용 임시 숨김) */}
        {/* TODO: App Store Connect에 IAP 등록 완료 후 이 섹션 복원 */}

        {/* 거래 내역 */}
        {history && history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>{t('credits.history_title')}</Text>
            {history.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <Ionicons
                  name={getTransactionIcon(tx)}
                  size={20}
                  color={tx.amount >= 0 ? '#4CAF50' : '#CF6679'}
                />
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel}>{getTransactionLabel(tx)}</Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleDateString(getLocaleCode())}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.amount >= 0 ? '#4CAF50' : '#CF6679' },
                    ]}
                  >
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                  </Text>
                  <Text style={styles.txBalance}>{t('credits.tx_balance', { amount: tx.balance_after })}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 안내 */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{t('credits.info_title')}</Text>
          <Text style={styles.infoText}>
            {t('credits.info_text')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: { color: '#FFF', fontSize: 19, fontWeight: '700' },

  // Expo Go 안내 배너
  expoGoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#332B00',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFB74D40',
  },
  expoGoBannerText: { color: '#FFB74D', fontSize: 13, lineHeight: 19, flex: 1 },

  // 무료 체험 배너
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  trialTitle: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  trialDesc: {
    color: '#9E9E9E',
    fontSize: 14,
    lineHeight: 20,
  },

  // 잔액 카드
  balanceCard: {
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#7C4DFF40',
  },
  balanceLabel: { color: '#888', fontSize: 15, marginTop: 8 },
  balanceValue: { color: '#FFF', fontSize: 36, fontWeight: '800', marginTop: 4 },
  balanceKRW: { color: '#888', fontSize: 14, marginTop: 4 },

  // 섹션
  sectionTitle: { color: '#FFF', fontSize: 17, fontWeight: '700', marginBottom: 12 },

  // 패키지 목록
  packageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  packageCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  popularCard: {
    borderColor: '#7C4DFF',
    borderWidth: 2,
  },
  selectedCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#1A2E1A',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularBadge: {
    backgroundColor: '#7C4DFF',
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  packageName: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creditAmount: { color: '#FFF', fontSize: 23, fontWeight: '800' },
  bonusText: { color: '#4CAF50', fontSize: 15, fontWeight: '700' },
  packagePrice: { color: '#FFF', fontSize: 17, fontWeight: '700', marginTop: 8 },
  perCredit: { color: '#666', fontSize: 12, marginTop: 2 },

  // 구매 버튼
  purchaseButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  purchaseButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  purchaseButtonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  disabledButton: { opacity: 0.5 },

  // 거래 내역
  historySection: { marginTop: 8 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2A2A2A',
  },
  txInfo: { flex: 1 },
  txLabel: { color: '#CCC', fontSize: 14, fontWeight: '600' },
  txDate: { color: '#666', fontSize: 12 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txBalance: { color: '#666', fontSize: 12 },

  // 크레딧 획득 방법
  earnSection: {
    marginBottom: 24,
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  earnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnLabel: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  earnDesc: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  earnBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  earnBadgeText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '800',
  },
  earnTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(124, 77, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.2)',
  },
  earnTipText: {
    color: '#B39DDB',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  // 친구 추천 섹션
  referralSection: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#7C4DFF30',
    gap: 16,
  },
  referralMyCode: { gap: 8 },
  referralLabel: { color: '#CCC', fontSize: 14, fontWeight: '600' },
  referralCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralCode: {
    flex: 1,
    fontSize: 25,
    fontWeight: '800',
    color: '#7C4DFF',
    letterSpacing: 4,
  },
  referralShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  referralShareText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  referralHint: { color: '#888', fontSize: 12, lineHeight: 17 },
  referralInputSection: { gap: 8 },
  referralInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referralInput: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#333',
  },
  referralApplyBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  referralApplyText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // 안내 섹션
  infoSection: {
    marginTop: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: { color: '#888', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  infoText: { color: '#666', fontSize: 13, lineHeight: 21 },
});
