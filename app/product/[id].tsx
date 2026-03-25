import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Theme } from '../../constants/theme';
import { PRODUCTS } from '../../constants/data';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../store/useCartStore';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { getImageSource } from '../../constants/data';

const { height } = Dimensions.get('window');

const WITH_OUT = ['Sans Oignons', 'Sans Tomates', 'Sans Salade', 'Sans Choux'];
const SUPPLEMENTS = [
  { name: 'Frites', price: 2.00 },
  { name: 'Fromage Feta', price: 1.50 },
  { name: 'Viande Supplémentaire', price: 3.50 }
];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const { products, settings } = useRestaurantStore();
  const product = products.find((p) => p.id === id) || PRODUCTS.find((p) => p.id === id);
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const SAUCES = settings?.sauces || [];
  const DRINKS = settings?.drinks || [];

  const [quantity, setQuantity] = useState(1);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);
  const [without, setWithout] = useState<string[]>([]);
  const [selectedSupps, setSelectedSupps] = useState<string[]>([]);

  const inCart = cartItems.find(i => i.id.startsWith(id as string));

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Produit introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFallback}>
          <Text style={{ color: Theme.colors.success }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCustomizable = !['BOISSONS', 'DESSERTS'].includes(product.category);

  const toggleWithout = (item: string) => setWithout(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  const toggleSupp = (item: string) => setSelectedSupps(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  
  const toggleSauce = (sauce: string) => {
    if (selectedSauces.includes(sauce)) {
      setSelectedSauces(prev => prev.filter(s => s !== sauce));
    } else {
      if (selectedSauces.length < 2) {
        setSelectedSauces(prev => [...prev, sauce]);
      } else {
        // Optionnel: remplacer la première ou ne rien faire. Ici on ne fait rien pour respecter la limite.
      }
    }
  };

  const supplementTotal = selectedSupps.reduce((acc, curr) => {
    const supp = SUPPLEMENTS.find(s => s.name === curr);
    return acc + (supp ? supp.price : 0);
  }, 0);

  const basePrice = product.price + supplementTotal;
  const lineTotal = (basePrice * quantity).toFixed(2);

  const handleAddToCart = () => {
    const parts = [];
    if (selectedSauces.length > 0) parts.push(`Sauce(s): ${selectedSauces.join(' & ')}`);
    if (selectedDrink) parts.push(`Boisson: ${selectedDrink}`);
    if (without.length > 0) parts.push(`Sans: ${without.join(', ')}`);
    if (selectedSupps.length > 0) parts.push(...selectedSupps.map(s => `+${s}`));
    
    const note = parts.length > 0 ? parts.join(' | ') : undefined;
    const customProduct = { ...product, price: basePrice };

    addItem(customProduct, note, quantity);
    router.back();
  };

  if (!product) return null;

  return (
    <View style={styles.container}>
      {/* FULL-WIDTH IMAGE */}
      <View style={styles.imageStage}>
        <Image 
          source={getImageSource(product.image)} 
          style={styles.image} 
          contentFit="cover" 
        />
        <View style={styles.imageOverlay} />
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={Theme.colors.text} />
        </TouchableOpacity>
        {product.highlighted && (
          <View style={styles.maison}>
            <Text style={styles.maisonText}>MAISON</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* CATEGORY TAG */}
        <Text style={styles.categoryTag}>{product.category?.toUpperCase()}</Text>

        {/* TITLE & PRICE */}
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          <View style={styles.priceContainer}>
             <Text style={styles.price}>{product.price.toFixed(2)}</Text>
             <Text style={styles.currency}>CHF</Text>
          </View>
        </View>

        {/* DESCRIPTION */}
        <Text style={styles.description}>
          {product.description || `Un délicieux ${product.name} préparé avec des ingrédients frais sélectionnés chaque matin. Servi chaud, à déguster sur place ou à emporter.`}
        </Text>

        {/* CUSTOMIZATION OPTIONS */}
        {product.hasSauces && (
          <>
            <View style={styles.divider} />
            <Text style={styles.optionsLabel}>CHOISISSEZ VOS SAUCES (MAX 2)</Text>
            <View style={{ marginBottom: 10 }}>
               {selectedSauces.length === 2 && <Text style={{ color: Theme.colors.primary, fontSize: 12, fontFamily: Theme.fonts.bodyMedium }}>Limite atteinte (2 sauces max)</Text>}
            </View>
            {SAUCES.map((sauce) => {
              const isActive = selectedSauces.includes(sauce);
              return (
                <TouchableOpacity key={sauce} style={styles.optionRow} onPress={() => toggleSauce(sauce)}>
                  <Text style={styles.optionLabel}>{sauce}</Text>
                  <View style={[styles.checkbox, isActive && styles.checkboxSelected]}>
                    {isActive && <Ionicons name="checkmark" size={14} color="#000" />}
                  </View>
                </TouchableOpacity>
              )
            })}
          </>
        )}

        {product.hasDrinkSelection && (
          <>
            <View style={styles.divider} />
            <Text style={styles.optionsLabel}>CHOISISSEZ VOTRE BOISSON (33CL)</Text>
            {DRINKS.filter(d => {
              if (typeof d === 'string') return true;
              if (d.outOfStock) return false;
              
              const productName = product.name.toLowerCase();
              const isMenu = productName.includes('menu') || productName.includes('etudiant') || (product.category && product.category.toLowerCase().includes('menu'));
              
              if (isMenu) {
                 // For menus, only 33cl or similar
                 const sizeNum = parseInt(d.size) || 0;
                 return sizeNum <= 33 || d.size.toLowerCase().includes('33');
              }
              
              // Filter by specific size if mentioned in product name
              if (productName.includes('33cl') || productName.includes('canne')) {
                return d.size.toLowerCase().includes('33') || d.size.toLowerCase().includes('25');
              }
              if (productName.includes('50cl') || productName.includes('0,5') || productName.includes('0.5')) {
                return d.size.toLowerCase().includes('50') || d.size.toLowerCase().includes('0,5') || d.size.toLowerCase().includes('0.5');
              }
              if (productName.includes('1.5l') || productName.includes('1,5')) {
                return d.size.toLowerCase().includes('1.5') || d.size.toLowerCase().includes('1,5');
              }

              return true;
            }).map((drink) => {
              const name = typeof drink === 'string' ? drink : drink.name;
              const size = typeof drink === 'string' ? '' : drink.size;
              return (
                <TouchableOpacity 
                  key={name} 
                  style={styles.optionRow} 
                  onPress={() => setSelectedDrink(name)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{name}</Text>
                    {size ? <Text style={{ fontSize: 10, color: Theme.colors.textSecondary }}>{size}</Text> : null}
                  </View>
                  <View style={[styles.radio, selectedDrink === name && styles.radioSelected]}>
                    {selectedDrink === name && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {isCustomizable && (
          <>
            <View style={styles.divider} />
            <Text style={styles.optionsLabel}>INGRÉDIENTS À RETIRER</Text>
            {WITH_OUT.map((item) => (
              <TouchableOpacity key={item} style={styles.optionRow} onPress={() => toggleWithout(item)}>
                <Text style={styles.optionLabel}>{item}</Text>
                <View style={[styles.checkbox, without.includes(item) && styles.checkboxSelected]}>
                  {without.includes(item) && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />
            <Text style={styles.optionsLabel}>SUPPLÉMENTS</Text>
            {SUPPLEMENTS.map((supp) => (
              <TouchableOpacity key={supp.name} style={styles.optionRow} onPress={() => toggleSupp(supp.name)}>
                <Text style={styles.optionLabel}>{supp.name} (+{supp.price.toFixed(2)} CHF)</Text>
                <View style={[styles.checkbox, selectedSupps.includes(supp.name) && styles.checkboxSelected]}>
                  {selectedSupps.includes(supp.name) && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={styles.divider} />

        {/* QUANTITY */}
        <Text style={styles.optionsLabel}>QUANTITÉ</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
            <Ionicons name="remove" size={20} color={quantity === 1 ? Theme.colors.textSecondary : Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => q + 1)}>
            <Ionicons name="add" size={20} color={Theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* STICKY FOOTER */}
      <View style={styles.footer}>
        {inCart && (
          <Text style={styles.alreadyInCart}>
            <Ionicons name="checkmark-circle" size={14} color={Theme.colors.success} /> Déjà dans votre commande ({inCart.quantity}x)
          </Text>
        )}
        <TouchableOpacity style={styles.addBtn} onPress={handleAddToCart} activeOpacity={0.85}>
          <Text style={styles.addBtnText} numberOfLines={1}>AJOUTER AU PANIER</Text>
          <View style={styles.addBtnPriceBox}>
             <Text style={styles.addBtnPrice}>{lineTotal}</Text>
             <Text style={styles.addBtnCurrency}>CHF</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  imageStage: {
    width: '100%',
    height: Platform.OS === 'web' ? 300 : height * 0.42,
    position: 'relative',
    backgroundColor: Theme.colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  maison: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: Theme.colors.success, // Gold
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  maisonText: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 10,
    color: '#000',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },
  categoryTag: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 10,
    color: Theme.colors.primary,
    letterSpacing: 3,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  name: {
    fontFamily: Theme.fonts.title,
    fontSize: 30, // Slightly reduced
    color: Theme.colors.text,
    letterSpacing: 1,
    flex: 1,
    marginRight: 8,
  },
  priceContainer: {
    alignItems: 'flex-end',
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  price: {
    fontFamily: Theme.fonts.title,
    fontSize: 22,
    color: Theme.colors.success,
  },
  currency: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 10,
    color: Theme.colors.textSecondary,
    marginTop: -4,
  },
  description: {
    fontFamily: Theme.fonts.body,
    fontSize: 14,
    color: Theme.colors.textSecondary,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Theme.colors.border,
    marginVertical: 24,
  },
  optionsLabel: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 10,
    color: Theme.colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
  },
  optionLabel: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 16,
    color: Theme.colors.text,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Theme.colors.success,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.success,
  },
  checkbox: { 
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, 
    borderColor: Theme.colors.border, alignItems: 'center', justifyContent: 'center' 
  },
  checkboxSelected: { 
    backgroundColor: Theme.colors.success, borderColor: Theme.colors.success 
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  qtyText: {
    fontFamily: Theme.fonts.title,
    fontSize: 28,
    color: Theme.colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: Theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
  },
  alreadyInCart: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: Theme.colors.success,
    marginBottom: 8,
    textAlign: 'center',
  },
  addBtn: {
    backgroundColor: Theme.colors.success,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 100,
    shadowColor: Theme.colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  addBtnText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 15, // Slightly smaller
    color: '#000',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 10,
  },
  addBtnPriceBox: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  addBtnPrice: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 16,
    color: '#000',
  },
  addBtnCurrency: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 10,
    color: '#000',
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
    gap: 16,
  },
  errorText: {
    fontFamily: Theme.fonts.title,
    fontSize: 24,
    color: Theme.colors.text,
  },
  backBtnFallback: {
    padding: 12,
  },
});
