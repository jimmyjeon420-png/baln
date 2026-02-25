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

const NOTIFICATION_ITEMS: NotificationItem[] = [
  {
    key: 'rebalanceAlert',
    icon: '⚖️',
    label: '리밸런싱 알림',
    summary: '포트폴리오 점검이 필요할 때 알려드려요',
    details: [
      '매주 월요일 오전 9시에 주간 리밸런싱 점검 리마인더',
      '3일 이상 앱을 열지 않으면 포트폴리오 확인 알림',
      '리밸런싱이란? 자산 비율이 원래 목표에서 벗어났을 때 다시 맞추는 것이에요',
    ],
  },
  {
    key: 'priceAlert',
    icon: '📊',
    label: '가격 변동 알림',
    summary: '보유 종목의 큰 가격 변동을 놓치지 마세요',
    details: [
      '매일 아침 7:30에 전일 가격 변동 확인 알림',
      '앱을 열면 설정한 기준(±3/5/7%) 이상 변동한 종목을 하이라이트',
      '기준은 아래 "가격 변동 기준"에서 조정할 수 있어요',
      '예) 기준이 ±5%일 때, 어제 -6.2% 하락 종목은 확인 알림',
    ],
  },
  {
    key: 'marketNews',
    icon: '☀️',
    label: '아침 시장 브리핑',
    summary: 'AI가 분석한 오늘의 시장 동향을 매일 받아보세요',
    details: [
      '매일 아침 8시에 AI 브리핑 알림',
      'AI가 전날 시장 데이터를 분석하여 핵심 정보를 정리',
      '금리/환율/주요 지수 변동 + 포트폴리오 처방전 포함',
    ],
  },
];

/** 알림 항목 key → i18n 번역 키 매핑 */
const NOTIFICATION_LABEL_KEYS: Record<string, string> = {
  rebalanceAlert: '',          // 번역 키 없음 — 하드코딩 유지
  priceAlert: '',               // 번역 키 없음 — 하드코딩 유지
  marketNews: 'settings.notifications.morning_briefing',
};

const PRICE_THRESHOLD_OPTIONS = [3, 5, 7];
const WEEKLY_CAP_OPTIONS = [3, 5, 7];

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
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
              <Text style={[styles.masterLabel, { color: colors.textPrimary }]}>🔔 푸시 알림</Text>
              <Text style={[styles.masterDesc, { color: colors.textSecondary }]}>
                모든 알림을 한 번에 켜거나 끌 수 있어요
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
                알림이 꺼져 있습니다. 중요한 시장 변화를 놓칠 수 있어요.
              </Text>
            </View>
          )}
        </View>

        {/* 개별 알림 토글 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>알림 종류</Text>

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
                        {NOTIFICATION_LABEL_KEYS[item.key]
                          ? t(NOTIFICATION_LABEL_KEYS[item.key])
                          : item.label}
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
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>알림 강도</Text>

          <View style={styles.controlCard}>
            <Text style={[styles.controlTitle, { color: colors.textPrimary }]}>가격 변동 기준</Text>
            <Text style={[styles.controlDesc, { color: colors.textSecondary }]}>
              가격 변동 알림에서 몇 % 이상 움직였을 때 확인할지 설정합니다.
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
            <Text style={[styles.controlTitle, { color: colors.textPrimary }]}>주간 알림 상한</Text>
            <Text style={[styles.controlDesc, { color: colors.textSecondary }]}>
              한 주에 받는 알림 개수를 제한해 알림 피로도를 줄입니다.
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
                      주 {option}회
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
              알림은 휴대폰의 알림 권한이 허용되어 있어야 동작합니다.
              기기 설정에서 bal<Text style={{ color: '#4CAF50' }}>n</Text>의 알림이 켜져 있는지 확인해주세요.
            </Text>
          </View>
          <View style={[styles.infoRow, { marginTop: 8 }]}>
            <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              알림 발송 시간은 기기의 현지 시간 기준입니다.
              가격 변동 알림 7:30 → 아침 브리핑 8:00 → 리밸런싱 점검 9:00(월요일) 순서로 도착합니다.
            </Text>
          </View>
          <View style={[styles.infoRow, { marginTop: 8 }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              현재 설정: 가격 변동 기준 ±{settings.priceAlertThreshold}% · 주간 알림 상한 {settings.weeklyNotificationCap}회
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
