/**
 * useHoldingPeriod - 보유 기간 훅
 *
 * 첫 자산 등록일로부터 경과 일수를 계산하여 라벨로 반환.
 * 코스톨라니: "시간의 가치" — 오래 보유할수록 뱃지가 성장.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '../locales';

const STORAGE_KEY = '@baln:first_asset_date';

function computeLabel(days: number): string {
  if (days < 30) return t('holding_period.new_investor');
  if (days < 365) {
    const months = Math.floor(days / 30);
    return t('holding_period.months', { months: String(months) });
  }
  const years = Math.floor(days / 365);
  return t('holding_period.years_veteran', { years: String(years) });
}

interface HoldingPeriodResult {
  days: number;
  label: string;
  isLoading: boolean;
}

export function useHoldingPeriod(): HoldingPeriodResult {
  const [days, setDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        let firstDate: Date;

        if (stored) {
          firstDate = new Date(stored);
        } else {
          firstDate = new Date();
          await AsyncStorage.setItem(STORAGE_KEY, firstDate.toISOString());
        }

        const now = new Date();
        const diffMs = now.getTime() - firstDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        setDays(diffDays);
      } catch {
        setDays(0);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { days, label: computeLabel(days), isLoading };
}
