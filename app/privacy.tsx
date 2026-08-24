import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { BlurView } from 'expo-blur';

export default function PrivacyScreen() {
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
            <Text style={styles.headerTitle}>Confidentialité</Text>
            <View style={{ width: 60 }} />
          </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <Text style={styles.title}>POLITIQUE DE CONFIDENTIALITÉ</Text>

        <Text style={styles.sectionTitle}>Le respect et la protection de vos données personnelles</Text>
        <Text style={styles.paragraph}>
          Dans le cadre de ses activités, PokeMoons traite un certain nombre de Données Personnelles, et notamment celles des internautes utilisant son site Internet accessible à partir du nom de domaine suivant : www.pokemoons.ch (ci-après, le « Site »).
        </Text>
        <Text style={styles.paragraph}>
          Cette politique de protection des données personnelles a pour but de vous aider à comprendre pourquoi et comment PokeMoons utilise et protège les données personnelles que vous nous transmettez lorsque vous utilisez le Site et les moyens dont vous disposez pour contrôler cette utilisation. D’une manière générale, vous pouvez visiter le Site sans communiquer aucune Donnée personnelle vous concernant.
        </Text>
        <Text style={styles.paragraph}>
          Vous n’êtes en aucune manière obligé de transmettre vos Données personnelles à PokeMoons. Néanmoins, il est possible que cela vous empêche de bénéficier de certaines informations ou services que vous avez demandés ou d’utiliser certaines fonctionnalités du Site.
        </Text>
        <Text style={styles.paragraph}>
          Nous pouvons apporter des modifications à cette politique de confidentialité, notamment pour nous conformer à toute évolution législative, règlementaire, jurisprudentielle ou technologique.
        </Text>

        <Text style={styles.sectionTitle}>Qu’est-ce qu’une donnée personnelle ?</Text>
        <Text style={styles.paragraph}>
          Une « Donnée Personnelle » est toute information se rapportant à une personne physique identifiée ou identifiable (un nom, prénom, numéro de téléphone, données de localisation…).
        </Text>

        <Text style={styles.sectionTitle}>Quelles informations sont collectées par PokeMoons et comment ?</Text>
        <Text style={styles.paragraph}>
          PokeMoons recueille des informations directement auprès de vous et de façon automatique lorsque vous utilisez le Site. Informations recueillies directement.
        </Text>
        <Text style={styles.paragraph}>
          Les Données personnelles ainsi collectées peuvent comprendre :
        </Text>
        <Text style={styles.paragraph}>
          L’adresse IP de votre ordinateur, les informations relatives à votre ordinateur, votre mode de connexion, tel que le type et la version de votre navigateur internet, votre système d’exploitation, l’OS de votre mobile ou tablette et d’autres identifiants techniques, l’adresse URL de vos connexions, y compris la date et l’heure ainsi que le contenu auquel vous accédez sur le Site.
        </Text>

        <Text style={styles.sectionTitle}>Comment est-ce que PokeMoons utilise vos données ?</Text>
        <Text style={styles.paragraph}>
          PokeMoons utilise vos Données personnelles aux fins suivantes :
        </Text>
        <Text style={styles.paragraph}>
          • Pour gérer votre candidature de franchisé PokeMoons;{'\n'}
          • Pour répondre aux questions et remarques adressées dans le formulaire de contact en ligne;{'\n'}
          • Pour vous adresser des informations en lien avec PokeMoons
        </Text>

        <Text style={styles.paragraph}>
          Dans la limite de leurs attributions respectives, les personnes suivantes peuvent avoir accès à vos Données personnelles :
        </Text>
        <Text style={styles.paragraph}>
          • Au sein de PokeMoons, les personnes chargées du service marketing{'\n'}
          • Parmi les sous-traitants de PokeMoons: les prestataires informatiques.
        </Text>

        <Text style={styles.sectionTitle}>Comment vos données sont-elles sécurisées ?</Text>
        <Text style={styles.paragraph}>
          PokeMoons met en œuvre les mesures physiques, techniques et organisationnelles appropriées pour garantir un haut niveau de sécurité et de confidentialité des Données personnelles et empêcher dans la mesure du possible toute altération ou perte de vos Données personnelles ou tout accès non autorisé à celles-ci.
        </Text>

        <Text style={styles.sectionTitle}>Quels sont vos droits ?</Text>
        <Text style={styles.paragraph}>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de portabilité de vos Données personnelles. Vous disposez également d’un droit à la limitation du traitement vous concernant et d’un droit d’opposition à tout moment à ce traitement. Vous pouvez à tout moment retirer votre consentement pour le traitement de vos données personnelles. Ceci ne remettra pas en cause la licéité du traitement effectué préalablement à ce retrait.
        </Text>

        <View style={styles.addressBlock}>
          <Text style={styles.paragraph}>
            Enfin, vous pouvez vous informer sur vos données personnelles ou exercer vos droits par voie électronique à <Text style={styles.paragraphBold}>data@pokemoons.ch</Text>, en précisant dans l’objet de votre email « données personnelles ».
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
    marginTop: 24,
    marginBottom: 16,
  },
  paragraph: {
    fontFamily: Theme.fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: Theme.colors.text,
    marginBottom: 16,
  },
  paragraphBold: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 15,
    color: Theme.colors.text,
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
