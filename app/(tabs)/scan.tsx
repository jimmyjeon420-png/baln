import { Redirect } from 'expo-router';

// 스캔 탭 - add-asset 화면으로 리다이렉트
// 탭바의 플로팅 버튼을 통해 접근
export default function ScanScreen() {
  return <Redirect href="/add-asset" />;
}
