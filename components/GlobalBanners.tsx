import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { useRestaurantStore } from '../store/useRestaurantStore';

export function GlobalBanners() {
  const { settings } = useRestaurantStore();
  const [showClosureModal, setShowClosureModal] = useState(true);

  if (!settings) return null;

  return (
    <>
      {/* BANNIÈRES */}
      <View style={{ marginTop: Platform.OS === 'web' ? 80 : 0 }}>
        {/* BANNIÈRE DE FERMETURE EXCEPTIONNELLE */}
        {!settings.isOpen && settings.openOverrideMessage ? (
          <SafeAreaView edges={['top']} style={{ backgroundColor: Theme.colors.danger }}>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="alert-circle" size={32} color="#FFF" style={{ marginBottom: 8 }} />
              <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#FFF', fontSize: 16, textAlign: 'center' }}>
                {settings.openOverrideMessage}
              </Text>
              <Text style={{ fontFamily: Theme.fonts.body, color: '#FFF', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
                Les commandes sont temporairement suspendues.
              </Text>
            </View>
          </SafeAreaView>
        ) : null}

        {/* BANNIÈRE D'ANNONCE / INFORMATION */}
        {settings.announcementEnabled && !!settings.announcementMessage ? (
          <SafeAreaView edges={['top']} style={{ backgroundColor: '#FF9500' }}>
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Ionicons name="megaphone" size={24} color="#FFF" />
              <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#FFF', fontSize: 15, textAlign: 'center', flex: 1 }}>
                {settings.announcementMessage}
              </Text>
            </View>
          </SafeAreaView>
        ) : null}
      </View>

      {/* MODAL (Widget) DE FERMETURE */}
      <Modal 
        visible={!settings.isOpen && !!settings.openOverrideMessage && showClosureModal} 
        transparent 
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={56} color={Theme.colors.danger} />
            <Text style={styles.modalTitle}>Information Importante</Text>
            <Text style={styles.modalMessage}>{settings.openOverrideMessage}</Text>
            <Text style={styles.modalSubMessage}>Les commandes sont suspendues durant cette période.</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowClosureModal(false)}>
              <Text style={styles.modalButtonText}>J'ai compris</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: Theme.fonts.title || "BebasNeue_400Regular",
    fontSize: 24,
    color: Theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 16,
    color: Theme.colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubMessage: {
    fontFamily: Theme.fonts.body,
    fontSize: 14,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '100%',
  },
  modalButtonText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
  }
});
