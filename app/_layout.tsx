import { Stack } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* 다크 모드 배경 (#121212) - Fintech 스타일 */}
      <View style={{ flex: 1, backgroundColor: '#121212' }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          {/* (tabs) 폴더를 메인 화면으로 지정 */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* add-asset 모달 화면 */}
          <Stack.Screen
            name="add-asset"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}