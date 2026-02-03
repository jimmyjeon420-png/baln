import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 컬러 팔레트 - Fintech 스타일
const COLORS = {
  background: '#121212',
  tabBar: '#1A1F2C',
  active: '#FFFFFF',
  inactive: '#6B7280',
  scanButton: '#4CAF50',
  scanButtonShadow: 'rgba(76, 175, 80, 0.4)',
};

// 표시할 탭 목록 (순서대로)
const VISIBLE_TABS = ['index', 'diagnosis', 'scan', 'rebalance', 'profile'];

// 커스텀 탭 바 컴포넌트 - 플로팅 스캔 버튼 포함
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // 표시할 탭만 필터링
  const visibleRoutes = state.routes.filter((route: any) =>
    VISIBLE_TABS.includes(route.name)
  );

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBar}>
        {visibleRoutes.map((route: any) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.findIndex((r: any) => r.key === route.key);
          const isFocused = state.index === routeIndex;

          // 스캔 버튼 (가운데) - 특별 처리
          const isScanButton = route.name === 'scan';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              if (isScanButton) {
                // 스캔 버튼은 add-asset 모달로 이동
                router.push('/add-asset');
              } else {
                navigation.navigate(route.name);
              }
            }
          };

          // 스캔 버튼 렌더링
          if (isScanButton) {
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.scanButtonWrapper}
                onPress={onPress}
                activeOpacity={0.8}
              >
                <View style={styles.scanButton}>
                  <Ionicons name="camera" size={28} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            );
          }

          // 일반 탭 아이콘 렌더링
          const iconName = getIconName(route.name, isFocused);
          const label = getLabel(route.name);

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? COLORS.active : COLORS.inactive}
              />
              <View
                style={[
                  styles.tabLabel,
                  { backgroundColor: isFocused ? COLORS.active : 'transparent' },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// 탭별 아이콘 이름 반환
function getIconName(routeName: string, isFocused: boolean): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, { active: string; inactive: string }> = {
    index: { active: 'home', inactive: 'home-outline' },
    diagnosis: { active: 'pulse', inactive: 'pulse-outline' },
    scan: { active: 'camera', inactive: 'camera-outline' },
    rebalance: { active: 'map', inactive: 'map-outline' },
    profile: { active: 'menu', inactive: 'menu-outline' },
  };

  const icon = icons[routeName] || { active: 'help', inactive: 'help-outline' };
  return (isFocused ? icon.active : icon.inactive) as keyof typeof Ionicons.glyphMap;
}

// 탭별 라벨 반환
function getLabel(routeName: string): string {
  const labels: Record<string, string> = {
    index: '내 자산',
    diagnosis: 'AI 진단',
    scan: '스캔',
    rebalance: '처방전',
    profile: '더보기',
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
      {/* 1. 홈 - 내 자산 */}
      <Tabs.Screen
        name="index"
        options={{
          title: '내 자산',
        }}
      />

      {/* 2. AI 진단 */}
      <Tabs.Screen
        name="diagnosis"
        options={{
          title: 'AI 진단',
        }}
      />

      {/* 3. 스캔 (중앙 플로팅 버튼) */}
      <Tabs.Screen
        name="scan"
        options={{
          title: '스캔',
        }}
      />

      {/* 4. 처방전 - 리밸런싱 */}
      <Tabs.Screen
        name="rebalance"
        options={{
          title: '처방전',
        }}
      />

      {/* 5. 더보기 - 프로필/메뉴 */}
      <Tabs.Screen
        name="profile"
        options={{
          title: '더보기',
        }}
      />

      {/* 기존 탭들 숨김 처리 */}
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
    backgroundColor: COLORS.tabBar,
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
  tabLabel: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  scanButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30, // 버튼을 탭바 위로 올림
  },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.scanButton,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.scanButtonShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
