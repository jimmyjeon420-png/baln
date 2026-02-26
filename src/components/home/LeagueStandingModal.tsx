/**
 * LeagueStandingModal — 예측 리그 전체 순위표 모달
 *
 * 역할: 30명(시뮬레이션 포함)의 전체 리그 순위표를 보여주는 전체 모달
 * 비유: FIFA 월드 랭킹 표 — 내 순위가 하이라이트된 스크롤 가능한 리더보드
 *
 * 특징:
 * - 30명 순위 목록 (유저 포함)
 * - 승급 존 (상위 5명) 녹색 하이라이트
 * - 강등 존 (하위 5명) 빨간 하이라이트
 * - 유저 행은 강조 표시
 * - 상단에 현재 티어 배너
 *
 * 사용처: PredictionLeagueCard 탭 시 열림
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
} from 'react-native';
import type { LeagueTier } from '../../data/leagueConfig';
import { PROMOTION_ZONE, LEAGUE_PLAYER_COUNT, RELEGATION_ZONE } from '../../data/leagueConfig';
import type { SimulatedPlayer } from '../../hooks/usePredictionLeague';

// ============================================================================
// 타입
// ============================================================================

interface LeagueStandingModalProps {
  visible: boolean;
  onClose: () => void;
  currentTier: LeagueTier;
  rating: number;
  weeklyRank: number;
  standings: SimulatedPlayer[];
  locale?: string;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function LeagueStandingModal({
  visible,
  onClose,
  currentTier,
  rating,
  weeklyRank,
  standings,
  locale = 'ko',
}: LeagueStandingModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const isKo = locale === 'ko';

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  // ── 행 렌더러 ──
  const renderItem = ({ item, index }: { item: SimulatedPlayer; index: number }) => {
    const rank = index + 1;
    const isPromoZone = rank <= PROMOTION_ZONE;
    const isRelegZone = rank > LEAGUE_PLAYER_COUNT - RELEGATION_ZONE;
    const isUser = item.isUser;

    let rowBg = 'transparent';
    if (isUser) {
      rowBg = 'rgba(76, 175, 80, 0.15)';
    } else if (isPromoZone) {
      rowBg = 'rgba(76, 175, 80, 0.05)';
    } else if (isRelegZone) {
      rowBg = 'rgba(255, 87, 34, 0.05)';
    }

    // 순위 메달
    let rankDisplay = `${rank}`;
    if (rank === 1) rankDisplay = '\uD83E\uDD47';
    else if (rank === 2) rankDisplay = '\uD83E\uDD48';
    else if (rank === 3) rankDisplay = '\uD83E\uDD49';

    return (
      <View
        style={[
          styles.row,
          { backgroundColor: rowBg },
          isUser && styles.userRow,
        ]}
      >
        {/* 순위 */}
        <View style={styles.rankCol}>
          <Text style={[styles.rankText, rank <= 3 && styles.rankMedal]}>
            {rankDisplay}
          </Text>
        </View>

        {/* 이름 */}
        <View style={styles.nameCol}>
          <Text
            style={[
              styles.nameText,
              isUser && styles.userNameText,
            ]}
            numberOfLines={1}
          >
            {isKo ? item.nameKo : item.nameEn}
            {isUser && (isKo ? ' (나)' : ' (You)')}
          </Text>
        </View>

        {/* 레이팅 */}
        <View style={styles.ratingCol}>
          <Text style={[styles.rowRating, isUser && styles.userRating]}>
            {item.rating}
          </Text>
        </View>

        {/* 존 인디케이터 */}
        <View style={styles.zoneCol}>
          {isPromoZone && (
            <View style={styles.promoIndicator}>
              <Text style={styles.promoArrow}>{'\u25B2'}</Text>
            </View>
          )}
          {isRelegZone && (
            <View style={styles.relegIndicator}>
              <Text style={styles.relegArrow}>{'\u25BC'}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* 티어 배너 */}
          <View style={[styles.banner, { backgroundColor: currentTier.color + '18' }]}>
            <Text style={styles.bannerEmoji}>{currentTier.emoji}</Text>
            <View style={styles.bannerInfo}>
              <Text style={[styles.bannerTier, { color: currentTier.color }]}>
                {isKo ? currentTier.nameKo : currentTier.nameEn}{' '}
                {isKo ? '리그' : 'League'}
              </Text>
              <Text style={styles.bannerRating}>
                {rating} RP {isKo ? `| ${weeklyRank}위` : `| Rank #${weeklyRank}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 범례 */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <Text style={[styles.legendDot, { color: '#4CAF50' }]}>
                {'\u25B2'}
              </Text>
              <Text style={styles.legendText}>
                {isKo ? '승급 존' : 'Promotion'}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendDot, { color: '#FF5722' }]}>
                {'\u25BC'}
              </Text>
              <Text style={styles.legendText}>
                {isKo ? '강등 존' : 'Relegation'}
              </Text>
            </View>
          </View>

          {/* 순위표 헤더 */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.rankCol]}>#</Text>
            <Text style={[styles.headerText, styles.nameCol]}>
              {isKo ? '이름' : 'Name'}
            </Text>
            <Text style={[styles.headerText, styles.ratingCol]}>RP</Text>
            <Text style={[styles.headerText, styles.zoneCol]} />
          </View>

          {/* 순위 목록 */}
          <FlatList
            data={standings}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            initialScrollIndex={Math.max(0, weeklyRank - 3)}
            getItemLayout={(_data, index) => ({
              length: 48,
              offset: 48 * index,
              index,
            })}
          />

          {/* 주간 보상 안내 */}
          <View style={styles.rewardBanner}>
            <Text style={styles.rewardText}>
              {isKo
                ? `주간 보상: ${currentTier.weeklyRewardCredits}C (\u20A9${currentTier.weeklyRewardCredits * 100})`
                : `Weekly Reward: ${currentTier.weeklyRewardCredits}C`}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default LeagueStandingModal;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 300,
  },
  modal: {
    width: '92%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bannerEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTier: {
    fontSize: 18,
    fontWeight: '800',
  },
  bannerRating: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    fontSize: 10,
  },
  legendText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    fontWeight: '600',
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  userRow: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  rankCol: {
    width: 36,
    alignItems: 'center',
  },
  rankText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  rankMedal: {
    fontSize: 18,
  },
  nameCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  nameText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
  userNameText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ratingCol: {
    width: 50,
    alignItems: 'flex-end',
  },
  rowRating: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '500',
  },
  userRating: {
    color: '#4CAF50',
    fontWeight: '800',
  },
  zoneCol: {
    width: 24,
    alignItems: 'center',
  },
  promoIndicator: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoArrow: {
    color: '#4CAF50',
    fontSize: 10,
  },
  relegIndicator: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relegArrow: {
    color: '#FF5722',
    fontSize: 10,
  },
  rewardBanner: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  rewardText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
});
