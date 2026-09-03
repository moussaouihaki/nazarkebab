import { Stack, useSegments } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, ActivityIndicator, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import React, { useEffect, useRef } from 'react';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import DesktopHeader from '../components/DesktopHeader';
import { GlobalBanners } from '../components/GlobalBanners';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuthStore, User } from '../store/useAuthStore';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { useCartStore } from '../store/useCartStore';
import { registerForPushNotificationsAsync } from '../lib/pushNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationStore } from '../store/useNotificationStore';

// Doit être appelé AVANT tout composant pour que les notifs s'affichent
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}


LogBox.ignoreLogs([
  '@firebase/firestore: Firestore',
  'FirebaseError: [code=permission-denied]',
  'Uncaught Error in snapshot listener',
  'No native splash screen registered',
  'Missing or insufficient permissions'
]);

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(
    document.createTextNode(
      `@font-face {
        font-family: 'Ionicons';
        src: url('/fonts/Ionicons.ttf') format('truetype');
      }`
    )
  );
  document.head.appendChild(style);
}

export default function RootLayout() {
  const segments = useSegments();
  const hideHeader = segments[0] === 'admin';

  const [loaded, error] = useFonts({
    BebasNeue_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    ...Ionicons.font,
  });

  const { setUser, user: currentUser } = useAuthStore();
  const { fetchInitialData } = useRestaurantStore();
  const { listenToOrders } = useCartStore();

  useEffect(() => {
    // 1. Écouter les changements d'auth Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          try {
            const pushToken = await registerForPushNotificationsAsync();
            if (pushToken && pushToken !== userData.pushToken) {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { pushToken });
              userData.pushToken = pushToken;
            }
          } catch(e) {
            console.log('Erreur silencieuse Push Token', e);
          }
          setUser(userData);
        }
      } else {
        setUser(null);
      }
    });

    // 2. Charger les données du restaurant (menu, réglages)
    fetchInitialData();

    // 3. Hydrater les notifications depuis le stockage local
    useNotificationStore.getState().hydrate();

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const activeOrder = useCartStore(state => state.activeOrder);
  const setActiveOrderById = useCartStore(state => state.setActiveOrderById);

  // Manual Persistence Implementation
  useEffect(() => {
    const restoreOrder = async () => {
      try {
        let savedId = null;
        if (Platform.OS === 'web') {
          savedId = localStorage.getItem('last_active_order_id');
        } else {
          savedId = await AsyncStorage.getItem('last_active_order_id');
        }
        if (savedId && !activeOrder) {
          await setActiveOrderById(savedId);
        }
      } catch (e) { console.warn('Manual restore failed', e); }
    };
    if (!currentUser) restoreOrder();
  }, [currentUser, activeOrder, setActiveOrderById]);

  useEffect(() => {
    const saveOrder = async () => {
      try {
        if (activeOrder?.id) {
          if (Platform.OS === 'web') {
            localStorage.setItem('last_active_order_id', activeOrder.id);
          } else {
            await AsyncStorage.setItem('last_active_order_id', activeOrder.id);
          }
        }
      } catch (e) {}
    };
    saveOrder();
  }, [activeOrder?.id]);

  useEffect(() => {
    let unsubscribeOrders: (() => void) | undefined;
    
    if (currentUser) {
      unsubscribeOrders = listenToOrders(currentUser.id, currentUser.role === 'admin');
    } else if (activeOrder?.id) {
      unsubscribeOrders = listenToOrders(undefined, false, activeOrder.id);
    }

    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [currentUser, activeOrder?.id, listenToOrders]);

  const seenNotifications = useRef(new Set<string>());

  useEffect(() => {
    const addIfNew = (id: string, title?: string | null, body?: string | null, data?: any) => {
      if (!useAuthStore.getState().user) {
        return;
      }
      if (!seenNotifications.current.has(id)) {
        if (data?.orderId) return;
        if (!title || !body) return;
        seenNotifications.current.add(id);
        useNotificationStore.getState().addNotification(title, body);
      }
    };

    const subscription = Notifications.addNotificationReceivedListener(notification => {
      addIfNew(
        notification.request.identifier,
        notification.request.content.title,
        notification.request.content.body,
        notification.request.content.data
      );
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      addIfNew(
        response.notification.request.identifier,
        response.notification.request.content.title,
        response.notification.request.content.body,
        response.notification.request.content.data
      );
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const [isSplashDone, setIsSplashDone] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashDone(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 1800); // 1.8 seconds smooth branded splash

    return () => clearTimeout(timer);
  }, []);

  if (!loaded && !error || !isSplashDone) {
    return (
      <View style={[styles.loading, { backgroundColor: '#0B132B' }]}>
        <StatusBar style="light" />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ 
            fontFamily: loaded ? 'BebasNeue_400Regular' : 'sans-serif', 
            fontSize: 54, 
            color: '#FFFFFF', 
            letterSpacing: 6,
            textAlign: 'center',
            lineHeight: 56,
          }}>
            POKÉ
          </Text>
          <Text style={{ 
            fontFamily: loaded ? 'Inter_700Bold' : 'sans-serif', 
            fontSize: 18, 
            color: '#10B981', 
            letterSpacing: 8,
            textAlign: 'center',
            marginTop: 4,
          }}>
            MOONS
          </Text>
          <Text style={{ 
            fontFamily: loaded ? 'Inter_500Medium' : 'sans-serif', 
            fontSize: 10, 
            color: '#64748B', 
            letterSpacing: 2,
            textAlign: 'center',
            marginTop: 12,
            textTransform: 'uppercase',
          }}>
            Poké Bowls • La Chaux-de-Fonds
          </Text>
          <ActivityIndicator color="#10B981" size="small" style={{ marginTop: 32 }} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Head>
        <title>Pokémoons - La Chaux-de-Fonds</title>
        <meta name="description" content="Pokémoons - Poké Bowls sains et savoureux." />
        <link rel="icon" href="/favicon.png?v=2" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
      </Head>
      <View style={styles.webWrapper}>
        {!hideHeader && <DesktopHeader />}
        <GlobalBanners />
        <SafeAreaProvider style={styles.container}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ 
            headerShown: false, 
            animation: 'fade',
            presentation: 'card',
            contentStyle: { backgroundColor: Theme.colors.background } 
          }}>
            <Stack.Screen name="index" options={{ presentation: 'card' }} />
            <Stack.Screen name="menu" options={{ presentation: 'card' }} />
            <Stack.Screen name="product/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="cart" options={{ presentation: 'card' }} />
            <Stack.Screen name="admin" options={{ presentation: 'card' }} />
            <Stack.Screen name="driver" options={{ presentation: 'card' }} />
            <Stack.Screen name="auth" options={{ presentation: 'card' }} />
            <Stack.Screen name="profile" options={{ presentation: 'card' }} />
            <Stack.Screen name="tracking" options={{ presentation: 'card' }} />
          </Stack>
        </SafeAreaProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: Theme.colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
