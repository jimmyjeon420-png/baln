/**
 * VIP 라운지 - 모임/스터디 마켓플레이스
 * 1억+ 인증 사용자 전용 프라이빗 커뮤니티
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLoungeEligibility } from '../../src/hooks/useCommunity';
import {
  useGatherings,
  useHostingEligibility,
  formatAssetInBillion,
  TIER_COLORS,
} from '../../src/hooks/useGatherings';
import { Gathering, GATHERING_CATEGORY_LABELS } from '../../src/types/database';
import GatheringCard from '../../src/components/GatheringCard';

// 컬러 팔레트
const COLORS = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  primary: '#4CAF50',
  error: '#CF6679',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#888888',
  border: '#333333',
};

// 카테고리 필터 옵션
const CATEGORY_FILTERS: { key: Gathering['category'] | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'study', label: '스터디' },
  { key: 'meeting', label: '정기 모임' },
  { key: 'networking', label: '네트워킹' },
  { key: 'workshop', label: '워크샵' },
];

export default function LoungeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<Gathering['category'] | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // 라운지 자격 확인
  const { eligibility, loading: eligibilityLoading, refetch: refetchEligibility } = useLoungeEligibility();

  // 호스팅 자격 확인 (1억+ 인증 사용자만)
  const { data: hostingEligibility, isLoading: hostingLoading } = useHostingEligibility();

  // 모임 목록 조회
  const {
    data: gatherings,
    isLoading: gatheringsLoading,
    refetch: refetchGatherings,
  } = useGatherings(selectedCategory === 'all' ? undefined : selectedCategory);

  // 새로고침
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEligibility(), refetchGatherings()]);
    setRefreshing(false);
  }, [refetchEligibility, refetchGatherings]);

  // 모임 상세 페이지로 이동
  const handleGatheringPress = (gathering: Gathering) => {
    router.push(`/gatherings/${gathering.id}`);
  };

  // 모임 생성 페이지로 이동
  const handleCreateGathering = () => {
    router.push('/gatherings/create');
  };

  const isLoading = eligibilityLoading || gatheringsLoading;

  // 자격 미달 화면
  if (!eligibilityLoading && !eligibility.isEligible) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>VIP 라운지</Text>
          <View style={styles.vipBadge}>
            <Ionicons name="diamond" size={14} color="#B9F2FF" />
            <Text style={styles.vipBadgeText}>PRIVATE</Text>
          </View>
        </View>

        <View style={styles.lockedContainer}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={48} color={COLORS.textMuted} />
          </View>

          <Text style={styles.lockedTitle}>프라이빗 클럽</Text>
          <Text style={styles.lockedDescription}>
            1억 이상 자산 인증 사용자만{'\n'}입장할 수 있는 특별한 공간입니다.
          </Text>

          {/* 진행률 */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>나의 인증 자산</Text>
              <Text style={styles.progressValue}>
                {formatAssetInBillion(eligibility.verifiedAssetsTotal)} / 1억
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      (eligibility.verifiedAssetsTotal / 100000000) * 100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* 조건 체크리스트 */}
          <View style={styles.checklist}>
            <View style={styles.checkItem}>
              <Ionicons
                name={eligibility.totalAssets >= 100000000 ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={eligibility.totalAssets >= 100000000 ? COLORS.primary : COLORS.error}
              />
              <Text style={styles.checkText}>총 자산 1억 이상</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons
                name={eligibility.hasVerifiedAssets ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={eligibility.hasVerifiedAssets ? COLORS.primary : COLORS.error}
              />
              <Text style={styles.checkText}>OCR 자산 인증 완료</Text>
            </View>
          </View>

          {/* 인증하기 버튼 */}
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => router.push('/add-asset')}
          >
            <Ionicons name="camera" size={20} color="#000000" />
            <Text style={styles.verifyButtonText}>자산 OCR 인증하기</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            *수동 입력 자산은 라운지 입장 조건에 포함되지 않습니다
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>VIP 라운지</Text>
          <View style={styles.vipBadge}>
            <Ionicons name="diamond" size={14} color="#B9F2FF" />
            <Text style={styles.vipBadgeText}>PRIVATE</Text>
          </View>
        </View>
        {hostingEligibility?.canHost && (
          <TouchableOpacity
            style={styles.myGatheringsButton}
            onPress={() => router.push('/settings/lounge')}
          >
            <Ionicons name="chatbubbles-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* 환영 배너 */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeTitle}>안녕하세요, VIP 멤버님 👑</Text>
          <Text style={styles.welcomeSubtitle}>
            인증된 자산가들과 함께하는 프라이빗 모임에 참여하세요.
          </Text>
        </View>
        {hostingEligibility && hostingEligibility.tier && (
          <View style={[styles.tierIndicator, { backgroundColor: TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS] + '30' }]}>
            <Ionicons name="shield-checkmark" size={16} color={TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS]} />
            <Text style={[styles.tierText, { color: TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS] }]}>
              {formatAssetInBillion(hostingEligibility.verifiedAssets)} 인증
            </Text>
          </View>
        )}
      </View>

      {/* 카테고리 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORY_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.categoryChip,
              selectedCategory === filter.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(filter.key)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === filter.key && styles.categoryChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 모임 목록 */}
      <ScrollView
        style={styles.gatheringsList}
        contentContainerStyle={styles.gatheringsContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>모임을 불러오는 중...</Text>
          </View>
        ) : gatherings && gatherings.length > 0 ? (
          gatherings.map((gathering) => (
            <GatheringCard
              key={gathering.id}
              gathering={gathering}
              onPress={() => handleGatheringPress(gathering)}
              userTier={hostingEligibility?.tier}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>아직 등록된 모임이 없습니다</Text>
            <Text style={styles.emptyDescription}>
              첫 번째 모임을 만들어보세요!
            </Text>
          </View>
        )}

        {/* 스크롤 여백 (FAB 가림 방지) */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 플로팅 버튼 - 인증된 사용자만 표시 */}
      {hostingEligibility?.canHost && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 80 }]}
          onPress={handleCreateGathering}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#000000" />
          <Text style={styles.fabText}>모임 만들기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 242, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  vipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B9F2FF',
  },
  myGatheringsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  welcomeContent: {
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  tierIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: '#000000',
  },
  gatheringsList: {
    flex: 1,
  },
  gatheringsContent: {
    padding: 20,
    paddingTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  // 자격 미달 화면 스타일
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  lockedDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  progressValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  checklist: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
