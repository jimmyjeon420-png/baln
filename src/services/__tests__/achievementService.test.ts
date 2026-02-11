/**
 * achievementService.ts 테스트
 *
 * 성취 배지 시스템의 모든 기능을 테스트합니다.
 * - 배지 해금 (신규/중복)
 * - 자동 해금 체크 (10가지 조건)
 * - 배지 상태 조회
 * - 엣지 케이스 (경계값, 퍼센티지)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACHIEVEMENTS,
  AchievementId,
  unlockAchievement,
  getAchievements,
  getAchievementsWithStatus,
  getUnlockedCount,
  checkAndUnlockAchievements,
  resetAllAchievements,
} from '../achievementService';

// AsyncStorage 모킹
jest.mock('@react-native-async-storage/async-storage');

describe('achievementService', () => {
  // 각 테스트 전에 AsyncStorage 초기화
  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  // ============================================================================
  // 1. ACHIEVEMENTS 상수 테스트
  // ============================================================================
  describe('ACHIEVEMENTS constant', () => {
    it('should have exactly 10 achievements', () => {
      expect(ACHIEVEMENTS).toHaveLength(10);
    });

    it('should contain all required achievement IDs', () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      expect(ids).toContain('first_visit');
      expect(ids).toContain('streak_7');
      expect(ids).toContain('streak_30');
      expect(ids).toContain('first_correct');
      expect(ids).toContain('streak_correct_5');
      expect(ids).toContain('accuracy_80');
      expect(ids).toContain('first_diagnosis');
      expect(ids).toContain('assets_100m');
      expect(ids).toContain('first_share');
      expect(ids).toContain('first_post');
    });

    it('should have all required fields for each achievement', () => {
      ACHIEVEMENTS.forEach((achievement) => {
        expect(achievement).toHaveProperty('id');
        expect(achievement).toHaveProperty('emoji');
        expect(achievement).toHaveProperty('title');
        expect(achievement).toHaveProperty('description');
        expect(achievement).toHaveProperty('category');
      });
    });

    it('should have valid category values', () => {
      const validCategories = ['streak', 'prediction', 'portfolio', 'social'];
      ACHIEVEMENTS.forEach((achievement) => {
        expect(validCategories).toContain(achievement.category);
      });
    });
  });

  // ============================================================================
  // 2. getAchievements 테스트
  // ============================================================================
  describe('getAchievements', () => {
    it('should return empty object when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getAchievements();

      expect(result).toEqual({});
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@baln:achievements');
    });

    it('should return parsed achievement data', async () => {
      const mockData = {
        first_visit: '2026-02-10',
        streak_7: '2026-02-11',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getAchievements();

      expect(result).toEqual(mockData);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await getAchievements();

      expect(result).toEqual({});
    });
  });

  // ============================================================================
  // 3. unlockAchievement 테스트 (신규/중복)
  // ============================================================================
  describe('unlockAchievement', () => {
    it('should unlock new achievement and return true', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await unlockAchievement('first_visit');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveProperty('first_visit');
      expect(savedData.first_visit).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD 형식
    });

    it('should not unlock duplicate achievement and return false', async () => {
      const existingData = {
        first_visit: '2026-02-10',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));

      const result = await unlockAchievement('first_visit');

      expect(result).toBe(false);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should unlock multiple achievements sequentially', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null) // 첫 번째: 비어있음
        .mockResolvedValueOnce(JSON.stringify({ first_visit: '2026-02-10' })); // 두 번째: first_visit 존재

      const result1 = await unlockAchievement('first_visit');
      const result2 = await unlockAchievement('streak_7');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should handle AsyncStorage errors and return false', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await unlockAchievement('first_visit');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // 4. getAchievementsWithStatus 테스트
  // ============================================================================
  describe('getAchievementsWithStatus', () => {
    it('should return all achievements with unlocked status', async () => {
      const mockData = {
        first_visit: '2026-02-10',
        streak_7: '2026-02-11',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getAchievementsWithStatus();

      expect(result).toHaveLength(10);
      expect(result.find((a) => a.id === 'first_visit')).toMatchObject({
        isUnlocked: true,
        unlockedDate: '2026-02-10',
      });
      expect(result.find((a) => a.id === 'streak_7')).toMatchObject({
        isUnlocked: true,
        unlockedDate: '2026-02-11',
      });
      expect(result.find((a) => a.id === 'streak_30')).toMatchObject({
        isUnlocked: false,
        unlockedDate: null,
      });
    });

    it('should return all locked achievements when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getAchievementsWithStatus();

      expect(result).toHaveLength(10);
      result.forEach((achievement) => {
        expect(achievement.isUnlocked).toBe(false);
        expect(achievement.unlockedDate).toBe(null);
      });
    });
  });

  // ============================================================================
  // 5. getUnlockedCount 테스트
  // ============================================================================
  describe('getUnlockedCount', () => {
    it('should return 0 unlocked when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getUnlockedCount();

      expect(result).toEqual({ unlocked: 0, total: 10 });
    });

    it('should return correct unlocked count', async () => {
      const mockData = {
        first_visit: '2026-02-10',
        streak_7: '2026-02-11',
        first_correct: '2026-02-12',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getUnlockedCount();

      expect(result).toEqual({ unlocked: 3, total: 10 });
    });

    it('should return all unlocked when all achievements are unlocked', async () => {
      const mockData: Record<string, string> = {};
      ACHIEVEMENTS.forEach((a, i) => {
        mockData[a.id] = `2026-02-${10 + i}`;
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getUnlockedCount();

      expect(result).toEqual({ unlocked: 10, total: 10 });
    });
  });

  // ============================================================================
  // 6. checkAndUnlockAchievements - Streak 배지 (first_visit, streak_7, streak_30)
  // ============================================================================
  describe('checkAndUnlockAchievements - Streak achievements', () => {
    it('should unlock first_visit when currentStreak is 1', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ currentStreak: 1 });

      expect(result).toContain('first_visit');
      expect(result).toHaveLength(1);
    });

    it('should unlock streak_7 when currentStreak is exactly 7', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ first_visit: '2026-02-01' })
      );

      const result = await checkAndUnlockAchievements({ currentStreak: 7 });

      expect(result).toContain('streak_7');
    });

    it('should unlock streak_30 when currentStreak is exactly 30', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ first_visit: '2026-01-01', streak_7: '2026-01-07' })
      );

      const result = await checkAndUnlockAchievements({ currentStreak: 30 });

      expect(result).toContain('streak_30');
    });

    it('should unlock multiple streak achievements when currentStreak is 30', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ currentStreak: 30 });

      expect(result).toContain('first_visit');
      expect(result).toContain('streak_7');
      expect(result).toContain('streak_30');
      expect(result).toHaveLength(3);
    });

    it('should not unlock when currentStreak is 0', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ currentStreak: 0 });

      expect(result).toEqual([]);
    });

    it('should not unlock when currentStreak is undefined', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({});

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // 7. checkAndUnlockAchievements - Prediction 배지 (first_correct, streak_correct_5, accuracy_80)
  // ============================================================================
  describe('checkAndUnlockAchievements - Prediction achievements', () => {
    it('should unlock first_correct when correctVotes is 1', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ correctVotes: 1 });

      expect(result).toContain('first_correct');
    });

    it('should unlock streak_correct_5 when predictionStreak is 5', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ first_correct: '2026-02-01' })
      );

      const result = await checkAndUnlockAchievements({ predictionStreak: 5 });

      expect(result).toContain('streak_correct_5');
    });

    it('should unlock accuracy_80 when predictionAccuracy is exactly 80%', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ predictionAccuracy: 80 });

      expect(result).toContain('accuracy_80');
    });

    it('should unlock accuracy_80 when predictionAccuracy is 100%', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ predictionAccuracy: 100 });

      expect(result).toContain('accuracy_80');
    });

    it('should not unlock accuracy_80 when predictionAccuracy is 79.9%', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ predictionAccuracy: 79.9 });

      expect(result).toEqual([]);
    });

    it('should unlock all prediction achievements at once', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({
        correctVotes: 10,
        predictionStreak: 5,
        predictionAccuracy: 85,
      });

      expect(result).toContain('first_correct');
      expect(result).toContain('streak_correct_5');
      expect(result).toContain('accuracy_80');
      expect(result).toHaveLength(3);
    });
  });

  // ============================================================================
  // 8. checkAndUnlockAchievements - Portfolio 배지 (first_diagnosis, assets_100m)
  // ============================================================================
  describe('checkAndUnlockAchievements - Portfolio achievements', () => {
    it('should unlock first_diagnosis when hasDiagnosis is true', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ hasDiagnosis: true });

      expect(result).toContain('first_diagnosis');
    });

    it('should not unlock first_diagnosis when hasDiagnosis is false', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ hasDiagnosis: false });

      expect(result).toEqual([]);
    });

    it('should unlock assets_100m when totalAssets is exactly 100,000,000', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ totalAssets: 100000000 });

      expect(result).toContain('assets_100m');
    });

    it('should unlock assets_100m when totalAssets is above 100,000,000', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ totalAssets: 150000000 });

      expect(result).toContain('assets_100m');
    });

    it('should not unlock assets_100m when totalAssets is 99,999,999', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ totalAssets: 99999999 });

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // 9. checkAndUnlockAchievements - Social 배지 (first_share, first_post)
  // ============================================================================
  describe('checkAndUnlockAchievements - Social achievements', () => {
    it('should unlock first_share when hasShared is true', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ hasShared: true });

      expect(result).toContain('first_share');
    });

    it('should not unlock first_share when hasShared is false', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ hasShared: false });

      expect(result).toEqual([]);
    });

    it('should unlock first_post when hasPosted is true', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ hasPosted: true });

      expect(result).toContain('first_post');
    });

    it('should not unlock first_post when hasPosted is false', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({ hasPosted: false });

      expect(result).toEqual([]);
    });

    it('should unlock both social achievements at once', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({
        hasShared: true,
        hasPosted: true,
      });

      expect(result).toContain('first_share');
      expect(result).toContain('first_post');
      expect(result).toHaveLength(2);
    });
  });

  // ============================================================================
  // 10. checkAndUnlockAchievements - 엣지 케이스
  // ============================================================================
  describe('checkAndUnlockAchievements - Edge cases', () => {
    it('should unlock all 10 achievements when all conditions are met', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({
        currentStreak: 30,
        correctVotes: 10,
        predictionStreak: 5,
        predictionAccuracy: 85,
        totalAssets: 150000000,
        hasDiagnosis: true,
        hasShared: true,
        hasPosted: true,
      });

      expect(result).toHaveLength(10);
      expect(result).toContain('first_visit');
      expect(result).toContain('streak_7');
      expect(result).toContain('streak_30');
      expect(result).toContain('first_correct');
      expect(result).toContain('streak_correct_5');
      expect(result).toContain('accuracy_80');
      expect(result).toContain('first_diagnosis');
      expect(result).toContain('assets_100m');
      expect(result).toContain('first_share');
      expect(result).toContain('first_post');
    });

    it('should return empty array when no params are provided', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await checkAndUnlockAchievements({});

      expect(result).toEqual([]);
    });

    it('should not re-unlock already unlocked achievements', async () => {
      const existingData = {
        first_visit: '2026-01-01',
        streak_7: '2026-01-07',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));

      const result = await checkAndUnlockAchievements({ currentStreak: 7 });

      expect(result).toEqual([]); // 이미 해금된 것들은 반환하지 않음
    });

    it('should handle boundary values correctly (streak 6 vs 7)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ first_visit: '2026-02-01' })
      );

      const result6 = await checkAndUnlockAchievements({ currentStreak: 6 });
      const result7 = await checkAndUnlockAchievements({ currentStreak: 7 });

      expect(result6).not.toContain('streak_7');
      expect(result7).toContain('streak_7');
    });

    it('should handle boundary values for percentage (79.99% vs 80%)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result79 = await checkAndUnlockAchievements({ predictionAccuracy: 79.99 });
      const result80 = await checkAndUnlockAchievements({ predictionAccuracy: 80 });

      expect(result79).not.toContain('accuracy_80');
      expect(result80).toContain('accuracy_80');
    });

    it('should handle boundary values for assets (99,999,999 vs 100,000,000)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const resultBelow = await checkAndUnlockAchievements({ totalAssets: 99999999 });
      const resultExact = await checkAndUnlockAchievements({ totalAssets: 100000000 });

      expect(resultBelow).not.toContain('assets_100m');
      expect(resultExact).toContain('assets_100m');
    });
  });

  // ============================================================================
  // 11. resetAllAchievements 테스트
  // ============================================================================
  describe('resetAllAchievements', () => {
    it('should remove all achievements from storage', async () => {
      await resetAllAchievements();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@baln:achievements');
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(resetAllAchievements()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // 12. 통합 시나리오 테스트
  // ============================================================================
  describe('Integration scenarios', () => {
    it('should unlock achievements progressively over time', async () => {
      // Day 1: 첫 방문
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const day1 = await checkAndUnlockAchievements({ currentStreak: 1 });
      expect(day1).toContain('first_visit');

      // Day 7: 7일 연속
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ first_visit: '2026-02-01' })
      );
      const day7 = await checkAndUnlockAchievements({ currentStreak: 7 });
      expect(day7).toContain('streak_7');

      // Day 30: 30일 연속 + 첫 적중
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ first_visit: '2026-02-01', streak_7: '2026-02-07' })
      );
      const day30 = await checkAndUnlockAchievements({
        currentStreak: 30,
        correctVotes: 1,
      });
      expect(day30).toContain('streak_30');
      expect(day30).toContain('first_correct');
    });

    it('should unlock all category achievements separately', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      // Streak category
      const streakResult = await checkAndUnlockAchievements({ currentStreak: 30 });
      expect(streakResult.filter((id) => ACHIEVEMENTS.find((a) => a.id === id)?.category === 'streak')).toHaveLength(3);

      // Prediction category
      const predictionResult = await checkAndUnlockAchievements({
        correctVotes: 1,
        predictionStreak: 5,
        predictionAccuracy: 80,
      });
      expect(predictionResult.filter((id) => ACHIEVEMENTS.find((a) => a.id === id)?.category === 'prediction')).toHaveLength(3);

      // Portfolio category
      const portfolioResult = await checkAndUnlockAchievements({
        hasDiagnosis: true,
        totalAssets: 100000000,
      });
      expect(portfolioResult.filter((id) => ACHIEVEMENTS.find((a) => a.id === id)?.category === 'portfolio')).toHaveLength(2);

      // Social category
      const socialResult = await checkAndUnlockAchievements({
        hasShared: true,
        hasPosted: true,
      });
      expect(socialResult.filter((id) => ACHIEVEMENTS.find((a) => a.id === id)?.category === 'social')).toHaveLength(2);
    });
  });

  // ============================================================================
  // 13. 날짜 형식 검증 테스트
  // ============================================================================
  describe('Date format validation', () => {
    it('should save unlock date in YYYY-MM-DD format', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await unlockAchievement('first_visit');

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData.first_visit).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return date in correct format from getAchievementsWithStatus', async () => {
      const mockData = {
        first_visit: '2026-02-10',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getAchievementsWithStatus();
      const firstVisit = result.find((a) => a.id === 'first_visit');

      expect(firstVisit?.unlockedDate).toBe('2026-02-10');
      expect(firstVisit?.unlockedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
