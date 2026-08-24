import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, Platform, useWindowDimensions, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function ContactScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = () => {
    // In a real app, this would send the data to a server.
    alert('Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.');
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <BlurView intensity={80} tint="light" style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
              <Text style={styles.backText}>Retour</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Contact</Text>
            <View style={{ width: 60 }} />
          </View>
        </SafeAreaView>
      </BlurView>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>NOUS CONTACTER</Text>
            <Text style={styles.subtitle}>
              Une question ? Une envie particulière ? N'hésitez pas à nous écrire, notre équipe vous répondra avec plaisir.
            </Text>
          </View>

          <View style={[styles.mainLayout, isDesktop && { flexDirection: 'row', gap: 40 }]}>
            
            {/* CONTACT INFO PANELS */}
            <View style={[styles.infoColumn, isDesktop && { flex: 1 }]}>
              
              <BlurView intensity={60} tint="light" style={styles.infoCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location" size={24} color="#FFF" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Notre Adresse</Text>
                  <Text style={styles.infoText}>Pokemoons Sarl</Text>
                  <Text style={styles.infoText}>Place du marché 6</Text>
                  <Text style={styles.infoText}>2300 La Chaux-de-Fonds</Text>
                </View>
              </BlurView>

              <BlurView intensity={60} tint="light" style={styles.infoCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="call" size={24} color="#FFF" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Téléphone</Text>
                  <Text style={styles.infoText}>032 968 53 13</Text>
                </View>
              </BlurView>

              <BlurView intensity={60} tint="light" style={styles.infoCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mail" size={24} color="#FFF" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Email</Text>
                  <Text style={styles.infoText}>info@pokemoons.ch</Text>
                </View>
              </BlurView>

            </View>

            {/* CONTACT FORM */}
            <View style={[styles.formColumn, isDesktop && { flex: 1.5 }]}>
              <BlurView intensity={80} tint="light" style={styles.formCard}>
                <Text style={styles.formTitle}>Envoyez-nous un message</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nom complet</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Votre nom" 
                    placeholderTextColor="#999"
                    value={form.name}
                    onChangeText={(t) => setForm({...form, name: t})}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Adresse Email</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Votre email" 
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={(t) => setForm({...form, email: t})}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Sujet</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Sujet de votre message" 
                    placeholderTextColor="#999"
                    value={form.subject}
                    onChangeText={(t) => setForm({...form, subject: t})}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Message</Text>
                  <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="Votre message..." 
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    value={form.message}
                    onChangeText={(t) => setForm({...form, message: t})}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#1B5E20', '#2E7D32']}
                    style={styles.submitGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.submitText}>ENVOYER LE MESSAGE</Text>
                    <Ionicons name="send" size={18} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>

              </BlurView>
            </View>

          </View>
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.4)',
    zIndex: 10,
    ...Platform.select({
      web: { position: 'sticky', top: 0 },
      default: { position: 'absolute', top: 0, left: 0, right: 0 },
    }),
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  backText: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 14,
    color: Theme.colors.text,
  },
  headerTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 20,
    color: Theme.colors.text,
    letterSpacing: 2,
  },
  content: {
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 40 : 100,
  },
  contentDesktop: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontFamily: Theme.fonts.title,
    fontSize: 40,
    color: Theme.colors.primary,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 24,
  },
  mainLayout: {
    flexDirection: 'column',
    gap: 24,
  },
  infoColumn: {
    gap: 16,
  },
  formColumn: {
    // 
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 18,
    color: Theme.colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontFamily: Theme.fonts.body,
    fontSize: 15,
    color: Theme.colors.textSecondary,
    lineHeight: 22,
  },
  formCard: {
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  formTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 24,
    color: Theme.colors.text,
    marginBottom: 24,
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  submitText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 1,
  },
});
