/**
 * 진단 결과 저장/로드 유틸
 * AsyncStorage를 사용한 진단 데이터 관리
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiagnosisResult, DiagnosisStorage } from '../types/coaching';

const DIAGNOSIS_STORAGE_KEY = '@smart_rebalancer_diagnosis';
const MAX_HISTORY_SIZE = 10;

/**
 * 최신 진단 결과 저장
 */
export const saveDiagnosisResult = async (result: DiagnosisResult): Promise<void> => {
  try {
    // 기존 저장소 로드
    const existing = await loadDiagnosisStorage();

    // 새 결과를 히스토리에 추가
    const updatedHistory = [result, ...existing.history].slice(0, MAX_HISTORY_SIZE);

    // 새로운 저장소 생성
    const storage: DiagnosisStorage = {
      latest: result,
      history: updatedHistory,
      lastUpdated: Date.now(),
    };

    // 저장
    await AsyncStorage.setItem(DIAGNOSIS_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error('[diagnosisStorage] Failed to save diagnosis result:', error);
    throw error;
  }
};

/**
 * 전체 진단 저장소 로드
 */
export const loadDiagnosisStorage = async (): Promise<DiagnosisStorage> => {
  try {
    const data = await AsyncStorage.getItem(DIAGNOSIS_STORAGE_KEY);

    if (!data) {
      return {
        latest: undefined,
        history: [],
        lastUpdated: 0,
      };
    }

    return JSON.parse(data) as DiagnosisStorage;
  } catch (error) {
    console.error('[diagnosisStorage] Failed to load diagnosis storage:', error);
    return {
      latest: undefined,
      history: [],
      lastUpdated: 0,
    };
  }
};

/**
 * 최신 진단 결과 로드
 */
export const loadLatestDiagnosis = async (): Promise<DiagnosisResult | null> => {
  try {
    const storage = await loadDiagnosisStorage();
    return storage.latest || null;
  } catch (error) {
    console.error('[diagnosisStorage] Failed to load latest diagnosis:', error);
    return null;
  }
};

/**
 * 진단 히스토리 로드
 */
export const loadDiagnosisHistory = async (): Promise<DiagnosisResult[]> => {
  try {
    const storage = await loadDiagnosisStorage();
    return storage.history;
  } catch (error) {
    console.error('[diagnosisStorage] Failed to load diagnosis history:', error);
    return [];
  }
};

/**
 * 특정 진단 결과 조회 (타임스탐프로)
 */
export const getDiagnosisByTimestamp = async (
  timestamp: number
): Promise<DiagnosisResult | null> => {
  try {
    const storage = await loadDiagnosisStorage();
    return (
      storage.history.find((result) => result.createdAt === timestamp) ||
      (storage.latest?.createdAt === timestamp ? storage.latest : null)
    );
  } catch (error) {
    console.error('[diagnosisStorage] Failed to get diagnosis by timestamp:', error);
    return null;
  }
};

/**
 * 진단 히스토리 전체 삭제
 */
export const clearDiagnosisHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DIAGNOSIS_STORAGE_KEY);
  } catch (error) {
    console.error('[diagnosisStorage] Failed to clear diagnosis history:', error);
    throw error;
  }
};

/**
 * 특정 진단 결과 삭제
 */
export const deleteDiagnosis = async (timestamp: number): Promise<void> => {
  try {
    const storage = await loadDiagnosisStorage();

    // 최신이면 다음 히스토리 항목을 최신으로 설정
    if (storage.latest?.createdAt === timestamp) {
      storage.latest = storage.history.length > 0 ? storage.history[0] : undefined;
    }

    // 히스토리에서 제거
    storage.history = storage.history.filter((result) => result.createdAt !== timestamp);
    storage.lastUpdated = Date.now();

    await AsyncStorage.setItem(DIAGNOSIS_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error('[diagnosisStorage] Failed to delete diagnosis:', error);
    throw error;
  }
};

/**
 * 진단 저장소 통계
 */
export const getDiagnosisStats = async (): Promise<{
  hasLatest: boolean;
  historyCount: number;
  lastUpdated: number;
}> => {
  try {
    const storage = await loadDiagnosisStorage();
    return {
      hasLatest: !!storage.latest,
      historyCount: storage.history.length,
      lastUpdated: storage.lastUpdated,
    };
  } catch (error) {
    console.error('[diagnosisStorage] Failed to get stats:', error);
    return {
      hasLatest: false,
      historyCount: 0,
      lastUpdated: 0,
    };
  }
};
