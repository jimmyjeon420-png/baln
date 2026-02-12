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
import { CREDIT_PACKAGES } from '../../src/types/marketplace';
import type { CreditTransaction } from '../../src/types/marketplace';
import { formatCredits, CREDIT_TO_KRW } from '../../src/utils/formatters';
import { getMyReferralCode, applyReferralCode, REWARD_AMOUNTS } from '../../src/services/rewardService';
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
const FREE_TRIAL_END_LABEL = '5월 31일';

function isChargingOpen(): boolean {
  return new Date() >= CHARGE_OPEN_DATE;
}

export default function CreditsScreen() {
  const router = useRouter();
  const { mediumTap, heavyTap, success } = useHaptics();
  const { data: credits, isLoading: creditsLoading } = useMyCredits();
  const { data: history } = useCreditHistory(20);
  const purchaseMutation = usePurchaseCredits();
  const chargingOpen = isChargingOpen();

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
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
    });
  }, []);

  const handleShareReferral = async () => {
    mediumTap();
    try {
      await Share.share({
        message: `baln(발른)에서 투자 습관을 만들어보세요! 내 추천 코드: ${myReferralCode}\n가입 시 10크레딧(₩1,000) 보너스!`,
      });
    } catch {}
  };

  const handleApplyReferral = async () => {
    if (!friendCode.trim()) return;
    setReferralLoading(true);
    const result = await applyReferralCode(friendCode.trim());
    setReferralLoading(false);
    Alert.alert(result.success ? '성공!' : '실패', result.message);
    if (result.success) setFriendCode('');
  };

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
  }, []);

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
        '구매 완료!',
        `${(pkg?.credits ?? 0) + (pkg?.bonus ?? 0)} 크레딧이 충전되었습니다.`
      );
    } catch (err: any) {
      console.error('[IAP] 구매 후 처리 실패:', err);
      Alert.alert('오류', '결제는 완료되었으나 크레딧 충전에 실패했습니다.\n고객센터에 문의해 주세요.');
    } finally {
      setPurchasing(false);
      purchasingPackageRef.current = null;
    }
  }, [purchaseMutation, success]);

  /** 구매 에러 — 사용자 취소 or 결제 실패 */
  const handlePurchaseError = useCallback((error: PurchaseError) => {
    setPurchasing(false);
    purchasingPackageRef.current = null;

    // 사용자가 직접 취소한 경우
    if (isUserCancelledError(error)) {
      console.log('[IAP] 사용자 취소');
      return;
    }

    console.error('[IAP] 구매 에러:', error);
    Alert.alert('결제 실패', error.message || '결제 중 오류가 발생했습니다.');
  }, []);

  // ========================================================================
  // 구매 실행
  // ========================================================================

  const handlePurchase = async (packageId: string) => {
    heavyTap();

    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return;

    // Expo Go 또는 비-iOS → 시뮬레이션 모드
    if (isExpoGoEnv || Platform.OS !== 'ios') {
      Alert.alert(
        '크레딧 구매',
        `${pkg.name} 패키지 (${pkg.credits + pkg.bonus} 크레딧)를\n${pkg.priceLabel}에 구매하시겠습니까?\n\n⚠️ EAS 빌드에서만 실제 결제가 진행됩니다.\n(현재: 시뮬레이션 모드)`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '시뮬레이션 구매',
            onPress: async () => {
              try {
                await purchaseMutation.mutateAsync({ packageId });
                success();
                Alert.alert('구매 완료!', `${pkg.credits + pkg.bonus} 크레딧이 충전되었습니다.`);
              } catch (err: any) {
                Alert.alert('오류', err.message || '구매에 실패했습니다');
              }
            },
          },
        ]
      );
      return;
    }

    // IAP 연결 안됨
    if (!iapConnected) {
      Alert.alert('연결 오류', '앱 스토어에 연결할 수 없습니다.\n잠시 후 다시 시도해 주세요.');
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
    } catch (err: any) {
      setPurchasing(false);
      purchasingPackageRef.current = null;
      // 사용자 취소가 아닌 경우에만 에러 표시
      if (err?.code !== ErrorCode.UserCancelled) {
        Alert.alert('결제 오류', '결제를 시작할 수 없습니다.\n잠시 후 다시 시도해 주세요.');
      }
    }
  };

  // ========================================================================
  // Apple 스토어 가격 표시 헬퍼
  // ========================================================================

  /** Apple 스토어에서 받은 실제 가격 (로컬라이즈됨) */
  const getApplePrice = (appleProductId: string): string | null => {
    const product = iapProducts.find(p => p.id === appleProductId);
    return product?.displayPrice ?? null;
  };

  // ========================================================================
  // 거래 내역 헬퍼
  // ========================================================================

  const getTransactionLabel = (tx: CreditTransaction) => {
    const labels: Record<string, string> = {
      purchase: '크레딧 구매',
      spend: '크레딧 사용',
      refund: '환불',
      bonus: '보너스',
      subscription_bonus: '구독 보너스',
    };
    return labels[tx.type] || tx.type;
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>크레딧 충전소</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Expo Go 안내 배너 */}
        {isExpoGoEnv && (
          <View style={styles.expoGoBanner}>
            <Ionicons name="information-circle" size={20} color="#FFB74D" />
            <Text style={styles.expoGoBannerText}>
              Expo Go에서는 시뮬레이션 모드로 동작합니다.{'\n'}
              실제 결제는 EAS 빌드(TestFlight)에서 가능합니다.
            </Text>
          </View>
        )}

        {/* 현재 잔액 */}
        <View style={styles.balanceCard}>
          <Ionicons name="diamond" size={32} color="#7C4DFF" />
          <Text style={styles.balanceLabel}>보유 크레딧</Text>
          <Text style={styles.balanceValue}>
            {creditsLoading ? '...' : (credits?.balance ?? 0).toLocaleString()}C
          </Text>
          <Text style={styles.balanceKRW}>
            {creditsLoading ? '' : `₩${((credits?.balance ?? 0) * CREDIT_TO_KRW).toLocaleString()} 상당`}
          </Text>
        </View>

        {/* 무료 크레딧 획득 안내 (6/1 이전) */}
        {!chargingOpen && (
          <View style={styles.trialBanner}>
            <Ionicons name="gift" size={24} color="#4CAF50" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.trialTitle}>무료로 크레딧을 모아보세요!</Text>
              <Text style={styles.trialDesc}>
                아래 활동으로 크레딧을 획득하면{'\n'}
                AI 분석, 시뮬레이션 등 프리미엄 서비스를 이용할 수 있어요.
              </Text>
            </View>
          </View>
        )}

        {/* 크레딧 획득 방법 카드 */}
        {!chargingOpen && (
          <View style={styles.earnSection}>
            <Text style={styles.sectionTitle}>크레딧 획득 방법</Text>
            {[
              { icon: 'calendar-outline' as const, label: '매일 출석 체크', credits: 2, desc: '앱을 열면 자동 적립', route: null },
              { icon: 'checkmark-circle-outline' as const, label: '예측 적중', credits: 3, desc: '투표 결과가 맞으면 보상', route: '/(tabs)' as const },
              { icon: 'heart-outline' as const, label: '투자 감정 기록', credits: 5, desc: '오늘의 감정을 기록하면 보상', route: '/(tabs)/rebalance' as const },
              { icon: 'share-social-outline' as const, label: '인스타 공유', credits: 5, desc: '분석 결과를 캡처해서 공유', route: '/analysis/what-if' as const },
              { icon: 'trophy-outline' as const, label: '성취 배지 해금', credits: '3~30', desc: '배지 획득 시 크레딧 보상 (총 128C)', route: '/achievements' as const },
              { icon: 'people-outline' as const, label: '친구 추천', credits: 50, desc: '내 추천 코드로 친구가 가입', route: 'referral' as const },
              { icon: 'wallet-outline' as const, label: '자산 3개 등록', credits: 20, desc: '자산 3종목 이상 등록 시 1회', route: '/add-asset' as const },
              { icon: 'sparkles-outline' as const, label: '환영 보너스', credits: 10, desc: '신규 가입 시 1회 지급', route: null },
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
                  router.push(item.route as any);
                }}
              >
                <View style={styles.earnIconWrap}>
                  <Ionicons name={item.icon} size={20} color="#4CAF50" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.earnLabel}>{item.label}</Text>
                  <Text style={styles.earnDesc}>{item.desc}</Text>
                </View>
                <View style={styles.earnBadge}>
                  <Text style={styles.earnBadgeText}>+{item.credits}C</Text>
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
                  <Text style={styles.referralLabel}>내 추천 코드</Text>
                  <View style={styles.referralCodeRow}>
                    <Text style={styles.referralCode}>{myReferralCode || '...'}</Text>
                    <TouchableOpacity style={styles.referralShareBtn} onPress={handleShareReferral}>
                      <Ionicons name="share-outline" size={16} color="#FFF" />
                      <Text style={styles.referralShareText}>공유하기</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.referralHint}>친구가 이 코드로 가입하면 나에게 50C, 친구에게 10C!</Text>
                </View>

                {/* 친구 코드 입력 */}
                <View style={styles.referralInputSection}>
                  <Text style={styles.referralLabel}>친구 추천 코드 입력</Text>
                  <View style={styles.referralInputRow}>
                    <TextInput
                      style={styles.referralInput}
                      value={friendCode}
                      onChangeText={setFriendCode}
                      placeholder="6자리 코드 입력"
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
                        <Text style={styles.referralApplyText}>적용</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.earnTip}>
              <Ionicons name="information-circle" size={16} color="#7C4DFF" />
              <Text style={styles.earnTipText}>
                획득한 크레딧으로 딥다이브 분석, 위기 시뮬레이션, AI 버핏 티타임 등을 이용하세요!
              </Text>
            </View>
          </View>
        )}

        {/* 패키지 목록 */}
        <Text style={styles.sectionTitle}>크레딧 패키지</Text>
        <View style={[styles.packageList, !chargingOpen && { opacity: 0.4 }]}>
          {CREDIT_PACKAGES.map(pkg => {
            const applePrice = getApplePrice(pkg.appleProductId);
            return (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.packageCard,
                  pkg.popular && styles.popularCard,
                  chargingOpen && selectedPackage === pkg.id && styles.selectedCard,
                ]}
                onPress={() => {
                  if (!chargingOpen) return;
                  mediumTap();
                  setSelectedPackage(pkg.id);
                }}
                activeOpacity={chargingOpen ? 0.7 : 1}
                disabled={!chargingOpen}
              >
                {pkg.badge && (
                  <View style={[styles.badge, pkg.popular && styles.popularBadge]}>
                    <Text style={styles.badgeText}>{pkg.badge}</Text>
                  </View>
                )}
                <Text style={styles.packageName}>{pkg.name}</Text>
                <View style={styles.creditRow}>
                  <Ionicons name="diamond" size={18} color="#7C4DFF" />
                  <Text style={styles.creditAmount}>{pkg.credits}</Text>
                  {pkg.bonus > 0 && (
                    <Text style={styles.bonusText}>+{pkg.bonus}</Text>
                  )}
                </View>
                {/* Apple 실제 가격이 있으면 표시, 없으면 기본 가격 */}
                <Text style={styles.packagePrice}>
                  {applePrice || pkg.priceLabel}
                </Text>
                <Text style={styles.perCredit}>
                  크레딧당 ₩{Math.round(pkg.price / (pkg.credits + pkg.bonus)).toLocaleString()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 구매 버튼 (6/1 이후에만 활성) */}
        {chargingOpen && selectedPackage && (
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              (purchasing || purchaseMutation.isPending) && styles.disabledButton,
            ]}
            onPress={() => handlePurchase(selectedPackage)}
            disabled={purchasing || purchaseMutation.isPending}
            activeOpacity={0.7}
          >
            {(purchasing || purchaseMutation.isPending) ? (
              <View style={styles.purchaseButtonContent}>
                <ActivityIndicator color="#FFF" size="small" />
                <Text style={styles.purchaseButtonText}>결제 진행 중...</Text>
              </View>
            ) : (
              <View style={styles.purchaseButtonContent}>
                <Ionicons name="logo-apple" size={20} color="#FFF" />
                <Text style={styles.purchaseButtonText}>
                  {(() => {
                    const pkg = CREDIT_PACKAGES.find(p => p.id === selectedPackage);
                    const applePrice = pkg ? getApplePrice(pkg.appleProductId) : null;
                    return `${applePrice || pkg?.priceLabel} 구매하기`;
                  })()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* 거래 내역 */}
        {history && history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>거래 내역</Text>
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
                    {new Date(tx.created_at).toLocaleDateString('ko-KR')}
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
                  <Text style={styles.txBalance}>잔액: {tx.balance_after}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 안내 */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>크레딧 안내</Text>
          <Text style={styles.infoText}>
            - 크레딧은 AI 프리미엄 기능 이용에 사용됩니다{'\n'}
            - AI 분석 실패 시 크레딧이 자동 환불됩니다{'\n'}
            - 구독자는 매월 30 크레딧(₩3,000) 보너스를 받습니다{'\n'}
            - 등급이 높을수록 할인율이 적용됩니다{'\n'}
            - 결제는 Apple App Store를 통해 처리됩니다
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },

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
  expoGoBannerText: { color: '#FFB74D', fontSize: 12, lineHeight: 18, flex: 1 },

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
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  trialDesc: {
    color: '#9E9E9E',
    fontSize: 13,
    lineHeight: 19,
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
  balanceLabel: { color: '#888', fontSize: 14, marginTop: 8 },
  balanceValue: { color: '#FFF', fontSize: 36, fontWeight: '800', marginTop: 4 },
  balanceKRW: { color: '#888', fontSize: 13, marginTop: 4 },

  // 섹션
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },

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
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  packageName: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creditAmount: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  bonusText: { color: '#4CAF50', fontSize: 14, fontWeight: '700' },
  packagePrice: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 8 },
  perCredit: { color: '#666', fontSize: 11, marginTop: 2 },

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
  purchaseButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
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
  txLabel: { color: '#CCC', fontSize: 13, fontWeight: '600' },
  txDate: { color: '#666', fontSize: 11 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txBalance: { color: '#666', fontSize: 11 },

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
    fontSize: 14,
    fontWeight: '600',
  },
  earnDesc: {
    color: '#888',
    fontSize: 12,
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
    fontSize: 13,
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
    fontSize: 12,
    lineHeight: 18,
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
  referralLabel: { color: '#CCC', fontSize: 13, fontWeight: '600' },
  referralCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralCode: {
    flex: 1,
    fontSize: 24,
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
  referralShareText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  referralHint: { color: '#888', fontSize: 11, lineHeight: 16 },
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
    fontSize: 16,
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
  referralApplyText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // 안내 섹션
  infoSection: {
    marginTop: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: { color: '#888', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  infoText: { color: '#666', fontSize: 12, lineHeight: 20 },
});
