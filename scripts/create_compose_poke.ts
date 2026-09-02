import { db } from '../lib/firebase.js';
import { doc, setDoc } from 'firebase/firestore';

const composePoke = {
  name: 'COMPOSE TON POKÉ',
  description: 'Crée ton propre Poké Bowl de A à Z avec tes ingrédients préférés.',
  price: 4.00,
  category: 'COMPOSE TON POKE',
  image: 'poke',
  highlighted: false,
  hasSauces: false,
  displayOrder: 0,
  outOfStock: false,
  allergens: [],
  customizationSections: [
    {
      title: 'Choisis ta base (2 au choix)',
      required: true,
      maxChoices: 2,
      choices: [
        { name: 'Riz Blanc', priceOffset: 0 },
        { name: 'Riz Brun', priceOffset: 0 },
        { name: 'Quinoa', priceOffset: 0 },
        { name: 'Boulgour', priceOffset: 0 },
        { name: 'Salade Mixte', priceOffset: 0 }
      ]
    },
    {
      title: 'Choisis ta protéine (2 au choix)',
      required: false,
      maxChoices: 2,
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
      title: 'Choisis tes accompagnements (5 au choix)',
      required: false,
      maxChoices: 5,
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
      title: 'Choisis tes toppings (5 au choix)',
      required: false,
      maxChoices: 5,
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
    }
  ]
};

async function create() {
  const ref = doc(db, 'pokemoons_products', 'poke-custom');
  await setDoc(ref, composePoke);
  console.log('COMPOSE TON POKÉ a été recréé avec succès dans la catégorie "COMPOSE TON POKE" !');
  process.exit(0);
}

create().catch(console.error);
