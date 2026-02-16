/**
 * 앱 정보 화면
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';

export default function AboutScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const appInfo = [
    { label: '버전', value: '2.0.0' },
    { label: '빌드', value: '2026.02.04' },
    { label: '프레임워크', value: 'Expo SDK 54' },
    { label: 'AI 엔진', value: 'Gemini 3 Flash' },
  ];

  const links = [
    { label: '개인정보처리방침', route: '/settings/privacy' },
    { label: '오픈소스 라이선스', route: '/settings/licenses' },
    { label: '공식 웹사이트', route: '/settings/website' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="앱 정보" />

      <View style={styles.content}>
        {/* 앱 로고 및 이름 */}
        <View style={styles.logoSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="analytics" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
          <Text style={[styles.appTagline, { color: colors.textTertiary }]}>올바른 투자의 시작</Text>
        </View>

        {/* 앱 정보 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {appInfo.map((item, index) => (
            <View key={index} style={[styles.infoItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* 링크 */}
        <View style={[styles.section, { marginTop: 24, backgroundColor: colors.surface }]}>
          {links.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.linkItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push(item.route as any)}
            >
              <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 저작권 */}
        <Text style={[styles.copyright, { color: colors.textTertiary }]}>
          © 2026 발른 주식회사. All rights reserved.
        </Text>
      </View>
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
    marginBottom: 32,
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
  section: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  linkLabel: {
    fontSize: 15,
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});
