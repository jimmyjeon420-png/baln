import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';

// 표시할 탭 목록 (5탭 구조: 오늘/분석/마을/라운지/전체)
const VISIBLE_TABS = ['index', 'rebalance', 'village', 'lounge', 'profile'];

// 커스텀 탭 바 컴포넌트 - 플로팅 스캔 버튼 포함
function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLocale();

  // 표시할 탭만 필터링
  const visibleRoutes = state.routes.filter((route: any) =>
    VISIBLE_TABS.includes(route.name)
  );

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom, backgroundColor: colors.surface }]}>
      <View style={styles.tabBar}>
        {visibleRoutes.map((route: any) => {
          const routeIndex = state.routes.findIndex((r: any) => r.key === route.key);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // 탭 아이콘 렌더링
          const iconName = getIconName(route.name, isFocused);
          const tabLabels: Record<string, string> = {
            index: t('tab.today'),
            rebalance: t('tab.analysis'),
            village: t('tab.village'),
            lounge: t('tab.lounge'),
            profile: t('tab.more'),
          };
          const label = tabLabels[route.name] ?? route.name;

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
                size={22}
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

// 탭별 아이콘 이름 반환 (5탭: 광장/병원/마을/카페/시청 세계관)
function getIconName(routeName: string, isFocused: boolean): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, { active: string; inactive: string }> = {
    index: { active: 'sunny', inactive: 'sunny-outline' },           // 광장 (오늘의 광장)
    rebalance: { active: 'pulse', inactive: 'pulse-outline' },       // 병원 (건강 진단)
    village: { active: 'home', inactive: 'home-outline' },           // 마을 (중심가)
    lounge: { active: 'cafe', inactive: 'cafe-outline' },            // 카페 (라운지)
    profile: { active: 'business', inactive: 'business-outline' },   // 시청 (전체 관리)
  };

  const icon = icons[routeName] || { active: 'help', inactive: 'help-outline' };
  return (isFocused ? icon.active : icon.inactive) as keyof typeof Ionicons.glyphMap;
}


export default function TabLayout() {
  const { t } = useLocale();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* ═══ 발른 마을 5탭: 광장 / 병원 / 마을 / 카페 / 시청 ═══ */}

      {/* 1. 광장 (Square) — 맥락 카드 + 예측 + 스트릭 + 위기 배너 */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.today'),
        }}
      />

      {/* 2. 병원 (Clinic) — 건강 점수 + AI 진단 + 처방전 */}
      <Tabs.Screen
        name="rebalance"
        options={{
          title: t('tab.analysis'),
        }}
      />

      {/* 3. 마을 (Village) — 구루 마을 + 라운드테이블 입장 */}
      <Tabs.Screen
        name="village"
        options={{
          title: t('tab.village'),
        }}
      />

      {/* 4. 카페 (Café) — VIP 라운지 + 커뮤니티 */}
      <Tabs.Screen
        name="lounge"
        options={{
          title: t('tab.lounge'),
        }}
      />

      {/* 5. 시청 (Hall) — 프로필 + 설정 + 크레딧 + 마켓 */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.more'),
        }}
      />

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
    marginTop: 3,
    letterSpacing: 0.1,
  },
});
