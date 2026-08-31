import { db } from './lib/firebase.js';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

async function patch() {
  const ref = doc(db, 'pokemoons_products', 'poke-custom');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { category: 'CRÉER TON POKÉBOWL' });
    console.log('Patched poke-custom category in Firestore!');
  } else {
    console.log('poke-custom not found in Firestore, it will use local INITIAL_PRODUCTS.');
  }
}

patch().catch(console.error);
