import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBookmarks } from '../../src/hooks/useBookmarks';
import { useVisitedExhibits } from '../../src/hooks/useVisitedExhibits';
import { useVisitorProfile } from '../../src/hooks/useVisitorProfile';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { apiService } from '../../src/services/apiService';
import { getToken, removeToken } from '../../src/services/tokenStorage';
import { C } from '../../src/theme/colors';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name[0] ?? 'K').toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);
  const { profile, loading: profileLoading, refresh: refreshProfile } =
    useVisitorProfile();
  const { bookmarkCount, refresh: refreshBookmarks } = useBookmarks();
  const { visitedCount, refresh: refreshVisited } = useVisitedExhibits();

  const menuItems = useMemo(
    () =>
      [
        {
          key: 'tickets',
          label: t('profile.myTickets'),
          icon: '🎫',
          statKey: null as 'visited' | 'saved' | null,
          route: '/my-tickets' as const,
        },
        {
          key: 'history',
          label: t('profile.visitHistory'),
          icon: '🕐',
          statKey: 'visited' as const,
          route: '/visited-exhibits' as const,
        },
        {
          key: 'bookmarks',
          label: t('profile.bookmarks'),
          icon: '🔖',
          statKey: 'saved' as const,
          route: '/bookmarks' as const,
        },
        {
          key: 'ar',
          label: t('profile.arPacks'),
          icon: '📦',
          statKey: null,
          route: '/ar-packs' as const,
        },
        {
          key: 'settings',
          label: t('profile.settings'),
          icon: '⚙️',
          statKey: null,
          route: '/settings' as const,
        },
      ] as const,
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      refreshBookmarks();
      refreshVisited();
    }, [refreshProfile, refreshBookmarks, refreshVisited]),
  );

  const displayName = profile?.displayName ?? t('profile.guest');
  const email = profile?.email ?? t('profile.loginHint');
  const initials = getInitials(displayName);

  const stats = [
    { label: t('profile.viewed'), value: profile ? String(visitedCount) : '—' },
    { label: t('profile.saved'), value: profile ? String(bookmarkCount) : '—' },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const token = await getToken();
      if (token) {
        try {
          await apiService.logout();
        } catch {
          // Still sign out locally if server logout fails
        }
      }
    } finally {
      await removeToken();
      setLoggingOut(false);
      router.replace('/(auth)/login');
    }
  };

  const menuCount = (statKey: 'visited' | 'saved' | null) => {
    if (!statKey || !profile) return null;
    return statKey === 'visited' ? visitedCount : bookmarkCount;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.title')}</Text>
        </View>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            {profileLoading ? (
              <ActivityIndicator color={C.onAccent} size="small" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{email}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, index) => {
            const count = menuCount(item.statKey);
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  index === menuItems.length - 1 && styles.menuItemLast,
                ]}
                onPress={() => item.route && router.push(item.route)}
                disabled={!item.route}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>
                  {item.label}
                  {count != null && count > 0 ? ` (${count})` : ''}
                </Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color={C.danger} size="small" />
          ) : (
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: C.textPrimary },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgSurface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.onAccent, fontWeight: '700', fontSize: 20 },
  userInfo: { flex: 1, marginLeft: 14 },
  userName: { fontSize: 17, fontWeight: '700', color: C.textPrimary },
  userEmail: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.bgSurface,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: C.border,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: C.accent },
  statLabel: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  menu: {
    backgroundColor: C.bgSurface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { fontSize: 18, width: 28 },
  menuLabel: { flex: 1, fontSize: 15, color: C.textPrimary, fontWeight: '500' },
  menuArrow: { fontSize: 20, color: C.textMuted },
  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: C.dangerMuted,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.danger + '40',
    minHeight: 48,
    justifyContent: 'center',
  },
  logoutBtnDisabled: { opacity: 0.6 },
  logoutText: { color: C.danger, fontWeight: '700', fontSize: 15 },
});
