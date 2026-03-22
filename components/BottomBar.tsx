import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';

export default function BottomBar() {
  const pathname = usePathname();
  const cartItems = useCartStore(s => s.items);
  const activeOrder = useCartStore(s => s.activeOrder);
  const { isLoggedIn, user } = useAuthStore();
  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const isAdmin = user?.role === 'admin';

  const tabs = [
    { key: '/',        icon: 'home-outline',        activeIcon: 'home',          label: 'Accueil' },
    { key: '/menu',    icon: 'restaurant-outline',  activeIcon: 'restaurant',    label: 'Menu' },
    ...(!isAdmin ? [{ key: '/tracking', icon: 'bicycle-outline', activeIcon: 'bicycle', label: 'Suivi', badge: activeOrder && !['delivered','cancelled'].includes(activeOrder.status) }] : []),
    isAdmin 
      ? { key: '/admin',   icon: 'settings-outline',  activeIcon: 'settings',  label: 'Admin' }
      : { key: '/profile', icon: 'person-outline',    activeIcon: 'person',    label: 'Profil' },
  ];

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  if (isDesktop) return null;
  if (pathname === '/admin') return null;

  return (
    <View style={styles.floatingWrapper}>
      <BlurView intensity={70} tint="dark" style={styles.container}>
        {tabs.map(tab => {
          const isActive = pathname === tab.key;
          const isCart = tab.key === '/tracking';

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => router.push(tab.key as any)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                {tab.key === '/menu' && cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount}</Text>
                  </View>
                )}
                {isCart && tab.badge && (
                  <View style={styles.dotBadge} />
                )}
                <Ionicons
                  name={(isActive ? tab.activeIcon : tab.icon) as any}
                  size={24}
                  color={isActive ? Theme.colors.success : 'rgba(255, 255, 255, 0.6)'}
                />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 20,
    right: 20,
    borderRadius: 30, // fully rounded like a pill
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // subtle light border for glass effect
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // base dark tint for unsupported environments
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 28,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: '#000', // Matches the BlurView background or surface
  },
  badgeText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 7,
    color: '#000',
  },
  dotBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.primary,
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  label: {
    fontFamily: Theme.fonts.body,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  labelActive: {
    color: Theme.colors.success,
    fontFamily: Theme.fonts.bodyMedium,
  },

  // DESKTOP NAV CLASSES
  desktopNavWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  desktopNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  desktopNavLeft: { alignItems: 'center', justifyContent: 'center' },
  desktopLogo: { fontFamily: Theme.fonts.logo, fontSize: 32, color: Theme.colors.text, letterSpacing: 6 },
  desktopLogoSub: { fontFamily: Theme.fonts.logo, fontSize: 10, color: Theme.colors.primary, letterSpacing: 8, marginTop: -6 },
  
  desktopNavCenter: { flexDirection: 'row', gap: 40 },
  desktopTab: { position: 'relative', paddingVertical: 8 },
  desktopTabLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.textSecondary, letterSpacing: 1 },
  desktopTabLabelActive: { color: Theme.colors.success },
  desktopTabActiveLine: { position: 'absolute', bottom: -2, left: 0, right: 0, height: 2, backgroundColor: Theme.colors.success, borderRadius: 2 },
  
  desktopNavRight: { flexDirection: 'row', alignItems: 'center' },
  desktopCartBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Theme.colors.success + '22', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: Theme.colors.success + '44' },
  desktopCartText: { fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.success },
});
