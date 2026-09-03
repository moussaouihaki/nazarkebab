import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, useWindowDimensions, Modal } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation, FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';
import { PRODUCTS, CATEGORIES, IMAGES_MAP, getImageSource } from '../constants/data';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { useContentStore } from '../store/useContentStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { checkIsRestaurantOpen } from '../store/useRestaurantStore';
import BottomBar from '../components/BottomBar';

const { width } = Dimensions.get('window');

const getCategoryImage = (cat: string) => {
  const prod = PRODUCTS.find(p => p.category === cat);
  if (prod) return getImageSource(prod.image);
  
  // Fallback based on category name
  const key = cat.toLowerCase().includes('poké') ? 'poke' : 
              cat.toLowerCase().includes('dessert') ? 'dessert' : 
              cat.toLowerCase().includes('boisson') ? 'drink_33cl' : 'poke';
  return IMAGES_MAP[key];
};

export default function HomeScreen() {
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { products, categories, settings } = useRestaurantStore();
  const { content, fetchContent } = useContentStore();
  const unreadCount = useNotificationStore(s => s.unreadCount);

  // Initialize content on load if on web or first mount
  React.useEffect(() => {
    fetchContent();
  }, []);

  const pokeOfTheMonthProduct = useMemo(() => {
    const cfg = settings?.pokeOfTheMonth;
    if (!cfg || !cfg.enabled) return null;
    return products.find(p => p.id === cfg.productId) || products.find(p => p.highlighted) || products[0];
  }, [settings?.pokeOfTheMonth, products]);

  const populars = products
    .filter(p => p.highlighted && !p.outOfStock)
    .sort((a, b) => {
      const orderA = a.displayOrder ?? 0;
      const orderB = b.displayOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
  const getCategoryImage = (cat: string) => {
    const prod = products.find(p => p.category === cat);
    if (prod) return getImageSource(prod.image);
    
    // Fallback based on category name
    const key = cat.toLowerCase().includes('poké') ? 'poke' : 
                cat.toLowerCase().includes('dessert') ? 'dessert' : 
                cat.toLowerCase().includes('boisson') ? 'drink_33cl' : 'poke';
    return IMAGES_MAP[key];
  };

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

    const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 1, // Always visible to show notification bell
    };
  });

  const heroAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: interpolate(scrollY.value, [-100, 0, 300], [-50, 0, 150], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={styles.container}>

      {/* Floating Header mobile avec Glassmorphism */}
      {!isDesktop && (
        <Animated.View style={[styles.floatingHeader, headerAnimatedStyle]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']}>
            <View style={styles.headerTop}>
               <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
                 <Ionicons name="notifications-outline" size={24} color={Theme.colors.textSecondary} />
                 {unreadCount > 0 && (
                   <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                   </View>
                 )}
               </TouchableOpacity>
               <View style={styles.logoWrapper}>
                 <Text style={styles.logoPoke}>POKÉ</Text>
                 <Text style={styles.logoMoons}>MOONS</Text>
               </View>
               <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/cart')}>
                 <Ionicons name="bag-handle-outline" size={24} color={Theme.colors.text} />
                 {cartCount > 0 && (
                   <View style={styles.badge}>
                     <Text style={styles.badgeText}>{cartCount}</Text>
                   </View>
                 )}
               </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}


      <Animated.ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        
        {/* EDITORIAL HERO BANNER (Bleed Edge with Parallax) */}
        <View style={styles.heroContainer}>
           <Animated.View style={[(StyleSheet.absoluteFill as any), heroAnimatedStyle]}>
              <Image 
                source={require('../assets/images/hero-white.jpg')} 
                style={[(StyleSheet.absoluteFill as any), { backgroundColor: '#FFFFFF' }]} 
                contentFit="cover"
                contentPosition="center"
              />
            </Animated.View>
           <LinearGradient 
              colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.1)']} 
              style={(StyleSheet.absoluteFill as any)} 
           />
           <View style={[styles.heroContent, { gap: 12 }]}>
            
            {/* Status Pill */}
            <View style={[styles.statusRow, { 
              backgroundColor: checkIsRestaurantOpen(settings) ? '#E8F5E9' : '#FFEBEE', 
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 0 
            }]}>
              <View style={[styles.statusIndicator, { backgroundColor: checkIsRestaurantOpen(settings) ? Theme.colors.success : Theme.colors.danger }]} />
              <Text style={[styles.statusText, { color: checkIsRestaurantOpen(settings) ? '#2E7D32' : '#C62828', fontSize: 11 }]}>
                {checkIsRestaurantOpen(settings) ? 'ACTUELLEMENT OUVERT' : 'FERMÉ ACTUELLEMENT'}
              </Text>
            </View>

            {/* Title Section */}
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={[styles.heroTitle, { textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10, marginBottom: 0 }]}>L'ART DU POKÉ BOWL</Text>
              <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: '#000', letterSpacing: 4, textAlign: 'center' }}>DEPUIS 2022</Text>
            </View>

            {/* CTA & Delivery Times */}
            <View style={{ alignItems: 'center', gap: 16, marginTop: 4 }}>
              <TouchableOpacity style={[styles.heroBtn, { backgroundColor: '#1B5E20' }]} onPress={() => router.push('/menu')} activeOpacity={0.8}>
                 <Text style={[styles.heroBtnText, { color: '#FFF' }]}>{content.heroButtonText}</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="bicycle" size={16} color="#000" />
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: '#000' }}>Livraison {settings.deliveryTime} min</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="bag-handle" size={16} color="#000" />
                  <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 12, color: '#000' }}>À l'emporter {settings.takeAwayTime} min</Text>
                </View>
              </View>
            </View>

           </View>
        </View>

        <View style={styles.innerContainer}>
        {/* CONCEPT & VALUES */}
        <View style={[styles.valuesContainer, isDesktop && { flexDirection: 'row' }]}>
          {content.values.map(val => (
            <View key={val.id} style={styles.valueItemWrapper}>
              <BlurView intensity={80} tint="light" style={styles.valueItem}>
                <Ionicons name={val.icon as any} size={32} color="#000" />
                <Text style={styles.valueTitle}>{val.title}</Text>
                <Text style={styles.valueDesc}>{val.description}</Text>
              </BlurView>
            </View>
          ))}
        </View>

        {/* 🌟 LE POKÉMOONS DU MOIS (HERO SHOWCASE) 🌟 */}
        {settings?.pokeOfTheMonth?.enabled && pokeOfTheMonthProduct && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.pokeMonthContainer}>
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.pokeMonthCard}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: pokeOfTheMonthProduct.id } })}
            >
              {/* HEADER BADGE */}
              <View style={styles.pokeMonthHeaderRow}>
                <View style={styles.pokeMonthBadge}>
                  <Ionicons name="star" size={13} color="#FFD700" />
                  <Text style={styles.pokeMonthBadgeText}>
                    {settings.pokeOfTheMonth.badgeText || 'POKÉMOONS DU MOIS'}
                  </Text>
                </View>
                <View style={styles.pokeMonthDateBadge}>
                  <Text style={styles.pokeMonthDateText}>
                    {settings.pokeOfTheMonth.monthLabel || 'ÉDITION LIMITÉE'}
                  </Text>
                </View>
              </View>

              <View style={[styles.pokeMonthBody, isDesktop && { flexDirection: 'row', alignItems: 'center' }]}>
                <View style={styles.pokeMonthImgWrapper}>
                  <Image
                    source={getImageSource(pokeOfTheMonthProduct.image)}
                    style={styles.pokeMonthImg}
                    contentFit="cover"
                  />
                  <View style={styles.pokeMonthPriceTag}>
                    <Text style={styles.pokeMonthPrice}>{pokeOfTheMonthProduct.price.toFixed(2)}</Text>
                    <Text style={styles.pokeMonthPriceCurrency}>CHF</Text>
                  </View>
                </View>

                <View style={styles.pokeMonthInfo}>
                  <Text style={styles.pokeMonthTagline}>
                    {settings.pokeOfTheMonth.tagline || 'Recette signature exclusive du Chef'}
                  </Text>
                  <Text style={styles.pokeMonthTitle} numberOfLines={2}>
                    {settings.pokeOfTheMonth.name || pokeOfTheMonthProduct.name}
                  </Text>
                  <Text style={styles.pokeMonthDesc} numberOfLines={3}>
                    {settings.pokeOfTheMonth.description || pokeOfTheMonthProduct.description || 'Une création gourmande et raffinée avec des ingrédients de saison sélectionnés chaque matin.'}
                  </Text>
                  
                  <View style={styles.pokeMonthBtn}>
                    <Text style={styles.pokeMonthBtnText}>COMMANDER LE BOWL DU MOIS</Text>
                    <Ionicons name="arrow-forward" size={16} color="#000" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* SHARP CATEGORIES (Chic, zero border radius) */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>NOTRE CARTE</Text>
        </View>

        <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {CATEGORIES.map((cat, index) => (
             <Animated.View key={cat} entering={FadeInDown.delay(index * 100).springify()}>
               <TouchableOpacity style={styles.categoryCard} onPress={() => router.push({ pathname: '/menu', params: { category: cat } })}>
                  <View style={styles.categoryImgWrapper}>
                    <Image 
                      source={getImageSource(getCategoryImage(cat))} 
                      style={styles.categoryImage} 
                      contentFit="cover" 
                    />
                  </View>
                  <Text style={styles.categoryText} numberOfLines={1}>{cat}</Text>
               </TouchableOpacity>
             </Animated.View>
          ))}
        </Animated.ScrollView>

        {/* COMPOSE TON POKÉ BANNER */}
        <View style={styles.composeSection}>
           <TouchableOpacity 
             style={styles.composeBanner}
             activeOpacity={0.9}
             onPress={() => router.push({ pathname: '/product/[id]', params: { id: 'poke-custom' } })}
           >
             <Image source={require('../assets/images/compose-white.jpg')} style={(StyleSheet.absoluteFill as any)} contentFit="cover" />
             <View style={[styles.composeOverlay, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
             <View style={styles.composeContent}>
               <Text style={[styles.composeTitle, { color: '#1B5E20' }]}>CRÉE TON POKÉ SUR-MESURE</Text>
               <Text style={[styles.composeDesc, { color: Theme.colors.textSecondary }]}>Choisis ta base, tes protéines et tes toppings.</Text>
               <View style={[styles.composeBtn, { backgroundColor: '#1B5E20' }]}>
                  <Text style={[styles.composeBtnText, { color: '#FFF' }]}>COMPOSER</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
               </View>
             </View>
           </TouchableOpacity>
        </View>

        {/* GOOGLE REVIEWS SECTION */}
        <View style={styles.reviewsContainer}>
          <View style={styles.reviewsHeader}>
             <View style={{ alignItems: 'center' }}>
               <Text style={styles.reviewsScore}>4.8</Text>
               <View style={styles.starsRow}>
                  {[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={14} color="#FFD700" />)}
               </View>
             </View>
             <View style={styles.reviewsTextInfo}>
                <Text style={styles.reviewsTitle}>Excellence reconnue</Text>
                <Text style={styles.reviewsSubtitle}>Plus de 50 avis sur Google</Text>
             </View>
             <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }} style={{ width: 24, height: 24, marginLeft: 'auto' }} />
          </View>
          
          <BlurView intensity={80} tint="light" style={styles.reviewCard}>
             <Text style={styles.reviewText}>"Une très belle découverte ! Les produits sont frais et de qualité, avec un large choix qui permet de composer son bowl exactement selon ses envies. 🥑🍚 Mention spéciale pour la sauce maison 🌶️🔥"</Text>
             <View style={styles.reviewAuthorRow}>
                <View style={styles.reviewAuthorAvatar}>
                   <Text style={styles.reviewAuthorInitials}>A</Text>
                </View>
                <View>
                   <Text style={styles.reviewAuthorName}>Alex varto</Text>
                   <Text style={styles.reviewAuthorDate}>Local Guide</Text>
                </View>
             </View>
          </BlurView>
        </View>

        {/* FEED: INCONTOURNABLES (Fine Dining Gallery) */}
        <View style={[styles.sectionHeader, { marginTop: 40 }]}>
           <Text style={styles.sectionTitle}>NOS SIGNATURES</Text>
        </View>
        
        <View style={[styles.listContainer, isDesktop && { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 }]}>
          {populars.map((product, index) => (
            <Animated.View key={product.id} entering={FadeInDown.delay(300 + index * 50).springify()} style={[isDesktop && { width: '48%' }]}>
              <TouchableOpacity 
                style={styles.listItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
              >
                <View style={styles.listImgWrapper}>
                  <Image 
                    source={getImageSource(product.image)} 
                    style={styles.listImage} 
                    contentFit="cover" 
                  />
                  <View style={styles.feedTag}>
                     <Text style={styles.feedTagText}>Maison</Text>
                  </View>
                </View>
                
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle}>{product.name}</Text>
                  {product.dietaryBadges && product.dietaryBadges.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 4 }}>
                      {product.dietaryBadges.map((badge, bIdx) => (
                        <View key={bIdx} style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 9, color: '#16a34a' }}>{badge}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={styles.listDesc} numberOfLines={2}>
                    {product.description || `Dégustez notre ${product.name.toLowerCase()} préparé avec la plus grande attention.`}
                  </Text>
                  <Text style={styles.listPrice}>{product.price.toFixed(2)}  <Text style={styles.listCurrency}>CHF</Text></Text>
                </View>

                <TouchableOpacity style={styles.quickAddBtn} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
                   <Ionicons name="add" size={16} color={Theme.colors.text} />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
        
        {/* PREMIUM FOOTER */}
        <View style={{ marginTop: 60, marginHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 24, backgroundColor: '#FFF' }}>
          <View style={[styles.footerInfo, { marginTop: 0, borderTopWidth: 0, backgroundColor: 'transparent' }]}>
            <View style={[styles.logoWrapper, { marginBottom: 12 }]}>
              <Text style={styles.logoPoke}>POKÉ</Text>
              <Text style={styles.logoMoons}>MOONS</Text>
            </View>
            <Text style={styles.footerMeta}>{content.footerCity}</Text>
            <Text style={styles.footerMeta}>RESERVATIONS: {content.footerPhone}</Text>
            
            {Platform.OS === 'web' && (
              <View style={styles.webFooter}>
                 <View style={styles.webFooterRow}>
                   <TouchableOpacity onPress={() => router.push('/cgv')}><Text style={styles.webFooterLink}>Conditions Générales de Vente</Text></TouchableOpacity>
                   <TouchableOpacity onPress={() => router.push('/mentions')}><Text style={styles.webFooterLink}>Mentions Légales</Text></TouchableOpacity>
                   <TouchableOpacity onPress={() => router.push('/privacy')}><Text style={styles.webFooterLink}>Politique de Confidentialité</Text></TouchableOpacity>
                   <TouchableOpacity onPress={() => router.push('/provenance')}><Text style={styles.webFooterLink}>Provenance des viandes</Text></TouchableOpacity>
                   <TouchableOpacity onPress={() => router.push('/contact')}><Text style={styles.webFooterLink}>Contact</Text></TouchableOpacity>
                 </View>
                 <Text style={styles.webFooterCopyright}>© {new Date().getFullYear()} {content.footerCopyright}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>
      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  logoPoke: {
    fontFamily: Theme.fonts.logo,
    fontSize: 28,
    color: '#1B5E20', // Dark green matching the brand
    letterSpacing: 2,
    lineHeight: 28,
  },
  logoMoons: {
    fontFamily: Theme.fonts.logo,
    fontSize: 28,
    letterSpacing: 2,
    lineHeight: 28,
    marginTop: -8, // Tightly stack them like the original logo
    ...Platform.select({
      web: {
        color: '#FFFFFF',
        textShadowColor: '#1B5E20',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
      },
      default: {
        color: '#FFFFFF',
        textShadowColor: '#1B5E20',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
      }
    })
  },
  notifBadge: { 
    position: 'absolute', 
    top: -2, 
    right: -2, 
    backgroundColor: Theme.colors.danger, 
    minWidth: 16, 
    height: 16, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.background,
  },
  notifBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: Theme.fonts.bodyBold,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Theme.colors.success,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.background,
  },

  badgeText: {
    color: '#FFF',
    fontSize: 7,
    fontFamily: Theme.fonts.bodyBold,
  },
  heroContainer: {
    width: '100%',
    height: Platform.OS === 'web' ? 480 : 460, // Increase height to prevent overlap with the glass cards below
    alignItems: 'center',
    position: 'relative',
  },
  heroOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0,0,0,0.6)', // Deep mood (will be overridden by inline if needed)
  },
  heroContent: {
    zIndex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 130 : (Platform.OS === 'web' ? 100 : 90), // Push content down to avoid header
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  statusIndicator: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Theme.fonts.bodyBold, fontSize: 10, color: '#FFF', letterSpacing: 1 },
  heroGolden: {
    fontFamily: Theme.fonts.bodyBold,
    color: '#FFF', 
    fontSize: 13,
    letterSpacing: 4,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: Theme.fonts.title,
    color: '#1B5E20',
    fontSize: width < 380 ? 42 : 54, // Dynamic font size to avoid wrapping
    letterSpacing: width < 380 ? 4 : 6,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFF',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 100,
  },
  heroBtnText: {
    fontFamily: Theme.fonts.bodyBold,
    color: '#000',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: Theme.fonts.title,
    color: Theme.colors.text,
    fontSize: 28,
    letterSpacing: 2,
  },
  goldLine: {
    width: 30,
    height: 2,
    backgroundColor: Theme.colors.success,
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  categoryCard: {
    alignItems: 'center',
    width: 120,
  },
  categoryImgWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Theme.colors.surface,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 13,
    color: Theme.colors.text,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  listContainer: {
    paddingTop: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
    alignItems: 'center',
    gap: 16,
  },
  listImgWrapper: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: Theme.colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexShrink: 0,
    position: 'relative',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  listTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 20,
    color: Theme.colors.text,
    marginBottom: 4,
  },
  listDesc: {
    fontFamily: Theme.fonts.body,
    fontSize: 13,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  listPrice: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 16,
    color: Theme.colors.text,
  },
  listCurrency: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
  },
  quickAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  feedTag: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
  },
  feedTagText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 8,
    color: '#FFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  composeSection: {
    paddingHorizontal: 16,
    marginTop: 40,
  },
  composeBanner: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    padding: 24,
  },
  composeOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  composeContent: {
    zIndex: 1,
    alignItems: 'flex-start',
  },
  composeTitle: {
    fontFamily: Theme.fonts.title,
    color: '#FFF',
    fontSize: 24,
    letterSpacing: 1,
    marginBottom: 4,
  },
  composeDesc: {
    fontFamily: Theme.fonts.body,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 16,
  },
  composeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    gap: 8,
  },
  composeBtnText: {
    fontFamily: Theme.fonts.bodyBold,
    color: '#000',
    fontSize: 12,
    letterSpacing: 1,
  },
  footerInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  footerMeta: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 10,
    color: '#000',
    letterSpacing: 2,
    marginTop: 10,
  },
  webFooter: {
    marginTop: 40,
    alignItems: 'center',
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    paddingTop: 20,
  },
  webFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  webFooterLink: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: '#000',
    textDecorationLine: 'underline',
  },
  webFooterCopyright: {
    fontFamily: Theme.fonts.body,
    fontSize: 11,
    color: '#000',
  },
  timeBanner: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border + '22',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 11,
    color: '#FFFFFF', // Changed from success (red) to white for better visibility
    letterSpacing: 2,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  valuesContainer: {
    paddingVertical: 16,
    marginTop: -40,
    marginHorizontal: 16,
    gap: 16,
    zIndex: 10,
  },
  valueItemWrapper: {
    flex: 1,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
    backgroundColor: 'transparent',
  },
  valueItem: {
    alignItems: 'center',
    flex: 1,
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  valueTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 16,
    color: Theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  valueDesc: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  reviewsContainer: {
    paddingHorizontal: 16,
    marginTop: 40,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
    paddingHorizontal: 8,
  },
  reviewsScore: {
    fontFamily: Theme.fonts.title,
    fontSize: 28,
    color: Theme.colors.text,
    lineHeight: 30,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  reviewsTextInfo: {
    flex: 1,
  },
  reviewsTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 16,
    color: Theme.colors.text,
  },
  reviewsSubtitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  reviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  reviewText: {
    fontFamily: Theme.fonts.body,
    fontSize: 15,
    color: Theme.colors.text,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAuthorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAuthorInitials: {
    color: '#FFF',
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 14,
  },
  reviewAuthorName: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 14,
    color: Theme.colors.text,
  },
  reviewAuthorDate: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    fontFamily: 'Inter_700Bold', // using string instead of Theme to be safe
    fontSize: 24,
    color: '#1c1c1e',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#007AFF', // using a safe color
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '100%',
  },
  modalButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
  },

  // 🌟 POKÉMOONS DU MOIS LUXURY STYLES 🌟
  pokeMonthContainer: {
    marginBottom: 28,
    marginHorizontal: Platform.OS === 'web' ? 0 : 8,
  },
  pokeMonthCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  pokeMonthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pokeMonthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  pokeMonthBadgeText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 11,
    color: '#FFD700',
    letterSpacing: 0.8,
  },
  pokeMonthDateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pokeMonthDateText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  pokeMonthBody: {
    gap: 16,
  },
  pokeMonthImgWrapper: {
    width: '100%',
    height: 190,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  pokeMonthImg: {
    width: '100%',
    height: '100%',
  },
  pokeMonthPriceTag: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pokeMonthPrice: {
    fontFamily: Theme.fonts.title,
    fontSize: 18,
    color: '#FFF',
  },
  pokeMonthPriceCurrency: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 11,
    color: '#10B981',
  },
  pokeMonthInfo: {
    flex: 1,
    gap: 6,
  },
  pokeMonthTagline: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 12,
    color: '#10B981',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pokeMonthTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 22,
    color: '#FFF',
    lineHeight: 26,
  },
  pokeMonthDesc: {
    fontFamily: Theme.fonts.body,
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
    marginBottom: 8,
  },
  pokeMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 4,
  },
  pokeMonthBtnText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 13,
    color: '#000',
    letterSpacing: 0.5,
  }
});
