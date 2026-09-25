import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineCapability } from '../hooks/useOfflineCapability';
import { useLanguage } from '../i18n/LanguageContext';
import { C } from '../theme/colors';

const BANNER_BODY_HEIGHT = 40;

export function OfflineBanner() {
  const { isOffline, guestOfflineReady, signedInOffline, guestOfflineNoPack } =
    useOfflineCapability();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-(BANNER_BODY_HEIGHT + 80))).current;

  useEffect(() => {
    const hiddenOffset = -(BANNER_BODY_HEIGHT + insets.top + 24);
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : hiddenOffset,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, insets.top, translateY]);

  if (isOffline === null || isOffline === false) return null;

  const message = signedInOffline
    ? t('common.offlineSignedIn')
    : guestOfflineReady
      ? t('common.offlineGuest')
      : guestOfflineNoPack
        ? t('common.offlineNeedPack')
        : t('common.offline');

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          top: insets.top,
          paddingTop: 8,
          transform: [{ translateY }],
        },
      ]}
    >
      <MaterialCommunityIcons name="wifi-off" size={16} color={C.danger} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: C.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: C.danger + '40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
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
