/**
 * 진단 시스템 통합 Hook
 * 설문 저장 → Egg 분석 → 코칭 메시지 생성 → 결과 저장
 */

import { useState, useCallback, useEffect } from 'react';
import { Asset } from '../types/asset';
import {
  DiagnosisAnswers,
  InterestRateTrend,
  MarketInputs,
  MarketSentiment,
  VolumeCondition,
} from '../types/kostolany';
import { DiagnosisResult } from '../types/coaching';
import { kostolanyLogic } from '../services/KostolanyLogic';
import { coachingService } from '../services/CoachingService';
import {
  saveDiagnosisResult,
  loadLatestDiagnosis,
  loadDiagnosisHistory,
} from '../utils/diagnosisStorage';
import {
  getRandomMarketSentiment,
  getRandomVolumeCondition,
} from '../services/mockMarketData';

interface UseDiagnosisReturn {
  // 상태
  isLoading: boolean;
  isProcessing: boolean;

  // 설문 및 결과
  currentAnswers: DiagnosisAnswers;
  latestResult: DiagnosisResult | null;
  diagnosisHistory: DiagnosisResult[];

  // 메서드
  setAnswers: (answers: Partial<DiagnosisAnswers>) => void;
  runDiagnosis: (assets: Asset[]) => Promise<DiagnosisResult>;
  loadLatest: () => Promise<void>;
  loadHistory: () => Promise<void>;
  clearAnswers: () => void;

  // 유틸
  canRunDiagnosis: boolean;
}

export const useDiagnosis = (): UseDiagnosisReturn => {
  // 상태
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // 설문 입력값
  const [currentAnswers, setCurrentAnswers] = useState<DiagnosisAnswers>({
    interestRateTrend: InterestRateTrend.UNKNOWN,
    timestamp: 0,
  });

  // 결과
  const [latestResult, setLatestResult] = useState<DiagnosisResult | null>(null);
  const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisResult[]>([]);

  /**
   * 마운트 시 이전 결과 로드
   */
  useEffect(() => {
    const loadPreviousData = async () => {
      try {
        const [latest, history] = await Promise.all([
          loadLatestDiagnosis(),
          loadDiagnosisHistory(),
        ]);

        setLatestResult(latest);
        setDiagnosisHistory(history);
      } catch (error) {
        console.warn('[useDiagnosis] Failed to load previous data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreviousData();
  }, []);

  /**
   * 설문 답변 업데이트
   */
  const setAnswers = useCallback((answers: Partial<DiagnosisAnswers>) => {
    setCurrentAnswers((prev) => ({
      ...prev,
      ...answers,
    }));
  }, []);

  /**
   * 진단 실행 (핵심 메서드)
   */
  const runDiagnosis = useCallback(
    async (assets: Asset[]): Promise<DiagnosisResult> => {
      if (!canRunDiagnosis) {
        throw new Error('금리 추세를 설정하세요');
      }

      setIsProcessing(true);

      try {
        // 1. 시장 입력값 생성 (금리 + Mock 감정/거래량)
        const marketInputs: MarketInputs = {
          interestRateTrend: currentAnswers.interestRateTrend,
          sentiment:
            (getRandomMarketSentiment() as MarketSentiment) ||
            MarketSentiment.NEUTRAL,
          volume:
            (getRandomVolumeCondition() as VolumeCondition) ||
            VolumeCondition.MEDIUM,
        };

        // 2. Egg 분석
        const eggAnalysis = kostolanyLogic.analyzePhase(marketInputs);

        // 3. 코칭 메시지 생성
        const coachingMessage = coachingService.generateCoachingMessage(
          eggAnalysis,
          assets
        );

        // 4. 시장 드라이버 조회
        const marketDrivers = coachingService.getMarketDrivers();

        // 5. 포트폴리오 스냅샷
        const portfolioSnapshot = {
          totalValue: assets.reduce((sum, a) => sum + a.currentValue, 0),
          totalAllocation: assets.reduce((sum, a) => sum + a.targetAllocation, 0),
          cryptoAllocation: assets
            .filter((a) =>
              a.name.toLowerCase().includes('crypto') ||
              a.name.toLowerCase().includes('bitcoin') ||
              a.name.toLowerCase().includes('ethereum')
            )
            .reduce((sum, a) => sum + a.currentValue, 0),
          cashAllocation: assets
            .filter((a) =>
              a.name.toLowerCase().includes('cash') ||
              a.name.toLowerCase().includes('stable')
            )
            .reduce((sum, a) => sum + a.currentValue, 0),
          assetCount: assets.length,
        };

        // 6. 결과 조합
        const result: DiagnosisResult = {
          answers: {
            ...currentAnswers,
            timestamp: Date.now(),
          },
          eggAnalysis,
          coachingMessage,
          marketDrivers,
          portfolioSnapshot,
          createdAt: Date.now(),
        };

        // 7. 저장
        await saveDiagnosisResult(result);

        // 8. 상태 업데이트
        setLatestResult(result);
        setDiagnosisHistory((prev) => [result, ...prev].slice(0, 10));

        return result;
      } catch (error) {
        console.warn('[useDiagnosis] Diagnosis failed:', error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [currentAnswers]
  );

  /**
   * 최신 진단 로드
   */
  const loadLatest = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await loadLatestDiagnosis();
      if (result) {
        setLatestResult(result);
      }
    } catch (error) {
      console.warn('[useDiagnosis] Failed to load latest:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 히스토리 로드
   */
  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const results = await loadDiagnosisHistory();
      setDiagnosisHistory(results);
    } catch (error) {
      console.warn('[useDiagnosis] Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 설문 초기화
   */
  const clearAnswers = useCallback(() => {
    setCurrentAnswers({
      interestRateTrend: InterestRateTrend.UNKNOWN,
      timestamp: 0,
    });
  }, []);

  // 진단 실행 가능 여부
  const canRunDiagnosis =
    currentAnswers.interestRateTrend !== InterestRateTrend.UNKNOWN;

  return {
    isLoading,
    isProcessing,
    currentAnswers,
    latestResult,
    diagnosisHistory,
    setAnswers,
    runDiagnosis,
    loadLatest,
    loadHistory,
    clearAnswers,
    canRunDiagnosis,
  };
};
