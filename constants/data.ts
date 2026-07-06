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
    price: 4.00,
    image: 'poke',
    highlighted: true,
    hasSauces: false,
    customizationSections: [
      {
        title: 'Choisis ta base (1 au choix)',
        required: true,
        maxChoices: 1,
        choices: [
          { name: 'Riz Blanc', priceOffset: 0 },
          { name: 'Riz Brun', priceOffset: 0 },
          { name: 'Quinoa', priceOffset: 0 },
          { name: 'Boulgour', priceOffset: 0 },
          { name: 'Salade Mixte', priceOffset: 0 }
        ]
      },
      {
        title: 'Choisis ta protéine (1 au choix)',
        required: false,
        maxChoices: 1,
        choices: [
          { name: 'Saumon Frais', priceOffset: 6.00 },
          { name: 'Thon Frais', priceOffset: 6.00 },
          { name: 'Crevettes (Black Tiger)', priceOffset: 6.00 },
          { name: 'Bœuf', priceOffset: 6.00 },
          { name: 'Poulet Mariné', priceOffset: 6.00 },
          { name: 'Tofu', priceOffset: 6.00 },
          { name: 'Falafels', priceOffset: 6.00 }
        ]
      },
      {
        title: 'Choisis tes accompagnements (4 au choix)',
        required: false,
        maxChoices: 4,
        choices: [
          { name: 'Avocat', priceOffset: 2.00 },
          { name: 'Mangue', priceOffset: 2.00 },
          { name: 'Ananas', priceOffset: 2.00 },
          { name: 'Kiwi', priceOffset: 2.00 },
          { name: 'Edamame', priceOffset: 2.00 },
          { name: 'Concombre', priceOffset: 2.00 },
          { name: 'Chou Rouge', priceOffset: 2.00 },
          { name: 'Carottes', priceOffset: 2.00 },
          { name: 'Radis', priceOffset: 2.00 },
          { name: 'Tomates Cerises', priceOffset: 2.00 },
          { name: 'Poivrons', priceOffset: 2.00 },
          { name: 'Champignons Frais', priceOffset: 2.00 },
          { name: 'Lentilles', priceOffset: 2.00 },
          { name: 'Algues Wakame', priceOffset: 2.00 },
          { name: 'Pois Chiches', priceOffset: 2.00 },
          { name: 'Graines de Grenade', priceOffset: 2.00 },
          { name: 'Citron Vert', priceOffset: 2.00 },
          { name: 'Oignons Rouges', priceOffset: 2.00 },
          { name: 'Maïs', priceOffset: 2.00 },
          { name: 'Olives', priceOffset: 2.00 },
          { name: 'Feta', priceOffset: 2.00 },
          { name: 'Œuf', priceOffset: 2.00 }
        ]
      },
      {
        title: 'Choisis tes toppings (2 au choix)',
        required: false,
        maxChoices: 2,
        choices: [
          { name: 'Oignons Frits', priceOffset: 1.00 },
          { name: 'Graines de Sésame', priceOffset: 1.00 },
          { name: 'Cacahuètes Écrasées', priceOffset: 1.00 },
          { name: 'Noix de Cajou', priceOffset: 1.00 },
          { name: 'Amandes', priceOffset: 1.00 },
          { name: 'Raisins Secs', priceOffset: 1.00 },
          { name: 'Persil', priceOffset: 1.00 },
          { name: 'Ciboulette', priceOffset: 1.00 },
          { name: 'Noix Écrasées', priceOffset: 1.00 }
        ]
      },
      {
        title: 'Choisis ta sauce (1 au choix)',
        required: true,
        maxChoices: 1,
        choices: [
          { name: 'Teriyaki', priceOffset: 0 },
          { name: 'Garlic Teriyaki', priceOffset: 0 },
          { name: 'Soy (Soja)', priceOffset: 0 },
          { name: 'Spicy Mayo Maison', priceOffset: 0 },
          { name: 'Homemade Lemon Olive Oil', priceOffset: 0 },
          { name: 'Special House Sauce', priceOffset: 0 }
        ]
      },
      {
        title: 'Sauce Supplémentaire',
        required: false,
        maxChoices: 2,
        choices: [
          { name: 'Teriyaki (Extra)', priceOffset: 0.50 },
          { name: 'Garlic Teriyaki (Extra)', priceOffset: 0.50 },
          { name: 'Soy (Extra)', priceOffset: 0.50 },
          { name: 'Spicy Mayo Maison (Extra)', priceOffset: 0.50 },
          { name: 'Homemade Lemon Olive Oil (Extra)', priceOffset: 0.50 },
          { name: 'Special House Sauce (Extra)', priceOffset: 0.50 }
        ]
      },
      {
        title: 'Choisis ta boisson',
        required: true,
        maxChoices: 1,
        choices: [
          { name: 'Sans Boisson', priceOffset: 0 },
          { name: 'Coca-Cola 0.5l', priceOffset: 4.00 },
          { name: 'Coca-Cola 1.5l', priceOffset: 9.00 },
          { name: 'Coca-Cola Zero 0.5l', priceOffset: 4.00 },
          { name: 'Coca-Cola Zero 1.5l', priceOffset: 9.00 },
          { name: 'Fanta Orange 0.5l', priceOffset: 4.00 },
          { name: 'Fanta Orange 1.5l', priceOffset: 9.00 },
          { name: 'Fusetea Lemon 0.5l', priceOffset: 4.00 },
          { name: 'Fusetea Peach 0.5l', priceOffset: 4.00 },
          { name: 'Valser Pétillante 0.5l', priceOffset: 4.00 },
          { name: 'Valser Plate 0.5l', priceOffset: 4.00 },
          { name: 'Valser Plate 1.5l', priceOffset: 9.00 }
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
  { id: 'boisson-1', category: 'BOISSONS', name: 'Coca-Cola', description: '0.5l', price: 4.00, image: 'drink_33cl' },
  { id: 'boisson-2', category: 'BOISSONS', name: 'Coca-Cola', description: '1.5l', price: 9.00, image: 'drink_33cl' },
  { id: 'boisson-3', category: 'BOISSONS', name: 'Coca-Cola Zero', description: '0.5l', price: 4.00, image: 'drink_33cl' },
  { id: 'boisson-4', category: 'BOISSONS', name: 'Coca-Cola Zero', description: '1.5l', price: 9.00, image: 'drink_33cl' },
  { id: 'boisson-5', category: 'BOISSONS', name: 'Fanta', description: '0.5l', price: 4.00, image: 'drink_33cl' },
  { id: 'boisson-6', category: 'BOISSONS', name: 'Fanta', description: '1.5l', price: 9.00, image: 'drink_33cl' },
  { id: 'boisson-7', category: 'BOISSONS', name: 'Sprite', description: '0.5l', price: 4.00, image: 'drink_33cl' },
  { id: 'boisson-8', category: 'BOISSONS', name: 'Sprite', description: '1.5l', price: 9.00, image: 'drink_33cl' },
  { id: 'boisson-9', category: 'BOISSONS', name: 'Fusetea Lemon', description: '0.5l', price: 4.00, image: 'drink_33cl' },
  { id: 'boisson-10', category: 'BOISSONS', name: 'Fusetea Peach', description: '0.5l', price: 4.00, image: 'drink_33cl' },
  { id: 'boisson-11', category: 'BOISSONS', name: 'Valser Pétillante', description: '0.5l', price: 4.00, image: 'drink_33cl' },
  { id: 'boisson-12', category: 'BOISSONS', name: 'Valser Plate', description: '0.5l', price: 4.00, image: 'drink_33cl' },
  { id: 'boisson-13', category: 'BOISSONS', name: 'Valser Plate', description: '1.5l', price: 9.00, image: 'drink_33cl' },
  { id: 'boisson-14', category: 'BOISSONS', name: 'Leafwell Citron, Gingembre', description: '0.33l', price: 4.50, image: 'drink_33cl' },
  { id: 'boisson-15', category: 'BOISSONS', name: 'Leafwell Pêche, Vanille', description: '0.33l', price: 4.50, image: 'drink_33cl' },
  { id: 'boisson-16', category: 'BOISSONS', name: 'Leafwell Fruits Rouges', description: '0.33l', price: 4.50, image: 'drink_33cl' },
  { id: 'boisson-17', category: 'BOISSONS', name: 'Leafwell Pomme, Cannelle', description: '0.33l', price: 4.50, image: 'drink_33cl' },
  { id: 'boisson-18', category: 'BOISSONS', name: 'Leafwell Myrtille, Sureau', description: '0.33l', price: 4.50, image: 'drink_33cl' },
  { id: 'boisson-19', category: 'BOISSONS', name: 'Eau Pétillante', description: '1.5l', price: 9.00, image: 'drink_33cl' },
  { id: 'boisson-20', category: 'BOISSONS', name: 'Red Bull', description: '0.25l', price: 5.00, image: 'drink_33cl' }
];
