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
  dessert: 'https://images.unsplash.com/photo-1558402431-7bfa00d3b664?w=800&q=80',
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
  // --- POKÉ BOWL ---
  {
    id: 'poke-custom',
    category: 'POKÉ BOWL',
    name: 'COMPOSE TON POKÉ',
    description: 'Créez votre propre Poké Bowl de A à Z avec vos ingrédients favoris.',
    price: 18.00,
    image: 'https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?w=800&q=80',
    highlighted: true,
    customizationSections: [
      {
        title: 'Choisis ta base (1 au choix)',
        required: true,
        maxChoices: 1,
        choices: [
          { name: 'Riz Sushi', priceOffset: 0 },
          { name: 'Quinoa', priceOffset: 1 },
          { name: 'Salade Mixte', priceOffset: 0 },
          { name: 'Moitié Riz / Moitié Salade', priceOffset: 0 },
        ]
      },
      {
        title: 'Choisis ta protéine (1 au choix)',
        required: true,
        maxChoices: 1,
        choices: [
          { name: 'Saumon Frais', priceOffset: 0 },
          { name: 'Saumon Mariné', priceOffset: 0 },
          { name: 'Thon Frais', priceOffset: 1.5 },
          { name: 'Thon Mariné Spicy', priceOffset: 1.5 },
          { name: 'Poulet Teriyaki', priceOffset: -1 },
          { name: 'Tofu Mariné', priceOffset: -2 },
        ]
      },
      {
        title: 'Choisis tes accompagnements (4 au choix)',
        required: true,
        maxChoices: 4,
        choices: [
          { name: 'Avocat', priceOffset: 0 },
          { name: 'Mangue', priceOffset: 0 },
          { name: 'Edamame', priceOffset: 0 },
          { name: 'Concombre', priceOffset: 0 },
          { name: 'Radis', priceOffset: 0 },
          { name: 'Chou Rouge', priceOffset: 0 },
          { name: 'Carottes', priceOffset: 0 },
          { name: 'Algues Wakame', priceOffset: 1 },
        ]
      },
      {
        title: 'Choisis tes toppings (2 au choix)',
        required: false,
        maxChoices: 2,
        choices: [
          { name: 'Oignons Frits', priceOffset: 0 },
          { name: 'Graines de Sésame', priceOffset: 0 },
          { name: 'Cacahuètes Pilées', priceOffset: 0 },
          { name: 'Ciboulette', priceOffset: 0 },
        ]
      },
      {
        title: 'Choisis ta sauce (1 au choix)',
        required: true,
        maxChoices: 1,
        choices: [
          { name: 'Sauce Soja Sucrée', priceOffset: 0 },
          { name: 'Sauce Soja Salée', priceOffset: 0 },
          { name: 'Spicy Mayo', priceOffset: 0 },
          { name: 'Vinaigrette Sésame', priceOffset: 0 },
          { name: 'Sans Sauce', priceOffset: 0 },
        ]
      }
    ]
  },
  {
    id: 'poke-1',
    category: 'POKÉ BOWL',
    name: 'POKÉ SAUMON SIGNATURE',
    description: 'Riz vinaigré, saumon frais, avocat, mangue, edamame, concombre, graines de sésame.',
    price: 18.00,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    hasSauces: true,
  },
  {
    id: 'poke-2',
    category: 'POKÉ BOWL',
    name: 'POKÉ THON SPICY',
    description: 'Riz vinaigré, thon mariné épicé, avocat, radis, chou rouge, oignons frits.',
    price: 19.50,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
    hasSauces: true,
  },
  {
    id: 'poke-3',
    category: 'POKÉ BOWL',
    name: 'POKÉ POULET TERIYAKI',
    description: 'Riz, poulet teriyaki, ananas, avocat, carottes, graines de sésame.',
    price: 17.00,
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80',
    hasSauces: true,
  },
  {
    id: 'poke-4',
    category: 'POKÉ BOWL',
    name: 'POKÉ VEGGIE TOFU',
    description: 'Quinoa, tofu mariné, avocat, edamame, chou rouge, mangue.',
    price: 16.00,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
    hasSauces: true,
  },

  // --- DESSERTS ---
  { id: 'dessert-1', category: 'DESSERTS', name: 'MOCHIS GLACÉS (3 PIÈCES)', description: 'Parfums assortis.', price: 6.50, image: 'https://images.unsplash.com/photo-1558402431-7bfa00d3b664?w=800&q=80' },
  { id: 'dessert-2', category: 'DESSERTS', name: 'CHEESECAKE MATCHA', description: 'Cheesecake au thé vert matcha.', price: 7.00, image: 'https://images.unsplash.com/photo-1508737804141-4c3b688e2546?w=800&q=80' },

  // --- BOISSONS ---
  { id: 'boisson-3', category: 'BOISSONS', name: 'COCA-COLA 33CL', description: '', price: 3.50, image: 'drink_33cl' },
  { id: 'boisson-4', category: 'BOISSONS', name: 'EAU MINÉRALE 50CL', description: 'Plate ou gazeuse.', price: 3.00, image: 'drink_50cl', hasDrinkSelection: true },
];
