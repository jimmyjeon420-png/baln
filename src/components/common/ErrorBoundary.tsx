/**
 * ErrorBoundary.tsx - React 에러 바운더리
 *
 * 역할: "안전망" — 컴포넌트 에러를 잡아서 앱 전체 크래시 방지
 *
 * 사용처:
 * - 각 카드 컴포넌트 래핑
 * - 전체 앱 최상위 래핑
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK_COLORS } from '../../styles/colors';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] 에러 발생:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
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
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

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
