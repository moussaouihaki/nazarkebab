import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { BlurView } from 'expo-blur';

export default function ProvenanceScreen() {
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
            <Text style={styles.headerTitle}>Ingrédients</Text>
            <View style={{ width: 60 }} />
          </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <Text style={styles.title}>INGRÉDIENTS ET PROVENANCE</Text>

        <Text style={styles.sectionTitle}>Provenance de la viande et des poissons :</Text>
        
        <View style={styles.listBlock}>
          <View style={styles.listItem}>
            <Text style={styles.itemLabel}>Saumon cru :</Text>
            <Text style={styles.itemValue}>Norvège</Text>
          </View>
          <View style={styles.separator} />
          
          <View style={styles.listItem}>
            <Text style={styles.itemLabel}>Thon cru :</Text>
            <Text style={styles.itemValue}>Equateur</Text>
          </View>
          <View style={styles.separator} />

          <View style={styles.listItem}>
            <Text style={styles.itemLabel}>Crevette :</Text>
            <Text style={styles.itemValue}>Vietnam</Text>
          </View>
          <View style={styles.separator} />

          <View style={styles.listItem}>
            <Text style={styles.itemLabel}>Poulet :</Text>
            <Text style={styles.itemValue}>Allemagne</Text>
          </View>
          <View style={styles.separator} />

          <View style={styles.listItem}>
            <Text style={styles.itemLabel}>Bœuf :</Text>
            <Text style={styles.itemValue}>Suisse</Text>
          </View>
        </View>

        <View style={styles.allergyBlock}>
          <Ionicons name="information-circle-outline" size={24} color={Theme.colors.primary} />
          <Text style={styles.allergyText}>
            En cas d’allergies, nous sommes à votre disposition pour tous renseignements.
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
      web: { position: 'sticky' as any, top: 0 },
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
    maxWidth: 600,
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
    marginBottom: 20,
  },
  listBlock: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 32,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  itemLabel: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 16,
    color: Theme.colors.text,
  },
  itemValue: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: Theme.colors.border,
    width: '100%',
  },
  allergyBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 94, 32, 0.1)',
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  allergyText: {
    fontFamily: Theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: Theme.colors.text,
    flex: 1,
  }
});
