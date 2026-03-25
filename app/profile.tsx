import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Switch, TextInput, Alert, Platform, useWindowDimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useRestaurantStore, checkIsRestaurantOpen } from '../store/useRestaurantStore';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmée', preparing: 'En préparation',
  ready: 'Prête / En route', delivered: 'Livrée', cancelled: 'Annulée',
};
const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800', confirmed: '#4CAF50', preparing: '#2196F3',
  ready: Theme.colors.success, delivered: '#888', cancelled: Theme.colors.danger,
};

export default function ProfileScreen() {
  const { user, logout, updateProfile, isLoggedIn, deleteAccount } = useAuthStore();
  const { orders, clearCart } = useCartStore();
  const { settings } = useRestaurantStore();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');

  const myOrders = orders;
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const totalSpent = deliveredOrders.reduce((acc, o) => acc + o.total, 0);

  const handleSave = () => {
    updateProfile({ firstName, lastName, phone, address });
    setEditing(false);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        logout();
        router.replace('/');
      }
    } else {
      Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter', style: 'destructive', onPress: () => {
            logout();
            router.replace('/');
          }
        },
      ]);
    }
  };

  const handleDeleteAccount = () => {
    const performDelete = async () => {
      const success = await deleteAccount();
      if (success) {
        clearCart();
        router.replace('/');
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Supprimer votre compte ? Action irréversible. Toutes vos données seront perdues.')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Supprimer votre compte',
        'Action irréversible. Toutes vos données, commandes et avantages de fidélité seront perdus.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer définitivement', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  // ─── NOT LOGGED IN ───────────────────────────────────
  if (!isLoggedIn || !user) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={[styles.header, isDesktop && { display: 'none' }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>MON PROFIL</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.notLoggedContainer}>
            <View style={styles.bigIcon}>
              <Ionicons name="person-outline" size={44} color={Theme.colors.textSecondary} />
            </View>
            <Text style={styles.notLoggedTitle}>Bienvenue !</Text>
            <Text style={styles.notLoggedSubtitle}>
              Connectez-vous pour commander, suivre vos repas et gérer votre profil.
            </Text>
            <TouchableOpacity style={styles.goldBtn} onPress={() => router.push('/auth')}>
              <Text style={styles.goldBtnText}>SE CONNECTER</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/auth')}>
              <Text style={styles.linkText}>Pas encore de compte ? Créer un compte</Text>
            </TouchableOpacity>

            {/* RESTAURANT INFO BOX */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>{settings.name}</Text>
              <Text style={styles.infoBoxLine}>📍 {settings.address}</Text>
              <Text style={styles.infoBoxLine}>📞 {settings.phone}</Text>
              <Text style={[styles.infoBoxLine, { color: checkIsRestaurantOpen(settings) ? Theme.colors.success : Theme.colors.danger }]}>
                {checkIsRestaurantOpen(settings) ? '🟢 Actuellement ouvert' : '🔴 Actuellement fermé'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── LOGGED IN ───────────────────────────────────────
  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* HEADER */}
        <View style={[styles.header, isDesktop && { display: 'none' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MON PROFIL</Text>
          {editing ? (
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Sauvegarder</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.iconBtn}>
              <Ionicons name="pencil-outline" size={20} color={Theme.colors.success} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && { paddingTop: 100 }]} showsVerticalScrollIndicator={false}>

          {/* AVATAR SECTION */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.firstName[0]}{user.lastName[0]}</Text>
            </View>
            <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color={Theme.colors.primary} />
                <Text style={styles.adminBadgeText}>ADMINISTRATEUR</Text>
              </View>
            )}
          </View>

          {/* STATS ROW */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{myOrders.length}</Text>
              <Text style={styles.statLabel}>Commandes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Theme.colors.success }]}>{totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>CHF dépensés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{deliveredOrders.length}</Text>
              <Text style={styles.statLabel}>Livrées</Text>
            </View>
          </View>

          {/* FIDELITY CARD */}
          {settings.loyaltyEnabled && (
            <View style={styles.loyaltyCard}>
              <View style={styles.loyaltyHeader}>
                <Ionicons name="star" size={20} color={Theme.colors.success} />
                <Text style={styles.loyaltyTitle}>CARTE DE FIDÉLITÉ</Text>
              </View>
              <Text style={styles.loyaltyDesc}>
                {settings.loyaltyMinPoints} commandes = 1 Cadeau Offert !
              </Text>

              <View style={styles.punchGrid}>
                {Array.from({ length: settings.loyaltyMinPoints }).map((_, i) => {
                  const step = i + 1;
                  const isPunched = step <= (user.loyaltyPoints % settings.loyaltyMinPoints);
                  const isGift = step === settings.loyaltyMinPoints;
                  return (
                    <View key={step} style={[styles.punchHole, isPunched && styles.punchHoleActive, isGift && !isPunched && styles.punchHoleGift]}>
                      {isGift ? (
                        <Ionicons name="gift" size={22} color={isPunched ? '#000' : Theme.colors.success} />
                      ) : (
                        isPunched ? <Ionicons name="checkmark-sharp" size={18} color="#000" /> : <Text style={styles.punchText}>{step}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={styles.loyaltyFooter}>
                <Text style={styles.loyaltyBottom}>
                  {(user.loyaltyPoints % settings.loyaltyMinPoints) === 0 && user.loyaltyPoints > 0
                    ? "Félicitations ! Vous avez droit à votre cadeau."
                    : `Plus que ${settings.loyaltyMinPoints - (user.loyaltyPoints % settings.loyaltyMinPoints)} commande(s) avant votre cadeau !`}
                </Text>
              </View>
            </View>
          )}

          {/* PERSONAL INFO */}
          <Text style={styles.sectionLabel}>INFORMATIONS PERSONNELLES</Text>
          <View style={styles.card}>
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>PRÉNOM</Text>
                {editing
                  ? <TextInput style={styles.fieldInput} value={firstName} onChangeText={setFirstName} />
                  : <Text style={styles.fieldValue}>{user.firstName}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>NOM</Text>
                {editing
                  ? <TextInput style={styles.fieldInput} value={lastName} onChangeText={setLastName} />
                  : <Text style={styles.fieldValue}>{user.lastName}</Text>}
              </View>
            </View>

            <View style={styles.fieldDivider} />

            <Text style={styles.fieldLabel}>TÉLÉPHONE</Text>
            {editing
              ? <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              : <Text style={styles.fieldValue}>{user.phone || '—'}</Text>}

            <View style={styles.fieldDivider} />

            <Text style={styles.fieldLabel}>EMAIL</Text>
            <Text style={styles.fieldValue}>{user.email}</Text>

            <View style={styles.fieldDivider} />

            <Text style={styles.fieldLabel}>ADRESSE DE LIVRAISON FAVORITE</Text>
            {editing
              ? <TextInput style={styles.fieldInput} value={address} onChangeText={setAddress} placeholder="Ex: Rue du Moulin 5, 2900 Porrentruy" placeholderTextColor={Theme.colors.textSecondary} />
              : <Text style={styles.fieldValue}>{user.address || '—'}</Text>}
          </View>

          {/* NOTIFICATIONS */}
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            <View style={styles.notifRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Suivi de commande</Text>
                <Text style={styles.notifSubtitle}>Confirmations et mises à jour de statut en temps réel</Text>
              </View>
              <Switch
                value={user.notifOrders}
                onValueChange={v => updateProfile({ notifOrders: v })}
                trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
                thumbColor={user.notifOrders ? Theme.colors.success : Theme.colors.textSecondary}
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.notifRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Offres & promotions</Text>
                <Text style={styles.notifSubtitle}>Réductions du jour, nouveautés et actualités</Text>
              </View>
              <Switch
                value={user.notifPromos}
                onValueChange={v => updateProfile({ notifPromos: v })}
                trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
                thumbColor={user.notifPromos ? '#000' : Theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* ORDER HISTORY */}
          {myOrders.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>MES COMMANDES</Text>
              <View style={styles.card}>
                {myOrders.map((order, i) => (
                  <View key={order.id}>
                    <View style={styles.orderRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <Text style={styles.orderId}>#{order.id}</Text>
                          <View style={[styles.microStatus, { backgroundColor: STATUS_COLORS[order.status] + '22', borderColor: STATUS_COLORS[order.status] }]}>
                            <Text style={[styles.microStatusText, { color: STATUS_COLORS[order.status] }]}>{STATUS_LABELS[order.status]}</Text>
                          </View>
                        </View>
                        <Text style={styles.orderItems} numberOfLines={1}>
                          {order.items.map(it => it.name).join(', ')}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.orderTotal}>{order.total.toFixed(2)} CHF</Text>
                        <Text style={styles.orderDate}>
                          {new Date(order.createdAt).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' })}
                        </Text>
                        <TouchableOpacity
                          onPress={() => router.push({ pathname: '/receipt', params: { id: order.id } })}
                          style={{ marginTop: 6 }}
                        >
                          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: Theme.colors.success }}>
                            {order.status === 'delivered' ? 'Voir ticket' : 'Bon de commande'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {i < myOrders.length - 1 && <View style={styles.fieldDivider} />}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* RESTAURANT INFO */}
          <Text style={styles.sectionLabel}>RESTAURANT</Text>
          <View style={styles.card}>
            <View style={styles.infoCardRow}>
              <Ionicons name="location-outline" size={18} color={Theme.colors.textSecondary} />
              <Text style={styles.infoCardValue}>{settings.address}</Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.infoCardRow}>
              <Ionicons name="call-outline" size={18} color={Theme.colors.textSecondary} />
              <Text style={styles.infoCardValue}>{settings.phone}</Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.infoCardRow}>
              <Ionicons name="time-outline" size={18} color={Theme.colors.textSecondary} />
              <View style={{ flex: 1 }}>
                {settings.hours.filter(h => h.isOpen).slice(0, 2).map(h => (
                  <Text key={h.day} style={styles.infoCardValue}>{h.day} : {h.open} – {h.close}</Text>
                ))}
              </View>
            </View>
          </View>

          {/* ADMIN SHORTCUT */}
          {user.role === 'admin' && (
            <>
              <Text style={styles.sectionLabel}>ADMINISTRATION</Text>
              <TouchableOpacity style={styles.adminCard} onPress={() => router.push('/admin')}>
                <View style={styles.adminCardLeft}>
                  <Ionicons name="settings" size={22} color={Theme.colors.success} />
                  <View>
                    <Text style={styles.adminCardTitle}>Panel administrateur</Text>
                    <Text style={styles.adminCardSubtitle}>Menu, commandes, horaires, réglages</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Theme.colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          {/* LOGOUT */}
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Theme.colors.danger} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>

          {/* DELETE ACCOUNT */}
          <View style={styles.deleteAccountWrapper}>
            <TouchableOpacity style={styles.logoutRow} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={20} color={Theme.colors.textSecondary} />
              <Text style={styles.deleteAccountText}>Supprimer mon compte</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  inner: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Theme.colors.border },
  headerTitle: { fontFamily: Theme.fonts.logo, fontSize: 20, color: Theme.colors.text, letterSpacing: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Theme.colors.success },
  saveBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: '#000' },
  scrollContent: { padding: 16 },

  // Not logged in
  notLoggedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  bigIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: Theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  notLoggedTitle: { fontFamily: Theme.fonts.logo, fontSize: 32, color: Theme.colors.text },
  notLoggedSubtitle: { fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  goldBtn: { backgroundColor: Theme.colors.success, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 100, shadowColor: Theme.colors.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8, alignItems: 'center', width: '100%' },
  goldBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 16, color: '#000', letterSpacing: 0.5 },
  linkText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.success },
  infoBox: { width: '100%', backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, marginTop: 8 },
  infoBoxTitle: { fontFamily: Theme.fonts.title, fontSize: 20, color: Theme.colors.text, marginBottom: 4 },
  infoBoxLine: { fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.textSecondary },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: Theme.colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: Theme.colors.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
  avatarText: { fontFamily: Theme.fonts.logo, fontSize: 30, color: '#000' },
  userName: { fontFamily: Theme.fonts.title, fontSize: 26, color: Theme.colors.text, letterSpacing: 1 },
  userEmail: { fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, marginTop: 4 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Theme.colors.primary + '22', borderWidth: 1, borderColor: Theme.colors.primary + '44' },
  adminBadgeText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 11, color: Theme.colors.primary, letterSpacing: 2 },

  // Stats
  statsRow: { flexDirection: 'row', backgroundColor: Theme.colors.surface, borderRadius: 16, marginBottom: 24, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: Theme.colors.border },
  statValue: { fontFamily: Theme.fonts.logo, fontSize: 28, color: Theme.colors.text },
  statLabel: { fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary, marginTop: 2 },

  // Section
  sectionLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, letterSpacing: 2, marginBottom: 10, marginTop: 8 },
  card: { backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border },
  rowFields: { flexDirection: 'row', gap: 16 },
  fieldLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, letterSpacing: 1, marginBottom: 4 },
  fieldValue: { fontFamily: Theme.fonts.bodyMedium, fontSize: 15, color: Theme.colors.text },
  fieldInput: { fontFamily: Theme.fonts.body, fontSize: 15, color: Theme.colors.text, borderBottomWidth: 1, borderBottomColor: Theme.colors.success, paddingVertical: 4, marginBottom: 4 },
  fieldDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Theme.colors.border, marginVertical: 12 },

  // Notifications
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  notifTitle: { fontFamily: Theme.fonts.bodyMedium, fontSize: 15, color: Theme.colors.text, marginBottom: 2 },
  notifSubtitle: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary },

  // Orders
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4 },
  orderId: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.text },
  microStatus: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  microStatusText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 10 },
  orderItems: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, maxWidth: 200 },
  orderTotal: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.success },
  orderDate: { fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary, marginTop: 2 },

  // Restaurant info
  infoCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  infoCardValue: { fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.text, flex: 1 },

  // Admin shortcut
  adminCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.success + '44' },
  adminCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  adminCardTitle: { fontFamily: Theme.fonts.bodyMedium, fontSize: 15, color: Theme.colors.text },
  adminCardSubtitle: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary },

  // Logout
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, marginTop: 8 },
  logoutText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 15, color: Theme.colors.danger },
  deleteAccountWrapper: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, marginTop: 16 },
  deleteAccountText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 13, color: Theme.colors.textSecondary },

  /* LOYALTY CARD STYLES */
  loyaltyCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Theme.colors.success + '40',
    shadowColor: Theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  loyaltyTitle: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 16,
    color: Theme.colors.success,
    letterSpacing: 1,
  },
  loyaltyDesc: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginBottom: 20,
  },
  punchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 20,
  },
  punchHole: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  punchHoleActive: {
    backgroundColor: Theme.colors.success,
    borderColor: Theme.colors.success,
  },
  punchHoleGift: {
    borderColor: Theme.colors.success,
    borderStyle: 'dashed',
    borderWidth: 1.5,
  },
  punchText: {
    fontFamily: Theme.fonts.bodyBold,
    color: Theme.colors.textSecondary,
    fontSize: 16,
  },
  loyaltyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    paddingTop: 16,
    alignItems: 'center',
  },
  loyaltyBottom: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 12,
    color: Theme.colors.text,
  },
});
