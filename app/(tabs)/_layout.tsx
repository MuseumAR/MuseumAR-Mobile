import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { C } from '../../src/theme/colors';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, focused, highlight }: { name: IconName; focused: boolean; highlight?: boolean }) {
  if (highlight) {
    return (
      <View style={styles.scanTab}>
        <MaterialCommunityIcons name={name} size={22} color={focused ? C.textPrimary : C.onAccent} />
      </View>
    );
  }
  return (
    <MaterialCommunityIcons
      name={name}
      size={24}
      color={focused ? C.tabActive : C.tabInactive}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.tabActive,
        tabBarInactiveTintColor: C.tabInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => <TabIcon name="compass-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'AR Scan',
          tabBarIcon: ({ focused }) => <TabIcon name="line-scan" focused={focused} highlight />,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Museum',
          tabBarIcon: ({ focused }) => <TabIcon name="bank-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="account-outline" focused={focused} />,
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen name="ticket" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: C.tabBg,
    borderTopWidth: 1,
    borderTopColor: C.tabBorder,
    height: 66,
    paddingBottom: 10,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  scanTab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: C.accent,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});
