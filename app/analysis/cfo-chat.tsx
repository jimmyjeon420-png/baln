/**
 * AI 버핏과 티타임 - 실시간 대화형 투자 조언
 *
 * 역할: ChatGPT 스타일 대화형 AI 재무 상담
 * 사용자 흐름: 질문 입력 → AI 응답 → 추가 질문
 *
 * [수정 2026-02-13] 에러 처리 개선:
 * - API 호출 먼저 → 성공 시에만 크레딧 차감 (순서 변경)
 * - 로컬 폴백 응답 (네트워크/서버 에러 시 캐릭터별 안내)
 * - 에러 메시지를 대화 버블로 표시 (빨간 테두리 + 다시 시도 버튼)
 * - 네트워크 에러와 서버 에러 구분 안내
 *
 * [수정 2026-02-14] 인스타그램 공유 9:16 스토리 카드 전환:
 * - 기존: ViewShot이 대화 버블 전체를 캡처 → 매우 긴 이미지
 * - 변경: 별도 9:16 공유 카드 모달로 분리, 요약된 투자자 의견 표시
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useTheme } from '../../src/hooks/useTheme';
import { getLocaleCode } from '../../src/utils/formatters';
import { useLocale } from '../../src/context/LocaleContext';
import { t as tStatic } from '../../src/locales';
import { useMyCredits, useSpendCredits } from '../../src/hooks/useCredits';
import { useShareReward } from '../../src/hooks/useRewards';
import { FEATURE_COSTS } from '../../src/types/marketplace';
import { REWARD_AMOUNTS } from '../../src/services/rewardService';
import supabase from '../../src/services/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  // 토론 형식 (4명 투자자 + 정리)
  debate?: {
    warren: string;
    dalio: string;
    wood: string;
    kostolany?: string;
    summary: string;
  };
  // 에러 상태 (에러 버블 표시용)
  isError?: boolean;
  // 다시 시도할 원본 질문 (에러 시 재시도용)
  retryQuestion?: string;
}

// ============================================================================
// 로컬 폴백 응답 (서버 응답 실패 시 사용)
// ============================================================================

function getLocalFallbackDebate() {
  return {
    warren: tStatic('analysis.cfoChat.fallback.warren'),
    dalio: tStatic('analysis.cfoChat.fallback.dalio'),
    wood: tStatic('analysis.cfoChat.fallback.wood'),
    kostolany: tStatic('analysis.cfoChat.fallback.kostolany'),
    summary: tStatic('analysis.cfoChat.fallback.summary'),
  };
}

/** 에러 종류를 판별하여 사용자 친화적 메시지 반환 */
function classifyError(err: unknown): { type: 'network' | 'server' | 'unknown'; message: string } {
  const msg = (err instanceof Error ? err.message : '') || '';

  // 네트워크 관련 에러
  if (
    msg.includes('network') ||
    msg.includes('Network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('Failed to fetch') ||
    msg.includes('인터넷')
  ) {
    return {
      type: 'network',
      message: tStatic('analysis.cfoChat.error.networkMessage'),
    };
  }

  // 서버 에러 (5xx, Gemini 관련)
  if (
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('Gemini') ||
    msg.includes('AI 응답 실패') ||
    msg.includes('Edge Function')
  ) {
    return {
      type: 'server',
      message: tStatic('analysis.cfoChat.error.serverMessage'),
    };
  }

  return {
    type: 'unknown',
    message: tStatic('analysis.cfoChat.error.unknownMessage'),
  };
}

function getQuickQuestions() {
  return [
    tStatic('analysis.cfoChat.quickQuestion1'),
    tStatic('analysis.cfoChat.quickQuestion2'),
    tStatic('analysis.cfoChat.quickQuestion3'),
    tStatic('analysis.cfoChat.quickQuestion4'),
  ];
}

// ============================================================================
// 9:16 인스타그램 스토리 공유 카드 모달
// ============================================================================

const CFOShareModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  question: string;
  debate: { warren: string; dalio: string; wood: string; kostolany?: string; summary: string };
}> = ({ visible, onClose, question, debate }) => {
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const { rewarded, claimReward } = useShareReward();

  // 텍스트를 최대 길이로 자르기
  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  const handleShareCapture = useCallback(async () => {
    setSharing(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(tStatic('analysis.cfoChat.share.unavailableTitle'), tStatic('analysis.cfoChat.share.unavailableMsg'));
        return;
      }
      if (!viewShotRef.current?.capture) {
        Alert.alert(tStatic('common.error'), tStatic('analysis.cfoChat.share.captureError'));
        return;
      }
      const uri = await viewShotRef.current.capture();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: tStatic('analysis.cfoChat.share.dialogTitle'),
        UTI: 'public.png',
      });
      const result = await claimReward();
      if (result.success) {
        setRewardMessage(tStatic('analysis.cfoChat.share.acornEarned', { count: result.creditsEarned }));
        setTimeout(() => setRewardMessage(null), 3000);
      }
    } catch (err) {
      console.error('[AI 버핏과 티타임] 공유 실패:', err);
    } finally {
      setSharing(false);
    }
  }, [claimReward]);

  const cardContent = (
    <View style={cfoShareStyles.captureArea}>
      {/* 배경 글로우 */}
      <View style={cfoShareStyles.bgGlow} />

      {/* 상단: baln.logic 로고 */}
      <View style={cfoShareStyles.topRow}>
        <View>
          <View style={cfoShareStyles.logoRow}>
            <Text style={cfoShareStyles.logoBaln}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
            <Text style={cfoShareStyles.logoDot}>.logic</Text>
          </View>
          <Text style={cfoShareStyles.logoSub}>{tStatic('analysis.cfoChat.title')}</Text>
        </View>
      </View>

      {/* 사용자 질문 */}
      <View style={cfoShareStyles.questionBox}>
        <Text style={cfoShareStyles.questionLabel}>Q.</Text>
        <Text style={cfoShareStyles.questionText} numberOfLines={2}>
          {question}
        </Text>
      </View>

      {/* 구분선 */}
      <View style={cfoShareStyles.divider} />

      {/* 워렌 버핏 */}
      <View style={[cfoShareStyles.investorCard, { borderLeftColor: '#2196F3' }]}>
        <Text style={[cfoShareStyles.investorName, { color: '#64B5F6' }]}>{tStatic('analysis.cfoChat.investor.warren')}</Text>
        <Text style={cfoShareStyles.investorText} numberOfLines={2}>
          {truncate(debate.warren, 80)}
        </Text>
      </View>

      {/* 레이 달리오 */}
      <View style={[cfoShareStyles.investorCard, { borderLeftColor: '#9C27B0' }]}>
        <Text style={[cfoShareStyles.investorName, { color: '#CE93D8' }]}>{tStatic('analysis.cfoChat.investor.dalio')}</Text>
        <Text style={cfoShareStyles.investorText} numberOfLines={2}>
          {truncate(debate.dalio, 80)}
        </Text>
      </View>

      {/* 캐시 우드 */}
      <View style={[cfoShareStyles.investorCard, { borderLeftColor: '#E91E63' }]}>
        <Text style={[cfoShareStyles.investorName, { color: '#F48FB1' }]}>{tStatic('analysis.cfoChat.investor.wood')}</Text>
        <Text style={cfoShareStyles.investorText} numberOfLines={2}>
          {truncate(debate.wood, 80)}
        </Text>
      </View>

      {/* 코스톨라니 (있을 때만) */}
      {debate.kostolany ? (
        <View style={[cfoShareStyles.investorCard, { borderLeftColor: '#FF8F00' }]}>
          <Text style={[cfoShareStyles.investorName, { color: '#FFB74D' }]}>{tStatic('analysis.cfoChat.investor.kostolany')}</Text>
          <Text style={cfoShareStyles.investorText} numberOfLines={2}>
            {truncate(debate.kostolany, 80)}
          </Text>
        </View>
      ) : null}

      {/* 워렌의 한마디 (핵심) */}
      <View style={cfoShareStyles.summaryBox}>
        <Text style={cfoShareStyles.summaryLabel}>{tStatic('analysis.cfoChat.warrenSummary')}</Text>
        <Text style={cfoShareStyles.summaryText} numberOfLines={4}>
          {truncate(debate.summary, 160)}
        </Text>
      </View>

      {/* 하단 CTA */}
      <View style={cfoShareStyles.ctaContainer}>
        <View style={cfoShareStyles.ctaBox}>
          <Ionicons name="open-outline" size={14} color="#7C4DFF" />
          <Text style={cfoShareStyles.ctaText}>
            bal<Text style={{ color: '#4CAF50' }}>n</Text>{tStatic('analysis.cfoChat.share.ctaText')}
          </Text>
        </View>
      </View>

      {/* 워터마크 */}
      <View style={cfoShareStyles.watermarkRow}>
        <View style={cfoShareStyles.watermarkLine} />
        <Text style={cfoShareStyles.watermarkBaln}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        <Text style={cfoShareStyles.watermarkDot}>.logic</Text>
        <View style={cfoShareStyles.watermarkLine} />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={cfoShareStyles.modalContainer}>
        <View style={cfoShareStyles.modalHeader}>
          <Text style={cfoShareStyles.modalTitle}>{tStatic('analysis.cfoChat.share.storyTitle')}</Text>
          <TouchableOpacity onPress={onClose} style={cfoShareStyles.closeButton}>
            <Ionicons name="close" size={24} color="#888888" />
          </TouchableOpacity>
        </View>

        <View style={cfoShareStyles.previewContainer}>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
            {cardContent}
          </ViewShot>
        </View>

        {rewardMessage && (
          <View style={cfoShareStyles.rewardToast}>
            <Ionicons name="gift" size={14} color="#4CAF50" />
            <Text style={cfoShareStyles.rewardToastText}>{rewardMessage}</Text>
          </View>
        )}

        <View style={cfoShareStyles.buttonContainer}>
          <TouchableOpacity
            style={cfoShareStyles.shareButton}
            onPress={handleShareCapture}
            disabled={sharing}
            activeOpacity={0.7}
          >
            {sharing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="share-social" size={18} color="#FFFFFF" />
                <Text style={cfoShareStyles.shareButtonText}>{tStatic('analysis.cfoChat.share.instagram')}</Text>
                {!rewarded && (
                  <View style={cfoShareStyles.rewardHint}>
                    <Text style={cfoShareStyles.rewardHintText}>{tStatic('analysis.cfoChat.share.rewardHint', { count: REWARD_AMOUNTS.shareCard })}</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// 메인 화면
// ============================================================================

export default function CFOChatScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { data: credits } = useMyCredits();
  const spendCreditsMutation = useSpendCredits();
  const chatCost = FEATURE_COSTS.ai_cfo_chat; // 1크레딧
  const { rewarded, claimReward: _claimReward } = useShareReward();
  const [shareRewardMsg, _setShareRewardMsg] = useState<string | null>(null);

  // 공유 모달 state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareModalData, setShareModalData] = useState<{
    question: string;
    debate: { warren: string; dalio: string; wood: string; summary: string };
  } | null>(null);

  const handleShareDebate = useCallback((msgId: string) => {
    // 해당 메시지와 사용자 질문 찾기
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg?.debate) return;

    const prevMsg = messages.find((m, idx) => {
      const nextIdx = messages.indexOf(targetMsg);
      return m.role === 'user' && idx === nextIdx - 1;
    });

    setShareModalData({
      question: prevMsg?.text ?? '',
      debate: targetMsg.debate,
    });
    setShareModalVisible(true);
  }, [messages]);

  useEffect(() => {
    // 환영 메시지
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      text: t('analysis.cfoChat.welcomeMessage'),
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [t]);

  /** 다시 시도 핸들러: 에러 메시지를 제거하고 해당 질문을 재전송 */
  const handleRetry = useCallback((errorMsgId: string, question: string) => {
    // 에러 메시지를 목록에서 제거
    setMessages(prev => prev.filter(m => m.id !== errorMsgId));
    // 원본 질문으로 재시도 (사용자 메시지는 이미 있으므로 직접 API만 호출)
    handleSend(question);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // 크레딧 잔액 확인
    const balance = credits?.balance ?? 0;
    if (balance < chatCost) {
      Alert.alert(
        t('analysis.cfoChat.alert.insufficientCredits'),
        t('analysis.cfoChat.alert.insufficientCreditsMsg', { cost: chatCost, price: chatCost * 100, balance }),
        [{ text: t('common.confirm') }]
      );
      return;
    }

    // 이미 같은 질문의 사용자 메시지가 마지막에 있으면 추가하지 않음 (재시도 시)
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const isRetry = lastUserMsg?.text === messageText;

    if (!isRetry) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: messageText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
    }
    setInputText('');
    setIsLoading(true);

    try {
      // ============================================================
      // [핵심 변경] API 호출을 먼저 → 성공 시에만 크레딧 차감
      // 기존: 크레딧 차감 → API 호출 (실패하면 크레딧 날아감)
      // 변경: API 호출 → 성공 확인 → 크레딧 차감
      // ============================================================

      // 1단계: Gemini API 호출 (Edge Function 사용)
      if (__DEV__) console.log('[AI 버핏과 티타임] 질문:', messageText);
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          type: 'cfo-chat',
          data: {
            question: messageText,
            conversationHistory: messages.slice(-10), // 최근 10개 대화만 전달
          },
        },
      });

      // Edge Function 레벨 에러 (네트워크, 5xx 등)
      if (error) {
        throw new Error(`AI 응답 실패: ${error.message}`);
      }

      // Edge Function이 200을 반환했지만 내부 success:false인 경우
      if (data && data.success === false) {
        throw new Error(data.error || 'AI 서버에서 응답 생성에 실패했습니다.');
      }

      // 토론 형식 응답 파싱
      const debateData = data?.data;
      if (__DEV__) console.log('[AI 버핏과 티타임] 응답 수신 완료');

      // 응답 유효성 검사
      const hasValidDebate =
        debateData?.warren && debateData.warren.length > 0 &&
        debateData?.dalio && debateData.dalio.length > 0 &&
        debateData?.wood && debateData.wood.length > 0 &&
        debateData?.summary && debateData.summary.length > 0;
      // kostolany는 선택 필드 (구버전 API 호환)

      if (!hasValidDebate && !debateData?.answer) {
        throw new Error('AI 응답이 불완전합니다. 다시 시도해주세요.');
      }

      // 2단계: API 성공 확인 후 크레딧 차감
      try {
        const spendResult = await spendCreditsMutation.mutateAsync({
          amount: chatCost,
          featureType: 'ai_cfo_chat',
        });

        if (!spendResult.success) {
          // 크레딧 차감 실패해도 응답은 보여줌 (사용자 경험 우선)
          console.warn('[AI 버핏과 티타임] 크레딧 차감 실패 (응답은 표시):', spendResult.errorMessage);
        }
      } catch (creditErr) {
        // 크레딧 차감 에러도 무시하고 응답은 보여줌
        console.warn('[AI 버핏과 티타임] 크레딧 차감 예외 (응답은 표시):', creditErr);
      }

      // 3단계: 응답 표시
      if (hasValidDebate) {
        // 토론 형식 메시지
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: '', // debate 필드 사용
          timestamp: new Date(),
          debate: {
            warren: debateData.warren,
            dalio: debateData.dalio,
            wood: debateData.wood,
            kostolany: debateData.kostolany ?? undefined,
            summary: debateData.summary,
          },
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // 폴백: 단일 답변 (warren만 있는 경우 등)
        const fallbackText = debateData?.answer || debateData?.warren || tStatic('analysis.cfoChat.error.processingFailed');
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: fallbackText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (err: unknown) {
      console.error('[AI 버핏과 티타임] 에러:', err);

      // 에러 분류 (네트워크 vs 서버 vs 기타)
      const classified = classifyError(err);

      // 에러 메시지를 대화 버블로 표시 (Alert 대신 인라인)
      // 폴백 토론 형식으로 에러 안내 + 다시 시도 버튼
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '',
        timestamp: new Date(),
        isError: true,
        retryQuestion: messageText,
        debate: {
          ...getLocalFallbackDebate(),
          // summary에 구체적 에러 유형별 안내 추가
          summary: classified.type === 'network'
            ? `${getLocalFallbackDebate().summary}\n\n[${tStatic('analysis.cfoChat.error.networkLabel')}] ${classified.message}`
            : classified.type === 'server'
              ? `${getLocalFallbackDebate().summary}\n\n[${tStatic('analysis.cfoChat.error.serverLabel')}] ${classified.message}`
              : `${getLocalFallbackDebate().summary}\n\n${classified.message}`,
        },
      };
      setMessages(prev => [...prev, errorMessage]);

      // 크레딧은 차감되지 않음 (API 호출이 먼저이므로 실패 시 차감 안 됨)
      // → 사용자에게 별도 안내 불필요
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    // 토론 형식 렌더링 (에러 폴백 포함)
    if (!isUser && item.debate) {
      // 사용자 질문 찾기 (캡처에 포함)
      const prevMsg = messages.find((m, idx) => {
        const nextIdx = messages.indexOf(item);
        return m.role === 'user' && idx === nextIdx - 1;
      });

      return (
        <View style={[s.messageContainer, s.aiMessageContainer]}>
          <View
            style={[
              { backgroundColor: '#1A1A2E', padding: 16, borderRadius: 20 },
              item.isError && { borderWidth: 2, borderColor: '#FF5252' },
            ]}
          >
          {/* 에러 배너 (에러 시만 표시) */}
          {item.isError && (
            <View style={s.errorBanner}>
              <Ionicons name="warning-outline" size={16} color="#FF5252" />
              <Text style={s.errorBannerText}>
                {t('analysis.cfoChat.errorBanner')}
              </Text>
            </View>
          )}

          {/* baln 브랜딩 */}
          <View style={s.shareBrandRow}>
            <Text style={s.shareBrandText}>bal<Text style={{ color: '#4CAF50' }}>n</Text>.logic</Text>
            <Text style={s.shareBrandSub}>{t('analysis.cfoChat.title')}</Text>
          </View>

          {/* 사용자 질문 */}
          {prevMsg && (
            <View style={s.captureQuestion}>
              <Text style={s.captureQuestionLabel}>Q.</Text>
              <Text style={s.captureQuestionText}>{prevMsg.text}</Text>
            </View>
          )}

          {/* 워렌 버핏 */}
          <View style={[s.debateCard, { backgroundColor: '#E3F2FD', borderLeftColor: '#2196F3' }]}>
            <Text style={[s.investorName, { color: '#1976D2' }]}>{t('analysis.cfoChat.investor.warren')}</Text>
            <Text style={[s.debateText, { color: '#2D2D2D' }]}>{item.debate.warren}</Text>
          </View>

          {/* 레이 달리오 */}
          <View style={[s.debateCard, { backgroundColor: '#F3E5F5', borderLeftColor: '#9C27B0' }]}>
            <Text style={[s.investorName, { color: '#7B1FA2' }]}>{t('analysis.cfoChat.investor.dalio')}</Text>
            <Text style={[s.debateText, { color: '#2D2D2D' }]}>{item.debate.dalio}</Text>
          </View>

          {/* 캐시 우드 */}
          <View style={[s.debateCard, { backgroundColor: '#FCE4EC', borderLeftColor: '#E91E63' }]}>
            <Text style={[s.investorName, { color: '#C2185B' }]}>{t('analysis.cfoChat.investor.wood')}</Text>
            <Text style={[s.debateText, { color: '#2D2D2D' }]}>{item.debate.wood}</Text>
          </View>

          {/* 코스톨라니 (있을 때만 표시) */}
          {item.debate.kostolany ? (
            <View style={[s.debateCard, { backgroundColor: '#FFF3E0', borderLeftColor: '#FF8F00' }]}>
              <Text style={[s.investorName, { color: '#E65100' }]}>{t('analysis.cfoChat.investor.kostolanyFull')}</Text>
              <Text style={[s.debateText, { color: '#2D2D2D' }]}>{item.debate.kostolany}</Text>
            </View>
          ) : null}

          {/* 워렌 버핏 최종 정리 */}
          <View style={[s.summaryCard, { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' }]}>
            <Text style={[s.summaryTitle, { color: '#F57F17' }]}>{t('analysis.cfoChat.warrenSummary')}</Text>
            <Text style={[s.summaryText, { color: '#2D2D2D' }]}>{item.debate.summary}</Text>
          </View>

          {/* 바이럴 CTA (에러가 아닐 때만) */}
          {!item.isError && (
            <View style={s.captureCTA}>
              <Text style={s.captureCTAText}>{t('analysis.cfoChat.cta')}</Text>
            </View>
          )}
          </View>

          {/* 다시 시도 버튼 (에러 시만 표시) */}
          {item.isError && item.retryQuestion && (
            <TouchableOpacity
              style={s.retryButton}
              onPress={() => handleRetry(item.id, item.retryQuestion as string)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={s.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          )}

          {/* 공유 버튼 (에러가 아닐 때만) → 9:16 모달 열기 */}
          {!item.isError && (
            <TouchableOpacity
              style={s.shareDebateButton}
              onPress={() => handleShareDebate(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social" size={14} color="#4CAF50" />
              <Text style={s.shareDebateText}>{t('analysis.cfoChat.share.instaShare')}</Text>
              {!rewarded && (
                <View style={s.shareRewardBadge}>
                  <Text style={s.shareRewardBadgeText}>{t('analysis.cfoChat.share.rewardHint', { count: REWARD_AMOUNTS.shareCard })}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <Text style={[s.timestamp, { color: colors.textTertiary, marginTop: 8 }]}>
            {item.timestamp.toLocaleTimeString(getLocaleCode(), {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      );
    }

    // 일반 메시지 렌더링 (사용자 또는 폴백)
    return (
      <View style={[s.messageContainer, isUser ? s.userMessageContainer : s.aiMessageContainer]}>
        <View
          style={[
            s.messageBubble,
            isUser
              ? { backgroundColor: '#7C4DFF' }
              : item.isError
                ? { backgroundColor: colors.surface, borderWidth: 2, borderColor: '#FF5252' }
                : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          {/* 에러 아이콘 (에러 메시지일 때) */}
          {item.isError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Ionicons name="warning-outline" size={14} color="#FF5252" />
              <Text style={{ color: '#FF5252', fontSize: 13, fontWeight: '600' }}>{t('analysis.cfoChat.errorOccurred')}</Text>
            </View>
          )}
          <Text style={[s.messageText, { color: isUser ? '#FFFFFF' : colors.textPrimary }]}>
            {item.text}
          </Text>
          {/* 다시 시도 버튼 (에러 + 텍스트 메시지일 때) */}
          {item.isError && item.retryQuestion && (
            <TouchableOpacity
              style={[s.retryButton, { marginTop: 8 }]}
              onPress={() => handleRetry(item.id, item.retryQuestion as string)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={14} color="#FFFFFF" />
              <Text style={[s.retryButtonText, { fontSize: 13 }]}>{t('common.retry')}</Text>
            </TouchableOpacity>
          )}
          <Text
            style={[s.timestamp, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textTertiary }]}
          >
            {item.timestamp.toLocaleTimeString(getLocaleCode(), {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar
        title={t('analysis.cfoChat.title')}
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 28 }}>🌰</Text>
            <Text style={{ color: '#7C4DFF', fontSize: 15, fontWeight: '600' }}>
              {credits?.balance ?? 0}
            </Text>
          </View>
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[s.container, { backgroundColor: colors.background }]}
        keyboardVerticalOffset={100}
      >
        {/* 투자 면책 안내 */}
        <View style={s.disclaimerBanner}>
          <Ionicons name="information-circle-outline" size={14} color="#888" />
          <Text style={s.disclaimerText}>
            {t('analysis.cfoChat.disclaimer')}
          </Text>
        </View>

        {/* 메시지 리스트 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="small" color="#7C4DFF" />
            <Text style={[s.loadingText, { color: colors.textSecondary }]}>{t('analysis.cfoChat.thinking')}</Text>
          </View>
        )}

        {/* 퀵 질문 (메시지가 환영 메시지만 있을 때) */}
        {messages.length === 1 && (
          <View style={s.quickQuestionsContainer}>
            <Text style={[s.quickQuestionsTitle, { color: colors.textSecondary }]}>
              {t('analysis.cfoChat.quickQuestionsLabel')}
            </Text>
            <View style={s.quickQuestions}>
              {getQuickQuestions().map((q, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleQuickQuestion(q)}
                  style={[s.quickQuestionButton, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.quickQuestionText, { color: colors.textPrimary }]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 공유 보상 토스트 */}
        {shareRewardMsg && (
          <View style={s.rewardToast}>
            <Ionicons name="gift" size={14} color="#4CAF50" />
            <Text style={s.rewardToastText}>{shareRewardMsg}</Text>
          </View>
        )}

        {/* 입력창 */}
        <View style={[s.inputContainer, { backgroundColor: colors.surface }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('analysis.cfoChat.inputPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            style={[s.input, { color: colors.textPrimary }]}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            style={[
              s.sendButton,
              { backgroundColor: !inputText.trim() || isLoading ? colors.disabled : '#7C4DFF' },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 9:16 인스타 스토리 공유 모달 */}
      {shareModalData && (
        <CFOShareModal
          visible={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false);
            setShareModalData(null);
          }}
          question={shareModalData.question}
          debate={shareModalData.debate}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  quickQuestionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  quickQuestionsTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  quickQuestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQuestionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  quickQuestionText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debateCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  investorName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  debateText: {
    fontSize: 15,
    lineHeight: 21,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 6,
    borderWidth: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
  },
  shareBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  shareBrandText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  shareBrandSub: {
    fontSize: 13,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  captureQuestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(124, 77, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.3)',
  },
  captureQuestionLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#7C4DFF',
  },
  captureQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 21,
  },
  captureCTA: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  captureCTAText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.3,
  },
  shareDebateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderRadius: 16,
  },
  shareDebateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  shareRewardBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  shareRewardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  rewardToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  rewardToastText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#888888',
    lineHeight: 17,
  },
  // ============================================================================
  // 에러 UI 스타일
  // ============================================================================
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5252',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#7C4DFF',
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

// ============================================================================
// 9:16 인스타 스토리 공유 카드 스타일
// ============================================================================

const cfoShareStyles = StyleSheet.create({
  // ─── 모달 ───
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // ─── 캡처 영역 (9:16 인스타 스토리 비율) ───
  captureArea: {
    width: 320,
    aspectRatio: 9 / 16,
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  bgGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: '#7C4DFF',
    opacity: 0.05,
    borderRadius: 20,
  },

  // ─── 상단: 로고 ───
  topRow: {
    marginBottom: 14,
    zIndex: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoBaln: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  logoDot: {
    fontSize: 21,
    fontWeight: '900',
    color: '#4CAF50',
    letterSpacing: 1,
  },
  logoSub: {
    fontSize: 9,
    color: '#666666',
    letterSpacing: 2,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  // ─── 사용자 질문 ───
  questionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(124, 77, 255, 0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.25)',
    zIndex: 10,
  },
  questionLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#7C4DFF',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },

  // ─── 구분선 ───
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },

  // ─── 투자자 카드 ───
  investorCard: {
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    zIndex: 10,
  },
  investorName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  investorText: {
    fontSize: 12,
    color: '#CCCCCC',
    lineHeight: 17,
  },

  // ─── 워렌의 한마디 ───
  summaryBox: {
    backgroundColor: 'rgba(251, 192, 45, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 192, 45, 0.25)',
    zIndex: 10,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FBC02D',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13,
    color: '#EEEEEE',
    lineHeight: 19,
    fontWeight: '500',
  },

  // ─── 하단 CTA ───
  ctaContainer: {
    marginTop: 'auto',
    paddingTop: 8,
    zIndex: 10,
  },
  ctaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 77, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.3)',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C4DFF',
    marginLeft: 6,
  },

  // ─── 워터마크 ───
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
    zIndex: 10,
  },
  watermarkLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  watermarkBaln: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1,
  },
  watermarkDot: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3A7D3E',
    letterSpacing: 1,
  },

  // ─── 보상 토스트 ───
  rewardToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 20,
  },
  rewardToastText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },

  // ─── 공유 버튼 ───
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#7C4DFF',
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rewardHint: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rewardHintText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A1A',
  },
});
