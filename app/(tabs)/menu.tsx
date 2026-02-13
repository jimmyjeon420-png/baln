import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/hooks/useTheme';

// 이 화면은 더 이상 사용되지 않습니다 (profile.tsx로 대체됨)
// href: null로 숨김 처리되어 있지만 파일은 유지
export default function MenuScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>이 페이지는 사용되지 않습니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
  },
});
