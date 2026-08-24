import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { BlurView } from 'expo-blur';

export default function MentionsLegalesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
              <Text style={styles.backText}>Retour</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mentions légales</Text>
            <View style={{ width: 60 }} />
          </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <Text style={styles.title}>MENTIONS LÉGALES</Text>

        <Text style={styles.sectionTitle}>Informations légales</Text>
        
        <View style={styles.addressBlock}>
          <Text style={styles.paragraphBold}>Propriétaire :</Text>
          <Text style={styles.paragraph}>Pokemoons Sarl</Text>
          <Text style={styles.paragraph}>Place du marché 6</Text>
          <Text style={styles.paragraph}>2300 La Chaux-de-Fonds</Text>
        </View>

        <View style={styles.addressBlock}>
          <Text style={styles.paragraphBold}>Responsable publication :</Text>
          <Text style={styles.paragraph}>Yasin Zorgui</Text>
          <Text style={[styles.paragraph, { marginTop: 8, fontStyle: 'italic', fontSize: 13, color: Theme.colors.textSecondary }]}>
            Le responsable publication est une personne physique.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    borderColor: Theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.7)',
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
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontFamily: Theme.fonts.title,
    fontSize: 32,
    color: Theme.colors.primary,
    marginBottom: 40,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 22,
    color: Theme.colors.text,
    marginBottom: 16,
  },
  paragraph: {
    fontFamily: Theme.fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: Theme.colors.text,
  },
  paragraphBold: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 15,
    lineHeight: 24,
    color: Theme.colors.text,
    marginBottom: 8,
  },
  addressBlock: {
    backgroundColor: Theme.colors.surface,
    padding: 20,
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  }
});
