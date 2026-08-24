import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { useCartStore } from '../store/useCartStore';
import { useRestaurantStore } from '../store/useRestaurantStore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateReceiptHTML } from '../utils/receipt';
import { splitOptions } from '../utils/optionsOrder';

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, listenToOrders } = useCartStore();
  const { settings } = useRestaurantStore();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const order = orders.find(o => o.id === id);

  React.useEffect(() => {
    // If order is not in the store, listen specifically to this order ID
    if (!order && id) {
      const unsubscribe = listenToOrders(undefined, false, id);
      return () => unsubscribe();
    }
  }, [id, !!order]);

  const handlePrint = async () => {
    if (!order) return;
    const isPaid = order.isPaid;
    const html = generateReceiptHTML(order, settings, isPaid);

    try {
      if (Platform.OS === 'web') {
        const { uri } = await Print.printToFileAsync({ html });
        window.open(uri, '_blank');
      } else {
        await Print.printAsync({ html });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    if (Platform.OS === 'web') {
      handlePrint();
      return;
    }
    if (!order) return;
    try {
      const isPaid = order.isPaid;
      const html = generateReceiptHTML(order, settings, isPaid);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      console.error(e);
    }
  };



  if (!order) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.inner}>
          <Text style={{ color: Theme.colors.text }}>Commande introuvable.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: Theme.colors.success }}>Retour</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const isPaid = order.isPaid;
  const receiptTitle = isPaid ? 'TICKET DE CAISSE' : 'BON DE COMMANDE';
  const accentColor = isPaid ? Theme.colors.success : Theme.colors.danger; // Gold/Green vs Red

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.inner}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', gap: 10, marginRight: 'auto', marginLeft: 16 }}>
            <TouchableOpacity onPress={handlePrint} style={[styles.closeBtn, { paddingHorizontal: 12, flexDirection: 'row', gap: 6 }]}>
              <Ionicons name="print-outline" size={20} color={Theme.colors.success} />
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.success }}>{isDesktop ? 'IMPRIMER' : ''}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleShare} style={[styles.closeBtn, { paddingHorizontal: 12, flexDirection: 'row', gap: 6, borderColor: Theme.colors.success, borderWidth: 1, backgroundColor: 'transparent' }]}>
              <Ionicons name="share-outline" size={20} color={Theme.colors.success} />
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.success }}>PARTAGER / PDF</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={Theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.receiptPaper}>
            {/* RESTAURANT INFO */}
            <View style={styles.receiptHeader}>
              <Text style={styles.logoTitle}>{settings.name.toUpperCase()}</Text>
              <Text style={styles.receiptText}>{settings.address}</Text>
              <Text style={styles.receiptText}>Tél: {settings.phone}</Text>
              {settings.tva ? <Text style={styles.receiptText}>{settings.tva}</Text> : null}
              <Text style={styles.receiptText}>www.pokemoons.ch</Text>
            </View>

            <View style={styles.divider} />

            {/* RECEIPT METADATA */}
            <View style={styles.metaData}>
              <Text style={styles.receiptTitle}>{receiptTitle}</Text>
              <Text style={styles.receiptText}>Commande: {order.id}</Text>
              <Text style={styles.receiptText}>Date: {new Date(order.createdAt).toLocaleString('fr-CH')}</Text>
              <Text style={styles.receiptText}>Client: {order.customerName}</Text>
              <Text style={styles.receiptText}>Tél: {order.customerPhone}</Text>
              {order.deliveryType === 'delivery' && (
                <Text style={styles.receiptText}>Adresse: {order.customerAddress}</Text>
              )}
              
              <View style={[styles.statusBadge, { marginTop: 12, paddingVertical: 4, transform: [] }]}>
                <Text style={[styles.statusBadgeText, { fontSize: 16, color: '#000' }]}>
                  {order.deliveryType === 'delivery' ? 'LIVRAISON 🛵' : 'À EMPORTER 🛍️'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ITEMS */}
            <View style={styles.itemsSection}>
              <View style={styles.itemRow}>
                <Text style={[styles.itemQty, styles.bold]}>QTE</Text>
                <Text style={[styles.itemName, styles.bold]}>ARTICLE</Text>
                <Text style={[styles.itemTotal, styles.bold]}>TOTAL</Text>
              </View>
              {order.items.map((item: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 12 }}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemQty}>{item.quantity}</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemTotal}>{(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                  {item.selectedOptions && (() => {
                    const { food, extras } = splitOptions(item.selectedOptions);
                    return (
                      <>
                        {food.map((f, i) => (
                          <View key={`f-${i}`} style={{ marginLeft: 20, marginTop: 6 }}>
                            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#000', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, alignSelf: 'flex-start' }}>
                              <Text style={[styles.receiptText, { fontFamily: 'Courier-Bold', fontWeight: 'bold', fontSize: 10, color: '#000' }]}>{f.sec}</Text>
                            </View>
                            <Text style={[styles.receiptText, { marginLeft: 6, marginTop: 2, fontSize: 11, color: '#333' }]}>
                              {f.choices.join(', ')}
                            </Text>
                          </View>
                        ))}
                        {extras.map((e, i) => (
                          <View key={`e-${i}`} style={{ marginLeft: 20, marginTop: 10, padding: 4, backgroundColor: '#f0f0f0', borderStyle: 'dashed', borderWidth: 1, borderColor: '#aaa', borderRadius: 4, alignSelf: 'flex-start' }}>
                            <Text style={[styles.receiptText, { fontFamily: 'Courier-Bold', fontWeight: 'bold', fontSize: 12, color: '#000' }]}>
                              [+] {e.sec}: {e.choices.join(', ')}
                            </Text>
                          </View>
                        ))}
                      </>
                    );
                  })()}
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            {/* TOTALS */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.receiptText}>TOTAL HT (Hors TVA)</Text>
                <Text style={styles.receiptText}>{order.subTotal.toFixed(2)} CHF</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.receiptText}>TVA (2.6%)</Text>
                <Text style={styles.receiptText}>{order.taxAmount.toFixed(2)} CHF</Text>
              </View>
              
              <View style={[styles.divider, { borderStyle: 'solid' }]} />

              <View style={styles.totalRow}>
                <Text style={styles.grandTotalText}>A PAYER (TTC)</Text>
                <Text style={styles.grandTotalText}>{order.total.toFixed(2)} CHF</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* PAYMENT STATUS */}
            <View style={styles.paymentSection}>
              <View style={[styles.statusBadge, { borderColor: accentColor }]}>
                <Text style={[styles.statusBadgeText, { color: accentColor }]}>
                  {isPaid ? 'PAYÉ' : 'À PAYER'}
                </Text>
              </View>
              {!isPaid && (
                <Text style={styles.footerNote}>
                  Le paiement sera effectué lors de la livraison ou du retrait.
                </Text>
              )}
            </View>

            <View style={styles.footerSection}>
              <Text style={styles.receiptText}>Merci de votre visite !</Text>
              <Text style={styles.receiptText}>À bientôt chez Pokémoons</Text>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  inner: { flex: 1 },
  header: { alignItems: 'flex-end', padding: 16 },
  closeBtn: { padding: 4, backgroundColor: Theme.colors.surface, borderRadius: 20 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, alignItems: 'center' },
  
  receiptPaper: {
    width: Platform.OS === 'web' ? 400 : '100%',
    backgroundColor: '#fff', // Real paper look
    padding: 24,
    borderRadius: 8,
    // Soft shadow to look like paper
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  divider: {
    width: '100%',
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    marginVertical: 16,
  },
  receiptHeader: { alignItems: 'center', gap: 4 },
  logoTitle: { fontFamily: Theme.fonts.logo, fontSize: 32, color: '#000', letterSpacing: 2, marginBottom: 8 },
  receiptText: { fontFamily: 'Courier', fontSize: 13, color: '#333' },
  bold: { fontWeight: 'bold' },
  
  metaData: { gap: 6 },
  receiptTitle: { fontFamily: Theme.fonts.bodyBold, fontSize: 16, color: '#000', textAlign: 'center', marginBottom: 12 },
  
  itemsSection: { gap: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemQty: { width: 30, fontFamily: 'Courier', fontSize: 13, color: '#000' },
  itemName: { flex: 1, fontFamily: 'Courier', fontSize: 13, color: '#000' },
  itemTotal: { width: 60, textAlign: 'right', fontFamily: 'Courier', fontSize: 13, color: '#000' },
  
  totalsSection: { gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grandTotalText: { fontFamily: Theme.fonts.bodyBold, fontSize: 18, color: '#000' },

  paymentSection: { alignItems: 'center', marginVertical: 10 },
  statusBadge: { borderWidth: 2, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, transform: [{ rotate: '-5deg' }] },
  statusBadgeText: { fontFamily: Theme.fonts.logo, fontSize: 24, letterSpacing: 2 },
  footerNote: { fontFamily: 'Courier', fontSize: 11, color: '#666', textAlign: 'center', marginTop: 12 },

  footerSection: { alignItems: 'center', marginTop: 16, gap: 4 },
});
