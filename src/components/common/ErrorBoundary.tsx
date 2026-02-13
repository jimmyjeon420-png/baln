/**
 * ErrorBoundary.tsx - React 에러 바운더리
 *
 * 역할: "안전망" -- 컴포넌트 에러를 잡아서 앱 전체 크래시 방지
 *
 * 기능:
 * - 에러 발생 시 Supabase analytics_events 테이블에 서버 리포팅
 * - "재시도" 버튼으로 에러 복구 시도
 * - "문제 신고" 버튼으로 사용자 피드백 수집
 *
 * 사용처:
 * - 각 카드 컴포넌트 래핑
 * - 전체 앱 최상위 래핑
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK_COLORS } from '../../styles/colors';
import supabase, { getCurrentUser } from '../../services/supabase';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  reported: boolean;
}

// ============================================================================
// 서버 에러 리포팅 (fire-and-forget)
// ============================================================================

/**
 * 에러를 Supabase analytics_events 테이블에 기록
 * - 비동기, 실패해도 무시 (fire-and-forget)
 * - 리포팅 실패가 또 다른 에러를 유발하지 않도록 전체를 try-catch
 */
function reportErrorToServer(
  error: Error,
  componentStack?: string,
  retryCount?: number,
): void {
  try {
    // 비동기 실행 (await 하지 않음 - fire-and-forget)
    (async () => {
      try {
        const user = await getCurrentUser();
        const truncatedStack = componentStack
          ? componentStack.substring(0, 500)
          : null;

        await supabase.from('analytics_events').insert({
          event_name: 'app_error',
          properties: {
            error_message: error.message?.substring(0, 300) ?? 'Unknown error',
            component_stack: truncatedStack,
            retry_count: retryCount ?? 0,
            error_name: error.name ?? 'Error',
          },
          created_at: new Date().toISOString(),
          user_id: user?.id ?? null,
        });
      } catch (reportError) {
        // 리포팅 실패 시 콘솔만 출력, 사용자에게는 영향 없음
        console.warn('[ErrorBoundary] 서버 에러 리포팅 실패 (무시됨):', reportError);
      }
    })();
  } catch (outerError) {
    // 외부 try-catch: 비동기 호출 자체가 실패해도 무시
    console.warn('[ErrorBoundary] 리포팅 래퍼 실패 (무시됨):', outerError);
  }
}

/**
 * 사용자 문제 신고를 Supabase에 기록
 */
function reportIssueToServer(errorMessage: string): void {
  try {
    (async () => {
      try {
        const user = await getCurrentUser();
        await supabase.from('analytics_events').insert({
          event_name: 'user_error_report',
          properties: {
            error_message: errorMessage?.substring(0, 300) ?? 'Unknown',
            reported_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
          user_id: user?.id ?? null,
        });
      } catch (reportError) {
        console.warn('[ErrorBoundary] 문제 신고 전송 실패 (무시됨):', reportError);
      }
    })();
  } catch (outerError) {
    console.warn('[ErrorBoundary] 문제 신고 래퍼 실패 (무시됨):', outerError);
  }
}

// ============================================================================
// 컴포넌트
// ============================================================================

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      reported: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] 에러 발생:', error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // 서버에 에러 리포팅 (fire-and-forget, 절대 블로킹하지 않음)
    reportErrorToServer(
      error,
      errorInfo.componentStack ?? undefined,
      this.state.retryCount,
    );
  }

  // ─── 재시도 (에러 복구 시도) ───
  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
      reported: false, // 재시도 시 신고 상태 초기화 (재발 에러 신고 가능)
    }));
  };

  // ─── 문제 신고 ───
  handleReportIssue = () => {
    const errorMessage = this.state.error?.message ?? '알 수 없는 오류';

    // 서버에 신고 기록
    reportIssueToServer(errorMessage);

    // 사용자에게 확인 알림
    Alert.alert(
      '신고 접수 완료',
      '문제가 접수되었습니다. 빠르게 확인하겠습니다.',
      [{ text: '확인', style: 'default' }],
    );

    this.setState({ reported: true });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={64} color={DARK_COLORS.error} />
          <Text style={styles.title}>문제가 발생했습니다</Text>
          <Text style={styles.message}>
            잠시 후 다시 시도해 주세요.
          </Text>

          {/* 개발 모드에서만 에러 상세 정보 표시 */}
          {__DEV__ && this.state.error && (
            <View style={styles.devErrorBox}>
              <Text style={styles.devErrorTitle}>개발 모드 에러 정보:</Text>
              <Text style={styles.devErrorText}>
                {this.state.error.message}
              </Text>
              {this.state.error.stack && (
                <Text style={styles.devErrorStack} numberOfLines={10}>
                  {this.state.error.stack}
                </Text>
              )}
            </View>
          )}

          {/* 재시도 횟수 표시 (2회 이상 실패 시) */}
          {this.state.retryCount >= 2 && (
            <Text style={styles.retryHint}>
              재시도 {this.state.retryCount}회 실패. 앱을 재시작해 보세요.
            </Text>
          )}

          {/* 액션 버튼 */}
          <View style={styles.buttonRow}>
            {/* 재시도 버튼 */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={this.handleRetry}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>재시도</Text>
            </TouchableOpacity>

            {/* 문제 신고 버튼 */}
            <TouchableOpacity
              style={[
                styles.reportButton,
                this.state.reported && styles.reportButtonDone,
              ]}
              onPress={this.handleReportIssue}
              disabled={this.state.reported}
            >
              <Ionicons
                name={this.state.reported ? 'checkmark-circle' : 'flag-outline'}
                size={18}
                color={this.state.reported ? DARK_COLORS.success : DARK_COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.reportButtonText,
                  this.state.reported && styles.reportButtonTextDone,
                ]}
              >
                {this.state.reported ? '신고 완료' : '문제 신고'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: DARK_COLORS.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: DARK_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryHint: {
    fontSize: 12,
    color: DARK_COLORS.warning,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: DARK_COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportButton: {
    backgroundColor: DARK_COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: DARK_COLORS.border,
  },
  reportButtonDone: {
    borderColor: DARK_COLORS.success,
    opacity: 0.7,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_COLORS.textSecondary,
  },
  reportButtonTextDone: {
    color: DARK_COLORS.success,
  },
  // 기존 스타일 유지 (하위 호환)
  button: {
    backgroundColor: DARK_COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: DARK_COLORS.textPrimary,
  },
  devErrorBox: {
    width: '100%',
    backgroundColor: DARK_COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: DARK_COLORS.borderStrong,
  },
  devErrorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK_COLORS.error,
    marginBottom: 4,
  },
  devErrorText: {
    fontSize: 12,
    color: DARK_COLORS.error,
    marginBottom: 4,
  },
  devErrorStack: {
    fontSize: 10,
    color: DARK_COLORS.textTertiary,
    fontFamily: 'monospace',
  },
});
