import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';

export default function DesktopHeader() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const pathname = usePathname();
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const unreadCount = useNotificationStore(s => s.unreadCount);

  if (!isDesktop) return null;

  return (
    <View style={styles.header}>
      <View style={styles.logoWrapper}>
        <TouchableOpacity onPress={() => router.push('/')} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.logoNazar}>NAZAR</Text>
          <Text style={styles.logoKebab}>KEBAB</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navLinks}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={[styles.navLink, pathname === '/' && styles.navLinkActive]}>ACCUEIL</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/menu')}>
          <Text style={[styles.navLink, pathname === '/menu' && styles.navLinkActive]}>LA CARTE</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/tracking')}>
          <Text style={[styles.navLink, pathname === '/tracking' && styles.navLinkActive]}>SUIVI</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => router.push('/profile')} style={styles.actionBtn}>
          <Ionicons name="person-circle-outline" size={24} color={Theme.colors.text} />
          <Text style={styles.actionText}>{user ? user.firstName : 'Connexion'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={24} color={Theme.colors.text} />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {isAdmin && (
           <TouchableOpacity onPress={() => router.push('/admin')} style={styles.adminBtn}>
             <Ionicons name="shield-checkmark" size={16} color="#000" />
             <Text style={styles.adminBtnText}>Admin</Text>
           </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartBtn}>
          <Ionicons name="bag-handle-outline" size={22} color={Theme.colors.text} />
          <Text style={styles.actionText}>Panier</Text>
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 80,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    zIndex: 100,
  },
  logoWrapper: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  logoNazar: { fontFamily: Theme.fonts.logo, fontSize: 32, color: Theme.colors.text, letterSpacing: 4 },
  logoKebab: { fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.success, letterSpacing: 6 },
  
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 40 },
  navLink: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.textSecondary, letterSpacing: 2 },
  navLinkActive: { color: Theme.colors.success, fontFamily: Theme.fonts.bodyBold },
  
  actions: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.text },
  
  cartBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Theme.colors.background, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: Theme.colors.border },
  badge: { backgroundColor: Theme.colors.success, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: -5, right: -5 },
  badgeText: { fontFamily: Theme.fonts.bodyBold, fontSize: 10, color: '#000' },
  
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Theme.colors.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 },
  adminBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: '#000' },
  
  iconBtn: { padding: 8, position: 'relative' },
  notifBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: Theme.colors.danger, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { color: '#fff', fontSize: 8, fontFamily: Theme.fonts.bodyBold },
});
