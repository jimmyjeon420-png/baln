/**
 * DisclaimerBanner — 금융 면책 고지 배너 컴포넌트
 *
 * 투자 관련 법적 면책 사항을 표시하는 재사용 가능한 배너.
 * 유형별(warning/info/legal) 다른 색상 테마를 적용합니다.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';

/** 배너 유형: warning(경고), info(안내), legal(법적 고지) */
export type DisclaimerType = 'warning' | 'info' | 'legal';

export interface DisclaimerBannerProps {
  /** 표시할 면책 메시지 */
  message: string;
  /** 배너 유형 (기본값: 'legal') */
  type?: DisclaimerType;
  /** 닫기(X) 버튼 표시 여부 (기본값: false) */
  dismissible?: boolean;
  /** 닫기 버튼 클릭 시 콜백 */
  onDismiss?: () => void;
  /** 추가 스타일 */
  style?: ViewStyle;
}

/** 유형별 색상 테마 */
const TYPE_COLORS: Record<DisclaimerType, { border: string; background: string; text: string; icon: string }> = {
  warning: {
    border: '#F59E0B',       // amber/yellow 계열
    background: '#F59E0B1A', // 10% opacity
    text: '#FBBF24',         // amber-400 (밝은 amber)
    icon: '#F59E0B',
  },
  info: {
    border: '#3B82F6',       // blue 계열
    background: '#3B82F61A', // 10% opacity
    text: '#93C5FD',         // blue-300 (밝은 blue)
    icon: '#3B82F6',
  },
  legal: {
    border: '#6B7280',       // gray 계열
    background: '#6B72801A', // 10% opacity
    text: '#9CA3AF',         // gray-400 (밝은 gray)
    icon: '#6B7280',
  },
};

/** 유형별 아이콘 문자 */
const TYPE_ICONS: Record<DisclaimerType, string> = {
  warning: '\u26A0\uFE0F',  // warning sign
  info: '\u2139\uFE0F',     // information
  legal: '\u2696\uFE0F',    // scales (법적 저울)
};

export default function DisclaimerBanner({
  message,
  type = 'legal',
  dismissible = false,
  onDismiss,
  style,
}: DisclaimerBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible || !message) return null;

  const colors = TYPE_COLORS[type];
  const icon = TYPE_ICONS[type];

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.border,
          backgroundColor: colors.background,
        },
        style,
      ]}
      accessibilityRole={type === 'warning' ? 'alert' : 'summary'}
      accessibilityLabel={message}
    >
      <View style={styles.contentRow}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        {dismissible && (
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="닫기"
            accessibilityRole="button"
          >
            <Text style={[styles.closeText, { color: colors.icon }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 1,
  },
  message: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  closeButton: {
    marginLeft: 8,
    paddingLeft: 4,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
