/**
 * 앱 정보 화면
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AboutScreen() {
  const router = useRouter();

  const appInfo = [
    { label: '버전', value: '2.0.0' },
    { label: '빌드', value: '2026.02.04' },
    { label: '프레임워크', value: 'Expo SDK 54' },
    { label: 'AI 엔진', value: 'Google Gemini' },
  ];

  const links = [
    { label: '개인정보처리방침', route: '/settings/privacy' },
    { label: '오픈소스 라이선스', route: '/settings/licenses' },
    { label: '공식 웹사이트', route: '/settings/website' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>앱 정보</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {/* 앱 로고 및 이름 */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="analytics" size={48} color="#4CAF50" />
          </View>
          <Text style={styles.appName}>baln</Text>
          <Text style={styles.appTagline}>올바른 투자의 시작</Text>
        </View>

        {/* 앱 정보 */}
        <View style={styles.section}>
          {appInfo.map((item, index) => (
            <View key={index} style={styles.infoItem}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* 링크 */}
        <View style={[styles.section, { marginTop: 24 }]}>
          {links.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.linkItem}
              onPress={() => router.push(item.route as any)}
            >
              <Text style={styles.linkLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#4CAF50" />
            </TouchableOpacity>
          ))}
        </View>

        {/* 저작권 */}
        <Text style={styles.copyright}>
          © 2026 발른 주식회사. All rights reserved.
        </Text>
      </View>
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appTagline: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  infoLabel: {
    fontSize: 15,
    color: '#AAAAAA',
  },
  infoValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  linkLabel: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  copyright: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 32,
  },
});
