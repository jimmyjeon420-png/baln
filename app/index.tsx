import { Redirect } from 'expo-router';
import { View, Text } from 'react-native';

export default function StartPage() {
  // 앱이 켜지면 즉시 '홈(tabs)'으로 이동시킵니다.
  return <Redirect href="/(tabs)" />;
}