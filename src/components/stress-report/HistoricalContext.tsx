/**
 * HistoricalContext — Beat 2: 역사적 맥락 (Context)
 *
 * 역할: "전에도 이런 일이 있었고, 회복했습니다"
 * 세로 타임라인 형태로 과거 사례를 보여주고, 하단에 회복 통계 강조
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  getEventsForScenario,
  RECOVERY_STATS,
  type HistoricalEvent,
} from './historicalData';

interface HistoricalContextProps {
  scenarioType: 'market_correction' | 'bear_market' | 'rate_shock';
}

export const HistoricalContext: React.FC<HistoricalContextProps> = ({
  scenarioType,
}) => {
  const { colors } = useTheme();
  const events = getEventsForScenario(scenarioType);

  return (
    <View style={[s.container, { backgroundColor: colors.surface }]}>
      <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
        역사적 선례
      </Text>
      <Text style={[s.sectionSubtitle, { color: colors.textTertiary }]}>
        비슷한 상황이 과거에도 있었습니다
      </Text>

      <View style={s.timeline}>
        {events.map((event, i) => (
          <View key={event.year} style={s.timelineItem}>
            {/* 타임라인 라인 */}
            <View style={s.timelineLeft}>
              <View style={[s.dot, { backgroundColor: colors.primary }]} />
              {i < events.length - 1 && (
                <View style={[s.line, { backgroundColor: colors.border }]} />
              )}
            </View>

            {/* 이벤트 내용 */}
            <View style={[s.eventCard, { backgroundColor: `${colors.primary}08` }]}>
              <View style={s.eventHeader}>
                <Text style={[s.eventYear, { color: colors.primary }]}>
                  {event.year}
                </Text>
                <Text style={[s.eventName, { color: colors.textPrimary }]}>
                  {event.name}
                </Text>
              </View>

              <Text style={[s.eventDesc, { color: colors.textSecondary }]}>
                {event.shortDescription}
              </Text>

              <View style={s.eventStats}>
                <View style={s.eventStat}>
                  <Text style={[s.statValue, { color: colors.warning }]}>
                    {event.maxDrawdown}%
                  </Text>
                  <Text style={[s.statLabel, { color: colors.textTertiary }]}>
                    최대 하락
                  </Text>
                </View>
                <View style={s.eventStat}>
                  <Text style={[s.statValue, { color: colors.textPrimary }]}>
                    {event.recoveryMonths}개월
                  </Text>
                  <Text style={[s.statLabel, { color: colors.textTertiary }]}>
                    회복 기간
                  </Text>
                </View>
                <View style={s.eventStat}>
                  <Text style={[s.statValue, { color: colors.success }]}>
                    +{event.afterOneYear}%
                  </Text>
                  <Text style={[s.statLabel, { color: colors.textTertiary }]}>
                    회복 후 1년
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* 하단 강조 필 */}
      <View style={[s.highlightPill, { backgroundColor: `${colors.success}12` }]}>
        <Text style={[s.highlightText, { color: colors.success }]}>
          1970년 이후 -{getScenarioThreshold(scenarioType)}% 이상 조정{' '}
          {RECOVERY_STATS.totalCorrections}회 중{' '}
          {RECOVERY_STATS.recoveredCount}회({RECOVERY_STATS.recoveryRate}%) 회복
        </Text>
      </View>
    </View>
  );
};

function getScenarioThreshold(
  type: 'market_correction' | 'bear_market' | 'rate_shock'
): number {
  switch (type) {
    case 'market_correction':
      return 10;
    case 'bear_market':
      return 20;
    case 'rate_shock':
      return 10;
  }
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  timeline: {
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 14,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  eventCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    marginLeft: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eventYear: {
    fontSize: 15,
    fontWeight: '800',
  },
  eventName: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  eventStats: {
    flexDirection: 'row',
    gap: 16,
  },
  eventStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  highlightPill: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  highlightText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 21,
  },
});
