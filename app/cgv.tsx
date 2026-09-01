import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { BlurView } from 'expo-blur';

export default function CGVScreen() {
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
            <Text style={styles.headerTitle}>CGV</Text>
            <View style={{ width: 60 }} />
          </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <Text style={styles.title}>CONDITIONS GÉNÉRALES DE VENTE</Text>
        <Text style={styles.subtitle}>Juin 2026</Text>

        <Text style={styles.sectionTitle}>1. DOMAINE D'APPLICATION / GÉNÉRALITÉS</Text>
        <Text style={styles.paragraph}>
          Le fournisseur de service de ce site Pokémoons.
        </Text>
        
        <View style={styles.addressBlock}>
          <Text style={styles.paragraphBold}>Pokemoons Sarl</Text>
          <Text style={styles.paragraph}>Place du marché 6</Text>
          <Text style={styles.paragraph}>2300 La Chaux-de-Fonds</Text>
          <Text style={styles.paragraph}>Téléphone : 032 968 53 13</Text>
          <Text style={styles.paragraph}>E-Mail: info@pokemoons.ch</Text>
          <Text style={styles.paragraph}>Numéro du registre du commerce : CH-645.4.124.310-2</Text>
          <Text style={styles.paragraph}>Direction : Yasin Zorgui</Text>
        </View>

        <Text style={styles.paragraph}>
          L’offre de Pokémoons est limitée à la Suisse. L'assortiment proposé peut varier en fonction des lieux de livraison. Les présentes Conditions générales de vente s'appliquent à toutes les prestations de Pokémoons.
        </Text>

        <Text style={styles.sectionTitle}>2. INSCRIPTIONS et COMMANDES</Text>
        
        <Text style={styles.subSectionTitle}>2.1. Inscription</Text>
        <Text style={styles.paragraph}>
          L'enregistrement dans la boutique en ligne est réservé aux personnes ayant la capacité d'accomplir des actes juridiques. L’enregistrement est gratuit. Il n'équivaut pas à un droit d'accès à la boutique en ligne. Les données nécessaires à l'enregistrement doivent être complètes et conformes à la vérité. Chaque client se charge de maintenir ses données à jour.
        </Text>

        <Text style={styles.subSectionTitle}>2.2. Envoi de la commande / conclusion du contrat</Text>
        <Text style={styles.paragraph}>
          Les commandes peuvent être passées uniquement en ligne, sur la page de commande Internet.
        </Text>

        <Text style={styles.subSectionTitle}>2.3. Modification et annulation de commandes</Text>
        <Text style={styles.paragraph}>
          Une fois confirmées, les commandes ne peuvent plus être modifiées.
        </Text>
        <Text style={styles.paragraph}>
          L'objectif premier de Pokémoons est de tout faire pour livrer en quantités suffisantes et dans une qualité irréprochable tous les produits commandés. Dans certains cas exceptionnels toutefois, il peut arriver que, pour différentes raisons, un produit ne soit plus disponible dans les quantités requises ou qu'il ne puisse pas être livré. Si des produits ne sont pas disponibles au moment de la livraison, ils ne seront ni envoyés ultérieurement ni remplacés par d'autres. La quantité effectivement livrée figure sur le ticket de caisse. En cas d'articles manquants ou de quantités réduites, le client ne peut prétendre ni à une compensation ni à des dommages-intérêts. Si un article facturé ne peut être livré, le montant correspondant est remboursé au client. Il n'y a pas de nouvelle livraison et le client ne peut prétendre à des dommages-intérêts.
        </Text>

        <Text style={styles.sectionTitle}>3. LIVRAISON</Text>
        
        <Text style={styles.subSectionTitle}>3.1. Remise de la marchandise</Text>
        <Text style={styles.paragraph}>
          Les marchandises sont livrées directement à l'adresse et à la personne indiquées par le client. La livraison est effectuée par Pokémoons. La livraison doit être faite jusqu'à la porte du logement des particuliers et à la réception pour les entreprises.
        </Text>

        <Text style={styles.subSectionTitle}>3.2. Heures de livraison et respect des délais</Text>
        <Text style={styles.paragraph}>
          Pokémoons fait tout son possible pour respecter les délais de livraison. Toutefois, toutes les indications d'heures fournies par Pokémoons ne le sont qu'à titre indicatif. Un retard ne constitue en aucun cas un motif d'annulation de la commande et ne donne droit à aucun dédommagement.
        </Text>

        <Text style={styles.subSectionTitle}>3.3. Frais de livraison</Text>
        <Text style={styles.paragraph}>
          Les frais de livraison hors zone sont variables et stipulés sur chaque commande. Dans la zone, la livraison est de minimum 20 FRS.
        </Text>

        <Text style={styles.subSectionTitle}>3.4. Annulation de la livraison</Text>
        <Text style={styles.paragraph}>
          Pour des raisons de qualité et de sécurité, Pokémoons s’efforce de livrer la marchandise au client personnellement. Si, pour des raisons indépendantes de la volonté de Pokémoons (adresse de livraison erronée, absence du destinataire, accès interdit, circulation rendue difficile par les intempéries ou le trafic routier, etc.), la livraison est rendue impossible ou quasi impossible, Pokémoons est en droit d'annuler la commande. Toute prétention du client à une quelconque compensation en nature ou en dommages-intérêts est dans ce cas entièrement exclue.
        </Text>

        <Text style={styles.sectionTitle}>4. PRIX et PAIEMENT</Text>

        <Text style={styles.subSectionTitle}>4.1. Prix</Text>
        <Text style={styles.paragraph}>
          Tous les prix s'entendent en francs suisses, TVA applicable comprise. Les prix en vigueur sont ceux qui sont affichés sur le site www.pokemoons.ch au moment de la commande.
        </Text>

        <Text style={styles.subSectionTitle}>4.2. Modes de paiement</Text>
        <Text style={styles.paragraph}>
          Le paiement de la commande se fait en francs suisses. Plusieurs modes de paiement sont disponibles en plus des espèces. Pokémoons se réserve le droit de décider des moyens de paiement acceptés au cas par cas. Les moyens de paiement possibles sont indiqués au moment de la commande.
        </Text>
        <Text style={styles.paragraph}>
          Les paiements effectués via le site sont effectués à l'intention de Pokémoons.
        </Text>

        <Text style={styles.sectionTitle}>5. COMMUNICATION ÉLECTRONIQUE</Text>
        <Text style={styles.paragraph}>
          En l'état actuel de la technique et du réseau, les échanges de données par Internet ne peuvent être garantis sans erreur ou possibles en permanence. Pokémoons ne peut donc pas s'engager à assurer une disponibilité permanente et ininterrompue du service en ligne et se délie de toute responsabilité en cas d'erreurs techniques ou informatiques se produisant lors d'une vente ou pour les éventuels retards dans le traitement ou la réception des commandes.
        </Text>

        <Text style={styles.sectionTitle}>6. SERVICE CLIENTS et RÉCLAMATIONS</Text>
        <Text style={styles.paragraph}>
          Le service clients est à la disposition des clients pour tout renseignement et leur apporte son aide en cas de problèmes ou de réclamations concernant les prestations de Pokémoons.
        </Text>

        <View style={styles.addressBlock}>
          <Text style={styles.paragraphBold}>Pokemoons Sarl- Service clients</Text>
          <Text style={styles.paragraph}>Place du marché 6</Text>
          <Text style={styles.paragraph}>2300 La Chaux-de-Fonds</Text>
          <Text style={styles.paragraph}>E-Mail: info@pokemoons.ch</Text>
        </View>

        <Text style={styles.subSectionTitle}>7.5. Droit applicable et for</Text>
        <Text style={styles.paragraph}>
          Les présentes conditions générales sont régies et interprétées conformément au droit suisse. Vous acceptez de soumettre tous les litiges aux tribunaux compétents au domicile de Pokémoons à La Chaux-de-Fonds, Suisse.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 40, fontStyle: 'italic' }]}>
          La Chaux-de-Fonds, Juin 2026
        </Text>

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
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontFamily: Theme.fonts.title,
    fontSize: 32,
    color: Theme.colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 22,
    color: Theme.colors.text,
    marginTop: 40,
    marginBottom: 16,
  },
  subSectionTitle: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 16,
    color: Theme.colors.text,
    marginTop: 24,
    marginBottom: 8,
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
    lineHeight: 24,
    color: Theme.colors.text,
  },
  addressBlock: {
    backgroundColor: Theme.colors.surface,
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  }
});
