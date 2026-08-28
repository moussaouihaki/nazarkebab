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



export default function ProductDetailScreen() {
  const { id, editCartItemId } = useLocalSearchParams();
  const { products, settings } = useRestaurantStore();
  const product = products.find((p) => p.id === id) || PRODUCTS.find((p) => p.id === id);
  const addItem = useCartStore((state) => state.addItem);
  const removeAllOfItem = useCartStore((state) => state.removeAllOfItem);
  const cartItems = useCartStore((state) => state.items);
  const SAUCES = settings?.sauces || [];
  const DRINKS = settings?.drinks || [];

  const [quantity, setQuantity] = useState(1);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);

  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, string[]>>({});
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});

  const inCart = cartItems.find(i => i.id.startsWith(id as string));

  React.useEffect(() => {
    if (editCartItemId) {
      const editItem = cartItems.find(i => i.id === editCartItemId);
      if (editItem) {
        setQuantity(editItem.quantity);
        if (editItem.selectedOptions) {
          setSelectedCustomOptions(editItem.selectedOptions);
        }
        if (editItem.note) {
          const parts = editItem.note.split(' | ');
          parts.forEach(p => {
             if (p.startsWith('Sauce(s): ')) {
                setSelectedSauces(p.replace('Sauce(s): ', '').split(' & '));
             }
             if (p.startsWith('Boisson: ')) {
                setSelectedDrink(p.replace('Boisson: ', ''));
             }
          });
        }
      }
    }
  }, [editCartItemId, cartItems]);

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


  
  const toggleSauce = (sauce: string) => {
    if (selectedSauces.includes(sauce)) {
      setSelectedSauces(prev => prev.filter(s => s !== sauce));
    } else {
      if (selectedSauces.length < 2) {
        setSelectedSauces(prev => [...prev, sauce]);
      }
    }
  };

  const addCustomOption = (sectionTitle: string, choiceName: string, maxChoices: number) => {
    setSelectedCustomOptions(prev => {
      const currentSelected = prev[sectionTitle] || [];
      if (maxChoices === 1) {
        return { ...prev, [sectionTitle]: [choiceName] }; // Replace
      }
      if (currentSelected.length < maxChoices) {
        return { ...prev, [sectionTitle]: [...currentSelected, choiceName] };
      }
      return prev; // Max reached
    });
  };

  const removeCustomOption = (sectionTitle: string, choiceName: string) => {
    setSelectedCustomOptions(prev => {
      const currentSelected = prev[sectionTitle] || [];
      const index = currentSelected.lastIndexOf(choiceName);
      if (index > -1) {
        const newSelected = [...currentSelected];
        newSelected.splice(index, 1);
        return { ...prev, [sectionTitle]: newSelected };
      }
      return prev;
    });
  };

  const toggleCustomOption = (sectionTitle: string, choiceName: string, maxChoices: number) => {
    setSelectedCustomOptions(prev => {
      const currentSelected = prev[sectionTitle] || [];
      if (currentSelected.includes(choiceName)) {
        return { ...prev, [sectionTitle]: currentSelected.filter(c => c !== choiceName) };
      }
      if (maxChoices === 1) {
        return { ...prev, [sectionTitle]: [choiceName] }; // Replace
      }
      if (currentSelected.length < maxChoices) {
        return { ...prev, [sectionTitle]: [...currentSelected, choiceName] };
      }
      return prev; // Max reached
    });
  };

  const supplementTotal = 0;

  let customTotal = 0;
  if (product.customizationSections) {
    product.customizationSections.forEach(sec => {
      const selected = selectedCustomOptions[sec.title] || [];
      selected.forEach(choiceName => {
        const choice = sec.choices.find(c => c.name === choiceName);
        if (choice) customTotal += choice.priceOffset;
      });
    });
  }

  let extrasTotal = 0;
  Object.keys(selectedExtras).forEach(extraId => {
    const qty = selectedExtras[extraId];
    if (qty > 0) {
      const extraProd = products.find(p => p.id === extraId);
      if (extraProd) {
        extrasTotal += extraProd.price * qty;
      }
    }
  });

  const basePrice = product.price + supplementTotal + customTotal;
  const lineTotal = (basePrice * quantity + extrasTotal).toFixed(2);

  const missingRequiredSections = product.customizationSections?.filter(sec => {
    const title = sec.title.toLowerCase();
    if (title.includes('boisson') || title.includes('dessert')) return false;
    return sec.required && (!selectedCustomOptions[sec.title] || selectedCustomOptions[sec.title].length === 0);
  }) || [];
  const isAddDisabled = missingRequiredSections.length > 0;

  const handleAddToCart = () => {
    if (isAddDisabled) return;
    const parts = [];
    if (selectedSauces.length > 0) parts.push(`Sauce(s): ${selectedSauces.join(' & ')}`);
    if (selectedDrink) parts.push(`Boisson: ${selectedDrink}`);

    const note = parts.length > 0 ? parts.join(' | ') : undefined;
    const customProduct = { ...product, price: basePrice };

    const cleanSelectedOptions: Record<string, string[]> = {};
    Object.keys(selectedCustomOptions).forEach(k => {
      if (selectedCustomOptions[k] && selectedCustomOptions[k].length > 0) {
        cleanSelectedOptions[k] = selectedCustomOptions[k];
      }
    });

    if (editCartItemId) {
      removeAllOfItem(editCartItemId as string);
    }

    addItem(customProduct, note, quantity, Object.keys(cleanSelectedOptions).length > 0 ? cleanSelectedOptions : undefined);

    // Add selected extras to cart separately
    Object.keys(selectedExtras).forEach(extraId => {
      const qty = selectedExtras[extraId];
      if (qty > 0) {
        const extraProd = products.find(p => p.id === extraId);
        if (extraProd) {
          addItem(extraProd, undefined, qty, undefined);
        }
      }
    });

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
        
        <SafeAreaView style={styles.headerControls}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/cart')}>
            <Ionicons name="bag-handle-outline" size={22} color={Theme.colors.text} />
            {cartItems.length > 0 && (
              <View style={styles.headerBadge}>
                 <Text style={styles.headerBadgeText}>{cartItems.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.sheetContent}>
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
          {product.description || `Un délicieux ${product.name} préparé avec des ingrédients frais sélectionnés chaque matin.`}
        </Text>


        {/* DYNAMIC ALLERGENS SECTION */}
        {product.allergens && product.allergens.length > 0 && (
          <View style={{ marginVertical: 24 }}>
             <Text style={styles.sectionTitleBlack}>Allergènes</Text>
             <View style={styles.allergensList}>
                {product.allergens.map((al, idx) => (
                   <View key={idx} style={{ alignItems: 'center', marginRight: 16 }}>
                     <View style={[styles.allergenIconWrapper, { marginBottom: 6 }]}>
                        <Ionicons name="warning-outline" size={18} color="#FFF" />
                     </View>
                     <Text style={{ fontFamily: Theme.fonts.bodyMedium, fontSize: 10, color: Theme.colors.textSecondary, textTransform: 'uppercase' }}>
                       {al}
                     </Text>
                   </View>
                ))}
             </View>
          </View>
        )}

        {/* DYNAMIC CUSTOMIZATION SECTIONS */}
        {product.customizationSections?.map((section) => {
          const selected = selectedCustomOptions[section.title] || [];
          return (
            <React.Fragment key={section.title}>
              <View style={styles.divider} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.sectionTitleBlack, { marginBottom: 0 }]}>{section.title}</Text>
                {section.required && selected.length === 0 && (
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 10, color: Theme.colors.danger }}>OBLIGATOIRE</Text>
                )}
              </View>
              
              {section.maxChoices === 1 ? (
                // Single Choice -> Pills
                <View style={styles.pillsContainer}>
                  {section.choices.map(choice => {
                    const isActive = selected.includes(choice.name);
                    return (
                      <TouchableOpacity 
                        key={choice.name} 
                        style={[styles.pillBtn, isActive && styles.pillBtnActive]}
                        onPress={() => toggleCustomOption(section.title, choice.name, section.maxChoices)}
                      >
                         <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{choice.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                // Multi Choice -> List with Steppers
                <View style={styles.extrasContainer}>
                  {section.choices.map(choice => {
                    const count = selected.filter(x => x === choice.name).length;
                    const isMaxedOut = selected.length >= section.maxChoices;
                    return (
                      <View key={choice.name} style={[styles.extraRow, isMaxedOut && count === 0 && { opacity: 0.5 }]}>
                         <View style={{ flex: 1 }}>
                            <Text style={styles.extraName}>{choice.name}</Text>
                            <Text style={styles.extraPrice}>{choice.priceOffset > 0 ? '+' : ''}{choice.priceOffset.toFixed(2)} CHF</Text>
                         </View>
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            {count > 0 && (
                              <TouchableOpacity 
                                style={[styles.extraAddBtn, { backgroundColor: Theme.colors.surface }]}
                                onPress={() => removeCustomOption(section.title, choice.name)}
                              >
                                <Ionicons name="remove" size={16} color={Theme.colors.text} />
                              </TouchableOpacity>
                            )}
                            {count > 0 && (
                              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 14 }}>{count}</Text>
                            )}
                            <TouchableOpacity 
                               style={[styles.extraAddBtn, isMaxedOut && { opacity: 0.5 }]}
                               onPress={() => !isMaxedOut && addCustomOption(section.title, choice.name, section.maxChoices)}
                               activeOpacity={isMaxedOut ? 1 : 0.7}
                            >
                               <Ionicons name="add" size={16} color={Theme.colors.text} />
                            </TouchableOpacity>
                         </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </React.Fragment>
          );
        })}

        {/* CUSTOMIZATION OPTIONS (LEGACY) */}
        {product.hasSauces && !product.customizationSections && (
          <>
            <View style={styles.divider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitleBlack, { marginBottom: 0 }]}>SAUCES (MAX 2)</Text>
              {selectedSauces.length === 2 && (
                 <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 10, color: Theme.colors.textSecondary }}>LIMITE ATTEINTE</Text>
              )}
            </View>
            <View style={styles.pillsContainer}>
               {SAUCES.map((sauce) => {
                 const isActive = selectedSauces.includes(sauce);
                 return (
                   <TouchableOpacity 
                     key={sauce} 
                     style={[styles.pillBtn, isActive && styles.pillBtnActive]} 
                     onPress={() => toggleSauce(sauce)}
                   >
                     <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{sauce}</Text>
                   </TouchableOpacity>
                 )
               })}
            </View>
          </>
        )}

        {product.hasDrinkSelection && !product.customizationSections && (
          <>
            <View style={styles.divider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitleBlack, { marginBottom: 0 }]}>BOISSON</Text>
            </View>
            <View style={styles.pillsContainer}>
            {products.filter(d => d.category === 'BOISSONS' && !d.outOfStock).map((drink) => {
              const name = drink.name;
              
              // Extract size from description or assume empty if not provided for now
              const size = drink.description?.includes('cl') || drink.description?.includes('L') 
                ? drink.description 
                : '';
                
              const isActive = selectedDrink === name;
              return (
                 <TouchableOpacity 
                   key={name} 
                   style={[styles.pillBtn, isActive && styles.pillBtnActive]} 
                   onPress={() => setSelectedDrink(name)}
                 >
                   <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{name} {size}</Text>
                 </TouchableOpacity>
              );
            })}
            </View>
          </>
        )}



        {/* CROSS SELL / EXTRAS */}
        {isCustomizable && (
           <>
             <View style={styles.divider} />
             <Text style={styles.sectionTitleBlack}>ENVIE D'UN EXTRA ?</Text>
             <View style={styles.extrasList}>
               {products.filter(p => ['DESSERTS', 'BOISSONS'].includes(p.category)).map(extra => {
                 const qty = selectedExtras[extra.id] || 0;
                 return (
                   <View key={extra.id} style={styles.crossSellRow}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                         <Image source={getImageSource(extra.image)} style={styles.crossSellImg} contentFit="cover" />
                         <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.extraName} numberOfLines={1}>{extra.name}</Text>
                            <Text style={styles.extraPrice}>+ {extra.price.toFixed(2)} CHF</Text>
                         </View>
                      </View>
                      
                      {qty === 0 ? (
                        <TouchableOpacity 
                           style={styles.extraAddBtn}
                           onPress={() => setSelectedExtras(prev => ({ ...prev, [extra.id]: 1 }))}
                        >
                           <Ionicons name="add" size={16} color={Theme.colors.text} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.crossSellQtyRow}>
                           <TouchableOpacity style={styles.crossSellQtyBtn} onPress={() => setSelectedExtras(prev => ({ ...prev, [extra.id]: qty - 1 }))}>
                              <Ionicons name="remove" size={14} color={Theme.colors.text} />
                           </TouchableOpacity>
                           <Text style={styles.crossSellQtyText}>{qty}</Text>
                           <TouchableOpacity style={styles.crossSellQtyBtn} onPress={() => setSelectedExtras(prev => ({ ...prev, [extra.id]: qty + 1 }))}>
                              <Ionicons name="add" size={14} color={Theme.colors.text} />
                           </TouchableOpacity>
                        </View>
                      )}
                   </View>
                 );
               })}
             </View>
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
        </View>
      </ScrollView>

      {/* STICKY FOOTER */}
      <View style={styles.footer}>
        {inCart && (
          <Text style={styles.alreadyInCart}>
            <Ionicons name="checkmark-circle" size={14} color={Theme.colors.success} /> Déjà dans votre commande ({inCart.quantity}x)
          </Text>
        )}
        <TouchableOpacity style={[styles.addBtn, isAddDisabled && { opacity: 0.5 }]} onPress={handleAddToCart} activeOpacity={0.85} disabled={isAddDisabled}>
          <Text style={styles.addBtnText} numberOfLines={1}>{editCartItemId ? 'METTRE À JOUR' : 'AJOUTER AU PANIER'}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerControls: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#000',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: Theme.fonts.bodyBold,
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
    color: '#FFF',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingBottom: 0,
    marginTop: -40, // Pulls the sheet up over the image
  },
  sheetContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: height * 0.6,
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
  sectionTitleBlack: {
    fontFamily: Theme.fonts.title,
    fontSize: 18,
    color: Theme.colors.text,
    marginBottom: 12,
  },
  allergensList: {
    flexDirection: 'row',
    gap: 12,
  },
  allergenIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  pillBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: '#FFF',
  },
  pillBtnActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  pillText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 13,
    color: Theme.colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFF',
  },
  extrasContainer: {
    marginBottom: 16,
    gap: 12,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  extraName: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 15,
    color: Theme.colors.text,
    marginBottom: 4,
  },
  extraPrice: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  extraAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
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
    backgroundColor: '#000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  addBtnText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 15, // Slightly smaller
    color: '#FFF',
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
    color: '#FFF',
  },
  addBtnCurrency: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 10,
    color: '#FFF',
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
  optionsLabel: {
    fontFamily: Theme.fonts.title,
    fontSize: 16,
    color: Theme.colors.text,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
  },
  optionLabel: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 14,
    color: Theme.colors.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#000',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
  },
  extrasList: {
    gap: 12,
  },
  crossSellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  crossSellImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  crossSellQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  crossSellQtyBtn: {
    padding: 4,
  },
  crossSellQtyText: {
    fontFamily: Theme.fonts.title,
    fontSize: 16,
    color: Theme.colors.text,
  },
});
