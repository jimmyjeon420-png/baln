/**
 * 투자 철학(구루) 변경 설정 화면
 *
 * 역할: "전체" 탭 설정에서 언제든지 구루 스타일을 변경하는 화면
 * 4가지 투자 거장 카드 UI로 선택 가능
 * 선택 즉시 AsyncStorage 저장 + 분석 탭 즉시 반영
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGuruStyle, GuruStyle } from '../../src/hooks/useGuruStyle';
import { useTheme } from '../../src/hooks/useTheme';
import { DALIO_TARGET, BUFFETT_TARGET, CATHIE_WOOD_TARGET } from '../../src/services/rebalanceScore';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';
import { useLocale } from '../../src/context/LocaleContext';

// ── 구루 카드 데이터 ──

interface GuruCard {
  id: GuruStyle;
  emoji: string;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  keyAlloc: { label: string; pct: number; color: string }[];
  accentColor: string;
}

export default function GuruStyleScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  // loaded: AsyncStorage 비동기 로드 완료 여부
  // guruStyle: 실제 저장된 값 (로드 전에는 'dalio' 기본값)
  const { guruStyle, setGuruStyle, loaded } = useGuruStyle();

  const GURU_CARDS = useMemo<GuruCard[]>(() => [
    {
      id: 'dalio',
      emoji: '🌊',
      name: t('guru.style.card_dalio.name'),
      subtitle: 'All Weather',
      tagline: t('guru.style.card_dalio.tagline'),
      description: t('guru.style.card_dalio.description'),
      keyAlloc: [
        { label: t('guru.style.alloc_labels.stock'), pct: DALIO_TARGET.large_cap, color: '#4CAF50' },
        { label: t('guru.style.alloc_labels.bond'), pct: DALIO_TARGET.bond, color: '#64B5F6' },
        { label: t('guru.style.alloc_labels.gold'), pct: DALIO_TARGET.gold, color: '#FFD700' },
        { label: t('guru.style.alloc_labels.commodity'), pct: DALIO_TARGET.commodity, color: '#FF8A65' },
        { label: 'BTC', pct: DALIO_TARGET.bitcoin, color: '#F7931A' },
      ],
      accentColor: '#4CAF50',
    },
    {
      id: 'buffett',
      emoji: '🔴',
      name: t('guru.style.card_buffett.name'),
      subtitle: 'Berkshire',
      tagline: t('guru.style.card_buffett.tagline'),
      description: t('guru.style.card_buffett.description'),
      keyAlloc: [
        { label: t('guru.style.alloc_labels.stock'), pct: BUFFETT_TARGET.large_cap, color: '#4CAF50' },
        { label: t('guru.style.alloc_labels.cash'), pct: BUFFETT_TARGET.cash, color: '#78909C' },
        { label: t('guru.style.alloc_labels.bond'), pct: BUFFETT_TARGET.bond, color: '#64B5F6' },
        { label: t('guru.style.alloc_labels.commodity'), pct: BUFFETT_TARGET.commodity, color: '#FF8A65' },
        { label: 'BTC', pct: BUFFETT_TARGET.bitcoin, color: '#F7931A' },
      ],
      accentColor: '#FF5722',
    },
    {
      id: 'cathie_wood',
      emoji: '🚀',
      name: t('guru.style.card_cathie.name'),
      subtitle: 'ARK Invest',
      tagline: t('guru.style.card_cathie.tagline'),
      description: t('guru.style.card_cathie.description'),
      keyAlloc: [
        { label: t('guru.style.alloc_labels.innovation'), pct: CATHIE_WOOD_TARGET.large_cap, color: '#4CAF50' },
        { label: 'BTC', pct: CATHIE_WOOD_TARGET.bitcoin, color: '#F7931A' },
        { label: t('guru.style.alloc_labels.cash'), pct: CATHIE_WOOD_TARGET.cash, color: '#78909C' },
        { label: t('guru.style.alloc_labels.altcoin'), pct: CATHIE_WOOD_TARGET.altcoin, color: '#9C27B0' },
      ],
      accentColor: '#9C27B0',
    },
  ], [t]);

  const handleSelect = async (style: GuruStyle) => {
    // 즉시 저장 + hook 상태 업데이트 → isActive 반영됨
    await setGuruStyle(style);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('guru.style.header_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('guru.style.subtitle')}
        </Text>

        {GURU_CARDS.map(card => {
          // loaded 전에는 모두 inactive → 로드 후 실제 저장된 구루를 하이라이트
          const isActive = loaded && guruStyle === card.id;
          return (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: isActive ? card.accentColor : colors.border },
                isActive && { borderWidth: 2 },
              ]}
              onPress={() => handleSelect(card.id)}
              activeOpacity={0.7}
            >
              {/* 카드 헤더 */}
              <View style={styles.cardHeader}>
                <View style={[styles.emojiWrap, { backgroundColor: card.accentColor + '20' }]}>
                  <CharacterAvatar
                    guruId={card.id}
                    size="sm"
                    expression={isActive ? 'bullish' : 'neutral'}
                    fallbackEmoji={card.emoji}
                  />
                </View>
                <View style={styles.cardTitleGroup}>
                  <Text style={[styles.guruName, { color: colors.textPrimary }]}>{card.name}</Text>
                  <Text style={[styles.guruSubtitle, { color: card.accentColor }]}>{card.subtitle}</Text>
                </View>
                {isActive && (
                  <View style={[styles.selectedBadge, { backgroundColor: card.accentColor + '20' }]}>
                    <Ionicons name="checkmark-circle" size={22} color={card.accentColor} />
                    <Text style={[styles.selectedText, { color: card.accentColor }]}>{t('guru.style.selected_badge')}</Text>
                  </View>
                )}
              </View>

              {/* 태그라인 */}
              <Text style={[styles.tagline, { color: colors.textSecondary }]}>{card.tagline}</Text>

              {/* 설명 */}
              <Text style={[styles.description, { color: colors.textTertiary }]}>{card.description}</Text>

              {/* 핵심 배분 */}
              <View style={styles.allocRow}>
                {card.keyAlloc.map(alloc => (
                  <View key={alloc.label} style={[styles.allocBadge, { backgroundColor: alloc.color + '20' }]}>
                    <Text style={[styles.allocLabel, { color: alloc.color }]}>{alloc.label}</Text>
                    <Text style={[styles.allocPct, { color: alloc.color }]}>{alloc.pct}%</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={[styles.phaseNotice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="analytics-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.phaseNoticeText, { color: colors.textSecondary }]}>
            {t('guru.style.phase_notice')}
          </Text>
        </View>

        <View style={[styles.disclaimerBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
            {t('guru.style.disclaimer')}
          </Text>
        </View>

        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {t('guru.style.hint')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 23,
  },
  cardTitleGroup: {
    flex: 1,
  },
  guruName: {
    fontSize: 17,
    fontWeight: '700',
  },
  guruSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  selectedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  allocRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  allocLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  allocPct: {
    fontSize: 13,
    fontWeight: '800',
  },
  phaseNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  phaseNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
});
