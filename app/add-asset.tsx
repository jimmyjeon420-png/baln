import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { analyzeAssetImage } from '../src/services/gemini';
import supabase from '../src/services/supabase';

export default function AddAssetScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any[]>([]);

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

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setImage(result.assets[0].uri);
        handleAnalyze(result.assets[0].base64);
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
      const result = await analyzeAssetImage(base64);
      setLoading(false);

      if (result.error) {
        Alert.alert("분석 실패", result.error);
        return;
      }

      if (Array.isArray(result) && result.length > 0) {
        // 데이터 검증 및 정제
        const validatedData = result.map((item: any, index: number) => ({
          ticker: item.ticker || `UNKNOWN_${index}`,
          name: item.name || `자산 ${index + 1}`,
          amount: Number(item.amount) || 0,
          price: Number(item.price) || 0,
          needsReview: item.needsReview || !item.ticker || item.price === 0,
        }));

        // 검토 필요 항목 개수 확인
        const reviewCount = validatedData.filter((item: any) => item.needsReview).length;

        setAnalyzedData(validatedData);

        if (reviewCount > 0) {
          Alert.alert(
            "확인 필요",
            `${validatedData.length}개 자산 추출 완료.\n⚠️ ${reviewCount}개 항목은 수동 확인이 필요합니다 (가격 또는 티커 불명확).`
          );
        } else {
          Alert.alert("성공", `${validatedData.length}개 자산을 추출했습니다. 내용을 확인하고 등록하세요.`);
        }
      } else if (Array.isArray(result) && result.length === 0) {
        Alert.alert("분석 실패", "이미지에서 자산 정보를 찾을 수 없습니다. 다른 이미지를 시도해주세요.");
      } else {
        Alert.alert("분석 오류", "AI가 인식한 데이터 형식이 올바르지 않습니다.");
      }
    } catch (error) {
      setLoading(false);
      console.error("handleAnalyze Error:", error);
      Alert.alert("오류", "이미지 분석 중 예기치 않은 오류가 발생했습니다.");
    }
  };

  // 3. DB에 저장
  const saveAssets = async () => {
    // 저장 전 유효성 검사
    if (analyzedData.length === 0) {
      Alert.alert("저장 불가", "저장할 자산이 없습니다.");
      return;
    }

    // 검토 필요 항목 경고
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

  // 실제 저장 로직 (분리)
  const performSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const newAssets = analyzedData.map((item) => ({
        user_id: user.id,
        ticker: String(item.ticker || 'UNKNOWN').trim(),
        name: String(item.name || '알 수 없는 자산').trim(),
        quantity: Number(item.amount) || 0,
        avg_price: Number(item.price) || 0,
        current_price: Number(item.price) || 0,
      }));

      // 빈 티커 필터링 (안전장치)
      const validAssets = newAssets.filter(
        (asset) => asset.ticker && asset.ticker !== 'UNKNOWN' && asset.name
      );

      if (validAssets.length === 0) {
        throw new Error("유효한 자산이 없습니다. 티커와 이름을 확인해주세요.");
      }

      // Supabase에 저장
      const { error } = await supabase
        .from('assets')
        .insert(validAssets);

      if (error) {
        throw error;
      }

      setLoading(false);
      Alert.alert("성공", `${validAssets.length}개의 자산이 등록되었습니다.`);
      setAnalyzedData([]);
      setImage(null);
      router.push('/(tabs)/portfolio');
    } catch (error) {
      setLoading(false);
      console.error("Save Assets Error:", error);
      Alert.alert("저장 실패", error instanceof Error ? error.message : "자산 저장 중 오류가 발생했습니다.");
    }
  };

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
        ) : (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={pickImage}
              disabled={loading}
            >
              <Text style={styles.changeImageText}>다른 이미지 선택</Text>
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

            {/* 저장 버튼 */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveAssets}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>자산 등록</Text>
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
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 12,
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
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});