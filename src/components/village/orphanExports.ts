/**
 * orphanExports — 마을 관련 orphan 컴포넌트/훅 배럴 내보내기
 *
 * 역할: 마을 탭 통합 작업 시 한 곳에서 import할 수 있도록
 *       흩어져 있던 컴포넌트와 훅을 모아 재수출
 *
 * 사용:
 *   import { LetterInbox, LetterDetail, useUserAvatar } from '../components/village/orphanExports';
 */

// 편지 UI 컴포넌트
export { LetterInbox } from './LetterInbox';
export { LetterDetail } from './LetterDetail';

// 오늘 탭용 뉴스 반응 카드
export { default as NewsReactionCard } from '../home/NewsReactionCard';

// 사용자 아바타 훅
export { useUserAvatar } from '../../hooks/useUserAvatar';

// 마을 분석 훅
export { useVillageAnalytics } from '../../hooks/useVillageAnalytics';

// 알림 헬퍼
export { getNotificationContent } from '../../services/villageNotificationHelper';
