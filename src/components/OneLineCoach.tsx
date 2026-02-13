/**
 * One-Line Coach 메시지 박스
 * Egg 분석 + 포트폴리오 기반 맞춤형 조언 표시
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { CoachingMessage, CoachingSeverity } from '../types/coaching';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../styles/theme';
import { useTheme } from '../hooks/useTheme';

interface OneLineCoachProps {
  message: CoachingMessage;
  containerStyle?: ViewStyle;
  showDetailed?: boolean;
}

const OneLineCoach: React.FC<OneLineCoachProps> = ({
  message,
  containerStyle,
  showDetailed = false,
}) => {
  const { colors } = useTheme();

  /**
   * 심각도에 따른 색상 및 스타일
   */
  const getSeverityStyles = () => {
    switch (message.severity) {
      case CoachingSeverity.DANGER:
        return {
          backgroundColor: colors.error + '20',
          borderColor: colors.error,
          textColor: colors.error,
        };
      case CoachingSeverity.WARNING:
        return {
          backgroundColor: colors.warning + '20',
          borderColor: colors.warning,
          textColor: colors.warning,
        };
      case CoachingSeverity.SUCCESS:
        return {
          backgroundColor: colors.success + '20',
          borderColor: colors.success,
          textColor: colors.success,
        };
      case CoachingSeverity.INFO:
      default:
        return {
          backgroundColor: colors.info + '20',
          borderColor: colors.info,
          textColor: colors.info,
        };
    }
  };

  const severityStyles = getSeverityStyles();

  /**
   * 심각도 뱃지 (좌측 스트립)
   */
  const renderSeverityIndicator = () => {
    const badgeColors: Record<CoachingSeverity, string> = {
      [CoachingSeverity.DANGER]: colors.error,
      [CoachingSeverity.WARNING]: colors.warning,
      [CoachingSeverity.SUCCESS]: colors.success,
      [CoachingSeverity.INFO]: colors.info,
    };

    return (
      <View
        style={[
          styles.severityIndicator,
          {
            backgroundColor: badgeColors[message.severity],
          },
        ]}
      />
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: severityStyles.backgroundColor,
          borderColor: severityStyles.borderColor,
          borderWidth: 2,
          borderLeftWidth: 6,
        },
        containerStyle,
      ]}
    >
      {/* 좌측 심각도 인디케이터 */}
      <View style={styles.leftSection}>
        {renderSeverityIndicator()}
      </View>

      {/* 메인 콘텐츠 */}
      <View style={styles.contentSection}>
        {/* 아이콘 + 메인 메시지 */}
        <View style={styles.messageRow}>
          <Text style={styles.icon}>{message.icon}</Text>
          <Text
            style={[
              TYPOGRAPHY.labelMedium,
              {
                color: severityStyles.textColor,
                flex: 1,
                marginLeft: SIZES.md,
              },
            ]}
            numberOfLines={2}
          >
            {message.message}
          </Text>
        </View>

        {/* 상세 설명 (선택사항) */}
        {showDetailed && message.detailedMessage && (
          <View style={{ marginTop: SIZES.sm }}>
            <Text
              style={[
                TYPOGRAPHY.bodySmall,
                {
                  color: colors.textSecondary,
                  marginLeft: SIZES.xl + SIZES.md, // 아이콘 너비 + 여백
                },
              ]}
            >
              {message.detailedMessage}
            </Text>
          </View>
        )}

        {/* 권장 액션 (선택사항) */}
        {message.recommendedAction && (
          <View
            style={[
              styles.actionBadge,
              {
                backgroundColor: severityStyles.textColor + '20',
                marginLeft: SIZES.xl + SIZES.md,
                marginTop: SIZES.sm,
              },
            ]}
          >
            <Text
              style={[
                TYPOGRAPHY.labelSmall,
                {
                  color: severityStyles.textColor,
                },
              ]}
            >
              ➜ {message.recommendedAction}
            </Text>
          </View>
        )}
      </View>

      {/* 우측 여백 (대칭성) */}
      <View style={styles.rightSection} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: SIZES.rMd,
    padding: SIZES.md,
    marginVertical: SIZES.sm,
    ...SHADOWS.small,
    alignItems: 'flex-start',
  },
  leftSection: {
    marginRight: SIZES.md,
  },
  severityIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    minHeight: 80,
  },
  contentSection: {
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: SIZES.fXxl,
    lineHeight: SIZES.fXxl + 4,
  },
  actionBadge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.rSm,
    alignSelf: 'flex-start',
  },
  rightSection: {
    width: SIZES.xs,
  },
});

export default OneLineCoach;
