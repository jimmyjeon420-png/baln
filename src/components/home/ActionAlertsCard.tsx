import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../../styles/theme';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

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

// ============================================================================
// ActionAlertsCard — 핵심 알림 카드 (긴급 알림 대시보드 역할)
// ============================================================================

const ActionAlertsCard = ({
  alerts,
  onPressCTA,
  isLoading,
}: ActionAlertsCardProps) => {
  const { colors } = useTheme();
  const { t } = useLocale();

  // 타입별 색상 (테마 동적)
  const alertColors: Record<AlertItem['type'], string> = {
    danger: colors.error,
    warning: '#FFB74D',
    opportunity: colors.primary,
  };

  if (isLoading) return null;

  // 알림 0건 → 안정 상태 표시
  if (alerts.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.calmState}>
          <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
          <Text style={[styles.calmTitle, { color: colors.textPrimary }]}>{t('common_ui.alerts.portfolio_stable_title')}</Text>
          <Text style={[styles.calmDesc, { color: colors.textSecondary }]}>{t('common_ui.alerts.portfolio_stable_desc')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('common_ui.alerts.alerts_title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Action Alerts</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={[styles.countText, { color: colors.error }]}>{t('common_ui.alerts.alerts_count', { count: alerts.length })}</Text>
        </View>
      </View>

      {/* 알림 리스트 */}
      <View style={[styles.alertList, { backgroundColor: colors.background }]}>
        {alerts.map((alert, index) => (
          <View
            key={index}
            style={[
              styles.alertRow,
              index > 0 && [styles.alertRowBorder, { borderTopColor: colors.borderLight }],
            ]}
          >
            {/* 왼쪽 색상 바 */}
            <View style={[styles.colorBar, { backgroundColor: alertColors[alert.type] }]} />
            <Text style={styles.alertIcon}>{alert.icon}</Text>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: colors.textPrimary }]} numberOfLines={1}>{alert.title}</Text>
              <Text style={[styles.alertSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{alert.subtitle}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA 버튼 */}
      <TouchableOpacity style={styles.ctaBtn} onPress={onPressCTA} activeOpacity={0.7}>
        <Text style={[styles.ctaText, { color: colors.primary }]}>{t('common_ui.alerts.view_prescription')}</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
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
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: 'rgba(207,102,121,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertList: {
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
  },
  colorBar: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  alertIcon: {
    fontSize: 19,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  alertSubtitle: {
    fontSize: 13,
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
    fontSize: 15,
    fontWeight: '700',
  },
  // Calm state (알림 0건)
  calmState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  calmTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  calmDesc: {
    fontSize: 14,
    marginTop: 4,
  },
});
