import { ImageSourcePropType } from 'react-native';

export interface CustomizationChoice {
  name: string;
  priceOffset: number;
}

export interface CustomizationSection {
  title: string;
  required: boolean;
  maxChoices: number;
  choices: CustomizationChoice[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: any;
  category: string;
  highlighted?: boolean;
  outOfStock?: boolean;
  hasSauces?: boolean;
  hasDrinkSelection?: boolean;
  customizationSections?: CustomizationSection[];
}

export const IMAGES_MAP: Record<string, any> = {
  poke: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
  dessert: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80',
  drink_33cl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80',
  drink_50cl: require('../assets/images/bottle_50cl.png'),
  drink_15l: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=800&q=80',
  drink_coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
};

export const getImageSource = (image: any): any => {
  if (!image) return { uri: IMAGES_MAP.poke };
  if (typeof image === 'string' && image.startsWith('http')) return { uri: image };
  if (typeof image === 'string' && IMAGES_MAP[image]) return IMAGES_MAP[image];
  return image; // Fallback for local require IDs if they happen to work
};

export const CATEGORIES = ['POKÉ BOWL', 'DESSERTS', 'BOISSONS'];

export const PRODUCTS: Product[] = [
  // --- NOS SIGNATURES ---
  {
    id: 'poke-falafel',
    category: 'POKÉ BOWL',
    name: 'POKÉMOONS FALAFEL',
    description: 'Boulgour, falafel, pois chiches, chou rouge, tomates cerises, poivrons, concombre, oignons frits et sauce au choix.',
    price: 18.00,
    image: 'poke',
    highlighted: true,
    hasSauces: true,
  },
  {
    id: 'poke-chicken',
    category: 'POKÉ BOWL',
    name: 'POKÉMOONS CHICKEN',
    description: 'Boulgour, escalope de poulet, avocat, oignon rouge, carottes, graines de grenade et cacahuètes écrasées.',
    price: 19.50,
    image: 'poke',
    highlighted: true,
    hasSauces: true,
  },
  {
    id: 'poke-salmon',
    category: 'POKÉ BOWL',
    name: 'POKÉMOONS SALMON',
    description: 'Riz blanc, dés de saumon cru, concombre, chou rouge, radis, edamame, citron vert, ciboulette.',
    price: 21.00,
    image: 'poke',
    highlighted: true,
    hasSauces: true,
  },
  {
    id: 'poke-beef',
    category: 'POKÉ BOWL',
    name: 'POKÉMOONS BEEF',
    description: 'Quinoa, bœuf, champignons frais, poivron, pois chiches, noix écrasées, mangue.',
    price: 22.00,
    image: 'poke',
    highlighted: true,
    hasSauces: true,
  },
  {
    id: 'poke-shrimp',
    category: 'POKÉ BOWL',
    name: 'POKÉMOONS SHRIMP',
    description: 'Riz blanc, crevettes, citron vert, radis, avocat, oignon rouge, tomates cerises, graines de sésame.',
    price: 20.00,
    image: 'poke',
    highlighted: false,
    hasSauces: true,
  },

  // --- LE SUR-MESURE ---
  {
    id: 'poke-custom',
    category: 'POKÉ BOWL',
    name: 'COMPOSE TON POKÉ',
    description: 'Crée ton propre Poké Bowl de A à Z avec tes ingrédients préférés.',
    price: 19.00,
    image: 'poke',
    highlighted: true,
    hasSauces: true,
    customizationSections: [
      {
        title: 'Choisis ta base (1 au choix)',
        required: true,
        maxChoices: 1,
        choices: [
          { name: 'Riz Blanc', priceOffset: 0 },
          { name: 'Riz Brun', priceOffset: 0 },
          { name: 'Quinoa', priceOffset: 1.50 },
          { name: 'Boulgour', priceOffset: 0 },
          { name: 'Salade Mixte', priceOffset: 0 }
        ]
      },
      {
        title: 'Choisis ta protéine (1 au choix)',
        required: true,
        maxChoices: 1,
        choices: [
          { name: 'Saumon Frais', priceOffset: 3.00 },
          { name: 'Poulet Mariné', priceOffset: 0 },
          { name: 'Falafels', priceOffset: 0 },
          { name: 'Bœuf', priceOffset: 2.00 },
          { name: 'Crevettes', priceOffset: 2.00 }
        ]
      },
      {
        title: 'Choisis tes accompagnements (4 au choix)',
        required: true,
        maxChoices: 4,
        choices: [
          { name: 'Avocat', priceOffset: 0 },
          { name: 'Edamame', priceOffset: 0 },
          { name: 'Mangue', priceOffset: 0 },
          { name: 'Concombre', priceOffset: 0 },
          { name: 'Chou Rouge', priceOffset: 0 },
          { name: 'Carottes', priceOffset: 0 },
          { name: 'Radis', priceOffset: 0 },
          { name: 'Tomates Cerises', priceOffset: 0 },
          { name: 'Poivrons', priceOffset: 0 },
          { name: 'Champignons', priceOffset: 0 }
        ]
      },
      {
        title: 'Choisis tes toppings (2 au choix)',
        required: false,
        maxChoices: 2,
        choices: [
          { name: 'Oignons Frits', priceOffset: 0 },
          { name: 'Graines de Sésame', priceOffset: 0 },
          { name: 'Cacahuètes Écrasées', priceOffset: 0 },
          { name: 'Graines de Grenade', priceOffset: 0 },
          { name: 'Ciboulette', priceOffset: 0 },
          { name: 'Noix Écrasées', priceOffset: 0 }
        ]
      }
    ]
  },

  // --- DESSERTS ---
  {
    id: 'dessert-1',
    category: 'DESSERTS',
    name: 'TIRAMISU MAISON',
    description: 'Notre fameux Tiramisu préparé sur place.',
    price: 6.50,
    image: 'dessert',
  },
  {
    id: 'dessert-2',
    category: 'DESSERTS',
    name: 'SALADE DE FRUITS DU MOMENT',
    description: 'Des fruits frais coupés du jour.',
    price: 5.50,
    image: 'dessert',
  },
  {
    id: 'dessert-3',
    category: 'DESSERTS',
    name: "SALADE D'ANANAS",
    description: 'Ananas frais et juteux.',
    price: 5.00,
    image: 'dessert',
  },

  // --- BOISSONS ---
  { id: 'boisson-1', category: 'BOISSONS', name: 'COCA-COLA', description: 'Canette 33cl', price: 3.50, image: 'drink_coca' },
  { id: 'boisson-2', category: 'BOISSONS', name: 'COCA-COLA ZERO', description: 'Canette 33cl', price: 3.50, image: 'drink_zero' },
  { id: 'boisson-3', category: 'BOISSONS', name: 'EVIAN', description: 'Bouteille 50cl', price: 3.50, image: 'drink_33cl' },
  { id: 'boisson-4', category: 'BOISSONS', name: 'LEAFWELL CITRON', description: 'Gingembre et thé vert (33cl)', price: 4.50, image: 'drink_33cl' },
  { id: 'boisson-5', category: 'BOISSONS', name: 'SAN PELLEGRINO', description: 'Eau gazeuse 50cl', price: 3.50, image: 'drink_33cl' },
  { id: 'boisson-6', category: 'BOISSONS', name: 'ICE TEA PÊCHE', description: 'Canette 33cl', price: 3.50, image: 'drink_33cl' },
];
