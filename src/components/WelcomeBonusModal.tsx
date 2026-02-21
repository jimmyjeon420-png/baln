/**
 * WelcomeBonusModal - 신규 가입 축하 팝업
 *
 * 역할: "환영 인사 담당"
 * useWelcomeBonus가 보너스를 지급하면 이 모달이 표시됩니다.
 * +10 크레딧 지급을 시각적으로 알려주고, 온보딩 기대감을 높입니다.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { formatCredits } from '../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WelcomeBonusModalProps {
  visible: boolean;
  creditsEarned: number;
  onDismiss: () => void;
}

export default function WelcomeBonusModal({
  visible,
  creditsEarned,
  onDismiss,
}: WelcomeBonusModalProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 팝업 등장 애니메이션
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 12,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // 8초 후 자동 닫기
      const timer = setTimeout(onDismiss, 8000);
      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[s.overlay, { opacity: opacityAnim }]}>
      <Animated.View style={[s.card, { backgroundColor: colors.surfaceLight, transform: [{ scale: scaleAnim }] }]}>
        <Text style={s.emoji}>{'🎉'}</Text>
        <Text style={[s.title, { color: colors.textPrimary }]}>환영합니다!</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>bal<Text style={{ color: colors.primary }}>n</Text>과 함께 투자 기준을 만들어보세요</Text>

        <View style={s.bonusRow}>
          <Text style={[s.bonusLabel, { color: colors.textSecondary }]}>환영 보너스</Text>
          <Text style={[s.bonusAmount, { color: colors.primary }]}>+{formatCredits(creditsEarned)}</Text>
        </View>

        <Text style={[s.hint, { color: colors.textTertiary }]}>
          크레딧은 AI 분석, 프리미엄 체험 등에 사용할 수 있어요
        </Text>

        <TouchableOpacity style={[s.button, { backgroundColor: colors.primary }]} onPress={onDismiss} activeOpacity={0.8}>
          <Text style={s.buttonText}>시작하기</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  card: {
    width: SCREEN_WIDTH - 64,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 23,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
  },
  bonusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  bonusAmount: {
    fontSize: 23,
    fontWeight: '800',
  },
  hint: {
    fontSize: 13,
    marginBottom: 24,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
