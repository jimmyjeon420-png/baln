/**
 * NewsToPredictionBridge — 뉴스 → 예측 투표 연결 카드
 *
 * 역할: "광장 안내판" — 뉴스를 읽은 후 관련 예측 질문으로 유도
 * 비유: "이 뉴스를 보고 어떻게 생각하세요?" 투표 부스 안내
 *
 * 기능:
 * - 뉴스 리액션 아래 표시되는 작은 카드
 * - "이 뉴스를 보고 예측해보세요!" 프롬프트
 * - 투표하기 버튼 → 예측 섹션 스크롤/네비게이션
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// Props
// ============================================================================

interface NewsToPredictionBridgeProps {
  newsId: string;
  relatedPollId?: string;
  onNavigate: (pollId?: string) => void;
  colors: {
    surface: string;
    textPrimary: string;
    textSecondary: string;
    primary: string;
    border: string;
  };
}

// ============================================================================
// Component
// ============================================================================

export function NewsToPredictionBridge({
  newsId: _newsId,
  relatedPollId,
  onNavigate,
  colors,
}: NewsToPredictionBridgeProps) {
  const { t } = useLocale();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.leftCol}>
        <Text style={styles.icon}>🔮</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.prompt, { color: colors.textPrimary }]}>{t('newsToPrediction.prompt')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('newsToPrediction.subtitle')}</Text>
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => onNavigate(relatedPollId)}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>{t('newsToPrediction.button')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  leftCol: {
    width: 36,
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  prompt: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
