/**
 * 모임 생성 페이지
 * 1억+ 인증 사용자 전용
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useHostingEligibility,
  useCreateGathering,
  formatAssetInBillion,
  TIER_COLORS,
  TIER_LABELS,
  TIER_DESCRIPTIONS,
  getAvailableMinTiers,
} from '../../src/hooks/useGatherings';
import { Gathering, GATHERING_CATEGORY_LABELS, UserTier } from '../../src/types/database';
import LocationSearchInput from '../../src/components/LocationSearchInput';

// 컬러 팔레트
const COLORS = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  primary: '#4CAF50',
  error: '#CF6679',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#888888',
  border: '#333333',
  inputBg: '#1A1A1A',
};

// 카테고리 옵션
const CATEGORY_OPTIONS: { key: Gathering['category']; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'study', label: '스터디', icon: 'book' },
  { key: 'meeting', label: '정기 모임', icon: 'people' },
  { key: 'networking', label: '네트워킹', icon: 'link' },
  { key: 'workshop', label: '워크샵', icon: 'construct' },
];

// 장소 타입 옵션
const LOCATION_TYPE_OPTIONS: { key: Gathering['location_type']; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'offline', label: '오프라인', icon: 'location' },
  { key: 'online', label: '온라인', icon: 'videocam' },
];

export default function CreateGatheringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 호스팅 자격 확인
  const { data: hostingEligibility, isLoading: eligibilityLoading } = useHostingEligibility();
  const createMutation = useCreateGathering();

  // 폼 상태
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Gathering['category']>('study');
  const [entryFee, setEntryFee] = useState('0');
  const [maxCapacity, setMaxCapacity] = useState('10');
  const [locationType, setLocationType] = useState<Gathering['location_type']>('offline');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 기본 1주일 후
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [minTierRequired, setMinTierRequired] = useState<UserTier>('SILVER'); // 기본: 모든 티어 참가 가능
  const [submitting, setSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false); // 불법 리딩방 금지 동의

  // 권한 체크
  if (eligibilityLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>권한을 확인하는 중...</Text>
      </View>
    );
  }

  if (!hostingEligibility?.canHost) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>모임 만들기</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 권한 없음 */}
        <View style={styles.noPermissionContainer}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={48} color={COLORS.textMuted} />
          </View>
          <Text style={styles.noPermissionTitle}>호스트 자격이 필요합니다</Text>
          <Text style={styles.noPermissionDescription}>
            모임을 만들려면 1억 이상 자산이{'\n'}OCR 인증되어야 합니다.
          </Text>
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => router.push('/add-asset')}
          >
            <Ionicons name="camera" size={20} color="#000000" />
            <Text style={styles.verifyButtonText}>자산 OCR 인증하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 날짜 변경 핸들러
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(eventDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setEventDate(newDate);
    }
  };

  // 시간 변경 핸들러
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(eventDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setEventDate(newDate);
    }
  };

  // 폼 제출
  const handleSubmit = async () => {
    // 유효성 검사
    if (!title.trim()) {
      Alert.alert('입력 오류', '모임 제목을 입력해주세요.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('입력 오류', locationType === 'online' ? '온라인 미팅 링크를 입력해주세요.' : '장소를 입력해주세요.');
      return;
    }
    const maxCap = parseInt(maxCapacity, 10);
    if (isNaN(maxCap) || maxCap < 2 || maxCap > 100) {
      Alert.alert('입력 오류', '정원은 2~100명 사이로 입력해주세요.');
      return;
    }
    const fee = parseInt(entryFee, 10) || 0;
    if (fee < 0) {
      Alert.alert('입력 오류', '참가비는 0원 이상이어야 합니다.');
      return;
    }

    setSubmitting(true);
    try {
      const gathering = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || '',
        category,
        entry_fee: fee,
        max_capacity: maxCap,
        event_date: eventDate.toISOString(),
        location: location.trim(),
        location_type: locationType,
        min_tier_required: minTierRequired,
      });

      Alert.alert('완료', '모임이 생성되었습니다!', [
        {
          text: '확인',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      // Supabase 에러 코드별 안내
      const msg = error?.message || '';
      const code = error?.code || '';

      let userMessage = '모임 생성에 실패했습니다.';
      if (code === '42501' || msg.includes('policy')) {
        userMessage = 'DB 권한 설정이 필요합니다. Supabase 대시보드에서 gatherings 테이블의 RLS 정책을 확인해주세요.';
      } else if (code === '42P01' || msg.includes('does not exist')) {
        userMessage = 'gatherings 테이블이 없습니다. Supabase에서 마이그레이션을 실행해주세요.';
      } else if (msg) {
        userMessage = msg;
      }

      Alert.alert('모임 생성 오류', userMessage);
      console.error('[CreateGathering] 에러:', code, msg, error);
    } finally {
      setSubmitting(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${ampm} ${displayHours}:${minutes}`;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모임 만들기</Text>
        <TouchableOpacity
          style={[styles.submitButton, (submitting || !agreedToTerms) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !agreedToTerms}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.submitButtonText}>완료</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 호스트 정보 */}
          <View style={styles.hostInfoBanner}>
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS] }]}>
              <Ionicons name="shield-checkmark" size={16} color="#000000" />
            </View>
            <View style={styles.hostInfoText}>
              <Text style={styles.hostName}>{hostingEligibility.displayName}</Text>
              <Text style={[styles.hostAssets, { color: TIER_COLORS[hostingEligibility.tier as keyof typeof TIER_COLORS] }]}>
                {formatAssetInBillion(hostingEligibility.verifiedAssets)} 인증 호스트
              </Text>
            </View>
          </View>

          {/* 모임 제목 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>모임 제목 *</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 부동산 투자 스터디 3기"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
            <Text style={styles.charCount}>{title.length}/50</Text>
          </View>

          {/* 카테고리 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>카테고리 *</Text>
            <View style={styles.optionsGrid}>
              {CATEGORY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optionCard,
                    category === option.key && styles.optionCardActive,
                  ]}
                  onPress={() => setCategory(option.key)}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={category === option.key ? '#000000' : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      category === option.key && styles.optionLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 장소 타입 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>진행 방식 *</Text>
            <View style={styles.segmentedControl}>
              {LOCATION_TYPE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.segment,
                    locationType === option.key && styles.segmentActive,
                  ]}
                  onPress={() => setLocationType(option.key)}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={locationType === option.key ? '#000000' : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      locationType === option.key && styles.segmentTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 장소/링크 */}
          <View style={[styles.formGroup, locationType === 'offline' && { zIndex: 10 }]}>
            <Text style={styles.label}>
              {locationType === 'online' ? '미팅 링크' : '장소'} *
            </Text>
            {locationType === 'offline' ? (
              <LocationSearchInput
                value={location}
                onChangeText={setLocation}
                placeholder="예: 강남역 스타벅스 리저브"
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="예: https://zoom.us/j/123456"
                placeholderTextColor={COLORS.textMuted}
                value={location}
                onChangeText={setLocation}
                autoCapitalize="none"
              />
            )}
          </View>

          {/* 일시 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>일시 *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <Text style={styles.dateTimeText}>{formatDate(eventDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                <Text style={styles.dateTimeText}>{formatTime(eventDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              minimumDate={new Date()}
              textColor={COLORS.text}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={eventDate}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
              textColor={COLORS.text}
            />
          )}

          {/* 정원 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>정원 *</Text>
            <View style={styles.capacityInput}>
              <TouchableOpacity
                style={styles.capacityButton}
                onPress={() => {
                  const current = parseInt(maxCapacity, 10) || 10;
                  if (current > 2) setMaxCapacity(String(current - 1));
                }}
              >
                <Ionicons name="remove" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <TextInput
                style={styles.capacityValue}
                value={maxCapacity}
                onChangeText={setMaxCapacity}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={styles.capacityUnit}>명</Text>
              <TouchableOpacity
                style={styles.capacityButton}
                onPress={() => {
                  const current = parseInt(maxCapacity, 10) || 10;
                  if (current < 100) setMaxCapacity(String(current + 1));
                }}
              >
                <Ionicons name="add" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 참가비 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>참가비</Text>
            <View style={styles.feeInput}>
              <TextInput
                style={styles.feeValue}
                value={entryFee}
                onChangeText={setEntryFee}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
              />
              <Text style={styles.feeUnit}>원</Text>
            </View>
            {parseInt(entryFee, 10) > 0 && (
              <View style={styles.feeBreakdown}>
                <Text style={styles.feeBreakdownText}>
                  참가비: {parseInt(entryFee, 10).toLocaleString()}원
                </Text>
                <Text style={styles.feeBreakdownText}>
                  + 수수료(10%): {Math.round(parseInt(entryFee, 10) * 0.1).toLocaleString()}원
                </Text>
                <Text style={styles.feeBreakdownTotal}>
                  = 참가자 결제 금액: {Math.round(parseInt(entryFee, 10) * 1.1).toLocaleString()}원
                </Text>
              </View>
            )}
            <Text style={styles.helperText}>
              0원 입력 시 무료 모임으로 설정됩니다{'\n'}
              유료 모임의 경우 참가자에게 10% 수수료가 별도 부과됩니다
            </Text>
          </View>

          {/* 최소 입장 티어 (TBAC) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>최소 입장 조건</Text>
            <Text style={styles.helperText}>
              선택한 등급 이상의 회원만 참가할 수 있습니다
            </Text>
            <View style={styles.tierOptionsContainer}>
              {hostingEligibility?.availableMinTiers.map((tier) => (
                <TouchableOpacity
                  key={tier}
                  style={[
                    styles.tierOption,
                    minTierRequired === tier && styles.tierOptionActive,
                    { borderColor: TIER_COLORS[tier] + '50' },
                  ]}
                  onPress={() => setMinTierRequired(tier)}
                >
                  <View style={[styles.tierOptionIcon, { backgroundColor: TIER_COLORS[tier] + '30' }]}>
                    <Ionicons
                      name={tier === 'DIAMOND' ? 'diamond' : tier === 'PLATINUM' ? 'star' : tier === 'GOLD' ? 'trophy' : 'medal'}
                      size={16}
                      color={TIER_COLORS[tier]}
                    />
                  </View>
                  <View style={styles.tierOptionText}>
                    <Text style={[styles.tierOptionLabel, minTierRequired === tier && { color: TIER_COLORS[tier] }]}>
                      {TIER_LABELS[tier]}
                    </Text>
                    <Text style={styles.tierOptionDesc}>{TIER_DESCRIPTIONS[tier]}</Text>
                  </View>
                  {minTierRequired === tier && (
                    <Ionicons name="checkmark-circle" size={20} color={TIER_COLORS[tier]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 모임 설명 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>모임 소개</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="모임에 대해 소개해주세요 (선택사항)"
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* 불법 리딩방 금지 동의 (필수) */}
          <View style={styles.disclaimerSection}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                agreedToTerms && styles.checkboxChecked,
              ]}>
                {agreedToTerms && (
                  <Ionicons name="checkmark" size={14} color="#000000" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                불법 리딩방 운영 시 계정 영구 정지 및 민형사상 책임에 동의합니다.
              </Text>
            </TouchableOpacity>
            <View style={styles.disclaimerWarning}>
              <Ionicons name="warning" size={14} color="#CF6679" />
              <Text style={styles.disclaimerWarningText}>
                자본시장법에 따라 무등록 유사투자자문업(리딩방)은 형사처벌 대상입니다. 수익 보장, 종목 추천료 수취, 외부 메신저 유인 행위 적발 시 즉시 계정이 정지되며 관할 수사기관에 통보됩니다.
              </Text>
            </View>
          </View>

          {/* 여백 */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  hostInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  tierBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostInfoText: {
    flex: 1,
  },
  hostName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  hostAssets: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 120,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 6,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  optionCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  optionLabelActive: {
    color: '#000000',
    fontWeight: '600',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  capacityInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
  },
  capacityButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capacityValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    padding: 12,
  },
  capacityUnit: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  feeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  feeValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    padding: 14,
  },
  feeUnit: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  feeBreakdown: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    gap: 4,
  },
  feeBreakdownText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  feeBreakdownTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  // 권한 없음 화면
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  noPermissionDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  // 티어 옵션 (TBAC)
  tierOptionsContainer: {
    marginTop: 12,
    gap: 10,
  },
  tierOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  tierOptionActive: {
    backgroundColor: COLORS.surfaceLight,
  },
  tierOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierOptionText: {
    flex: 1,
  },
  tierOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  tierOptionDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // 불법 리딩방 금지 동의 스타일
  disclaimerSection: {
    marginBottom: 24,
    backgroundColor: '#1a0a0a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(207, 102, 121, 0.3)',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
    lineHeight: 20,
  },
  disclaimerWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(207, 102, 121, 0.2)',
  },
  disclaimerWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#999999',
    lineHeight: 16,
  },
});
