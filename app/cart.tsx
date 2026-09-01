import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../constants/theme';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDeliveryZoneStore, DeliveryZone } from '../store/useDeliveryZoneStore';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getImageSource } from '../constants/data';
import { useRestaurantStore, checkIsRestaurantOpen, isRestaurantOpenOnDate } from '../store/useRestaurantStore';

type Step = 'cart' | 'info' | 'confirmation';

const styles2 = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontFamily: Theme.fonts.bodyBold,
    color: Theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFF',
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeChipActive: {
    backgroundColor: Theme.colors.text,
    borderColor: Theme.colors.text,
  },
  timeChipText: {
    fontFamily: Theme.fonts.bodyBold,
    color: Theme.colors.text,
  },
  timeChipTextActive: {
    color: '#FFF',
  },
});

export default function CartScreen() {
  const { 
    items, total, deliveryFee, deliveryType,
    removeItem, addItem, updateQuantity, removeAllOfItem, clearCart,
    setDeliveryType, setDeliveryFee, setCustomerInfo, setOrderNote, placeOrder,
    customerName, customerPhone, customerAddress, orderNote, orders
  } = useCartStore();

  const { user, updateProfile } = useAuthStore();
  const { zones, getZoneForAddress, fetchZones } = useDeliveryZoneStore();
  const { settings } = useRestaurantStore();

  useEffect(() => { fetchZones(); }, []);

  // Pre-fill from user profile if fields are empty
  const [name, setName] = useState(customerName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim());
  const [phone, setPhone] = useState(customerPhone || user?.phone || '');
  const [street, setStreet] = useState(customerAddress ? customerAddress.split(',')[0] : (user?.street || user?.address?.split(',')[0] || ''));
  const [postalCode, setPostalCode] = useState(customerAddress ? customerAddress.match(/\d{4}/)?.[0] || '' : (user?.postalCode || user?.address?.match(/\d{4}/)?.[0] || ''));
  const [city, setCity] = useState(customerAddress ? customerAddress.split(/ \d{4} /)[1] || customerAddress.split(',').pop()?.trim() || '' : (user?.city || user?.address?.split(/ \d{4} /)[1] || user?.address?.split(',').pop()?.trim() || ''));
  const [saveAddress, setSaveAddress] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('ASAP');
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Generate available dates based on vacations and opening hours
  useEffect(() => {
    if (!settings) return;
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      if (isRestaurantOpenOnDate(settings, d)) {
        dates.push(d);
      }
    }
    setAvailableDates(dates);
    if (dates.length > 0 && (!selectedDate || !dates.find(d => d.toDateString() === selectedDate.toDateString()))) {
      setSelectedDate(dates[0]);
    }
  }, [settings]);

  // Booked slots count for delivery (max 1 order per 30-min slot)
  const bookedDeliverySlots = React.useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.status !== 'cancelled' && o.deliveryType === 'delivery' && o.requestedTime) {
        const timeOnly = o.requestedTime.includes(' à ') ? o.requestedTime.split(' à ')[1] : o.requestedTime;
        counts[timeOnly] = (counts[timeOnly] || 0) + 1;
      }
    });
    return counts;
  }, [orders]);

  // Generate times for selected date
  useEffect(() => {
    if (!settings || !selectedDate) return;
    
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const todayName = days[selectedDate.getDay()];
    const todayHours = settings.hours.find(h => h.day === todayName);
    
    if (!todayHours || !todayHours.isOpen) {
      setAvailableTimes([]);
      setSelectedTime('');
      return;
    }

    const times: string[] = [];
    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();
    let currentMins = 0;

    // Delivery is every 30 mins, Takeaway is every 15 mins
    const stepMins = deliveryType === 'delivery' ? 30 : 15;

    if (isToday) {
      const now = new Date();
      currentMins = now.getHours() * 60 + now.getMinutes() + (deliveryType === 'delivery' ? 30 : 15);
      currentMins = Math.ceil(currentMins / stepMins) * stepMins;
    }

    const generateSlots = (openMins: number, closeMins: number) => {
      let start = Math.max(openMins, isToday ? currentMins : openMins);
      start = Math.ceil(start / stepMins) * stepMins;
      for (let m = start; m <= closeMins; m += stepMins) {
        times.push(formatTime(m));
      }
    };

    generateSlots(parseTime(todayHours.open), parseTime(todayHours.close));
    if (todayHours.hasSplitShift && todayHours.open2 && todayHours.close2) {
      generateSlots(parseTime(todayHours.open2), parseTime(todayHours.close2));
    }

    if (isToday && times.length > 0) {
      times.unshift('ASAP');
    }

    setAvailableTimes(times);
    if (!times.includes(selectedTime) && times.length > 0) {
      setSelectedTime(times[0]);
    } else if (times.length === 0) {
      setSelectedTime('');
    }
  }, [selectedDate, settings, deliveryType]);

  const [step, setStep] = useState<Step>('cart');
  const [note, setNote] = useState(orderNote);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [detectedZone, setDetectedZone] = useState<DeliveryZone | null>(null);
  const [zoneError, setZoneError] = useState('');
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent?: number; fixedAmount?: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [tipAmount, setTipAmount] = useState<number>(0);

  const address = `${street}, ${postalCode} ${city}`;

  const checkZone = (currentAddress: string, currentTotal: number, type: string) => {
    if (type === 'delivery' && currentAddress.length > 4) {
      const zone = getZoneForAddress(currentAddress);
      setDetectedZone(zone);
      if (!zone) {
        setZoneError('out_of_zone');
        setDeliveryFee(0);
      } else if (currentTotal < zone.minOrder) {
        setZoneError('min_not_met');
        setDeliveryFee(zone.deliveryFee);
      } else {
        setZoneError('');
        setDeliveryFee(zone.deliveryFee);
      }
    } else {
      setDetectedZone(null);
      setZoneError('');
      setDeliveryFee(0);
    }
  };

  // Sync with user profile if address changes and customer has no custom address set
  useEffect(() => {
    if ((user?.street || user?.address) && !customerAddress) {
      if (user.street) {
        setStreet(user.street);
        setPostalCode(user.postalCode || '');
        setCity(user.city || '');
      } else if (user.address) {
        const addr = user.address;
        const m = addr.match(/\b(2[0-9]{3})\b/);
        if (m) {
           setPostalCode(m[1]);
           const parts = addr.split(m[1]);
           setStreet(parts[0].replace(/, $/, '').trim());
           setCity(parts[1]?.trim() || '');
        } else {
           setStreet(addr);
        }
      }
    }
  }, [user?.address, user?.street, user?.postalCode, user?.city]);

  // Recalculate zone when address, total, deliveryType or zones list changes
  useEffect(() => {
    checkZone(address, total, deliveryType);
  }, [address, total, deliveryType, zones]);

  const loyaltyDiscount = useLoyalty ? 18.00 : 0; // Prix moyen offert pour un poké
  const promoDiscount = appliedPromo ? (appliedPromo.discountPercent ? (total * appliedPromo.discountPercent) / 100 : (appliedPromo.fixedAmount || 0)) : 0;
  const activeOrdersCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const grandTotal = Math.max(0, total + deliveryFee + tipAmount - loyaltyDiscount - promoDiscount);

  const handleGoToInfo = () => {
    if (items.length === 0) return;
    // Gate behind auth
    if (!user) {
      router.push('/auth');
      return;
    }
    setStep('info');
  };

  const handlePlaceOrder = async () => {
    if (!settings.isOpen || availableDates.length === 0 || !selectedTime) {
      alert("Désolé, il n'y a aucun créneau disponible pour passer commande.");
      return;
    }

    // Check if slot is already booked for delivery
    if (deliveryType === 'delivery' && selectedTime !== 'ASAP' && (bookedDeliverySlots[selectedTime] || 0) >= 1) {
      alert(`Le créneau ${selectedTime} en livraison est déjà complet (1 commande max par 30 min). Veuillez choisir un autre créneau.`);
      return;
    }

    setCustomerInfo(name, phone, address);
    setOrderNote(note);
    
    // Si l'utilisateur veut sauvegarder cette adresse pour la prochaine fois
    if (saveAddress && user) {
      updateProfile({ address, street, postalCode, city });
    }
    
    // Gérer les points de fidélité et codes promos utilisés
    if (user) {
      const updates: any = {};
      if (useLoyalty) {
        updates.loyaltyPoints = Math.max(0, (user.loyaltyPoints || 0) - 9);
      } else {
        updates.loyaltyPoints = (user.loyaltyPoints || 0) + 1;
      }
      if (appliedPromo?.code) {
        const codeUpper = appliedPromo.code.toUpperCase();
        updates.usedPromoCodes = Array.from(new Set([...(user.usedPromoCodes || []), codeUpper]));
      }
      await updateProfile(updates);
    }

    
    let finalRequestedTime = selectedTime;
    if (selectedDate && selectedDate.toDateString() !== new Date().toDateString()) {
       const dateStr = selectedDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
       finalRequestedTime = `${dateStr} à ${selectedTime}`;
    }
    placeOrder(
      user?.id, 
      finalRequestedTime, 
      loyaltyDiscount, 
      paymentMethod,
      promoDiscount,
      appliedPromo?.code || '',
      tipAmount
    );
    router.replace('/tracking');
  };

  // STEP 3: ORDER PLACED CONFIRMATION
  if (step === 'confirmation' && placedOrder) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.inner}>
          <View style={styles.confirmationScreen}>
            <View style={styles.confirmationIcon}>
              <Ionicons name="checkmark" size={40} color="#000" />
            </View>
            <Text style={styles.confirmTitle}>COMMANDE ENVOYÉE</Text>
            <Text style={styles.confirmOrderId}>#{placedOrder.id}</Text>
            <Text style={styles.confirmSubtitle}>
              Votre commande a été transmise à Pokémoons. Vous recevrez une confirmation dans quelques instants.
            </Text>

            <View style={styles.trackingBox}>
              <TrackingStep icon="time-outline" label="En attente" done={true} active={true} />
              <View style={styles.trackingLine} />
              <TrackingStep icon="flame-outline" label="Préparation" done={false} active={false} />
              <View style={styles.trackingLine} />
              <TrackingStep icon="bag-handle-outline" label="Prête" done={false} active={false} />
              <View style={styles.trackingLine} />
              <TrackingStep icon="checkmark-circle-outline" label="Livrée" done={false} active={false} />
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardLabel}>TEMPS ESTIMÉ</Text>
              <Text style={styles.infoCardValue}>{placedOrder.estimatedTime} min</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardLabel}>MONTANT TOTAL</Text>
              <Text style={styles.infoCardValue}>{placedOrder.total.toFixed(2)} CHF</Text>
            </View>

            <TouchableOpacity style={styles.goldBtn} onPress={() => {
              router.dismissAll();
              router.replace('/');
            }}>
              <Text style={styles.goldBtnText}>RETOUR À L'ACCUEIL</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // STEP 2: CUSTOMER INFO
  if (step === 'info') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.inner}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep('cart')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>VOS INFORMATIONS</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            
            {/* DELIVERY TYPE */}
            <Text style={styles.fieldLabel}>TYPE DE COMMANDE</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity 
                style={[styles.toggleBtn, deliveryType === 'delivery' && styles.toggleBtnActive]}
                onPress={() => setDeliveryType('delivery')}
              >
                <Ionicons name="bicycle-outline" size={18} color={deliveryType === 'delivery' ? '#000' : Theme.colors.textSecondary} />
                <Text style={[styles.toggleText, deliveryType === 'delivery' && styles.toggleTextActive]}>Livraison</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, deliveryType === 'pickup' && styles.toggleBtnActive]}
                onPress={() => setDeliveryType('pickup')}
              >
                <Ionicons name="walk-outline" size={18} color={deliveryType === 'pickup' ? '#000' : Theme.colors.textSecondary} />
                <Text style={[styles.toggleText, deliveryType === 'pickup' && styles.toggleTextActive]}>À emporter</Text>
              </TouchableOpacity>
            </View>

            
            {/* SCHEDULE ORDER */}
            {availableDates.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.fieldLabel}>QUAND SOUHAITEZ-VOUS VOTRE COMMANDE ?</Text>
                
                {/* DATES */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 12 }}>
                  {availableDates.map((d, i) => {
                    const isSelected = selectedDate?.toDateString() === d.toDateString();
                    const isToday = d.toDateString() === new Date().toDateString();
                    const label = isToday ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <TouchableOpacity 
                        key={i} 
                        style={[styles2.chip, isSelected && styles2.chipActive]} 
                        onPress={() => setSelectedDate(d)}
                      >
                        <Text style={[styles2.chipText, isSelected && styles2.chipTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* TIMES */}
                {availableTimes.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {availableTimes.map((t, i) => {
                      const isSelected = selectedTime === t;
                      const isBookedFull = deliveryType === 'delivery' && t !== 'ASAP' && (bookedDeliverySlots[t] || 0) >= 1;
                      return (
                        <TouchableOpacity 
                          key={i} 
                          style={[
                            styles2.timeChip, 
                            isSelected && styles2.timeChipActive,
                            isBookedFull && { opacity: 0.4, borderColor: '#ccc', backgroundColor: '#eee' }
                          ]} 
                          disabled={isBookedFull}
                          onPress={() => setSelectedTime(t)}
                        >
                          <Text style={[styles2.timeChipText, isSelected && styles2.timeChipTextActive, isBookedFull && { color: '#999', textDecorationLine: 'line-through' }]}>
                            {t === 'ASAP' ? 'Dès que possible' : t}
                            {isBookedFull ? ' (Complet)' : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text style={{ color: Theme.colors.danger, fontSize: 13 }}>Aucun créneau disponible pour cette date.</Text>
                )}
                {deliveryType === 'delivery' && (
                  <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary, marginTop: 6, fontStyle: 'italic' }}>
                    ℹ️ Livraison : 1 commande par tranche de 30 min maximum (ou dès que possible).
                  </Text>
                )}
              </View>
            )}

            {/* FORTE AFFLUENCE WARNING */}
            {activeOrdersCount >= 5 && (
              <View style={{ backgroundColor: '#fff7ed', borderColor: '#ffedd5', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Ionicons name="flame" size={22} color="#ea580c" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: '#9a3412' }}>Forte affluence en cuisine 🔥</Text>
                  <Text style={{ fontFamily: Theme.fonts.body, fontSize: 11, color: '#c2410c' }}>Le délai moyen est estimé à ~45-60 min actuellement.</Text>
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>NOM & PRÉNOM</Text>
            <TextInput style={styles.input} placeholder="Ex: Mohammed Ali" placeholderTextColor={Theme.colors.textSecondary} value={name} onChangeText={setName} />
            
            <Text style={styles.fieldLabel}>TÉLÉPHONE</Text>
            <TextInput style={styles.input} placeholder="Ex: 079 123 45 67" placeholderTextColor={Theme.colors.textSecondary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

            {deliveryType === 'delivery' && (
              <>
                <Text style={styles.fieldLabel}>ADRESSE DE LIVRAISON</Text>
                <TextInput style={[styles.input, { marginBottom: 10 }]} value={street} onChangeText={setStreet} placeholder="Rue et numéro" placeholderTextColor={Theme.colors.textSecondary} autoCapitalize="words" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={postalCode} onChangeText={setPostalCode} placeholder="Code postal" placeholderTextColor={Theme.colors.textSecondary} keyboardType="numeric" maxLength={4} />
                  <TextInput style={[styles.input, { flex: 2 }]} value={city} onChangeText={setCity} placeholder="Ville" placeholderTextColor={Theme.colors.textSecondary} autoCapitalize="words" />
                </View>

                {/* ZONE DETECTED */}
                {detectedZone && !zoneError && (
                  <View style={[styles.zoneBanner, { borderColor: Theme.colors.success }]}>
                    <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.zoneText, { color: Theme.colors.success }]}>
                        ✓ {detectedZone.name} — Livraison offerte
                      </Text>
                      <Text style={styles.zoneSubText}>Minimum atteint • ~{detectedZone.estimatedTime} min</Text>
                    </View>
                  </View>
                )}

                {/* MIN NOT MET */}
                {detectedZone && zoneError === 'min_not_met' && (
                  <View style={[styles.zoneBanner, { borderColor: '#FF9800' }]}>
                    <Ionicons name="alert-circle" size={16} color="#FF9800" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.zoneText, { color: '#FF9800' }]}>
                        {detectedZone.name}
                      </Text>
                      <Text style={styles.zoneSubText}>
                        Minimum de commande : {detectedZone.minOrder} CHF
                        {' '}(il vous manque {(detectedZone.minOrder - total).toFixed(2)} CHF)
                      </Text>
                    </View>
                  </View>
                )}

                {/* OUT OF ZONE */}
                {address.length > 4 && zoneError === 'out_of_zone' && (
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, color: Theme.colors.danger, fontSize: 13, marginTop: 4 }}>Désolé, nous ne livrons pas à cette adresse.</Text>
                )}
                {address.length > 4 && zoneError === 'min_not_met' && (
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, color: '#f59e0b', fontSize: 13, marginTop: 4 }}>Minimum de commande de CHF {detectedZone?.minOrder.toFixed(2)} non atteint pour cette zone.</Text>
                )}

                {user && deliveryType === 'delivery' && (
                  <TouchableOpacity onPress={() => setSaveAddress(!saveAddress)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 10 }}>
                    <Ionicons name={saveAddress ? 'checkbox' : 'square-outline'} size={24} color={saveAddress ? Theme.colors.success : Theme.colors.textSecondary} />
                    <Text style={{ marginLeft: 10, color: Theme.colors.text, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
                      Sauvegarder comme adresse par défaut
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>MÉTHODE DE PAIEMENT (À LA LIVRAISON)</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity 
                style={[styles.toggleBtn, paymentMethod === 'card' && styles.toggleBtnActive]} 
                onPress={() => setPaymentMethod('card')}
              >
                <Ionicons name="card-outline" size={20} color={paymentMethod === 'card' ? '#fff' : Theme.colors.text} />
                <Text style={[styles.toggleText, paymentMethod === 'card' && styles.toggleTextActive]}>Carte / Twint</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, paymentMethod === 'cash' && styles.toggleBtnActive]} 
                onPress={() => setPaymentMethod('cash')}
              >
                <Ionicons name="cash-outline" size={20} color={paymentMethod === 'cash' ? '#fff' : Theme.colors.text} />
                <Text style={[styles.toggleText, paymentMethod === 'cash' && styles.toggleTextActive]}>Cash</Text>
              </TouchableOpacity>
            </View>

            {/* POURBOIRE LIVREUR */}
            {deliveryType === 'delivery' && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.fieldLabel}>POURBOIRE POUR LE LIVREUR (FACULTATIF)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  {[0, 1, 2, 5].map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      onPress={() => setTipAmount(amount)}
                      style={[
                        styles2.chip,
                        tipAmount === amount && styles2.chipActive,
                        { flex: 1, alignItems: 'center', paddingHorizontal: 0 }
                      ]}
                    >
                      <Text style={[styles2.chipText, tipAmount === amount && styles2.chipTextActive, { fontSize: 12 }]}>
                        {amount === 0 ? 'Aucun' : `+${amount} CHF`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>NOTE POUR LA CUISINE (facultatif)</Text>
            <TextInput 
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
              placeholder="Ex: Sans oignons sur le poké..." 
              placeholderTextColor={Theme.colors.textSecondary}
              value={note}
              onChangeText={setNote}
              multiline
            />

            {/* SUMMARY */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Sous-total</Text><Text style={styles.summaryValue}>{total.toFixed(2)} CHF</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Frais de {deliveryType === 'delivery' ? 'livraison' : 'service'}</Text><Text style={styles.summaryValue}>{deliveryFee.toFixed(2)} CHF</Text></View>
              <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: Theme.colors.border, marginTop: 12, paddingTop: 12 }]}>
                <Text style={[styles.summaryLabel, { fontFamily: Theme.fonts.title, fontSize: 18, color: Theme.colors.text }]}>TOTAL</Text>
                <Text style={[styles.summaryValue, { fontFamily: Theme.fonts.title, fontSize: 20, color: Theme.colors.success }]}>{grandTotal.toFixed(2)} CHF</Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.goldBtn, ((!name || !phone) || (deliveryType === 'delivery' && zoneError !== '')) && { opacity: 0.5 }]} 
              onPress={handlePlaceOrder} 
              disabled={!name || !phone || (deliveryType === 'delivery' && zoneError !== '')}
            >
              <Text style={styles.goldBtnText}>CONFIRMER LA COMMANDE</Text>
              <Text style={[styles.goldBtnText, { opacity: 0.7, fontSize: 12 }]}>{grandTotal.toFixed(2)} CHF</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // STEP 1: CART
  return (
    <View style={[styles.container, Platform.OS === 'web' && { alignItems: 'center' }]}>
      <SafeAreaView style={[styles.inner, Platform.OS === 'web' && { width: '100%', maxWidth: 640 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VOTRE COMMANDE</Text>
          {items.length > 0 && (
            <TouchableOpacity onPress={clearCart} style={styles.backBtn}>
              <Text style={styles.clearText}>Vider</Text>
            </TouchableOpacity>
          )}
          {items.length === 0 && <View style={{ width: 40 }} />}
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons name="bag-handle-outline" size={64} color={Theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>Votre panier est vide</Text>
            <Text style={styles.emptySubtitle}>Découvrez nos spécialités et commencez votre sélection</Text>
            <TouchableOpacity style={styles.goldBtn} onPress={() => { router.back(); }}>
              <Text style={styles.goldBtnText}>VOIR LA CARTE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>ARTICLES ({items.length})</Text>
              
              {items.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <View style={styles.itemImageBox}>
                    <Image 
                      source={getImageSource(item.image)} 
                      style={styles.itemImage} 
                      contentFit="cover"
                      transition={200}
                    />
                    {!item.image && (
                      <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}>
                         <Ionicons name="restaurant-outline" size={24} color={Theme.colors.textSecondary} />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    {item.note && <Text style={styles.itemNote}>{item.note}</Text>}
                    {item.selectedOptions && Object.entries(item.selectedOptions).map(([sectionTitle, choices]) => (
                      <Text key={sectionTitle} style={styles.itemNote}>
                        <Text style={{ fontFamily: Theme.fonts.bodyBold }}>{sectionTitle.split(' (')[0]}: </Text>
                        {choices.join(', ')}
                      </Text>
                    ))}
                    <Text style={styles.itemPrice}>{item.price.toFixed(2)} CHF</Text>
                  </View>
                  
                  <View style={styles.itemRight}>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity 
                        style={[styles.qtyBtn, { marginRight: 8, backgroundColor: Theme.colors.surface }]} 
                        onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.productId || item.id.split('-')[0], editCartItemId: item.id } })}
                      >
                        <Ionicons name="pencil" size={16} color={Theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
                        <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={16} color={item.quantity === 1 ? Theme.colors.danger : Theme.colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
                        <Ionicons name="add" size={16} color={Theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.itemTotal}>{(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                </View>
              ))}

              {/* LOYALTY CARD UI */}
              {settings.loyaltyEnabled && user && (
                <View style={styles.loyaltyCard}>
                  <View style={styles.loyaltyHeader}>
                    <Ionicons name="gift-outline" size={20} color={Theme.colors.success} />
                    <Text style={styles.loyaltyTitle}>CARTE DE FIDÉLITÉ</Text>
                    <Text style={styles.loyaltyPointsText}>{user.loyaltyPoints || 0} / 10</Text>
                  </View>
                  
                  <View style={styles.loyaltyGrid}>
                    {[...Array(10)].map((_, i) => (
                      <View key={i} style={[styles.stamp, (user.loyaltyPoints || 0) > i && styles.stampFilled]}>
                        <Ionicons 
                          name={(user.loyaltyPoints || 0) > i ? "checkmark" : "restaurant-outline"} 
                          size={14} 
                          color={(user.loyaltyPoints || 0) > i ? "#000" : Theme.colors.textSecondary} 
                        />
                      </View>
                    ))}
                  </View>

                  {(user.loyaltyPoints || 0) >= 10 && (
                    <TouchableOpacity 
                      style={[styles.useLoyaltyBtn, useLoyalty && styles.useLoyaltyBtnActive]}
                      onPress={() => setUseLoyalty(!useLoyalty)}
                    >
                      <Ionicons name={useLoyalty ? "checkmark-circle" : "add-circle-outline"} size={20} color={useLoyalty ? "#000" : Theme.colors.success} />
                      <Text style={[styles.useLoyaltyText, useLoyalty && styles.useLoyaltyTextActive]}>
                        {useLoyalty ? "Poké Gratuit Appliqué ! ✅" : "Utiliser mon Poké Gratuit 🎁"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {(user.loyaltyPoints || 0) < 10 && (
                   <Text style={styles.loyaltySubtext}>
                     Encore {10 - (user.loyaltyPoints || 0)} commande(s) pour votre prochain cadeau !
                   </Text>
                  )}
                </View>
              )}

              {/* CODE PROMO */}
              <View style={{ backgroundColor: Theme.colors.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Theme.colors.border, marginTop: 16 }}>
                <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 11, color: Theme.colors.textSecondary, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
                  Code Promo / Bon de réduction
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0, paddingVertical: 10, textTransform: 'uppercase', fontFamily: Theme.fonts.bodyBold }]}
                    placeholder="Ex: BIENVENUE10"
                    placeholderTextColor="#999"
                    value={promoCodeInput}
                    onChangeText={(t) => { setPromoCodeInput(t.toUpperCase()); setPromoError(''); }}
                    editable={!appliedPromo}
                  />
                  {appliedPromo ? (
                    <TouchableOpacity 
                      onPress={() => { setAppliedPromo(null); setPromoCodeInput(''); }} 
                      style={{ backgroundColor: Theme.colors.danger + '22', paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center' }}
                    >
                      <Text style={{ fontFamily: Theme.fonts.bodyBold, color: Theme.colors.danger, fontSize: 12 }}>Retirer</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      onPress={() => {
                        const code = promoCodeInput.trim().toUpperCase();
                        if (!code) {
                          setPromoError('Veuillez entrer un code');
                          return;
                        }

                        // Vérifier si l'utilisateur a déjà utilisé ce code
                        if (user?.usedPromoCodes?.includes(code)) {
                          setPromoError(`Vous avez déjà utilisé le code ${code} sur votre compte.`);
                          return;
                        }

                        // Code de bienvenue : uniquement pour la première commande
                        const isWelcomePromo = code === 'BIENVENUE10' || code === 'BIENVENUE' || code === 'WELCOME10';
                        if (isWelcomePromo) {
                          const userPastOrders = (orders || []).filter(o => 
                            (user?.id && o.userId === user.id) || 
                            (user?.phone && (o as any).customerPhone === user.phone)
                          );
                          if (userPastOrders.length > 0 || (user?.loyaltyPoints && user.loyaltyPoints > 0) || user?.usedPromoCodes?.includes('BIENVENUE10')) {
                            setPromoError('Le code BIENVENUE10 est réservé exclusivement aux nouveaux clients pour leur 1ère commande.');
                            return;
                          }
                          setAppliedPromo({ code: 'BIENVENUE10', discountPercent: 10 });
                          setPromoError('');
                          return;
                        }

                        const foundPromo = (settings?.promoCodes || []).find(p => p.code.toUpperCase() === code && p.active);
                        if (foundPromo) {
                          const nowStr = new Date().toISOString().split('T')[0];

                          // Vérification date de début
                          if (foundPromo.startDate && foundPromo.startDate > nowStr) {
                            setPromoError(`Ce code sera disponible à partir du ${foundPromo.startDate}.`);
                            return;
                          }

                          // Vérification date d'expiration
                          if (foundPromo.endDate && foundPromo.endDate < nowStr) {
                            setPromoError(`Ce code promo a expiré le ${foundPromo.endDate}.`);
                            return;
                          }

                          // Vérification 1ère commande
                          if (foundPromo.firstOrderOnly) {
                            const userPastOrders = (orders || []).filter(o => 
                              (user?.id && o.userId === user.id) || 
                              (user?.phone && (o as any).customerPhone === user.phone)
                            );
                            if (userPastOrders.length > 0 || (user?.loyaltyPoints && user.loyaltyPoints > 0) || user?.usedPromoCodes?.includes(foundPromo.code)) {
                              setPromoError(`Le code ${foundPromo.code} est réservé exclusivement aux nouveaux clients.`);
                              return;
                            }
                          }

                          if (foundPromo.minOrder && total < foundPromo.minOrder) {
                            setPromoError(`Minimum de ${foundPromo.minOrder} CHF requis pour ce code.`);
                            return;
                          }
                          setAppliedPromo({
                            code: foundPromo.code,
                            discountPercent: foundPromo.discountType === 'percent' ? foundPromo.discountValue : 0,
                            fixedAmount: foundPromo.discountType === 'fixed' ? foundPromo.discountValue : 0
                          });
                          setPromoError('');
                        } else if (code === 'POKE5') {
                          setAppliedPromo({ code: 'POKE5', discountPercent: 0, fixedAmount: 5 });
                          setPromoError('');
                        } else {
                          setPromoError('Code promo invalide ou expiré');
                        }
                      }} 
                      style={{ backgroundColor: Theme.colors.text, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' }}
                    >
                      <Text style={{ fontFamily: Theme.fonts.bodyBold, color: Theme.colors.background, fontSize: 12 }}>Appliquer</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {appliedPromo && (
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: Theme.colors.success, marginTop: 6 }}>
                    ✓ Code {appliedPromo.code} appliqué : -{promoDiscount.toFixed(2)} CHF !
                  </Text>
                )}
                {promoError ? (
                  <Text style={{ fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.danger, marginTop: 6 }}>
                    {promoError}
                  </Text>
                ) : null}
              </View>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Sous-total</Text><Text style={styles.summaryValue}>{total.toFixed(2)} CHF</Text></View>
                {deliveryType === 'delivery' && deliveryFee > 0 && (
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Frais de livraison</Text><Text style={styles.summaryValue}>{deliveryFee.toFixed(2)} CHF</Text></View>
                )}
                {tipAmount > 0 && (
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Pourboire livreur</Text><Text style={styles.summaryValue}>+{tipAmount.toFixed(2)} CHF</Text></View>
                )}
                {useLoyalty && (
                   <View style={styles.summaryRow}>
                     <Text style={[styles.summaryLabel, { color: Theme.colors.success }]}>Remise Fidélité (Poké Offert)</Text>
                     <Text style={[styles.summaryValue, { color: Theme.colors.success }]}>-{loyaltyDiscount.toFixed(2)} CHF</Text>
                   </View>
                )}
                {appliedPromo && promoDiscount > 0 && (
                   <View style={styles.summaryRow}>
                     <Text style={[styles.summaryLabel, { color: Theme.colors.success }]}>Remise Code ({appliedPromo.code})</Text>
                     <Text style={[styles.summaryValue, { color: Theme.colors.success }]}>-{promoDiscount.toFixed(2)} CHF</Text>
                   </View>
                )}
                <View style={[styles.summaryRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border, marginTop: 12, paddingTop: 12 }]}>
                  <Text style={[styles.summaryLabel, { fontFamily: Theme.fonts.title, fontSize: 20, color: Theme.colors.text }]}>TOTAL</Text>
                  <Text style={[styles.summaryValue, { fontFamily: Theme.fonts.title, fontSize: 22, color: Theme.colors.success }]}>{grandTotal.toFixed(2)} CHF</Text>
                </View>
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.goldBtn} onPress={handleGoToInfo}>
                <Text style={styles.goldBtnText}>CONTINUER MA COMMANDE</Text>
                <Text style={[styles.goldBtnText, { opacity: 0.7, fontSize: 12 }]}>{grandTotal.toFixed(2)} CHF</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

function TrackingStep({ icon, label, done, active }: { icon: string, label: string, done: boolean, active: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[trackStyles.circle, done && trackStyles.circleDone]}>
        <Ionicons name={icon as any} size={16} color={done ? '#000' : Theme.colors.textSecondary} />
      </View>
      <Text style={[trackStyles.label, active && trackStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const trackStyles = StyleSheet.create({
  circle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  circleDone: { backgroundColor: Theme.colors.success, borderColor: Theme.colors.success },
  label: { fontFamily: Theme.fonts.body, fontSize: 10, color: Theme.colors.textSecondary, marginTop: 4 },
  labelActive: { color: Theme.colors.success, fontFamily: Theme.fonts.bodyMedium },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  inner: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Theme.colors.border },
  headerTitle: { fontFamily: Theme.fonts.logo, fontSize: 20, color: Theme.colors.text, letterSpacing: 4 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 13, color: Theme.colors.danger },
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  emptyTitle: { fontFamily: Theme.fonts.title, fontSize: 28, color: Theme.colors.text, letterSpacing: 2 },
  emptySubtitle: { fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.textSecondary, textAlign: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 11, color: Theme.colors.textSecondary, letterSpacing: 2, marginBottom: 16 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 12, marginBottom: 10 },
  itemImageBox: { width: 66, height: 66, backgroundColor: Theme.colors.surface, overflow: 'hidden', borderRadius: 12, flexShrink: 0 },
  itemImage: { width: '100%', height: '100%' },
  itemInfo: { flex: 1, minWidth: 0, justifyContent: 'center' },
  itemName: { fontFamily: Theme.fonts.title, fontSize: 18, color: Theme.colors.text, marginBottom: 2, letterSpacing: 0.5 },
  itemNote: { fontFamily: Theme.fonts.body, fontSize: 10, color: Theme.colors.success, marginTop: 2, fontStyle: 'italic' },
  itemPrice: { fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary },
  itemRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.background, gap: 4, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 100 },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: Theme.fonts.bodyBold, fontSize: 13, color: Theme.colors.text, minWidth: 20, textAlign: 'center' },
  itemTotal: { fontFamily: Theme.fonts.title, fontSize: 15, color: Theme.colors.primary, textAlign: 'right' },
  summaryBox: { marginTop: 30, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.textSecondary },
  summaryValue: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.text },
  footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.border, backgroundColor: Theme.colors.background },
  goldBtn: { backgroundColor: Theme.colors.success, paddingVertical: 18, paddingHorizontal: 24, borderRadius: 100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: Theme.colors.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  goldBtnText: { fontFamily: Theme.fonts.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 0.5 },
  fieldLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, letterSpacing: 2, marginBottom: 8, marginTop: 20 },
  input: { backgroundColor: Theme.colors.surface, padding: 16, fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.text, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border, borderRadius: 12 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12 },
  toggleBtnActive: { backgroundColor: Theme.colors.success, borderColor: Theme.colors.success },
  toggleText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.textSecondary },
  toggleTextActive: { color: '#FFF' },
  // Confirmation
  confirmationScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  confirmationIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Theme.colors.success, alignItems: 'center', justifyContent: 'center', shadowColor: Theme.colors.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  confirmTitle: { fontFamily: Theme.fonts.logo, fontSize: 30, color: Theme.colors.text, letterSpacing: 4, textAlign: 'center' },
  confirmOrderId: { fontFamily: Theme.fonts.bodyMedium, fontSize: 14, color: Theme.colors.success, letterSpacing: 2 },
  confirmSubtitle: { fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  trackingBox: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', marginVertical: 8 },
  trackingLine: { flex: 1, height: 1, backgroundColor: Theme.colors.border },
  infoCard: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Theme.colors.border, paddingVertical: 12 },
  infoCardLabel: { fontFamily: Theme.fonts.bodyMedium, fontSize: 11, color: Theme.colors.textSecondary, letterSpacing: 2 },
  infoCardValue: { fontFamily: Theme.fonts.title, fontSize: 18, color: Theme.colors.text },
  // Zone delivery feedback
  zoneBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1, backgroundColor: Theme.colors.surface },
  zoneText: { fontFamily: Theme.fonts.bodyMedium, fontSize: 13, marginBottom: 2 },
  zoneSubText: { fontFamily: Theme.fonts.body, fontSize: 12, color: Theme.colors.textSecondary },
  // Loyalty styles
  loyaltyCard: { backgroundColor: Theme.colors.surface, padding: 20, borderRadius: 20, borderStyle: 'dotted', borderWidth: 2, borderColor: Theme.colors.border, marginTop: 20 },
  loyaltyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  loyaltyTitle: { fontFamily: Theme.fonts.title, color: Theme.colors.text, fontSize: 16, letterSpacing: 2, flex: 1 },
  loyaltyPointsText: { fontFamily: Theme.fonts.bodyBold, color: Theme.colors.success, fontSize: 12 },
  loyaltyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15, justifyContent: 'center' },
  stamp: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  stampFilled: { backgroundColor: Theme.colors.success, borderColor: Theme.colors.success },
  loyaltySubtext: { fontFamily: Theme.fonts.body, fontSize: 11, color: Theme.colors.textSecondary, textAlign: 'center' , fontStyle: 'italic'},
  useLoyaltyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12, backgroundColor: Theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.success },
  useLoyaltyBtnActive: { backgroundColor: Theme.colors.success },
  useLoyaltyText: { fontFamily: Theme.fonts.bodyBold, color: Theme.colors.success, fontSize: 13 },
  useLoyaltyTextActive: { color: '#FFF' },
});
