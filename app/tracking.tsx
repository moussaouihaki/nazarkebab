import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Animated, Platform, useWindowDimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { useCartStore, OrderStatus } from '../store/useCartStore';
import { useRestaurantStore } from '../store/useRestaurantStore';
import BottomBar from '../components/BottomBar';

const STEPS: { status: OrderStatus; label: string; icon: any; description: string }[] = [
  { status: 'pending',   label: 'Commande reçue',    icon: 'checkmark-circle',    description: 'Votre commande a bien été envoyée au restaurant.' },
  { status: 'confirmed', label: 'Confirmée',          icon: 'thumbs-up',           description: 'Le restaurant a accepté votre commande.' },
  { status: 'preparing', label: 'En préparation',     icon: 'flame',               description: 'Votre repas est en cours de préparation.' },
  { status: 'ready',     label: 'En route / Prête',   icon: 'bicycle',             description: 'Votre commande est en chemin ou prête à être récupérée !' },
  { status: 'delivered', label: 'Livrée',             icon: 'checkmark-done-circle', description: 'Votre commande a été livrée. Bon appétit !' },
];

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

export default function TrackingScreen() {
  const { activeOrder, orders } = useCartStore();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { settings } = useRestaurantStore();

  // Use the most recent non-cancelled order if no active
  const latestOrder = activeOrder || orders.find(o => o.status !== 'cancelled');
  
  const currentStepIndex = latestOrder
    ? STATUS_ORDER.indexOf(latestOrder.status)
    : -1;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (currentStepIndex >= 0) {
      Animated.timing(progressAnim, {
        toValue: currentStepIndex / (STEPS.length - 1),
        duration: 800,
        useNativeDriver: false,
      }).start();

      // Pulse animation for the active step
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [currentStepIndex]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!latestOrder) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.emptyContainer}>
            <Ionicons name="bicycle-outline" size={72} color={Theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>Aucune commande active</Text>
            <Text style={styles.emptySubtitle}>
              Passez une commande pour suivre sa progression en temps réel ici.
            </Text>
            <TouchableOpacity style={styles.goldBtn} onPress={() => router.push('/menu')}>
              <Text style={styles.goldBtnText}>COMMANDER MAINTENANT</Text>
            </TouchableOpacity>
          </View>
          <BottomBar />
        </SafeAreaView>
      </View>
    );
  }

  const isCancelled = latestOrder.status === 'cancelled';
  const isDelivered = latestOrder.status === 'delivered';

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[{ paddingBottom: 100 }, isDesktop && { paddingTop: 100 }]} showsVerticalScrollIndicator={false}>

          {/* HEADER */}
          <View style={[styles.header, isDesktop && { display: 'none' }]}>
            <View>
              <Text style={styles.orderLabel}>COMMANDE</Text>
              <Text style={styles.orderId}>#{latestOrder.id}</Text>
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: isCancelled ? Theme.colors.danger + '22' : isDelivered ? '#88888822' : Theme.colors.success + '22',
              borderColor: isCancelled ? Theme.colors.danger : isDelivered ? '#888' : Theme.colors.success,
            }]}>
              <Text style={[styles.statusBadgeText, {
                color: isCancelled ? Theme.colors.danger : isDelivered ? '#888' : Theme.colors.success,
              }]}>
                {isCancelled ? 'Annulée' : isDelivered ? '✓ Livrée' : '● Live'}
              </Text>
            </View>
          </View>

          {!isCancelled && (
            <>
              {/* PROGRESS BAR */}
              <View style={styles.progressSection}>
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                </View>

                {/* STEP DOTS */}
                <View style={styles.stepsRow}>
                  {STEPS.map((step, i) => {
                    const done    = i < currentStepIndex;
                    const current = i === currentStepIndex;
                    const pending = i > currentStepIndex;
                    return (
                      <View key={step.status} style={styles.stepItem}>
                        <Animated.View style={[
                          styles.stepDot,
                          done    && styles.stepDotDone,
                          current && styles.stepDotCurrent,
                          current && { transform: [{ scale: pulseAnim }] },
                        ]}>
                          <Ionicons
                            name={step.icon}
                            size={current ? 18 : 14}
                            color={done || current ? '#000' : Theme.colors.textSecondary}
                          />
                        </Animated.View>
                        <Text style={[
                          styles.stepLabel,
                          done    && styles.stepLabelDone,
                          current && styles.stepLabelCurrent,
                        ]} numberOfLines={2}>{step.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* CURRENT STATUS */}
              {currentStepIndex >= 0 && (
                <View style={styles.currentStatusCard}>
                  <Ionicons name={STEPS[currentStepIndex].icon} size={28} color={Theme.colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currentStatusTitle}>{STEPS[currentStepIndex].label}</Text>
                    <Text style={styles.currentStatusDesc}>{STEPS[currentStepIndex].description}</Text>
                  </View>
                </View>
              )}

              {/* ESTIMATED TIME */}
              {!isDelivered && (
                <View style={styles.etaCard}>
                  <Ionicons name="time-outline" size={20} color={Theme.colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.etaLabel}>Temps estimé restant</Text>
                    <Text style={{ fontSize: 10, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.body }}>
                       Estimation {latestOrder.deliveryType === 'delivery' ? 'livraison' : 'préparation'} habituelle : {latestOrder.deliveryType === 'delivery' ? settings.deliveryTime : settings.takeAwayTime} min
                    </Text>
                  </View>
                  <Text style={styles.etaValue}>~{latestOrder.estimatedTime} min</Text>
                </View>
              )}
            </>
          )}

          {isCancelled && (
            <View style={styles.cancelledCard}>
              <Ionicons name="close-circle" size={36} color={Theme.colors.danger} />
              <Text style={styles.cancelledTitle}>Commande annulée</Text>
              <Text style={styles.cancelledSubtitle}>Cette commande a été annulée. N'hésitez pas à recommander.</Text>
            </View>
          )}

          {/* ORDER DETAILS */}
          <Text style={styles.sectionLabel}>DÉTAILS DE LA COMMANDE</Text>
          <View style={styles.detailCard}>
            {latestOrder.items.map((item, i) => (
              <View key={`${item.id}-${i}`} style={[styles.itemRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border, paddingTop: 12, marginTop: 12 }]}>
                <Text style={styles.itemQty}>{item.quantity}×</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{(item.price * item.quantity).toFixed(2)} CHF</Text>
              </View>
            ))}

            <View style={[styles.itemRow, { borderTopWidth: 1, borderTopColor: Theme.colors.border, marginTop: 16, paddingTop: 12, justifyContent: 'space-between' }]}>
              <Text style={[styles.itemName, { fontFamily: Theme.fonts.logo, fontSize: 18, flex: 1 }]}>TOTAL</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.itemPrice, { color: Theme.colors.success, fontSize: 20, fontFamily: Theme.fonts.logo }]}>{latestOrder.total.toFixed(2)} CHF</Text>
                <TouchableOpacity onPress={() => router.push({ pathname: '/receipt', params: { id: latestOrder.id } })} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="receipt-outline" size={14} color={Theme.colors.textSecondary} />
                  <Text style={{ fontFamily: Theme.fonts.bodyMedium, fontSize: 12, color: Theme.colors.textSecondary }}>
                    Voir {latestOrder.isPaid ? 'le ticket' : 'le détail TVA'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* DELIVERY INFO */}
          <Text style={styles.sectionLabel}>LIVRAISON</Text>
          <View style={styles.detailCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={Theme.colors.textSecondary} />
              <Text style={styles.infoValue}>{latestOrder.customerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={Theme.colors.textSecondary} />
              <Text style={styles.infoValue}>{latestOrder.customerPhone}</Text>
            </View>
            {latestOrder.deliveryType === 'delivery' && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={Theme.colors.textSecondary} />
                <Text style={styles.infoValue}>{latestOrder.customerAddress}</Text>
              </View>
            )}
            {latestOrder.deliveryType === 'pickup' && (
              <View style={styles.infoRow}>
                <Ionicons name="storefront-outline" size={16} color={Theme.colors.textSecondary} />
                <Text style={styles.infoValue}>À emporter — Grand-Rue 9, 2900 Porrentruy</Text>
              </View>
            )}
            {latestOrder.note && (
              <View style={styles.infoRow}>
                <Ionicons name="chatbubble-outline" size={16} color={Theme.colors.textSecondary} />
                <Text style={styles.infoValue}>{latestOrder.note}</Text>
              </View>
            )}
          </View>

          {/* CONTACT RESTAURANT */}
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call" size={20} color="#000" />
            <Text style={styles.callBtnText}>Contacter le restaurant — 032 757 44 44</Text>
          </TouchableOpacity>
        </ScrollView>

        <BottomBar />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  orderLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, letterSpacing: 2 },
  orderId: { fontFamily: Theme.fonts.logo, fontSize: 32, color: Theme.colors.text, letterSpacing: 2 },
  statusBadge: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontFamily: Theme.fonts.bodyBold, fontSize: 12 },

  // Progress
  progressSection: { paddingHorizontal: 20, paddingVertical: 16 },
  progressTrack: { height: 4, backgroundColor: Theme.colors.surface, borderRadius: 2, marginBottom: 24, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Theme.colors.success, borderRadius: 2 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepDotDone: { backgroundColor: Theme.colors.success + '88', borderColor: Theme.colors.success },
  stepDotCurrent: { backgroundColor: Theme.colors.success, borderColor: Theme.colors.success, shadowColor: Theme.colors.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 8 },
  stepLabel: { fontFamily: Theme.fonts.body, fontSize: 9, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 13 },
  stepLabelDone: { color: Theme.colors.textSecondary },
  stepLabelCurrent: { color: Theme.colors.success, fontFamily: Theme.fonts.bodyMedium },

  // Current status
  currentStatusCard: { flexDirection: 'row', gap: 14, alignItems: 'center', marginHorizontal: 20, backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.success + '44' },
  currentStatusTitle: { fontFamily: Theme.fonts.title, fontSize: 20, color: Theme.colors.text, marginBottom: 4 },
  currentStatusDesc: { fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, lineHeight: 18 },

  // ETA
  etaCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, padding: 14, backgroundColor: Theme.colors.success + '11', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: Theme.colors.success + '33' },
  etaLabel: { flex: 1, fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.text },
  etaValue: { fontFamily: Theme.fonts.logo, fontSize: 20, color: Theme.colors.success },

  // Cancelled
  cancelledCard: { margin: 20, backgroundColor: Theme.colors.danger + '11', borderRadius: 16, padding: 24, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Theme.colors.danger + '33' },
  cancelledTitle: { fontFamily: Theme.fonts.title, fontSize: 22, color: Theme.colors.danger },
  cancelledSubtitle: { fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, textAlign: 'center' },

  // Detail card
  sectionLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, letterSpacing: 2, paddingHorizontal: 20, marginTop: 16, marginBottom: 10 },
  detailCard: { marginHorizontal: 20, backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemQty: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.success, minWidth: 24 },
  itemName: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.text, flex: 1 },
  itemPrice: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.text },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  infoValue: { fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.text, flex: 1 },

  // Contact
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 20, backgroundColor: Theme.colors.success, padding: 16, borderRadius: 100, justifyContent: 'center', shadowColor: Theme.colors.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  callBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: '#000' },

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  emptyTitle: { fontFamily: Theme.fonts.title, fontSize: 28, color: Theme.colors.text, letterSpacing: 2, textAlign: 'center' },
  emptySubtitle: { fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  goldBtn: { backgroundColor: Theme.colors.success, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 100, shadowColor: Theme.colors.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  goldBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 15, color: '#000', letterSpacing: 0.5 },
});
