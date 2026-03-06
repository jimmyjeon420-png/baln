/**
 * GuruGiftModal -- 구루에게 선물 주기 모달
 *
 * 역할: 5/10/20 크레딧으로 구루에게 선물 -> 구루 기뻐함 + 우정 포인트 증가
 * 비유: "동물의숲 선물 주기" -- NPC에게 선물을 주면 친밀도가 오르는 시스템
 *
 * 사용처:
 * - GuruDetailSheet의 "선물하기" 버튼 탭 시 열림
 * - 선물 완료 후 24시간 하트 파티클 표시 (상위에서 관리)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
} from 'react-native';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import type { ThemeColors } from '../../styles/colors';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

interface GuruGiftModalProps {
  /** 모달 표시 여부 */
  visible: boolean;
  /** 선물 대상 구루 ID (null이면 비표시) */
  guruId: string | null;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 선물 보내기 콜백 (guruId, cost, friendshipGain) */
  onGift: (guruId: string, cost: number, friendshipGain: number) => Promise<void>;
  /** 테마 색상 */
  colors: ThemeColors;
}

// ============================================================================
// 선물 옵션 데이터
// ============================================================================

interface GiftOption {
  id: string;
  emoji: string;
  nameKo: string;
  nameEn: string;
  cost: number;
  friendshipGain: number;
}

const GIFT_OPTIONS: GiftOption[] = [
  {
    id: 'small',
    emoji: '\uD83C\uDF81', // 선물상자
    nameKo: '작은 선물',
    nameEn: 'Small Gift',
    cost: 5,
    friendshipGain: 5,
  },
  {
    id: 'flower',
    emoji: '\uD83C\uDF38', // 꽃다발
    nameKo: '꽃다발',
    nameEn: 'Flower Bouquet',
    cost: 10,
    friendshipGain: 10,
  },
  {
    id: 'special',
    emoji: '\u2B50', // 별
    nameKo: '특별 선물',
    nameEn: 'Special Gift',
    cost: 20,
    friendshipGain: 20,
  },
];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function GuruGiftModal({
  visible,
  guruId,
  onClose,
  onGift,
  colors,
}: GuruGiftModalProps) {
  const [selectedGift, setSelectedGift] = useState<GiftOption | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const { t, language } = useLocale();
  const _isKo = language === 'ko';

  // 모달 열림 애니메이션
  useEffect(() => {
    if (visible) {
      setSelectedGift(null);
      setShowSuccess(false);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
      successAnim.setValue(0);
    }
  }, [visible, scaleAnim, successAnim]);

  // 선물 보내기
  const handleSendGift = useCallback(async () => {
    if (!guruId || !selectedGift || isSending) return;

    setIsSending(true);
    try {
      await onGift(guruId, selectedGift.cost, selectedGift.friendshipGain);
      setShowSuccess(true);
      Animated.spring(successAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();

      // 2초 후 자동 닫기
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      // 에러 처리는 상위에서 관리
    } finally {
      setIsSending(false);
    }
  }, [guruId, selectedGift, isSending, onGift, onClose, successAnim]);

  if (!guruId) return null;

  const config = GURU_CHARACTER_CONFIGS[guruId];
  if (!config) return null;

  const guruName = getGuruDisplayName(guruId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* 성공 화면 */}
              {showSuccess ? (
                <Animated.View
                  style={[
                    styles.successContainer,
                    { opacity: successAnim, transform: [{ scale: successAnim }] },
                  ]}
                >
                  <CharacterAvatar guruId={guruId} size="lg" expression="bullish" animated />
                  <Text style={[styles.successEmoji]}>
                    {'\uD83C\uDF89'}
                  </Text>
                  <Text style={[styles.successText, { color: colors.textPrimary }]}>
                    {t('guruGift.delighted', { name: guruName })}
                  </Text>
                  <Text style={[styles.successSubtext, { color: colors.textSecondary }]}>
                    {t('guruGift.thankYou')}
                  </Text>
                </Animated.View>
              ) : (
                <>
                  {/* 구루 아바타 & 이름 */}
                  <View style={styles.headerSection}>
                    <CharacterAvatar guruId={guruId} size="lg" expression="bullish" animated />
                    <Text style={[styles.guruName, { color: colors.textPrimary }]}>
                      {config.emoji} {guruName}
                    </Text>
                    <Text style={[styles.title, { color: colors.textSecondary }]}>
                      {t('guruGift.title')}
                    </Text>
                  </View>

                  {/* 우정 혜택 안내 */}
                  <View style={[styles.benefitBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                    <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                      {t('guruGift.benefit')}
                    </Text>
                  </View>

                  {/* 선물 옵션 목록 */}
                  <View style={styles.giftList}>
                    {GIFT_OPTIONS.map((gift) => {
                      const isSelected = selectedGift?.id === gift.id;
                      return (
                        <TouchableOpacity
                          key={gift.id}
                          style={[
                            styles.giftRow,
                            {
                              backgroundColor: isSelected
                                ? colors.primary + '20'
                                : colors.surfaceElevated || colors.background,
                              borderColor: isSelected
                                ? colors.primary
                                : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedGift(gift)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                          <View style={styles.giftInfo}>
                            <Text style={[styles.giftName, { color: colors.textPrimary }]}>
                              {t(`guruGift.gift_${gift.id}`)}
                            </Text>
                            <Text style={[styles.giftMeta, { color: colors.textTertiary }]}>
                              {t('guruGift.friendshipGain', { amount: gift.friendshipGain })}
                            </Text>
                          </View>
                          <Text style={[styles.giftCost, { color: colors.primary }]}>
                            {gift.cost}C
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* 보내기 버튼 */}
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: selectedGift ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={handleSendGift}
                    disabled={!selectedGift || isSending}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sendButtonText}>
                      {isSending
                        ? t('guruGift.sending')
                        : selectedGift
                          ? t('guruGift.sendWithCost', { cost: selectedGift.cost })
                          : t('guruGift.selectGift')}
                    </Text>
                  </TouchableOpacity>

                  {/* 닫기 버튼 */}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>
                      {t('common.close')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default GuruGiftModal;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  card: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  guruName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  title: {
    fontSize: 14,
    marginTop: 4,
  },
  giftList: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  giftEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  giftInfo: {
    flex: 1,
  },
  giftName: {
    fontSize: 15,
    fontWeight: '600',
  },
  giftMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  giftCost: {
    fontSize: 16,
    fontWeight: '700',
  },
  sendButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 14,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successEmoji: {
    fontSize: 48,
    marginTop: 16,
  },
  successText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  benefitBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  benefitText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
