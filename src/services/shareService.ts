/**
 * shareService.ts - 공유 URL 생성 서비스
 *
 * 역할: "홍보 부서"
 * - 맥락 카드, 예측 게임, 업적 등을 외부에 공유할 수 있는 URL 생성
 * - 딥링크 (baln://) + 웹 URL (https://baln.app/) 이중 지원
 *
 * URL 구조:
 * - 맥락 카드: baln://context/{date}  |  https://baln.app/context/{date}
 * - 예측 게임: baln://prediction/{pollId}  |  https://baln.app/prediction/{pollId}
 * - 업적 배지: baln://achievement/{badgeId}
 * - 커뮤니티: baln://community/{postId}
 */

import { Share, Platform } from 'react-native';
import { t as rawT } from '../locales';

// 앱 딥링크 스킴 (app.json의 "scheme": "baln"과 일치)
const APP_SCHEME = 'baln';

// 웹 도메인 (앱 미설치 유저가 접근할 웹 주소)
const WEB_DOMAIN = 'baln.app';

// 공유 가능한 콘텐츠 유형
type ShareType = 'context' | 'prediction' | 'achievement' | 'community';

// 공유 메시지 생성 시 전달할 추가 데이터
interface ShareData {
  /** 맥락 카드 헤드라인 또는 예측 질문 등 */
  headline?: string;
  question?: string;
  name?: string;
  title?: string;
}

/**
 * 딥링크 URL 생성
 * - 앱이 설치된 유저가 클릭하면 앱 내 해당 화면으로 바로 이동
 * - 예: baln://context/2026-02-10
 */
export function createDeepLink(type: ShareType, id: string): string {
  return `${APP_SCHEME}://${type}/${id}`;
}

/**
 * 웹 URL 생성
 * - 앱이 설치되지 않은 유저도 브라우저에서 열 수 있는 URL
 * - 예: https://baln.app/context/2026-02-10
 */
export function createWebLink(type: ShareType, id: string): string {
  return `https://${WEB_DOMAIN}/${type}/${id}`;
}

/**
 * 공유 텍스트 생성
 * - 콘텐츠 유형에 따라 적절한 한국어 메시지를 만듦
 * - SNS에 공유될 때 보이는 텍스트
 */
function getShareMessage(type: ShareType, data?: ShareData): string {
  switch (type) {
    case 'context':
      // Context card share: send today's market analysis to a friend
      return rawT('share.message.context', {
        headline: data?.headline || rawT('share.message.context_default'),
      });

    case 'prediction':
      // Prediction game share: send a prediction question to a friend
      return rawT('share.message.prediction', {
        question: data?.question || rawT('share.message.prediction_default'),
      });

    case 'achievement':
      // Achievement badge share: show off an earned badge
      return rawT('share.message.achievement', {
        name: data?.name || '',
      });

    case 'community':
      // Community post share: share a VIP lounge post
      return rawT('share.message.community', {
        title: data?.title || rawT('share.message.community_default'),
      });

    default:
      return rawT('share.message.default_cta');
  }
}

/**
 * 네이티브 공유 다이얼로그 열기
 * - OS 기본 공유 시트(카카오톡, 인스타, 메시지 등)를 띄움
 * - 웹 URL + 공유 메시지를 함께 전달
 *
 * @param type - 공유할 콘텐츠 유형 (context, prediction, achievement, community)
 * @param id - 해당 콘텐츠의 고유 ID (날짜, pollId, badgeId, postId 등)
 * @param data - 공유 메시지에 포함할 추가 데이터 (헤드라인, 질문 등)
 * @returns 공유 성공 여부 (true: 공유 완료, false: 취소 또는 실패)
 */
export async function shareContent(
  type: ShareType,
  id: string,
  data?: ShareData
): Promise<boolean> {
  try {
    const webLink = createWebLink(type, id);
    const message = getShareMessage(type, data);

    const result = await Share.share({
      // 공유 메시지 + 웹 링크를 함께 전달
      message: `${message}\n\n${webLink}`,
      // iOS에서는 url 필드를 별도로 전달해야 링크 미리보기가 표시됨
      url: Platform.OS === 'ios' ? webLink : undefined,
    });

    // 유저가 실제로 공유했는지 확인 (취소하면 dismissedAction)
    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('[Share] 공유 실패:', error);
    return false;
  }
}
