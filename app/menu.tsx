import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, SafeAreaView, TextInput, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Theme } from '../constants/theme';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { useRestaurantStore } from '../store/useRestaurantStore';
import BottomBar from '../components/BottomBar';
import { getImageSource } from '../constants/data';

const { width } = Dimensions.get('window');

export default function MenuScreen() {
  const params = useLocalSearchParams();
  const { products, categories, settings } = useRestaurantStore();
  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.total);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const [activeCategory, setActiveCategory] = useState(params.category ? (params.category as string) : categories[0] || 'POKÉ BOWL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (params.category) setActiveCategory(params.category as string);
  }, [params.category]);

  const filteredProducts = useMemo(() => {
    const byCategory = products
      .filter(p => p.category?.toUpperCase() === activeCategory?.toUpperCase() && !p.outOfStock)
      .sort((a, b) => {
        const orderA = a.displayOrder ?? 0;
        const orderB = b.displayOrder ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '');
      });
    if (!search.trim()) return byCategory;
    const q = search.toLowerCase();
    return byCategory.filter(p =>
      p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [products, activeCategory, search]);

  const allSearchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products
      .filter(p => 
        (!p.outOfStock) && (
          p.name.toLowerCase().includes(q) || 
          p.description?.toLowerCase().includes(q)
        )
      )
      .sort((a, b) => {
        const orderA = a.displayOrder ?? 0;
        const orderB = b.displayOrder ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [products, search]);

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <View style={styles.container}>
      {/* MOBILE HEADER (Top Bar) */}
      <SafeAreaView style={[styles.header, isDesktop && { display: 'none' }]}>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.headerTop}>
           <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/')}>
             <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
           </TouchableOpacity>
           <Text style={styles.headerMotto}>LA CARTE</Text>
           <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/cart')}>
             <Ionicons name="bag-handle-outline" size={24} color={Theme.colors.text} />
             {cartCount > 0 && (
               <View style={styles.badge}>
                 <Text style={styles.badgeText}>{cartCount}</Text>
               </View>
             )}
           </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* CATEGORY TABS & SEARCH (Visible on both Mobile and Desktop) */}
      <View style={[isDesktop && styles.desktopTabsContainer, { backgroundColor: Theme.colors.background, paddingTop: isDesktop ? 90 : 10 }]}>
        
        

        {/* CATEGORY TABS */}
        <View style={styles.tabsWrapper}>
          <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabsScroll, isDesktop && { justifyContent: 'center' }]}>
            {categories.map(cat => {
               const isActive = activeCategory === cat;
               return (
                 <TouchableOpacity key={cat} onPress={() => { setActiveCategory(cat); setSearch(''); }} style={[styles.tabBtn, isActive && styles.tabBtnActive]}>
                   <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{cat}</Text>
                 </TouchableOpacity>
               );
            })}
          </Animated.ScrollView>
        </View>

      </View>

      <Animated.ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SEARCH RESULTS OR CATEGORY HERO */}
        {!search.trim() ? (
          <View style={styles.categoryHero}>
            <Text style={styles.categoryHeroTitle}>{activeCategory}</Text>
          </View>
        ) : (
          <View style={styles.categoryHero}>
            <Text style={[styles.categoryHeroTitle, { fontSize: 24 }]}>Résultats: "{search}"</Text>
            <Text style={{ fontFamily: Theme.fonts.body, color: Theme.colors.textSecondary, marginTop: 4 }}>{allSearchResults.length} article(s) trouvé(s)</Text>
          </View>
        )}

        {/* MINIMALIST LIST */}
        <View style={styles.listContainer}>
          {(search.trim() ? allSearchResults : filteredProducts).map((product, index) => {
            return (
              <Animated.View key={product.id} entering={FadeInUp.delay(index * 50).springify()} layout={Layout.springify()}>
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
                  </View>
                  
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{product.name}</Text>
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
          );
        })}
          {search.trim() && allSearchResults.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 100, opacity: 0.5 }}>
              <Ionicons name="search-outline" size={64} color={Theme.colors.textSecondary} />
              <Text style={{ fontFamily: Theme.fonts.title, color: Theme.colors.text, fontSize: 20, marginTop: 16 }}>AUCUN RÉSULTAT</Text>
              <Text style={{ fontFamily: Theme.fonts.body, color: Theme.colors.textSecondary, marginTop: 8 }}>Réessayez avec un autre mot-clé.</Text>
            </View>
          )}
        </View>
        
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* LUXURY FLOATING CART */}
      {cartCount > 0 && (
        <View style={styles.floatingCartWrapper}>
          <TouchableOpacity 
            style={styles.floatingCart} 
            activeOpacity={0.9}
            onPress={() => router.push('/cart')}
          >
             <Text style={styles.floatingCartCount}>{cartCount} ARTICLE(S)</Text>
             <Text style={styles.floatingCartText}>PASSER COMMANDE</Text>
             <Text style={styles.floatingCartPrice}>{cartTotal.toFixed(2)} CHF</Text>
          </TouchableOpacity>
        </View>
      )}

      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  desktopTabsContainer: {
    backgroundColor: Theme.colors.background,
    paddingTop: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  headerMotto: {
    fontFamily: Theme.fonts.logo,
    fontSize: 24,
    color: Theme.colors.text,
    letterSpacing: 6,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Theme.colors.success, // Gold
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
  tabsWrapper: {
    paddingVertical: 16,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: '#FFF',
    borderRadius: 100,
  },
  tabBtnActive: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  tabText: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 13,
    color: Theme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontFamily: Theme.fonts.bodyBold,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 220 : 180,
  },
  categoryHero: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Theme.colors.background,
  },
  categoryHeroTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 24,
    color: Theme.colors.text,
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
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Theme.colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexShrink: 0,
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
    fontSize: 16,
    color: Theme.colors.text,
    marginBottom: 4,
  },
  listDesc: {
    fontFamily: Theme.fonts.body,
    fontSize: 11,
    color: Theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  listPrice: {
    fontFamily: Theme.fonts.bodyBold,
    fontSize: 14,
    color: Theme.colors.text,
  },
  listCurrency: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
  },
  quickAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  searchBar: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: '#F5F5F5', 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  searchInput: { flex: 1, fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.text, padding: 0 },
  floatingCartWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 110,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  floatingCart: {
    width: Platform.OS === 'web' ? 400 : '100%',
    height: 60,
    backgroundColor: Theme.colors.success,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: Theme.colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  navCircBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingCartCount: { fontFamily: Theme.fonts.bodyMedium, fontSize: 12, color: '#FFF', letterSpacing: 1 },
  floatingCartText:  { flex: 1, textAlign: 'center', fontFamily: Theme.fonts.bodyBold, fontSize: 14, color: '#FFF', letterSpacing: 1 },
  floatingCartPrice: { fontFamily: Theme.fonts.bodyBold,   fontSize: 14, color: '#FFF' },
});
