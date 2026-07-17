import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBookmarks } from '../../src/hooks/useBookmarks';
import { useVisitedExhibits } from '../../src/hooks/useVisitedExhibits';
import { useVisitorProfile } from '../../src/hooks/useVisitorProfile';
import { apiService } from '../../src/services/apiService';
import { getToken, removeToken } from '../../src/services/tokenStorage';
import { C } from '../../src/theme/colors';

const MENU_ITEMS = [
  { label: 'Vé của tôi', icon: '🎫', statKey: null, route: '/my-tickets' as const },
  { label: 'Lịch sử tham quan', icon: '🕐', statKey: 'visited' as const, route: '/visited-exhibits' as const },
  { label: 'Hiện vật đã lưu', icon: '🔖', statKey: 'saved' as const, route: '/bookmarks' as const },
  { label: 'Mô hình AR đã tải', icon: '📦', statKey: null, route: '/ar-packs' as const },
  { label: 'Cài đặt', icon: '⚙️', statKey: null, route: null },
  { label: 'Trợ giúp & Phản hồi', icon: '💬', statKey: null, route: null },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name[0] ?? 'K').toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { profile, loading: profileLoading, refresh: refreshProfile } = useVisitorProfile();
  const { bookmarkCount, refresh: refreshBookmarks } = useBookmarks();
  const { visitedCount, refresh: refreshVisited } = useVisitedExhibits();

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      refreshBookmarks();
      refreshVisited();
    }, [refreshProfile, refreshBookmarks, refreshVisited]),
  );

  const displayName = profile?.displayName ?? 'Khách hàng';
  const email = profile?.email ?? 'Đăng nhập để đồng bộ hồ sơ';
  const initials = getInitials(displayName);

  const stats = [
    { label: 'Đã xem', value: profile ? String(visitedCount) : '—' },
    { label: 'Đã lưu', value: profile ? String(bookmarkCount) : '—' },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const token = await getToken();
      // Guest mode: no JWT → skip API, only clear local state and return to login
      if (token) {
        try {
          await apiService.logout();
        } catch {
          // Still sign out locally if server logout fails (expired token, offline, etc.)
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
          <Text style={styles.title}>Hồ sơ</Text>
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
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Chỉnh sửa</Text>
          </TouchableOpacity>
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
          {MENU_ITEMS.map((item, index) => {
            const count = menuCount(item.statKey);
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, index === MENU_ITEMS.length - 1 && styles.menuItemLast]}
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
            <Text style={styles.logoutText}>Đăng xuất</Text>
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
  editBtn: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnText: { color: C.accent, fontSize: 13, fontWeight: '600' },
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
