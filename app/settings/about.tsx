/**
 * 앱 정보 화면 — 도움말 / 이용약관 / 개인정보처리방침 / 앱 버전 통합
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';

export default function AboutScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const appVersion = Constants.expoConfig?.version ?? '3.0.0';

  const appInfo = [
    { label: '버전', value: appVersion },
    { label: '프레임워크', value: 'Expo SDK 54' },
    { label: 'AI 엔진', value: 'Gemini 3 Flash' },
  ];

  // 도움말 / 이용약관 / 개인정보처리방침을 이 화면에서 바로 이동할 수 있도록 통합
  const navLinks: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string }[] = [
    { icon: 'help-circle-outline', label: '도움말', route: '/settings/help' },
    { icon: 'document-text-outline', label: '이용약관', route: '/settings/terms' },
    { icon: 'lock-closed-outline', label: '개인정보처리방침', route: '/settings/privacy' },
    { icon: 'open-outline', label: '오픈소스 라이선스', route: '/settings/licenses' },
    { icon: 'globe-outline', label: '공식 웹사이트', route: '/settings/website' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="앱 정보" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 앱 로고 및 이름 */}
        <View style={styles.logoSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="analytics" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>
            bal<Text style={{ color: '#4CAF50' }}>n</Text>
          </Text>
          <Text style={[styles.appTagline, { color: colors.textTertiary }]}>올바른 투자의 시작</Text>
        </View>

        {/* 앱 버전 정보 */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>버전 정보</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {appInfo.map((item, index) => (
            <View
              key={index}
              style={[
                styles.infoItem,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: index === appInfo.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* 도움말 / 약관 / 라이선스 링크 */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginTop: 24 }]}>도움말 & 법적 고지</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {navLinks.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.linkItem,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: index === navLinks.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.6}
            >
              <View style={[styles.linkIconWrap, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
              </View>
              <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 저작권 */}
        <Text style={[styles.copyright, { color: colors.textTertiary }]}>
          © 2026 발른 주식회사. All rights reserved.
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
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
  },
  appTagline: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  linkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkLabel: {
    flex: 1,
    fontSize: 15,
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
});
