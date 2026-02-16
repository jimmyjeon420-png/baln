/**
 * 오픈소스 라이선스 화면
 * 프로젝트에서 사용 중인 모든 오픈소스 패키지와 라이선스 정보
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

// 라이선스 타입 정의
interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  url: string;
  description: string;
}

// 라이선스 카테고리 정의
interface LicenseCategory {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  packages: LicenseEntry[];
}

// 실제 사용 중인 패키지 목록 (package.json 기반)
const LICENSE_DATA: LicenseCategory[] = [
  {
    title: '코어 프레임워크',
    icon: 'code-slash',
    packages: [
      {
        name: 'React',
        version: '19.1.0',
        license: 'MIT',
        url: 'https://github.com/facebook/react',
        description: 'UI 구축을 위한 JavaScript 라이브러리',
      },
      {
        name: 'React Native',
        version: '0.81.5',
        license: 'MIT',
        url: 'https://github.com/facebook/react-native',
        description: 'React를 사용한 네이티브 모바일 앱 개발 프레임워크',
      },
      {
        name: 'Expo',
        version: '54.0.0',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: 'React Native 앱 개발 플랫폼 및 도구',
      },
      {
        name: 'TypeScript',
        version: '5.3.0',
        license: 'Apache-2.0',
        url: 'https://github.com/microsoft/TypeScript',
        description: 'JavaScript에 타입 시스템을 추가한 프로그래밍 언어',
      },
    ],
  },
  {
    title: 'AI & 백엔드',
    icon: 'sparkles',
    packages: [
      {
        name: '@google/generative-ai',
        version: '0.24.1',
        license: 'Apache-2.0',
        url: 'https://github.com/google/generative-ai-js',
        description: 'Google Gemini 3 Flash SDK — OCR 분석 및 AI 진단 엔진',
      },
      {
        name: '@supabase/supabase-js',
        version: '2.38.0',
        license: 'MIT',
        url: 'https://github.com/supabase/supabase-js',
        description: 'Supabase 클라이언트 — 인증, 데이터베이스, 스토리지',
      },
      {
        name: 'Axios',
        version: '1.6.0',
        license: 'MIT',
        url: 'https://github.com/axios/axios',
        description: 'HTTP 통신 라이브러리',
      },
    ],
  },
  {
    title: '네비게이션 & 상태 관리',
    icon: 'navigate',
    packages: [
      {
        name: 'Expo Router',
        version: '6.0.22',
        license: 'MIT',
        url: 'https://github.com/expo/router',
        description: '파일 기반 네비게이션 시스템',
      },
      {
        name: '@tanstack/react-query',
        version: '5.28.0',
        license: 'MIT',
        url: 'https://github.com/TanStack/query',
        description: '서버 상태 관리 및 데이터 캐싱',
      },
      {
        name: 'React Native Screens',
        version: '4.16.0',
        license: 'MIT',
        url: 'https://github.com/software-mansion/react-native-screens',
        description: '네이티브 화면 컨테이너 최적화',
      },
    ],
  },
  {
    title: 'UI & 애니메이션',
    icon: 'color-palette',
    packages: [
      {
        name: 'React Native Reanimated',
        version: '4.1.1',
        license: 'MIT',
        url: 'https://github.com/software-mansion/react-native-reanimated',
        description: '고성능 네이티브 애니메이션 라이브러리',
      },
      {
        name: 'React Native SVG',
        version: '15.12.1',
        license: 'MIT',
        url: 'https://github.com/software-mansion/react-native-svg',
        description: 'SVG 그래픽 렌더링 — 파이 차트, 아이콘',
      },
      {
        name: 'React Native Gesture Handler',
        version: '2.28.0',
        license: 'MIT',
        url: 'https://github.com/software-mansion/react-native-gesture-handler',
        description: '네이티브 제스처 인식 시스템',
      },
      {
        name: '@expo/vector-icons',
        version: '15.0.3',
        license: 'MIT',
        url: 'https://github.com/expo/vector-icons',
        description: 'Ionicons 등 벡터 아이콘 라이브러리',
      },
      {
        name: 'React Native Chart Kit',
        version: '6.12.0',
        license: 'MIT',
        url: 'https://github.com/indiespirit/react-native-chart-kit',
        description: '차트 및 그래프 시각화',
      },
      {
        name: 'Expo Linear Gradient',
        version: '15.0.8',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '그라데이션 배경 효과',
      },
      {
        name: 'Expo Haptics',
        version: '15.0.8',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '햅틱(진동) 피드백',
      },
    ],
  },
  {
    title: '보안 & 저장소',
    icon: 'shield-checkmark',
    packages: [
      {
        name: 'Expo Secure Store',
        version: '15.0.8',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '암호화된 키-값 저장소 (토큰, 민감 데이터)',
      },
      {
        name: 'Expo Local Authentication',
        version: '17.0.8',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '생체 인증 (지문, Face ID)',
      },
      {
        name: 'Expo Crypto',
        version: '15.0.8',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '암호화 유틸리티 (해시, 랜덤 생성)',
      },
      {
        name: '@react-native-async-storage/async-storage',
        version: '2.2.0',
        license: 'MIT',
        url: 'https://github.com/react-native-async-storage/async-storage',
        description: '비동기 키-값 로컬 저장소',
      },
    ],
  },
  {
    title: '미디어 & 공유',
    icon: 'share-social',
    packages: [
      {
        name: 'Expo Image Picker',
        version: '17.0.10',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '카메라 및 갤러리 이미지 선택',
      },
      {
        name: 'Expo Image Manipulator',
        version: '14.0.8',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '이미지 리사이즈, 크롭, 압축 처리',
      },
      {
        name: 'Expo File System',
        version: '19.0.21',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '파일 읽기/쓰기 시스템',
      },
      {
        name: 'Expo Sharing',
        version: '14.0.8',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '소셜 미디어 공유 기능',
      },
      {
        name: 'Expo Media Library',
        version: '18.2.1',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '기기 미디어 라이브러리 접근',
      },
      {
        name: 'React Native View Shot',
        version: '4.0.3',
        license: 'MIT',
        url: 'https://github.com/gre/react-native-view-shot',
        description: '화면 캡처 — 공유 카드 이미지 생성',
      },
    ],
  },
  {
    title: '유틸리티 & 기타',
    icon: 'build',
    packages: [
      {
        name: 'Expo Notifications',
        version: '0.32.16',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '푸시 알림 및 로컬 알림',
      },
      {
        name: 'Expo Localization',
        version: '17.0.8',
        license: 'MIT',
        url: 'https://github.com/expo/expo',
        description: '다국어 지원 (한국어/영어 자동 감지)',
      },
      {
        name: 'i18n-js',
        version: '4.5.1',
        license: 'MIT',
        url: 'https://github.com/fnando/i18n',
        description: '국제화(i18n) 텍스트 번역 엔진',
      },
      {
        name: 'React Native Worklets',
        version: '0.5.1',
        license: 'MIT',
        url: 'https://github.com/software-mansion/react-native-worklets',
        description: 'UI 스레드 작업 처리 엔진',
      },
      {
        name: 'React Native Keyboard Controller',
        version: '1.18.5',
        license: 'MIT',
        url: 'https://github.com/kirillzyusko/react-native-keyboard-controller',
        description: '키보드 동작 제어 및 애니메이션',
      },
    ],
  },
];

export default function LicensesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  // 펼쳐진 카테고리 인덱스 관리
  const [expandedCategories, setExpandedCategories] = useState<number[]>([0]);

  const toggleCategory = (index: number) => {
    setExpandedCategories((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // 전체 패키지 수 계산
  const totalPackages = LICENSE_DATA.reduce(
    (sum, cat) => sum + cat.packages.length,
    0
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>오픈소스 라이선스</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 안내 문구 */}
        <View style={styles.introSection}>
          <Ionicons name="heart" size={20} color="#CF6679" />
          <Text style={styles.introText}>
            bal<Text style={{ color: '#4CAF50' }}>n</Text>은 {totalPackages}개의 오픈소스 프로젝트 위에
            만들어졌습니다. 오픈소스 커뮤니티에 깊은 감사를 드립니다.
          </Text>
        </View>

        {/* 라이선스 요약 */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryNumber}>{totalPackages}</Text>
            <Text style={styles.summaryLabel}>패키지</Text>
          </View>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryNumber}>MIT</Text>
            <Text style={styles.summaryLabel}>주요 라이선스</Text>
          </View>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryNumber}>{LICENSE_DATA.length}</Text>
            <Text style={styles.summaryLabel}>카테고리</Text>
          </View>
        </View>

        {/* 카테고리별 패키지 목록 */}
        {LICENSE_DATA.map((category, catIndex) => (
          <View key={catIndex} style={styles.categorySection}>
            {/* 카테고리 헤더 (접기/펼치기) */}
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(catIndex)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryLeft}>
                <Ionicons name={category.icon} size={18} color="#4CAF50" />
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {category.packages.length}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={
                  expandedCategories.includes(catIndex)
                    ? 'chevron-up'
                    : 'chevron-down'
                }
                size={18}
                color="#888888"
              />
            </TouchableOpacity>

            {/* 패키지 목록 (펼쳐진 경우만 표시) */}
            {expandedCategories.includes(catIndex) && (
              <View style={styles.packageList}>
                {category.packages.map((pkg, pkgIndex) => (
                  <TouchableOpacity
                    key={pkgIndex}
                    style={[
                      styles.packageItem,
                      pkgIndex === category.packages.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={() => Linking.openURL(pkg.url)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.packageMain}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      <View style={styles.packageMeta}>
                        <View style={styles.versionBadge}>
                          <Text style={styles.versionText}>v{pkg.version}</Text>
                        </View>
                        <View style={styles.licenseBadge}>
                          <Text style={styles.licenseText}>{pkg.license}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.packageDesc}>{pkg.description}</Text>
                    <View style={styles.packageLink}>
                      <Ionicons
                        name="logo-github"
                        size={14}
                        color="#666666"
                      />
                      <Text style={styles.packageUrl}>GitHub에서 보기</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* MIT 라이선스 전문 */}
        <View style={styles.fullLicenseSection}>
          <Text style={styles.fullLicenseTitle}>MIT License</Text>
          <Text style={styles.fullLicenseText}>
            Permission is hereby granted, free of charge, to any person
            obtaining a copy of this software and associated documentation
            files (the "Software"), to deal in the Software without
            restriction, including without limitation the rights to use,
            copy, modify, merge, publish, distribute, sublicense, and/or
            sell copies of the Software, and to permit persons to whom the
            Software is furnished to do so, subject to the following
            conditions:{'\n\n'}
            The above copyright notice and this permission notice shall be
            included in all copies or substantial portions of the Software.
            {'\n\n'}
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
            OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
            NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
            HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
            WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
            FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
            OTHER DEALINGS IN THE SOFTWARE.
          </Text>
        </View>

        {/* Apache 2.0 라이선스 요약 */}
        <View style={styles.fullLicenseSection}>
          <Text style={styles.fullLicenseTitle}>Apache License 2.0</Text>
          <Text style={styles.fullLicenseText}>
            Licensed under the Apache License, Version 2.0 (the "License");
            you may not use this file except in compliance with the License.
            You may obtain a copy of the License at{'\n\n'}
            http://www.apache.org/licenses/LICENSE-2.0{'\n\n'}
            Unless required by applicable law or agreed to in writing,
            software distributed under the License is distributed on an
            "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
            either express or implied. See the License for the specific
            language governing permissions and limitations under the License.
          </Text>
        </View>

        <Text style={styles.footerText}>
          © 2026 발른 주식회사{'\n'}
          오픈소스 라이선스 정보는 앱 버전에 따라 변경될 수 있습니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // 안내
  introSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 21,
  },

  // 요약
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryBadge: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4CAF50',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
  },

  // 카테고리
  categorySection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },

  // 패키지
  packageList: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  packageItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  packageMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  packageMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  versionBadge: {
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  versionText: {
    fontSize: 10,
    color: '#888888',
    fontWeight: '500',
  },
  licenseBadge: {
    backgroundColor: '#1A2E1A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  licenseText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '700',
  },
  packageDesc: {
    fontSize: 12,
    color: '#999999',
    lineHeight: 17,
    marginBottom: 6,
  },
  packageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packageUrl: {
    fontSize: 11,
    color: '#666666',
  },

  // 라이선스 전문
  fullLicenseSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  fullLicenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  fullLicenseText: {
    fontSize: 11,
    color: '#888888',
    lineHeight: 17,
    fontFamily: 'monospace',
  },

  // 하단
  footerText: {
    fontSize: 12,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 40,
  },
});
