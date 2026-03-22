import { create } from 'zustand';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeliveryZone {
  id: string;
  name: string;           // Ex: "Porrentruy Centre", "Villages alentours"
  postalCodes: string[];  // Ex: ["2900", "2902"]
  minOrder: number;       // Commande minimum en CHF
  deliveryFee: number;    // Frais de livraison en CHF (0 = gratuit)
  estimatedTime: number;  // Temps de livraison estimé en minutes
  active: boolean;
}

interface DeliveryZoneState {
  zones: DeliveryZone[];
  isLoading: boolean;

  fetchZones: () => void;
  addZone: (zone: Omit<DeliveryZone, 'id'>) => Promise<void>;
  updateZone: (id: string, data: Partial<DeliveryZone>) => Promise<void>;
  deleteZone: (id: string) => Promise<void>;

  // Utilitaire : retrouver la zone à partir d'une adresse complète
  getZoneForAddress: (address: string) => DeliveryZone | null;
}

// ─── Zones par défaut (région Porrentruy) ────────────────────────────────────

const DEFAULT_ZONES: Omit<DeliveryZone, 'id'>[] = [
  {
    name: 'ZONE 1 - Porrentruy',
    postalCodes: ['2900'],
    minOrder: 20,
    deliveryFee: 0,
    estimatedTime: 20,
    active: true,
  },
  {
    name: 'ZONE 2 - Environs Proches',
    postalCodes: ['2905', '2902', '2922', '2942', '2950'], // Courtedoux, Fontenais, Courchavon, Alle, Courgenay
    minOrder: 30,
    deliveryFee: 0,
    estimatedTime: 30,
    active: true,
  },
  {
    name: 'ZONE 3 - Ajoie Centre',
    postalCodes: ['2943', '2906', '2932', '2923', '2952', '2946', '2915', '2947', '2925'], // Vendlincourt, Chevenez, Coeuve, Courtemaîche, Cornol, Miécourt, Bure, Charmoille, Buix
    minOrder: 40,
    deliveryFee: 0,
    estimatedTime: 40,
    active: true,
  },
  {
    name: 'ZONE 4 - Ajoie Périphérie',
    postalCodes: ['2944', '2935', '2933', '2924', '2926', '2882', '2916', '2907', '2912', '2904', '2954'], // Bonfol, Beurnevésin, Damphreux, Lugnez, Montignez, Boncourt, St-Ursanne, Fahy, Rocourt, Réclère, Bressaucourt, Asuel
    minOrder: 50,
    deliveryFee: 0,
    estimatedTime: 50,
    active: true,
  },
  {
    name: 'ZONE 5 - Vallée / Delémont',
    postalCodes: ['2856', '2855', '2854'], // Boécourt, Glovelier, Bassecourt
    minOrder: 50,
    deliveryFee: 0,
    estimatedTime: 60,
    active: true,
  },
];

// ─── Extraction du code postal depuis une adresse ────────────────────────────

export const extractPostalCode = (address: string): string | null => {
  // Swizerland ZIP codes are 4 digits. Let's find all 4-digit sequences.
  const matches = address.match(/\b(\d{4})\b/g);
  if (!matches || matches.length === 0) return null;
  // If multiple found (e.g. house number 1234), the ZIP code is almost always at the end in Switzerland.
  return matches[matches.length - 1];
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useDeliveryZoneStore = create<DeliveryZoneState>((set, get) => ({
  zones: [],
  isLoading: false,

  fetchZones: async () => {
    try {
      // 1. Détecter si on doit injecter les zones par défaut
      const colRef = collection(db, 'deliveryZones');
      const existing = await getDocs(colRef);

      if (existing.empty) {
        set({ isLoading: true });
        const injected: DeliveryZone[] = [];
        for (const zoneData of DEFAULT_ZONES) {
          const ref = doc(colRef);
          await setDoc(ref, zoneData);
          injected.push({ id: ref.id, ...zoneData } as DeliveryZone);
        }
        set({ zones: injected, isLoading: false });
      }

      // 2. Écouter en temps réel
      return onSnapshot(colRef, (snapshot) => {
        const zones: DeliveryZone[] = [];
        snapshot.forEach(d => zones.push({ id: d.id, ...d.data() } as DeliveryZone));
        set({ zones, isLoading: false });
      }, (error) => {
        console.error('Erreur Snapshot Zones:', error);
        // Fallback local si permission refusée
        const localZones = DEFAULT_ZONES.map((z, idx) => ({ id: `local-${idx}`, ...z } as DeliveryZone));
        set({ zones: localZones, isLoading: false });
      });
    } catch (err) {
      console.error('Erreur Initialisation Zones:', err);
      // Fallback local direct
      const localZones = DEFAULT_ZONES.map((z, idx) => ({ id: `local-${idx}`, ...z } as DeliveryZone));
      set({ zones: localZones, isLoading: false });
    }
  },

  addZone: async (zoneData) => {
    const ref = doc(collection(db, 'deliveryZones'));
    await setDoc(ref, zoneData);
  },

  updateZone: async (id, data) => {
    await updateDoc(doc(db, 'deliveryZones', id), data);
  },

  deleteZone: async (id) => {
    await deleteDoc(doc(db, 'deliveryZones', id));
  },

  getZoneForAddress: (address) => {
    const postalCode = extractPostalCode(address);
    if (!postalCode) return null;

    const { zones } = get();
    return zones.find(
      z => z.active && z.postalCodes.map(c => c.trim()).includes(postalCode.trim())
    ) || null;
  },
}));
