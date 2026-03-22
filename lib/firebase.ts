import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase config — Nazar Kebab (nazarkebab-d7b25)
// Firebase config — Nazar Kebab
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || (Platform.OS === 'android'
    ? "AIzaSyAlby0kABaxPaW0A2px1m6AgqE1940YDjI"
    : "AIzaSyBz4zZkuaUCj5ndsqV7DM2sFHFrenw0etA"),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "nazarkebab-d7b25.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "nazarkebab-d7b25",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "nazarkebab-d7b25.firebasestorage.app",
  messagingSenderId: "1085281959109",
  appId: Platform.OS === 'android'
    ? "1:1085281959109:android:d54e8e601edb48be2904ac"
    : "1:1085281959109:ios:9d146edf8069760e2904ac"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' 
    ? [browserLocalPersistence, browserSessionPersistence] 
    : getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
