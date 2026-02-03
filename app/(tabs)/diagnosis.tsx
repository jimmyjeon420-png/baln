import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// AI 진단 화면 - 행동 재무학 기반 투자 성향 분석
export default function DiagnosisScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI 진단</Text>
        <Text style={styles.subtitle}>나의 투자 행동 패턴을 분석합니다</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.placeholderCard}>
          <Ionicons name="pulse" size={48} color="#4CAF50" />
          <Text style={styles.placeholderText}>
            투자 성향 진단 기능이{'\n'}곧 제공될 예정입니다
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholderCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
});
