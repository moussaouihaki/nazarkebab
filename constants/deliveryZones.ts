export interface DeliveryZone {
  zoneNumber: number;
  name: string;
  cities: string[];
  postalCodes: string[];
  minOrder: number;       // Minimum de commande en CHF
  deliveryFee: number;    // Frais de livraison en CHF (offerts chez Nazar)
  estimatedTime: number;  // Temps estimé en minutes
  available: boolean;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    zoneNumber: 1,
    name: 'Zone 1 — Porrentruy',
    cities: ['Porrentruy'],
    postalCodes: ['2900', '2902', '2903', '2904'],
    minOrder: 20,
    deliveryFee: 0,
    estimatedTime: 15,
    available: true,
  },
  {
    zoneNumber: 2,
    name: 'Zone 2',
    cities: ['Courtedoux', 'Fontenais', 'Courchavon', 'Alle', 'Courgenay'],
    postalCodes: ['2822', '2942', '2950', '2950', '2824'],
    minOrder: 30,
    deliveryFee: 0,
    estimatedTime: 20,
    available: true,
  },
  {
    zoneNumber: 3,
    name: 'Zone 3',
    cities: [
      'Vendlincourt', 'Chevenez', 'Coeuve', 'Courtemaîche',
      'Courtéautry', 'Cornol', 'Miécourt', 'Bure',
      'Chramolite', 'Buix', 'Basse-Allaine',
    ],
    postalCodes: ['2943', '2944', '2803', '2823', '2830', '2946', '2912', '2828', '2947'],
    minOrder: 40,
    deliveryFee: 0,
    estimatedTime: 30,
    available: true,
  },
  {
    zoneNumber: 4,
    name: 'Zone 4',
    cities: [
      'Bonfol', 'Beurnevésin', 'Damphreux', 'Lugnez', 'Montignez',
      'Buix', 'Boncourt', 'Saint-Ursanne', 'Fahy', 'Rocourt',
      'Réclère', 'Bressaucourt', 'Asuel', 'Vendlincourt', 'Outrement',
    ],
    postalCodes: ['2926', '2803', '2914', '2915', '2916', '2917', '2918', '2922', '2923', '2924', '2925', '2952', '2953', '2954', '2955'],
    minOrder: 50,
    deliveryFee: 0,
    estimatedTime: 40,
    available: true,
  },
  {
    zoneNumber: 5,
    name: 'Zone 5',
    cities: ['Boécourt', 'Glovelier', 'Bassecourt'],
    postalCodes: ['2854', '2855', '2856'],
    minOrder: 50,
    deliveryFee: 0,
    estimatedTime: 45,
    available: true,
  },
];

/**
 * Trouve la zone de livraison à partir d'une adresse saisie.
 * Cherche par code postal OU par nom de ville.
 */
export function findDeliveryZone(addressInput: string): DeliveryZone | null {
  const input = addressInput.toLowerCase().trim();

  // 1. Try to find postal code match (4-5 digits)
  const postalMatch = input.match(/\b(\d{4,5})\b/);
  if (postalMatch) {
    const pc = postalMatch[1];
    const byPostal = DELIVERY_ZONES.find(z => z.available && z.postalCodes.includes(pc));
    if (byPostal) return byPostal;
  }

  // 2. Fallback: match city name
  for (const zone of DELIVERY_ZONES) {
    if (!zone.available) continue;
    for (const city of zone.cities) {
      if (input.includes(city.toLowerCase())) return zone;
    }
  }

  return null; // Hors zone
}
