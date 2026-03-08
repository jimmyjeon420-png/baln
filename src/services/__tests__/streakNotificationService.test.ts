/**
 * streakNotificationService.ts 테스트
 *
 * 스트릭 경고 알림 스케줄링 로직을 테스트합니다.
 * - 스트릭 0 이하일 때 스케줄링 안 함
 * - 이미 체크인했으면 스케줄링 안 함
 * - 20:00 KST 이후면 스케줄링 안 함
 * - 조건 충족 시 정상 스케줄링
 * - cancelStreakWarning / onCheckInComplete
 */

// Mock 모듈 -- jest.mock은 require 전에 호이스팅됨
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
}));

jest.mock('../streakService', () => ({
  getStreakData: jest.fn(),
}));

jest.mock('../rewardService', () => ({
  getDailyCheckInStatus: jest.fn(),
}));

jest.mock('../../locales', () => ({
  getCurrentLanguage: jest.fn(() => 'ko'),
  t: jest.fn((key: string) => key),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const Notifications = require('expo-notifications');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { getStreakData } = require('../streakService');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { getDailyCheckInStatus } = require('../rewardService');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { scheduleStreakWarning, cancelStreakWarning, onCheckInComplete } = require('../streakNotificationService');

const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

describe('streakNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // scheduleStreakWarning
  // ============================================================================

  describe('scheduleStreakWarning', () => {
    it('should NOT schedule if streak <= 0', async () => {
      (getStreakData as jest.Mock).mockResolvedValue({
        currentStreak: 0,
        lastCheckInDate: null,
        longestStreak: 0,
        freezeCount: 0,
      });

      await scheduleStreakWarning();

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('should NOT schedule if already checked in today', async () => {
      (getStreakData as jest.Mock).mockResolvedValue({
        currentStreak: 5,
        lastCheckInDate: new Date().toISOString().split('T')[0],
        longestStreak: 10,
        freezeCount: 0,
      });
      (getDailyCheckInStatus as jest.Mock).mockResolvedValue({
        checkedIn: true,
        credits: 2,
        streak: 5,
      });

      await scheduleStreakWarning();

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('should NOT schedule if past 20:00 KST', async () => {
      (getStreakData as jest.Mock).mockResolvedValue({
        currentStreak: 5,
        lastCheckInDate: '2026-03-07',
        longestStreak: 10,
        freezeCount: 0,
      });
      (getDailyCheckInStatus as jest.Mock).mockResolvedValue({
        checkedIn: false,
        credits: 0,
        streak: 5,
      });

      // 21:00 KST = 12:00 UTC -> past 20:00
      const RealDate = globalThis.Date;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const MockDate = class extends RealDate {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
          if (args.length === 0) {
            super('2026-03-08T12:00:00Z');
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            super(args[0] as any);
          }
        }
        static override now() { return new RealDate('2026-03-08T12:00:00Z').getTime(); }
      };
      globalThis.Date = MockDate as unknown as DateConstructor;

      try {
        await scheduleStreakWarning();
        expect(mockSchedule).not.toHaveBeenCalled();
      } finally {
        globalThis.Date = RealDate;
      }
    });

    it('should schedule if streak > 0, not checked in, and before 20:00 KST', async () => {
      (getStreakData as jest.Mock).mockResolvedValue({
        currentStreak: 7,
        lastCheckInDate: '2026-03-07',
        longestStreak: 10,
        freezeCount: 0,
      });
      (getDailyCheckInStatus as jest.Mock).mockResolvedValue({
        checkedIn: false,
        credits: 0,
        streak: 7,
      });

      // 10:00 KST = 01:00 UTC -> well before 20:00
      const RealDate = globalThis.Date;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const MockDate = class extends RealDate {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
          if (args.length === 0) {
            super('2026-03-08T01:00:00Z');
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            super(args[0] as any);
          }
        }
        static override now() { return new RealDate('2026-03-08T01:00:00Z').getTime(); }
      };
      globalThis.Date = MockDate as unknown as DateConstructor;

      try {
        await scheduleStreakWarning();
        expect(mockSchedule).toHaveBeenCalledTimes(1);
        expect(mockSchedule).toHaveBeenCalledWith(
          expect.objectContaining({
            identifier: 'streak-warning-daily',
            content: expect.objectContaining({
              sound: 'default',
            }),
            trigger: expect.objectContaining({
              type: 'timeInterval',
              repeats: false,
            }),
          })
        );
      } finally {
        globalThis.Date = RealDate;
      }
    });
  });

  // ============================================================================
  // cancelStreakWarning
  // ============================================================================

  describe('cancelStreakWarning', () => {
    it('should call cancelScheduledNotificationAsync with correct ID', async () => {
      await cancelStreakWarning();
      expect(mockCancel).toHaveBeenCalledWith('streak-warning-daily');
    });
  });

  // ============================================================================
  // onCheckInComplete
  // ============================================================================

  describe('onCheckInComplete', () => {
    it('should cancel streak warning on check-in', async () => {
      await onCheckInComplete();
      expect(mockCancel).toHaveBeenCalledWith('streak-warning-daily');
    });
  });
});
