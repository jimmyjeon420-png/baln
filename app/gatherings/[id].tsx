/**
 * 모임 상세 페이지
 * 모임 정보 확인 및 참가 신청
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useGathering,
  useGatheringParticipants,
  useMyParticipation,
  useJoinGathering,
  useCancelParticipation,
  useCurrentUserInfo,
  formatAssetInBillion,
  TIER_COLORS,
  getCommunityTierLabel,
  canAccessTier,
} from '../../src/hooks/useGatherings';
import { GATHERING_CATEGORY_LABELS, UserTier } from '../../src/types/database';
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';
import { t as tStatic } from '../../src/locales';

// 티어 아이콘
const getTierIcon = (tier: UserTier): keyof typeof Ionicons.glyphMap => {
  switch (tier) {
    case 'DIAMOND': return 'diamond';
    case 'PLATINUM': return 'star';
    case 'GOLD': return 'trophy';
    case 'SILVER': return 'medal';
    default: return 'ribbon';
  }
};

// 날짜 포맷팅 (상세)
const formatEventDateFull = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayOfWeek = tStatic(`gatherings.detail.day.${dayKeys[date.getDay()]}`);

  return tStatic('gatherings.detail.dateTimeFull', { year, month, day, dayOfWeek, hours, minutes });
};

// 금액 포맷팅
const formatCurrency = (amount: number): string => {
  if (amount === 0) return tStatic('gatherings.detail.free');
  return tStatic('gatherings.detail.currencyAmount', { amount: amount.toLocaleString() });
};

export default function GatheringDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const { t } = useLocale();
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // 데이터 조회
  const { data: gathering, isLoading: gatheringLoading } = useGathering(id);
  const { data: participants } = useGatheringParticipants(id);
  const { data: myParticipation } = useMyParticipation(id);
  const { data: currentUser } = useCurrentUserInfo();

  // 뮤테이션
  const joinMutation = useJoinGathering();
  const cancelMutation = useCancelParticipation();

  // 티어 기반 접근 제어 (TBAC)
  const requiredTier = gathering?.min_tier_required || 'SILVER';
  const userTier = currentUser?.tier || 'SILVER';
  const canJoinByTier = canAccessTier(userTier, requiredTier);

  // 참가 신청
  const handleJoin = async () => {
    if (!id || !gathering) return;

    // 티어 체크
    if (!canJoinByTier) {
      const requiredLabel = getCommunityTierLabel(requiredTier);
      Alert.alert(
        t('gatherings.detail.alert.cannotJoin'),
        t('gatherings.detail.alert.tierRequired', { required: requiredLabel, current: getCommunityTierLabel(userTier) }),
        [{ text: t('common.confirm') }]
      );
      return;
    }

    // 유료 모임인 경우 결제 확인
    if (gathering.entry_fee > 0) {
      Alert.alert(
        t('gatherings.detail.alert.joinTitle'),
        t('gatherings.detail.alert.joinPaidMessage', { fee: formatCurrency(gathering.entry_fee) }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('gatherings.detail.alert.joinConfirm'),
            onPress: async () => {
              setJoining(true);
              try {
                await joinMutation.mutateAsync(id);
                Alert.alert(t('common.complete'), t('gatherings.detail.alert.joinSuccess'));
              } catch (error: unknown) {
                Alert.alert(t('common.error'), error instanceof Error ? error.message : t('gatherings.detail.alert.joinFailed'));
              } finally {
                setJoining(false);
              }
            },
          },
        ]
      );
    } else {
      setJoining(true);
      try {
        await joinMutation.mutateAsync(id);
        Alert.alert(t('common.complete'), t('gatherings.detail.alert.joinSuccess'));
      } catch (error: unknown) {
        Alert.alert(t('common.error'), error instanceof Error ? error.message : t('gatherings.detail.alert.joinFailed'));
      } finally {
        setJoining(false);
      }
    }
  };

  // 참가 취소
  const handleCancel = async () => {
    if (!id) return;

    Alert.alert(
      t('gatherings.detail.alert.cancelTitle'),
      t('gatherings.detail.alert.cancelMessage'),
      [
        { text: t('gatherings.detail.alert.no'), style: 'cancel' },
        {
          text: t('gatherings.detail.alert.cancelConfirm'),
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelMutation.mutateAsync(id);
              Alert.alert(t('common.complete'), t('gatherings.detail.alert.cancelSuccess'));
            } catch (error: unknown) {
              Alert.alert(t('common.error'), error instanceof Error ? error.message : t('gatherings.detail.alert.cancelFailed'));
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (gatheringLoading || !gathering) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textTertiary }]}>{t('gatherings.detail.loading')}</Text>
      </View>
    );
  }

  const isFull = gathering.current_capacity >= gathering.max_capacity;
  const isParticipant = myParticipation && myParticipation.status !== 'cancelled';
  const canJoin = !isParticipant && !isFull && gathering.status === 'open' && canJoinByTier;
  const isBlockedByTier = !canJoinByTier && !isParticipant;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: themeColors.surface }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('gatherings.detail.headerTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 사기 경고 배너 */}
        {!warningDismissed && (
          <View style={styles.scamWarningBanner}>
            <Ionicons name="shield-half" size={18} color="#FF6B6B" style={{ marginTop: 1 }} />
            <View style={styles.scamWarningContent}>
              <Text style={styles.scamWarningTitle}>{t('gatherings.detail.scamWarning.title')}</Text>
              <Text style={styles.scamWarningText}>
                {t('gatherings.detail.scamWarning.text')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setWarningDismissed(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="#FF6B6B80" />
            </TouchableOpacity>
          </View>
        )}

        {/* 카테고리 & 상태 */}
        <View style={styles.topBadges}>
          <View style={styles.categoryBadge}>
            <Ionicons name="bookmark" size={14} color={themeColors.primary} />
            <Text style={[styles.categoryText, { color: themeColors.primary }]}>
              {GATHERING_CATEGORY_LABELS[gathering.category]}
            </Text>
          </View>
          {isFull && (
            <View style={styles.fullBadge}>
              <Text style={[styles.fullBadgeText, { color: themeColors.error }]}>{t('gatherings.detail.badge.full')}</Text>
            </View>
          )}
          {isParticipant && (
            <View style={[styles.participatingBadge, { backgroundColor: themeColors.primary }]}>
              <Ionicons name="checkmark-circle" size={14} color="#000000" />
              <Text style={styles.participatingBadgeText}>{t('gatherings.detail.badge.participating')}</Text>
            </View>
          )}
        </View>

        {/* 제목 */}
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>{gathering.title}</Text>

        {/* 호스트 정보 카드 */}
        <View style={[styles.hostCard, { backgroundColor: themeColors.surface }]}>
          <View style={styles.hostHeader}>
            <Text style={[styles.sectionLabel, { color: themeColors.textTertiary }]}>{t('gatherings.detail.section.host')}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color={themeColors.primary} />
              <Text style={[styles.verifiedText, { color: themeColors.primary }]}>{t('gatherings.detail.verifiedHost')}</Text>
            </View>
          </View>
          <View style={styles.hostInfo}>
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[gathering.host_tier] }]}>
              <Ionicons name={getTierIcon(gathering.host_tier)} size={16} color="#000000" />
            </View>
            <View style={styles.hostDetails}>
              <Text style={[styles.hostName, { color: themeColors.textPrimary }]}>{gathering.host_display_name || t('gatherings.detail.anonymous')}</Text>
              <Text style={[styles.hostAssets, { color: TIER_COLORS[gathering.host_tier] }]}>
                {t('gatherings.detail.hostAssets', { assets: formatAssetInBillion(gathering.host_verified_assets) })}
              </Text>
            </View>
          </View>
        </View>

        {/* 모임 정보 */}
        <View style={[styles.infoCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionLabel, { color: themeColors.textTertiary }]}>{t('gatherings.detail.section.info')}</Text>

          <View style={[styles.infoRow, { borderBottomColor: themeColors.surfaceLight }]}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar" size={18} color={themeColors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: themeColors.textTertiary }]}>{t('gatherings.detail.info.dateTime')}</Text>
              <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>{formatEventDateFull(gathering.event_date)}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: themeColors.surfaceLight }]}>
            <View style={styles.infoIcon}>
              <Ionicons
                name={gathering.location_type === 'online' ? 'videocam' : 'location'}
                size={18}
                color={themeColors.primary}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: themeColors.textTertiary }]}>{t('gatherings.detail.info.location')}</Text>
              <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>
                {gathering.location_type === 'online' ? t('gatherings.detail.onlineLocationHidden') : gathering.location}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: themeColors.surfaceLight }]}>
            <View style={styles.infoIcon}>
              <Ionicons name="people" size={18} color={themeColors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: themeColors.textTertiary }]}>{t('gatherings.detail.info.participants')}</Text>
              <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>
                <Text style={{ color: isFull ? themeColors.error : themeColors.primary, fontWeight: '700' }}>
                  {gathering.current_capacity}
                </Text>
                /{t('gatherings.detail.capacityUnit', { count: gathering.max_capacity })}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: themeColors.surfaceLight }]}>
            <View style={styles.infoIcon}>
              <Ionicons name="cash" size={18} color={themeColors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: themeColors.textTertiary }]}>{t('gatherings.detail.info.fee')}</Text>
              <Text style={[styles.infoValue, styles.feeValue, { color: themeColors.primary }]}>
                {formatCurrency(gathering.entry_fee)}
              </Text>
            </View>
          </View>

          {/* 최소 입장 조건 (TBAC) */}
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.infoIcon, { backgroundColor: TIER_COLORS[requiredTier] + '20' }]}>
              <Ionicons name={getTierIcon(requiredTier)} size={18} color={TIER_COLORS[requiredTier]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: themeColors.textTertiary }]}>{t('gatherings.detail.info.minTier')}</Text>
              <Text style={[styles.infoValue, { color: TIER_COLORS[requiredTier] }]}>
                {t('gatherings.detail.tierAbove', { tier: getCommunityTierLabel(requiredTier) })}
              </Text>
            </View>
            {canJoinByTier ? (
              <View style={styles.tierCheckBadge}>
                <Ionicons name="checkmark-circle" size={16} color={themeColors.primary} />
              </View>
            ) : (
              <View style={styles.tierBlockBadge}>
                <Ionicons name="lock-closed" size={16} color={themeColors.error} />
              </View>
            )}
          </View>
        </View>

        {/* 티어 제한 경고 */}
        {isBlockedByTier && (
          <View style={styles.tierWarningCard}>
            <Ionicons name="alert-circle" size={20} color={themeColors.warning} />
            <View style={styles.tierWarningContent}>
              <Text style={[styles.tierWarningTitle, { color: themeColors.warning }]}>{t('gatherings.detail.tierWarning.title')}</Text>
              <Text style={[styles.tierWarningText, { color: themeColors.textSecondary }]}>
                {t('gatherings.detail.tierWarning.text', { required: getCommunityTierLabel(requiredTier), current: getCommunityTierLabel(userTier) })}
              </Text>
            </View>
          </View>
        )}

        {/* 모임 설명 */}
        {gathering.description && (
          <View style={[styles.descriptionCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionLabel, { color: themeColors.textTertiary }]}>{t('gatherings.detail.section.description')}</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>{gathering.description}</Text>
          </View>
        )}

        {/* 참가자 목록 */}
        {participants && participants.length > 0 && (
          <View style={[styles.participantsCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionLabel, { color: themeColors.textTertiary }]}>{t('gatherings.detail.section.participants', { count: participants.length })}</Text>
            <View style={styles.participantsList}>
              {participants.slice(0, 5).map((participant) => (
                <View key={participant.id} style={styles.participantItem}>
                  <View style={[styles.participantTier, { backgroundColor: TIER_COLORS[participant.participant_tier] }]}>
                    <Ionicons name={getTierIcon(participant.participant_tier)} size={12} color="#000000" />
                  </View>
                  <Text style={[styles.participantName, { color: themeColors.textPrimary }]}>
                    {participant.participant_display_name || t('gatherings.detail.anonymous')}
                  </Text>
                  <Text style={[styles.participantAssets, { color: TIER_COLORS[participant.participant_tier] }]}>
                    {formatAssetInBillion(participant.participant_verified_assets)}
                  </Text>
                </View>
              ))}
              {participants.length > 5 && (
                <Text style={[styles.moreParticipants, { color: themeColors.textTertiary }]}>
                  {t('gatherings.detail.moreParticipants', { count: participants.length - 5 })}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* 여백 */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: themeColors.background, borderTopColor: themeColors.border }]}>
        {isParticipant ? (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: themeColors.error }]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={themeColors.error} />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color={themeColors.error} />
                <Text style={[styles.cancelButtonText, { color: themeColors.error }]}>{t('gatherings.detail.button.cancelParticipation')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : isBlockedByTier ? (
          <View style={[styles.tierBlockedButton, { borderColor: themeColors.warning }]}>
            <Ionicons name="lock-closed" size={20} color={themeColors.warning} />
            <Text style={[styles.tierBlockedButtonText, { color: themeColors.warning }]}>
              {t('gatherings.detail.button.tierBlocked', { tier: getCommunityTierLabel(requiredTier) })}
            </Text>
          </View>
        ) : canJoin ? (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: themeColors.primary }]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Ionicons name="hand-right" size={20} color="#000000" />
                <Text style={styles.joinButtonText}>
                  {gathering.entry_fee > 0
                    ? t('gatherings.detail.button.joinPaid', { fee: formatCurrency(gathering.entry_fee) })
                    : t('gatherings.detail.button.joinFree')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.closedButton, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="lock-closed" size={20} color={themeColors.textTertiary} />
            <Text style={[styles.closedButtonText, { color: themeColors.textTertiary }]}>
              {isFull ? t('gatherings.detail.button.full') : t('gatherings.detail.button.closed')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  topBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fullBadge: {
    backgroundColor: 'rgba(207, 102, 121, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fullBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  participatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  participatingBadgeText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 20,
    lineHeight: 33,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  hostCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  hostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '500',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  hostAssets: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  descriptionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
  },
  participantsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  participantsList: {
    gap: 10,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  participantTier: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  participantAssets: {
    fontSize: 13,
    fontWeight: '600',
  },
  moreParticipants: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(207, 102, 121, 0.15)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  closedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  closedButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  // 티어 기반 접근 제어 (TBAC) 스타일
  tierCheckBadge: {
    marginLeft: 8,
  },
  tierBlockBadge: {
    marginLeft: 8,
  },
  tierWarningCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 183, 77, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.3)',
  },
  tierWarningContent: {
    flex: 1,
  },
  tierWarningTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  tierWarningText: {
    fontSize: 13,
    lineHeight: 19,
  },
  tierBlockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 183, 77, 0.15)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  tierBlockedButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  // 사기 경고 배너
  scamWarningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#3b1010',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  scamWarningContent: {
    flex: 1,
  },
  scamWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  scamWarningText: {
    fontSize: 13,
    color: '#FF9B9B',
    lineHeight: 19,
  },
});
