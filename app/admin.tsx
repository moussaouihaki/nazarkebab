import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, TextInput, Switch, Platform, Alert, Modal, ActivityIndicator, Linking, useWindowDimensions
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Theme } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useRestaurantStore, checkIsRestaurantOpen } from '../store/useRestaurantStore';
import { useContentStore } from '../store/useContentStore';
import { useDeliveryZoneStore, DeliveryZone } from '../store/useDeliveryZoneStore';
import { Product, PRODUCTS as INITIAL_PRODUCTS, IMAGES_MAP, getImageSource } from '../constants/data';
import { uploadImageAsync } from '../lib/uploadImage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sendPushNotification } from '../lib/pushNotifications';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateReceiptHTML } from '../utils/receipt';
import { splitOptions } from '../utils/optionsOrder';

type Tab = 'dashboard' | 'orders' | 'kitchen' | 'crm' | 'menu' | 'settings' | 'accounting' | 'cms';

// ──────────────────────────────────
// ORDER STATUS CONFIG
// ──────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready: 'Prête / En route',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};
const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800',
  confirmed: '#4CAF50',
  preparing: '#2196F3',
  ready: Theme.colors.success,
  delivered: '#888',
  cancelled: Theme.colors.danger,
};
const NEXT_STATUS: Record<string, string | null> = {
  pending: 'confirmed', confirmed: 'preparing',
  preparing: 'ready', ready: 'delivered',
  delivered: null, cancelled: null,
};

// ──────────────────────────────────────────────
// PRINT SPOOLER (For Auto-Printing Orders)
// ──────────────────────────────────────────────
function PrintSpooler() {
  const order = useCartStore(s => s.autoPrintOrder);
  const settings = useRestaurantStore(s => s.settings);

  React.useEffect(() => {
    if (order) {
       if (!settings.autoPrintEnabled) {
         useCartStore.getState().setAutoPrintOrder(null);
         return;
       }
       const printOrder = async () => {
          const isPaid = order.isPaid;
          const html = generateReceiptHTML(order, settings, isPaid);
          try {
             if (Platform.OS === 'web') {
               const iframe = document.createElement('iframe');
               iframe.style.display = 'none';
               document.body.appendChild(iframe);
               iframe.contentWindow?.document.write(html);
               iframe.contentWindow?.document.close();
               iframe.onload = () => {
                 setTimeout(() => {
                   iframe.contentWindow?.print();
                   setTimeout(() => { if(document.body.contains(iframe)) document.body.removeChild(iframe) }, 1000);
                 }, 500);
               };
             } else {
               await Print.printAsync({ 
                 html, 
                 printerUrl: settings.selectedPrinterUrl || undefined 
               });
             }
          } catch(e) {
             console.error('Erreur auto-print', e);
          }
          useCartStore.getState().setAutoPrintOrder(null);
       };
       printOrder();
    }
  }, [order, settings.autoPrintEnabled, settings.selectedPrinterUrl]);

  return null;
}

class ErrorBoundary extends React.Component<any, { error: Error | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() { 
    if (this.state.error) return <Text style={{color:'red', margin:20}}>{this.state.error.message}</Text>;
    return this.props.children; 
  }
}

const safeOrderDate = (val: any): Date => {
  try {
    if (!val) return new Date();
    if (typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'object' && val.seconds) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) {
    return new Date();
  }
};

const safeFormatTime = (val: any): string => {
  try {
    const d = safeOrderDate(val);
    return d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '--:--';
  }
};

const safeFormatDate = (val: any): string => {
  try {
    const d = safeOrderDate(val);
    return d.toLocaleDateString('fr-CH');
  } catch (e) {
    return '--/--/----';
  }
};

// ──────────────────────────────────────────────
// MAIN ADMIN SCREEN
// ──────────────────────────────────────────────
export default function AdminScreen() {
  return (
    <ErrorBoundary>
      <AdminContent />
    </ErrorBoundary>
  );
}

function AdminContent() {
  const { user, logout } = useAuthStore();
  const { orders } = useCartStore();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevOrdersCount = useRef(orders?.length || 0);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const playNewOrderChime = () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.4);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.2); // A5
        gain2.gain.setValueAtTime(0.3, now + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.2);
        osc2.stop(now + 0.7);
      }
    } catch (e) {
      console.warn('Audio chime error', e);
    }
  };

  // Trigger audio chime on new orders
  useEffect(() => {
    if ((orders?.length || 0) > prevOrdersCount.current) {
      if (soundEnabled) {
        playNewOrderChime();
      }
    }
    prevOrdersCount.current = orders?.length || 0;
  }, [orders?.length, soundEnabled]);

  // Auth guard & Web notification permission
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const Notif = (window as any).Notification;
      if (Notif && Notif.permission === 'default') {
        Notif.requestPermission().catch(() => {});
      }
    }
  }, []);

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const { login } = useAuthStore();

  if (!user || user.role !== 'admin') {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
        <SafeAreaView style={{ width: '100%', maxWidth: 420 }}>
          <View style={{ backgroundColor: Theme.colors.surface, padding: 32, borderRadius: 24, borderWidth: 1, borderColor: Theme.colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6, gap: 16 }}>
            <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Theme.colors.success + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="shield-checkmark" size={32} color={Theme.colors.success} />
              </View>
              <Text style={{ fontFamily: Theme.fonts.logo, fontSize: 24, letterSpacing: 3, color: Theme.colors.text }}>POKÉMOONS</Text>
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.textSecondary, letterSpacing: 1 }}>ESPACE ADMINISTRATION</Text>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={styles.fieldLabel}>EMAIL ADMINISTRATEUR</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@pokemoons.ch"
                placeholderTextColor="#999"
                value={adminEmail}
                onChangeText={(t) => { setAdminEmail(t); setAdminError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={styles.fieldLabel}>MOT DE PASSE</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#999"
                value={adminPass}
                onChangeText={(t) => { setAdminPass(t); setAdminError(''); }}
                secureTextEntry
              />
            </View>

            {adminError ? (
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.danger, textAlign: 'center' }}>
                {adminError}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.goldBtn, { marginTop: 8, justifyContent: 'center' }]}
              disabled={adminLoading}
              onPress={async () => {
                if (!adminEmail.trim() || !adminPass) {
                  setAdminError('Veuillez remplir tous les champs');
                  return;
                }
                setAdminLoading(true);
                setAdminError('');
                const ok = await login(adminEmail.trim(), adminPass);
                setAdminLoading(false);
                if (!ok) {
                  setAdminError('Identifiants incorrects ou compte non admin');
                }
              }}
            >
              {adminLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.goldBtnText, { textAlign: 'center' }]}>SE CONNECTER À L'ADMIN</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/')}
              style={{ paddingVertical: 8, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ fontFamily: Theme.fonts.bodyMedium, fontSize: 13, color: Theme.colors.textSecondary }}>
                ← Retour au site public
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const TABS = [
    { key: 'dashboard',  icon: 'stats-chart-outline', label: 'Dashboard' },
    { key: 'orders',     icon: 'receipt-outline',     label: 'Commandes' },
    { key: 'kitchen',    icon: 'flame-outline',       label: 'Cuisine' },
    { key: 'crm',        icon: 'people-outline',      label: 'Clients CRM' },
    { key: 'menu',       icon: 'restaurant-outline',  label: 'Menu & Stock' },
    { key: 'accounting', icon: 'bar-chart-outline',   label: 'Comptabilité' }, // NEW
    { key: 'settings',   icon: 'settings-outline',    label: 'Réglages' },
  ] as { key: Tab; icon: any; label: string }[];

  const renderContent = () => {
    if (tab === 'dashboard') return <ErrorBoundary><DashboardTab /></ErrorBoundary>;
    if (tab === 'orders') return <ErrorBoundary><OrdersTab /></ErrorBoundary>;
    if (tab === 'kitchen') return <ErrorBoundary><KitchenTab /></ErrorBoundary>;
    if (tab === 'crm') return <ErrorBoundary><CrmTab /></ErrorBoundary>;
    if (tab === 'menu') return <ErrorBoundary><MenuTab /></ErrorBoundary>;
    if (tab === 'accounting') return <ErrorBoundary><AccountingTab /></ErrorBoundary>;
    if (tab === 'settings') return <ErrorBoundary><SettingsTab /></ErrorBoundary>;
    return null;
  };

  if (isDesktop) {
    return (
      <View style={[styles.container, { flexDirection: 'row' }]}>
        {/* SAAS SIDEBAR */}
        <View style={styles.saasSidebar}>
          <View style={styles.saasSidebarHeader}>
            <Text style={styles.saasLogo}>POKÉMOONS</Text>
            <Text style={styles.saasLogoSub}>WORKSPACE</Text>
          </View>
          
          <ScrollView style={styles.saasSidebarNav}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.saasSidebarNavItem, tab === t.key && styles.saasSidebarNavItemActive]}
                onPress={() => setTab(t.key)}
              >
                <Ionicons name={t.icon} size={20} color={tab === t.key ? Theme.colors.success : Theme.colors.textSecondary} />
                <Text style={[styles.saasSidebarNavLabel, tab === t.key && styles.saasSidebarNavLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.saasSidebarNavItem, { backgroundColor: '#0284c718', borderColor: '#0284c744', borderWidth: 1, marginTop: 12 }]}
              onPress={() => router.push('/driver')}
            >
              <Ionicons name="bicycle-outline" size={20} color="#0284c7" />
              <Text style={[styles.saasSidebarNavLabel, { color: '#0284c7', fontWeight: 'bold' }]}>
                Espace Livreur 🛵
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={styles.saasSidebarExit} onPress={() => { logout(); router.replace('/'); }}>
            <Ionicons name="log-out-outline" size={20} color={Theme.colors.danger} />
            <Text style={[styles.saasSidebarExitText, { color: Theme.colors.danger }]}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {/* SAAS MAIN CONTENT */}
        <View style={styles.saasMainContent}>
          <View style={styles.saasTopBar}>
            <Text style={styles.saasTopBarTitle}>Administration</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setSoundEnabled(!soundEnabled)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: soundEnabled ? Theme.colors.success + '22' : '#eee',
                  borderColor: soundEnabled ? Theme.colors.success : '#ccc',
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20
                }}
              >
                <Ionicons name={soundEnabled ? "volume-high" : "volume-mute"} size={16} color={soundEnabled ? Theme.colors.success : Theme.colors.textSecondary} />
                <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: soundEnabled ? Theme.colors.success : Theme.colors.textSecondary }}>
                  {soundEnabled ? 'Sonnerie : ON' : 'Sonnerie : OFF'}
                </Text>
              </TouchableOpacity>
              <View style={styles.saasAdminBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#000" />
                <Text style={styles.saasAdminBadgeText}>ADMIN</Text>
              </View>
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
             {renderContent()}
          </View>
        </View>
        <PrintSpooler />
      </View>
    );
  }

  // MOBILE LAYOUT
  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* TOP HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PANEL ADMIN</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => router.push('/driver')} style={[styles.iconBtn, { backgroundColor: '#0284c722', borderRadius: 8 }]}>
              <Ionicons name="bicycle" size={20} color="#0284c7" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { logout(); router.replace('/'); }} style={styles.iconBtn}>
              <Ionicons name="log-out-outline" size={24} color={Theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* TAB BAR (Scrollable in Mobile) */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarScroll}
          >
            {TABS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
                onPress={() => setTab(t.key)}
              >
                <Ionicons name={t.icon} size={20} color={tab === t.key ? Theme.colors.success : Theme.colors.textSecondary} />
                <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* TAB CONTENT */}
        <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
          {renderContent()}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ──────────────────────────────────
// TAB: DASHBOARD
// ──────────────────────────────────
function DashboardTab() {
  const { orders } = useCartStore();
  const { settings } = useRestaurantStore();

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const safeOrders = orders || [];

  const todayOrders = safeOrders.filter(o => {
    if (!o) return false;
    const d = safeOrderDate(o.createdAt);
    d.setHours(0, 0, 0, 0);
    return o.status !== 'cancelled' && d.getTime() === todayDate.getTime();
  });

  const dailyRevenue = todayOrders.reduce((s, o) => s + (Number(o?.total) || 0), 0);
  const totalRevenue = safeOrders.filter(o => o && o.status !== 'cancelled').reduce((s, o) => s + (Number(o?.total) || 0), 0);
  const activeCount = safeOrders.filter(o => o && !['delivered', 'cancelled'].includes(o.status)).length;
  const avgOrder = todayOrders.length ? dailyRevenue / todayOrders.length : 0;

  // Calculate last 7 days for the chart
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    
    const dayOrders = safeOrders.filter(o => {
      if (!o) return false;
      const od = safeOrderDate(o.createdAt);
      od.setHours(0, 0, 0, 0);
      return o.status !== 'cancelled' && od.getTime() === d.getTime();
    });
    
    return {
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      value: dayOrders.reduce((s, o) => s + (Number(o?.total) || 0), 0),
    };
  });

  const maxDayRevenue = Math.max(...last7Days.map(d => d.value), 100);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={[isDesktop && { flexDirection: 'row', gap: 24 }]}>
        <View style={{ flex: isDesktop ? 2 : 1 }}>
          <View style={{ marginBottom: 24 }}>
             <Text style={{ fontFamily: Theme.fonts.title, fontSize: 32, color: Theme.colors.text }}>Tableau de bord</Text>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: checkIsRestaurantOpen(settings) ? Theme.colors.success : Theme.colors.danger, marginRight: 8, shadowColor: checkIsRestaurantOpen(settings) ? Theme.colors.success : Theme.colors.danger, shadowOpacity: 0.8, shadowRadius: 6 }} />
                <Text style={{ fontFamily: Theme.fonts.bodyMedium, fontSize: 13, color: Theme.colors.textSecondary }}>
                   Restaurant {checkIsRestaurantOpen(settings) ? 'ouvert' : 'fermé'}
                </Text>
             </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="En cours" value={String(activeCount)} icon="time" color={Theme.colors.primary} />
            <StatCard label="C.A. Aujourd'hui" value={`${dailyRevenue.toFixed(0)} CHF`} icon="cash" color={Theme.colors.success} />
            <StatCard label="C.A. Total" value={`${totalRevenue.toFixed(0)} CHF`} icon="receipt" color="#2196F3" />
            <StatCard label="Panier Moyen" value={`${avgOrder.toFixed(0)} CHF`} icon="cart" color="#FF9800" />
            <StatCard label="Annulées" value={String(safeOrders.filter(o => o && o.status === 'cancelled').length)} icon="close-circle" color={Theme.colors.danger} />
          </View>

          {/* TOP PRODUITS DU JOUR */}
          {todayOrders.length > 0 && (() => {
            const productCounts: Record<string, number> = {};
            todayOrders.forEach(o => (o.items || []).forEach((i: any) => {
              if (i?.name) {
                productCounts[i.name] = (productCounts[i.name] || 0) + (Number(i.quantity) || 1);
              }
            }));
            const sorted = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
            return (
              <View style={[styles.recentActivityCard, { marginTop: 20 }]}>
                <Text style={styles.sectionHeader}>TOP PRODUITS AUJOURD'HUI</Text>
                {sorted.map(([name, count], i) => (
                  <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < sorted.length - 1 ? 1 : 0, borderColor: Theme.colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 16, color: Theme.colors.textSecondary }}>#{i+1}</Text>
                      <Text style={{ fontFamily: Theme.fonts.bodyMedium, fontSize: 13, color: Theme.colors.text }}>{name}</Text>
                    </View>
                    <View style={{ backgroundColor: Theme.colors.success + '22', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.success }}>{count}x</Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}

          {isDesktop && (
            <View style={styles.chartCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
                <View>
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 16, color: Theme.colors.text }}>Aperçu des Ventes</Text>
                  <Text style={{ fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, marginTop: 4 }}>Derniers 7 jours (Real-time)</Text>
                </View>
                <Text style={{ fontFamily: Theme.fonts.title, fontSize: 24, color: Theme.colors.success }}>{last7Days.reduce((a,b)=>a+b.value, 0).toFixed(0)} CHF</Text>
              </View>

              <View style={styles.fakeChart}>
                 <View style={styles.chartGridLines}>
                   <View style={styles.chartGridLine} />
                   <View style={styles.chartGridLine} />
                   <View style={styles.chartGridLine} />
                 </View>
                 {last7Days.map((day, i) => (
                   <View key={i} style={styles.chartBarWrapper}>
                     <View style={[styles.chartBar, { height: `${(day.value / maxDayRevenue) * 100}%` }]} />
                     <Text style={styles.chartLabel}>{day.label}</Text>
                   </View>
                 ))}
              </View>
            </View>
          )}
        </View>

        {/* RIGHT SIDEBAR ON DESKTOP */}
        <View style={{ flex: isDesktop ? 1 : 1, marginTop: isDesktop ? 0 : 20 }}>
          <View style={styles.recentActivityCard}>
            <Text style={styles.sectionHeader}>ACTIVITÉ RÉCENTE</Text>
            {safeOrders.slice(0, 5).map(o => (
              <View key={o.id} style={styles.activityRow}>
                <View style={styles.activityDotWrapper}>
                  <View style={styles.activityDot} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>Commande <Text style={{color: Theme.colors.success}}>#{o.id}</Text></Text>
                  <Text style={styles.activityDesc}>{o.customerName || 'Client'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.activityAmount}>{Number(o.total || 0).toFixed(2)} CHF</Text>
                  <Text style={{ fontFamily: Theme.fonts.body, fontSize: 10, color: Theme.colors.textSecondary, marginTop: 4 }}>{STATUS_LABELS[o.status] || o.status}</Text>
                </View>
              </View>
            ))}
            {safeOrders.length === 0 && (
               <View style={{ alignItems: 'center', paddingVertical: 40, opacity: 0.5 }}>
                 <Ionicons name="notifications-off-outline" size={32} color={Theme.colors.textSecondary} />
                 <Text style={[styles.activityTitle, { marginTop: 12 }]}>Aucune activité</Text>
               </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Ionicons name="trending-up" size={16} color={Theme.colors.textSecondary} style={{ opacity: 0.3 }} />
      </View>
      <Text style={[styles.statValue, { color: Theme.colors.text }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────
// ORDER CANCELLATION MODAL (With Reason & Push Notification)
// ──────────────────────────────────────────────
function OrderCancelModal({
  order,
  visible,
  onClose,
  onConfirmCancel,
}: {
  order: any;
  visible: boolean;
  onClose: () => void;
  onConfirmCancel: (orderId: string, reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setReason('');
      setIsSubmitting(false);
    }
  }, [visible]);

  if (!visible || !order) return null;

  const PRESETS = [
    'Rupture de stock sur un ingrédient',
    'Fermeture exceptionnelle du restaurant',
    'Trop de commandes en cuisine',
    'Adresse hors de notre zone de livraison',
    'Client injoignable',
  ];

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmCancel(order.id, reason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { width: '92%', maxWidth: 520, padding: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.colors.danger + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="alert-circle" size={26} color={Theme.colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: Theme.fonts.title, fontSize: 18, color: Theme.colors.text }}>Annuler la commande #{order.id}</Text>
              <Text style={{ fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary }}>Client : {order.customerName} ({order.customerPhone})</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.text, marginBottom: 8, textTransform: 'uppercase' }}>
            Motifs rapides (cliquez pour sélectionner) :
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {PRESETS.map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setReason(p)}
                style={{
                  backgroundColor: reason === p ? Theme.colors.danger + '22' : Theme.colors.surface,
                  borderColor: reason === p ? Theme.colors.danger : Theme.colors.border,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontFamily: Theme.fonts.bodyMedium, fontSize: 11, color: reason === p ? Theme.colors.danger : Theme.colors.text }}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.text, marginBottom: 6, textTransform: 'uppercase' }}>
            Message transmis au client :
          </Text>
          <TextInput
            style={{
              minHeight: 80,
              textAlignVertical: 'top',
              fontSize: 13,
              fontFamily: Theme.fonts.body,
              backgroundColor: Theme.colors.background,
              borderColor: Theme.colors.border,
              borderWidth: 1,
              borderRadius: 8,
              padding: 12,
              color: Theme.colors.text,
            }}
            placeholder="Précisez la raison pour informer le client (ex: Rupture de saumon frais ce soir, veuillez nous excuser)..."
            placeholderTextColor="#999"
            multiline
            value={reason}
            onChangeText={setReason}
          />

          <View style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 14, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Ionicons name="notifications-outline" size={18} color="#0284c7" />
            <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: '#0369a1', flex: 1, lineHeight: 16 }}>
              Le client recevra instantanément une notification push et verra ce motif sur son écran de suivi de commande.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border }}
            >
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text }}>Conserver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isSubmitting}
              style={{
                backgroundColor: Theme.colors.danger,
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={16} color="#fff" />
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: '#fff' }}>Confirmer l'annulation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────
// TAB: ORDERS
// ──────────────────────────────────
function OrdersTab() {
  const { orders, updateOrderStatus, cancelOrder, markAsPaid } = useCartStore();
  const [filter, setFilter] = useState<'active' | 'history'>('active');
  const [cancellingOrder, setCancellingOrder] = useState<any>(null);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const active  = orders.filter(o => !['delivered','cancelled'].includes(o.status));
  const history = orders.filter(o => ['delivered','cancelled'].includes(o.status));
  const displayed = filter === 'active' ? active : history;

  const handleAdvance = (orderId: string, status: string) => {
    const next = NEXT_STATUS[status];
    if (next) updateOrderStatus(orderId, next as any);
  };

  const handlePay = (orderId: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const method = window.confirm('Paiement par Carte / Twint ?\n\nOK = Carte/Twint\nAnnuler = Espèces')
        ? 'Carte' : 'Espèces';
      markAsPaid(orderId, method);
    } else {
      Alert.alert('Encaisser', 'Sélectionnez la méthode de paiement', [
        { text: 'Espèces', onPress: () => markAsPaid(orderId, 'Espèces') },
        { text: 'Carte / Twint', onPress: () => markAsPaid(orderId, 'Carte') },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  // Sort by most recent first
  const sortedDisplayed = [...displayed].sort((a, b) => {
    const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return tb.getTime() - ta.getTime();
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterBtn, filter === 'active' && styles.filterBtnActive]} onPress={() => setFilter('active')}>
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>Actives ({active.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, filter === 'history' && styles.filterBtnActive]} onPress={() => setFilter('history')}>
          <Text style={[styles.filterText, filter === 'history' && styles.filterTextActive]}>Historique ({history.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {displayed.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucune commande</Text>
          </View>
        )}

        {/* WEB DESKTOP TABLE */}
        {isDesktop && displayed.length > 0 && (
          <View style={styles.dataTableWrapper}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 0.5 }]}>ID</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>CLIENT</Text>
              <Text style={[styles.th, { flex: 1 }]}>TYPE</Text>
              <Text style={[styles.th, { flex: 2 }]}>CONTENU</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>TOTAL / STATUT</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>ACTIONS</Text>
            </View>
            {sortedDisplayed.map(order => (
              <View key={order.id} style={styles.tableRow}>
                <View style={{ flex: 0.5 }}>
                  <Text style={styles.tdId}>#{order.id}</Text>
                  {order.requestedTime && order.requestedTime !== 'ASAP' ? (
                    <Text style={[styles.tdTime, { color: Theme.colors.primary, fontWeight: 'bold' }]}>POUR : {order.requestedTime}</Text>
                  ) : (
                    <Text style={styles.tdTime}>ASAP (~{order.estimatedTime}m)</Text>
                  )}
                  {(() => {
                    const t = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || 0);
                    const mins = Math.floor((Date.now() - t.getTime()) / 60000);
                    return <Text style={[styles.tdTime, { color: mins > 20 ? Theme.colors.danger : Theme.colors.textSecondary }]}>⏱ {mins}m</Text>;
                  })()}
                </View>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.tdTitle}>{order.customerName}</Text>
                  <Text style={styles.tdSub}>{order.customerPhone}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tdTitle}>{order.deliveryType === 'delivery' ? '🛵 Livr.' : '🥡 Emp.'}</Text>
                  {order.deliveryType === 'delivery' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Text style={[styles.tdSub, { flex: 1 }]}>{order.customerAddress}</Text>
                      <TouchableOpacity 
                        onPress={() => {
                          const cleanAddress = encodeURIComponent(order.customerAddress);
                          const url = Platform.select({
                            ios: `maps://app?daddr=${cleanAddress}`,
                            android: `google.navigation:q=${cleanAddress}`,
                            default: `https://www.google.com/maps/dir/?api=1&destination=${cleanAddress}`,
                          });
                          Linking.openURL(url || `https://www.google.com/maps/dir/?api=1&destination=${cleanAddress}`);
                        }} 
                        style={{ backgroundColor: '#0284c722', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}
                      >
                        <Text style={{ fontSize: 10, fontFamily: Theme.fonts.bodyBold, color: '#0284c7' }}>🧭 GPS</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={[styles.tdSub, { marginTop: 4, fontFamily: Theme.fonts.bodyBold, color: '#000' }]}>
                    {order.paymentMethod === 'card' ? '💳 Carte' : '💵 Cash'}
                  </Text>
                </View>
                <View style={{ flex: 2 }}>
                  {(order.items || []).map((i, idx) => (
                    <View key={idx} style={{ marginBottom: 4 }}>
                      <Text style={styles.tdSub}>{i.quantity}× {i.name}</Text>
                      {i.selectedOptions && (() => {
                        const { food, extras } = splitOptions(i.selectedOptions);
                        return (
                          <>
                            {food.map((f, idx) => (
                              <Text key={`f-${idx}`} style={[styles.tdSub, { fontSize: 10, color: Theme.colors.success }]}>
                                ↳ <Text style={{fontWeight: 'bold'}}>{f.sec}:</Text> {f.choices.join(', ')}
                              </Text>
                            ))}
                            {extras.map((e, idx) => (
                              <View key={`e-${idx}`} style={{ marginTop: 4, backgroundColor: '#eee', padding: 4, borderRadius: 4, alignSelf: 'flex-start' }}>
                                <Text style={[styles.tdSub, { fontSize: 12, fontWeight: 'bold', color: '#000' }]}>
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
                <View style={{ flex: 1.5 }}>
                   <Text style={[styles.tdTitle, { color: Theme.colors.success }]}>{Number(order.total || 0).toFixed(2)} CHF</Text>
                   <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[order.status] + '22', borderColor: STATUS_COLORS[order.status], alignSelf: 'flex-start', marginTop: 4 }]}>
                     <Text style={[styles.statusPillText, { color: STATUS_COLORS[order.status] }]}>{STATUS_LABELS[order.status]}</Text>
                   </View>
                </View>
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/receipt', params: { id: order.id } })} style={styles.iconCircleBtn}>
                      <Ionicons name="receipt-outline" size={16} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>
                    {filter === 'active' && !order.isPaid && (
                      <TouchableOpacity onPress={() => handlePay(order.id)} style={[styles.iconCircleBtn, { borderColor: '#f59e0b' }]}>
                        <Ionicons name="card-outline" size={16} color="#f59e0b" />
                      </TouchableOpacity>
                    )}
                    {filter === 'active' && NEXT_STATUS[order.status] && (
                      <TouchableOpacity onPress={() => handleAdvance(order.id, order.status)} style={[styles.iconCircleBtn, { borderColor: Theme.colors.success }]}>
                        <Ionicons name="checkmark-outline" size={16} color={Theme.colors.success} />
                      </TouchableOpacity>
                    )}
                    {filter === 'active' && (
                      <TouchableOpacity onPress={() => setCancellingOrder(order)} style={[styles.iconCircleBtn, { borderColor: Theme.colors.danger }]}>
                        <Ionicons name="close" size={16} color={Theme.colors.danger} />
                      </TouchableOpacity>
                    )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* MOBILE CARDS */}
        {!isDesktop && sortedDisplayed.map(order => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderCardRow}>
              <Text style={styles.orderId}>#{order.id}</Text>
              <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[order.status] + '22', borderColor: STATUS_COLORS[order.status] }]}>
                <Text style={[styles.statusPillText, { color: STATUS_COLORS[order.status] }]}>{STATUS_LABELS[order.status]}</Text>
              </View>
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
              <View>
                <Text style={styles.orderCustomer}>{order.customerName}</Text>
                <Text style={[styles.orderMeta, {marginBottom: 2}]}>
                  {order.deliveryType === 'delivery' ? `🛵  📍 ${order.customerAddress}` : '🥡 À emporter'}
                </Text>
                <Text style={[styles.orderMeta, {marginBottom: 0, fontFamily: Theme.fonts.bodyBold, color: '#000'}]}>
                  {order.paymentMethod === 'card' ? '💳 Paiement: Carte' : '💵 Paiement: Cash'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.customerPhone}`)} style={styles.callBtnLg}>
                <Ionicons name="call" size={16} color="#000" />
                <Text style={styles.callBtnText}>{order.customerPhone}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12 }}>
              {(order.items || []).map((i, idx) => (
                <View key={idx} style={{ marginBottom: 4 }}>
                  <Text style={styles.orderItemsList}>{i.quantity}× {i.name}</Text>
                  {i.selectedOptions && (() => {
                    const { food, extras } = splitOptions(i.selectedOptions);
                    return (
                      <>
                        {food.map((f, idx) => (
                          <Text key={`f-${idx}`} style={[styles.orderItemsList, { fontSize: 11, color: Theme.colors.success, marginLeft: 16 }]}>
                            ↳ <Text style={{fontWeight: 'bold'}}>{f.sec}:</Text> {f.choices.join(', ')}
                          </Text>
                        ))}
                        {extras.map((e, idx) => (
                          <View key={`e-${idx}`} style={{ marginLeft: 16, marginTop: 4, backgroundColor: '#eee', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' }}>
                            <Text style={[styles.orderItemsList, { fontSize: 12, fontWeight: 'bold', color: '#000' }]}>
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

            {order.note && <Text style={styles.orderNote}>📝 {order.note}</Text>}

            <View style={styles.orderCardFooter}>
              <View>
                <Text style={styles.orderTotal}>{Number(order.total || 0).toFixed(2)} CHF</Text>
                {order.requestedTime && order.requestedTime !== 'ASAP' ? (
                  <Text style={[styles.orderTime, { color: Theme.colors.primary, fontWeight: 'bold' }]}>POUR : {order.requestedTime}</Text>
                ) : (
                  <Text style={styles.orderTime}>ASAP (~{order.estimatedTime} min)</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => router.push({ pathname: '/receipt', params: { id: order.id } })} style={styles.receiptIconBtn}>
                <Ionicons name="receipt-outline" size={20} color={Theme.colors.textSecondary} />
                <Text style={styles.receiptIconText}>{order.isPaid ? 'Ticket' : 'B. Cde'}</Text>
              </TouchableOpacity>
            </View>

            {filter === 'active' && (
              <View style={styles.orderActions}>
                {NEXT_STATUS[order.status] && (
                  <TouchableOpacity style={styles.advanceBtn} onPress={() => handleAdvance(order.id, order.status)}>
                    <Text style={styles.advanceBtnText}>→ {STATUS_LABELS[NEXT_STATUS[order.status]!]}</Text>
                  </TouchableOpacity>
                )}
                {!order.isPaid && (
                  <TouchableOpacity style={styles.payBtn} onPress={() => handlePay(order.id)}>
                    <Ionicons name="card-outline" size={16} color="#000" />
                    <Text style={styles.payBtnText}>Encaisser</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.cancelOrderBtn} onPress={() => setCancellingOrder(order)}>
                  <Ionicons name="close" size={16} color={Theme.colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* CANCELLATION MODAL */}
      <OrderCancelModal
        order={cancellingOrder}
        visible={!!cancellingOrder}
        onClose={() => setCancellingOrder(null)}
        onConfirmCancel={async (id, reason) => {
          await cancelOrder(id, reason);
        }}
      />
    </View>
  );
}

// ──────────────────────────────────
// TAB: VUE CUISINE (KDS - Kitchen Display System)
// ──────────────────────────────────
function KitchenTab() {
  const { orders, updateOrderStatus, cancelOrder } = useCartStore();
  const [cancellingOrder, setCancellingOrder] = useState<any>(null);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Tabs for mobile Kitchen View
  const [activeKTab, setActiveKTab] = useState<'pending' | 'preparing' | 'ready'>('pending');
  
  // Filter active orders (not delivered or cancelled)
  const activeOrders = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));

  const pending = activeOrders.filter(o => o.status === 'pending' || o.status === 'confirmed');
  const preparing = activeOrders.filter(o => o.status === 'preparing');
  const ready = activeOrders.filter(o => o.status === 'ready');

  const getOrderAction = (order: any) => {
    switch (order.status) {
      case 'pending':
        return { nextStatus: 'confirmed', label: 'ACCEPTER COMMANDE', color: '#FF9800' };
      case 'confirmed':
        return { nextStatus: 'preparing', label: '👨‍🍳 ENVOYER EN CUISINE', color: '#2196F3' };
      case 'preparing':
        return { nextStatus: 'ready', label: '✅ PRÊT À SERVIR', color: Theme.colors.success };
      case 'ready':
        return { 
          nextStatus: 'delivered', 
          label: order.deliveryType === 'delivery' ? '🛵 CONFIRMER LIVRÉ' : '🛍️ REMIS AU CLIENT', 
          color: Theme.colors.success 
        };
      default:
        return null;
    }
  };

  const KanbanColumn = ({ title, data, color }: { title: string, data: any[], color: string }) => (
    <View style={[styles.kanbanCol, !isDesktop && { flex: 1, borderWidth: 0 }]}>
      <View style={[styles.kanbanHeader, { borderBottomColor: color }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
           <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
           <Text style={styles.kanbanTitle}>{title}</Text>
        </View>
        <View style={[styles.kanbanCount, { backgroundColor: color + '22' }]}><Text style={[styles.kanbanCountText, { color }]}>{data.length}</Text></View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 10, paddingBottom: 100 }}>
        {data.map(o => {
           const minsElapsed = Math.floor((Date.now() - new Date(o.createdAt || new Date()).getTime()) / 60000);
           const isLate = minsElapsed > 15 && o.status !== 'ready';
           const action = getOrderAction(o);
           return (
             <View key={o.id} style={[styles.kTicket, isLate && { borderColor: Theme.colors.danger, borderWidth: 2 }]}>
               {/* Header Ticket */}
               <View style={styles.kTop}>
                 <View>
                   <Text style={styles.kId}>N° {o.id}</Text>
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                     <Text style={styles.kTime}>{new Date(o.createdAt || new Date()).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}</Text>
                     <View style={{ backgroundColor: isLate ? Theme.colors.danger : Theme.colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                       <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 10, color: isLate ? '#fff' : Theme.colors.textSecondary }}>{minsElapsed} min</Text>
                     </View>
                   </View>
                   {o.requestedTime && o.requestedTime !== 'ASAP' && (
                     <View style={{ marginTop: 4, backgroundColor: Theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' }}>
                       <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 10, color: '#fff' }}>POUR : {o.requestedTime}</Text>
                     </View>
                   )}
                 </View>
                 <View style={[styles.kTypeBadge, { backgroundColor: o.deliveryType === 'delivery' ? '#007AFF22' : '#FF950022' }]}>
                   <Text style={[styles.kTypeText, { color: o.deliveryType === 'delivery' ? '#007AFF' : '#FF9500' }]}>
                     {o.deliveryType === 'delivery' ? 'LIVRAISON' : 'À EMPORTER'}
                   </Text>
                 </View>
               </View>

               <View style={styles.kDivider} />

             {/* Items */}
             <View style={styles.kItems}>
               {o.items.map((it: any, i: number) => (
                 <View key={i} style={{ marginBottom: 6 }}>
                   <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.kItem}><Text style={styles.kItemQty}>{it.quantity}x</Text> {it.name}</Text>
                   </View>
                    {it.note && <Text style={styles.kItemNote}>↳ {it.note}</Text>}
                    {it.selectedOptions && (() => {
                      const { food, extras } = splitOptions(it.selectedOptions);
                      return (
                        <>
                          {food.map((f, idx) => (
                            <Text key={`f-${idx}`} style={[styles.kItemNote, { color: Theme.colors.success }]}>
                              ↳ <Text style={{fontWeight: 'bold'}}>{f.sec}:</Text> {f.choices.join(', ')}
                            </Text>
                          ))}
                          {extras.map((e, idx) => (
                            <View key={`e-${idx}`} style={{ marginTop: 4, backgroundColor: '#eee', padding: 6, borderRadius: 4, borderWidth: 1, borderColor: '#ccc' }}>
                              <Text style={[styles.kItemNote, { color: '#000', fontWeight: 'bold', fontSize: 13 }]}>
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

             {/* Global Order Note */}
             {o.note ? (
               <View style={styles.kNoteContainer}>
                 <Text style={styles.kNoteLabel}>MESSAGE CLIENT :</Text>
                 <Text style={styles.kNoteText}>{o.note}</Text>
               </View>
             ) : null}

             {/* Customer Minimal Info */}
             <View style={{ marginTop: 12, padding: 8, backgroundColor: Theme.colors.background, borderRadius: 8 }}>
                <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.text }}>{o.customerName}</Text>
                {o.deliveryType === 'delivery' && <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary }}>{o.customerAddress}</Text>}
                <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: '#000', marginTop: 2 }}>
                  {o.paymentMethod === 'card' ? '💳 Carte' : '💵 Cash'}
                </Text>
             </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {action && (
                   <TouchableOpacity 
                     onPress={() => updateOrderStatus(o.id, action.nextStatus as any)} 
                     style={[styles.kBtn, { backgroundColor: action.color, flex: 1, marginTop: 0 }]}
                     activeOpacity={0.8}
                   >
                     <Text style={styles.kBtnText}>{action.label}</Text>
                     <Ionicons name="arrow-forward" size={16} color="#fff" />
                   </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setCancellingOrder(o)}
                  style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.danger + '44', backgroundColor: Theme.colors.danger + '11', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close-circle-outline" size={20} color={Theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
            );
        })}
        {data.length === 0 && (
           <View style={{ alignItems: 'center', marginTop: 100, opacity: 0.3 }}>
             <Ionicons name="restaurant-outline" size={48} color={Theme.colors.textSecondary} />
             <Text style={{ fontFamily: Theme.fonts.bodyMedium, marginTop: 16 }}>Aucune commande</Text>
           </View>
        )}
      </ScrollView>
    </View>
  );

  if (!isDesktop) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', backgroundColor: Theme.colors.background, borderBottomWidth: 1, borderBottomColor: Theme.colors.border }}>
           <TouchableOpacity 
             style={[{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' }, activeKTab === 'pending' && { borderBottomColor: Theme.colors.danger }]} 
             onPress={() => setActiveKTab('pending')}
           >
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: activeKTab === 'pending' ? Theme.colors.danger : Theme.colors.textSecondary }}>À VALIDER ({pending.length})</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={[{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' }, activeKTab === 'preparing' && { borderBottomColor: Theme.colors.primary }]} 
             onPress={() => setActiveKTab('preparing')}
           >
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: activeKTab === 'preparing' ? Theme.colors.primary : Theme.colors.textSecondary }}>CUISINE ({preparing.length})</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={[{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' }, activeKTab === 'ready' && { borderBottomColor: Theme.colors.success }]} 
             onPress={() => setActiveKTab('ready')}
           >
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: activeKTab === 'ready' ? Theme.colors.success : Theme.colors.textSecondary }}>EXPÉDITION ({ready.length})</Text>
           </TouchableOpacity>
        </View>
        
        {activeKTab === 'pending' && (
          <KanbanColumn 
            title="À CONFIRMER" 
            data={pending} 
            color={Theme.colors.danger} 
          />
        )}
        {activeKTab === 'preparing' && (
          <KanbanColumn 
            title="EN CUISINE" 
            data={preparing} 
            color={Theme.colors.primary} 
          />
        )}
        {activeKTab === 'ready' && (
          <KanbanColumn 
            title="EXPÉDITION" 
            data={ready} 
            color={Theme.colors.success} 
          />
        )}

        <OrderCancelModal
          order={cancellingOrder}
          visible={!!cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onConfirmCancel={async (id, reason) => {
            await cancelOrder(id, reason);
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.kanbanBoard}>
        <KanbanColumn 
          title="À CONFIRMER" 
          data={pending} 
          color={Theme.colors.danger} 
        />
        <KanbanColumn 
          title="EN CUISINE" 
          data={preparing} 
          color={Theme.colors.primary} 
        />
        <KanbanColumn 
          title="PRÊT / EN ROUTE" 
          data={ready} 
          color={Theme.colors.success} 
        />
      </View>

      <OrderCancelModal
        order={cancellingOrder}
        visible={!!cancellingOrder}
        onClose={() => setCancellingOrder(null)}
        onConfirmCancel={async (id, reason) => {
          await cancelOrder(id, reason);
        }}
      />
    </View>
  );
}

// ──────────────────────────────────
// TAB: CLIENTS (CRM)
// ──────────────────────────────────
function CrmTab() {
  const { orders } = useCartStore();
  const [promoText, setPromoText] = useState('');
  const [isSendingPromo, setIsSendingPromo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Basic aggregation logic for CRM from orders history
  const uniqueNames = Array.from(new Set(orders.map(o => o.customerName)));
  
  const crmData = uniqueNames.map((name: string) => {
    const allUserOrders = orders.filter(o => o.customerName === name);
    const userOrders = allUserOrders.filter(o => o.status !== 'cancelled');
    const spent = userOrders.reduce((acc, curr) => acc + curr.total, 0);
    const phone = allUserOrders.length > 0 ? allUserOrders[0].customerPhone : '-';
    const ordersWithAddress = userOrders.filter(o => o.customerAddress && o.customerAddress.trim().length > 0);
    const address = ordersWithAddress.length > 0 ? ordersWithAddress[0].customerAddress : '';
    const loyaltyPoints = userOrders.length;
    const isVIP = userOrders.length >= 5 || spent >= 100;
    // Last order date
    const sortedOrders = [...allUserOrders].sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return tb.getTime() - ta.getTime();
    });
    const lastOrderDate = sortedOrders.length > 0 ? (sortedOrders[0].createdAt?.toDate ? sortedOrders[0].createdAt.toDate() : new Date(sortedOrders[0].createdAt || 0)) : null;
    return { name, phone, address, orderCount: userOrders.length, totalSpent: spent, loyaltyPoints, orders: sortedOrders, isVIP, lastOrderDate };
  }).filter(c => c.orderCount > 0).sort((a: any, b: any) => b.totalSpent - a.totalSpent);

  const [crmFilter, setCrmFilter] = useState<'tous' | 'vip' | 'recent'>('tous');

  const filteredCrmData = crmData.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      client.phone.includes(searchQuery);
    const matchesFilter = 
      crmFilter === 'tous' ? true :
      crmFilter === 'vip' ? client.isVIP :
      crmFilter === 'recent' ? (client.lastOrderDate && (Date.now() - client.lastOrderDate.getTime()) < 7 * 86400000) :
      true;
    return matchesSearch && matchesFilter;
  });

  const [clientNotes, setClientNotes] = useState<Record<string,string>>({});

  const saveNote = async (clientName: string, note: string) => {
    const key = `crm_note_${clientName.replace(/\s+/g,'_')}`;
    setClientNotes(prev => ({ ...prev, [clientName]: note }));
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'crm_notes', key), { name: clientName, note, updatedAt: new Date().toISOString() }, { merge: true });
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert('Note sauvegardée !');
      else Alert.alert('Succès', 'Note sauvegardée !');
    } catch(e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    const loadNotes = async () => {
      try {
        const { getDocs, collection: col } = await import('firebase/firestore');
        const snap = await getDocs(col(db, 'crm_notes'));
        const notes: Record<string,string> = {};
        snap.forEach(d => { notes[d.data().name] = d.data().note; });
        setClientNotes(notes);
      } catch(e) { console.error(e); }
    };
    loadNotes();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* MARKETING CAMPAIGN */}
      <Text style={styles.sectionHeader}>CAMPAGNE MARKETING (PUSH)</Text>
      <View style={{ backgroundColor: Theme.colors.primary + '11', padding: 20, borderRadius: 16, marginBottom: 32, borderWidth: 1, borderColor: Theme.colors.primary + '44' }}>
        <Text style={{ fontFamily: Theme.fonts.bodyBold, color: Theme.colors.text, fontSize: 16, marginBottom: 8 }}>
          Envoyer une notification Push à tous les clients
        </Text>
        <Text style={{ fontFamily: Theme.fonts.body, color: Theme.colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
          Prévenez instantanément vos {crmData.length} clients d'une promotion ou d'une nouveauté par notification push.
        </Text>
        <TextInput
          style={{ backgroundColor: Theme.colors.surface, borderRadius: 8, padding: 16, fontFamily: Theme.fonts.body, fontSize: 15, color: Theme.colors.text, minHeight: 80, borderColor: Theme.colors.border, borderWidth: 1, marginBottom: 16 }}
          placeholder="Ex: 🎁 1 Poké acheté = 1 Boisson offerte ce soir chez Pokémoons !"
          placeholderTextColor="#999"
          multiline
          value={promoText}
          onChangeText={setPromoText}
        />
        <TouchableOpacity 
          style={[{ backgroundColor: Theme.colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' }, (isSendingPromo || !promoText) && { opacity: 0.5 }]}
          disabled={isSendingPromo || !promoText}
          onPress={async () => {
            if (!promoText) return;
            setIsSendingPromo(true);
            try {
              // Récupère tous les utilisateurs qui pourraient avoir activé 'notifPromos'
              const usersQuery = query(collection(db, 'users'));
              const snap = await getDocs(usersQuery);
              let sentCount = 0;
              snap.forEach(d => {
                const userData = d.data();
                if (userData.pushToken && userData.notifPromos) {
                  sendPushNotification(userData.pushToken, "🎁 Nouvelle Offre !", promoText, { type: 'promo' });
                  sentCount++;
                }
              });
              Alert.alert('Campagne envoyée ✅', `Votre notification a été envoyée à ${sentCount} client(s) ayant activé les offres.`);
              setPromoText('');
            } catch (e) {
              console.warn(e);
              Alert.alert('Erreur', "Echec de l'envoi");
            } finally {
              setIsSendingPromo(false);
            }
          }}
        >
          {isSendingPromo ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#fff', fontSize: 15 }}>ENVOYER AUX CLIENTS (OPTE-IN)</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([['tous', 'Tous'], ['vip', '⭐ VIP'], ['recent', '🕐 7 derniers jours']] as [string, string][]).map(([key, label]) => (
            <TouchableOpacity key={key} onPress={() => setCrmFilter(key as any)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: crmFilter === key ? Theme.colors.text : Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border }}>
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: crmFilter === key ? Theme.colors.background : Theme.colors.text }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput 
          style={{ backgroundColor: Theme.colors.surface, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: Theme.colors.border, width: 200, fontFamily: Theme.fonts.body, fontSize: 13 }}
          placeholder="Rechercher..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.dataTableWrapper}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, { flex: 2 }]}>CLIENT</Text>
          <Text style={[styles.th, { flex: 2 }]}>CONTACT</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'center', fontSize: 10 }]}>PTS</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'right', fontSize: 10 }]}>C.A.</Text>
        </View>
        
        {filteredCrmData.map((client: any, i: number) => (
          <TouchableOpacity 
            key={client.name} 
            style={[styles.tableRow, { backgroundColor: i === 0 && !searchQuery ? Theme.colors.success + '1A' : 'transparent' }]}
            onPress={() => setSelectedClient(client)}
          >
            <View style={{ flex: 2 }}>
              <Text style={styles.tdTitle}>{client.name} {i === 0 && !searchQuery && '👑'}</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.tdTitle}>{client.phone || '-'}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={[styles.statusPill, { backgroundColor: Theme.colors.surface, borderColor: Theme.colors.border }]}>
                 <Text style={[styles.statusPillText, { color: Theme.colors.primary }]}>{client.loyaltyPoints} pts</Text>
              </View>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.tdTitle, { color: Theme.colors.success, fontFamily: Theme.fonts.logo }]}>
                {client.totalSpent.toFixed(2)} CHF
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        {filteredCrmData.length === 0 && (
          <Text style={{ textAlign: 'center', padding: 20, fontFamily: Theme.fonts.body, color: Theme.colors.textSecondary }}>Aucun client trouvé.</Text>
        )}
      </View>

      {/* CLIENT MODAL */}
      <Modal visible={!!selectedClient} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { width: '90%', maxWidth: 500, padding: 0, overflow: 'hidden' }]}>
            {selectedClient && (
              <>
                <View style={{ padding: 20, backgroundColor: Theme.colors.surface, borderBottomWidth: 1, borderColor: Theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: Theme.fonts.title, fontSize: 22, color: Theme.colors.text }}>{selectedClient.name}</Text>
                      {selectedClient.isVIP && <View style={{ backgroundColor: '#FFD70033', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: '#c9a800' }}>⭐ VIP</Text></View>}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Text style={{ fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.textSecondary }}>{selectedClient.phone}</Text>
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${selectedClient.phone}`)} style={{ backgroundColor: Theme.colors.success + '22', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.success }}>📞 Appeler</Text>
                      </TouchableOpacity>
                    </View>
                    {selectedClient.address ? (
                      <Text style={{ fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, marginTop: 4 }}>
                        📍 {selectedClient.address}
                      </Text>
                    ) : null}
                    {selectedClient.lastOrderDate && <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary, marginTop: 4 }}>
                      Dernière commande: {selectedClient.lastOrderDate.toLocaleDateString('fr-CH')}
                    </Text>}
                  </View>
                  <TouchableOpacity onPress={() => setSelectedClient(null)}>
                    <Ionicons name="close" size={24} color={Theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <View style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                    <View style={{ flex: 1, backgroundColor: Theme.colors.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border }}>
                      <Text style={{ fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, textTransform: 'uppercase' }}>Commandes</Text>
                      <Text style={{ fontFamily: Theme.fonts.title, fontSize: 20, color: Theme.colors.text }}>{selectedClient.orderCount}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: Theme.colors.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border }}>
                      <Text style={{ fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, textTransform: 'uppercase' }}>C.A. Total</Text>
                      <Text style={{ fontFamily: Theme.fonts.title, fontSize: 20, color: Theme.colors.success }}>{selectedClient.totalSpent.toFixed(2)} CHF</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: Theme.colors.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border }}>
                      <Text style={{ fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, textTransform: 'uppercase' }}>Fidélité</Text>
                      <Text style={{ fontFamily: Theme.fonts.title, fontSize: 20, color: Theme.colors.primary }}>{selectedClient.loyaltyPoints} pts</Text>
                    </View>
                  </View>

                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 14, marginBottom: 10, color: Theme.colors.text }}>DERNIÈRES COMMANDES</Text>
                  <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                    {selectedClient.orders.map((o: any) => (
                      <View key={o.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: Theme.colors.border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text }}>{new Date(o.createdAt).toLocaleDateString('fr-CH')} à {new Date(o.createdAt).toLocaleTimeString('fr-CH', {hour: '2-digit', minute:'2-digit'})}</Text>
                          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text }}>{o.total.toFixed(2)} CHF</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary }}>{o.items?.length || 0} article(s) • {o.deliveryType === 'delivery' ? 'Livraison' : 'Emporter'}</Text>
                          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: o.status === 'cancelled' ? Theme.colors.danger : (o.isPaid ? Theme.colors.success : '#f59e0b') }}>
                            {o.status === 'cancelled' ? 'Annulée' : (o.isPaid ? 'Payé' : 'Non payé')} ({o.paymentMethod || '?'})
                          </Text>
                        </View>
                        {o.items?.map((item: any, i: number) => (
                           <Text key={i} style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary, marginBottom: 2 }}>
                             - {item.quantity}x {item.product?.name || 'Produit'}
                           </Text>
                        ))}
                      </View>
                    ))}
                  </ScrollView>

                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 14, marginTop: 20, marginBottom: 10, color: Theme.colors.text }}>NOTES INTERNES</Text>
                  <TextInput 
                    style={{ backgroundColor: Theme.colors.background, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: Theme.colors.border, fontFamily: Theme.fonts.body, fontSize: 13, minHeight: 80 }}
                    placeholder="Ajouter une note sur ce client (ex: Allergie arachide)..."
                    placeholderTextColor="#999"
                    multiline
                    value={clientNotes[selectedClient.name] || ''}
                    onChangeText={(t) => setClientNotes(prev => ({ ...prev, [selectedClient.name]: t }))}
                  />
                  
                  <TouchableOpacity
                    style={{ backgroundColor: Theme.colors.success, padding: 14, borderRadius: 100, alignItems: 'center', marginTop: 20 }}
                    onPress={() => saveNote(selectedClient.name, clientNotes[selectedClient.name] || '')}
                  >
                    <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#000', fontSize: 14 }}>SAUVEGARDER LA FICHE</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

// ──────────────────────────────────
// TAB: ACCOUNTING (Comptabilité)
// ──────────────────────────────────
function AccountingTab() {
  const { orders } = useCartStore();
  const { settings } = useRestaurantStore();
  
  // Custom Date Range
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

  const formatFrenchDate = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const parseFrenchDate = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateStr); // fallback if not DD/MM/YYYY
  };

  const [startDate, setStartDate] = useState(formatFrenchDate(firstDay));
  const [endDate, setEndDate] = useState(formatFrenchDate(now));

  const filteredOrders = orders.filter(o => {
    if (o.status === 'cancelled') return false;
    const orderDate = new Date(o.createdAt);
    orderDate.setHours(0,0,0,0);
    
    const start = parseFrenchDate(startDate);
    start.setHours(0,0,0,0);
    const end = parseFrenchDate(endDate);
    end.setHours(23,59,59,999);
    
    return orderDate >= start && orderDate <= end;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalVAT = filteredOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
  const totalHT = totalRevenue - totalVAT;

  const exportPDF = async () => {
    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            
            body { 
              font-family: 'Inter', 'Helvetica', sans-serif; 
              padding: 0; 
              margin: 0;
              color: #1a1a1a; 
              background: #fff;
            }
            .page {
              padding: 50px;
              max-width: 800px;
              margin: auto;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #000;
              padding-bottom: 30px;
              margin-bottom: 40px;
            }
            .logo-section h1 {
              font-size: 28px;
              letter-spacing: 5px;
              margin: 0;
              font-weight: 800;
            }
            .logo-section span {
              color: #D4AF37;
              font-size: 12px;
              letter-spacing: 10px;
              display: block;
              margin-top: -5px;
            }
            .establishment-info {
              text-align: right;
              font-size: 11px;
              line-height: 1.6;
              color: #4b5563;
            }
            .report-title {
              margin-bottom: 30px;
            }
            .report-title h2 {
              font-size: 22px;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .report-title .date-range {
              font-size: 14px;
              color: #6b7280;
              margin-top: 5px;
            }
            
            .summary-cards {
              display: flex;
              gap: 20px;
              margin-bottom: 40px;
            }
            .summary-card {
              flex: 1;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              padding: 15px;
              border-radius: 8px;
            }
            .summary-card .label {
              font-size: 10px;
              text-transform: uppercase;
              color: #6b7280;
              margin-bottom: 5px;
              font-weight: 600;
            }
            .summary-card .value {
              font-size: 18px;
              font-weight: 700;
              color: #111827;
            }
            .summary-card.highlight {
              background: #111827;
              border-color: #111827;
            }
            .summary-card.highlight .label { color: #9ca3af; }
            .summary-card.highlight .value { color: #fff; }

            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px; 
            }
            th { 
              background-color: #f3f4f6; 
              color: #374151;
              font-weight: 700; 
              border-bottom: 2px solid #e5e7eb; 
              padding: 12px 10px; 
              text-align: left; 
              font-size: 10px; 
              text-transform: uppercase; 
            }
            td { 
              border-bottom: 1px solid #f3f4f6; 
              padding: 12px 10px; 
              text-align: left; 
              font-size: 11px; 
            }
            .amount { text-align: right; font-family: monospace; }
            
            .footer {
              margin-top: 60px;
              text-align: center;
              font-size: 9px;
              color: #9ca3af;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header-container">
              <div class="logo-section">
                <h1>POKÉMOONS</h1>
                <span></span>
              </div>
              <div class="establishment-info">
                <strong>${settings.name}</strong><br>
                ${settings.address}<br>
                Suisse<br>
                ${settings.phone}<br>
                ${settings.email || ''}
              </div>
            </div>

            <div class="report-title">
              <h2>Rapport de Comptabilité</h2>
              <div class="date-range">Période : ${startDate} — ${endDate}</div>
            </div>

            <div class="summary-cards">
              <div class="summary-card">
                <div class="label">Total HT</div>
                <div class="value">${totalHT.toFixed(2)} CHF</div>
              </div>
              <div class="summary-card">
                <div class="label">Total TVA (2.6%)</div>
                <div class="value">${totalVAT.toFixed(2)} CHF</div>
              </div>
              <div class="summary-card highlight">
                <div class="label">Chiffre d'Affaires TTC</div>
                <div class="value">${totalRevenue.toFixed(2)} CHF</div>
              </div>
            </div>

            <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 10px;">Détail des transactions (${filteredOrders.length})</h3>
            <table>
              <thead>
                <tr>
                  <th style="width: 80px;">Date</th>
                  <th style="width: 80px;">Réf.</th>
                  <th>Client</th>
                  <th style="width: 100px;">Paiement</th>
                  <th class="amount" style="width: 80px;">TVA</th>
                  <th class="amount" style="width: 100px;">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                ${filteredOrders.map(o => `
                  <tr>
                    <td>${new Date(o.createdAt).toLocaleDateString('fr-CH')}</td>
                    <td><strong>#${o.id}</strong></td>
                    <td>${o.customerName}</td>
                    <td style="font-size: 9px;">${o.paymentMethod || 'Espèces'}</td>
                    <td class="amount">${(o.taxAmount || 0).toFixed(2)}</td>
                    <td class="amount" style="font-weight: bold;">${o.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              Ce rapport a été généré automatiquement par le système POKÉMOONS Workspace le ${new Date().toLocaleString('fr-CH')}.<br>
              Document à valeur comptable interne - Pokémoons Application.
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        await Print.printAsync({ html });
      }
    } catch (e) {
      console.warn(e);
      Alert.alert('Erreur', 'Impossible de générer le rapport.');
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'N° Commande', 'Client', 'Telephone', 'Type', 'Paiement', 'Articles', 'Sous-Total HT (CHF)', 'TVA (2.6%)', 'Total TTC (CHF)', 'Statut'];
    const rows = filteredOrders.map(o => {
      const itemsSummary = o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(' | ');
      const tax = (o.taxAmount || 0).toFixed(2);
      const ht = (o.total - (o.taxAmount || 0)).toFixed(2);
      const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
      return [
        d.toLocaleDateString('fr-CH'),
        `#${o.id}`,
        `"${(o.customerName || '').replace(/"/g, '""')}"`,
        `"${(o.customerPhone || '').replace(/"/g, '""')}"`,
        o.deliveryType === 'delivery' ? 'Livraison' : 'A emporter',
        o.paymentMethod || 'Carte',
        `"${itemsSummary.replace(/"/g, '""')}"`,
        ht,
        tax,
        o.total.toFixed(2),
        o.status
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ventes_pokemoons_${startDate.replace(/\//g, '-')}_${endDate.replace(/\//g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('Export CSV', 'Fichier CSV généré avec succès.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <View>
          <Text style={styles.sectionTitle}>Rapport Financier</Text>
          <Text style={{ fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary }}>
            Période du {startDate} au {endDate}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={[styles.goldBtn, { backgroundColor: '#107c41' }]} 
            onPress={exportCSV}
          >
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={[styles.goldBtnText, { marginLeft: 6, color: '#fff' }]}>Export Excel (CSV)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.goldBtn} onPress={exportPDF}>
            <Ionicons name="download-outline" size={18} color="#000" />
            <Text style={[styles.goldBtnText, { marginLeft: 6 }]}>Export PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* DATE RANGE PICKER */}
      <View style={{ backgroundColor: Theme.colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 32 }}>
        <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text, marginBottom: 12 }}>CHOISIR UNE PÉRIODE</Text>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>DATE DE DÉBUT</Text>
            <TextInput 
              style={styles.modalInput} 
              value={startDate} 
              onChangeText={setStartDate} 
              placeholder="JJ/MM/AAAA"
            />
          </View>
          <Ionicons name="arrow-forward" size={20} color={Theme.colors.textSecondary} style={{ marginTop: 20 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>DATE DE FIN</Text>
            <TextInput 
              style={styles.modalInput} 
              value={endDate} 
              onChangeText={setEndDate} 
              placeholder="JJ/MM/AAAA"
            />
          </View>
        </View>
      </View>

      {/* STATS HIGHLIGHT */}
      <View style={styles.statsGrid}>
        <StatCard label="Total Hors Taxe (HT)" value={`${totalHT.toFixed(2)}`} icon="calculator" color="#2196F3" />
        <StatCard label="Total TVA (2.6%)" value={`${totalVAT.toFixed(2)}`} icon="receipt" color="#FF9800" />
        <StatCard label="Chiffre d'Affaires (TTC)" value={`${totalRevenue.toFixed(2)}`} icon="cash" color={Theme.colors.success} />
        <StatCard label="Nb Commandes" value={String(filteredOrders.length)} icon="cart" color="#888" />
        <StatCard label="Panier Moyen" value={filteredOrders.length ? `${(totalRevenue / filteredOrders.length).toFixed(2)}` : '0'} icon="trending-up" color="#9C27B0" />
        <StatCard label="Espèces" value={`${filteredOrders.filter(o => o.paymentMethod !== 'Carte').reduce((s, o) => s + o.total, 0).toFixed(2)}`} icon="cash-outline" color="#4CAF50" />
        <StatCard label="Carte / Twint" value={`${filteredOrders.filter(o => o.paymentMethod === 'Carte').reduce((s, o) => s + o.total, 0).toFixed(2)}`} icon="card-outline" color="#007AFF" />
      </View>

      {/* TOP PRODUITS DE LA PERIODE */}
      {filteredOrders.length > 0 && (() => {
        const productCounts: Record<string, { count: number; revenue: number }> = {};
        filteredOrders.forEach(o => o.items.forEach((i: any) => {
          if (!productCounts[i.name]) productCounts[i.name] = { count: 0, revenue: 0 };
          productCounts[i.name].count += (i.quantity || 1);
          productCounts[i.name].revenue += (i.price || 0) * (i.quantity || 1);
        }));
        const sorted = Object.entries(productCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
        return (
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.sectionHeader}>TOP PRODUITS DE LA PÉRIODE</Text>
            <View style={styles.dataTableWrapper}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { flex: 0.5 }]}>#</Text>
                <Text style={[styles.th, { flex: 3 }]}>PRODUIT</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>QTÉ</Text>
                <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>CA GÉNÉRÉ</Text>
              </View>
              {sorted.map(([name, data], i) => (
                <View key={name} style={styles.tableRow}>
                  <Text style={[styles.tdSub, { flex: 0.5 }]}>#{i + 1}</Text>
                  <Text style={[styles.tdTitle, { flex: 3 }]}>{name}</Text>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.success }}>{data.count}x</Text>
                  </View>
                  <Text style={[styles.tdSub, { flex: 1.5, textAlign: 'right' }]}>{data.revenue.toFixed(2)} CHF</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })()}

      {/* TABLE DATA */}
      <Text style={styles.sectionHeader}>HISTORIQUE DÉTAILLÉ DES VENTES</Text>
      <View style={styles.dataTableWrapper}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, { flex: 1 }]}>DATE</Text>
          <Text style={[styles.th, { flex: 1 }]}>REF</Text>
          <Text style={[styles.th, { flex: 2 }]}>CLIENT / MÉTHODE</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>TVA</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>TTC (CHF)</Text>
        </View>
        {filteredOrders.map(o => (
          <TouchableOpacity key={o.id} style={styles.tableRow} onPress={() => router.push({ pathname: '/receipt', params: { id: o.id } })}>
            <Text style={[styles.tdSub, { flex: 1 }]}>{new Date(o.createdAt).toLocaleDateString('fr-CH')}</Text>
            <Text style={[styles.tdId, { flex: 1 }]}>#{o.id}</Text>
            <View style={{ flex: 2 }}>
              <Text style={styles.tdTitle}>{o.customerName}</Text>
              <Text style={styles.tdSub}>{o.paymentMethod || 'Espèces'}</Text>
            </View>
            <Text style={[styles.tdSub, { flex: 1, textAlign: 'right' }]}>{(o.taxAmount || 0).toFixed(2)}</Text>
            <Text style={[styles.tdTitle, { flex: 1, textAlign: 'right', color: Theme.colors.success }]}>{o.total.toFixed(2)}</Text>
          </TouchableOpacity>
        ))}
        {filteredOrders.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={32} color={Theme.colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={{ color: Theme.colors.textSecondary, fontFamily: Theme.fonts.body }}>Aucune vente enregistrée sur cette période.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ──────────────────────────────────
// TAB: MENU MANAGEMENT
// ──────────────────────────────────
function MenuTab() {
  const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, reorderCategory, reorderProduct } = useRestaurantStore();
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [fastEditMode, setFastEditMode] = useState(false);

  const filtered = products
    .filter(p => p.category?.toUpperCase() === selectedCategory?.toUpperCase())
    .sort((a, b) => {
      const orderA = a.displayOrder ?? 0;
      const orderB = b.displayOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });

  const openAdd = () => { setEditingProduct(null); setShowModal(true); };
  const openEdit = (p: Product) => { setEditingProduct(p); setShowModal(true); };

  const handleDelete = (p: Product) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Supprimer "${p.name}" du menu ?`)) {
        deleteProduct(p.id);
      }
    } else {
      Alert.alert('Supprimer', `Supprimer "${p.name}" du menu ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteProduct(p.id) },
      ]);
    }
  };

  const handleDeleteCat = (cat: string) => {
    Alert.alert('Supprimer catégorie', `Supprimer "${cat}" et tous ses produits ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        deleteCategory(cat);
        setSelectedCategory(categories.find(c => c !== cat) || categories[0]);
      }},
    ]);
  };
  return (
    <View style={{ flex: 1 }}>
      {/* CATEGORY FILTER + ADD */}
      <View style={[styles.menuCategoryBar, { flexDirection: 'row', alignItems: 'center' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
          {categories?.map((cat, index) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catPill, selectedCategory === cat && styles.catPillActive, selectedCategory === cat && { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
              onLongPress={() => handleDeleteCat(cat)}
              onPress={() => setSelectedCategory(cat)}
            >
              {selectedCategory === cat && index > 0 && (
                <TouchableOpacity onPress={() => reorderCategory(cat, 'up')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Ionicons name="chevron-back" size={16} color="#FFF" />
                </TouchableOpacity>
              )}
              <Text style={[styles.catPillText, selectedCategory === cat && styles.catPillTextActive]} numberOfLines={1}>{cat}</Text>
              {selectedCategory === cat && index < categories.length - 1 && (
                <TouchableOpacity onPress={() => reorderCategory(cat, 'down')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Ionicons name="chevron-forward" size={16} color="#FFF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addCatBtn} onPress={() => setShowCatModal(true)}>
            <Ionicons name="add" size={18} color={Theme.colors.success} />
          </TouchableOpacity>
        </ScrollView>
        <TouchableOpacity 
          style={{ marginRight: 16, padding: 8, backgroundColor: fastEditMode ? Theme.colors.success : Theme.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border }}
          onPress={() => setFastEditMode(!fastEditMode)}
        >
          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: fastEditMode ? '#000' : Theme.colors.text }}>{fastEditMode ? 'ÉDITION RAPIDE : ON' : 'ÉDITION RAPIDE'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* POKÉMOONS DU MOIS MANAGER */}
        <PokeOfTheMonthPanel />

        {filtered.length === 0 && (
          <Text style={styles.emptySubtitle}>Aucun produit dans cette catégorie.</Text>
        )}
        
        {fastEditMode ? (
          <View style={{ backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Theme.colors.border }}>
            {filtered.map(product => (
              <View key={product.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border }}>
                 <Text style={{ fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.text, flex: 1 }}>{product.name}</Text>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput 
                      style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 8, width: 80, textAlign: 'center', fontFamily: Theme.fonts.bodyBold }}
                      defaultValue={product.price.toString()}
                      keyboardType="numeric"
                      onBlur={(e: any) => {
                         const val = parseFloat(e.nativeEvent.text);
                         if (!isNaN(val) && val !== product.price) {
                            updateProduct(product.id, { price: val });
                         }
                      }}
                    />
                    <Text style={{ fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary }}>CHF</Text>
                 </View>
              </View>
            ))}
          </View>
        ) : (
          filtered.map((product, index) => (
            <View key={product.id} style={styles.menuItem}>
              <View style={{ marginRight: 12, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <TouchableOpacity onPress={() => reorderProduct(product.id, 'up')} disabled={index === 0} style={{ opacity: index === 0 ? 0.2 : 1 }}>
                  <Ionicons name="chevron-up-circle-outline" size={24} color={Theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => reorderProduct(product.id, 'down')} disabled={index === filtered.length - 1} style={{ opacity: index === filtered.length - 1 ? 0.2 : 1 }}>
                  <Ionicons name="chevron-down-circle-outline" size={24} color={Theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <Image
                source={getImageSource(product.image)}
                style={styles.menuItemImage}
                contentFit="cover"
              />
              <View style={[styles.menuItemInfo, product.outOfStock && {opacity: 0.5}]}>
                <Text style={styles.menuItemName}>{product.name}</Text>
                <Text style={styles.menuItemDesc} numberOfLines={1}>{product.description}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <Text style={styles.menuItemPrice}>{product.price.toFixed(2)} CHF</Text>
                  {product.outOfStock && <Text style={{color: Theme.colors.danger, fontSize: 10, fontFamily: Theme.fonts.bodyBold}}>RUPTURE</Text>}
                </View>
              </View>
              <View style={[styles.menuItemActions, {flexDirection: 'row'}]}>
                <TouchableOpacity onPress={() => updateProduct(product.id, { outOfStock: !product.outOfStock })} style={styles.stockBtn}>
                  <Ionicons name={product.outOfStock ? 'eye-off' : 'eye'} size={20} color={product.outOfStock ? Theme.colors.danger : Theme.colors.success} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(product)}>
                  <Ionicons name="pencil" size={16} color={Theme.colors.success} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.editBtn, { borderColor: Theme.colors.primary + '55' }]} onPress={() => {
                  const { id, ...rest } = product;
                  const duplicated = { ...rest, name: rest.name + ' (COPIE)', displayOrder: (rest.displayOrder || 0) + 0.5 };
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    if (window.confirm(`Dupliquer "${product.name}" ?`)) {
                      // @ts-ignore
                      useRestaurantStore.getState().addProduct(duplicated);
                    }
                  } else {
                    Alert.alert('Dupliquer', `Dupliquer "${product.name}" ?`, [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Dupliquer', onPress: () => {
                        // @ts-ignore
                        useRestaurantStore.getState().addProduct(duplicated);
                      }},
                    ]);
                  }
                }}>
                  <Ionicons name="copy-outline" size={16} color={Theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(product)}>
                  <Ionicons name="trash-outline" size={16} color={Theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ marginTop: 40, borderTopWidth: 1, borderColor: Theme.colors.border, paddingTop: 24 }}>
          <Text style={styles.sectionHeader}>GESTION DES STOCKS D'INGRÉDIENTS</Text>
          <IngredientsStockPanel />
        </View>

        <View style={{ marginTop: 24, borderTopWidth: 1, borderColor: Theme.colors.border, paddingTop: 24 }}>
          <Text style={styles.sectionHeader}>SAUCES & BOISSONS (LISTE GLOBALE)</Text>
          <SaucesDrinksPanel />
        </View>
      </ScrollView>

      {/* FAB ADD PRODUCT */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>

      {/* PRODUCT MODAL */}
      <ProductModal
        visible={showModal}
        product={editingProduct}
        categories={categories}
        defaultCategory={selectedCategory}
        onClose={() => setShowModal(false)}
        onSave={(data) => {
          if (editingProduct) {
            updateProduct(editingProduct.id, data);
          } else {
            addProduct(data as any);
          }
          setShowModal(false);
        }}
      />

      {/* CATEGORY MODAL */}
      <Modal visible={showCatModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>NOUVELLE CATÉGORIE</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: SALADES"
              placeholderTextColor={Theme.colors.textSecondary}
              value={newCatName}
              onChangeText={setNewCatName}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowCatModal(false); setNewCatName(''); }}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.goldBtn} onPress={() => {
                if (newCatName.trim()) { addCategory(newCatName); setShowCatModal(false); setNewCatName(''); }
              }}>
                <Text style={styles.goldBtnText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ──────────────────────────────────────────────
// PRODUCT MODAL (Add / Edit)
// ──────────────────────────────────────────────
function ProductModal({ visible, product, categories, defaultCategory, onClose, onSave }: {
  visible: boolean;
  product: Product | null;
  categories: string[];
  defaultCategory: string;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [imageUri, setImageUri] = useState('');
  const [highlighted, setHighlighted] = useState(false);
  const [hasSauces, setHasSauces] = useState(false);
  const [hasDrinkSelection, setHasDrinkSelection] = useState(false);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [customizationSections, setCustomizationSections] = useState<any[]>([]);
  const [pickingImage, setPickingImage] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(product?.name || '');
      setDescription(product?.description || '');
      setPrice(product?.price?.toString() || '');
      setCategory(product?.category || defaultCategory);
      setImageUri(typeof product?.image === 'string' ? product.image : '');
      setHighlighted(product?.highlighted || false);
      setHasSauces(product?.hasSauces || false);
      setHasDrinkSelection(product?.hasDrinkSelection || false);
      setAllergens(product?.allergens || []);
      
      // Deep copy to avoid mutating store state directly on edit
      setCustomizationSections(product?.customizationSections ? JSON.parse(JSON.stringify(product.customizationSections)) : []);
    }
  }, [visible, product]);

  const pickImage = async () => {
    setPickingImage(true);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à votre galerie dans les paramètres.');
      setPickingImage(false);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    setPickingImage(false);
    if (!result.canceled && result.assets[0]) {
      try {
        Alert.alert('Upload en cours', 'Veuillez patienter pendant le téléchargement de l\'image...');
        const uri = result.assets[0].uri;
        const filename = uri.substring(uri.lastIndexOf('/') + 1);
        const downloadUrl = await uploadImageAsync(uri, `products/${Date.now()}_${filename}`);
        setImageUri(downloadUrl);
        Alert.alert('Succès', 'L\'image a été téléchargée avec succès.');
      } catch (err) {
        Alert.alert('Erreur', 'Impossible de télécharger l\'image.');
      }
    }
  };

  const handleSave = () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Erreur', 'Le nom et le prix sont obligatoires.');
      return;
    }
    onSave({
      name: name.toUpperCase().trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      image: imageUri || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
      highlighted,
      hasSauces,
      hasDrinkSelection,
      allergens,
      ...(customizationSections.length > 0 ? { customizationSections } : {})
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="close" size={24} color={Theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{product ? 'MODIFIER' : 'AJOUTER'}</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={{ fontFamily: Theme.fonts.bodyBold, color: Theme.colors.success, fontSize: 15 }}>Sauver</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* IMAGE TICKER (CHOOSE FROM LOCAL ASSETS) */}
            <Text style={styles.fieldLabel}>CHOISIR UNE PHOTO CI-DESSOUS (BIBLIOTHÈQUE)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {Object.keys(IMAGES_MAP).map((key) => {
                const isSelected = imageUri === key;
                return (
                  <TouchableOpacity 
                    key={key} 
                    style={[{ marginRight: 12, borderWidth: 2, borderColor: isSelected ? Theme.colors.success : 'transparent', borderRadius: 12, overflow: 'hidden' }]}
                    onPress={() => setImageUri(key)}
                  >
                    <Image source={IMAGES_MAP[key as keyof typeof IMAGES_MAP]} style={{ width: 80, height: 80 }} contentFit="cover" />
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 2 }}>
                       <Text style={{ color: '#fff', fontSize: 8, textAlign: 'center', fontFamily: Theme.fonts.body }}>{key.toUpperCase()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={{ fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, marginBottom: 8 }}>Ou uploader une image depuis le téléphone :</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri && imageUri.startsWith('http') ? (
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={32} color={Theme.colors.textSecondary} />
                  <Text style={styles.imagePickerText}>{pickingImage ? 'Chargement...' : 'Uploader une image'}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={{ fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, marginBottom: 8, marginTop: 12 }}>Ou mettre un lien internet (URL) :</Text>
            <TextInput style={styles.input} value={imageUri} onChangeText={setImageUri} placeholder="https://..." placeholderTextColor={Theme.colors.textSecondary} />



            <Text style={styles.fieldLabel}>NOM DU PRODUIT *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: POKÉ SAUMON" placeholderTextColor={Theme.colors.textSecondary} />

            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Ingrédients, options..." placeholderTextColor={Theme.colors.textSecondary} multiline />

            <Text style={styles.fieldLabel}>PRIX (CHF) *</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="9.00" placeholderTextColor={Theme.colors.textSecondary} keyboardType="decimal-pad" />

            <Text style={styles.fieldLabel}>CATÉGORIE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {categories.map(cat => (
                  <TouchableOpacity key={cat} style={[styles.catPill, category === cat && styles.catPillActive]} onPress={() => setCategory(cat)}>
                    <Text style={[styles.catPillText, category === cat && styles.catPillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Article signature / populaire</Text>
                <Text style={styles.switchSubtitle}>Mis en avant sur l'accueil</Text>
              </View>
              <Switch
                value={highlighted}
                onValueChange={setHighlighted}
                trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
                thumbColor={highlighted ? Theme.colors.success : Theme.colors.textSecondary}
              />
            </View>

            <View style={[styles.switchRow, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, paddingTop: 16 }]}>
              <View>
                <Text style={styles.switchLabel}>Choix de sauces (max 2)</Text>
                <Text style={styles.switchSubtitle}>Affiche la liste des sauces au client</Text>
              </View>
              <Switch
                value={hasSauces}
                onValueChange={setHasSauces}
                trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
                thumbColor={hasSauces ? Theme.colors.success : Theme.colors.textSecondary}
              />
            </View>

            <View style={[styles.switchRow, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, paddingTop: 16 }]}>
              <View>
                <Text style={styles.switchLabel}>Sélection de boisson</Text>
                <Text style={styles.switchSubtitle}>Affiche la liste des boissons (pour menus)</Text>
              </View>
              <Switch
                value={hasDrinkSelection}
                onValueChange={setHasDrinkSelection}
                trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
                thumbColor={hasDrinkSelection ? Theme.colors.success : Theme.colors.textSecondary}
              />
            </View>


            {/* ALLERGÈNES */}
            <View style={{ marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, paddingTop: 20 }}>
              <Text style={styles.fieldLabel}>ALLERGÈNES PRÉSENTS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {['Gluten', 'Lait', 'Poisson', 'Fruits de mer' , 'Œuf', 'Arachide', 'Soja', 'Fruits à coque', 'Sésame', 'Céleri', 'Moutarde'].map((al) => {
                  const isSelected = allergens.includes(al);
                  return (
                    <TouchableOpacity
                      key={al}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                        borderWidth: 1, borderColor: isSelected ? Theme.colors.success : Theme.colors.border,
                        backgroundColor: isSelected ? Theme.colors.success + '22' : 'transparent'
                      }}
                      onPress={() => {
                        if (isSelected) {
                          setAllergens(allergens.filter(a => a !== al));
                        } else {
                          setAllergens([...allergens, al]);
                        }
                      }}
                    >
                      <Text style={{ fontFamily: Theme.fonts.body, fontSize: 12, color: isSelected ? Theme.colors.success : Theme.colors.text }}>{al}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* CUSTOMIZATIONS EDITOR */}
            <View style={{ marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, paddingTop: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.fieldLabel}>OPTIONS SUR-MESURE (INGRÉDIENTS)</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {customizationSections.length === 0 && (
                    <TouchableOpacity onPress={() => {
                       const pokeCustom = INITIAL_PRODUCTS.find(p => p.id === 'poke-custom');
                       if (pokeCustom && pokeCustom.customizationSections) {
                         setCustomizationSections(JSON.parse(JSON.stringify(pokeCustom.customizationSections)));
                       }
                    }}>
                      <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: '#f59e0b' }}>+ Copier modèle Poké</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => {
                    setCustomizationSections([...customizationSections, { title: 'Nouvelle étape', required: false, maxChoices: 1, choices: [] }]);
                  }}>
                    <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.primary }}>+ Ajouter section</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {customizationSections.map((section, sIndex) => (
                <View key={sIndex} style={{ backgroundColor: Theme.colors.background, padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border }}>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0, paddingVertical: 8, fontFamily: Theme.fonts.bodyBold, fontSize: 13 }]}
                      value={section.title}
                      placeholder="Titre (ex: Choisis ta protéine)"
                      onChangeText={(val) => {
                         const newSecs = [...customizationSections];
                         newSecs[sIndex].title = val;
                         setCustomizationSections(newSecs);
                      }}
                    />
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Supprimer la section', 'Êtes-vous sûr ?', [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Supprimer', style: 'destructive', onPress: () => {
                           const newSecs = [...customizationSections];
                           newSecs.splice(sIndex, 1);
                           setCustomizationSections(newSecs);
                        }}
                      ]);
                    }}>
                      <Ionicons name="trash" size={20} color={Theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary }}>Obligatoire ?</Text>
                      <Switch
                        value={section.required}
                        onValueChange={(val) => {
                          const newSecs = [...customizationSections];
                          newSecs[sIndex].required = val;
                          setCustomizationSections(newSecs);
                        }}
                        trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
                        thumbColor={section.required ? Theme.colors.success : Theme.colors.textSecondary}
                        style={{ transform: [{ scale: 0.8 }] }}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary }}>Max choix:</Text>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0, paddingVertical: 4, paddingHorizontal: 8, fontSize: 12 }]}
                        value={section.maxChoices.toString()}
                        keyboardType="numeric"
                        onChangeText={(val) => {
                           const newSecs = [...customizationSections];
                           newSecs[sIndex].maxChoices = parseInt(val) || 1;
                           setCustomizationSections(newSecs);
                        }}
                      />
                    </View>
                  </View>

                  {section.choices.map((choice: any, cIndex: number) => (
                    <View key={cIndex} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 2, marginBottom: 0, paddingVertical: 8, fontSize: 12 }]}
                        value={choice.name}
                        placeholder="Nom de l'ingrédient"
                        placeholderTextColor={Theme.colors.textSecondary}
                        onChangeText={(val) => {
                           const newSecs = [...customizationSections];
                           newSecs[sIndex].choices[cIndex].name = val;
                           setCustomizationSections(newSecs);
                        }}
                      />
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, paddingHorizontal: 8 }}>
                         <Text style={{ fontSize: 12, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.body }}>+</Text>
                         <TextInput
                           style={{ flex: 1, padding: 8, fontSize: 12, fontFamily: Theme.fonts.bodyBold, color: Theme.colors.text }}
                           value={choice.priceOffset.toString()}
                           keyboardType="numeric"
                           onChangeText={(val) => {
                              const newSecs = [...customizationSections];
                              newSecs[sIndex].choices[cIndex].priceOffset = parseFloat(val) || 0;
                              setCustomizationSections(newSecs);
                           }}
                         />
                         <Text style={{ fontSize: 10, color: Theme.colors.textSecondary }}>CHF</Text>
                      </View>
                      <TouchableOpacity onPress={() => {
                         const newSecs = [...customizationSections];
                         newSecs[sIndex].choices.splice(cIndex, 1);
                         setCustomizationSections(newSecs);
                      }}>
                         <Ionicons name="close-circle" size={20} color={Theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  <TouchableOpacity 
                    style={{ marginTop: 8, padding: 10, alignItems: 'center', backgroundColor: Theme.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border, borderStyle: 'dashed' }}
                    onPress={() => {
                      const newSecs = [...customizationSections];
                      newSecs[sIndex].choices.push({ name: '', priceOffset: 0 });
                      setCustomizationSections(newSecs);
                    }}
                  >
                    <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.text }}>+ Ajouter un ingrédient</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────
// TAB: SETTINGS
// ──────────────────────────────────
function SettingsTab() {
  const { settings, updateSettings, updateHours, addPromoCode, deletePromoCode, togglePromoCode } = useRestaurantStore();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [localName, setLocalName] = useState(settings.name);
  const [localPhone, setLocalPhone] = useState(settings.phone);
  const [localAddress, setLocalAddress] = useState(settings.address);
  const [localEmail, setLocalEmail] = useState(settings.email);
  const [localWeb, setLocalWeb] = useState(settings.website);
  const [localInsta, setLocalInsta] = useState(settings.instagram);
  const [localDelivery, setLocalDelivery] = useState(settings.deliveryTime);
  const [localTakeaway, setLocalTakeaway] = useState(settings.takeAwayTime);
  const [localIsOpen, setLocalIsOpen] = useState(settings.isOpen);
  const [localOpenOverrideMessage, setLocalOpenOverrideMessage] = useState(settings.openOverrideMessage || '');
  const [localClosedFrom, setLocalClosedFrom] = useState(settings.closedFrom || '');
  const [localClosedTo, setLocalClosedTo] = useState(settings.closedTo || '');
  const [localAnnouncementEnabled, setLocalAnnouncementEnabled] = useState(settings.announcementEnabled || false);
  const [localAnnouncementMessage, setLocalAnnouncementMessage] = useState(settings.announcementMessage || '');
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeValue, setNewCodeValue] = useState('');
  const [newCodeType, setNewCodeType] = useState<'percent' | 'fixed'>('percent');
  const [newCodeMinOrder, setNewCodeMinOrder] = useState('');
  const [newCodeStartDate, setNewCodeStartDate] = useState('');
  const [newCodeEndDate, setNewCodeEndDate] = useState('');
  const [newCodeFirstOrderOnly, setNewCodeFirstOrderOnly] = useState(false);
  const [saved, setSaved] = useState(false);

  // DRIVER ACCOUNTS STATE
  const [driverList, setDriverList] = useState<any[]>([]);
  const [driverFirstName, setDriverFirstName] = useState('');
  const [driverLastName, setDriverLastName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPass, setDriverPass] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverError, setDriverError] = useState('');
  const [driverSuccess, setDriverSuccess] = useState(false);

  const fetchDrivers = async () => {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const q = query(collection(db, 'users'), where('role', '==', 'driver'));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      setDriverList(list);
    } catch (err) {
      console.warn('Erreur chargement livreurs', err);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleSave = () => {
    updateSettings({
      name: localName, phone: localPhone, address: localAddress,
      email: localEmail, website: localWeb, instagram: localInsta,
      deliveryTime: localDelivery, takeAwayTime: localTakeaway,
      isOpen: localIsOpen, openOverrideMessage: localOpenOverrideMessage,
      closedFrom: localClosedFrom, closedTo: localClosedTo,
      announcementEnabled: localAnnouncementEnabled, announcementMessage: localAnnouncementMessage,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>

      {/* ÉTAT DU RESTAURANT & SERVICES */}
      <Text style={[styles.sectionHeader, { color: localIsOpen ? Theme.colors.success : Theme.colors.danger }]}>
        ÉTAT DU RESTAURANT & SERVICES
      </Text>
      <View style={[styles.settingsCard, { borderColor: !localIsOpen ? Theme.colors.danger : Theme.colors.border, borderWidth: 1 }]}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Prendre des commandes</Text>
            <Text style={styles.switchSubtitle}>{localIsOpen ? "Actif : les clients peuvent passer commande" : "Bloqué : restaurant fermé aux commandes"}</Text>
          </View>
          <Switch 
            value={localIsOpen} 
            onValueChange={setLocalIsOpen}
            trackColor={{ false: Theme.colors.danger, true: Theme.colors.success + '88' }}
            thumbColor={localIsOpen ? Theme.colors.success : Theme.colors.textSecondary}
          />
        </View>

        <View style={[styles.switchRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border, paddingTop: 14, marginTop: 4 }]}>
          <View>
            <Text style={styles.switchLabel}>Accepter les livraisons</Text>
            <Text style={styles.switchSubtitle}>Service de livraison à domicile</Text>
          </View>
          <Switch value={settings.acceptsDelivery} onValueChange={v => updateSettings({ acceptsDelivery: v })}
            trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
            thumbColor={settings.acceptsDelivery ? Theme.colors.success : Theme.colors.textSecondary} />
        </View>

        <View style={[styles.switchRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border, paddingTop: 14, marginTop: 4 }]}>
          <View>
            <Text style={styles.switchLabel}>Accepter le Take Away (À emporter)</Text>
            <Text style={styles.switchSubtitle}>Retrait direct au comptoir</Text>
          </View>
          <Switch value={settings.acceptsPickup} onValueChange={v => updateSettings({ acceptsPickup: v })}
            trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
            thumbColor={settings.acceptsPickup ? Theme.colors.success : Theme.colors.textSecondary} />
        </View>

        {!localIsOpen && (
          <View style={{ marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border, paddingTop: 16 }}>
            <Text style={styles.fieldLabel}>MESSAGE DE FERMETURE AUX CLIENTS</Text>
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
              value={localOpenOverrideMessage} 
              onChangeText={setLocalOpenOverrideMessage}
              placeholder="Ex: Fermé pour congés annuels du 15 au 25 août."
              placeholderTextColor="#999"
              multiline
            />

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>PÉRIODE DE FERMETURE (YYYY-MM-DD)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: Theme.colors.textSecondary, marginBottom: 4 }}>Date de début</Text>
                <TextInput 
                  style={styles.input} 
                  value={localClosedFrom} 
                  onChangeText={setLocalClosedFrom}
                  placeholder="Ex: 2026-08-05"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: Theme.colors.textSecondary, marginBottom: 4 }}>Date de fin</Text>
                <TextInput 
                  style={styles.input} 
                  value={localClosedTo} 
                  onChangeText={setLocalClosedTo}
                  placeholder="Ex: 2026-08-25"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        )}
        <TouchableOpacity style={{ backgroundColor: Theme.colors.success, padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center' }} onPress={handleSave}>
           <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#FFF' }}>{saved ? '● ENREGISTRÉ !' : 'SAUVEGARDER L\'ÉTAT'}</Text>
        </TouchableOpacity>
      </View>

      {/* TEMPS ESTIMÉS */}
      <Text style={[styles.sectionHeader, { color: Theme.colors.success }]}>TEMPS ESTIMÉS RÉELS (AFFICHÉS CLIENT)</Text>
      <View style={styles.settingsCard}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Livraison</Text>
          <TextInput 
            style={[styles.timeInput, { width: 100, backgroundColor: Theme.colors.surface }]} 
            value={localDelivery} 
            onChangeText={setLocalDelivery}
            placeholder="30-45"
            placeholderTextColor="#666"
          />
        </View>
        <View style={[styles.switchRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border, paddingTop: 14, marginTop: 4 }]}>
          <Text style={styles.switchLabel}>À emporter / Take Away</Text>
          <TextInput 
            style={[styles.timeInput, { width: 100, backgroundColor: Theme.colors.surface }]} 
            value={localTakeaway} 
            onChangeText={setLocalTakeaway}
            placeholder="15-20"
            placeholderTextColor="#666"
          />
        </View>
        <TouchableOpacity style={{ backgroundColor: Theme.colors.success, padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' }} onPress={handleSave}>
           <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#FFF' }}>{saved ? '● ENREGISTRÉ !' : 'SAUVEGARDER TEMPS'}</Text>
        </TouchableOpacity>
      </View>

      {/* INFO GÉNÉRALES */}
      <Text style={styles.sectionHeader}>INFORMATIONS GÉNÉRALES</Text>
      <View style={styles.settingsCard}>
        <SettingField label="Nom du restaurant" value={localName} onChange={setLocalName} />
        <SettingField label="Téléphone" value={localPhone} onChange={setLocalPhone} keyboard="phone-pad" />
        <SettingField label="Adresse" value={localAddress} onChange={setLocalAddress} />
        <SettingField label="Email" value={localEmail} onChange={setLocalEmail} keyboard="email-address" />
        <SettingField label="Site web" value={localWeb} onChange={setLocalWeb} keyboard="url" last />
      </View>

      {/* RÉSEAUX SOCIAUX */}
      <Text style={styles.sectionHeader}>RÉSEAUX SOCIAUX</Text>
      <View style={styles.settingsCard}>
        <SettingField label="Instagram" value={localInsta} onChange={setLocalInsta} />
        <SettingField label="Facebook" value={settings.facebook} onChange={v => updateSettings({ facebook: v })} last />
      </View>

      {/* MARKETING & PROMOS */}
      <Text style={styles.sectionHeader}>MARKETING & CODES PROMOS</Text>
      <View style={styles.settingsCard}>
        {(settings.promoCodes || [
          { id: 'p1', code: 'BIENVENUE10', discountType: 'percent', discountValue: 10, active: true, firstOrderOnly: true },
          { id: 'p2', code: 'POKE5', discountType: 'fixed', discountValue: 5, active: true, minOrder: 30 }
        ]).map((promo) => {
          const nowStr = new Date().toISOString().split('T')[0];
          const isExpired = promo.endDate && promo.endDate < nowStr;
          const isUpcoming = promo.startDate && promo.startDate > nowStr;

          return (
            <View key={promo.id} style={[styles.settingFieldRow, { borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingBottom: 10, marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.text }}>
                      🏷️ {promo.code} ({promo.discountType === 'percent' ? `-${promo.discountValue}%` : `-${promo.discountValue} CHF`})
                    </Text>
                    {promo.firstOrderOnly && (
                      <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: Theme.fonts.bodyBold, color: '#b45309' }}>1ère commande</Text>
                      </View>
                    )}
                    {isExpired ? (
                      <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: Theme.fonts.bodyBold, color: '#dc2626' }}>Expiré</Text>
                      </View>
                    ) : isUpcoming ? (
                      <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: Theme.fonts.bodyBold, color: '#0369a1' }}>Dès le {promo.startDate}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.switchSubtitle, { marginTop: 3 }]}>
                    {promo.minOrder ? `Min. ${promo.minOrder} CHF` : 'Sans minimum d\'achat'}
                    {promo.startDate ? ` • Du ${promo.startDate}` : ''}
                    {promo.endDate ? ` jusqu'au ${promo.endDate}` : ''}
                    {` • ${promo.active ? 'Actif' : 'Désactivé'}`}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Switch
                    value={promo.active}
                    onValueChange={() => togglePromoCode(promo.id)}
                    trackColor={{ true: Theme.colors.success + '88' }}
                    thumbColor={promo.active ? Theme.colors.success : '#ccc'}
                  />
                  <TouchableOpacity onPress={() => deletePromoCode(promo.id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* AJOUTER UN CODE PROMO */}
        <View style={{ marginTop: 8, backgroundColor: Theme.colors.background, padding: 14, borderRadius: 12, gap: 12 }}>
          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.primary, letterSpacing: 0.5 }}>+ CRÉER UN CODE PROMO</Text>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 2, textTransform: 'uppercase', fontFamily: Theme.fonts.bodyBold, marginBottom: 0 }]}
              placeholder="Code (ex: ETE20)"
              placeholderTextColor="#999"
              value={newCodeName}
              onChangeText={setNewCodeName}
            />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Valeur"
              placeholderTextColor="#999"
              value={newCodeValue}
              onChangeText={setNewCodeValue}
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={() => setNewCodeType(newCodeType === 'percent' ? 'fixed' : 'percent')}
              style={{ backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text }}>
                {newCodeType === 'percent' ? '%' : 'CHF'}
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            placeholder="Montant minimum d'achat en CHF (optionnel, ex: 35)"
            placeholderTextColor="#999"
            value={newCodeMinOrder}
            onChangeText={setNewCodeMinOrder}
            keyboardType="numeric"
          />

          {/* DATES DE VALIDITÉ */}
          <View style={{ backgroundColor: Theme.colors.surface, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border }}>
            <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: Theme.colors.textSecondary, marginBottom: 6 }}>
              📅 PÉRIODE DE VALIDITÉ DU CODE (OPTIONNEL)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: Theme.colors.textSecondary, marginBottom: 2 }}>Date début (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 0, backgroundColor: Theme.colors.background }]}
                  placeholder="Ex: 2026-09-01"
                  placeholderTextColor="#999"
                  value={newCodeStartDate}
                  onChangeText={setNewCodeStartDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: Theme.colors.textSecondary, marginBottom: 2 }}>Date fin/expir. (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 0, backgroundColor: Theme.colors.background }]}
                  placeholder="Ex: 2026-09-30"
                  placeholderTextColor="#999"
                  value={newCodeEndDate}
                  onChangeText={setNewCodeEndDate}
                />
              </View>
            </View>

            {/* QUICK PRESETS */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontFamily: Theme.fonts.bodyBold, color: Theme.colors.textSecondary }}>Raccourcis fin :</Text>
              {[
                { label: '+7 jours', days: 7 },
                { label: '+15 jours', days: 15 },
                { label: '+30 jours', days: 30 },
                { label: 'Fin du mois', endOfMonth: true },
              ].map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    const today = new Date();
                    if (!newCodeStartDate) {
                      setNewCodeStartDate(today.toISOString().split('T')[0]);
                    }
                    const target = new Date();
                    if (p.days) {
                      target.setDate(target.getDate() + p.days);
                    } else if (p.endOfMonth) {
                      target.setMonth(target.getMonth() + 1, 0);
                    }
                    setNewCodeEndDate(target.toISOString().split('T')[0]);
                  }}
                  style={{ backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                >
                  <Text style={{ fontSize: 11, fontFamily: Theme.fonts.bodyMedium, color: Theme.colors.primary }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
              {(newCodeStartDate || newCodeEndDate) ? (
                <TouchableOpacity onPress={() => { setNewCodeStartDate(''); setNewCodeEndDate(''); }} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontFamily: Theme.fonts.bodyMedium, color: Theme.colors.danger }}>✕ Effacer dates</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
            <View>
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.text }}>1ère commande uniquement</Text>
              <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary }}>Réservé exclusivement aux nouveaux clients</Text>
            </View>
            <Switch
              value={newCodeFirstOrderOnly}
              onValueChange={setNewCodeFirstOrderOnly}
              trackColor={{ true: Theme.colors.success + '88' }}
              thumbColor={newCodeFirstOrderOnly ? Theme.colors.success : '#ccc'}
            />
          </View>

          <TouchableOpacity
            style={{ backgroundColor: Theme.colors.success, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 }}
            onPress={() => {
              if (!newCodeName.trim() || !newCodeValue.trim()) {
                Alert.alert('Erreur', 'Veuillez entrer un code et une valeur');
                return;
              }
              addPromoCode({
                code: newCodeName.trim().toUpperCase(),
                discountType: newCodeType,
                discountValue: parseFloat(newCodeValue) || 10,
                active: true,
                minOrder: newCodeMinOrder.trim() ? parseFloat(newCodeMinOrder) : undefined,
                startDate: newCodeStartDate.trim() || undefined,
                endDate: newCodeEndDate.trim() || undefined,
                firstOrderOnly: newCodeFirstOrderOnly,
              });
              setNewCodeName('');
              setNewCodeValue('');
              setNewCodeMinOrder('');
              setNewCodeStartDate('');
              setNewCodeEndDate('');
              setNewCodeFirstOrderOnly(false);
              Alert.alert('Succès', 'Code promo créé avec succès !');
            }}
          >
            <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#fff', fontSize: 13 }}>ENREGISTRER LE CODE PROMO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* GESTION DES COMPTES LIVREURS */}
      <Text style={[styles.sectionHeader, { color: '#0284c7' }]}>ÉQUIPE & COMPTES LIVREURS</Text>
      <View style={[styles.settingsCard, { borderColor: '#0284c744', borderWidth: 1 }]}>
        <Text style={{ fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, marginBottom: 12, lineHeight: 18 }}>
          Créez des identifiants (email & mot de passe) pour vos livreurs. Lorsqu'ils se connectent à l'application avec ces accès, ils arrivent directement sur leur espace de tournée et n'ont aucun accès au chiffre d'affaires ni au reste de l'administration.
        </Text>

        {/* LISTE DES LIVREURS EXISTANTS */}
        {driverList.length > 0 && (
          <View style={{ marginBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, paddingBottom: 16 }}>
            <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>LIVREURS ACTIFS ({driverList.length})</Text>
            {driverList.map((d: any) => (
              <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border + '66' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0284c722', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="bicycle" size={18} color="#0284c7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text }}>{d.firstName} {d.lastName}</Text>
                    <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary }}>{d.email} {d.phone ? `• ${d.phone}` : ''}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={async () => {
                    const confirmDel = Platform.OS === 'web' 
                      ? (typeof window !== 'undefined' ? window.confirm(`Supprimer le compte de "${d.firstName}" ?`) : true)
                      : true;
                    if (confirmDel) {
                      try {
                        const { deleteDoc, doc } = await import('firebase/firestore');
                        await deleteDoc(doc(db, 'users', d.id));
                        setDriverList(prev => prev.filter(x => x.id !== d.id));
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* FORMULAIRE CRÉATION LIVREUR */}
        <View style={{ backgroundColor: Theme.colors.background, padding: 16, borderRadius: 12, gap: 10 }}>
          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: '#0284c7', letterSpacing: 0.5 }}>+ CRÉER UN NOUVEAU LIVREUR</Text>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Prénom"
              placeholderTextColor="#999"
              value={driverFirstName}
              onChangeText={setDriverFirstName}
            />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Nom"
              placeholderTextColor="#999"
              value={driverLastName}
              onChangeText={setDriverLastName}
            />
          </View>

          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            placeholder="Email de connexion (ex: livreur@pokemoons.ch)"
            placeholderTextColor="#999"
            value={driverEmail}
            onChangeText={setDriverEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            placeholder="Mot de passe (min. 6 caractères)"
            placeholderTextColor="#999"
            value={driverPass}
            onChangeText={setDriverPass}
            secureTextEntry
          />

          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            placeholder="Téléphone portable (optionnel)"
            placeholderTextColor="#999"
            value={driverPhone}
            onChangeText={setDriverPhone}
            keyboardType="phone-pad"
          />

          {driverError ? (
            <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.danger }}>{driverError}</Text>
          ) : null}

          {driverSuccess ? (
            <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.success }}>✓ Compte livreur créé avec succès !</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.goldBtn, { backgroundColor: '#0284c7', marginTop: 4, justifyContent: 'center' }]}
            disabled={driverLoading}
            onPress={async () => {
              if (!driverFirstName.trim() || !driverEmail.trim() || !driverPass.trim()) {
                setDriverError('Veuillez remplir le prénom, l\'email et le mot de passe.');
                return;
              }
              setDriverLoading(true);
              setDriverError('');
              setDriverSuccess(false);
              const res = await useAuthStore.getState().createDriverAccount(
                driverFirstName.trim(),
                driverLastName.trim(),
                driverEmail.trim(),
                driverPass.trim(),
                driverPhone.trim()
              );
              setDriverLoading(false);
              if (res.success) {
                setDriverSuccess(true);
                setDriverFirstName('');
                setDriverLastName('');
                setDriverEmail('');
                setDriverPass('');
                setDriverPhone('');
                fetchDrivers();
                setTimeout(() => setDriverSuccess(false), 3000);
              } else {
                setDriverError(res.error || 'Erreur lors de la création');
              }
            }}
          >
            {driverLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.goldBtnText, { color: '#fff' }]}>CRÉER LE COMPTE LIVREUR</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* MATÉRIEL & CAISSE */}
      <Text style={styles.sectionHeader}>MATÉRIEL & IMPRESSION TICKETS</Text>
      <View style={styles.settingsCard}>
        {/* Switch Impression Auto */}
        <View style={styles.settingFieldRow}>
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
               <Ionicons name="print-outline" size={28} color={Theme.colors.textSecondary} />
               <View style={{ flex: 1 }}>
                 <Text style={styles.fieldLabel}>IMPRESSION AUTOMATIQUE</Text>
                 <Text style={styles.switchSubtitle}>Imprimer automatiquement les tickets dès réception</Text>
               </View>
             </View>
             <Switch 
               value={settings.autoPrintEnabled || false} 
               onValueChange={(val) => updateSettings({ autoPrintEnabled: val })}
               trackColor={{ true: Theme.colors.success + '88' }} 
               thumbColor={settings.autoPrintEnabled ? Theme.colors.success : '#ccc'} 
             />
           </View>
        </View>

        {/* Configuration Imprimante : Adapté Web vs iOS */}
        <View style={[styles.settingFieldRow, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border }]}>
          <Text style={[styles.fieldLabel, { marginBottom: 6 }]}>CONFIGURATION IMPRIMANTE</Text>
          
          {Platform.OS === 'web' ? (
            <View style={{ backgroundColor: Theme.colors.surface, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ionicons name="desktop-outline" size={18} color={Theme.colors.primary} />
                <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text }}>Mode Navigateur Web (PC / Mac)</Text>
              </View>
              <Text style={{ fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, lineHeight: 18 }}>
                Sur navigateur, l'impression utilise l'imprimante thermique reliée à votre ordinateur (USB ou Réseau). Cliquez sur le bouton de test ci-dessous pour ouvrir la boîte d'impression.
              </Text>
            </View>
          ) : (
            settings.selectedPrinterName ? (
              <View style={{ backgroundColor: Theme.colors.success + '15', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.success + '40', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="checkmark-circle" size={20} color={Theme.colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text }}>{settings.selectedPrinterName}</Text>
                    <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary }}>Connectée via AirPrint</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={{ backgroundColor: Theme.colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border }}
                  onPress={async () => {
                    try {
                      const printer = await Print.selectPrinterAsync();
                      if (printer) {
                        updateSettings({ selectedPrinterName: printer.name, selectedPrinterUrl: printer.url });
                        Alert.alert('Imprimante mise à jour', `Connectée à "${printer.name}"`);
                      }
                    } catch (e) {
                      console.error('Erreur sélection imprimante', e);
                    }
                  }}
                >
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: Theme.colors.primary }}>Changer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={{ backgroundColor: Theme.colors.primary + '15', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.primary + '30', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}
                onPress={async () => {
                  try {
                    const printer = await Print.selectPrinterAsync();
                    if (printer) {
                      updateSettings({ selectedPrinterName: printer.name, selectedPrinterUrl: printer.url });
                      Alert.alert('Imprimante associée', `Connectée à "${printer.name}" avec succès !`);
                    }
                  } catch (e) {
                    console.error('Erreur sélection imprimante', e);
                  }
                }}
              >
                <Ionicons name="search" size={16} color={Theme.colors.primary} />
                <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.primary }}>Rechercher & Associer une imprimante AirPrint / Wi-Fi</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Bouton Test Impression */}
        <TouchableOpacity 
          style={{ paddingVertical: 14, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, backgroundColor: Theme.colors.primary + '08' }}
          onPress={async () => {
            const sampleOrder = {
              id: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
              createdAt: new Date().toISOString(),
              customerName: 'Test Imprimante',
              customerPhone: '079 000 00 00',
              customerAddress: 'Place du Marché 6, 2300 La Chaux-de-Fonds',
              deliveryType: 'delivery',
              total: 24.50,
              subTotal: 23.88,
              taxAmount: 0.62,
              isPaid: true,
              paymentMethod: 'Carte',
              items: [
                { name: 'POKÉMOONS SALMON', quantity: 1, price: 21.00 },
                { name: 'COCA-COLA 33CL', quantity: 1, price: 3.50 },
              ],
              note: 'Ticket de test Pokémoons',
            };
            try {
              const html = generateReceiptHTML(sampleOrder, settings, true);
              if (Platform.OS === 'web') {
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                document.body.appendChild(iframe);
                const doc = iframe.contentWindow?.document || iframe.contentDocument;
                if (doc) {
                  doc.open();
                  doc.write(html);
                  doc.close();
                  setTimeout(() => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    setTimeout(() => {
                      if (document.body.contains(iframe)) document.body.removeChild(iframe);
                    }, 3000);
                  }, 250);
                }
              } else {
                await Print.printAsync({ 
                  html, 
                  printerUrl: settings.selectedPrinterUrl || undefined 
                });
              }
            } catch (err: any) {
              console.error('Erreur test impression', err);
              if (Platform.OS === 'web') {
                alert('Erreur impression: ' + (err?.message || err));
              } else {
                Alert.alert('Erreur', err?.message || 'Impossible d\'imprimer');
              }
            }
          }}
        >
          <Text style={{ fontFamily: Theme.fonts.bodyBold, color: Theme.colors.primary, fontSize: 13 }}>🖨️ Tester l'impression d'un ticket de caisse</Text>
        </TouchableOpacity>
      </View>

      {/* SYSTÈME DE FIDÉLITÉ (TAMPONS) */}
      <Text style={styles.sectionHeader}>PROGRAMME DE FIDÉLITÉ (TAMPONS)</Text>
      <View style={styles.settingsCard}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Activer la Carte de Fidélité</Text>
            <Text style={styles.switchSubtitle}>Les clients gagnent 1 tampon par commande livrée.</Text>
          </View>
          <Switch 
            value={settings.loyaltyEnabled} 
            onValueChange={v => updateSettings({ loyaltyEnabled: v })}
            trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
            thumbColor={settings.loyaltyEnabled ? Theme.colors.success : Theme.colors.textSecondary} 
          />
        </View>
        <View style={[styles.switchRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border, paddingTop: 14, marginTop: 4 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Nombre de tampons requis</Text>
            <Text style={styles.switchSubtitle}>Généralement 10 pour un cadeau.</Text>
          </View>
          <TextInput 
            style={[styles.timeInput, { width: 60, backgroundColor: Theme.colors.surface }]} 
            value={String(settings.loyaltyMinPoints || 10)} 
            onChangeText={v => updateSettings({ loyaltyMinPoints: parseInt(v) || 10 })}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* HORAIRES */}
      <Text style={styles.sectionHeader}>HORAIRES D'OUVERTURE</Text>
      <View style={styles.settingsCard}>
        {settings.hours.map((h, i) => (
          <View key={h.day} style={[styles.hourRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border, marginTop: 12, paddingTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dayLabel}>{h.day}</Text>
              {h.isOpen && (
                <>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                    <TextInput
                      style={styles.timeInput}
                      value={h.open}
                      onChangeText={v => updateHours(h.day, { open: v })}
                      placeholder="11:00"
                      placeholderTextColor={Theme.colors.textSecondary}
                    />
                    <Text style={{ color: Theme.colors.textSecondary, lineHeight: 36 }}>→</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={h.close}
                      onChangeText={v => updateHours(h.day, { close: v })}
                      placeholder="23:00"
                      placeholderTextColor={Theme.colors.textSecondary}
                    />
                    {!h.hasSplitShift && (
                      <TouchableOpacity onPress={() => updateHours(h.day, { hasSplitShift: true, open2: '18:00', close2: '23:00' })} style={{ marginLeft: 8, padding: 8 }}>
                        <Ionicons name="add-circle-outline" size={20} color={Theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {h.hasSplitShift && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <TextInput
                        style={styles.timeInput}
                        value={h.open2 || ''}
                        onChangeText={v => updateHours(h.day, { open2: v })}
                        placeholder="18:00"
                        placeholderTextColor={Theme.colors.textSecondary}
                      />
                      <Text style={{ color: Theme.colors.textSecondary, lineHeight: 36 }}>→</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={h.close2 || ''}
                        onChangeText={v => updateHours(h.day, { close2: v })}
                        placeholder="23:00"
                        placeholderTextColor={Theme.colors.textSecondary}
                      />
                      <TouchableOpacity onPress={() => updateHours(h.day, { hasSplitShift: false })} style={{ marginLeft: 8, padding: 8 }}>
                        <Ionicons name="trash-outline" size={20} color={Theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
              {!h.isOpen && <Text style={styles.closedText}>Fermé</Text>}
            </View>
            <Switch
              value={h.isOpen}
              onValueChange={v => updateHours(h.day, { isOpen: v })}
              trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
              thumbColor={h.isOpen ? Theme.colors.success : Theme.colors.textSecondary}
            />
          </View>
        ))}
      </View>

      {/* ZONES DE LIVRAISON */}
      <Text style={styles.sectionHeader}>ZONES DE LIVRAISON</Text>
      <DeliveryZonesPanel />



      {/* ANNONCE / FERMETURE EXCEPTIONNELLE */}
      <Text style={styles.sectionHeader}>📢 ANNONCE / FERMETURE EXCEPTIONNELLE</Text>
      <View style={styles.settingsCard}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Afficher un message d'annonce</Text>
            <Text style={{ fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, marginTop: 4 }}>
              Le message s'affichera en haut du site pour tous les clients.
            </Text>
          </View>
          <Switch
            value={localAnnouncementEnabled}
            onValueChange={setLocalAnnouncementEnabled}
            trackColor={{ false: Theme.colors.surface, true: '#FF950044' }}
            thumbColor={localAnnouncementEnabled ? '#FF9500' : Theme.colors.textSecondary}
          />
        </View>
        {localAnnouncementEnabled && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border }}>
            <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>MESSAGE À AFFICHER</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              multiline
              numberOfLines={3}
              placeholder="Ex: Fermé du 5 au 20 août pour congés. On se retrouve à la rentrée ! 🌴"
              placeholderTextColor={Theme.colors.textSecondary}
              value={localAnnouncementMessage}
              onChangeText={setLocalAnnouncementMessage}
            />
            <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FF950015', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#FF9500' }}>
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: '#FF9500', marginBottom: 4 }}>⚠️ APERÇU DU BANDEAU</Text>
              <Text style={{ fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.text }}>
                {localAnnouncementMessage || '(message vide)'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* SAVE BUTTON */}
      <TouchableOpacity style={[styles.goldBtn, { marginTop: 24 }]} onPress={handleSave}>
        <Text style={styles.goldBtnText}>{saved ? '✓ SAUVEGARDÉ !' : 'SAUVEGARDER LES MODIFICATIONS'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ──────────────────────────────────
// DELIVERY ZONES PANEL
// ──────────────────────────────────
function DeliveryZonesPanel() {
  const { zones, updateZone, addZone, deleteZone, fetchZones } = useDeliveryZoneStore();

  React.useEffect(() => {
    fetchZones();
  }, []);

  const styles = StyleSheet.create({
    card: { backgroundColor: Theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, overflow: 'hidden', marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Theme.colors.border },
    zoneName: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.text },
    zoneMeta: { fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary, marginTop: 2 },
    badge: { fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.primary, backgroundColor: Theme.colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    input: { backgroundColor: Theme.colors.surface, borderRadius: 8, padding: 10, color: Theme.colors.text, fontFamily: Theme.fonts.body, fontSize: 13, borderWidth: 1, borderColor: Theme.colors.border },
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCp, setNewCp] = useState('');
  const [newMin, setNewMin] = useState('20');
  const [newFee, setNewFee] = useState('0');
  const [newTime, setNewTime] = useState('20');

  if (zones.length === 0) return (
    <Text style={{ color: Theme.colors.textSecondary, fontFamily: Theme.fonts.body, fontSize: 13, padding: 12 }}>
      Chargement des zones...
    </Text>
  );

  const handleAdd = async () => {
    if (!newName.trim() || !newCp.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner le nom de la zone et au moins un code postal (ex: 2300).');
      return;
    }
    const cida = newCp.split(/[,;\s]+/).map(s => s.trim()).filter(s => s.length > 0);
    if (cida.length === 0) {
      Alert.alert('Code postal invalide', 'Veuillez saisir au moins un code postal valide (ex: 2300).');
      return;
    }
    try {
      await addZone({
        name: newName.trim(),
        postalCodes: cida,
        minOrder: parseFloat(newMin) || 0,
        deliveryFee: parseFloat(newFee) || 0,
        estimatedTime: parseInt(newTime) || 30,
        active: true,
      });
      setIsAdding(false);
      setNewName(''); setNewCp(''); setNewMin('20'); setNewFee('0'); setNewTime('20');
      Alert.alert('Succès', 'Zone de livraison ajoutée avec succès !');
    } catch (err: any) {
      console.error('Erreur addZone:', err);
      Alert.alert('Erreur', err?.message || 'Impossible d\'enregistrer la zone.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Supprimer la zone', `Voulez-vous vraiment supprimer "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteZone(id) }
    ]);
  };

  return (
    <View style={styles.card}>
      {(zones || []).map((zone, i) => (
        <View key={zone.id || `zone-${i}`} style={[styles.row, i === zones.length - 1 && !isAdding && { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.zoneName}>{zone.name || 'Zone'}</Text>
            <Text style={styles.zoneMeta}>
              Min. {zone.minOrder || 0} CHF • {zone.deliveryFee === 0 ? 'Livraison offerte' : `${zone.deliveryFee} CHF`} • ~{zone.estimatedTime || 30} min
            </Text>
            <Text style={styles.zoneMeta} numberOfLines={1}>
              CP: {Array.isArray(zone.postalCodes) ? zone.postalCodes.join(', ') : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Switch
              value={zone.active !== false}
              onValueChange={(v) => updateZone(zone.id, { active: v })}
              trackColor={{ false: Theme.colors.surface, true: Theme.colors.success + '88' }}
              thumbColor={zone.active !== false ? Theme.colors.success : Theme.colors.textSecondary}
            />
            <TouchableOpacity onPress={() => handleDelete(zone.id, zone.name)} style={{ padding: 8 }}>
              <Ionicons name="trash-outline" size={20} color={Theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {isAdding ? (
        <View style={{ padding: 16, backgroundColor: Theme.colors.background }}>
          <Text style={[styles.zoneName, { marginBottom: 12 }]}>NOUVELLE ZONE</Text>
          <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Nom (ex: La Chaux-de-Fonds Centre)" value={newName} onChangeText={setNewName} />
          <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Codes postaux (ex: 2300, 2304)" value={newCp} onChangeText={setNewCp} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min. Commande (CHF)" value={newMin} onChangeText={setNewMin} keyboardType="numeric" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Frais (CHF)" value={newFee} onChangeText={setNewFee} keyboardType="numeric" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Temps (min)" value={newTime} onChangeText={setNewTime} keyboardType="numeric" />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
             <TouchableOpacity style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: Theme.colors.surface, borderRadius: 8 }} onPress={() => setIsAdding(false)}>
               <Text style={{ fontFamily: Theme.fonts.bodyBold, color: Theme.colors.text }}>Annuler</Text>
             </TouchableOpacity>
             <TouchableOpacity style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: Theme.colors.success, borderRadius: 8 }} onPress={handleAdd}>
               <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#FFF' }}>Ajouter</Text>
             </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={{ padding: 16, alignItems: 'center', backgroundColor: Theme.colors.background }} onPress={() => setIsAdding(true)}>
          <Text style={{ fontFamily: Theme.fonts.bodyBold, color: Theme.colors.primary }}>+ Ajouter une zone de livraison</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ──────────────────────────────────
// INGREDIENTS STOCK & MENU PANEL
// ──────────────────────────────────
function IngredientsStockPanel() {
  const { products, settings, toggleIngredientStock, addCustomIngredient, updateCustomIngredient, removeCustomIngredient } = useRestaurantStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSection, setSelectedSection] = useState('accompagnements');
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientPrice, setNewIngredientPrice] = useState('2.00');

  // State for editing an existing ingredient
  const [editingIngredient, setEditingIngredient] = useState<{ oldName: string; name: string; priceOffset: string } | null>(null);

  const pokeCustom = useMemo(() => {
    return products?.find(p => p.id === 'poke-custom') || INITIAL_PRODUCTS.find(p => p.id === 'poke-custom');
  }, [products]);

  const sections = pokeCustom?.customizationSections || [];

  const handleAddIngredient = async () => {
    if (!newIngredientName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom de l\'ingrédient.');
      return;
    }
    const price = parseFloat(newIngredientPrice) || 0;
    await addCustomIngredient(selectedSection, newIngredientName.trim(), price);
    setNewIngredientName('');
    setIsAdding(false);
    Alert.alert('Succès', `L'ingrédient "${newIngredientName.trim()}" a été ajouté au menu et au stock !`);
  };

  const handleSaveEdit = async () => {
    if (!editingIngredient || !editingIngredient.name.trim()) {
      Alert.alert('Erreur', 'Le nom de l\'ingrédient ne peut pas être vide.');
      return;
    }
    const price = parseFloat(editingIngredient.priceOffset) || 0;
    await updateCustomIngredient(editingIngredient.oldName, editingIngredient.name.trim(), price);
    Alert.alert('Succès', `L'ingrédient "${editingIngredient.name.trim()}" a été mis à jour.`);
    setEditingIngredient(null);
  };

  const handleRemoveIngredient = (ingName: string) => {
    Alert.alert(
      'Supprimer l\'ingrédient',
      `Voulez-vous vraiment supprimer définitivement "${ingName}" du menu et du stock ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive', 
          onPress: async () => {
            await removeCustomIngredient(ingName);
            Alert.alert('Supprimé', `"${ingName}" a été retiré du menu.`);
          } 
        }
      ]
    );
  };

  const panels = StyleSheet.create({
    card: { backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border },
    label: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.text, marginBottom: 6, letterSpacing: 0.5 },
    subtitle: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, marginBottom: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8, paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border },
    sectionTitle: { fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.primary, textTransform: 'uppercase' },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Theme.colors.background, paddingLeft: 10, paddingRight: 4, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Theme.colors.border },
    chipOut: { backgroundColor: Theme.colors.danger + '15', borderColor: Theme.colors.danger },
    chipText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 12, color: Theme.colors.text },
    chipTextOut: { color: Theme.colors.danger, textDecorationLine: 'line-through' },
    actionBtn: { padding: 4 },
    addForm: { backgroundColor: Theme.colors.background, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border },
    input: { backgroundColor: Theme.colors.surface, borderRadius: 8, padding: 10, color: Theme.colors.text, fontFamily: Theme.fonts.body, fontSize: 13, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 8 },
  });

  return (
    <View style={panels.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={panels.label}>🥗 GESTION DU STOCK & INGRÉDIENTS</Text>
        <TouchableOpacity 
          style={{ backgroundColor: isAdding ? Theme.colors.surface : Theme.colors.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
          onPress={() => {
            setIsAdding(!isAdding);
            setEditingIngredient(null);
          }}
        >
          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: isAdding ? Theme.colors.text : '#FFF' }}>
            {isAdding ? 'Fermer' : '+ Ajouter un ingrédient'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={panels.subtitle}>
        Appuyez sur un ingrédient pour basculer <Text style={{ color: Theme.colors.danger, fontWeight: 'bold' }}>Rupture</Text> / <Text style={{ color: Theme.colors.success, fontWeight: 'bold' }}>En Stock</Text>. Cliquez sur ✏️ pour modifier son nom/prix ou 🗑️ pour le supprimer.
      </Text>

      {/* FORMULAIRE DE MODIFICATION D'INGRÉDIENT */}
      {editingIngredient && (
        <View style={[panels.addForm, { borderColor: Theme.colors.primary, borderWidth: 1.5 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.primary }}>
              ✏️ MODIFIER : {editingIngredient.oldName}
            </Text>
            <TouchableOpacity onPress={() => setEditingIngredient(null)}>
              <Ionicons name="close-circle" size={20} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary, marginBottom: 4 }}>Nom :</Text>
          <TextInput
            style={panels.input}
            placeholder="Nom de l'ingrédient"
            placeholderTextColor={Theme.colors.textSecondary}
            value={editingIngredient.name}
            onChangeText={(val) => setEditingIngredient({ ...editingIngredient, name: val })}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Text style={{ fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary }}>Prix supplément (CHF) :</Text>
            <TextInput
              style={[panels.input, { width: 90, marginBottom: 0, paddingVertical: 6, textAlign: 'center' }]}
              placeholder="0.00"
              placeholderTextColor={Theme.colors.textSecondary}
              keyboardType="numeric"
              value={editingIngredient.priceOffset}
              onChangeText={(val) => setEditingIngredient({ ...editingIngredient, priceOffset: val })}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: Theme.colors.surface, padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border }}
              onPress={() => setEditingIngredient(null)}
            >
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: Theme.colors.primary, padding: 10, borderRadius: 8, alignItems: 'center' }}
              onPress={handleSaveEdit}
            >
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: '#000' }}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FORMULAIRE D'AJOUT D'INGRÉDIENT */}
      {isAdding && (
        <View style={panels.addForm}>
          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.text, marginBottom: 8 }}>
            AJOUTER UN INGRÉDIENT AU MENU
          </Text>
          
          <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary, marginBottom: 4 }}>Section :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {sections.map((sec: any, idx: number) => {
              const isSel = selectedSection === sec.title;
              return (
                <TouchableOpacity
                  key={idx}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginRight: 6,
                    backgroundColor: isSel ? Theme.colors.primary : Theme.colors.surface,
                    borderWidth: 1, borderColor: isSel ? Theme.colors.primary : Theme.colors.border
                  }}
                  onPress={() => {
                    setSelectedSection(sec.title);
                    if (sec.title.toLowerCase().includes('base')) setNewIngredientPrice('0');
                    else if (sec.title.toLowerCase().includes('protéine')) setNewIngredientPrice('6.00');
                    else if (sec.title.toLowerCase().includes('accompagnement')) setNewIngredientPrice('2.00');
                    else if (sec.title.toLowerCase().includes('topping')) setNewIngredientPrice('1.00');
                    else if (sec.title.toLowerCase().includes('sauce')) setNewIngredientPrice('0.50');
                  }}
                >
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: isSel ? '#000' : Theme.colors.text }}>
                    {sec.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TextInput
            style={panels.input}
            placeholder="Nom de l'ingrédient (ex: Mangue, Falafel...)"
            placeholderTextColor={Theme.colors.textSecondary}
            value={newIngredientName}
            onChangeText={setNewIngredientName}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Text style={{ fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary }}>Prix supplément (CHF) :</Text>
            <TextInput
              style={[panels.input, { width: 90, marginBottom: 0, paddingVertical: 6, textAlign: 'center' }]}
              placeholder="0.00"
              placeholderTextColor={Theme.colors.textSecondary}
              keyboardType="numeric"
              value={newIngredientPrice}
              onChangeText={setNewIngredientPrice}
            />
          </View>

          <TouchableOpacity
            style={{ backgroundColor: Theme.colors.success, padding: 10, borderRadius: 8, alignItems: 'center' }}
            onPress={handleAddIngredient}
          >
            <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: '#FFF' }}>
              Enregistrer dans le menu
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LISTE DES INGRÉDIENTS PAR SECTION */}
      {sections.map((sec: any, sIdx: number) => {
        const choices = sec.choices || [];
        if (choices.length === 0) return null;
        return (
          <View key={sIdx}>
            <View style={panels.sectionHeader}>
              <Text style={panels.sectionTitle}>{sec.title} ({choices.length})</Text>
            </View>
            <View style={panels.chipContainer}>
              {choices.map((choice: any, cIdx: number) => {
                const ingName = choice.name;
                const isOut = settings?.outOfStockIngredients?.includes(ingName);
                return (
                  <View key={cIdx} style={[panels.chip, isOut && panels.chipOut]}>
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      onPress={() => toggleIngredientStock(ingName)}
                    >
                      <Text style={[panels.chipText, isOut && panels.chipTextOut]}>
                        {ingName} {choice.priceOffset > 0 ? `(+${choice.priceOffset.toFixed(2)})` : ''}
                      </Text>
                      {isOut && <Ionicons name="close-circle" size={15} color={Theme.colors.danger} />}
                    </TouchableOpacity>
                    
                    {/* BOUTON MODIFIER */}
                    <TouchableOpacity 
                      style={panels.actionBtn}
                      onPress={() => {
                        setEditingIngredient({
                          oldName: ingName,
                          name: ingName,
                          priceOffset: choice.priceOffset?.toString() || '0'
                        });
                        setIsAdding(false);
                      }}
                    >
                      <Ionicons name="pencil" size={13} color={Theme.colors.primary} />
                    </TouchableOpacity>

                    {/* BOUTON SUPPRIMER */}
                    <TouchableOpacity 
                      style={panels.actionBtn}
                      onPress={() => handleRemoveIngredient(ingName)}
                    >
                      <Ionicons name="trash-outline" size={13} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ──────────────────────────────────
// POKÉMOONS DU MOIS PANEL (ADMIN)
// ──────────────────────────────────
function PokeOfTheMonthPanel() {
  const { settings, products, updatePokeOfTheMonth } = useRestaurantStore();
  const cfg = settings?.pokeOfTheMonth || {
    enabled: true,
    productId: 'poke-salmon',
    monthLabel: 'SEPTEMBRE 2026',
    badgeText: 'ÉDITION DU MOIS ⭐',
    tagline: 'Recette exclusive du Chef & Ingrédients de saison',
    customTitle: '',
    customDescription: '',
  };

  const [isOpen, setIsOpen] = useState(false);
  const [enabled, setEnabled] = useState(cfg.enabled);
  const [productId, setProductId] = useState(cfg.productId || 'poke-salmon');
  const [monthLabel, setMonthLabel] = useState(cfg.monthLabel || 'SEPTEMBRE 2026');
  const [customTitle, setCustomTitle] = useState(cfg.customTitle || '');
  const [tagline, setTagline] = useState(cfg.tagline || 'Recette exclusive du Chef & Ingrédients de saison');
  const [badgeText, setBadgeText] = useState(cfg.badgeText || 'ÉDITION DU MOIS ⭐');
  const [customDescription, setCustomDescription] = useState(cfg.customDescription || '');

  React.useEffect(() => {
    if (settings?.pokeOfTheMonth) {
      setEnabled(settings.pokeOfTheMonth.enabled);
      setProductId(settings.pokeOfTheMonth.productId || 'poke-salmon');
      setMonthLabel(settings.pokeOfTheMonth.monthLabel || 'SEPTEMBRE 2026');
      setCustomTitle(settings.pokeOfTheMonth.customTitle || '');
      setTagline(settings.pokeOfTheMonth.tagline || 'Recette exclusive du Chef & Ingrédients de saison');
      setBadgeText(settings.pokeOfTheMonth.badgeText || 'ÉDITION DU MOIS ⭐');
      setCustomDescription(settings.pokeOfTheMonth.customDescription || '');
    }
  }, [settings?.pokeOfTheMonth]);

  const selectedProd = products.find(p => p.id === productId) || products[0];

  const handleSave = async () => {
    await updatePokeOfTheMonth({
      enabled,
      productId,
      monthLabel: monthLabel.trim(),
      customTitle: customTitle.trim(),
      tagline: tagline.trim(),
      badgeText: badgeText.trim(),
      customDescription: customDescription.trim(),
    });
    Alert.alert('Succès', 'Le Pokémoons du Mois a été mis à jour et est affiché sur l\'accueil du site et de l\'application !');
    setIsOpen(false);
  };

  const pStyles = StyleSheet.create({
    container: {
      backgroundColor: '#0F172A',
      borderRadius: 18,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1.5,
      borderColor: '#334155',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      fontFamily: Theme.fonts.bodyBold,
      fontSize: 14,
      color: '#FFD700',
      letterSpacing: 0.5,
    },
    subTitle: {
      fontFamily: Theme.fonts.body,
      fontSize: 12,
      color: '#94A3B8',
      marginTop: 2,
    },
    form: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderColor: '#334155',
    },
    fieldLabel: {
      fontFamily: Theme.fonts.bodyBold,
      fontSize: 11,
      color: '#94A3B8',
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: '#1E293B',
      borderRadius: 10,
      padding: 10,
      color: '#FFF',
      fontFamily: Theme.fonts.body,
      fontSize: 13,
      borderWidth: 1,
      borderColor: '#475569',
      marginBottom: 12,
    },
    prodPicker: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    prodCard: {
      width: 100,
      backgroundColor: '#1E293B',
      borderRadius: 12,
      padding: 8,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#334155',
    },
    prodCardActive: {
      borderColor: '#10B981',
      backgroundColor: '#064E3B',
    },
    prodCardImg: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginBottom: 6,
    },
    prodCardText: {
      fontFamily: Theme.fonts.bodyBold,
      fontSize: 10,
      color: '#FFF',
      textAlign: 'center',
    },
    saveBtn: {
      backgroundColor: '#10B981',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    saveBtnText: {
      fontFamily: Theme.fonts.bodyBold,
      fontSize: 13,
      color: '#000',
    }
  });

  return (
    <View style={pStyles.container}>
      <View style={pStyles.header}>
        <View style={pStyles.titleRow}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <View>
            <Text style={pStyles.title}>🌟 POKÉMOONS DU MOIS</Text>
            <Text style={pStyles.subTitle}>
              {enabled ? `Actif (${monthLabel} : ${customTitle || selectedProd?.name || 'Sélectionné'})` : 'Désactivé'}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={{ backgroundColor: isOpen ? '#334155' : '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
          onPress={() => setIsOpen(!isOpen)}
        >
          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: isOpen ? '#FFF' : '#000' }}>
            {isOpen ? 'Fermer' : 'Gérer'}
          </Text>
        </TouchableOpacity>
      </View>

      {isOpen && (
        <View style={pStyles.form}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: '#FFF' }}>Afficher sur l'accueil du site & app :</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#334155', true: '#10B98188' }}
              thumbColor={enabled ? '#10B981' : '#94A3B8'}
            />
          </View>

          <Text style={pStyles.fieldLabel}>Choisir le bowl à mettre à l'honneur :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={pStyles.prodPicker}>
              {products.map(p => {
                const isSel = productId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[pStyles.prodCard, isSel && pStyles.prodCardActive]}
                    onPress={() => setProductId(p.id)}
                  >
                    <Image source={getImageSource(p.image)} style={pStyles.prodCardImg} contentFit="cover" />
                    <Text style={pStyles.prodCardText} numberOfLines={2}>{p.name}</Text>
                    <Text style={{ color: '#10B981', fontSize: 10, fontFamily: Theme.fonts.bodyBold, marginTop: 2 }}>{p.price.toFixed(2)} CHF</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Text style={pStyles.fieldLabel}>Mois / Label (ex: SEPTEMBRE 2026) :</Text>
          <TextInput
            style={pStyles.input}
            placeholder="SEPTEMBRE 2026"
            placeholderTextColor="#64748B"
            value={monthLabel}
            onChangeText={setMonthLabel}
          />

          <Text style={pStyles.fieldLabel}>Badge supérieur (ex: ÉDITION DU MOIS ⭐) :</Text>
          <TextInput
            style={pStyles.input}
            placeholder="ÉDITION DU MOIS ⭐"
            placeholderTextColor="#64748B"
            value={badgeText}
            onChangeText={setBadgeText}
          />

          <Text style={pStyles.fieldLabel}>Titre personnalisé (ou laisser vide pour nom du produit) :</Text>
          <TextInput
            style={pStyles.input}
            placeholder={selectedProd?.name || 'Nom du produit'}
            placeholderTextColor="#64748B"
            value={customTitle}
            onChangeText={setCustomTitle}
          />

          <Text style={pStyles.fieldLabel}>Sous-titre / Accroche du Chef :</Text>
          <TextInput
            style={pStyles.input}
            placeholder="Recette exclusive du Chef & Ingrédients de saison"
            placeholderTextColor="#64748B"
            value={tagline}
            onChangeText={setTagline}
          />

          <Text style={pStyles.fieldLabel}>Description personnalisée :</Text>
          <TextInput
            style={[pStyles.input, { height: 70, textAlignVertical: 'top' }]}
            placeholder={selectedProd?.description || 'Description du bowl...'}
            placeholderTextColor="#64748B"
            multiline
            value={customDescription}
            onChangeText={setCustomDescription}
          />

          <TouchableOpacity style={pStyles.saveBtn} onPress={handleSave}>
            <Text style={pStyles.saveBtnText}>Enregistrer le Pokémoons du Mois</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────
// SAUCES & BOISSONS PANEL
// ──────────────────────────────────
function SaucesDrinksPanel() {
  const { settings, updateSauces } = useRestaurantStore();
  const sauces = settings?.sauces || [];
  const [newSauce, setNewSauce] = useState('');

  const addSauce = () => {
    if (!newSauce.trim()) return;
    updateSauces([...sauces, newSauce.trim()]);
    setNewSauce('');
  };

  const removeSauce = (name: string) => {
    updateSauces(sauces.filter((s: string) => s !== name));
  };

  const panels = StyleSheet.create({
    card: { backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border },
    label: { fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text, marginBottom: 12, letterSpacing: 1 },
    inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    input: { flex: 1, backgroundColor: Theme.colors.background, borderRadius: 8, padding: 10, color: Theme.colors.text, fontFamily: Theme.fonts.body, fontSize: 13, borderWidth: 1, borderColor: Theme.colors.border },
    addBtn: { backgroundColor: Theme.colors.success, width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Theme.colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Theme.colors.border },
    chipText: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.text },
  });

  return (
    <View>
      <View style={panels.card}>
        <Text style={panels.label}>SAUCES DISPONIBLES</Text>
        <View style={panels.inputRow}>
          <TextInput 
            style={panels.input} 
            value={newSauce} 
            onChangeText={setNewSauce} 
            placeholder="Ajouter une sauce..." 
            placeholderTextColor={Theme.colors.textSecondary} 
          />
          <TouchableOpacity style={panels.addBtn} onPress={addSauce}>
            <Ionicons name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={panels.chipContainer}>
          {sauces.map((s: string) => (
            <View key={s} style={panels.chip}>
              <Text style={panels.chipText}>{s}</Text>
              <TouchableOpacity onPress={() => removeSauce(s)}>
                <Ionicons name="close-circle" size={16} color={Theme.colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function SettingField({ label, value, onChange, keyboard, last }: {
  label: string; value: string; onChange: (v: string) => void; keyboard?: any; last?: boolean;
}) {
  return (
    <View style={[styles.settingFieldRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Theme.colors.border, marginBottom: 14, paddingBottom: 14 }]}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        style={styles.settingInput}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={Theme.colors.textSecondary}
        keyboardType={keyboard}
      />
    </View>
  );
}

// ──────────────────────────────────
// STYLES
// ──────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },

  // SaaS Desktop
  saasSidebar: { width: 260, backgroundColor: Theme.colors.surface, borderRightWidth: 1, borderColor: Theme.colors.border, paddingTop: 32 },
  saasSidebarHeader: { paddingHorizontal: 24, marginBottom: 40 },
  saasLogo: { fontFamily: Theme.fonts.logo, fontSize: 32, color: Theme.colors.text, letterSpacing: 4 },
  saasLogoSub: { fontFamily: Theme.fonts.bodyBold, fontSize: 10, color: Theme.colors.success, letterSpacing: 6, marginTop: -4 },
  saasSidebarNav: { flex: 1, paddingHorizontal: 16 },
  saasSidebarNavItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  saasSidebarNavItemActive: { backgroundColor: Theme.colors.success + '1A', borderWidth: 1, borderColor: Theme.colors.success + '33' },
  saasSidebarNavLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.textSecondary },
  saasSidebarNavLabelActive: { color: Theme.colors.success, fontFamily: Theme.fonts.bodyBold },
  saasSidebarExit: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: Theme.colors.border },
  saasSidebarExitText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.textSecondary },
  
  saasMainContent: { flex: 1, backgroundColor: Theme.colors.background },
  saasTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 20, backgroundColor: Theme.colors.surface, borderBottomWidth: 1, borderColor: Theme.colors.border },
  saasTopBarTitle: { fontFamily: Theme.fonts.title, fontSize: 24, color: Theme.colors.text },
  saasAdminBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Theme.colors.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  saasAdminBadgeText: { fontFamily: Theme.fonts.bodyBold, fontSize: 10, color: '#FFF', letterSpacing: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Theme.colors.border },
  headerTitle: { fontFamily: Theme.fonts.logo, fontSize: 20, color: Theme.colors.text, letterSpacing: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // TAB BAR
  tabBarWrapper: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Theme.colors.border, backgroundColor: Theme.colors.background },
  tabBarScroll: { paddingHorizontal: 12 },
  tabBtn: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 4, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Theme.colors.success },
  tabLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 11, color: Theme.colors.textSecondary },
  tabLabelActive: { color: Theme.colors.success, fontFamily: Theme.fonts.bodyBold },

  scrollContent: { padding: Platform.OS === 'web' ? 32 : 16 },

  // COMMON ADMIN STYLES
  sectionHeader: { fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, letterSpacing: 2, marginBottom: 12, marginTop: 16 },
  statusPill: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 11 },

  // DASHBOARD PREMIUM OVERRIDE
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, minWidth: Platform.OS === 'web' ? 200 : '47%', backgroundColor: Theme.colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Theme.colors.border },
  statValue: { fontFamily: Theme.fonts.title, fontSize: 24, marginBottom: 4 },
  statLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 12, color: Theme.colors.textSecondary },
  
  chartCard: { backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 32, borderWidth: 1, borderColor: Theme.colors.border },
  fakeChart: { height: 200, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 20, position: 'relative' },
  chartGridLines: { ...(StyleSheet.absoluteFill as any), justifyContent: 'space-between', borderBottomWidth: 1, borderColor: Theme.colors.border, paddingBottom: 24 },
  chartGridLine: { height: 1, backgroundColor: Theme.colors.border, opacity: 0.5 },
  chartBarWrapper: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end', zIndex: 2 },
  chartBar: { width: 32, backgroundColor: Theme.colors.primary, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  chartLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 12, color: Theme.colors.textSecondary, marginTop: 12 },
  
  recentActivityCard: { backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Theme.colors.border, minHeight: 400 },
  activityRow: { flexDirection: 'row', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderColor: Theme.colors.border + '55', alignItems: 'center' },
  activityDotWrapper: { width: 32, height: 32, borderRadius: 16, backgroundColor: Theme.colors.success + '1A', alignItems: 'center', justifyContent: 'center' },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.colors.success },
  activityInfo: { flex: 1 },
  activityTitle: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.text },
  activityDesc: { fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, marginTop: 4 },
  activityAmount: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.text },
  
  // ORDERS TAB
  orderCard: { backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border },
  orderCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderId: { fontFamily: Theme.fonts.bodyBold, fontSize: 15, color: Theme.colors.text },
  orderCustomer: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.text, marginBottom: 4 },
  orderMeta: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, marginBottom: 6 },
  orderItemsList: { fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, marginBottom: 8 },
  orderNote: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.success, marginBottom: 8 },
  orderCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  orderTotal: { fontFamily: Theme.fonts.bodyBold, fontSize: 15, color: Theme.colors.success },
  orderTime: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary },
  orderActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  advanceBtn: { flex: 1, backgroundColor: Theme.colors.success, paddingVertical: 10, borderRadius: 100, alignItems: 'center' },
  advanceBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: '#FFF' },
  cancelOrderBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.danger, borderRadius: 20 },
  payBtn: { flex: 1, backgroundColor: '#E0E0E0', paddingVertical: 10, borderRadius: 100, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  payBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: '#121212' },
  receiptIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Theme.colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Theme.colors.border },
  receiptIconText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 12, color: Theme.colors.textSecondary },

  // DATA TABLE CLASSES
  dataTableWrapper: { backgroundColor: Theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Theme.colors.background, borderBottomWidth: 1, borderColor: Theme.colors.border },
  th: { fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: Theme.colors.textSecondary, letterSpacing: 1 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: Theme.colors.border, alignItems: 'center' },
  tdId: { fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text },
  tdTime: { fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary, marginTop: 2 },
  tdTitle: { fontFamily: Theme.fonts.bodyMedium, fontSize: 13, color: Theme.colors.text },
  tdSub: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, marginTop: 2 },
  iconCircleBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center', justifyContent: 'center' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 100, backgroundColor: Theme.colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  filterBtnActive: { backgroundColor: Theme.colors.success, borderColor: Theme.colors.success },
  filterText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 13, color: Theme.colors.textSecondary },
  filterTextActive: { color: '#000' },
  callBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Theme.colors.success + '22', borderWidth: 1, borderColor: Theme.colors.success + '44', alignItems: 'center', justifyContent: 'center' },
  callBtnLg: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: Theme.colors.success, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  callBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: '#000' },

  // MENU
  menuCategoryBar: { backgroundColor: Theme.colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Theme.colors.border },
  catPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: Theme.colors.border, backgroundColor: 'transparent' },
  catPillActive: { backgroundColor: Theme.colors.success, borderColor: Theme.colors.success },
  catPillText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 12, color: Theme.colors.textSecondary },
  catPillTextActive: { color: '#FFF' },
  addCatBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: Theme.colors.success, alignItems: 'center', justifyContent: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, borderRadius: 12, padding: 12, marginBottom: 10, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border },
  menuItemImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: Theme.colors.background },
  menuItemInfo: { flex: 1 },
  menuItemName: { fontFamily: Theme.fonts.title, fontSize: 16, color: Theme.colors.text, marginBottom: 2 },
  menuItemDesc: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, marginBottom: 4 },
  menuItemPrice: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: Theme.colors.success },
  menuItemActions: { gap: 8 },
  editBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Theme.colors.success + '22', borderWidth: 1, borderColor: Theme.colors.success + '44', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Theme.colors.danger + '22', borderWidth: 1, borderColor: Theme.colors.danger + '44', alignItems: 'center', justifyContent: 'center' },
  stockBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Theme.colors.success, alignItems: 'center', justifyContent: 'center', shadowColor: Theme.colors.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: Theme.colors.surface, borderRadius: 20, padding: 24, width: '85%', gap: 16 },
  modalTitle: { fontFamily: Theme.fonts.logo, fontSize: 20, color: Theme.colors.text, letterSpacing: 3 },
  modalInput: { backgroundColor: Theme.colors.background, borderRadius: 10, padding: 14, fontFamily: Theme.fonts.body, color: Theme.colors.text, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 100, borderWidth: 1, borderColor: Theme.colors.border },
  modalCancelText: { fontFamily: Theme.fonts.bodyMedium, color: Theme.colors.textSecondary },

  // SETTINGS
  settingsCard: { backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border },
  settingFieldRow: {},
  settingInput: { fontFamily: Theme.fonts.bodyMedium, fontSize: 15, color: Theme.colors.text, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 15, color: Theme.colors.text, flex: 1 },
  switchSubtitle: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, marginTop: 2 },
  hourRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  dayLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 15, color: Theme.colors.text },
  closedText: { fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, marginTop: 4 },
  timeInput: { backgroundColor: Theme.colors.background, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontFamily: Theme.fonts.body, color: Theme.colors.text, width: 70, textAlign: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border },

  // PRODUCT FORM
  imagePicker: { width: '100%', height: 180, backgroundColor: Theme.colors.surface, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: Theme.colors.border, borderStyle: 'dashed' },
  imagePickerText: { fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, marginTop: 8 },
  fieldLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, letterSpacing: 2, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: Theme.colors.surface, padding: 14, fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.text, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, borderRadius: 12 },

  // SHARED
  goldBtn: { backgroundColor: Theme.colors.success, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 100, alignItems: 'center', shadowColor: Theme.colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  goldBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 15, color: '#FFF', letterSpacing: 0.5 },
  sectionTitle: { fontFamily: Theme.fonts.title, fontSize: 24, color: Theme.colors.text, letterSpacing: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: Theme.fonts.title, fontSize: 24, color: Theme.colors.text, letterSpacing: 2 },
  emptySubtitle: { fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.textSecondary, textAlign: 'center', marginTop: 16 },
  // Kanban KDS Styles
  kanbanBoard: { flex: 1, flexDirection: 'row', padding: 20, gap: 20 },
  kanbanCol: { flex: 1, backgroundColor: Theme.colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Theme.colors.border },
  kanbanHeader: { padding: 16, borderBottomWidth: 3, backgroundColor: Theme.colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kanbanTitle: { fontFamily: Theme.fonts.logo, fontSize: 13, color: Theme.colors.text, letterSpacing: 1.5 },
  kanbanCount: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  kanbanCountText: { fontFamily: Theme.fonts.bodyBold, fontSize: 12 },
  
  kTicket: { backgroundColor: Theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  kTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  kId: { fontFamily: Theme.fonts.bodyBold, fontSize: 16, color: Theme.colors.text },
  kTime: { fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary },
  kTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  kTypeText: { fontFamily: Theme.fonts.bodyBold, fontSize: 9, letterSpacing: 0.5 },
  kDivider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: 10, borderStyle: 'dashed' },
  kItems: { gap: 4 },
  kItem: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.text },
  kItemQty: { color: Theme.colors.success, fontFamily: Theme.fonts.bodyBold },
  kItemNote: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, marginLeft: 24, fontStyle: 'italic' },
  kNoteContainer: { marginTop: 12, padding: 10, backgroundColor: Theme.colors.primary + '11', borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.primary + '33' },
  kNoteLabel: { fontFamily: Theme.fonts.bodyBold, fontSize: 9, color: Theme.colors.primary, letterSpacing: 1, marginBottom: 4 },
  kNoteText: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.text },
  kBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  kBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: '#fff', letterSpacing: 0.5 },
});

// ──────────────────────────────────
// TAB: CMS (SITE WEB)
// ──────────────────────────────────
function CmsTab() {
  const { content, updateContent } = useContentStore();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [localContent, setLocalContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateContent(localContent);
      Alert.alert('Succès', 'Le site a été mis à jour avec succès !');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <Text style={styles.sectionTitle}>Gestion du Site (CMS)</Text>
        <TouchableOpacity style={[styles.goldBtn, { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }]} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#000" /> : <Text style={styles.goldBtnText}>Publier en direct</Text>}
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionHeader, { color: Theme.colors.success }]}>
        <Ionicons name="image-outline" size={20} /> BANNIÈRE PRINCIPALE (HERO)
      </Text>
      <View style={styles.settingsCard}>
        <Text style={styles.fieldLabel}>Titre principal (ex: L'ART DU POKÉ BOWL)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Theme.colors.background, marginBottom: 16 }]}
          value={localContent.heroTitle}
          onChangeText={t => setLocalContent({ ...localContent, heroTitle: t })}
        />
        
        <Text style={styles.fieldLabel}>Sous-titre (ex: DEPUIS 4 ANS)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Theme.colors.background, marginBottom: 16 }]}
          value={localContent.heroSubtitle}
          onChangeText={t => setLocalContent({ ...localContent, heroSubtitle: t })}
        />

        <Text style={styles.fieldLabel}>Texte du bouton principal</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Theme.colors.background, marginBottom: 16 }]}
          value={localContent.heroButtonText}
          onChangeText={t => setLocalContent({ ...localContent, heroButtonText: t })}
        />
        
        <Text style={styles.fieldLabel}>URL de l'image de fond (ou choisissez une image)</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return Alert.alert('Erreur', 'Permission refusée');
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            try {
              Alert.alert('Upload en cours...', 'Veuillez patienter');
              const uri = result.assets[0].uri;
              const downloadUrl = await uploadImageAsync(uri, `hero/${Date.now()}.jpg`);
              setLocalContent({ ...localContent, heroImage: downloadUrl });
              Alert.alert('Succès', 'Image téléchargée.');
            } catch (err) {
              Alert.alert('Erreur', 'Échec du téléchargement');
            }
          }
        }}>
          {localContent.heroImage ? (
            <Image source={{ uri: localContent.heroImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color={Theme.colors.textSecondary} />
              <Text style={styles.imagePickerText}>Choisir une image...</Text>
            </>
          )}
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: Theme.colors.background }]}
          value={localContent.heroImage}
          onChangeText={t => setLocalContent({ ...localContent, heroImage: t })}
          placeholder="https://..."
        />
      </View>

      <Text style={[styles.sectionHeader, { color: Theme.colors.success, marginTop: 32 }]}>
        <Ionicons name="star-outline" size={20} /> WIDGETS DE CONCEPT (3 BLOCS)
      </Text>
      
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
        {localContent.values.map((val, idx) => (
          <View key={val.id} style={[styles.settingsCard, { flex: 1, borderWidth: 1, borderColor: Theme.colors.border + '55' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
               <View style={{ backgroundColor: Theme.colors.success + '22', padding: 8, borderRadius: 8 }}>
                 <Ionicons name={val.icon as any} size={24} color={Theme.colors.success} />
               </View>
               <Text style={[styles.fieldLabel, { color: Theme.colors.success, marginBottom: 0 }]}>Widget {idx + 1}</Text>
            </View>
            
            <Text style={styles.fieldLabel}>Nom de l'icône (Ionicons)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Theme.colors.background, marginBottom: 12 }]}
              value={val.icon}
              onChangeText={t => {
                const newValues = [...localContent.values];
                newValues[idx].icon = t;
                setLocalContent({ ...localContent, values: newValues });
              }}
            />

            <Text style={styles.fieldLabel}>Titre court</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Theme.colors.background, marginBottom: 12 }]}
              value={val.title}
              onChangeText={t => {
                const newValues = [...localContent.values];
                newValues[idx].title = t;
                setLocalContent({ ...localContent, values: newValues });
              }}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80, backgroundColor: Theme.colors.background, textAlignVertical: 'top' }]}
              multiline
              value={val.description}
              onChangeText={t => {
                const newValues = [...localContent.values];
                newValues[idx].description = t;
                setLocalContent({ ...localContent, values: newValues });
              }}
            />
          </View>
        ))}
      </View>

      <Text style={[styles.sectionHeader, { color: Theme.colors.success, marginTop: 32 }]}>
        <Ionicons name="information-circle-outline" size={20} /> PIED DE PAGE (FOOTER)
      </Text>
      <View style={styles.settingsCard}>
        <Text style={styles.fieldLabel}>Ville (ex: LA CHAUX-DE-FONDS)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Theme.colors.background, marginBottom: 16 }]}
          value={localContent.footerCity}
          onChangeText={t => setLocalContent({ ...localContent, footerCity: t })}
        />
        <Text style={styles.fieldLabel}>Téléphone de contact</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Theme.colors.background }]}
          value={localContent.footerPhone}
          onChangeText={t => setLocalContent({ ...localContent, footerPhone: t })}
        />
      </View>
      
    </ScrollView>
  );
}
