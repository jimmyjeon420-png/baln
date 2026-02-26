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
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useLocale } from '../../src/context/LocaleContext';

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

// 실제 사용 중인 패키지 목록 (package.json 기반) — i18n 적용
function getLicenseData(t: (key: string, options?: Record<string, unknown>) => string): LicenseCategory[] {
  return [
    {
      title: t('licenses.category_core'),
      icon: 'code-slash',
      packages: [
        {
          name: 'React',
          version: '19.1.0',
          license: 'MIT',
          url: 'https://github.com/facebook/react',
          description: t('licenses.desc_react'),
        },
        {
          name: 'React Native',
          version: '0.81.5',
          license: 'MIT',
          url: 'https://github.com/facebook/react-native',
          description: t('licenses.desc_react_native'),
        },
        {
          name: 'Expo',
          version: '54.0.0',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_expo'),
        },
        {
          name: 'TypeScript',
          version: '5.3.0',
          license: 'Apache-2.0',
          url: 'https://github.com/microsoft/TypeScript',
          description: t('licenses.desc_typescript'),
        },
      ],
    },
    {
      title: t('licenses.category_ai_backend'),
      icon: 'sparkles',
      packages: [
        {
          name: '@google/generative-ai',
          version: '0.24.1',
          license: 'Apache-2.0',
          url: 'https://github.com/google/generative-ai-js',
          description: t('licenses.desc_gemini'),
        },
        {
          name: '@supabase/supabase-js',
          version: '2.38.0',
          license: 'MIT',
          url: 'https://github.com/supabase/supabase-js',
          description: t('licenses.desc_supabase'),
        },
        {
          name: 'Axios',
          version: '1.6.0',
          license: 'MIT',
          url: 'https://github.com/axios/axios',
          description: t('licenses.desc_axios'),
        },
      ],
    },
    {
      title: t('licenses.category_nav_state'),
      icon: 'navigate',
      packages: [
        {
          name: 'Expo Router',
          version: '6.0.22',
          license: 'MIT',
          url: 'https://github.com/expo/router',
          description: t('licenses.desc_expo_router'),
        },
        {
          name: '@tanstack/react-query',
          version: '5.28.0',
          license: 'MIT',
          url: 'https://github.com/TanStack/query',
          description: t('licenses.desc_tanstack_query'),
        },
        {
          name: 'React Native Screens',
          version: '4.16.0',
          license: 'MIT',
          url: 'https://github.com/software-mansion/react-native-screens',
          description: t('licenses.desc_rn_screens'),
        },
      ],
    },
    {
      title: t('licenses.category_ui_animation'),
      icon: 'color-palette',
      packages: [
        {
          name: 'React Native Reanimated',
          version: '4.1.1',
          license: 'MIT',
          url: 'https://github.com/software-mansion/react-native-reanimated',
          description: t('licenses.desc_reanimated'),
        },
        {
          name: 'React Native SVG',
          version: '15.12.1',
          license: 'MIT',
          url: 'https://github.com/software-mansion/react-native-svg',
          description: t('licenses.desc_rn_svg'),
        },
        {
          name: 'React Native Gesture Handler',
          version: '2.28.0',
          license: 'MIT',
          url: 'https://github.com/software-mansion/react-native-gesture-handler',
          description: t('licenses.desc_gesture_handler'),
        },
        {
          name: '@expo/vector-icons',
          version: '15.0.3',
          license: 'MIT',
          url: 'https://github.com/expo/vector-icons',
          description: t('licenses.desc_vector_icons'),
        },
        {
          name: 'React Native Chart Kit',
          version: '6.12.0',
          license: 'MIT',
          url: 'https://github.com/indiespirit/react-native-chart-kit',
          description: t('licenses.desc_chart_kit'),
        },
        {
          name: 'Expo Linear Gradient',
          version: '15.0.8',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_linear_gradient'),
        },
        {
          name: 'Expo Haptics',
          version: '15.0.8',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_haptics'),
        },
      ],
    },
    {
      title: t('licenses.category_security_storage'),
      icon: 'shield-checkmark',
      packages: [
        {
          name: 'Expo Secure Store',
          version: '15.0.8',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_secure_store'),
        },
        {
          name: 'Expo Local Authentication',
          version: '17.0.8',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_local_auth'),
        },
        {
          name: 'Expo Crypto',
          version: '15.0.8',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_crypto'),
        },
        {
          name: '@react-native-async-storage/async-storage',
          version: '2.2.0',
          license: 'MIT',
          url: 'https://github.com/react-native-async-storage/async-storage',
          description: t('licenses.desc_async_storage'),
        },
      ],
    },
    {
      title: t('licenses.category_media_share'),
      icon: 'share-social',
      packages: [
        {
          name: 'Expo Image Picker',
          version: '17.0.10',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_image_picker'),
        },
        {
          name: 'Expo Image Manipulator',
          version: '14.0.8',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_image_manipulator'),
        },
        {
          name: 'Expo File System',
          version: '19.0.21',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_file_system'),
        },
        {
          name: 'Expo Sharing',
          version: '14.0.8',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_sharing'),
        },
        {
          name: 'Expo Media Library',
          version: '18.2.1',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_media_library'),
        },
        {
          name: 'React Native View Shot',
          version: '4.0.3',
          license: 'MIT',
          url: 'https://github.com/gre/react-native-view-shot',
          description: t('licenses.desc_view_shot'),
        },
      ],
    },
    {
      title: t('licenses.category_utilities'),
      icon: 'build',
      packages: [
        {
          name: 'Expo Notifications',
          version: '0.32.16',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_notifications'),
        },
        {
          name: 'Expo Localization',
          version: '17.0.8',
          license: 'MIT',
          url: 'https://github.com/expo/expo',
          description: t('licenses.desc_localization'),
        },
        {
          name: 'i18n-js',
          version: '4.5.1',
          license: 'MIT',
          url: 'https://github.com/fnando/i18n',
          description: t('licenses.desc_i18n_js'),
        },
        {
          name: 'React Native Worklets',
          version: '0.5.1',
          license: 'MIT',
          url: 'https://github.com/software-mansion/react-native-worklets',
          description: t('licenses.desc_worklets'),
        },
        {
          name: 'React Native Keyboard Controller',
          version: '1.18.5',
          license: 'MIT',
          url: 'https://github.com/kirillzyusko/react-native-keyboard-controller',
          description: t('licenses.desc_keyboard_controller'),
        },
      ],
    },
  ];
}

export default function LicensesScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();

  // 라이선스 데이터 (i18n 적용)
  const LICENSE_DATA = getLicenseData(t);

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
      <HeaderBar title={t('licenses.header_title')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 안내 문구 */}
        <View style={[styles.introSection, { backgroundColor: colors.surface }]}>
          <Ionicons name="heart" size={20} color={colors.error} />
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            bal<Text style={{ color: colors.primary }}>n</Text>{t('licenses.intro_text', { count: totalPackages })}
          </Text>
        </View>

        {/* 라이선스 요약 */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalPackages}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>{t('licenses.label_packages')}</Text>
          </View>
          <View style={[styles.summaryBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>MIT</Text>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>{t('licenses.label_primary_license')}</Text>
          </View>
          <View style={[styles.summaryBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>{LICENSE_DATA.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>{t('licenses.label_categories')}</Text>
          </View>
        </View>

        {/* 카테고리별 패키지 목록 */}
        {LICENSE_DATA.map((category, catIndex) => (
          <View key={catIndex} style={[styles.categorySection, { backgroundColor: colors.surface }]}>
            {/* 카테고리 헤더 (접기/펼치기) */}
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(catIndex)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryLeft}>
                <Ionicons name={category.icon} size={18} color={colors.primary} />
                <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>{category.title}</Text>
                <View style={[styles.countBadge, { backgroundColor: colors.surfaceLight }]}>
                  <Text style={[styles.countText, { color: colors.primary }]}>
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
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            {/* 패키지 목록 (펼쳐진 경우만 표시) */}
            {expandedCategories.includes(catIndex) && (
              <View style={[styles.packageList, { borderTopColor: colors.border }]}>
                {category.packages.map((pkg, pkgIndex) => (
                  <TouchableOpacity
                    key={pkgIndex}
                    style={[
                      styles.packageItem,
                      { borderBottomColor: colors.border },
                      pkgIndex === category.packages.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={() => Linking.openURL(pkg.url)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.packageMain}>
                      <Text style={[styles.packageName, { color: colors.textPrimary }]}>{pkg.name}</Text>
                      <View style={styles.packageMeta}>
                        <View style={[styles.versionBadge, { backgroundColor: colors.surfaceLight }]}>
                          <Text style={[styles.versionText, { color: colors.textTertiary }]}>v{pkg.version}</Text>
                        </View>
                        <View style={[styles.licenseBadge, { backgroundColor: `${colors.primary}20` }]}>
                          <Text style={[styles.licenseText, { color: colors.primary }]}>{pkg.license}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.packageDesc, { color: colors.textTertiary }]}>{pkg.description}</Text>
                    <View style={styles.packageLink}>
                      <Ionicons
                        name="logo-github"
                        size={14}
                        color={colors.textQuaternary}
                      />
                      <Text style={[styles.packageUrl, { color: colors.textQuaternary }]}>{t('licenses.view_on_github')}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* MIT 라이선스 전문 */}
        <View style={[styles.fullLicenseSection, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <Text style={[styles.fullLicenseTitle, { color: colors.textPrimary }]}>MIT License</Text>
          <Text style={[styles.fullLicenseText, { color: colors.textTertiary }]}>
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
        <View style={[styles.fullLicenseSection, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <Text style={[styles.fullLicenseTitle, { color: colors.textPrimary }]}>Apache License 2.0</Text>
          <Text style={[styles.fullLicenseText, { color: colors.textTertiary }]}>
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

        <Text style={[styles.footerText, { color: colors.textQuaternary }]}>
          {t('licenses.footer_copyright')}{'\n'}
          {t('licenses.footer_note')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // 안내
  introSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  introText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },

  // 요약
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryBadge: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 21,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  // 카테고리
  categorySection: {
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
    fontSize: 16,
    fontWeight: '700',
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 패키지
  packageList: {
    borderTopWidth: 1,
  },
  packageItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  packageMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  packageName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  packageMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  versionBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  licenseBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  licenseText: {
    fontSize: 11,
    fontWeight: '700',
  },
  packageDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  packageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packageUrl: {
    fontSize: 12,
  },

  // 라이선스 전문
  fullLicenseSection: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  fullLicenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  fullLicenseText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },

  // 하단
  footerText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 40,
  },
});
