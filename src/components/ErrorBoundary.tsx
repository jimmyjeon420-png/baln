import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 에러 바운더리 컴포넌트
 * 앱의 크래시를 방지하고 에러를 표시합니다
 */
export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('에러 바운더리에서 캡처됨:', error);
    console.error('에러 정보:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>문제가 발생했습니다</Text>
          <Text style={styles.message}>
            앱을 다시 시작해주세요.
          </Text>
          <Text style={styles.errorDetails}>{this.state.error?.message}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#B3B3B3',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 12,
    color: '#CF6679',
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
