/**
 * Tab 5: 전체 (Menu) - 설정 및 기타 메뉴
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../../src/styles/theme';

interface MenuItem {
  id: string;
  title: string;
  emoji: string;
  description: string;
  onPress: () => void;
}

export default function MenuScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  /**
   * 로그아웃 처리
   */
  const handleSignOut = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        {
          text: '취소',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: '로그아웃',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await signOut();
              router.replace('/login');
            } catch (error) {
              Alert.alert('오류', '로그아웃에 실패했습니다');
              setIsSigningOut(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // 메뉴 아이템들
  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: '설정',
      emoji: '⚙️',
      description: '앱 설정 및 프로필 관리',
      onPress: () => {
        Alert.alert(
          '⚙️ 설정',
          '실제 구현: 언어 변경, 알림 설정, 계정 정보 등을 관리하는 화면입니다.\n\n지금은 시뮬레이션 모드입니다.',
          [{ text: '확인', onPress: () => {} }]
        );
      },
    },
    {
      id: '2',
      title: '투자 원칙',
      emoji: '📜',
      description: '나만의 투자 철학 정의',
      onPress: () => {
        Alert.alert(
          '📜 투자 원칙',
          '실제 구현: 당신의 투자 목표, 위험도, 재정 상황을 설정하는 화면입니다.\n\n이는 AI가 맞춤형 조언을 제공하는 데 사용됩니다.',
          [{ text: '확인', onPress: () => {} }]
        );
      },
    },
    {
      id: '3',
      title: '포트폴리오 분석',
      emoji: '📊',
      description: '상세한 자산 분석',
      onPress: () => {
        Alert.alert(
          '📊 포트폴리오 분석',
          '실제 구현: 자산 배분, 섹터별 분석, 리스크 분석 등을 보여주는 상세 리포트입니다.\n\n지금은 시뮬레이션 모드입니다.',
          [{ text: '확인', onPress: () => {} }]
        );
      },
    },
    {
      id: '4',
      title: '리밸런싱',
      emoji: '🔄',
      description: '자산 재조정 실행',
      onPress: () => {
        Alert.alert(
          '🔄 리밸런싱',
          '실제 구현: 최적의 자산 배분으로 리밸런싱하는 거래 계획을 제시합니다.\n\n지금은 시뮬레이션 모드입니다.',
          [{ text: '확인', onPress: () => {} }]
        );
      },
    },
  ];

  const otherItems = [
    {
      id: 'account',
      title: '내 계좌 관리',
      description: '연결된 계좌 확인 및 관리',
      onPress: () => {
        Alert.alert(
          '내 계좌 관리',
          '실제 구현: 연결된 증권사 계좌, 은행 계좌를 관리하는 화면입니다.\n\n지금은 시뮬레이션 모드입니다.',
          [{ text: '확인', onPress: () => {} }]
        );
      },
    },
    {
      id: 'help',
      title: '고객센터',
      description: 'FAQ 및 지원 요청',
      onPress: () => {
        Alert.alert(
          '고객센터',
          '실제 구현: 자주 묻는 질문, 튜토리얼, 고객 지원 연락처가 있는 화면입니다.\n\nEmail: support@smartrebalancer.com',
          [{ text: '확인', onPress: () => {} }]
        );
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={[TYPOGRAPHY.headingLarge, { color: COLORS.textPrimary }]}>
            전체
          </Text>
          <Text
            style={[
              TYPOGRAPHY.bodySmall,
              { color: COLORS.textSecondary, marginTop: SIZES.sm },
            ]}
          >
            설정, 분석, 리밸런싱 등
          </Text>
        </View>

        {/* 메인 메뉴 - 2x2 그리드 */}
        <View style={styles.gridSection}>
          <View style={styles.grid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.gridItem, { backgroundColor: COLORS.surface }]}
                onPress={item.onPress}
              >
                <Text style={styles.gridEmoji}>{item.emoji}</Text>
                <Text
                  style={[
                    TYPOGRAPHY.labelSmall,
                    { color: COLORS.textPrimary, marginTop: SIZES.sm, textAlign: 'center' },
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 기타 메뉴 섹션 */}
        <View style={styles.section}>
          <Text
            style={[
              TYPOGRAPHY.labelMedium,
              { color: COLORS.textPrimary, marginBottom: SIZES.lg },
            ]}
          >
            기타
          </Text>

          {otherItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.listItem, { backgroundColor: COLORS.surface }]}
              onPress={item.onPress}
            >
              <View style={styles.listContent}>
                <Text style={[TYPOGRAPHY.labelSmall, { color: COLORS.textPrimary }]}>
                  {item.title}
                </Text>
                <Text
                  style={[
                    TYPOGRAPHY.bodySmall,
                    { color: COLORS.textSecondary, marginTop: SIZES.xs },
                  ]}
                >
                  {item.description}
                </Text>
              </View>
              <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textTertiary }]}>
                &gt;
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 앱 정보 */}
        <View style={[styles.infoBox, { backgroundColor: COLORS.surfaceLight }]}>
          <Text
            style={[
              TYPOGRAPHY.labelSmall,
              { color: COLORS.textPrimary, marginBottom: SIZES.sm },
            ]}
          >
            Smart Rebalancer
          </Text>
          <Text
            style={[
              TYPOGRAPHY.bodySmall,
              { color: COLORS.textSecondary, lineHeight: 20 },
            ]}
          >
            버전 1.0.0
          </Text>
          <Text
            style={[
              TYPOGRAPHY.bodySmall,
              { color: COLORS.textTertiary, marginTop: SIZES.md, lineHeight: 20 },
            ]}
          >
            AI 기반 포트폴리오 리밸런싱 앱입니다.
            {'\n'}
            더 나은 투자 결정을 위해 설계되었습니다.
          </Text>
        </View>

        {/* 로그아웃 섹션 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: COLORS.error }]}
            onPress={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <ActivityIndicator color={COLORS.textPrimary} size="small" />
            ) : (
              <Text style={[TYPOGRAPHY.labelSmall, { color: COLORS.textPrimary }]}>
                로그아웃
              </Text>
            )}
          </TouchableOpacity>

          {user && (
            <Text
              style={[
                TYPOGRAPHY.bodySmall,
                { color: COLORS.textTertiary, marginTop: SIZES.md, textAlign: 'center' },
              ]}
            >
              현재 계정: {user.email}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    paddingBottom: SIZES.xxxl + 60, // 탭 바 높이(80) + 여유 공간 대응
  },
  header: {
    marginBottom: SIZES.xl,
  },
  gridSection: {
    marginBottom: SIZES.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
  },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    minWidth: '45%',
    borderRadius: SIZES.rMd,
    padding: SIZES.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  gridEmoji: {
    fontSize: 40,
    lineHeight: 48,
  },
  section: {
    marginBottom: SIZES.xl,
  },
  listItem: {
    borderRadius: SIZES.rMd,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  listContent: {
    flex: 1,
    marginRight: SIZES.md,
  },
  infoBox: {
    borderRadius: SIZES.rMd,
    padding: SIZES.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginBottom: SIZES.xl,
  },
  logoutButton: {
    borderRadius: SIZES.rMd,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.lg,
    opacity: 0.8,
  },
});
