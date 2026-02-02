import { Stack } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    // 배경을 강제로 흰색으로 지정하여 검은 화면 방지
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* (tabs) 폴더를 메인 화면으로 지정 */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}