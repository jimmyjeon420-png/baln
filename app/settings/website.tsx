/**
 * 공식 웹사이트 (앱 내 랜딩 페이지)
 * 회사 소개, 핵심 기능, 팀 철학, 투자자 신뢰 요소를 담은 페이지
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';

export default function WebsiteScreen() {
  const { colors } = useTheme();

  // 핵심 기능
  const features = [
    {
      icon: 'layers' as const,
      title: '맥락 카드',
      desc: '오늘 시장이 왜 이렇게 움직였는지, 역사·거시경제·기관행동·내 자산 4겹 레이어로 5분 안에 이해합니다.',
    },
    {
      icon: 'bulb' as const,
      title: '예측 게임',
      desc: 'AI가 출제하는 투자 퀴즈로 매일 판단력을 시험하고, 다음날 복기하며 자기 기준을 형성합니다.',
    },
    {
      icon: 'newspaper' as const,
      title: '실시간 뉴스',
      desc: '내 보유 자산에 영향을 주는 뉴스만 필터링하여 AI 영향도 분석과 함께 제공합니다.',
    },
    {
      icon: 'analytics' as const,
      title: '포트폴리오 진단',
      desc: '변동성, 집중도, 섹터 편중을 분석하여 건강 점수를 산출하고 AI 처방전을 제안합니다.',
    },
    {
      icon: 'camera' as const,
      title: 'AI 스크린샷 분석',
      desc: '증권사 앱 캡처 한 장으로 포트폴리오 자동 등록. Gemini 3 Flash AI가 즉시 인식합니다.',
    },
    {
      icon: 'shield-checkmark' as const,
      title: 'Zero-Knowledge 보안',
      desc: '증권사 비밀번호, 계좌번호를 수집하지 않습니다. 스크린샷 분석 후 원본은 즉시 삭제됩니다.',
    },
  ];

  // 신뢰 지표
  const trustBadges = [
    { icon: 'lock-closed' as const, label: 'AES-256\n암호화' },
    { icon: 'server' as const, label: 'Supabase\n인프라' },
    { icon: 'shield' as const, label: 'Zero-Knowledge\n보안' },
    { icon: 'time' as const, label: '매일 5분\n습관 형성' },
  ];

  // 회사 연혁
  const milestones = [
    { date: '2025.06', event: '프로젝트 기획 및 시장 조사 착수' },
    { date: '2025.09', event: 'Supabase 백엔드 아키텍처 설계' },
    { date: '2025.12', event: 'AI OCR 엔진 (Gemini) 통합 완료' },
    { date: '2026.01', event: 'Beta 출시 및 사용자 피드백 수집' },
    { date: '2026.02', event: 'v3.0 — 습관 루프 + 맥락카드 + 뉴스피드 + 예측게임' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="baln" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 히어로 섹션 */}
        <View style={styles.heroSection}>
          <View style={[styles.heroLogo, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="analytics" size={56} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            bal<Text style={{ color: colors.primary }}>n</Text>
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.primary }]}>올바른 투자의 시작</Text>
          <Text style={[styles.heroTagline, { color: colors.textTertiary }]}>
            "매일 5분, 투자 기준을 만드는 습관"
          </Text>
        </View>

        {/* 미션 섹션 */}
        <View style={[styles.missionSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>OUR MISSION</Text>
          <Text style={[styles.missionTitle, { color: colors.textPrimary }]}>
            안심을 판다,{'\n'}불안을 팔지 않는다
          </Text>
          <Text style={[styles.missionDesc, { color: colors.textSecondary }]}>
            bal<Text style={{ color: colors.primary }}>n</Text>은 시장이 흔들릴 때
            맥락을 이해하면 공포가 이해로 바뀐다는 철학으로 만들어졌습니다.
            매일 5분, 시장의 맥락을 읽으며 자기만의 투자 기준을 형성하도록 돕습니다.
          </Text>
        </View>

        {/* 신뢰 지표 */}
        <View style={styles.trustSection}>
          {trustBadges.map((badge, index) => (
            <View key={index} style={styles.trustBadge}>
              <View style={[styles.trustIconBox, { backgroundColor: colors.surface }]}>
                <Ionicons name={badge.icon} size={22} color={colors.primary} />
              </View>
              <Text style={[styles.trustLabel, { color: colors.textSecondary }]}>{badge.label}</Text>
            </View>
          ))}
        </View>

        {/* 핵심 기능 */}
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>CORE FEATURES</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View key={index} style={[styles.featureCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.featureIconBox, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name={feature.icon} size={24} color={colors.primary} />
              </View>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{feature.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{feature.desc}</Text>
            </View>
          ))}
        </View>

        {/* 기술 스택 */}
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>TECHNOLOGY</Text>
        <View style={[styles.techSection, { backgroundColor: colors.surface }]}>
          <View style={styles.techRow}>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>React Native</Text>
            </View>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>Expo SDK 54</Text>
            </View>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>TypeScript</Text>
            </View>
          </View>
          <View style={styles.techRow}>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>Supabase</Text>
            </View>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>Gemini 3 Flash</Text>
            </View>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>TanStack Query</Text>
            </View>
          </View>
          <Text style={[styles.techDesc, { color: colors.textSecondary }]}>
            글로벌 핀테크 표준을 준수하는 최신 기술 스택으로 구축되었습니다.
            크로스 플랫폼 지원으로 iOS와 Android에서 동일한 경험을 제공합니다.
          </Text>
        </View>

        {/* 회사 연혁 */}
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>MILESTONES</Text>
        <View style={[styles.timelineSection, { backgroundColor: colors.surface }]}>
          {milestones.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                <View style={[
                  styles.timelineDotInner,
                  { backgroundColor: index === milestones.length - 1 ? colors.primary : colors.textQuaternary },
                ]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineDate, { color: colors.primary }]}>{item.date}</Text>
                <Text style={[styles.timelineEvent, { color: colors.textPrimary }]}>{item.event}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 팀 소개 */}
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>THE TEAM</Text>
        <View style={styles.teamSection}>
          <View style={[styles.teamCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.teamAvatar, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="person" size={32} color={colors.primary} />
            </View>
            <View style={styles.teamInfo}>
              <Text style={[styles.teamName, { color: colors.textPrimary }]}>
                bal<Text style={{ color: colors.primary }}>n</Text> team
              </Text>
              <Text style={[styles.teamRole, { color: colors.primary }]}>Seoul, South Korea</Text>
              <Text style={[styles.teamBio, { color: colors.textSecondary }]}>
                전직 펀드매니저가 직접 만드는 투자 습관 앱.{'\n'}
                "매일 읽는 사람이 결국 이긴다" — 이것이 우리의 철학입니다.
              </Text>
            </View>
          </View>
        </View>

        {/* 연락처 */}
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>CONTACT</Text>
        <View style={[styles.contactSection, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() =>
              Linking.openURL(
                'mailto:baln.logic@gmail.com?subject=[baln] 문의'
              )
            }
          >
            <Ionicons name="mail" size={20} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.textPrimary }]}>baln.logic@gmail.com</Text>
          </TouchableOpacity>
          <View style={styles.contactItem}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.textPrimary }]}>서울특별시, 대한민국</Text>
          </View>
        </View>

        {/* 법적 면책 */}
        <View style={[styles.disclaimerSection, { backgroundColor: `${colors.error}15`, borderLeftColor: colors.error }]}>
          <Text style={[styles.disclaimerTitle, { color: colors.error }]}>투자 유의사항</Text>
          <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
            bal<Text style={{ color: colors.primary }}>n</Text>은 투자 참고 정보를 제공하며, 투자 권유나 종목 추천이
            아닙니다. 모든 투자 판단과 책임은 사용자 본인에게 있습니다.
            본 서비스는 금융위원회에 등록된 투자자문업이 아니며,
            제공하는 정보의 정확성을 보증하지 않습니다.
          </Text>
        </View>

        {/* 하단 */}
        <Text style={[styles.footerText, { color: colors.textQuaternary }]}>
          © 2026 발른 주식회사. All rights reserved.{'\n'}
          Made with 💚 in Seoul
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // 히어로
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 8,
  },
  heroLogo: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  heroTagline: {
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },

  // 미션
  missionSection: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  missionTitle: {
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 33,
    marginBottom: 12,
  },
  missionDesc: {
    fontSize: 15,
    lineHeight: 23,
  },

  // 섹션 라벨
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },

  // 신뢰 지표
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  trustBadge: {
    alignItems: 'center',
    flex: 1,
  },
  trustIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  // 핵심 기능
  featuresGrid: {
    gap: 12,
    marginBottom: 28,
  },
  featureCard: {
    borderRadius: 14,
    padding: 18,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 14,
    lineHeight: 21,
  },

  // 기술 스택
  techSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  techRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  techBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  techBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  techDesc: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  // 연혁
  timelineSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  timelineDot: {
    width: 24,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
  },
  timelineDate: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  timelineEvent: {
    fontSize: 15,
  },

  // 팀
  teamSection: {
    marginBottom: 28,
  },
  teamCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  teamAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '700',
  },
  teamRole: {
    fontSize: 14,
    marginTop: 2,
  },
  teamBio: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  // 연락처
  contactSection: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 15,
  },

  // 면책
  disclaimerSection: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    marginBottom: 24,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 19,
  },

  // 하단
  footerText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 40,
  },
});
