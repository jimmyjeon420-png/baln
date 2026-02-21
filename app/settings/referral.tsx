/**
 * referral.tsx - 친구 초대 화면
 *
 * 역할: "친구 초대 부서"
 * - 내 추천 코드를 확인하고 공유
 * - 친구 초대 시 20C(2,000원), 친구는 10C(1,000원) 보상
 * - 추천인 보상은 피추천인 3일 연속 접속 후 지급 (어뷰징 방지)
 * - 코드 복사 + 카카오/문자 공유 기능
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { getMyReferralCode, REWARD_AMOUNTS } from '../../src/services/rewardService';
import { useAuth } from '../../src/context/AuthContext';

// =============================================================================
// 친구 초대 화면
// =============================================================================

export default function ReferralScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  // ---------------------------------------------------------------------------
  // 상태
  // ---------------------------------------------------------------------------
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // ---------------------------------------------------------------------------
  // 추천 코드 가져오기
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const loadCode = async () => {
      try {
        const code = await getMyReferralCode();
        if (mounted) {
          setReferralCode(code);
        }
      } catch (err) {
        console.warn('[Referral] 코드 로드 실패:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCode();
    return () => { mounted = false; };
  }, []);

  // ---------------------------------------------------------------------------
  // 코드 복사 (Share API를 통해 코드만 공유 → 복사 가능)
  // ---------------------------------------------------------------------------
  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;

    try {
      // expo-clipboard가 없으므로 Share API를 활용하여 코드를 클립보드에 전달
      await Share.share({ message: referralCode });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // 사용자가 공유 시트를 취소한 경우 무시
    }
  }, [referralCode]);

  // ---------------------------------------------------------------------------
  // 친구에게 공유 (초대 메시지 전체)
  // ---------------------------------------------------------------------------
  const handleShare = useCallback(async () => {
    if (!referralCode) return;

    try {
      const shareMessage =
        `baln에서 매일 5분 투자 습관을 만들어보세요!\n내 초대 코드: ${referralCode}\nhttps://baln.app`;

      await Share.share({ message: shareMessage });
    } catch (err) {
      console.warn('[Referral] 공유 실패:', err);
    }
  }, [referralCode]);

  // ---------------------------------------------------------------------------
  // 보상 안내 데이터
  // ---------------------------------------------------------------------------
  const rewardInfo = [
    {
      icon: 'gift-outline' as const,
      title: '내가 받는 보상',
      amount: `${REWARD_AMOUNTS.referral}C`,
      krw: `${(REWARD_AMOUNTS.referral * 100).toLocaleString()}`,
      desc: '친구가 3일 연속 접속 후 지급',
    },
    {
      icon: 'people-outline' as const,
      title: '친구가 받는 보상',
      amount: '10C',
      krw: '1,000',
      desc: '가입 시 웰컴 보너스로 지급',
    },
  ];

  // ---------------------------------------------------------------------------
  // 로그인 필요 처리
  // ---------------------------------------------------------------------------
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderBar title="친구 초대" />
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            로그인 후 친구를 초대할 수 있습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // 렌더
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="친구 초대" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 메인 배너 ── */}
        <View style={[styles.bannerCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.bannerIconWrap, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="gift" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
            친구를 초대하고{'\n'}
            <Text style={{ color: colors.primary }}>
              {REWARD_AMOUNTS.referral}C ({(REWARD_AMOUNTS.referral * 100).toLocaleString()}원)
            </Text>
            을 받으세요!
          </Text>
          <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
            친구도 가입 시 10C (1,000원)를 받습니다
          </Text>
        </View>

        {/* ── 내 초대 코드 ── */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          내 초대 코드
        </Text>
        <View style={[styles.codeCard, { backgroundColor: colors.surface }]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Text style={[styles.codeText, { color: colors.textPrimary }]}>
                {referralCode || '코드 생성 중...'}
              </Text>
              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: `${colors.primary}15` }]}
                onPress={handleCopyCode}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.copyButtonText, { color: colors.primary }]}>
                  {copied ? '복사됨' : '코드 복사'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── 공유 버튼 ── */}
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: colors.primary }]}
          onPress={handleShare}
          activeOpacity={0.8}
          disabled={!referralCode}
        >
          <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>친구에게 공유하기</Text>
        </TouchableOpacity>

        {/* ── 보상 안내 ── */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginTop: 28 }]}>
          보상 안내
        </Text>
        <View style={[styles.rewardSection, { backgroundColor: colors.surface }]}>
          {rewardInfo.map((item, index) => (
            <View
              key={index}
              style={[
                styles.rewardItem,
                index < rewardInfo.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.borderLight,
                },
              ]}
            >
              <View style={[styles.rewardIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.rewardInfo}>
                <Text style={[styles.rewardTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
                <Text style={[styles.rewardDesc, { color: colors.textTertiary }]}>
                  {item.desc}
                </Text>
              </View>
              <View style={styles.rewardAmountWrap}>
                <Text style={[styles.rewardAmount, { color: colors.primary }]}>
                  {item.amount}
                </Text>
                <Text style={[styles.rewardKrw, { color: colors.textTertiary }]}>
                  ({item.krw}원)
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── 이용 방법 ── */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginTop: 28 }]}>
          이용 방법
        </Text>
        <View style={[styles.stepsCard, { backgroundColor: colors.surface }]}>
          {[
            { step: '1', text: '위의 공유 버튼으로 초대 코드를 전달하세요' },
            { step: '2', text: '친구가 baln 앱에 가입합니다' },
            { step: '3', text: '친구가 프로필 > 추천 코드 입력에서 코드를 입력합니다' },
            { step: '4', text: '친구에게 10C 즉시 + 나에게 20C는 3일 접속 후 지급' },
          ].map((item, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>{item.step}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        {/* ── 하단 여백 ── */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // ── 메인 배너 ──
  bannerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  bannerIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 29,
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },

  // ── 코드 카드 ──
  codeCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 100,
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 33,
    fontWeight: '800',
    letterSpacing: 6,
    marginBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // ── 공유 버튼 ──
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── 보상 안내 ──
  rewardSection: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rewardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rewardDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  rewardAmountWrap: {
    alignItems: 'flex-end',
  },
  rewardAmount: {
    fontSize: 19,
    fontWeight: '700',
  },
  rewardKrw: {
    fontSize: 12,
    marginTop: 2,
  },

  // ── 이용 방법 ──
  stepsCard: {
    borderRadius: 16,
    padding: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },

  // ── 섹션 타이틀 ──
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  // ── 빈 상태 ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 23,
  },
});
