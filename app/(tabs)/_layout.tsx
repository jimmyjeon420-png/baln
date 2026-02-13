import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';

// 표시할 탭 목록 (3탭 구조: 오늘/분석/전체)
const VISIBLE_TABS = ['index', 'rebalance', 'profile'];

// 커스텀 탭 바 컴포넌트 - 플로팅 스캔 버튼 포함
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  // 표시할 탭만 필터링
  const visibleRoutes = state.routes.filter((route: any) =>
    VISIBLE_TABS.includes(route.name)
  );

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom, backgroundColor: colors.surface }]}>
      <View style={styles.tabBar}>
        {visibleRoutes.map((route: any) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.findIndex((r: any) => r.key === route.key);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              const tabPath = route.name === 'index' ? '/(tabs)' : `/(tabs)/${route.name}`;
              router.replace(tabPath as any);
            }
          };

          // 탭 아이콘 렌더링
          const iconName = getIconName(route.name, isFocused);
          const label = getLabel(route.name);

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
              accessibilityLabel={`${label} 탭`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? colors.textPrimary : colors.textTertiary}
              />
              <Text
                style={[
                  styles.tabLabelText,
                  { color: isFocused ? colors.textPrimary : colors.textTertiary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// 탭별 아이콘 이름 반환 (3탭: 오늘/분석/전체)
function getIconName(routeName: string, isFocused: boolean): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, { active: string; inactive: string }> = {
    index: { active: 'today', inactive: 'today-outline' },
    rebalance: { active: 'analytics', inactive: 'analytics-outline' },
    profile: { active: 'grid', inactive: 'grid-outline' },
  };

  const icon = icons[routeName] || { active: 'help', inactive: 'help-outline' };
  return (isFocused ? icon.active : icon.inactive) as keyof typeof Ionicons.glyphMap;
}

// 탭별 라벨 반환 (3탭: 오늘/분석/전체)
function getLabel(routeName: string): string {
  const labels: Record<string, string> = {
    index: '오늘',
    rebalance: '분석',
    profile: '전체',
  };
  return labels[routeName] || routeName;
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* ═══ 3탭 구조: 오늘 / 분석 / 전체 ═══ */}

      {/* 1. 오늘 (Today) — 맥락 카드 + 예측 + 스트릭 + 위기 배너 */}
      <Tabs.Screen
        name="index"
        options={{
          title: '오늘',
        }}
      />

      {/* 2. 분석 (Checkup) — 건강 점수 + 배분 이탈 + AI 심화 CTA */}
      <Tabs.Screen
        name="rebalance"
        options={{
          title: '분석',
        }}
      />

      {/* 3. 전체 (More) — 프로필 + 커뮤니티/인사이트 미리보기 + 설정 */}
      <Tabs.Screen
        name="profile"
        options={{
          title: '전체',
        }}
      />

      {/* ═══ 숨김 탭들 (URL 직접 접근만 가능) ═══ */}
      <Tabs.Screen name="lounge" options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="diagnosis" options={{ href: null }} />
      <Tabs.Screen name="strategy" options={{ href: null }} />
      <Tabs.Screen name="journal" options={{ href: null }} />
      <Tabs.Screen name="invest" options={{ href: null }} />
      <Tabs.Screen name="menu" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // backgroundColor applied inline via colors.surface
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabLabelText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
});
