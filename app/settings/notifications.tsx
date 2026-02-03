/**
 * 알림 설정 화면
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [rebalanceAlert, setRebalanceAlert] = useState(true);
  const [priceAlert, setPriceAlert] = useState(false);
  const [marketNews, setMarketNews] = useState(true);

  const notificationSettings = [
    {
      label: '푸시 알림',
      description: '모든 알림 수신 허용',
      value: pushEnabled,
      onToggle: setPushEnabled,
    },
    {
      label: '리밸런싱 알림',
      description: '리밸런싱 추천 시 알림',
      value: rebalanceAlert,
      onToggle: setRebalanceAlert,
    },
    {
      label: '가격 변동 알림',
      description: '급격한 가격 변동 시 알림',
      value: priceAlert,
      onToggle: setPriceAlert,
    },
    {
      label: '시장 뉴스',
      description: '중요한 시장 뉴스 알림',
      value: marketNews,
      onToggle: setMarketNews,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 설정</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 설정 목록 */}
      <View style={styles.content}>
        <View style={styles.section}>
          {notificationSettings.map((item, index) => (
            <View key={index} style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingDescription}>{item.description}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onToggle}
                trackColor={{ false: '#333333', true: '#4CAF50' }}
                thumbColor={item.value ? '#FFFFFF' : '#888888'}
              />
            </View>
          ))}
        </View>
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
  section: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingDescription: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
});
