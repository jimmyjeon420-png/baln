/**
 * VIP 라운지 - 커뮤니티 + 모임 통합 화면
 *
 * 세그먼트 컨트롤로 두 섹션 전환:
 *   커뮤니티(기본): 게시글/댓글/좋아요 (100만+ 열람, 300만+ 댓글, 3,000만+ 글쓰기)
 *   모임: 스터디/정기모임/네트워킹/워크샵 (100만+ 열람, 1억+ 모임 생성)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useLoungeEligibility,
  useCommunityPosts,
  useCreatePost,
  useLikePost,
  useMyLikes,
  PostSortBy,
  generateAssetMix,
} from '../../src/hooks/useCommunity';
import {
  useGatherings,
  useHostingEligibility,
  formatAssetInBillion,
  TIER_COLORS,
} from '../../src/hooks/useGatherings';
import CommunityPostCard from '../../src/components/CommunityPostCard';
import GatheringCard from '../../src/components/GatheringCard';
import { LoungeSkeleton } from '../../src/components/SkeletonLoader';
import VerifyAssetsModal from '../../src/components/lounge/VerifyAssetsModal';
import SilverMotivationBanner from '../../src/components/lounge/SilverMotivationBanner';
import { useVerificationStatus } from '../../src/hooks/useVerification';
import { getTierFeatures as _getTierFeatures } from '../../src/config/tierFeatures';
import {
  CATEGORY_INFO,
  getCategoryLabel,
  CommunityCategory,
  CommunityCategoryFilter,
  LOUNGE_VIEW_THRESHOLD,
  LOUNGE_COMMENT_THRESHOLD,
  LOUNGE_POST_THRESHOLD,
  TIER_THRESHOLDS,
} from '../../src/types/community';
import { formatAssetAmount, formatCommunityDisplayTag } from '../../src/utils/communityUtils';
import { getLocaleCode } from '../../src/utils/formatters';
import { Gathering } from '../../src/types/database';
import { useTheme } from '../../src/hooks/useTheme';
import type { ThemeColors } from '../../src/styles/colors';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { useLocale } from '../../src/context/LocaleContext';
import { useWeather } from '../../src/hooks/useWeather';
import { getDailyQuote } from '../../src/data/guruQuoteBank';
import WeatherBadge from '../../src/components/common/WeatherBadge';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';
import { useScreenTracking } from '../../src/hooks/useAnalytics';
import CafeAmbiance from '../../src/components/lounge/CafeAmbiance';
import InviteBanner from '../../src/components/lounge/InviteBanner';
// 세계관 강화: 카페 테이블, 구루 방문 배너, 카페 등급
import GuruVisitBanner from '../../src/components/lounge/GuruVisitBanner';
import CafeTableList from '../../src/components/lounge/CafeTableList';
import CafeRankBadge from '../../src/components/lounge/CafeRankBadge';
import { useCafeFeatures } from '../../src/hooks/useCafeFeatures';
import type { CafeTable } from '../../src/data/cafeConfig';
// Apple Guideline 1.2: 차단 + EULA + 콘텐츠 필터
import { useBlockedUserIds } from '../../src/hooks/useUserBlocks';
import BlockUserModal from '../../src/components/community/BlockUserModal';
import CommunityTermsModal, { hasCommunityTermsAccepted } from '../../src/components/community/CommunityTermsModal';
import { filterContent, getFilterMessage } from '../../src/utils/contentFilter';

// ══════════════════════════════════════════
// 상수
// ══════════════════════════════════════════

type Segment = 'community' | 'gatherings';

// 커뮤니티 정렬 옵션 (labels resolved at render time via t())
const SORT_OPTION_KEYS: { key: PostSortBy; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'latest', labelKey: 'lounge.sort_latest', icon: 'time-outline' },
  { key: 'popular', labelKey: 'lounge.sort_popular', icon: 'heart-outline' },
  { key: 'hot', labelKey: 'lounge.sort_comments', icon: 'chatbubble-outline' },
];

// 모임 카테고리 필터 (labels resolved at render time via t())
const GATHERING_CATEGORY_FILTER_KEYS: { key: Gathering['category'] | 'all'; labelKey: string }[] = [
  { key: 'all', labelKey: 'lounge.filter_all' },
  { key: 'study', labelKey: 'lounge.filter_study' },
  { key: 'meeting', labelKey: 'lounge.filter_meeting' },
  { key: 'networking', labelKey: 'lounge.filter_networking' },
  { key: 'workshop', labelKey: 'lounge.filter_workshop' },
];

// ══════════════════════════════════════════
// 진단 함수
// ══════════════════════════════════════════

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function runLoungeDiagnostic(): Promise<string> {
  const results: string[] = [];
  const ts = new Date().toLocaleTimeString(getLocaleCode());
  results.push(`[VIP Lounge Diagnostic] ${ts}\n`);

  // 1. Auth 세션
  try {
    const user = await getCurrentUser();
    results.push(`1. Auth: ${user ? 'OK (' + user.id.slice(0, 8) + '...)' : 'NO SESSION'}`);
  } catch (e: unknown) {
    results.push(`1. Auth: ERROR - ${errMsg(e)}`);
  }

  // 2. community_posts 테이블
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('id')
      .limit(1);
    if (error) {
      results.push(`2. community_posts: ERROR - ${error.message}`);
    } else {
      results.push(`2. community_posts: OK (${data?.length ?? 0} rows sample)`);
    }
  } catch (e: unknown) {
    results.push(`2. community_posts: EXCEPTION - ${errMsg(e)}`);
  }

  // 3. community_likes 테이블
  try {
    const { error } = await supabase
      .from('community_likes')
      .select('post_id')
      .limit(1);
    if (error) {
      results.push(`3. community_likes: ERROR - ${error.message}`);
    } else {
      results.push(`3. community_likes: OK`);
    }
  } catch (e: unknown) {
    results.push(`3. community_likes: EXCEPTION - ${errMsg(e)}`);
  }

  // 4. gatherings 테이블
  try {
    const { data, error } = await supabase
      .from('gatherings')
      .select('id')
      .limit(1);
    if (error) {
      results.push(`4. gatherings: ERROR - ${error.message}`);
    } else {
      results.push(`4. gatherings: OK (${data?.length ?? 0} rows sample)`);
    }
  } catch (e: unknown) {
    results.push(`4. gatherings: EXCEPTION - ${errMsg(e)}`);
  }

  // 5. portfolios (자격확인용)
  try {
    const user = await getCurrentUser();
    if (user) {
      const { data, error } = await supabase
        .from('portfolios')
        .select('current_value')
        .eq('user_id', user.id)
        .limit(3);
      if (error) {
        results.push(`5. portfolios: ERROR - ${error.message}`);
      } else {
        const total = (data || []).reduce((s, r) => s + (r.current_value || 0), 0);
        results.push(`5. portfolios: OK (${data?.length ?? 0} assets, total: ${total.toLocaleString()})`);
      }
    } else {
      results.push(`5. portfolios: SKIP (no auth)`);
    }
  } catch (e: unknown) {
    results.push(`5. portfolios: EXCEPTION - ${errMsg(e)}`);
  }

  // 6. profiles 테이블
  try {
    const user = await getCurrentUser();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        results.push(`6. profiles: ERROR - ${error.message}`);
      } else {
        results.push(`6. profiles: OK (${data?.full_name || data?.email || 'no name'})`);
      }
    } else {
      results.push(`6. profiles: SKIP (no auth)`);
    }
  } catch (e: unknown) {
    results.push(`6. profiles: EXCEPTION - ${errMsg(e)}`);
  }

  return results.join('\n');
}

// ══════════════════════════════════════════
// 최외곽 안전망 (Class Component — 외부 의존성 ZERO)
// useSafeAreaInsets / useTheme 크래시도 잡음
// Ionicons 등 외부 컴포넌트 사용 금지 (에러 UI가 또 크래시하면 안됨)
// ══════════════════════════════════════════

class SafeLoungeWrapper extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      '[SafeLoungeWrapper] 라운지 전체 크래시:',
      error.name, error.message,
      '\nStack:', error.stack?.substring(0, 500),
      '\nComponent:', info.componentStack?.substring(0, 500),
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A', padding: 32, paddingTop: 60 }}>
          <Text style={{ fontSize: 48 }}>{'⚠️'}</Text>
          <Text style={{ color: '#FAFAFA', fontSize: 21, fontWeight: '700', marginTop: 16 }}>
            VIP Lounge Error
          </Text>
          <Text style={{ color: '#AAA', fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 21 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 24, backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 17 }}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              try {
                const result = await runLoungeDiagnostic();
                Alert.alert('VIP Lounge Diagnostic', result);
              } catch (e: unknown) {
                Alert.alert('Diagnostic Failed', errMsg(e));
              }
            }}
            style={{ marginTop: 12, backgroundColor: '#2196F3', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 17 }}>Diagnose</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ══════════════════════════════════════════
// 로컬 에러 바운더리 (Class Component)
// 에러 UI에 Ionicons 사용 금지 — 에러 렌더 자체가 크래시하면 안됨
// ══════════════════════════════════════════

interface LoungeErrorState {
  hasError: boolean;
  error: Error | null;
  diagnosticResult: string | null;
  isDiagnosing: boolean;
}

class LoungeErrorBoundary extends React.Component<
  { children: React.ReactNode; themeColors: ThemeColors; insets: { top: number; bottom: number; left: number; right: number } },
  LoungeErrorState
> {
  constructor(props: { children: React.ReactNode; themeColors: ThemeColors; insets: { top: number; bottom: number; left: number; right: number } }) {
    super(props);
    this.state = { hasError: false, error: null, diagnosticResult: null, isDiagnosing: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      '[LoungeErrorBoundary] 내부 크래시:',
      error.name, error.message,
      '\nStack:', error.stack?.substring(0, 500),
      '\nComponent:', info.componentStack?.substring(0, 500),
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, diagnosticResult: null });
  };

  handleDiagnose = async () => {
    this.setState({ isDiagnosing: true });
    try {
      const result = await runLoungeDiagnostic();
      this.setState({ diagnosticResult: result, isDiagnosing: false });
      Alert.alert('VIP Lounge Diagnostic', result);
    } catch (e: unknown) {
      this.setState({ isDiagnosing: false });
      Alert.alert('Diagnostic Failed', errMsg(e));
    }
  };

  render() {
    if (this.state.hasError) {
      const { insets } = this.props;
      // 에러 UI: Ionicons 사용 금지, 인라인 스타일만 사용 (추가 크래시 방지)
      return (
        <View style={[styles.container, { paddingTop: insets?.top || 44, backgroundColor: '#0A0A0A' }]}>
          <View style={styles.loadingContainer}>
            <Text style={{ fontSize: 48 }}>{'⚠️'}</Text>
            <Text style={{ color: '#FAFAFA', fontSize: 21, fontWeight: '700', marginTop: 16 }}>
              Failed to Load Lounge
            </Text>
            <Text style={{ color: '#8A8A8A', textAlign: 'center', marginTop: 8, fontSize: 14, lineHeight: 21, paddingHorizontal: 32 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                onPress={this.handleRetry}
              >
                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 16 }}>Retry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: '#2196F3', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                onPress={this.handleDiagnose}
                disabled={this.state.isDiagnosing}
              >
                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 16 }}>
                  {this.state.isDiagnosing ? 'Diagnosing...' : 'Diagnose'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// ══════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════

function LoungeScreenInner() {
  useScreenTracking('lounge');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, colors: themeColors } = useTheme();
  const isLightTheme = theme === 'light';
  const activePillTextColor = '#FFFFFF';
  const vipBadgeColor = isLightTheme ? '#0B4A6F' : '#B9F2FF';
  const vipBadgeBackground = isLightTheme ? '#DFF2FF' : 'rgba(185, 242, 255, 0.15)';
  const vipBadgeBorder = isLightTheme ? '#B6E3FF' : 'rgba(185, 242, 255, 0.28)';
  const sortChipInactiveTextColor = isLightTheme ? themeColors.textSecondary : '#F2F6FA';
  const sortChipInactiveIconColor = isLightTheme ? themeColors.textSecondary : '#E7EDF4';
  const welcomeBannerBackground = isLightTheme ? '#EAF4ED' : 'rgba(76, 175, 80, 0.08)';
  const welcomeBannerTitleColor = isLightTheme ? (themeColors.primaryDark || '#1F6A25') : '#4CAF50';

  // 구루 카페 분위기
  const { t } = useLocale();
  const { weather } = useWeather();
  const dailyQuote = getDailyQuote();

  // 자산 인증 상태
  const { data: verificationStatus, invalidate: invalidateVerification } = useVerificationStatus();
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);

  // 세그먼트 상태
  const [activeSegment, setActiveSegment] = useState<Segment>('community');

  // 커뮤니티 상태
  const [communityCategory, setCommunityCategory] = useState<CommunityCategoryFilter>('all');
  const [sortBy, setSortBy] = useState<PostSortBy>('latest');
  const [newPostContent, setNewPostContent] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [postCategory, setPostCategory] = useState<CommunityCategory>('stocks');

  // 카페 세계관 기능 (구루 방문, 등급, 리액션)
  const { visitingGurus, cafeRank } = useCafeFeatures();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Apple 1.2: 차단 + EULA + 콘텐츠 모더레이션
  const { data: blockedUserIds } = useBlockedUserIds();
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [blockTargetUserId, setBlockTargetUserId] = useState('');
  const [blockTargetType, setBlockTargetType] = useState<'post' | 'comment'>('post');
  const [blockTargetId, setBlockTargetId] = useState('');
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [_termsAccepted, setTermsAccepted] = useState(true); // optimistic — check on mount

  // Apple 1.2: 라운지 진입 시 EULA 동의 확인 (UGC 접근 전 필수)
  React.useEffect(() => {
    (async () => {
      const accepted = await hasCommunityTermsAccepted();
      if (!accepted) {
        setTermsAccepted(false);
        setTermsModalVisible(true);
      }
    })();
  }, []);

  // 모임 상태
  const [gatheringCategory, setGatheringCategory] = useState<Gathering['category'] | 'all'>('all');

  // 공통 상태
  const [refreshing, setRefreshing] = useState(false);
  const commentRequirementLabel = formatAssetAmount(LOUNGE_COMMENT_THRESHOLD);
  const postRequirementLabel = formatAssetAmount(LOUNGE_POST_THRESHOLD);

  // ── 훅 (각각 try-catch 내장) ──
  const { eligibility, loading: eligibilityLoading, error: eligibilityError, refetch: refetchEligibility } = useLoungeEligibility();
  const { assets } = useSharedPortfolio();
  const {
    data: postsData,
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityPosts(communityCategory, sortBy);
  const { data: myLikes } = useMyLikes();
  const createPost = useCreatePost();
  const likePost = useLikePost();
  const { data: hostingEligibility } = useHostingEligibility();
  const {
    data: gatherings,
    isLoading: gatheringsLoading,
    isError: gatheringsError,
    refetch: refetchGatherings,
  } = useGatherings(
    gatheringCategory === 'all' ? undefined : gatheringCategory
  );

  // 무한 스크롤 페이지 플래트닝 (방어적) + 차단 사용자 필터링
  const posts = useMemo(() => {
    try {
      const allPosts = postsData?.pages?.flat() ?? [];
      // Apple 1.2: 차단된 사용자 게시물 즉시 피드에서 제거
      if (blockedUserIds && blockedUserIds.length > 0) {
        const blockedSet = new Set(blockedUserIds);
        return allPosts.filter(p => !blockedSet.has(p.user_id));
      }
      return allPosts;
    } catch {
      return [];
    }
  }, [postsData, blockedUserIds]);

  // ── 새로고침 (세그먼트별 분기) ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeSegment === 'community') {
        await Promise.all([refetchEligibility(), refetchPosts()]);
      } else {
        await Promise.all([refetchEligibility(), refetchGatherings()]);
      }
    } catch (e) {
      console.warn('[Lounge] 새로고침 실패:', e);
    }
    setRefreshing(false);
  }, [activeSegment, refetchEligibility, refetchPosts, refetchGatherings]);

  // ── 핸들러: 커뮤니티 ──
  const handleSubmitPost = async () => {
    if (!newPostContent.trim()) {
      Alert.alert(t('lounge.alert_title'), t('lounge.alert_content_required'));
      return;
    }
    if (newPostContent.length > 500) {
      Alert.alert(t('lounge.alert_title'), t('lounge.alert_content_too_long'));
      return;
    }
    // Apple 1.2: 콘텐츠 필터링 (부적절 콘텐츠 사전 차단)
    const filterResult = filterContent(newPostContent);
    if (!filterResult.isClean) {
      const msg = getFilterMessage(newPostContent) || t('lounge.filter_default_message');
      Alert.alert(t('lounge.filter_blocked_title'), msg);
      return;
    }
    try {
      // 자산 믹스 동적 계산
      const totalAssets = eligibility?.totalAssets ?? 0;
      const ASSET_TYPE_LOUNGE: Record<string, string> = {
        liquid: t('lounge.assetType.liquid'), LIQUID: t('lounge.assetType.liquid'),
        illiquid: t('lounge.assetType.illiquid'), ILLIQUID: t('lounge.assetType.illiquid'),
        other: t('lounge.assetType.other'),
      };
      const illiquidLabel = t('lounge.assetType.illiquid');
      const byCat: Record<string, number> = {};
      assets.forEach((a) => {
        const raw = (a.assetType as string) || 'other';
        const cat = ASSET_TYPE_LOUNGE[raw] ?? raw;
        const rawValue = Number(a.currentValue) || 0;
        const debtAmount = Number(a.debtAmount) || 0;
        const normalizedValue = cat === illiquidLabel
          ? Math.max(0, rawValue - debtAmount)
          : Math.max(0, rawValue);
        byCat[cat] = (byCat[cat] || 0) + normalizedValue;
      });
      const mixCategories = Object.entries(byCat)
        .filter(([, v]) => v > 0)
        .map(([cat, v]) => ({ category: cat, percentage: Math.round((v / Math.max(totalAssets, 1)) * 100) }));
      const computedAssetMix = generateAssetMix(mixCategories) || t('lounge.assetType.diverse');

      await createPost.mutateAsync({
        content: newPostContent.trim(),
        category: postCategory,
        displayTag: formatCommunityDisplayTag(totalAssets),
        assetMix: computedAssetMix,
        totalAssets,
      });
      setNewPostContent('');
      setPostCategory('stocks');
      setIsComposing(false);
      Alert.alert(t('lounge.post_success_title'), t('lounge.post_success_message'));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(t('lounge.post_error_title'), `${t('lounge.post_error_prefix')}${msg}`);
    }
  };

  const handleLike = (postId: string) => likePost.mutate(postId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePostPress = (postId: string) => { try { router.push(`/community/${postId}` as any); } catch (err) { Sentry.captureException(err); } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAuthorPress = (userId: string) => { try { router.push(`/community/author/${userId}` as any); } catch (err) { Sentry.captureException(err); } };

  const handleComposePress = async () => {
    if (!eligibility?.canPost) {
      Alert.alert(
        t('lounge.compose_limit_title'),
        t('lounge.compose_limit_message', { requirement: postRequirementLabel, current: formatAssetAmount(eligibility?.totalAssets ?? 0) }),
        [{ text: t('lounge.compose_limit_ok') }]
      );
      return;
    }
    // Apple 1.2: EULA 동의 확인
    const accepted = await hasCommunityTermsAccepted();
    if (!accepted) {
      setTermsModalVisible(true);
      return;
    }
    setIsComposing(true);
  };

  // Apple 1.2: 사용자 차단 핸들러
  const _handleBlockUser = (userId: string, contentId: string, contentType: 'post' | 'comment' = 'post') => {
    setBlockTargetUserId(userId);
    setBlockTargetId(contentId);
    setBlockTargetType(contentType);
    setBlockModalVisible(true);
  };

  // ── 핸들러: 모임 ──
  const handleGatheringPress = (gathering: Gathering) => { try { router.push(`/gatherings/${gathering.id}`); } catch (err) { Sentry.captureException(err); } };
  const handleCreateGathering = () => { try { router.push('/gatherings/create'); } catch (err) { Sentry.captureException(err); } };

  // ── 진단 ──
  const handleDiagnose = async () => {
    try {
      const result = await runLoungeDiagnostic();
      Alert.alert(t('lounge.pulse_diagnostic_title'), result);
    } catch (e: unknown) {
      Alert.alert(t('lounge.diagnostic_fail'), errMsg(e));
    }
  };

  // ══════════════════════════════════════════
  // 에러 상태: 포트폴리오 조회 실패 시 크래시 대신 재시도 UI
  // ══════════════════════════════════════════
  if (eligibilityError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('lounge.title')}</Text>
            <View style={[styles.vipBadge, { backgroundColor: vipBadgeBackground, borderColor: vipBadgeBorder }]}>
              <Ionicons name="diamond" size={14} color={vipBadgeColor} />
              <Text style={[styles.vipBadgeText, { color: vipBadgeColor }]}>PRIVATE</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>{'🔄'}</Text>
          <Text style={[styles.loadingText, { color: themeColors.textPrimary, fontSize: 17, fontWeight: '600' }]}>
            {t('lounge.network_check')}
          </Text>
          <Text style={[styles.loadingText, { color: themeColors.textTertiary, marginTop: 8 }]}>
            {t('lounge.portfolio_load_error')}
          </Text>
          <TouchableOpacity
            onPress={() => refetchEligibility()}
            style={{ marginTop: 24, backgroundColor: '#4CAF50', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 17 }}>{t('lounge.try_again')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════
  // 로딩 상태
  // ══════════════════════════════════════════
  if (eligibilityLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('lounge.title')}</Text>
            <View style={[styles.vipBadge, { backgroundColor: vipBadgeBackground, borderColor: vipBadgeBorder }]}>
              <Ionicons name="diamond" size={14} color={vipBadgeColor} />
              <Text style={[styles.vipBadgeText, { color: vipBadgeColor }]}>PRIVATE</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textTertiary }]}>{t('lounge.checking_eligibility')}</Text>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════
  // 잠금 화면: 100만원 미만
  // ══════════════════════════════════════════
  if (!eligibility?.isEligible) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('lounge.title')}</Text>
            <View style={[styles.vipBadge, { backgroundColor: vipBadgeBackground, borderColor: vipBadgeBorder }]}>
              <Ionicons name="diamond" size={14} color={vipBadgeColor} />
              <Text style={[styles.vipBadgeText, { color: vipBadgeColor }]}>PRIVATE</Text>
            </View>
          </View>
          {/* 진단 버튼 */}
          <TouchableOpacity onPress={handleDiagnose} style={{ padding: 8 }}>
            <Ionicons name="pulse" size={22} color={themeColors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* 잠금 본문 */}
        <View style={styles.lockedContainer}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={64} color="#FFC107" />
          </View>

          <Text style={[styles.lockedTitle, { color: themeColors.textPrimary }]}>{t('lounge.locked_title')}</Text>
          <Text style={[styles.lockedSubtitle, { color: themeColors.textTertiary }]}>
            {t('lounge.locked_subtitle')}
          </Text>

          {/* 등급 안내 */}
          <View style={[styles.accessGuide, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.accessGuideTitle, { color: themeColors.textPrimary }]}>{t('lounge.access_guide_title')}</Text>

            <View style={styles.accessTier}>
              <View style={[styles.accessDot, { backgroundColor: '#4CAF50' }]} />
              <View style={styles.accessTierContent}>
                <Text style={[styles.accessTierLabel, { color: themeColors.textPrimary }]}>{t('lounge.access_view_label')}</Text>
                <Text style={[styles.accessTierReq, { color: themeColors.textTertiary }]}>{t('lounge.access_view_req')}</Text>
              </View>
              <Ionicons
                name={(eligibility?.totalAssets ?? 0) >= LOUNGE_VIEW_THRESHOLD ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={(eligibility?.totalAssets ?? 0) >= LOUNGE_VIEW_THRESHOLD ? '#4CAF50' : '#555'}
              />
            </View>

            <View style={styles.accessTier}>
              <View style={[styles.accessDot, { backgroundColor: '#2196F3' }]} />
              <View style={styles.accessTierContent}>
                <Text style={[styles.accessTierLabel, { color: themeColors.textPrimary }]}>{t('lounge.access_comment_label')}</Text>
                <Text style={[styles.accessTierReq, { color: themeColors.textTertiary }]}>{t('lounge.access_comment_req', { requirement: commentRequirementLabel })}</Text>
              </View>
              <Ionicons
                name={(eligibility?.totalAssets ?? 0) >= LOUNGE_COMMENT_THRESHOLD ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={(eligibility?.totalAssets ?? 0) >= LOUNGE_COMMENT_THRESHOLD ? '#4CAF50' : '#555'}
              />
            </View>

            <View style={styles.accessTier}>
              <View style={[styles.accessDot, { backgroundColor: '#FFD700' }]} />
              <View style={styles.accessTierContent}>
                <Text style={[styles.accessTierLabel, { color: themeColors.textPrimary }]}>{t('lounge.access_post_label')}</Text>
                <Text style={[styles.accessTierReq, { color: themeColors.textTertiary }]}>{t('lounge.access_post_req', { requirement: postRequirementLabel })}</Text>
              </View>
              <Ionicons
                name={(eligibility?.totalAssets ?? 0) >= LOUNGE_POST_THRESHOLD ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={(eligibility?.totalAssets ?? 0) >= LOUNGE_POST_THRESHOLD ? '#4CAF50' : '#555'}
              />
            </View>
          </View>

          {/* 현재 자산 진행률 */}
          <View style={[styles.progressSection, { backgroundColor: themeColors.surface }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: themeColors.textTertiary }]}>{t('lounge.progress_label')}</Text>
              <Text style={[styles.progressValue, { color: themeColors.primary }]}>
                {formatAssetAmount(eligibility?.totalAssets ?? 0)}
              </Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: themeColors.border }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(((eligibility?.totalAssets ?? 0) / LOUNGE_VIEW_THRESHOLD) * 100, 100)}%`, backgroundColor: themeColors.primary },
                ]}
              />
            </View>
            <Text style={styles.progressShortfall}>
              {(eligibility?.shortfall ?? 0) > 0
                ? t('lounge.progress_shortfall', { amount: formatAssetAmount(eligibility?.shortfall ?? 0) })
                : t('lounge.progress_qualified')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.investButton}
            onPress={() => router.push('/add-asset')}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.investButtonText}>{t('lounge.add_asset_button')}</Text>
          </TouchableOpacity>

          <Text style={[styles.verificationNote, { color: themeColors.textTertiary }]}>
            {t('lounge.verification_note')}
          </Text>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════
  // 메인 화면 (100만원 이상 — 입장 완료)
  // ══════════════════════════════════════════
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('lounge.title')}</Text>
            <View style={[styles.vipBadge, { backgroundColor: vipBadgeBackground, borderColor: vipBadgeBorder }]}>
              <Ionicons name="diamond" size={14} color={vipBadgeColor} />
              <Text style={[styles.vipBadgeText, { color: vipBadgeColor }]}>PRIVATE</Text>
            </View>
            <CafeRankBadge rank={cafeRank} />
          </View>
          {/* 맥박 진단 버튼 */}
          <TouchableOpacity onPress={handleDiagnose} style={{ padding: 8 }}>
            <Ionicons name="pulse" size={22} color={themeColors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* 세그먼트 컨트롤 (토스 스타일 pill) */}
        <View style={styles.segmentContainer}>
          <View style={[styles.segmentControl, { backgroundColor: themeColors.surface }]}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeSegment === 'community' && { backgroundColor: themeColors.primary },
              ]}
              onPress={() => setActiveSegment('community')}
            >
              <Ionicons
                name="chatbubbles"
                size={14}
                color={activeSegment === 'community' ? activePillTextColor : themeColors.textTertiary}
              />
              <Text
                style={[
                  styles.segmentText, { color: themeColors.textTertiary },
                  activeSegment === 'community' && styles.segmentTextActive,
                ]}
              >
                {t('lounge.segment_community')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeSegment === 'gatherings' && { backgroundColor: themeColors.primary },
              ]}
              onPress={() => setActiveSegment('gatherings')}
            >
              <Ionicons
                name="calendar"
                size={14}
                color={activeSegment === 'gatherings' ? activePillTextColor : themeColors.textTertiary}
              />
              <Text
                style={[
                  styles.segmentText, { color: themeColors.textTertiary },
                  activeSegment === 'gatherings' && styles.segmentTextActive,
                ]}
              >
                {t('lounge.segment_gatherings')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ════════════ 커뮤니티 세그먼트 ════════════ */}
        {activeSegment === 'community' && (
          <>
            {/* 게시물 목록 (FlatList + 무한 스크롤) — 전체 페이지가 함께 스크롤 */}
            <FlatList
              style={{ flex: 1 }}
              data={posts}
              keyExtractor={(item) => item?.id || Math.random().toString()}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              renderItem={({ item }) => {
                if (!item) return null;
                return (
                  <CommunityPostCard
                    post={item}
                    isLiked={myLikes?.has(item.id) ?? false}
                    onLike={handleLike}
                    onPress={handlePostPress}
                    onAuthorPress={handleAuthorPress}
                  />
                );
              }}
              ListHeaderComponent={
                <>
                {/* 카페 분위기 헤더 */}
                <CafeAmbiance colors={themeColors} />
                <GuruVisitBanner visitingGurus={visitingGurus} />
                <View style={[styles.cafeHeader, { backgroundColor: themeColors.surface }]}>
                  <View style={styles.cafeHeaderRow}>
                    <Text style={[styles.cafeTitle, { color: themeColors.textPrimary }]}>
                      {'☕ '}{t('lounge.cafe_title')}
                    </Text>
                    {weather && <WeatherBadge weather={weather} compact colors={themeColors} />}
                  </View>
                  <View style={styles.cafeGuruRow}>
                    <CharacterAvatar guruId="buffett" size="sm" />
                    <CharacterAvatar guruId="dalio" size="sm" />
                    <CharacterAvatar guruId="cathie_wood" size="sm" />
                    <Text style={[styles.cafeGuruHint, { color: themeColors.textTertiary }]}>
                      {t('lounge.cafe_subtitle')}
                    </Text>
                  </View>
                  <Text style={[styles.cafeQuote, { color: themeColors.textTertiary }]}>
                    {dailyQuote.quote.length > 50
                      ? `"${dailyQuote.quote.slice(0, 50)}…"`
                      : `"${dailyQuote.quote}"`}
                  </Text>
                </View>

                {/* 카테고리 필터 */}
                <View style={[styles.categoryTabContainer, { borderBottomColor: themeColors.surfaceLight }]}>
                  {(Object.keys(CATEGORY_INFO) as CommunityCategoryFilter[]).map((key) => {
                    const info = CATEGORY_INFO[key];
                    if (!info) return null;
                    const isActive = communityCategory === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.categoryTab, { borderColor: themeColors.border, backgroundColor: themeColors.surface },
                          isActive && { backgroundColor: (info.color || '#4CAF50') + '20', borderColor: info.color || '#4CAF50' },
                        ]}
                        onPress={() => setCommunityCategory(key)}
                      >
                        <Ionicons
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          name={(info.icon || 'apps') as any}
                          size={14}
                          color={isActive ? (info.color || '#4CAF50') : themeColors.textTertiary}
                        />
                        <Text style={[
                          styles.categoryTabText,
                          { color: themeColors.textSecondary },
                          isActive && { color: info.color || '#4CAF50', fontWeight: '700' },
                        ]}>
                          {getCategoryLabel(key)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 정렬 칩 */}
                <View style={styles.sortChipContainer}>
                  {SORT_OPTION_KEYS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.sortChip, { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                        sortBy === opt.key && [styles.sortChipActive, { backgroundColor: themeColors.primary, borderColor: themeColors.primary }],
                      ]}
                      onPress={() => setSortBy(opt.key)}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={12}
                        color={sortBy === opt.key ? activePillTextColor : sortChipInactiveIconColor}
                      />
                      <Text style={[
                        styles.sortChipText,
                        { color: sortBy === opt.key ? activePillTextColor : sortChipInactiveTextColor },
                        sortBy === opt.key && styles.sortChipTextActive,
                      ]}>
                        {t(opt.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 카페 테이블 (토픽별) */}
                <CafeTableList
                  onSelectTable={(table: CafeTable) => setSelectedTableId(table.id)}
                  selectedTableId={selectedTableId}
                />

                {/* 글쓰기 영역 */}
                {isComposing && (
                  <View style={[styles.composeContainer, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.surfaceLight }]}>
                    <View style={styles.composeHeader}>
                      <Text style={[styles.composeTitle, { color: themeColors.textPrimary }]}>{t('lounge.compose_title')}</Text>
                      <TouchableOpacity onPress={() => setIsComposing(false)}>
                        <Ionicons name="close" size={24} color={themeColors.textTertiary} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.composeCategoryRow}>
                      {(['stocks', 'crypto', 'realestate'] as CommunityCategory[]).map((key) => {
                        const info = CATEGORY_INFO[key];
                        if (!info) return null;
                        const isActive = postCategory === key;
                        return (
                          <TouchableOpacity
                            key={key}
                            style={[
                              styles.composeCategoryChip, { borderColor: themeColors.border, backgroundColor: themeColors.surface },
                              isActive && { backgroundColor: (info.color || '#4CAF50') + '20', borderColor: info.color || '#4CAF50' },
                            ]}
                            onPress={() => setPostCategory(key)}
                          >
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <Ionicons name={(info.icon || 'apps') as any} size={12} color={isActive ? (info.color || '#4CAF50') : themeColors.textTertiary} />
                            <Text style={[styles.composeCategoryText, { color: themeColors.textSecondary }, isActive && { color: info.color || '#4CAF50' }]}>
                              {getCategoryLabel(key)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      style={[styles.composeInput, { backgroundColor: themeColors.surfaceLight, color: themeColors.textPrimary }]}
                      placeholder={t('lounge.compose_placeholder')}
                      placeholderTextColor={themeColors.textTertiary}
                      multiline
                      maxLength={500}
                      value={newPostContent}
                      onChangeText={setNewPostContent}
                    />
                    <View style={styles.composeFooter}>
                      <Text style={[styles.charCount, { color: themeColors.textTertiary }]}>{newPostContent.length}/500</Text>
                      <TouchableOpacity
                        style={[styles.submitButton, { opacity: newPostContent.trim() ? 1 : 0.5 }]}
                        onPress={handleSubmitPost}
                        disabled={!newPostContent.trim() || createPost.isPending}
                      >
                        {createPost.isPending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.submitButtonText}>{t('lounge.compose_post_button')}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.holdingsNotice, { color: themeColors.textTertiary }]}>
                      {t('lounge.compose_holdings_notice')}
                    </Text>
                  </View>
                )}

                <View style={[styles.welcomeBanner, { backgroundColor: welcomeBannerBackground }]}>
                  <View style={styles.welcomeTop}>
                    <Text style={styles.welcomeIcon}>{'🏦'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.welcomeText, { color: welcomeBannerTitleColor }]}>{t('lounge.welcome_greeting')}</Text>
                      <Text style={[styles.welcomeSubtext, { color: themeColors.textTertiary }]}>
                        {t('lounge.welcome_assets', { amount: formatAssetAmount(eligibility?.totalAssets ?? 0) })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.accessBadgeRow}>
                    <View style={[styles.accessBadgeItem, { backgroundColor: 'rgba(76,175,80,0.15)' }]}>
                      <Ionicons name="eye" size={12} color="#4CAF50" />
                      <Text style={[styles.accessBadgeLabel, { color: '#4CAF50' }]}>{t('lounge.badge_view')}</Text>
                    </View>
                    <View style={[
                      styles.accessBadgeItem,
                      { backgroundColor: eligibility?.canComment ? 'rgba(33,150,243,0.15)' : 'rgba(100,100,100,0.15)' },
                    ]}>
                      <Ionicons
                        name={eligibility?.canComment ? 'chatbubble' : 'lock-closed'}
                        size={12}
                        color={eligibility?.canComment ? '#2196F3' : '#666'}
                      />
                      <Text style={[
                        styles.accessBadgeLabel,
                        { color: eligibility?.canComment ? '#2196F3' : '#666' },
                      ]}>
                        {eligibility?.canComment
                          ? t('lounge.badge_comment')
                          : t('lounge.badge_comment_locked', { requirement: commentRequirementLabel })}
                      </Text>
                    </View>
                    <View style={[
                      styles.accessBadgeItem,
                      { backgroundColor: eligibility?.canPost ? 'rgba(255,215,0,0.15)' : 'rgba(100,100,100,0.15)' },
                    ]}>
                      <Ionicons
                        name={eligibility?.canPost ? 'create' : 'lock-closed'}
                        size={12}
                        color={eligibility?.canPost ? '#FFD700' : '#666'}
                      />
                      <Text style={[
                        styles.accessBadgeLabel,
                        { color: eligibility?.canPost ? '#FFD700' : '#666' },
                      ]}>
                        {eligibility?.canPost
                          ? t('lounge.badge_write')
                          : t('lounge.badge_write_locked', { requirement: postRequirementLabel })}
                      </Text>
                    </View>
                  </View>

                  {/* 자산 인증 버튼 */}
                  <TouchableOpacity
                    style={[
                      styles.verifyButton,
                      {
                        backgroundColor: verificationStatus.isVerified
                          ? 'rgba(76, 175, 80, 0.15)'
                          : 'rgba(33, 150, 243, 0.15)',
                      },
                    ]}
                    onPress={() => {
                      if (!verificationStatus.isVerified) {
                        setVerifyModalVisible(true);
                      }
                    }}
                    disabled={verificationStatus.isVerified}
                  >
                    <Text style={{ fontSize: 14 }}>
                      {verificationStatus.isVerified ? '✅' : '🔒'}
                    </Text>
                    <Text style={[
                      styles.verifyButtonText,
                      { color: verificationStatus.isVerified ? '#4CAF50' : '#2196F3' },
                    ]}>
                      {verificationStatus.isVerified
                        ? t('lounge.verified_badge')
                        : t('lounge.verify_assets_button')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* SILVER 유저 동기부여 배너 */}
                {eligibility && eligibility.totalAssets < TIER_THRESHOLDS.GOLD && (
                  <SilverMotivationBanner totalAssets={eligibility.totalAssets} />
                )}

                {/* 친구 초대 배너 */}
                <InviteBanner />

                {/* DIAMOND 전용 필터 (인라인) */}
                {eligibility && eligibility.totalAssets >= TIER_THRESHOLDS.DIAMOND && (
                  <View style={styles.diamondFilterContainer}>
                    <Text style={{ fontSize: 28 }}>{'🌰'}</Text>
                    <Text style={[styles.diamondFilterText, { color: '#B9F2FF' }]}>
                      {t('lounge.diamond_exclusive')}
                    </Text>
                  </View>
                )}
                </>
              }
              ListEmptyComponent={
                postsLoading ? (
                  <View style={styles.postsLoading}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
                  </View>
                ) : postsError ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="cloud-offline-outline" size={48} color={themeColors.textTertiary} />
                    <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>{t('lounge.posts_load_error_title')}</Text>
                    <Text style={[styles.emptyDescription, { color: themeColors.textTertiary }]}>
                      {t('lounge.posts_load_error_desc')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={48} color={themeColors.textTertiary} />
                    <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>{t('lounge.posts_empty_title')}</Text>
                    <Text style={[styles.emptyDescription, { color: themeColors.textTertiary }]}>
                      {eligibility?.canPost
                        ? t('lounge.posts_empty_can_post')
                        : t('lounge.posts_empty_locked', { requirement: postRequirementLabel })}
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={styles.postsLoading}>
                    <ActivityIndicator size="small" color={themeColors.primary} />
                  </View>
                ) : <View style={{ height: 100 }} />
              }
              onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
              onEndReachedThreshold={0.5}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={themeColors.primary}
                  colors={[themeColors.primary]}
                />
              }
            />

            {/* 글쓰기 FAB (자격 기준 충족 시 노출) */}
            {eligibility?.canPost && !isComposing && (
              <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 80 }]}
                onPress={handleComposePress}
                activeOpacity={0.8}
              >
                <Ionicons name="create" size={22} color="#FFFFFF" />
                <Text style={styles.fabText}>{t('lounge.fab_write')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ════════════ 모임 세그먼트 ════════════ */}
        {activeSegment === 'gatherings' && (
          <>
            {/* 카테고리 필터 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {GATHERING_CATEGORY_FILTER_KEYS.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.categoryChip, { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                    gatheringCategory === filter.key && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
                  ]}
                  onPress={() => setGatheringCategory(filter.key)}
                >
                  <Text
                    style={[
                      styles.categoryChipText, { color: themeColors.textSecondary },
                      gatheringCategory === filter.key && styles.categoryChipTextActive,
                    ]}
                  >
                    {t(filter.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 모임 목록 (FlatList) */}
            <FlatList
              data={gatherings ?? []}
              keyExtractor={(item) => item?.id || Math.random().toString()}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              renderItem={({ item }) => {
                if (!item) return null;
                return (
                  <GatheringCard
                    gathering={item}
                    onPress={() => handleGatheringPress(item)}
                    userTier={hostingEligibility?.tier}
                  />
                );
              }}
              ListHeaderComponent={
                <View style={[styles.gatheringWelcome, { backgroundColor: themeColors.surface }]}>
                  <View style={styles.gatheringWelcomeContent}>
                    <Text style={[styles.gatheringWelcomeTitle, { color: themeColors.textPrimary }]}>{t('lounge.gathering_welcome_title')}</Text>
                    <Text style={[styles.gatheringWelcomeSubtitle, { color: themeColors.textSecondary }]}>
                      {t('lounge.gathering_welcome_subtitle')}
                    </Text>
                  </View>
                  {hostingEligibility?.tier && (
                    <View style={[
                      styles.tierIndicator,
                      { backgroundColor: (TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS] || '#C0C0C0') + '30' },
                    ]}>
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color={TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS] || '#C0C0C0'}
                      />
                      <Text style={[
                        styles.tierText,
                        { color: TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS] || '#C0C0C0' },
                      ]}>
                        {t('lounge.gathering_verified_assets', { amount: formatAssetInBillion(hostingEligibility.verifiedAssets) })}
                      </Text>
                    </View>
                  )}
                </View>
              }
              ListEmptyComponent={
                gatheringsLoading ? (
                  <LoungeSkeleton />
                ) : gatheringsError ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="cloud-offline-outline" size={64} color={themeColors.textTertiary} />
                    <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>{t('lounge.gatherings_load_error_title')}</Text>
                    <Text style={[styles.emptyDescription, { color: themeColors.textTertiary }]}>
                      {t('lounge.gatherings_load_error_desc')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={64} color={themeColors.textTertiary} />
                    <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>{t('lounge.gatherings_empty_title')}</Text>
                    <Text style={[styles.emptyDescription, { color: themeColors.textTertiary }]}>
                      {t('lounge.gatherings_empty_desc')}
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={<View style={{ height: 100 }} />}
              contentContainerStyle={styles.gatheringsContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={themeColors.primary}
                  colors={[themeColors.primary]}
                />
              }
            />

            {/* 모임 만들기 FAB (1억+ 전용) */}
            {hostingEligibility?.canHost && (
              <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 80 }]}
                onPress={handleCreateGathering}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
                <Text style={styles.fabText}>{t('lounge.fab_create_gathering')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </KeyboardAvoidingView>

      {/* 자산 인증 모달 */}
      <VerifyAssetsModal
        visible={verifyModalVisible}
        onClose={() => setVerifyModalVisible(false)}
        totalAssets={eligibility?.totalAssets ?? 0}
        onVerified={() => {
          invalidateVerification();
          setVerifyModalVisible(false);
        }}
      />

      {/* Apple 1.2: 사용자 차단 모달 */}
      <BlockUserModal
        visible={blockModalVisible}
        targetUserId={blockTargetUserId}
        targetType={blockTargetType}
        targetId={blockTargetId}
        onClose={() => setBlockModalVisible(false)}
        onSuccess={() => setBlockModalVisible(false)}
      />

      {/* Apple 1.2: 커뮤니티 이용약관 동의 모달 */}
      <CommunityTermsModal
        visible={termsModalVisible}
        onAccept={() => {
          setTermsModalVisible(false);
          setTermsAccepted(true);
          setIsComposing(true);
        }}
        onDecline={() => setTermsModalVisible(false)}
      />
    </View>
  );
}

// ══════════════════════════════════════════
// Export: 3중 안전망으로 감싸서 내보내기
// SafeLoungeWrapper (hook 크래시 포착)
//   → LoungeScreenContent (hook 호출)
//     → LoungeErrorBoundary (렌더 크래시 포착)
//       → LoungeScreenInner (실제 UI)
// ══════════════════════════════════════════

function LoungeScreenContent() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();

  return (
    <LoungeErrorBoundary themeColors={themeColors} insets={insets}>
      <LoungeScreenInner />
    </LoungeErrorBoundary>
  );
}

export default function LoungeScreen() {
  return (
    <SafeLoungeWrapper>
      <LoungeScreenContent />
    </SafeLoungeWrapper>
  );
}

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── 헤더 ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 242, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(185, 242, 255, 0.28)',
  },
  vipBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B9F2FF',
  },

  // ── 세그먼트 컨트롤 (토스 pill) ──
  segmentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  segmentControl: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 3,
    height: 36,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    gap: 6,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },

  // ── 로딩 ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    marginTop: 12,
  },

  // ── 잠금 화면 ──
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  lockIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 23,
    fontWeight: '700',
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  accessGuide: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  accessGuideTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  accessTier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  accessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accessTierContent: {
    flex: 1,
  },
  accessTierLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  accessTierReq: {
    fontSize: 12,
    marginTop: 1,
  },
  progressSection: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 15,
  },
  progressValue: {
    fontSize: 21,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressShortfall: {
    fontSize: 14,
    color: '#FFC107',
  },
  investButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  investButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  verificationNote: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },

  // ── 커뮤니티: 카테고리 탭 ──
  categoryTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: 13,
  },

  // ── 커뮤니티: 정렬 칩 ──
  sortChipContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  sortChipActive: {},
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },

  // ── 커뮤니티: 환영 배너 ──
  welcomeBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  welcomeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  welcomeIcon: {
    fontSize: 33,
  },
  welcomeText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4CAF50',
  },
  welcomeSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  accessBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accessBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  accessBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── 자산 인증 버튼 ──
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  verifyButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── DIAMOND 전용 필터 ──
  diamondFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(185, 242, 255, 0.08)',
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  diamondFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── 커뮤니티: 글쓰기 ──
  composeContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  composeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  composeTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  composeCategoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  composeCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  composeCategoryText: {
    fontSize: 13,
  },
  composeInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  composeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  charCount: {
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  holdingsNotice: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ── 커뮤니티: 게시물 로딩 / 비어있음 ──
  postsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // ── 모임: 카테고리 ──
  categoryScroll: {
    maxHeight: 50,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  // ── 모임: 환영 배너 ──
  gatheringWelcome: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  gatheringWelcomeContent: {
    marginBottom: 12,
  },
  gatheringWelcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  gatheringWelcomeSubtitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  tierIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gatheringsContent: {
    padding: 20,
    paddingTop: 8,
  },

  // ── 공통: 빈 상태 ──
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
  },

  // ── 공통: FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── 구루 카페 분위기 헤더 ──
  cafeHeader: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  cafeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cafeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cafeGuruRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cafeGuruHint: {
    fontSize: 11,
    marginLeft: 4,
  },
  cafeQuote: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
