import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StrategyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>전략 회의실 복구 완료 ✅</Text>
      <Text style={styles.sub}>이제 채팅 기능을 다시 연결하면 됩니다.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  sub: { fontSize: 14, color: '#666' }
});