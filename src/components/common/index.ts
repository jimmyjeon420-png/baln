/**
 * 공통 컴포넌트 중앙 export
 * 다른 파일에서 import를 쉽게 하기 위한 index 파일입니다.
 *
 * @example
 * import { SectionHeader, StatusBadge } from '@/components/common';
 * import { SkeletonLoader, SkeletonCard, SkeletonText } from '@/components/common';
 */

export { SectionHeader } from './SectionHeader';
export { StatusBadge } from './StatusBadge';
export type { BadgeType } from './StatusBadge';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as Toast } from './Toast';
export type { ToastType } from './Toast';
export { default as OfflineBanner } from './OfflineBanner';
export { default as Skeleton } from './Skeleton';

// 스켈레톤 로더 프리셋 (SkeletonLoader.tsx)
export {
  SkeletonLoader,
  SkeletonCard,
  SkeletonText,
  SkeletonAvatar,
  SkeletonChart,
} from './SkeletonLoader';

// 크레딧 시스템 컴포넌트
export { CreditDisplay } from './CreditDisplay';
export { CreditChip } from './CreditChip';
