import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { C } from '../theme/colors';

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  // Chưa xác định trạng thái mạng → không render
  if (isOffline === null || isOffline === false) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <MaterialCommunityIcons name="wifi-off" size={16} color={C.danger} />
      <Text style={styles.text}>Không có kết nối mạng — Đang dùng dữ liệu offline</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: C.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: C.danger + '40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: C.danger,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});
