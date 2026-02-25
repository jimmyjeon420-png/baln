/**
 * 알림 설정 화면
 *
 * [역할] 회사의 "커뮤니케이션 관리 부서"
 * - 어떤 종류의 알림을 받을지 사용자가 선택
 * - 각 알림의 발송 시간과 기준을 명확히 설명
 * - 토글 상태를 AsyncStorage에 저장 (앱 종료 후에도 유지)
 * - 토글 변경 즉시 알림 스케줄에 반영
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  loadNotificationSettings,
  saveNotificationSettings,
  syncNotificationSchedule,
  type NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../../src/services/notifications';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useLocale } from '../../src/context/LocaleContext';

// ============================================================================
// 알림 종류별 설정 데이터
// ============================================================================

interface NotificationItem {
  key: 'rebalanceAlert' | 'priceAlert' | 'marketNews';
  icon: string;
  label: string;
  /** 한줄 요약 */
  summary: string;
  /** 상세 설명: 언제 + 어떤 기준으로 + 무엇을 알려주는지 */
  details: string[];
}

const PRICE_THRESHOLD_OPTIONS = [3, 5, 7];
const WEEKLY_CAP_OPTIONS = [3, 5, 7];

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();

  // 알림 항목: t() 호출이 필요하므로 컴포넌트 내부에서 정의
  const NOTIFICATION_ITEMS: NotificationItem[] = [
    {
      key: 'rebalanceAlert',
      icon: '⚖️',
      label: t('settings.notifications.rebalance_label'),
      summary: t('settings.notifications.rebalance_summary'),
      details: [
        t('settings.notifications.rebalance_detail_1'),
        t('settings.notifications.rebalance_detail_2'),
        t('settings.notifications.rebalance_detail_3'),
      ],
    },
    {
      key: 'priceAlert',
      icon: '📊',
      label: t('settings.notifications.price_label'),
      summary: t('settings.notifications.price_summary'),
      details: [
        t('settings.notifications.price_detail_1'),
        t('settings.notifications.price_detail_2'),
        t('settings.notifications.price_detail_3'),
        t('settings.notifications.price_detail_4'),
      ],
    },
    {
      key: 'marketNews',
      icon: '☀️',
      label: t('settings.notifications.morning_briefing'),
      summary: t('settings.notifications.market_summary'),
      details: [
        t('settings.notifications.market_detail_1'),
        t('settings.notifications.market_detail_2'),
        t('settings.notifications.market_detail_3'),
      ],
    },
  ];
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // 앱 진입 시 저장된 설정 불러오기
  useEffect(() => {
    (async () => {
      const saved = await loadNotificationSettings();
      setSettings(saved);
      setLoading(false);
    })();
  }, []);

  // 설정 변경 핸들러: 저장 + 스케줄 동기화
  const updateToggleSetting = useCallback(
    async (key: 'pushEnabled' | 'rebalanceAlert' | 'priceAlert' | 'marketNews', value: boolean) => {
      const newSettings = { ...settings, [key]: value };

      // 마스터 토글 끄면 하위도 모두 끔 (UI 정합성)
      if (key === 'pushEnabled' && !value) {
        newSettings.rebalanceAlert = false;
        newSettings.priceAlert = false;
        newSettings.marketNews = false;
      }

      setSettings(newSettings);
      setSyncing(true);

      try {
        // AsyncStorage 저장 + 알림 스케줄 동기화
        await saveNotificationSettings(newSettings);
        await syncNotificationSchedule(newSettings);
      } finally {
        setSyncing(false);
      }
    },
    [settings]
  );

  const updateNumericSetting = useCallback(
    async (key: 'priceAlertThreshold' | 'weeklyNotificationCap', value: number) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      setSyncing(true);

      try {
        await saveNotificationSettings(newSettings);
        await syncNotificationSchedule(newSettings);
      } finally {
        setSyncing(false);
      }
    },
    [settings]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title={t('settings.notifications.title')}
        rightElement={syncing ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 마스터 토글 */}
        <View style={[styles.masterSection, { backgroundColor: colors.surface }]}>
          <View style={styles.masterRow}>
            <View style={styles.masterInfo}>
              <Text style={[styles.masterLabel, { color: colors.textPrimary }]}>{t('settings.notifications.push_title')}</Text>
              <Text style={[styles.masterDesc, { color: colors.textSecondary }]}>
                {t('settings.notifications.push_desc')}
              </Text>
            </View>
            <Switch
              value={settings.pushEnabled}
              onValueChange={(v) => updateToggleSetting('pushEnabled', v)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings.pushEnabled ? colors.textPrimary : colors.textTertiary}
            />
          </View>

          {!settings.pushEnabled && (
            <View style={styles.masterOffBanner}>
              <Ionicons name="notifications-off-outline" size={16} color={colors.error} />
              <Text style={[styles.masterOffText, { color: colors.error }]}>
                {t('settings.notifications.push_off_warning')}
              </Text>
            </View>
          )}
        </View>

        {/* 개별 알림 토글 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.notifications.section_types')}</Text>

          {NOTIFICATION_ITEMS.map((item, index) => {
            const isEnabled = settings[item.key];
            const isDisabled = !settings.pushEnabled;

            return (
              <View
                key={item.key}
                style={[
                  styles.itemCard,
                  index < NOTIFICATION_ITEMS.length - 1 && [styles.itemCardBorder, { borderBottomColor: colors.border }],
                  isDisabled && styles.itemCardDisabled,
                ]}
              >
                {/* 상단: 아이콘 + 라벨 + 토글 */}
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <View style={styles.itemTitleInfo}>
                      <Text
                        style={[
                          styles.itemLabel,
                          { color: colors.textPrimary },
                          isDisabled && styles.textDisabled,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.itemSummary,
                          { color: colors.textSecondary },
                          isDisabled && styles.textDisabled,
                        ]}
                      >
                        {item.summary}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isEnabled}
                    onValueChange={(v) => updateToggleSetting(item.key, v)}
                    disabled={isDisabled}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={isEnabled && !isDisabled ? colors.textPrimary : colors.textTertiary}
                  />
                </View>

                {/* 하단: 상세 설명 */}
                <View style={[styles.detailsWrap, { backgroundColor: `${colors.primary}0D` }]}>
                  {item.details.map((detail, i) => (
                    <View key={i} style={styles.detailRow}>
                      <Text style={[styles.detailDot, { color: colors.primary }, isDisabled && styles.textDisabled]}>
                        •
                      </Text>
                      <Text
                        style={[
                          styles.detailText,
                          { color: colors.textSecondary },
                          isDisabled && styles.textDisabled,
                        ]}
                      >
                        {detail}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* 알림 강도 설정 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.notifications.section_intensity')}</Text>

          <View style={styles.controlCard}>
            <Text style={[styles.controlTitle, { color: colors.textPrimary }]}>{t('settings.notifications.price_threshold_title')}</Text>
            <Text style={[styles.controlDesc, { color: colors.textSecondary }]}>
              {t('settings.notifications.price_threshold_desc')}
            </Text>
            <View style={styles.optionRow}>
              {PRICE_THRESHOLD_OPTIONS.map((option) => {
                const selected = settings.priceAlertThreshold === option;
                const disabled = !settings.pushEnabled || !settings.priceAlert;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      { borderColor: selected ? colors.primary : colors.border },
                      selected && { backgroundColor: `${colors.primary}20` },
                      disabled && styles.optionDisabled,
                    ]}
                    disabled={disabled}
                    onPress={() => updateNumericSetting('priceAlertThreshold', option)}
                  >
                    <Text style={[styles.optionText, { color: selected ? colors.primary : colors.textSecondary }]}>
                      ±{option}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.controlCard, styles.controlCardBorder, { borderTopColor: colors.border }]}>
            <Text style={[styles.controlTitle, { color: colors.textPrimary }]}>{t('settings.notifications.weekly_cap_title')}</Text>
            <Text style={[styles.controlDesc, { color: colors.textSecondary }]}>
              {t('settings.notifications.weekly_cap_desc')}
            </Text>
            <View style={styles.optionRow}>
              {WEEKLY_CAP_OPTIONS.map((option) => {
                const selected = settings.weeklyNotificationCap === option;
                const disabled = !settings.pushEnabled;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      { borderColor: selected ? colors.primary : colors.border },
                      selected && { backgroundColor: `${colors.primary}20` },
                      disabled && styles.optionDisabled,
                    ]}
                    disabled={disabled}
                    onPress={() => updateNumericSetting('weeklyNotificationCap', option)}
                  >
                    <Text style={[styles.optionText, { color: selected ? colors.primary : colors.textSecondary }]}>
                      {t('settings.notifications.weekly_cap_unit', { n: option })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* 안내 정보 */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              {t('settings.notifications.info_permission')}
            </Text>
          </View>
          <View style={[styles.infoRow, { marginTop: 8 }]}>
            <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              {t('settings.notifications.info_timing')}
            </Text>
          </View>
          <View style={[styles.infoRow, { marginTop: 8 }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              {t('settings.notifications.info_current_settings', { threshold: settings.priceAlertThreshold, cap: settings.weeklyNotificationCap })}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // 마스터 토글
  masterSection: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  masterInfo: {
    flex: 1,
    marginRight: 12,
  },
  masterLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  masterDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  masterOffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(207, 102, 121, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  masterOffText: {
    fontSize: 13,
    flex: 1,
  },

  // 개별 알림 섹션
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // 개별 알림 카드
  itemCard: {
    padding: 16,
  },
  itemCardBorder: {
    borderBottomWidth: 1,
  },
  itemCardDisabled: {
    opacity: 0.4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  itemIcon: {
    fontSize: 23,
    marginRight: 12,
  },
  itemTitleInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  itemSummary: {
    fontSize: 14,
    marginTop: 2,
  },

  // 상세 설명
  detailsWrap: {
    marginTop: 12,
    marginLeft: 34, // 아이콘 너비만큼 들여쓰기
    borderRadius: 8,
    padding: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailDot: {
    fontSize: 13,
    marginRight: 6,
    marginTop: 1,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  controlCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  controlCardBorder: {
    borderTopWidth: 1,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  controlDesc: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 18,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionDisabled: {
    opacity: 0.4,
  },

  // 비활성화 텍스트
  textDisabled: {
    opacity: 0.4,
  },

  // 하단 안내
  infoSection: {
    borderRadius: 12,
    padding: 14,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
});
