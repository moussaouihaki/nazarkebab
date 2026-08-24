require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const newSections = [
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
];

async function run() {
  await updateDoc(doc(db, 'pokemoons_products', 'poke-custom'), {
    customizationSections: newSections
  });
  console.log('Firebase updated successfully');
  process.exit(0);
}

run().catch(console.error);
