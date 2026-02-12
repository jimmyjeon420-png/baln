/**
 * ContextLayerCard - 맥락 카드 개별 레이어 컴포넌트
 *
 * 역할: 맥락 카드의 각 레이어(역사적/거시경제/기관행동/포트폴리오)를 아코디언으로 표시
 * 비유: 서랍장의 각 칸 — 탭하면 내용이 펼쳐지고, 다시 탭하면 접힌다
 *
 * - 아코디언(접기/펼치기): LayoutAnimation 사용
 * - Premium 잠금: 자물쇠 아이콘 + 블러 효과
 * - 다크/라이트 모드: useTheme() 훅으로 대응
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ============================================================================
// Android LayoutAnimation 활성화
// ============================================================================

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// Props 인터페이스
// ============================================================================

export interface ContextLayerCardProps {
  /** 레이어 아이콘 (Ionicons 이름) */
  icon: keyof typeof Ionicons.glyphMap;
  /** 레이어 제목 */
  title: string;
  /** 레이어 강조 색상 */
  color: string;
  /** 레이어 내용 (React 노드) */
  children: React.ReactNode;
  /** Premium 잠금 여부 */
  isLocked?: boolean;
  /** Premium 구매 버튼 핸들러 */
  onPressPremium?: () => void;
  /** 초기 펼침 상태 (기본: false) */
  initiallyExpanded?: boolean;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function ContextLayerCard({
  icon,
  title,
  color,
  children,
  isLocked = false,
  onPressPremium,
  initiallyExpanded = false,
}: ContextLayerCardProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  // 아코디언 토글
  const toggleExpand = () => {
    if (isLocked) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={[s.container, { borderColor: colors.border }]}>
      {/* 레이어 헤더 (탭 영역) */}
      <TouchableOpacity
        style={s.header}
        onPress={isLocked ? onPressPremium : toggleExpand}
        activeOpacity={0.7}
      >
        {/* 좌측: 아이콘 + 제목 */}
        <View style={s.headerLeft}>
          <View style={[s.iconCircle, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>
        </View>

        {/* 우측: 자물쇠 or 화살표 */}
        <View style={s.headerRight}>
          {isLocked ? (
            <View style={s.lockBadge}>
              <Ionicons name="lock-closed" size={14} color={colors.premium.gold} />
              <Text style={[s.lockText, { color: colors.premium.gold }]}>Premium</Text>
            </View>
          ) : (
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textTertiary}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* 잠금 상태: 블러 미리보기 + CTA */}
      {isLocked && (
        <Pressable style={s.lockedContent} onPress={onPressPremium}>
          <View style={s.blurOverlay}>
            <Text style={[s.blurText, { color: colors.textQuaternary }]}>
              Premium 구독으로 전체 내용을 확인하세요
            </Text>
          </View>
          <View style={[s.premiumCTA, { backgroundColor: colors.premium.gold + '15' }]}>
            <Ionicons name="star" size={14} color={colors.premium.gold} />
            <Text style={[s.premiumCTAText, { color: colors.premium.gold }]}>
              Premium으로 잠금 해제
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.premium.gold} />
          </View>
        </Pressable>
      )}

      {/* 펼쳐진 내용 (아코디언) */}
      {!isLocked && isExpanded && (
        <View style={[s.content, { borderTopColor: colors.border }]}>
          {children}
        </View>
      )}
    </View>
  );
}

export default ContextLayerCard;

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    marginLeft: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },

  // 자물쇠 뱃지
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 잠금 콘텐츠
  lockedContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  blurOverlay: {
    opacity: 0.4,
    marginBottom: 10,
  },
  blurText: {
    fontSize: 13,
    lineHeight: 20,
  },
  premiumCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  premiumCTAText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // 펼쳐진 내용
  content: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
