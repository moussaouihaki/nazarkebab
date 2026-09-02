import { create } from 'zustand';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PRODUCTS as INITIAL_PRODUCTS, CATEGORIES as INITIAL_CATEGORIES, Product } from '../constants/data';

export interface OpeningHours {
  day: string;
  isOpen: boolean;
  open: string;  // "11:00"
  close: string; // "14:00"
  hasSplitShift?: boolean;
  open2?: string;  // "18:00"
  close2?: string; // "23:00"
}

export interface Drink {
  name: string;
  price: number;
  size: string; // "33cl", "50cl", "1.5L"
  outOfStock?: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  active: boolean;
  minOrder?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  firstOrderOnly?: boolean;
}

export interface RestaurantSettings {
  name: string;
  slogan: string;
  address: string;
  tva?: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  hours: OpeningHours[];
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  isOpen: boolean; // force open/close override
  openOverrideMessage: string;
  closedFrom?: string; // e.g. "2026-08-05"
  closedTo?: string;   // e.g. "2026-08-25"
  sauces: string[];
  drinks: Drink[];
  deliveryTime: string; // e.g. "30-45"
  takeAwayTime: string; // e.g. "15-20"
  loyaltyEnabled: boolean;
  loyaltyMinPoints: number;
  announcementEnabled: boolean;   // Afficher ou non la bannière
  announcementMessage: string;    // Texte du message (ex: "Fermé du 1 au 15 août")
  outOfStockIngredients?: string[]; // Liste des ingrédients en rupture
  promoCodes?: PromoCode[];
  autoPrintEnabled?: boolean;
  selectedPrinterName?: string;
  selectedPrinterUrl?: string;
}

interface RestaurantState {
  products: Product[];
  categories: string[];
  settings: RestaurantSettings;
  isLoading: boolean;

  // Actions
  fetchInitialData: () => Promise<void>;
  
  // Product actions
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  reorderProduct: (id: string, direction: 'up' | 'down') => Promise<void>;

  // Category actions
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
  reorderCategory: (name: string, direction: 'up' | 'down') => Promise<void>;

  // Settings actions
  updateSettings: (data: Partial<RestaurantSettings>) => Promise<void>;
  updateHours: (day: string, data: Partial<OpeningHours>) => Promise<void>;
  updateSauces: (sauces: string[]) => Promise<void>;
  updateDrinks: (drinks: Drink[]) => Promise<void>;
  toggleIngredientStock: (ingredient: string) => Promise<void>;
  addPromoCode: (promo: Omit<PromoCode, 'id'>) => Promise<void>;
  deletePromoCode: (id: string) => Promise<void>;
  togglePromoCode: (id: string) => Promise<void>;
}

const DEFAULT_HOURS: OpeningHours[] = [
  { day: 'Lundi',    isOpen: true,  open: '11:00', close: '14:00', hasSplitShift: true, open2: '18:00', close2: '22:00' },
  { day: 'Mardi',    isOpen: true,  open: '11:00', close: '14:00', hasSplitShift: true, open2: '18:00', close2: '22:00' },
  { day: 'Mercredi', isOpen: true,  open: '11:00', close: '14:00', hasSplitShift: true, open2: '18:00', close2: '22:00' },
  { day: 'Jeudi',    isOpen: true,  open: '11:00', close: '14:00', hasSplitShift: true, open2: '18:00', close2: '22:00' },
  { day: 'Vendredi', isOpen: true,  open: '11:00', close: '14:00', hasSplitShift: true, open2: '18:00', close2: '23:00' },
  { day: 'Samedi',   isOpen: true,  open: '11:00', close: '14:00', hasSplitShift: true, open2: '18:00', close2: '23:00' },
  { day: 'Dimanche', isOpen: true,  open: '18:00', close: '22:00' },
];

const DEFAULT_SETTINGS: RestaurantSettings = {
  name: 'Pokémoons Sàrl',
  slogan: 'Poké Bowls | Desserts | Boissons',
  address: 'Place du Marché 6, 2300 La Chaux-de-Fonds, NE',
  tva: 'CHE-166.128.890',
  phone: '032 757 44 44',
  email: 'contact@pokemoons.ch',
  website: 'www.pokemoons.ch',
  instagram: '@pokemoons.ch',
  facebook: '@pokemoons.ch',
  hours: DEFAULT_HOURS,
  acceptsDelivery: true,
  acceptsPickup: true,
  isOpen: true,
  openOverrideMessage: '',
  closedFrom: '',
  closedTo: '',
  sauces: [
    "Sauce spéciale maison",
    "Soja",
    "Teriyaki",
    "Huile d'olive citron maison",
    "Spicy mayo maison",
    "Teriyaki à l'ail"
  ],
  drinks: [
    { name: 'Coca-Cola', price: 3.50, size: '33cl' },
    { name: 'Coca-Cola Zero', price: 3.50, size: '33cl' },
    { name: 'Fanta', price: 3.50, size: '33cl' },
    { name: 'Sprite', price: 3.50, size: '33cl' },
    { name: 'Ice Tea Pêche', price: 3.50, size: '33cl' },
    { name: 'Ice Tea Citron', price: 3.50, size: '33cl' },
    { name: 'Eau Gazéifiée', price: 3.00, size: '50cl' },
    { name: 'Eau Plate', price: 3.00, size: '50cl' },
  ],
  deliveryTime: '30-45',
  takeAwayTime: '15-20',
  loyaltyEnabled: true,
  loyaltyMinPoints: 10,
  announcementEnabled: false,
  announcementMessage: '',
  outOfStockIngredients: [],
  promoCodes: [
    { id: 'p1', code: 'BIENVENUE10', discountType: 'percent', discountValue: 10, active: true },
    { id: 'p2', code: 'POKE5', discountType: 'fixed', discountValue: 5, active: true, minOrder: 30 }
  ],
  autoPrintEnabled: false,
};

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  products: INITIAL_PRODUCTS,
  categories: INITIAL_CATEGORIES,
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      // 1. Fetch Settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'pokemoons_restaurant'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        
        // AUTO-REPAIR SAUCES (local only)
        if (!data.sauces || data.sauces.length === 0) {
           data.sauces = DEFAULT_SETTINGS.sauces;
        }

        // AUTO-REPAIR ADDRESS, TVA, NAME (local only)
        if (!data.address) data.address = DEFAULT_SETTINGS.address;
        if (!data.tva) data.tva = DEFAULT_SETTINGS.tva;
        if (!data.name) data.name = DEFAULT_SETTINGS.name;
        if (!data.phone) data.phone = DEFAULT_SETTINGS.phone;

        // AUTO-REPAIR HOURS (local only)
        if (!data.hours || data.hours.length === 0) {
           data.hours = DEFAULT_HOURS;
        }

        set({ settings: { ...DEFAULT_SETTINGS, ...data } as RestaurantSettings });
      } else {
        // First initialization
        await setDoc(doc(db, 'settings', 'pokemoons_restaurant'), DEFAULT_SETTINGS);
      }

      // 2. Fetch Categories
      const categoriesDoc = await getDoc(doc(db, 'settings', 'pokemoons_categories'));
      if (categoriesDoc.exists()) {
        const savedCategories = categoriesDoc.data().list || [];
        const mergedCategories = [...new Set([...INITIAL_CATEGORIES, ...savedCategories])];
        if (mergedCategories.length > savedCategories.length) {
          await setDoc(doc(db, 'settings', 'pokemoons_categories'), { list: mergedCategories });
        }
        set({ categories: mergedCategories });
      } else {
        await setDoc(doc(db, 'settings', 'pokemoons_categories'), { list: INITIAL_CATEGORIES });
        set({ categories: INITIAL_CATEGORIES });
      }

      // 3. Listen to Products in real-time
      onSnapshot(collection(db, 'pokemoons_products'), (snapshot) => {
        const prodList: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Product;
          
          // Migration for Compose ton Poké
          if (data.name === 'COMPOSE TON POKÉ' && data.category !== 'CRÉER TON POKÉBOWL') {
            import('firebase/firestore').then(({ updateDoc }) => {
              updateDoc(doc(db, 'pokemoons_products', docSnap.id), { category: 'CRÉER TON POKÉBOWL' });
            });
            data.category = 'CRÉER TON POKÉBOWL';
          }
          
          prodList.push({ ...data, id: docSnap.id });
        });
        
        // Auto-cleanup for duplicate COMPOSE TON POKÉ items the user accidentally created
        const composeItems = prodList.filter(p => p.name === 'COMPOSE TON POKÉ');
        if (composeItems.length > 0) {
          // Keep only the hardcoded one, delete all DB duplicates
          import('firebase/firestore').then(({ deleteDoc }) => {
            composeItems.forEach(item => {
              if (item.id !== 'poke-custom') {
                deleteDoc(doc(db, 'pokemoons_products', item.id));
              }
            });
          });
        }
        
        // Merge local missing products to ensure UI always has the defaults
        const mergedProducts = prodList.map(p => {
           const initial = INITIAL_PRODUCTS.find(initP => initP.id === p.id);
           if (p.id === 'poke-custom' && initial) {
             return { ...p, customizationSections: initial.customizationSections };
           }
           return initial ? { ...initial, ...p } : p;
        });
        
        INITIAL_PRODUCTS.forEach(initialP => {
           if (!mergedProducts.find(p => p.id === initialP.id)) {
              mergedProducts.push(initialP);
           }
        });
        set({ products: mergedProducts });
      }, (error) => {
        console.warn('Impossible de charger les produits en direct (Firebase) - Utilisation des valeurs par défaut:', error.message);
      });

    } catch (err) {
      console.error('Erreur chargement données restaurant:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addProduct: async (productData) => {
    try {
      const newDocRef = doc(collection(db, 'pokemoons_products'));
      await setDoc(newDocRef, productData);
    } catch (err) {
      console.error('Erreur ajout produit:', err);
    }
  },

  updateProduct: async (id, data) => {
    try {
      await setDoc(doc(db, 'pokemoons_products', id), data, { merge: true });
    } catch (err: any) {
      console.error('Erreur MAJ produit:', err);
      import('react-native').then(({ Alert }) => Alert.alert('Erreur', err.message));
    }
  },

  deleteProduct: async (id) => {
    try {
      await deleteDoc(doc(db, 'pokemoons_products', id));
    } catch (err) {
      console.error('Erreur suppression produit:', err);
    }
  },

  reorderProduct: async (id, direction) => {
    try {
      const allProducts = get().products;
      const product = allProducts.find(p => p.id === id);
      if (!product) return;
      
      const catProducts = allProducts
        .filter(p => p.category === product.category)
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        
      const idx = catProducts.findIndex(p => p.id === id);
      if (idx === -1) return;
      
      let targetProduct;
      if (direction === 'up' && idx > 0) {
        targetProduct = catProducts[idx - 1];
      } else if (direction === 'down' && idx < catProducts.length - 1) {
        targetProduct = catProducts[idx + 1];
      } else {
        return; // nothing to do
      }
      
      const currentOrder = product.displayOrder ?? idx;
      const targetOrder = targetProduct.displayOrder ?? (direction === 'up' ? idx - 1 : idx + 1);
      
      // Swap displayOrder
      await Promise.all([
        updateDoc(doc(db, 'pokemoons_products', id), { displayOrder: targetOrder }),
        updateDoc(doc(db, 'pokemoons_products', targetProduct.id), { displayOrder: currentOrder })
      ]);
      
      // Update local state is handled by onSnapshot in useRestaurantStore
    } catch (err) {
      console.error('Erreur réordonnancement produit:', err);
    }
  },

  addCategory: async (name) => {
    const trimmed = name.toUpperCase().trim();
    if (!get().categories.includes(trimmed)) {
      const newList = [...get().categories, trimmed];
      try {
        await setDoc(doc(db, 'settings', 'categories'), { list: newList });
        set({ categories: newList });
      } catch (err) {
        console.error('Erreur ajout catégorie:', err);
      }
    }
  },

  deleteCategory: async (name) => {
    try {
      const newList = get().categories.filter(c => c !== name);
      await setDoc(doc(db, 'settings', 'categories'), { list: newList });
      set({ categories: newList });
    } catch (err) {
      console.error('Erreur suppression catégorie:', err);
    }
  },

  reorderCategory: async (name, direction) => {
    try {
      const current = [...get().categories];
      const idx = current.indexOf(name);
      if (idx === -1) return;
      if (direction === 'up' && idx > 0) {
        // Move up (left)
        [current[idx - 1], current[idx]] = [current[idx], current[idx - 1]];
      } else if (direction === 'down' && idx < current.length - 1) {
        // Move down (right)
        [current[idx + 1], current[idx]] = [current[idx], current[idx + 1]];
      } else {
        return; // nothing to do
      }
      
      await setDoc(doc(db, 'settings', 'categories'), { list: current });
      set({ categories: current });
    } catch (err) {
      console.error('Erreur réordonnancement catégorie:', err);
    }
  },

  updateSettings: async (data) => {
    try {
      const updated = { ...get().settings, ...data };
      await updateDoc(doc(db, 'settings', 'pokemoons_restaurant'), data);
      set({ settings: updated });
    } catch (err) {
      console.error('Erreur update settings:', err);
    }
  },

  toggleIngredientStock: async (ingredient) => {
    try {
      const currentList = get().settings.outOfStockIngredients || [];
      const newList = currentList.includes(ingredient)
        ? currentList.filter(i => i !== ingredient)
        : [...currentList, ingredient];
        
      await get().updateSettings({ outOfStockIngredients: newList });
    } catch (err) {
      console.error('Erreur toggle ingredient:', err);
    }
  },

  updateHours: async (day, data) => {
    try {
      const newHours = get().settings.hours.map(h => h.day === day ? { ...h, ...data } : h);
      const updatedSettings = { ...get().settings, hours: newHours };
      await setDoc(doc(db, 'settings', 'restaurant'), updatedSettings);
      set({ settings: updatedSettings });
    } catch (err) {
      console.error('Erreur MAJ horaires:', err);
    }
  },

  updateSauces: async (sauces: string[]) => {
    try {
      const updatedSettings = { ...get().settings, sauces };
      await setDoc(doc(db, 'settings', 'restaurant'), updatedSettings);
      set({ settings: updatedSettings });
    } catch (err) {
      console.error('Erreur MAJ sauces:', err);
    }
  },

  updateDrinks: async (drinks: Drink[]) => {
    try {
      const updatedSettings = { ...get().settings, drinks };
      await setDoc(doc(db, 'settings', 'restaurant'), updatedSettings);
      set({ settings: updatedSettings });
    } catch (err) {
      console.error('Erreur MAJ boissons:', err);
    }
  },

  addPromoCode: async (promo) => {
    try {
      const newId = 'promo-' + Date.now();
      const newPromo = { ...promo, id: newId };
      const currentPromos = get().settings.promoCodes || [];
      const updatedPromos = [...currentPromos, newPromo];
      await get().updateSettings({ promoCodes: updatedPromos });
    } catch (err) {
      console.error('Erreur add promo code:', err);
    }
  },

  deletePromoCode: async (id) => {
    try {
      const currentPromos = get().settings.promoCodes || [];
      const updatedPromos = currentPromos.filter(p => p.id !== id);
      await get().updateSettings({ promoCodes: updatedPromos });
    } catch (err) {
      console.error('Erreur delete promo code:', err);
    }
  },

  togglePromoCode: async (id) => {
    try {
      const currentPromos = get().settings.promoCodes || [];
      const updatedPromos = currentPromos.map(p => p.id === id ? { ...p, active: !p.active } : p);
      await get().updateSettings({ promoCodes: updatedPromos });
    } catch (err) {
      console.error('Erreur toggle promo code:', err);
    }
  },
}));

export const checkIsRestaurantOpen = (settings: RestaurantSettings, targetDate?: Date): boolean => {
  if (!settings.isOpen) return false; // Master override

  const now = targetDate || new Date();

  // Check vacation dates
  if (settings.closedFrom && settings.closedTo) {
    const closedFromDate = new Date(settings.closedFrom);
    closedFromDate.setHours(0, 0, 0, 0);
    const closedToDate = new Date(settings.closedTo);
    closedToDate.setHours(23, 59, 59, 999);
    
    if (now >= closedFromDate && now <= closedToDate) {
      return false;
    }
  }

  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const todayName = days[now.getDay()];

  const todayHours = settings.hours.find(h => h.day === todayName);
  if (!todayHours || !todayHours.isOpen) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const openMinutes = parseTime(todayHours.open);
  const closeMinutes = parseTime(todayHours.close);

  let isOpenNow = (currentMinutes >= openMinutes && currentMinutes <= closeMinutes);

  if (!isOpenNow && todayHours.hasSplitShift && todayHours.open2 && todayHours.close2) {
    const open2Minutes = parseTime(todayHours.open2);
    const close2Minutes = parseTime(todayHours.close2);
    isOpenNow = (currentMinutes >= open2Minutes && currentMinutes <= close2Minutes);
  }

  return isOpenNow;
};

export const isRestaurantOpenOnDate = (settings: RestaurantSettings, date: Date): boolean => {
  if (!settings.isOpen) return false; // Master override

  // Check vacation dates
  if (settings.closedFrom && settings.closedTo) {
    const closedFromDate = new Date(settings.closedFrom);
    closedFromDate.setHours(0, 0, 0, 0);
    const closedToDate = new Date(settings.closedTo);
    closedToDate.setHours(23, 59, 59, 999);
    
    if (date >= closedFromDate && date <= closedToDate) {
      return false;
    }
  }

  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const todayName = days[date.getDay()];
  const todayHours = settings.hours.find(h => h.day === todayName);
  
  if (!todayHours || !todayHours.isOpen) return false;

  return true;
};
