/**
 * ConnectionStatus.tsx - Supabase 연결 상태 진단 컴포넌트
 *
 * 역할: "네트워크 상태 신호등"
 * - 앱 시작 시 Supabase에 실제 쿼리를 보내서 연결 확인
 * - 초록 점 = 연결됨, 빨간 점 = 실패, 노란 점 = 확인 중
 * - Supabase URL 앞부분 표시 (env 변수 로딩 여부 확인용)
 * - 탭하면 재시도
 *
 * 왜 만들었나: EAS 빌드에서 env 변수가 빈 값으로 들어가면
 * Supabase 호출이 영원히 로딩 상태에 빠집니다.
 * 이 컴포넌트로 "서버 연결이 되는지" 눈으로 확인할 수 있습니다.
 *
 * 임시 진단용이므로 문제 해결 후 제거해도 됩니다.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import supabase from '../../services/supabase';

type ConnectionState = 'checking' | 'connected' | 'disconnected';

interface DiagnosticInfo {
  state: ConnectionState;
  supabaseUrl: string;
  envLoaded: boolean;
  latencyMs: number | null;
  errorMessage: string | null;
}

export default function ConnectionStatus() {
  const [info, setInfo] = useState<DiagnosticInfo>({
    state: 'checking',
    supabaseUrl: '',
    envLoaded: false,
    latencyMs: null,
    errorMessage: null,
  });

  const checkConnection = useCallback(async () => {
    setInfo(prev => ({ ...prev, state: 'checking', errorMessage: null }));

    // 1. env 변수 확인
    const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    const envLoaded = rawUrl.length > 0 && rawKey.length > 0;

    // 2. 실제 Supabase 쿼리 테스트 (5초 타임아웃)
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        supabase.from('context_cards').select('id').limit(1),
        new Promise<{ error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ error: { message: 'Timeout: 5s' } }), 5000)
        ),
      ]);

      const latencyMs = Date.now() - startTime;

      if (result && 'error' in result && result.error) {
        // Supabase returned an error (could be table not found, auth issue, etc.)
        // But if the error is from Supabase itself, the connection works
        const errMsg = result.error.message || 'Unknown error';
        const isNetworkError = errMsg.includes('Timeout') ||
          errMsg.includes('fetch') ||
          errMsg.includes('network') ||
          errMsg.includes('Failed');

        setInfo({
          state: isNetworkError ? 'disconnected' : 'connected',
          supabaseUrl: rawUrl || '(env empty, using fallback)',
          envLoaded,
          latencyMs,
          errorMessage: isNetworkError ? errMsg : null,
        });
      } else {
        // Success
        setInfo({
          state: 'connected',
          supabaseUrl: rawUrl || '(env empty, using fallback)',
          envLoaded,
          latencyMs,
          errorMessage: null,
        });
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      setInfo({
        state: 'disconnected',
        supabaseUrl: rawUrl || '(env empty, using fallback)',
        envLoaded,
        latencyMs,
        errorMessage: err?.message || 'Connection failed',
      });
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // 색상 결정
  const dotColor =
    info.state === 'connected'
      ? '#4CAF50'
      : info.state === 'disconnected'
        ? '#F44336'
        : '#FFC107';

  const stateLabel =
    info.state === 'connected'
      ? 'DB OK'
      : info.state === 'disconnected'
        ? 'DB FAIL'
        : 'Checking...';

  // URL 앞 30자만 표시
  const displayUrl = info.supabaseUrl
    ? info.supabaseUrl.substring(0, 30) + (info.supabaseUrl.length > 30 ? '...' : '')
    : '(empty)';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={checkConnection}
      activeOpacity={0.7}
    >
      {/* 상태 점 */}
      <View style={[styles.dot, { backgroundColor: dotColor }]} />

      {/* 상태 텍스트 */}
      <Text style={styles.statusText}>{stateLabel}</Text>

      {/* URL */}
      <Text style={styles.urlText} numberOfLines={1}>
        {displayUrl}
      </Text>

      {/* 지연시간 */}
      {info.latencyMs !== null && (
        <Text style={styles.latencyText}>{info.latencyMs}ms</Text>
      )}

      {/* env 로딩 상태 */}
      <Text style={[styles.envText, { color: info.envLoaded ? '#4CAF50' : '#F44336' }]}>
        {info.envLoaded ? 'ENV:OK' : 'ENV:EMPTY'}
      </Text>

      {/* 에러 메시지 */}
      {info.errorMessage && (
        <Text style={styles.errorText} numberOfLines={1}>
          {info.errorMessage}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    gap: 6,
    flexWrap: 'wrap',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  urlText: {
    color: '#AAAAAA',
    fontSize: 10,
    flex: 1,
  },
  latencyText: {
    color: '#888888',
    fontSize: 10,
  },
  envText: {
    fontSize: 10,
    fontWeight: '600',
  },
  errorText: {
    color: '#F44336',
    fontSize: 10,
    width: '100%',
    marginTop: 2,
  },
});
