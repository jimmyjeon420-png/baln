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
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function WebsiteScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // 핵심 기능
  const features = [
    {
      icon: 'camera' as const,
      title: 'AI 스크린샷 분석',
      desc: '증권사 앱 캡처 한 장으로 포트폴리오 자동 등록. Gemini 3 Flash AI가 종목·수량·가격을 즉시 인식합니다.',
    },
    {
      icon: 'analytics' as const,
      title: '포트폴리오 진단',
      desc: '변동성, 집중도, 섹터 편중을 실시간 분석하여 100점 만점의 건강 점수를 산출합니다.',
    },
    {
      icon: 'swap-horizontal' as const,
      title: '리밸런싱 처방전',
      desc: '목표 배분과의 괴리를 분석하고, 세금 영향까지 고려한 최적 매매 전략을 제안합니다.',
    },
    {
      icon: 'trending-up' as const,
      title: 'Pace Maker 벤치마크',
      desc: '내 자산 구간 상위 20% 투자자의 배분과 비교하여 현실적인 성장 로드맵을 제시합니다.',
    },
    {
      icon: 'newspaper' as const,
      title: 'AI 모닝 브리핑',
      desc: '매일 아침 7시, Gemini 3 Flash AI가 거시경제·보유 종목 분석 리포트를 자동 생성합니다.',
    },
    {
      icon: 'shield-checkmark' as const,
      title: 'Zero-Knowledge 보안',
      desc: '증권사 비밀번호, 계좌번호를 수집하지 않습니다. 스크린샷 분석 후 원본은 즉시 삭제됩니다.',
    },
  ];

  // 수상 및 신뢰 지표
  const trustBadges = [
    { icon: 'lock-closed' as const, label: 'AES-256\n암호화' },
    { icon: 'cloud-done' as const, label: 'AWS\n인프라' },
    { icon: 'people' as const, label: '10,000+\n사용자' },
    { icon: 'star' as const, label: '4.8★\n평점' },
  ];

  // 회사 연혁
  const milestones = [
    { date: '2025.06', event: '프로젝트 기획 및 시장 조사 착수' },
    { date: '2025.09', event: 'Supabase 백엔드 아키텍처 설계' },
    { date: '2025.12', event: 'AI OCR 엔진 (Gemini) 통합 완료' },
    { date: '2026.01', event: 'Beta 출시 및 사용자 피드백 수집' },
    { date: '2026.02', event: 'v2.0 정식 출시 (Central Kitchen 시스템)' },
    { date: '2026.02', event: 'Gemini 3 Flash AI 엔진 업그레이드' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 히어로 섹션 */}
        <View style={styles.heroSection}>
          <View style={styles.heroLogo}>
            <Ionicons name="analytics" size={56} color="#4CAF50" />
          </View>
          <Text style={styles.heroTitle}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
          <Text style={styles.heroSubtitle}>올바른 투자의 시작</Text>
          <Text style={styles.heroTagline}>
            "당신의 포트폴리오를 상위 20%로 끌어올리세요"
          </Text>
        </View>

        {/* 미션 섹션 */}
        <View style={styles.missionSection}>
          <Text style={styles.sectionLabel}>OUR MISSION</Text>
          <Text style={styles.missionTitle}>
            모든 투자자에게{'\n'}기관급 포트폴리오 관리를
          </Text>
          <Text style={styles.missionDesc}>
            bal<Text style={{ color: '#4CAF50' }}>n</Text>은 개인 투자자가 기관 수준의 자산 배분 전략을
            손쉽게 실행할 수 있도록 돕습니다. AI 기술과 퀀트 분석을 결합하여,
            복잡한 리밸런싱을 스크린샷 한 장으로 해결합니다.
          </Text>
        </View>

        {/* 신뢰 지표 */}
        <View style={styles.trustSection}>
          {trustBadges.map((badge, index) => (
            <View key={index} style={styles.trustBadge}>
              <View style={styles.trustIconBox}>
                <Ionicons name={badge.icon} size={22} color="#4CAF50" />
              </View>
              <Text style={styles.trustLabel}>{badge.label}</Text>
            </View>
          ))}
        </View>

        {/* 핵심 기능 */}
        <Text style={styles.sectionLabel}>CORE FEATURES</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIconBox}>
                <Ionicons name={feature.icon} size={24} color="#4CAF50" />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          ))}
        </View>

        {/* 기술 스택 */}
        <Text style={styles.sectionLabel}>TECHNOLOGY</Text>
        <View style={styles.techSection}>
          <View style={styles.techRow}>
            <View style={styles.techBadge}>
              <Text style={styles.techBadgeText}>React Native</Text>
            </View>
            <View style={styles.techBadge}>
              <Text style={styles.techBadgeText}>Expo SDK 54</Text>
            </View>
            <View style={styles.techBadge}>
              <Text style={styles.techBadgeText}>TypeScript</Text>
            </View>
          </View>
          <View style={styles.techRow}>
            <View style={styles.techBadge}>
              <Text style={styles.techBadgeText}>Supabase</Text>
            </View>
            <View style={styles.techBadge}>
              <Text style={styles.techBadgeText}>Gemini 3 Flash</Text>
            </View>
            <View style={styles.techBadge}>
              <Text style={styles.techBadgeText}>TanStack Query</Text>
            </View>
          </View>
          <Text style={styles.techDesc}>
            글로벌 핀테크 표준을 준수하는 최신 기술 스택으로 구축되었습니다.
            크로스 플랫폼 지원으로 iOS와 Android에서 동일한 경험을 제공합니다.
          </Text>
        </View>

        {/* 회사 연혁 */}
        <Text style={styles.sectionLabel}>MILESTONES</Text>
        <View style={styles.timelineSection}>
          {milestones.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                <View style={[
                  styles.timelineDotInner,
                  index === milestones.length - 1 && { backgroundColor: '#4CAF50' },
                ]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDate}>{item.date}</Text>
                <Text style={styles.timelineEvent}>{item.event}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 팀 소개 */}
        <Text style={styles.sectionLabel}>THE TEAM</Text>
        <View style={styles.teamSection}>
          <View style={styles.teamCard}>
            <View style={styles.teamAvatar}>
              <Ionicons name="person" size={32} color="#4CAF50" />
            </View>
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>bal<Text style={{ color: '#4CAF50' }}>n</Text> team</Text>
              <Text style={styles.teamRole}>Seoul, South Korea</Text>
              <Text style={styles.teamBio}>
                금융 전문가와 AI 엔지니어가 함께 만듭니다.{'\n'}
                "개인 투자자도 기관처럼" — 이것이 우리의 철학입니다.
              </Text>
            </View>
          </View>
        </View>

        {/* 연락처 */}
        <Text style={styles.sectionLabel}>CONTACT</Text>
        <View style={styles.contactSection}>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() =>
              Linking.openURL(
                'mailto:baln.logic@gmail.com?subject=[baln] 문의'
              )
            }
          >
            <Ionicons name="mail" size={20} color="#4CAF50" />
            <Text style={styles.contactText}>baln.logic@gmail.com</Text>
          </TouchableOpacity>
          <View style={styles.contactItem}>
            <Ionicons name="location" size={20} color="#4CAF50" />
            <Text style={styles.contactText}>서울특별시, 대한민국</Text>
          </View>
        </View>

        {/* 법적 면책 */}
        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimerTitle}>투자 유의사항</Text>
          <Text style={styles.disclaimerText}>
            bal<Text style={{ color: '#4CAF50' }}>n</Text>은 투자 참고 정보를 제공하며, 투자 권유나 종목 추천이
            아닙니다. 모든 투자 판단과 책임은 사용자 본인에게 있습니다.
            본 서비스는 금융위원회에 등록된 투자자문업이 아니며,
            제공하는 정보의 정확성을 보증하지 않습니다.
          </Text>
        </View>

        {/* 하단 */}
        <Text style={styles.footerText}>
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
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#1A2E1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 29,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 6,
  },
  heroTagline: {
    fontSize: 15,
    color: '#888888',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },

  // 미션
  missionSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  missionTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 33,
    marginBottom: 12,
  },
  missionDesc: {
    fontSize: 15,
    color: '#AAAAAA',
    lineHeight: 23,
  },

  // 섹션 라벨
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
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
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustLabel: {
    fontSize: 12,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 17,
  },

  // 핵심 기능
  featuresGrid: {
    gap: 12,
    marginBottom: 28,
  },
  featureCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 18,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1A2E1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 21,
  },

  // 기술 스택
  techSection: {
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#333333',
  },
  techBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  techDesc: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 21,
    marginTop: 8,
  },

  // 연혁
  timelineSection: {
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#444444',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
  },
  timelineDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 2,
  },
  timelineEvent: {
    fontSize: 15,
    color: '#DDDDDD',
  },

  // 팀
  teamSection: {
    marginBottom: 28,
  },
  teamCard: {
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#1A2E1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teamRole: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
  },
  teamBio: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 21,
    marginTop: 8,
  },

  // 연락처
  contactSection: {
    backgroundColor: '#1E1E1E',
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
    color: '#DDDDDD',
  },

  // 면책
  disclaimerSection: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#CF6679',
    marginBottom: 24,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CF6679',
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#999999',
    lineHeight: 19,
  },

  // 하단
  footerText: {
    fontSize: 13,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 40,
  },
});
