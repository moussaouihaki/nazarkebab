import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import { Theme } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

WebBrowser.maybeCompleteAuthSession();

// IDs de votre projet Firebase
const IOS_CLIENT_ID = '1085281959109-qdk6fkhs2jfr8rplfmnnhj9v6hvtcgj8.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '1085281959109-rouqkqbghg69fj8jgj78q7ef69bjdv75.apps.googleusercontent.com';
// Web client ID is required for Google login on browsers/Vercel
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '1085281959109-dummy.apps.googleusercontent.com';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const { login, loginWithGoogle, loginWithApple, register, isLoading, error, clearError } = useAuthStore();
  
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID, // ADDED: Critical for web stability
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        loginWithGoogle(id_token).then(ok => {
          if (ok) router.replace('/');
        });
      }
    }
  }, [response]);
  const [mode, setMode] = useState<Mode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleAppleSignIn = async () => {
    try {
      const nonce = Math.random().toString(36).substring(2, 10);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (credential.identityToken) {
        const ok = await loginWithApple(credential.identityToken, nonce);
        if (ok) router.replace('/');
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // user cancelled the login flow
      } else {
        setLocalError('Erreur lors de la connexion Apple.');
        console.error(e);
      }
    }
  };

  const handleSubmit = async () => {
    clearError();
    setLocalError('');

    if (mode === 'login') {
      if (!email || !password) { setLocalError('Veuillez remplir tous les champs.'); return; }
      const ok = await login(email.trim(), password);
      // Wait for login state propagation and router mount
      if (ok) router.replace('/');
    } else {
      if (!firstName || !lastName || !email || !password) { setLocalError('Veuillez remplir tous les champs obligatoires.'); return; }
      if (password.length < 6) { setLocalError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
      const ok = await register({ firstName, lastName, email: email.trim(), password, phone, address });
      if (ok) router.replace('/');
    }
  };

  const displayError = localError || error;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* LOGO */}
            <View style={styles.logoBlock}>
              <Text style={styles.logoNazar}>NAZAR</Text>
              <Text style={styles.logoKebab}>KEBAB</Text>
            </View>

            {/* TITLE */}
            <Text style={styles.title}>
              {mode === 'login' ? 'CONNEXION' : 'CRÉER UN COMPTE'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Connectez-vous pour commander et suivre vos repas.'
                : 'Inscrivez-vous pour profiter de toutes nos offres.'}
            </Text>

            {/* TOGGLE */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
                onPress={() => { setMode('login'); clearError(); setLocalError(''); }}
              >
                <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>Connexion</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
                onPress={() => { setMode('register'); clearError(); setLocalError(''); }}
              >
                <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>Inscription</Text>
              </TouchableOpacity>
            </View>

            {/* SOCIAL BUTTONS */}
            <View style={styles.socialButtons}>
              {/* GOOGLE SIGN IN */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={() => promptAsync()}
                disabled={!request || isLoading}
                activeOpacity={0.85}
              >
                <View style={styles.googleLogoBox}>
                  <Text style={styles.googleIcon}>G</Text>
                </View>
                <Text style={styles.googleText}>Google</Text>
              </TouchableOpacity>

              {/* APPLE SIGN IN — Uniquement sur iOS */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.appleBtn}
                  onPress={handleAppleSignIn}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-apple" size={20} color={Theme.colors.text} />
                  <Text style={styles.appleText}>Apple</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* DIVIDER */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou par email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* FIELDS */}
            {mode === 'register' && (
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>PRÉNOM *</Text>
                  <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Prénom" placeholderTextColor={Theme.colors.textSecondary} autoCapitalize="words" />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>NOM *</Text>
                  <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Nom" placeholderTextColor={Theme.colors.textSecondary} autoCapitalize="words" />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL *</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="votremail@exemple.com" placeholderTextColor={Theme.colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />
            </View>

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>TÉLÉPHONE</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="079 123 45 67" placeholderTextColor={Theme.colors.textSecondary} keyboardType="phone-pad" />
              </View>
            )}

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ADRESSE (Livraison)</Text>
                <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Rue, NPA Ville" placeholderTextColor={Theme.colors.textSecondary} autoCapitalize="words" />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOT DE PASSE *</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'register' ? 'Min. 6 caractères' : '••••••••'}
                  placeholderTextColor={Theme.colors.textSecondary}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity style={styles.showPassBtn} onPress={() => setShowPass(v => !v)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={Theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ERROR */}
            {!!displayError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={Theme.colors.danger} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            {/* SUBMIT */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isLoading} activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'login' ? 'SE CONNECTER' : 'CRÉER MON COMPTE'}
                </Text>
              )}
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity
                style={styles.biometricBtn}
                onPress={async () => {
                  setLocalError('');
                  const hasHardware = await LocalAuthentication.hasHardwareAsync();
                  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                  if (!hasHardware || !isEnrolled) {
                    setLocalError('Face ID / Touch ID non configuré sur cet appareil.');
                    return;
                  }
                  const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Connexion à Nazar Kebab',
                    fallbackLabel: 'Utiliser le mot de passe',
                  });
                  if (result.success) {
                    const ok = await login('demo@nazarkebab.ch', 'password');
                    if (ok) router.replace('/');
                  }
                }}
              >
                <Ionicons name="finger-print-outline" size={24} color={Theme.colors.success} />
                <Text style={styles.biometricText}>Se connecter avec Face ID / Touch ID</Text>
              </TouchableOpacity>
            )}


            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  inner: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 10, alignItems: 'flex-end' },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 24 },
  logoBlock: { alignItems: 'center', marginBottom: 32 },
  logoNazar: { fontFamily: Theme.fonts.logo, fontSize: 36, color: Theme.colors.text, letterSpacing: 4 },
  logoKebab: { fontFamily: Theme.fonts.logo, fontSize: 12, color: Theme.colors.primary, letterSpacing: 8, marginTop: -4 },
  title: { fontFamily: Theme.fonts.logo, fontSize: 28, color: Theme.colors.text, letterSpacing: 3, marginBottom: 8 },
  subtitle: { fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.textSecondary, lineHeight: 20, marginBottom: 24 },
  modeToggle: { flexDirection: 'row', backgroundColor: Theme.colors.surface, borderRadius: 12, padding: 4, marginBottom: 24 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: Theme.colors.success },
  modeBtnText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.textSecondary },
  modeBtnTextActive: { color: '#000' },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { marginBottom: 16 },
  label: { fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, letterSpacing: 2, marginBottom: 8 },
  input: { backgroundColor: Theme.colors.surface, padding: 16, fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.text, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, borderRadius: 12 },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  showPassBtn: { backgroundColor: Theme.colors.surface, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Theme.colors.danger + '22', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.danger + '44' },
  errorText: { fontFamily: Theme.fonts.body, fontSize: 13, color: Theme.colors.danger, flex: 1 },
  submitBtn: { backgroundColor: Theme.colors.success, paddingVertical: 18, borderRadius: 100, alignItems: 'center', shadowColor: Theme.colors.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8, marginBottom: 24 },
  submitBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 16, color: '#000', letterSpacing: 1 },
  demoBox: { padding: 16, backgroundColor: Theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, gap: 4 },
  demoTitle: { fontFamily: Theme.fonts.bodyMedium, fontSize: 13, color: Theme.colors.text },
  demoText: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary },
  biometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.success + '40', backgroundColor: Theme.colors.success + '10', marginBottom: 16 },
  biometricText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 15, color: Theme.colors.success },
  googleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, backgroundColor: Theme.colors.surface },
  googleLogoBox: { width: 22, height: 22, borderRadius: 4, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  googleIcon: { fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: '#4285F4' },
  googleText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 15, color: Theme.colors.text },
  appleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, backgroundColor: Theme.colors.surface },
  appleText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 15, color: Theme.colors.text },
  socialButtons: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Theme.colors.border },
  dividerText: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary },
});
