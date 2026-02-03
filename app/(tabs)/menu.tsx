import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 이 화면은 더 이상 사용되지 않습니다 (profile.tsx로 대체됨)
// href: null로 숨김 처리되어 있지만 파일은 유지
export default function MenuScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>이 페이지는 사용되지 않습니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#888888',
    fontSize: 16,
  },
});
