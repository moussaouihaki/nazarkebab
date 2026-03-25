import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, SafeAreaView, TextInput, useWindowDimensions } from 'react-native';
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
  const { products, categories } = useRestaurantStore();
  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.total);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const [activeCategory, setActiveCategory] = useState(params.category ? (params.category as string) : categories[1]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (params.category) setActiveCategory(params.category as string);
  }, [params.category]);

  const filteredProducts = useMemo(() => {
    const byCategory = products.filter(p => p.category === activeCategory);
    if (!search.trim()) return byCategory;
    const q = search.toLowerCase();
    return byCategory.filter(p =>
      p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [products, activeCategory, search]);

  const allSearchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <SafeAreaView style={[styles.header, isDesktop && { display: 'none' }]}>
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

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un plat..."
            placeholderTextColor={Theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* CATEGORY TABS */}
        <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {categories.map(cat => {
               const isActive = activeCategory === cat;
               return (
                 <TouchableOpacity key={cat} onPress={() => { setActiveCategory(cat); setSearch(''); }} style={[styles.tabBtn, isActive && styles.tabBtnActive]}>
                   <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{cat}</Text>
                 </TouchableOpacity>
               );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SEARCH RESULTS OR CATEGORY HERO */}
        {!search.trim() ? (
          <View style={styles.categoryHero}>
            <Text style={styles.categoryHeroTitle}>{activeCategory}</Text>
            <View style={styles.goldLine} />
          </View>
        ) : (
          <View style={styles.categoryHero}>
            <Text style={[styles.categoryHeroTitle, { fontSize: 24 }]}>RÉSULTATS POUR "{search.toUpperCase()}"</Text>
            <Text style={{ fontFamily: Theme.fonts.body, color: Theme.colors.textSecondary, marginTop: 8 }}>{allSearchResults.length} article(s) trouvé(s)</Text>
            <View style={styles.goldLine} />
          </View>
        )}

        {/* MINIMALIST LIST */}
        <View style={styles.listContainer}>
          {(search.trim() ? allSearchResults : filteredProducts).map((product) => {
            return (
              <TouchableOpacity 
                key={product.id} 
                style={styles.listItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
              >
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle}>{product.name}</Text>
                  <Text style={styles.listDesc} numberOfLines={2}>
                    {product.description || `Dégustez notre ${product.name.toLowerCase()} préparé avec la plus grande attention.`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.listPrice}>{product.price.toFixed(2)}  <Text style={styles.listCurrency}>CHF</Text></Text>
                    {search.trim() && <Text style={{ fontFamily: Theme.fonts.bodyBold, fontSize: 9, color: Theme.colors.textSecondary, backgroundColor: Theme.colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>{product.category}</Text>}
                  </View>
                </View>
                
                <View style={styles.listImgWrapper}>
                  <Image 
                    source={getImageSource(product.image)} 
                    style={styles.listImage} 
                    contentFit="cover" 
                  />
                  {product.highlighted && (
                    <View style={styles.starBadge}>
                      <Ionicons name="star" size={10} color="#000" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
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
      </ScrollView>

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
    backgroundColor: Theme.colors.background,
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
    color: '#000',
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
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: 'transparent',
    borderRadius: 100,
  },
  tabBtnActive: {
    borderColor: Theme.colors.success,
    backgroundColor: Theme.colors.success,
  },
  tabText: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1,
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#000',
    fontFamily: Theme.fonts.bodyBold,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  categoryHero: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#020202',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
  },
  categoryHeroTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 48,
    color: Theme.colors.text,
    letterSpacing: 4,
    textAlign: 'center',
  },
  goldLine: {
    width: 40,
    height: 2,
    backgroundColor: Theme.colors.success,
    marginTop: 12,
  },
  listContainer: {
    paddingTop: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20, // Slightly reduced to fit more
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
    alignItems: 'center', // Align items vertically center
  },
  listInfo: {
    flex: 1,
    paddingRight: 16, // Reduced padding
    minWidth: 0, // CRITICAL for Android text wrap
    justifyContent: 'center',
  },
  listTitle: {
    fontFamily: Theme.fonts.title,
    fontSize: 20, // Slightly smaller
    color: Theme.colors.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  listDesc: {
    fontFamily: Theme.fonts.body,
    fontSize: 13,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  listPrice: {
    fontFamily: Theme.fonts.bodyMedium,
    fontSize: 16,
    color: Theme.colors.primary, // Red accents for price
  },
  listCurrency: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
  },
  listImgWrapper: {
    width: 100, // Slightly smaller
    height: 100,
    borderRadius: 16,
    backgroundColor: Theme.colors.surface,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexShrink: 0, // Prevent image from being crushed
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  starBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Theme.colors.success, // Gold
    padding: 4,
    borderRadius: 0,
  },
  floatingCartWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
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
    paddingHorizontal: 24,
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
  floatingCartCount: { fontFamily: Theme.fonts.bodyMedium, fontSize: 12, color: '#000', letterSpacing: 1 },
  floatingCartText:  { fontFamily: Theme.fonts.bodyBold,   fontSize: 14, color: '#000', letterSpacing: 1 },
  floatingCartPrice: { fontFamily: Theme.fonts.bodyBold,   fontSize: 14, color: '#000' },
  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 10, backgroundColor: Theme.colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.colors.border },
  searchInput: { flex: 1, fontFamily: Theme.fonts.body, fontSize: 14, color: Theme.colors.text },
});
