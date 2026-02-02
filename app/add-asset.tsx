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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    const result = await analyzeAssetImage(base64);
    setLoading(false);

    if (result.error) {
      Alert.alert("분석 실패", result.error);
    } else {
      if (Array.isArray(result)) {
        setAnalyzedData(result);
        Alert.alert("성공", "자산 목록을 추출했습니다. 내용을 확인하고 등록하세요.");
      } else {
        Alert.alert("분석 오류", "AI가 인식한 데이터 형식이 올바르지 않습니다.");
      }
    }
  };

  // 3. DB에 저장
  const saveAssets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const newAssets = analyzedData.map((item) => {
        return {
          user_id: user.id,
          ticker: item.ticker,
          name: item.name,
          quantity: item.amount || 0,
          avg_price: item.price || 0,
          current_price: item.price || 0,
        };
      });

      // Supabase에 저장
      const { error } = await supabase
        .from('assets')
        .insert(newAssets);

      if (error) {
        throw error;
      }

      Alert.alert("성공", `${newAssets.length}개의 자산이 등록되었습니다.`);
      setAnalyzedData([]);
      setImage(null);
      router.push('/(tabs)/portfolio');
    } catch (error) {
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
              <View key={index} style={styles.dataItem}>
                <Text style={styles.dataItemText}>
                  {item.name} ({item.ticker})
                </Text>
                <Text style={styles.dataItemText}>
                  수량: {item.amount || 0}, 가격: ${item.price || 0}
                </Text>
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
  dataItemText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
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