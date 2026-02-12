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

// ============================================================================
// 알림 종류별 설정 데이터
// ============================================================================

interface NotificationItem {
  key: keyof Omit<NotificationSettings, 'pushEnabled'>;
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
      '앱을 열면 전일 대비 ±5% 이상 변동한 종목을 하이라이트',
      '기준: 하루 동안 5% 이상 오르거나 내린 보유 종목',
      '예) 삼성전자가 어제 -6.2% 하락 → 확인 필요 알림',
    ],
  },
  {
    key: 'marketNews',
    icon: '☀️',
    label: '아침 시장 브리핑',
    summary: 'AI가 분석한 오늘의 시장 동향을 매일 받아보세요',
    details: [
      '매일 아침 8시에 AI CFO 브리핑 알림',
      'AI가 전날 시장 데이터를 분석하여 핵심 정보를 정리',
      '금리/환율/주요 지수 변동 + 포트폴리오 처방전 포함',
    ],
  },
];

export default function NotificationsScreen() {
  const { colors } = useTheme();
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
  const updateSetting = useCallback(
    async (key: keyof NotificationSettings, value: boolean) => {
      const newSettings = { ...settings, [key]: value };

      // 마스터 토글 끄면 하위도 모두 끔 (UI 정합성)
      if (key === 'pushEnabled' && !value) {
        newSettings.rebalanceAlert = false;
        newSettings.priceAlert = false;
        newSettings.marketNews = false;
      }

      setSettings(newSettings);
      setSyncing(true);

      // AsyncStorage 저장 + 알림 스케줄 동기화
      await saveNotificationSettings(newSettings);
      await syncNotificationSchedule(newSettings);

      setSyncing(false);
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
        title="알림 설정"
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
              onValueChange={(v) => updateSetting('pushEnabled', v)}
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
                    onValueChange={(v) => updateSetting(item.key, v)}
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
    fontSize: 17,
    fontWeight: '700',
  },
  masterDesc: {
    fontSize: 13,
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
    fontSize: 12,
    flex: 1,
  },

  // 개별 알림 섹션
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
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
    fontSize: 22,
    marginRight: 12,
  },
  itemTitleInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSummary: {
    fontSize: 13,
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
    fontSize: 12,
    marginRight: 6,
    marginTop: 1,
  },
  detailText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
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
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
