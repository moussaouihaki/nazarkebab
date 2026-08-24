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

const DEFAULT_ZONES: Omit<DeliveryZone, 'id'>[] = [
  {
    name: 'ZONE 1 - La Chaux-de-Fonds et environs',
    postalCodes: ['2300', '2301', '2302', '2303', '2304'],
    minOrder: 20,
    deliveryFee: 0,
    estimatedTime: 20,
    active: true,
  },
  {
    name: 'ZONE 2 - Le Locle',
    postalCodes: ['2400', '2402', '2403'],
    minOrder: 40,
    deliveryFee: 0,
    estimatedTime: 30,
    active: true,
  }
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
      const colRef = collection(db, 'deliveryZones');

      // 2. Écouter en temps réel
      return onSnapshot(colRef, async (snapshot) => {
        let zones: DeliveryZone[] = [];
        snapshot.forEach(d => zones.push({ id: d.id, ...d.data() } as DeliveryZone));





        set({ zones, isLoading: false });
      }, (error) => {
        console.error('Erreur Snapshot Zones:', error);
        const localZones = DEFAULT_ZONES.map((z, idx) => ({ id: `local-${idx}`, ...z } as DeliveryZone));
        set({ zones: localZones, isLoading: false });
      });
    } catch (err) {
      console.error('Erreur Initialisation Zones:', err);
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
