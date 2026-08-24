const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc, setDoc } = require('firebase/firestore');

// Since this is a Node.js script run locally, we need firebase module. Wait, I can just use the web SDK installed in the project.
// Let's use ts-node or just write a small script that I run via npx tsx.
