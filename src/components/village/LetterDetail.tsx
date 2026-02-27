/**
 * LetterDetail — 개별 편지 상세 뷰
 *
 * 역할: "편지 열어보기" — 구루가 보낸 편지를 마치 실제 종이 편지처럼 표시
 * 비유: "동물의숲 편지 읽기 화면" — 양피지 느낌의 배경 + 타이핑 효과
 *
 * 기능:
 * - 양피지/편지지 스타일 배경 (약간 노란빛)
 * - 구루 아바타 + 보낸이 정보 헤더
 * - 본문 타이핑 애니메이션
 * - 첨부 선물 표시 (하단 카드)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  SafeAreaView,
} from 'react-native';
import type { GuruLetter } from '../../types/village';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import { useLocale } from '../../context/LocaleContext';

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

interface LetterDetailProps {
  letter: GuruLetter | null;
  onClose: () => void;
  isVisible: boolean;
  colors: any;
  locale?: string;
}

// ---------------------------------------------------------------------------
// 날짜 포맷 헬퍼
// ---------------------------------------------------------------------------

function formatDate(timestamp: string, locale: string): string {
  const d = new Date(timestamp);
  if (locale === 'ko') {
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// 타이핑 애니메이션 훅
// ---------------------------------------------------------------------------

function useTypewriter(text: string, isVisible: boolean, speed: number = 18) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isVisible || !text) {
      setDisplayed('');
      indexRef.current = 0;
      return;
    }

    // 짧은 지연 후 시작 (모달 열리는 애니메이션 이후)
    const startDelay = setTimeout(() => {
      indexRef.current = 0;
      setDisplayed('');

      const tick = () => {
        if (indexRef.current < text.length) {
          indexRef.current++;
          setDisplayed(text.slice(0, indexRef.current));
          timerRef.current = setTimeout(tick, speed);
        }
      };
      tick();
    }, 400);

    return () => {
      clearTimeout(startDelay);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, isVisible, speed]);

  return displayed;
}

// ---------------------------------------------------------------------------
// 메인 컴포넌트
// ---------------------------------------------------------------------------

export function LetterDetail({
  letter,
  onClose,
  isVisible,
  colors,
  locale = 'ko',
}: LetterDetailProps) {
  const isKo = locale === 'ko';

  // 카드 슬라이드-인 애니메이션
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(60);
      fadeAnim.setValue(0);
    }
  }, [isVisible, slideAnim, fadeAnim]);

  if (!letter) return null;

  const guruId = letter.fromGuruId || letter.guruId || '';
  const config = GURU_CHARACTER_CONFIGS[guruId];
  const guruName = getGuruDisplayName(guruId);
  const subject = isKo ? letter.subject : (letter.subjectEn ?? letter.subject);
  const bodyText = isKo ? letter.body : (letter.bodyEn ?? letter.body);

  return (
    <LetterDetailInner
      letter={letter}
      guruId={guruId}
      guruName={guruName}
      subject={subject}
      bodyText={bodyText}
      isVisible={isVisible}
      onClose={onClose}
      colors={colors}
      isKo={isKo}
      slideAnim={slideAnim}
      fadeAnim={fadeAnim}
      locale={locale}
    />
  );
}

// ---------------------------------------------------------------------------
// 내부 렌더링 컴포넌트 (애니메이션 분리)
// ---------------------------------------------------------------------------

interface InnerProps {
  letter: GuruLetter;
  guruId: string;
  guruName: string;
  subject: string;
  bodyText: string;
  isVisible: boolean;
  onClose: () => void;
  colors: any;
  isKo: boolean;
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  locale: string;
}

function LetterDetailInner({
  letter,
  guruId,
  guruName,
  subject,
  bodyText,
  isVisible,
  onClose,
  colors,
  isKo,
  slideAnim,
  fadeAnim,
  locale,
}: InnerProps) {
  const { t } = useLocale();
  // 타이핑 애니메이션 (본문)
  const displayedBody = useTypewriter(bodyText, isVisible, 16);

  // 양피지 배경색: 다크 모드에서 약간 따뜻한 톤, 라이트 모드에서 크림색
  const parchmentBg = colors.background === '#0D1B2A'
    ? '#1A2535'   // 다크: 약간 따뜻한 네이비
    : '#FDF8EE';  // 라이트: 크림색 양피지

  const parchmentBorder = colors.background === '#0D1B2A'
    ? '#2A3F55'
    : '#E8D8B0';

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* 닫기 핸들 (상단 중앙 바) */}
        <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.letterCard,
              {
                backgroundColor: parchmentBg,
                borderColor: parchmentBorder,
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            {/* 편지지 상단 장식 줄 */}
            <View style={[styles.decorLine, { backgroundColor: parchmentBorder }]} />

            {/* 보낸 이 헤더 */}
            <View style={styles.senderHeader}>
              <CharacterAvatar guruId={guruId} size="md" />
              <View style={styles.senderInfo}>
                <Text style={[styles.fromLabel, { color: colors.textTertiary }]}>
                  {t('village.letter.from_label')}
                </Text>
                <Text style={[styles.senderName, { color: colors.textPrimary }]}>
                  {guruName}
                </Text>
                <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                  {formatDate(letter.timestamp, locale)}
                </Text>
              </View>
            </View>

            {/* 구분선 */}
            <View style={[styles.divider, { backgroundColor: parchmentBorder }]} />

            {/* 제목 */}
            <Text style={[styles.subject, { color: colors.textPrimary }]}>
              {subject}
            </Text>

            {/* 본문 (타이핑 애니메이션) */}
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {displayedBody}
              {/* 타이핑 커서 (완성 전에만 표시) */}
              {displayedBody.length < bodyText.length && (
                <Text style={{ color: colors.primary }}>|</Text>
              )}
            </Text>

            {/* 편지지 하단 장식 줄 */}
            <View style={[styles.decorLine, { backgroundColor: parchmentBorder, marginTop: 24 }]} />
          </Animated.View>

          {/* 첨부 선물 카드 */}
          {letter.attachedItem && (
            <Animated.View
              style={[
                styles.giftCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.premium.gold + '50',
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.giftEmoji}>🎁</Text>
              <View style={styles.giftTextWrapper}>
                <Text style={[styles.giftLabel, { color: colors.textTertiary }]}>
                  {t('village.letter.attached_gift_label')}
                </Text>
                <Text style={[styles.giftItem, { color: colors.premium.gold }]}>
                  {letter.attachedItem}
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* 닫기 버튼 */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>
              {t('village.letter.close_button')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 스타일
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  letterCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#8B7355',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  decorLine: {
    height: 1,
    borderRadius: 1,
    marginBottom: 20,
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  senderInfo: {
    flex: 1,
    gap: 2,
  },
  fromLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  senderName: {
    fontSize: 17,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  subject: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  giftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  giftEmoji: {
    fontSize: 32,
  },
  giftTextWrapper: {
    flex: 1,
    gap: 3,
  },
  giftLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  giftItem: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  closeButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
