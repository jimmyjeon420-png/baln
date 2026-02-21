/**
 * useInvestmentStandards — 투자 기준 아카이빙
 * 분석 탭에서 본 처방전 액션을 "내 투자 기준"으로 저장
 * 홈 탭에서 표시하여 패닉셀 방지
 */
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STANDARDS_KEY = '@baln:investment_standards';

export interface InvestmentStandard {
  date: string;
  actions: { ticker: string; action: string; reason?: string }[];
  philosophy: string;
}

export function useInvestmentStandards() {
  const [standards, setStandards] = useState<InvestmentStandard | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STANDARDS_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // 3일 이내 기준만 유효
          const saved = new Date(parsed.date);
          const now = new Date();
          const diffDays = (now.getTime() - saved.getTime()) / 86400000;
          if (diffDays <= 3) {
            setStandards(parsed);
          }
        } catch {}
      }
    });
  }, []);

  const saveStandards = async (data: InvestmentStandard) => {
    await AsyncStorage.setItem(STANDARDS_KEY, JSON.stringify(data));
    setStandards(data);
  };

  const clearStandards = async () => {
    await AsyncStorage.removeItem(STANDARDS_KEY);
    setStandards(null);
  };

  return { standards, saveStandards, clearStandards };
}
