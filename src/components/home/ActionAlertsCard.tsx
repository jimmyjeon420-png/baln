import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../styles/theme';

// ============================================================================
// 타입 정의
// ============================================================================

export interface AlertItem {
  type: 'danger' | 'warning' | 'opportunity';
  icon: string;
  title: string;
  subtitle: string;
}

interface ActionAlertsCardProps {
  alerts: AlertItem[];
  onPressCTA: () => void;
  isLoading: boolean;
}

// 타입별 색상
const ALERT_COLORS: Record<AlertItem['type'], string> = {
  danger: COLORS.error,      // #CF6679
  warning: '#FFB74D',
  opportunity: COLORS.primary, // #4CAF50
};

// ============================================================================
// ActionAlertsCard — 핵심 알림 카드 (긴급 알림 대시보드 역할)
// ============================================================================

const ActionAlertsCard = ({
  alerts,
  onPressCTA,
  isLoading,
}: ActionAlertsCardProps) => {
  if (isLoading) return null;

  // 알림 0건 → 안정 상태 표시
  if (alerts.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.calmState}>
          <Ionicons name="checkmark-circle" size={32} color={COLORS.primary} />
          <Text style={styles.calmTitle}>포트폴리오가 안정적이에요</Text>
          <Text style={styles.calmDesc}>현재 긴급한 알림이 없습니다</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>주의 알림</Text>
          <Text style={styles.subtitle}>Action Alerts</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{alerts.length}건</Text>
        </View>
      </View>

      {/* 알림 리스트 */}
      <View style={styles.alertList}>
        {alerts.map((alert, index) => (
          <View
            key={index}
            style={[
              styles.alertRow,
              index > 0 && styles.alertRowBorder,
            ]}
          >
            {/* 왼쪽 색상 바 */}
            <View style={[styles.colorBar, { backgroundColor: ALERT_COLORS[alert.type] }]} />
            <Text style={styles.alertIcon}>{alert.icon}</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle} numberOfLines={1}>{alert.title}</Text>
              <Text style={styles.alertSubtitle} numberOfLines={1}>{alert.subtitle}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA 버튼 */}
      <TouchableOpacity style={styles.ctaBtn} onPress={onPressCTA} activeOpacity={0.7}>
        <Text style={styles.ctaText}>처방전 보기</Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// React.memo 최적화: alerts 배열과 isLoading 비교 (onPressCTA는 함수 참조만 확인)
// ============================================================================

export default React.memo(ActionAlertsCard, (prev, next) => {
  // isLoading 상태 비교
  if (prev.isLoading !== next.isLoading) return false;

  // alerts 배열 길이 비교
  if (prev.alerts.length !== next.alerts.length) return false;

  // 각 alert 항목 비교
  const alertsEqual = prev.alerts.every((alert, i) => {
    const nextAlert = next.alerts[i];
    return (
      alert.type === nextAlert.type &&
      alert.icon === nextAlert.icon &&
      alert.title === nextAlert.title &&
      alert.subtitle === nextAlert.subtitle
    );
  });

  // onPressCTA 함수 참조 비교 (보통 부모에서 useCallback으로 메모이제이션됨)
  return alertsEqual && prev.onPressCTA === next.onPressCTA;
});

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rXl,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: 'rgba(207,102,121,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.error,
  },
  alertList: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  alertRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  colorBar: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  alertIcon: {
    fontSize: 18,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  alertSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Calm state (알림 0건)
  calmState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  calmTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  calmDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
