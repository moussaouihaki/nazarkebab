import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { useCartStore } from '../store/useCartStore';
import { useRestaurantStore } from '../store/useRestaurantStore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
    const html = generateHTML(order, settings, isPaid);

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
      const html = generateHTML(order, settings, isPaid);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      console.error(e);
    }
  };

  function generateHTML(order: any, settings: any, isPaid: boolean) {
    return `
      <html>
        <head>
          <style>
            body { font-family: 'Courier', monospace; padding: 20px; width: 320px; margin: auto; color: #333; }
            .center { text-align: center; }
            .divider { border-bottom: 2px dashed #000; margin: 15px 0; }
            table { width: 100%; border-collapse: collapse; }
            .qty { width: 40px; font-weight: bold; }
            .price { text-align: right; }
            .total { font-weight: bold; font-size: 1.3em; border-top: 1px solid #000; }
            .status-box { border: 3px solid #000; padding: 10px; margin: 15px 0; font-weight: bold; font-size: 1.5em; text-align: center; }
          </style>
        </head>
        <body>
          <div class="center">
            <h1 style="margin-bottom: 5px; font-size: 1.8em;">${settings.name.toUpperCase()}</h1>
            <p style="font-size: 1em; margin-top: 0;">${settings.address}<br>Tél: ${settings.phone}</p>
          </div>
          <div class="divider"></div>
          <div class="center">
            <h3>${isPaid ? 'TICKET DE CAISSE' : 'BON DE COMMANDE'}</h3>
            <p>N° ${order.id}</p>
            <p>${new Date(order.createdAt).toLocaleString('fr-CH')}</p>
          </div>
          <div class="divider"></div>
          <table>
            ${order.items.map((item: any) => `
              <tr>
                <td class="qty">${item.quantity}x</td>
                <td>${item.name}</td>
                <td class="price">${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
          <div class="divider"></div>
          <table style="margin-top: 10px;">
            <tr><td>Total HT:</td><td class="price">${order.subTotal.toFixed(2)} CHF</td></tr>
            <tr><td>TVA (2.6%):</td><td class="price">${order.taxAmount.toFixed(2)} CHF</td></tr>
            <tr class="total"><td style="padding-top: 5px;">TOTAL TTC:</td><td class="price" style="padding-top: 5px;">${order.total.toFixed(2)} CHF</td></tr>
          </table>
          <div class="status-box">
             ${isPaid ? 'PAYÉ' : 'À PAYER'}
          </div>
          <div class="center" style="margin-top: 20px;">
            <p>Merci de votre confiance !</p>
            <p style="font-size: 0.9em;">www.nazarkebab.ch</p>
          </div>
        </body>
      </html>
    `;
  }

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
              <Text style={styles.receiptText}>CHE-123.456.789 TVA</Text>
              <Text style={styles.receiptText}>www.nazarkebab.ch</Text>
            </View>

            <View style={styles.divider} />

            {/* RECEIPT METADATA */}
            <View style={styles.metaData}>
              <Text style={styles.receiptTitle}>{receiptTitle}</Text>
              <Text style={styles.receiptText}>Commande: {order.id}</Text>
              <Text style={styles.receiptText}>Date: {new Date(order.createdAt).toLocaleString('fr-CH')}</Text>
              <Text style={styles.receiptText}>Client: {order.customerName}</Text>
              <Text style={styles.receiptText}>Type: {order.deliveryType === 'delivery' ? 'LIVRAISON' : 'À EMPORTER'}</Text>
            </View>

            <View style={styles.divider} />

            {/* ITEMS */}
            <View style={styles.itemsSection}>
              <View style={styles.itemRow}>
                <Text style={[styles.itemQty, styles.bold]}>QTE</Text>
                <Text style={[styles.itemName, styles.bold]}>ARTICLE</Text>
                <Text style={[styles.itemTotal, styles.bold]}>TOTAL</Text>
              </View>
              {order.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{item.quantity}</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemTotal}>{(item.price * item.quantity).toFixed(2)}</Text>
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
              <Text style={styles.receiptText}>À bientôt chez Nazar Kebab</Text>
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
