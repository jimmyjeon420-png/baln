/**
 * LossAversionCard.tsx - 손실 회피 카드 (해지 방지)
 *
 * 역할: "해지 시도 시 표시되는 아쉬움 카드"
 * - "해지하면 잃게 되는 것들" 시각화
 * - 연속 기록, 누적 크레딧, VIP 접근 손실 표시
 * - 감정적 톤: 공포가 아닌 아쉬움
 * - CTA: "계속 유지하기" (강조) / "그래도 해지" (약화)
 *
 * useTheme()으로 다크/라이트 모드 대응
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatCredits } from '../../utils/formatters';

// ============================================================================
// Props 인터페이스
// ============================================================================

export interface LossAversionCardProps {
  streakDays: number;
  totalCredits: number;
  hasVipAccess: boolean;
  onKeep: () => void;
  onCancel: () => void;
}

// ============================================================================
// 손실 아이템 컴포넌트
// ============================================================================

interface LossItemProps {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  bgColor: string;
}

function LossItem({ icon, iconColor, title, description, bgColor }: LossItemProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.lossItem, { backgroundColor: bgColor }]}>
      <Ionicons name={icon as any} size={22} color={iconColor} />
      <View style={styles.lossItemContent}>
        <Text style={[styles.lossItemTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.lossItemDesc, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function LossAversionCard({
  streakDays,
  totalCredits,
  hasVipAccess,
  onKeep,
  onCancel,
}: LossAversionCardProps) {
  const { colors, shadows } = useTheme();

  // "계속 유지하기" 버튼 스케일 애니메이션
  const keepScale = useRef(new Animated.Value(1)).current;

  const handleKeepPressIn = useCallback(() => {
    Animated.spring(keepScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, [keepScale]);

  const handleKeepPressOut = useCallback(() => {
    Animated.spring(keepScale, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [keepScale]);

  // 손실 항목 구성
  const lossItems: LossItemProps[] = [];

  if (streakDays > 0) {
    lossItems.push({
      icon: 'flame',
      iconColor: colors.warning,
      title: `${streakDays}일 연속 기록이 사라집니다`,
      description:
        streakDays >= 30
          ? '한 달 이상 쌓아온 기록이에요'
          : '꾸준히 쌓아온 소중한 기록이에요',
      bgColor: colors.warning + '08',
    });
  }

  if (totalCredits > 0) {
    lossItems.push({
      icon: 'star',
      iconColor: colors.premium.gold,
      title: `누적 도토리 ${formatCredits(totalCredits)} 소멸`,
      description: '지금까지 모은 도토리가 사라져요',
      bgColor: colors.premium.gold + '08',
    });
  }

  if (hasVipAccess) {
    lossItems.push({
      icon: 'shield-checkmark',
      iconColor: colors.premium.purple,
      title: 'VIP 라운지 접근 불가',
      description: '프리미엄 전용 커뮤니티를 이용할 수 없어요',
      bgColor: colors.premium.purple + '08',
    });
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
    >
      {/* 상단 감정 섹션 */}
      <View style={styles.emotionSection}>
        <Text style={styles.emotionEmoji}>😢</Text>
        <Text style={[styles.emotionTitle, { color: colors.textPrimary }]}>
          이렇게 좋은 기록을{'\n'}포기하시겠어요?
        </Text>
        <Text style={[styles.emotionSubtext, { color: colors.textSecondary }]}>
          해지하면 아래 혜택을 모두 잃게 됩니다
        </Text>
      </View>

      {/* 손실 항목 리스트 */}
      <View style={styles.lossSection}>
        {lossItems.map((item, index) => (
          <LossItem
            key={index}
            icon={item.icon}
            iconColor={item.iconColor}
            title={item.title}
            description={item.description}
            bgColor={item.bgColor}
          />
        ))}

        {/* 기본 손실 항목 (항상 표시) */}
        <LossItem
          icon="analytics"
          iconColor={colors.primary}
          title="AI 진단 3회 → 1회로 축소"
          description="매일 받던 상세 분석이 제한돼요"
          bgColor={colors.primary + '08'}
        />
        <LossItem
          icon="layers"
          iconColor={colors.info}
          title="맥락 카드 기관행동 잠금"
          description="기관 매매 분석을 볼 수 없어요"
          bgColor={colors.info + '08'}
        />
      </View>

      {/* CTA 버튼 영역 */}
      <View style={styles.ctaSection}>
        {/* 계속 유지하기 (강조) */}
        <Animated.View style={{ transform: [{ scale: keepScale }] }}>
          <TouchableOpacity
            style={[styles.keepButton, { backgroundColor: colors.primary }]}
            onPress={onKeep}
            onPressIn={handleKeepPressIn}
            onPressOut={handleKeepPressOut}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={18} color="#FFFFFF" />
            <Text style={styles.keepButtonText}>계속 유지하기</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* 그래도 해지 (약화) */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.5}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textQuaternary }]}>
            그래도 해지할게요
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  // 감정 섹션
  emotionSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emotionEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emotionTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 29,
    marginBottom: 8,
  },
  emotionSubtext: {
    fontSize: 15,
    textAlign: 'center',
  },

  // 손실 항목
  lossSection: {
    gap: 10,
    marginBottom: 24,
  },
  lossItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  lossItemContent: {
    flex: 1,
  },
  lossItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  lossItemDesc: {
    fontSize: 13,
    lineHeight: 17,
  },

  // CTA
  ctaSection: {
    gap: 12,
  },
  keepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  keepButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
