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

  // Category actions
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;

  // Settings actions
  updateSettings: (data: Partial<RestaurantSettings>) => Promise<void>;
  updateHours: (day: string, data: Partial<OpeningHours>) => Promise<void>;
  updateSauces: (sauces: string[]) => Promise<void>;
  updateDrinks: (drinks: Drink[]) => Promise<void>;
}

const DEFAULT_HOURS: OpeningHours[] = [
  { day: 'Lundi',    isOpen: true,  open: '11:00', close: '14:00' },
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
        set({ categories: categoriesDoc.data().list });
      } else {
        await setDoc(doc(db, 'settings', 'pokemoons_categories'), { list: INITIAL_CATEGORIES });
        set({ categories: INITIAL_CATEGORIES });
      }

      // 3. Listen to Products in real-time
      onSnapshot(collection(db, 'pokemoons_products'), (snapshot) => {
        const prodList: Product[] = [];
        snapshot.forEach((docSnap) => {
          prodList.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
        
        // Merge local missing products to ensure UI always has the defaults
        const mergedProducts = [...prodList];
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
      await updateDoc(doc(db, 'pokemoons_products', id), data);
    } catch (err) {
      console.error('Erreur MAJ produit:', err);
    }
  },

  deleteProduct: async (id) => {
    try {
      await deleteDoc(doc(db, 'pokemoons_products', id));
    } catch (err) {
      console.error('Erreur suppression produit:', err);
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
      
      // Note: We might want to keep products but remove their category link, 
      // or delete them. For now, let's just update categories.
      set({ categories: newList });
    } catch (err) {
      console.error('Erreur suppression catégorie:', err);
    }
  },

  updateSettings: async (data) => {
    try {
      const updated = { ...get().settings, ...data };
      await updateDoc(doc(db, 'settings', 'pokemoons_restaurant'), data);
      set({ settings: updated });
    } catch (err) {
      console.error('Erreur MAJ réglages:', err);
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
