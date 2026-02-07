/**
 * 장소 검색 입력 컴포넌트
 * 카카오 API 자동완성 + 지도 미리보기
 * (모임 생성 시 오프라인 장소 선택에 사용)
 *
 * react-native-maps가 없으면 (Expo Go 등)
 * 주소 카드만 표시하고 지도는 생략합니다.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchPlaces, ParsedPlace } from '../services/kakaoLocalSearch';

// react-native-maps를 안전하게 로드 (Expo Go / 웹에서는 사용 불가)
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch {
    // Expo Go 환경 → 지도 미리보기 비활성화
  }
}

// 컬러 팔레트 (create.tsx와 동일)
const COLORS = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  primary: '#4CAF50',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#888888',
  border: '#333333',
  inputBg: '#1A1A1A',
};

interface LocationSearchInputProps {
  value: string;                          // 현재 장소 텍스트
  onChangeText: (text: string) => void;   // 텍스트 변경 콜백
  placeholder?: string;
}

export default function LocationSearchInput({
  value,
  onChangeText,
  placeholder = '예: 강남역 스타벅스 리저브',
}: LocationSearchInputProps) {
  // 검색 결과 드롭다운
  const [results, setResults] = useState<ParsedPlace[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  // 카카오 API 사용 가능 여부 체크
  const [apiAvailable, setApiAvailable] = useState(true);

  // 선택된 장소 (지도 표시용)
  const [selectedPlace, setSelectedPlace] = useState<ParsedPlace | null>(null);

  // 디바운스 타이머
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 첫 검색 시 API 가용성 확인
  const checkedRef = useRef(false);

  // 검색 실행 (300ms 디바운스)
  const handleSearch = useCallback((query: string) => {
    onChangeText(query);

    // 선택된 장소 초기화 (사용자가 다시 타이핑하면)
    if (selectedPlace && query !== selectedPlace.name) {
      setSelectedPlace(null);
    }

    // 이전 타이머 취소
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // 2글자 미만이면 결과 숨김
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // 300ms 디바운스 후 검색
    debounceTimer.current = setTimeout(async () => {
      setSearching(true);
      const places = await searchPlaces(query, 5);

      // 첫 검색에서 결과가 비어있으면 API 미설정으로 판단
      if (!checkedRef.current && places.length === 0 && query.trim().length >= 2) {
        checkedRef.current = true;
        const testPlaces = await searchPlaces('서울역', 1);
        if (testPlaces.length === 0) {
          setApiAvailable(false);
        }
      } else if (places.length > 0) {
        checkedRef.current = true;
      }

      setResults(places);
      setShowResults(places.length > 0);
      setSearching(false);
    }, 300);
  }, [onChangeText, selectedPlace]);

  // 검색 결과 선택
  const handleSelectPlace = useCallback((place: ParsedPlace) => {
    onChangeText(place.name);
    setSelectedPlace(place);
    setShowResults(false);
    setResults([]);
  }, [onChangeText]);

  // 입력 초기화
  const handleClear = useCallback(() => {
    onChangeText('');
    setSelectedPlace(null);
    setResults([]);
    setShowResults(false);
  }, [onChangeText]);

  // 카카오맵 앱/웹으로 열기
  const openInKakaoMap = useCallback(() => {
    if (!selectedPlace) return;
    const url = `https://map.kakao.com/link/map/${encodeURIComponent(selectedPlace.name)},${selectedPlace.latitude},${selectedPlace.longitude}`;
    Linking.openURL(url);
  }, [selectedPlace]);

  return (
    <View style={styles.container}>
      {/* 검색 입력 필드 */}
      <View style={styles.inputWrapper}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={handleSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searching && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loadingIcon} />
        )}
        {value.length > 0 && !searching && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* API 키 미설정 안내 */}
      {!apiAvailable && value.length >= 2 && !selectedPlace && (
        <View style={styles.apiHint}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.apiHintText}>
            장소 자동완성을 사용하려면 카카오 API 키가 필요합니다. 직접 입력도 가능합니다.
          </Text>
        </View>
      )}

      {/* 자동완성 드롭다운 */}
      {showResults && (
        <View style={styles.dropdown}>
          {results.map((place, index) => (
            <TouchableOpacity
              key={`${place.latitude}-${place.longitude}-${index}`}
              style={[
                styles.dropdownItem,
                index < results.length - 1 && styles.dropdownItemBorder,
              ]}
              onPress={() => handleSelectPlace(place)}
            >
              <Ionicons name="location-outline" size={16} color={COLORS.primary} />
              <View style={styles.dropdownItemText}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text style={styles.placeAddress} numberOfLines={1}>
                  {place.address}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 지도 미리보기 (장소 선택 후 표시) */}
      {selectedPlace && (
        <View style={styles.mapContainer}>
          {MapView ? (
            // react-native-maps 사용 가능 (EAS Build)
            <MapView
              style={styles.map}
              region={{
                latitude: selectedPlace.latitude,
                longitude: selectedPlace.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: selectedPlace.latitude,
                  longitude: selectedPlace.longitude,
                }}
                title={selectedPlace.name}
              />
            </MapView>
          ) : (
            // Expo Go 등 → 지도 대신 장소 카드 표시
            <TouchableOpacity style={styles.mapFallback} onPress={openInKakaoMap}>
              <Ionicons name="map" size={32} color={COLORS.primary} />
              <Text style={styles.mapFallbackTitle}>{selectedPlace.name}</Text>
              <Text style={styles.mapFallbackHint}>터치하면 카카오맵에서 열립니다</Text>
            </TouchableOpacity>
          )}

          {/* 선택된 주소 */}
          <View style={styles.addressBar}>
            <Ionicons name="location" size={14} color={COLORS.primary} />
            <Text style={styles.addressText} numberOfLines={1}>
              {selectedPlace.address}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  // 검색 입력
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  // API 키 안내
  apiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  apiHintText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  // 드롭다운
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemText: {
    flex: 1,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  placeAddress: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // 지도 미리보기
  mapContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  map: {
    height: 150,
    width: '100%',
  },
  // Expo Go 지도 대체 UI
  mapFallback: {
    height: 120,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapFallbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  mapFallbackHint: {
    fontSize: 11,
    color: COLORS.primary,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
