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

  // DEV 환경에서만 렌더링 — 프로덕션 빌드에서는 아무것도 표시하지 않음
  const [visible] = useState(__DEV__);

  const checkConnection = useCallback(async () => {
    if (!__DEV__) return; // 프로덕션에서는 체크 자체를 스킵

    setInfo(prev => ({ ...prev, state: 'checking', errorMessage: null }));

    const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    const envLoaded = rawUrl.length > 0 && rawKey.length > 0;

    // 15초 타임아웃 (시뮬레이터 + 콜드스타트 여유 확보)
    const TIMEOUT_MS = 15000;
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        supabase.from('context_cards').select('id').limit(1),
        new Promise<{ error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ error: { message: `Timeout: ${TIMEOUT_MS / 1000}s` } }), TIMEOUT_MS)
        ),
      ]);

      const latencyMs = Date.now() - startTime;

      if (result && 'error' in result && result.error) {
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
        setInfo({
          state: 'connected',
          supabaseUrl: rawUrl || '(env empty, using fallback)',
          envLoaded,
          latencyMs,
          errorMessage: null,
        });
      }
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      setInfo({
        state: 'disconnected',
        supabaseUrl: rawUrl || '(env empty, using fallback)',
        envLoaded,
        latencyMs,
        errorMessage: (err instanceof Error ? err.message : null) || 'Connection failed',
      });
    }
  }, []);

  useEffect(() => {
    checkConnection();

    // 첫 시도 실패 시 5초 후 자동 재시도 (시뮬레이터 콜드스타트 대비)
    const retryTimer = setTimeout(() => {
      setInfo(prev => {
        if (prev.state === 'disconnected') {
          checkConnection();
        }
        return prev;
      });
    }, 5000);

    return () => clearTimeout(retryTimer);
  }, [checkConnection]);

  // 프로덕션에서는 렌더링하지 않음
  if (!visible) return null;

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
