import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../services/analyticsService';
import { ACTIVE_WEEKLY_EXPERIMENT, isWithinExperimentWeek } from '../config/experiments';

interface ABExperimentResult {
  experimentId: string | null;
  variant: string | null;
  isActive: boolean;
  metrics: string[];
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function useABExperiment(screenName: string): ABExperimentResult {
  const { user } = useAuth();
  const [variant, setVariant] = useState<string | null>(null);

  const isActive = useMemo(() => {
    return isWithinExperimentWeek() && ACTIVE_WEEKLY_EXPERIMENT.targetScreen === screenName;
  }, [screenName]);

  useEffect(() => {
    let mounted = true;

    const assign = async () => {
      if (!isActive) {
        if (mounted) setVariant(null);
        return;
      }

      const seed = `${ACTIVE_WEEKLY_EXPERIMENT.id}:${user?.id ?? 'anonymous'}`;
      const index = hashString(seed) % ACTIVE_WEEKLY_EXPERIMENT.variants.length;
      const assigned = ACTIVE_WEEKLY_EXPERIMENT.variants[index];
      if (!mounted) return;
      setVariant(assigned);

      const exposureKey = `@baln:ab_exposed:${ACTIVE_WEEKLY_EXPERIMENT.id}:${user?.id ?? 'anonymous'}`;
      const alreadyExposed = await AsyncStorage.getItem(exposureKey);
      if (alreadyExposed) return;

      await AsyncStorage.setItem(exposureKey, '1');
      trackEvent('ab_experiment_exposed', {
        experiment_id: ACTIVE_WEEKLY_EXPERIMENT.id,
        variant: assigned,
        target_screen: screenName,
        week_start: ACTIVE_WEEKLY_EXPERIMENT.weekStartDate,
        week_end: ACTIVE_WEEKLY_EXPERIMENT.weekEndDate,
        core_metrics: ACTIVE_WEEKLY_EXPERIMENT.metrics,
      }, user?.id);
    };

    assign();
    return () => { mounted = false; };
  }, [isActive, screenName, user?.id]);

  return {
    experimentId: isActive ? ACTIVE_WEEKLY_EXPERIMENT.id : null,
    variant,
    isActive,
    metrics: ACTIVE_WEEKLY_EXPERIMENT.metrics,
  };
}

