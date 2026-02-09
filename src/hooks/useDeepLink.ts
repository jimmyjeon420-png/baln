/**
 * useDeepLink.ts - 딥링크 수신 처리 훅
 *
 * 역할: "안내 데스크"
 * - 앱이 딥링크(baln://context/2026-02-10)로 열렸을 때 해당 화면으로 자동 이동
 * - 앱이 이미 열린 상태에서 딥링크를 받아도 처리 가능
 *
 * 사용 방법:
 * - _layout.tsx 등 최상위 컴포넌트에서 useDeepLink()를 호출하면 자동으로 작동
 * - 현재는 독립 파일로 생성하며, 사용자가 나중에 _layout.tsx에 통합
 *
 * 지원하는 딥링크 패턴:
 * - baln://context/{date}       → 오늘 탭 (맥락 카드)
 * - baln://prediction/{pollId}  → 예측 게임 화면
 * - baln://achievement/{badgeId} → 업적 화면
 * - baln://community/{postId}   → 커뮤니티 게시글 상세
 */

import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * 딥링크 URL을 파싱하여 적절한 화면으로 이동하는 내부 함수
 *
 * @param url - 수신된 딥링크 URL (예: baln://context/2026-02-10)
 * @param router - Expo Router 인스턴스 (화면 이동에 사용)
 */
function handleDeepLink(url: string, router: any) {
  try {
    // URL 파싱: baln://context/2026-02-10 → host="context", pathname="/2026-02-10"
    const parsed = new URL(url);

    // host 부분이 콘텐츠 타입 (context, prediction, achievement, community)
    // pathname 부분이 콘텐츠 ID (날짜, pollId, badgeId, postId)
    const pathParts = parsed.pathname.replace(/^\//, '').split('/');
    const type = parsed.host || pathParts[0];
    const id = pathParts[parsed.host ? 0 : 1];

    console.log(`[DeepLink] 수신: type=${type}, id=${id}`);

    switch (type) {
      case 'context':
        // 맥락 카드 딥링크 → 오늘 탭(홈)으로 이동
        router.replace('/(tabs)');
        break;

      case 'prediction':
        // 예측 게임 딥링크 → 예측 게임 화면으로 이동
        router.push('/games/predictions');
        break;

      case 'achievement':
        // 업적 딥링크 → 업적 화면으로 이동
        router.push('/achievements');
        break;

      case 'community':
        // 커뮤니티 딥링크 → 해당 게시글 상세 화면으로 이동
        if (id) {
          router.push(`/community/${id}`);
        }
        break;

      default:
        console.log('[DeepLink] 알 수 없는 타입:', type);
        break;
    }
  } catch (e) {
    console.error('[DeepLink] URL 파싱 실패:', e);
  }
}

/**
 * 딥링크 수신 처리 훅
 *
 * - 앱이 이미 열린 상태에서 딥링크 수신: Linking 이벤트 리스너로 처리
 * - 앱이 딥링크로 처음 열린 경우: getInitialURL()로 처리
 * - 외부 패키지 없이 React Native 기본 Linking API만 사용
 */
export function useDeepLink() {
  const router = useRouter();

  useEffect(() => {
    // 1. 앱이 이미 열린 상태에서 딥링크가 들어온 경우 (백그라운드 → 포그라운드)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url, router);
    });

    // 2. 앱이 딥링크로 처음 열린 경우 (콜드 스타트)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url, router);
      }
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => subscription.remove();
  }, [router]);
}
