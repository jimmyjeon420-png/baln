import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 처방전 화면 - AI 기반 리밸런싱 추천
export default function RebalanceScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>처방전</Text>
        <Text style={styles.subtitle}>AI가 제안하는 최적의 리밸런싱</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.placeholderCard}>
          <Ionicons name="map" size={48} color="#4CAF50" />
          <Text style={styles.placeholderText}>
            자산을 먼저 등록하면{'\n'}맞춤형 처방전을 받을 수 있습니다
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
