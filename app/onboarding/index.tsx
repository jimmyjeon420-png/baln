// ============================================================================
// 온보딩 화면 (Anti-Toss 리라이트)
// 기존 3장 슬라이드 제거 → 1화면 검색 + 인기자산 칩 + 하트 토글
// 목표: 1분 안에 온보딩 완료, 가격/수량 입력 없이 관심 자산만 선택
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeartAssets } from '../../src/hooks/useHeartAssets';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// 인기 자산 하드코딩 데이터
// ============================================================================

interface PopularAsset {
  name: string;
  ticker: string;
  type: 'stock' | 'crypto';
}

const POPULAR_ASSETS: PopularAsset[] = [
  { name: '삼성전자', ticker: '005930', type: 'stock' },
  { name: '비트코인', ticker: 'BTC', type: 'crypto' },
  { name: '테슬라', ticker: 'TSLA', type: 'stock' },
  { name: '애플', ticker: 'AAPL', type: 'stock' },
  { name: '이더리움', ticker: 'ETH', type: 'crypto' },
  { name: '현대차', ticker: '005380', type: 'stock' },
  { name: '카카오', ticker: '035720', type: 'stock' },
  { name: '네이버', ticker: '035420', type: 'stock' },
];

// ============================================================================
// 온보딩 메인 컴포넌트
// ============================================================================

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { addHeart } = useHeartAssets();

  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState('');

  // 선택된 자산 (ticker 기반 Set)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // 검색 필터링: 검색어가 있으면 name에 포함된 것만 표시
  const displayedAssets = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) return POPULAR_ASSETS;
    return POPULAR_ASSETS.filter((asset) =>
      asset.name.toLowerCase().includes(trimmed.toLowerCase())
    );
  }, [searchQuery]);

  // 선택 개수
  const selectedCount = selectedAssets.size;

  // 칩 하트 토글
  const handleToggle = (ticker: string) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  };

  // 시작하기 버튼 핸들러
  const handleStart = async () => {
    try {
      // 1. 선택한 자산들 Heart에 저장
      const selectedArray = POPULAR_ASSETS.filter((a) =>
        selectedAssets.has(a.ticker)
      );
      for (const asset of selectedArray) {
        addHeart({
          name: asset.name,
          ticker: asset.ticker,
          type: asset.type,
        });
      }

      // 2. 온보딩 완료 플래그
      await AsyncStorage.setItem('@baln:onboarding_completed', 'true');

      // 3. 메인 화면으로
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Onboarding] 완료 실패:', error);
      // 에러 발생해도 홈으로 이동
      router.replace('/(tabs)');
    }
  };

  // 건너뛰기 핸들러
  const handleSkip = async () => {
    try {
      // 자산 선택 없이 온보딩 완료 플래그만 설정
      await AsyncStorage.setItem('@baln:onboarding_completed', 'true');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Onboarding] 건너뛰기 저장 실패:', error);
      router.replace('/(tabs)');
    }
  };

  // 버튼 활성화 여부 (1개 이상 선택)
  const isStartEnabled = selectedCount >= 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* 질문 텍스트 */}
      <Text style={styles.heading}>
        {'어떤 자산이\n궁금하세요?'}
      </Text>

      {/* 검색바 */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="삼성전자, 비트코인..."
          placeholderTextColor="#757575"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {/* 인기 자산 / 검색 결과 라벨 */}
      <Text style={styles.sectionLabel}>
        {searchQuery.trim().length > 0 ? '검색 결과' : '인기 자산'}
      </Text>

      {/* 자산 칩 목록 (스크롤 가능) */}
      <ScrollView
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {displayedAssets.length > 0 ? (
          <View style={styles.chipsWrap}>
            {displayedAssets.map((asset) => {
              const isSelected = selectedAssets.has(asset.ticker);
              return (
                <TouchableOpacity
                  key={asset.ticker}
                  style={[
                    styles.chip,
                    isSelected ? styles.chipSelected : styles.chipUnselected,
                  ]}
                  onPress={() => handleToggle(asset.ticker)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected
                        ? styles.chipTextSelected
                        : styles.chipTextUnselected,
                    ]}
                  >
                    {asset.name}
                  </Text>
                  {isSelected && <Text style={styles.chipHeart}>{' \u2764\uFE0F'}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noResult}>검색 결과가 없습니다</Text>
        )}
      </ScrollView>

      {/* 하단 영역 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {/* 선택 카운트 메시지 */}
        {selectedCount > 0 && (
          <Text style={styles.countText}>
            {`좋아요! ${selectedCount}개 선택했어요 \u2764\uFE0F`}
          </Text>
        )}

        {/* 시작하기 버튼 */}
        <TouchableOpacity
          style={[
            styles.startButton,
            { opacity: isStartEnabled ? 1 : 0.4 },
          ]}
          onPress={handleStart}
          disabled={!isStartEnabled}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>{'시작하기 \u2192'}</Text>
        </TouchableOpacity>

        {/* 건너뛰기 */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.6}
        >
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// 스타일 (다크 모드 기반 - Premium Fintech)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 24,
  },

  // 질문 텍스트
  heading: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 44,
    marginBottom: 24,
  },

  // 검색바
  searchBarContainer: {
    marginBottom: 24,
  },
  searchInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },

  // 섹션 라벨
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B0B0B0',
    marginBottom: 12,
  },

  // 칩 스크롤 영역
  chipsScroll: {
    flex: 1,
  },
  chipsContainer: {
    paddingBottom: 16,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // 칩 공통
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 4,
  },

  // 선택된 칩
  chipSelected: {
    backgroundColor: '#4CAF50',
  },

  // 미선택 칩
  chipUnselected: {
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },

  // 칩 텍스트
  chipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextUnselected: {
    color: '#B0B0B0',
  },

  // 하트 아이콘
  chipHeart: {
    fontSize: 13,
  },

  // 검색 결과 없음
  noResult: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 40,
  },

  // 하단 영역
  footer: {
    paddingTop: 12,
    alignItems: 'center',
  },

  // 선택 카운트
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },

  // 시작하기 버튼
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // 건너뛰기
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    color: '#757575',
    fontSize: 14,
  },
});
