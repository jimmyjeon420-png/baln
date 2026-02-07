import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
// 이미지 최대 높이 제한 (스크롤 편의성 + 메모리 절약)
const MAX_IMAGE_HEIGHT = 500;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeAssetImage, validateAssetData } from '../src/services/gemini';
import supabase from '../src/services/supabase';

// 진단 트리거 플래그 키
const NEEDS_DIAGNOSIS_KEY = '@smart_rebalancer:needs_diagnosis';
const LAST_SCAN_DATE_KEY = '@smart_rebalancer:last_scan_date';

// 입력 모드 타입
type InputMode = 'self_declared' | 'ocr_verified';

/** 타임아웃 래퍼: Promise/PromiseLike가 지정 시간 내 완료되지 않으면 reject */
function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

export default function AddAssetScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(0.5);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('self_declared');

  // 1. 갤러리에서 이미지 선택
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = asset.base64;

        // base64가 없으면 분석 불가
        if (!base64) {
          Alert.alert("오류", "이미지 데이터를 읽을 수 없습니다. 다른 이미지를 선택해주세요.");
          return;
        }

        setImage(asset.uri);
        setImageBase64(base64);

        if (asset.width && asset.height) {
          setImageAspectRatio(asset.width / asset.height);
        }

        handleAnalyze(base64);
      }
    } catch (error) {
      console.error("Image Picker Error:", error);
      Alert.alert("오류", "갤러리를 여는 중 문제가 발생했습니다.");
    }
  };

  // 2. AI 분석 요청
  const handleAnalyze = async (base64: string) => {
    setLoading(true);
    try {
      const result = await withTimeout(
        analyzeAssetImage(base64),
        60000, // 60초 타임아웃
        'AI 분석 시간이 초과되었습니다. 다시 시도해주세요.'
      );
      setLoading(false);

      if (result.error) {
        Alert.alert("분석 실패", result.error);
        return;
      }

      const assets = result.assets || [];

      if (assets.length > 0) {
        const validatedData = assets.map((item: any, index: number) => ({
          ticker: item.ticker || `UNKNOWN_${index}`,
          name: item.name || `자산 ${index + 1}`,
          amount: Number(item.amount) || 0,
          price: Number(item.price) || 0,
          needsReview: item.needsReview || !item.ticker || item.price === 0,
        }));

        setAnalyzedData(validatedData);

        const validation = result.validation;
        const reviewCount = validatedData.filter((item: any) => item.needsReview).length;

        if (validation && !validation.isValid) {
          Alert.alert(
            "⚠️ 데이터 인식 오류",
            `${validation.errorMessage}\n\n` +
            `화면 총액: ${(result.totalValueFromScreen || 0).toLocaleString()}원\n` +
            `계산 총액: ${(validation.totalCalculated || 0).toLocaleString()}원\n\n` +
            `${validatedData.length}개 자산이 추출되었습니다. 가격을 확인해주세요.`
          );
        } else if (reviewCount > 0) {
          Alert.alert(
            "확인 필요",
            `${validatedData.length}개 자산 추출 완료.\n⚠️ ${reviewCount}개 항목은 수동 확인이 필요합니다 (가격 또는 티커 불명확).`
          );
        } else {
          const totalValue = validatedData.reduce(
            (sum: number, item: any) => sum + (item.amount * item.price), 0
          );
          Alert.alert(
            "✓ 분석 완료",
            `${validatedData.length}개 자산 (총 ${totalValue.toLocaleString()}원)\n\n내용을 확인하고 등록하세요.`
          );
        }
      } else {
        Alert.alert("분석 실패", "이미지에서 자산 정보를 찾을 수 없습니다. 다른 이미지를 시도해주세요.");
      }
    } catch (error) {
      setLoading(false);
      console.error("handleAnalyze Error:", error);
      Alert.alert("오류", error instanceof Error ? error.message : "이미지 분석 중 예기치 않은 오류가 발생했습니다.");
    }
  };

  // 3. DB에 저장
  const saveAssets = async () => {
    if (analyzedData.length === 0) {
      Alert.alert("저장 불가", "저장할 자산이 없습니다.");
      return;
    }

    const reviewItems = analyzedData.filter((item) => item.needsReview);
    if (reviewItems.length > 0) {
      Alert.alert(
        "확인 필요",
        `${reviewItems.length}개 항목의 가격/티커가 불확실합니다. 그래도 저장하시겠습니까?`,
        [
          { text: "취소", style: "cancel" },
          { text: "저장", onPress: () => performSave() }
        ]
      );
    } else {
      performSave();
    }
  };

  /**
   * OCR 검증 실행
   * AI가 스크린샷 분석 → 가격 보정 → 5% 오차 이내 검증
   */
  const handleVerification = async () => {
    if (!imageBase64) {
      Alert.alert('오류', '검증할 이미지가 없습니다. 이미지를 다시 선택해주세요.');
      return;
    }

    if (analyzedData.length === 0) {
      Alert.alert('오류', '먼저 이미지를 분석해주세요.');
      return;
    }

    setVerifying(true);

    try {
      // 인증 상태 확인 (10초 타임아웃 — 네트워크 문제 시 무한 대기 방지)
      const { data } = await withTimeout(
        supabase.auth.getUser(),
        10000,
        '서버 연결 시간이 초과되었습니다. 네트워크를 확인해주세요.'
      );

      if (!data?.user) {
        throw new Error('로그인이 필요합니다. 앱을 다시 시작해주세요.');
      }

      // OCR 추출 총액 계산
      const calculatedTotal = analyzedData.reduce((sum, item) => {
        return sum + ((item.amount || 0) * (item.price || 0));
      }, 0);

      if (calculatedTotal <= 0) {
        throw new Error('자산 총액이 0원입니다. 가격을 확인해주세요.');
      }

      // 무결성 검증 수행 (5% 오차 허용)
      const validation = validateAssetData(analyzedData, calculatedTotal, 0.05);

      if (!validation.isValid) {
        Alert.alert(
          '검증 실패',
          `${validation.errorMessage}\n\n계산 총액: ${validation.totalCalculated.toLocaleString()}원\n\n가격을 수동으로 확인해주세요.`,
          [{ text: '확인' }]
        );
        return;
      }

      // 검증 성공 - 보정된 데이터로 업데이트
      if (validation.correctedAssets && validation.correctedAssets.length > 0) {
        setAnalyzedData(validation.correctedAssets);
      }

      setInputMode('ocr_verified');

      Alert.alert(
        '✓ 검증 완료',
        `총 ${calculatedTotal.toLocaleString()}원의 자산이 검증되었습니다.\n\n이 자산은 VIP 라운지 입장 조건에 포함됩니다.`,
        [{ text: '확인' }]
      );
    } catch (error: any) {
      console.error('검증 실패:', error);
      Alert.alert(
        '검증 실패',
        error.message || '검증 중 오류가 발생했습니다.\n\n네트워크 연결을 확인하고 다시 시도해주세요.',
        [{ text: '확인' }]
      );
    } finally {
      // 항상 로딩 상태 해제 (무한 스피너 방지)
      setVerifying(false);
    }
  };

  // 실제 저장 로직 — portfolios 테이블에 UPSERT
  const performSave = async () => {
    try {
      setLoading(true);

      const { data } = await withTimeout(
        supabase.auth.getUser(),
        10000,
        '서버 연결 시간이 초과되었습니다.'
      );

      if (!data?.user) throw new Error("로그인이 필요합니다.");

      const validAssets = analyzedData.filter(
        (item) => item.ticker && item.ticker !== 'UNKNOWN' && item.name
      );

      if (validAssets.length === 0) {
        throw new Error("유효한 자산이 없습니다. 티커와 이름을 확인해주세요.");
      }

      const upsertData = validAssets.map((item) => {
        const ticker = String(item.ticker).trim();
        const name = String(item.name || '알 수 없는 자산').trim();
        const quantity = Number(item.amount) || 0;
        const price = Number(item.price) || 0;

        return {
          user_id: data.user.id,
          ticker: ticker,
          name: name,
          quantity: quantity,
          avg_price: price,
          current_price: price,
          current_value: quantity * price,
          target_allocation: 0,
          asset_type: 'liquid',
          currency: 'KRW',
        };
      });

      const { data: savedData, error: upsertError } = await withTimeout(
        supabase
          .from('portfolios')
          .upsert(upsertData, {
            onConflict: 'user_id,name',
            ignoreDuplicates: false,
          })
          .select(),
        15000,
        'DB 저장 시간이 초과되었습니다.'
      );

      if (upsertError) {
        console.error("Upsert Error:", upsertError);
        throw upsertError;
      }

      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(NEEDS_DIAGNOSIS_KEY, 'true');
      await AsyncStorage.setItem(LAST_SCAN_DATE_KEY, today);

      setLoading(false);

      const savedCount = savedData?.length || upsertData.length;
      Alert.alert(
        "✓ 등록 완료",
        `${savedCount}개 자산이 저장되었습니다.\n\nAI가 맞춤형 처방전을 준비합니다.`,
        [
          {
            text: "처방전 보기",
            onPress: () => {
              setAnalyzedData([]);
              setImage(null);
              router.push('/(tabs)/diagnosis');
            }
          },
          {
            text: "나중에",
            style: "cancel",
            onPress: () => {
              setAnalyzedData([]);
              setImage(null);
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      setLoading(false);
      console.error("Save Assets Error:", error);
      Alert.alert(
        "저장 실패",
        error instanceof Error ? error.message : "자산 저장 중 오류가 발생했습니다.",
        [{ text: '확인' }]
      );
    }
  };

  // 이미지 높이 계산 (최대 높이 제한)
  const imageWidth = SCREEN_WIDTH - 32;
  const rawHeight = imageWidth / imageAspectRatio;
  const imageHeight = Math.min(rawHeight, MAX_IMAGE_HEIGHT);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>자산 추가</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* 이미지 선택 영역 */}
        {!image ? (
          <>
            <TouchableOpacity
              style={styles.imagePlaceholder}
              onPress={pickImage}
              disabled={loading}
            >
              <Ionicons name="image" size={48} color="#4CAF50" />
              <Text style={styles.placeholderText}>
                {loading ? "분석 중..." : "자산 영수증 사진 선택"}
              </Text>
              {loading && <ActivityIndicator color="#4CAF50" size="large" />}
            </TouchableOpacity>

            {/* MTS 스크린샷 캡처 가이드 */}
            <View style={styles.guideContainer}>
              <View style={styles.guideHeader}>
                <Ionicons name="information-circle" size={20} color="#4CAF50" />
                <Text style={styles.guideTitle}>스크린샷 캡처 가이드</Text>
              </View>

              <Text style={styles.guideSubtitle}>지원 앱</Text>
              <View style={styles.supportedAppsRow}>
                {['토스증권', '한국투자', '키움증권', '삼성증권', '업비트', '빗썸'].map((app) => (
                  <View key={app} style={styles.appBadge}>
                    <Text style={styles.appBadgeText}>{app}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.guideSubtitle}>캡처 방법</Text>
              <View style={styles.guideSteps}>
                <View style={styles.guideStep}>
                  <Text style={styles.stepNumber}>1</Text>
                  <Text style={styles.stepText}>
                    <Text style={styles.stepHighlight}>'내 투자'</Text> 또는{' '}
                    <Text style={styles.stepHighlight}>'포트폴리오'</Text> 화면으로 이동
                  </Text>
                </View>
                <View style={styles.guideStep}>
                  <Text style={styles.stepNumber}>2</Text>
                  <Text style={styles.stepText}>
                    <Text style={styles.stepHighlight}>수량</Text>과{' '}
                    <Text style={styles.stepHighlight}>평가금액</Text>이 함께 보이는 화면 캡처
                  </Text>
                </View>
                <View style={styles.guideStep}>
                  <Text style={styles.stepNumber}>3</Text>
                  <Text style={styles.stepText}>
                    팝업이나 알림이 가리지 않도록 주의
                  </Text>
                </View>
              </View>

              <View style={styles.guideTip}>
                <Ionicons name="bulb" size={16} color="#FFD700" />
                <Text style={styles.guideTipText}>
                  토스증권: '내 자산' 탭에서 종목별 평가금액이 보이는 화면을 캡처하세요
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.imageContainer}>
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: image }}
                style={[
                  styles.image,
                  {
                    width: imageWidth,
                    height: imageHeight,
                  },
                  loading && { opacity: 0.4 },
                ]}
                resizeMode="contain"
              />
              {loading && (
                <View style={styles.analysisOverlay}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={styles.analysisOverlayText}>AI가 자산을 분석하고 있어요...</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={pickImage}
              disabled={loading}
            >
              <Text style={styles.changeImageText}>
                {loading ? '분석 중...' : '다른 이미지 선택'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 분석된 데이터 표시 */}
        {analyzedData.length > 0 && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>추출된 자산 목록</Text>
            {analyzedData.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.dataItem,
                  item.needsReview && styles.dataItemWarning
                ]}
              >
                <View style={styles.dataItemHeader}>
                  <Text style={styles.dataItemText}>
                    {item.name} ({item.ticker})
                  </Text>
                  {item.needsReview && (
                    <Ionicons name="warning" size={16} color="#CF6679" />
                  )}
                </View>
                <Text style={styles.dataItemText}>
                  수량: {item.amount || 0}, 가격: {(item.price || 0).toLocaleString()}원
                </Text>
                {item.needsReview && (
                  <Text style={styles.warningText}>⚠️ 확인 필요</Text>
                )}
              </View>
            ))}

            {/* 입력 모드 선택 */}
            <View style={styles.inputModeSection}>
              <Text style={styles.inputModeTitle}>등록 방식</Text>
              <View style={styles.inputModeButtons}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    inputMode === 'self_declared' && styles.modeButtonActive
                  ]}
                  onPress={() => setInputMode('self_declared')}
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={inputMode === 'self_declared' ? '#FFFFFF' : '#888888'}
                  />
                  <Text style={[
                    styles.modeButtonText,
                    inputMode === 'self_declared' && styles.modeButtonTextActive
                  ]}>
                    수동 입력
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    inputMode === 'ocr_verified' && styles.modeButtonVerified
                  ]}
                  onPress={() => handleVerification()}
                  disabled={verifying}
                >
                  {verifying ? (
                    <>
                      <ActivityIndicator size="small" color="#4CAF50" />
                      <Text style={[styles.modeButtonText, { color: '#4CAF50' }]}>검증 중...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name="shield-checkmark"
                        size={18}
                        color={inputMode === 'ocr_verified' ? '#FFFFFF' : '#4CAF50'}
                      />
                      <Text style={[
                        styles.modeButtonText,
                        inputMode === 'ocr_verified' && styles.modeButtonTextActive,
                        inputMode !== 'ocr_verified' && { color: '#4CAF50' }
                      ]}>
                        {inputMode === 'ocr_verified' ? '검증됨' : 'OCR 검증'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {inputMode === 'self_declared' && (
                <Text style={styles.modeNote}>
                  * 수동 입력은 VIP 라운지 입장 조건에 포함되지 않습니다
                </Text>
              )}
              {inputMode === 'ocr_verified' && (
                <Text style={[styles.modeNote, { color: '#4CAF50' }]}>
                  ✓ OCR 검증 완료! VIP 라운지 입장 조건에 포함됩니다
                </Text>
              )}
            </View>

            {/* 저장 버튼 */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                inputMode === 'ocr_verified' && styles.saveButtonVerified
              ]}
              onPress={saveAssets}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={inputMode === 'ocr_verified' ? 'shield-checkmark' : 'save'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveButtonText}>
                    {inputMode === 'ocr_verified' ? '검증된 자산 등록' : '자산 등록 (수동)'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imagePlaceholder: {
    height: 250,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#1E1E1E',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#AAAAAA',
  },
  imageContainer: {
    marginBottom: 24,
  },
  analysisOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  analysisOverlayText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  image: {
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: 'center',
    backgroundColor: '#1E1E1E',
  },
  changeImageButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  changeImageText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  dataContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  dataItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 8,
  },
  dataItemWarning: {
    borderWidth: 1,
    borderColor: '#CF6679',
    backgroundColor: '#2A2020',
  },
  dataItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataItemText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  warningText: {
    color: '#CF6679',
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#666666',
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonVerified: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  // 입력 모드 섹션
  inputModeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  inputModeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAAAAA',
    marginBottom: 12,
  },
  inputModeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  modeButtonActive: {
    backgroundColor: '#555555',
    borderColor: '#666666',
  },
  modeButtonVerified: {
    backgroundColor: '#1B4D1B',
    borderColor: '#4CAF50',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#888888',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modeNote: {
    fontSize: 12,
    color: '#888888',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // 스크린샷 가이드 스타일
  guideContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guideSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 8,
    marginTop: 12,
  },
  supportedAppsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  appBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  appBadgeText: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  guideSteps: {
    gap: 10,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4CAF50',
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  stepHighlight: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  guideTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  guideTipText: {
    flex: 1,
    fontSize: 12,
    color: '#FFD700',
    lineHeight: 18,
  },
});
