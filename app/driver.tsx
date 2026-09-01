import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Linking, Platform, useWindowDimensions, RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { useCartStore } from '../store/useCartStore';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { useAuthStore } from '../store/useAuthStore';

export default function DriverScreen() {
  const { orders, updateOrderStatus, markAsPaid } = useCartStore();
  const { settings } = useRestaurantStore();
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [filter, setFilter] = useState<'active' | 'done'>('active');
  const [refreshing, setRefreshing] = useState(false);

  // Filter only delivery orders
  const deliveryOrders = orders.filter(o => o.deliveryType === 'delivery');
  const activeDeliveries = deliveryOrders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status));
  const doneDeliveries = deliveryOrders.filter(o => o.status === 'delivered');

  const displayed = filter === 'active' ? activeDeliveries : doneDeliveries;

  // Sort by most urgent / recent first
  const sorted = [...displayed].sort((a, b) => {
    const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return ta.getTime() - tb.getTime();
  });

  const openGPS = (address: string) => {
    const cleanAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps://app?daddr=${cleanAddress}`,
      android: `google.navigation:q=${cleanAddress}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${cleanAddress}`,
    });
    Linking.openURL(url || `https://www.google.com/maps/dir/?api=1&destination=${cleanAddress}`);
  };

  const handleDepart = async (orderId: string) => {
    await updateOrderStatus(orderId, 'ready');
  };

  const handleComplete = async (orderId: string, isPaid: boolean) => {
    await updateOrderStatus(orderId, 'delivered');
    if (!isPaid) {
      await markAsPaid(orderId, 'Espèces');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace(user?.role === 'admin' ? '/admin' : '/')} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>ESPACE LIVREUR 🛵</Text>
            <Text style={styles.headerSubtitle}>Pokémoons Delivery</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
            <Ionicons name="refresh" size={22} color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, filter === 'active' && styles.tabBtnActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.tabText, filter === 'active' && styles.tabTextActive]}>
              À livrer ({activeDeliveries.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, filter === 'done' && styles.tabBtnActive]}
            onPress={() => setFilter('done')}
          >
            <Text style={[styles.tabText, filter === 'done' && styles.tabTextActive]}>
              Livrées aujourd'hui ({doneDeliveries.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {sorted.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bicycle-outline" size={64} color={Theme.colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyTitle}>
                {filter === 'active' ? 'Aucune livraison en attente' : 'Aucune livraison terminée'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'active' ? 'Les nouvelles commandes à livrer apparaîtront ici en direct.' : ''}
              </Text>
            </View>
          ) : (
            sorted.map(order => {
              const isReady = order.status === 'ready';
              const mins = (() => {
                const t = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || 0);
                return Math.floor((Date.now() - t.getTime()) / 60000);
              })();

              return (
                <View key={order.id} style={[styles.card, isReady && styles.cardActive]}>
                  {/* CARD HEADER */}
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.orderId}>#{order.id}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: isReady ? Theme.colors.success + '22' : '#fef3c7' }]}>
                        <Text style={[styles.statusBadgeText, { color: isReady ? Theme.colors.success : '#d97706' }]}>
                          {isReady ? '🛵 EN ROUTE' : '👨‍🍳 EN PRÉPARATION'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.timer, mins > 25 && { color: Theme.colors.danger, fontWeight: 'bold' }]}>
                      ⏱ {mins} min
                    </Text>
                  </View>

                  {/* CLIENT & ADDRESS */}
                  <View style={styles.infoSection}>
                    <View style={styles.clientRow}>
                      <Ionicons name="person" size={16} color={Theme.colors.textSecondary} />
                      <Text style={styles.clientName}>{order.customerName}</Text>
                    </View>

                    {/* ADDRESS WITH GPS BUTTON */}
                    <View style={styles.addressBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.addressLabel}>ADRESSE DE LIVRAISON :</Text>
                        <Text style={styles.addressText}>{order.customerAddress}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.gpsBtn}
                        onPress={() => openGPS(order.customerAddress)}
                      >
                        <Ionicons name="navigate" size={18} color="#fff" />
                        <Text style={styles.gpsBtnText}>GPS</Text>
                      </TouchableOpacity>
                    </View>

                    {/* PHONE WITH CALL BUTTON */}
                    <View style={styles.phoneBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.phoneText}>📞 {order.customerPhone}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => Linking.openURL(`tel:${order.customerPhone.replace(/\s+/g, '')}`)}
                      >
                        <Ionicons name="call" size={16} color="#000" />
                        <Text style={styles.callBtnText}>Appeler</Text>
                      </TouchableOpacity>
                    </View>

                    {/* NOTE */}
                    {order.note ? (
                      <View style={styles.noteBox}>
                        <Text style={styles.noteLabel}>Note client :</Text>
                        <Text style={styles.noteText}>{order.note}</Text>
                      </View>
                    ) : null}

                    {/* PAYMENT INFO */}
                    <View style={styles.paymentBox}>
                      <Text style={styles.totalText}>Total : {order.total.toFixed(2)} CHF</Text>
                      <View style={[styles.paymentBadge, { backgroundColor: order.isPaid ? Theme.colors.success + '22' : Theme.colors.danger + '22' }]}>
                        <Text style={[styles.paymentBadgeText, { color: order.isPaid ? Theme.colors.success : Theme.colors.danger }]}>
                          {order.isPaid ? '✓ DÉJÀ PAYÉ' : `À ENCAISSER (${order.paymentMethod === 'card' ? 'Carte' : 'Espèces'})`}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* ACTION BUTTONS */}
                  {filter === 'active' && (
                    <View style={styles.actionsRow}>
                      {!isReady ? (
                        <TouchableOpacity
                          style={styles.departBtn}
                          onPress={() => handleDepart(order.id)}
                        >
                          <Ionicons name="bicycle" size={20} color="#fff" />
                          <Text style={styles.actionBtnText}>JE PARS EN LIVRAISON 🚀</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.deliveredBtn}
                          onPress={() => handleComplete(order.id, order.isPaid)}
                        >
                          <Ionicons name="checkmark-done" size={20} color="#fff" />
                          <Text style={styles.actionBtnText}>LIVRÉ & ENCAISSÉ ✅</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: Theme.colors.border,
  },
  headerTitle: { fontFamily: Theme.fonts.title, fontSize: 18, color: Theme.colors.text, letterSpacing: 1 },
  headerSubtitle: { fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary },
  iconBtn: { padding: 8 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: Theme.colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Theme.colors.success },
  tabText: { fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.textSecondary },
  tabTextActive: { color: Theme.colors.success },
  content: { padding: 16, gap: 16 },
  contentDesktop: { maxWidth: 720, width: '100%', alignSelf: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: 12 },
  emptyTitle: { fontFamily: Theme.fonts.title, fontSize: 20, color: Theme.colors.text },
  emptySubtitle: { fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardActive: {
    borderColor: Theme.colors.success,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 12,
  },
  orderId: { fontFamily: Theme.fonts.title, fontSize: 22, color: Theme.colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontFamily: Theme.fonts.bodyBold, fontSize: 11 },
  timer: { fontFamily: Theme.fonts.bodyMedium, fontSize: 13, color: Theme.colors.textSecondary },
  infoSection: { gap: 10 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientName: { fontFamily: Theme.fonts.bodyBold, fontSize: 15, color: Theme.colors.text },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.background,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  addressLabel: { fontFamily: Theme.fonts.bodyBold, fontSize: 10, color: Theme.colors.textSecondary, letterSpacing: 1 },
  addressText: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.text, marginTop: 2 },
  gpsBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  gpsBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: '#fff' },
  phoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  phoneText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.text },
  callBtn: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: '#000' },
  noteBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  noteLabel: { fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: '#92400e' },
  noteText: { fontFamily: Theme.fonts.body, fontSize: 13, color: '#78350f', marginTop: 2 },
  paymentBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: Theme.colors.border,
  },
  totalText: { fontFamily: Theme.fonts.title, fontSize: 18, color: Theme.colors.text },
  paymentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  paymentBadgeText: { fontFamily: Theme.fonts.bodyBold, fontSize: 11 },
  actionsRow: { marginTop: 14 },
  departBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deliveredBtn: {
    backgroundColor: Theme.colors.success,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 15, color: '#fff', letterSpacing: 0.5 },
});
