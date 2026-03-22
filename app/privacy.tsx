import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Politique de Confidentialité</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Dernière mise à jour : 22 mars 2026</Text>

        <Text style={styles.sectionTitle}>1. Qui sommes-nous ?</Text>
        <Text style={styles.body}>
          Nazar Kebab est un restaurant localisé à Porrentruy, Suisse. Notre application mobile et web
          permet aux clients de consulter notre menu, de passer des commandes en ligne et de suivre
          leur livraison en temps réel.
        </Text>

        <Text style={styles.sectionTitle}>2. Données collectées</Text>
        <Text style={styles.body}>
          Lors de l'utilisation de notre application, nous collectons les données suivantes :{'\n\n'}
          • Nom et prénom{'\n'}
          • Numéro de téléphone{'\n'}
          • Adresse de livraison{'\n'}
          • Adresse email{'\n'}
          • Historique des commandes{'\n'}
          • Jeton de notification push (pour les alertes de commande)
        </Text>

        <Text style={styles.sectionTitle}>3. Utilisation des données</Text>
        <Text style={styles.body}>
          Vos données sont utilisées exclusivement pour :{'\n\n'}
          • Traiter et livrer vos commandes{'\n'}
          • Vous envoyer des notifications sur l'état de votre commande{'\n'}
          • Vous informer de nos promotions (avec votre consentement){'\n'}
          • Améliorer notre service
        </Text>

        <Text style={styles.sectionTitle}>4. Partage des données</Text>
        <Text style={styles.body}>
          Nous ne vendons ni ne partageons vos données personnelles avec des tiers à des fins
          commerciales. Vos données peuvent être partagées uniquement avec nos prestataires
          techniques (Firebase/Google pour le stockage, Expo pour les notifications) dans le
          strict cadre de la fourniture du service.
        </Text>

        <Text style={styles.sectionTitle}>5. Conservation des données</Text>
        <Text style={styles.body}>
          Vos données sont conservées pendant la durée de votre relation avec Nazar Kebab.
          Vous pouvez demander la suppression de votre compte et de vos données à tout moment
          en nous contactant.
        </Text>

        <Text style={styles.sectionTitle}>6. Vos droits</Text>
        <Text style={styles.body}>
          Conformément au RGPD et à la loi suisse sur la protection des données (nLPD), vous
          disposez des droits suivants :{'\n\n'}
          • Droit d'accès à vos données{'\n'}
          • Droit de rectification{'\n'}
          • Droit à l'effacement{'\n'}
          • Droit à la portabilité{'\n\n'}
          Pour exercer ces droits, contactez-nous à :{'\n'}
          📧 contact@nazarkebab.ch{'\n'}
          📍 Grand-Rue 9, 2900 Porrentruy, Suisse
        </Text>

        <Text style={styles.sectionTitle}>7. Sécurité</Text>
        <Text style={styles.body}>
          Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données
          contre tout accès non autorisé, perte ou divulgation.
        </Text>

        <Text style={styles.sectionTitle}>8. Modifications</Text>
        <Text style={styles.body}>
          Nous pouvons mettre à jour cette politique de confidentialité. Toute modification
          sera communiquée via l'application.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Theme.fonts.bodyBold, fontSize: 16, color: Theme.colors.text, letterSpacing: 1 },
  content: { paddingHorizontal: 24, paddingTop: 24 },
  updated: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary, marginBottom: 24 },
  sectionTitle: { fontFamily: Theme.fonts.bodyBold, fontSize: 15, color: Theme.colors.success, marginTop: 24, marginBottom: 8 },
  body: { fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.text, lineHeight: 22 },
});
