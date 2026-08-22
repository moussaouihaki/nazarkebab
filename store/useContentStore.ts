import { create } from 'zustand';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ValueWidget {
  id: string;
  icon: any; // Ionicons name, e.g. "leaf-outline"
  title: string;
  description: string;
  color: string; // Theme.colors.success usually
}

export interface SiteContent {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string; // URL
  heroButtonText: string;
  values: ValueWidget[];
  footerCity: string;
  footerPhone: string;
  footerCopyright: string;
}

const DEFAULT_CONTENT: SiteContent = {
  heroTitle: "L'ART DU POKÉ BOWL",
  heroSubtitle: "DEPUIS 4 ANS",
  heroImage: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80",
  heroButtonText: "VOIR LA CARTE",
  values: [
    {
      id: "val-1",
      icon: "leaf-outline",
      title: "PRODUITS FRAIS",
      description: "Sélectionnés avec soin pour une qualité optimale et un goût authentique.",
      color: "#4CAF50"
    },
    {
      id: "val-2",
      icon: "heart-outline",
      title: "FAIT MAISON",
      description: "Des recettes uniques préparées avec amour par nos chefs passionnés.",
      color: "#4CAF50"
    },
    {
      id: "val-3",
      icon: "nutrition-outline",
      title: "SAIN & GOURMAND",
      description: "L'équilibre parfait entre une alimentation saine et le plaisir gustatif.",
      color: "#4CAF50"
    }
  ],
  footerCity: "LA CHAUX-DE-FONDS",
  footerPhone: "032 757 44 44",
  footerCopyright: "Pokémoons. Tous droits réservés."
};

interface ContentState {
  content: SiteContent;
  isLoading: boolean;
  
  fetchContent: () => Promise<void>;
  updateContent: (data: Partial<SiteContent>) => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  content: DEFAULT_CONTENT,
  isLoading: false,

  fetchContent: async () => {
    set({ isLoading: true });
    try {
      // Real-time listener for content
      onSnapshot(doc(db, 'settings', 'pokemoons_content'), (docSnap) => {
        if (docSnap.exists()) {
          set({ content: { ...DEFAULT_CONTENT, ...docSnap.data() } as SiteContent });
        } else {
          // Initialize if it doesn't exist
          setDoc(doc(db, 'settings', 'pokemoons_content'), DEFAULT_CONTENT);
        }
      });
    } catch (err) {
      console.error('Erreur chargement du contenu:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateContent: async (data: Partial<SiteContent>) => {
    try {
      const updated = { ...get().content, ...data };
      await setDoc(doc(db, 'settings', 'pokemoons_content'), updated, { merge: true });
      // The onSnapshot will automatically update the local state
    } catch (err) {
      console.error('Erreur MAJ du contenu:', err);
      throw err;
    }
  },
}));
