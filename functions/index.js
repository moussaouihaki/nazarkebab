const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

/** 
 * Déclenchement Automatique des Notifications sur Changement de Statut 
 * Version Professionnelle v1 (Stable)
 */
exports.onOrderStatusUpdate = functions
  .region('europe-west1')
  .firestore.document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // On ne fait rien si le statut n'a pas changé
    if (before.status === after.status) return null;

    // On récupère le Push Token
    const pushToken = after.pushToken;
    if (!pushToken) {
      console.log(`Aucun jeton pour la commande ${orderId}`);
      return null;
    }

    const messages = {
      confirmed: "Le restaurant a validé votre commande !",
      preparing: "Votre repas est en préparation 👨‍🍳",
      ready: "Votre commande est prête / en route ! 🛵",
      delivered: "Bon appétit ! Votre commande a été livrée.",
      cancelled: "Désolé, votre commande a été annulée."
    };

    const statusTitle = {
        confirmed: "Commande Confirmée ✅",
        preparing: "En Préparation 👨‍🍳",
        ready: "Prête / En livraison 🛍️",
        delivered: "Terminée 🎉",
        cancelled: "Annulée ❌"
    };

    const messageBody = messages[after.status];
    const messageTitle = statusTitle[after.status] || "Nazar Kebab 🗞️";

    if (!messageBody) return null;

    const payload = {
      to: pushToken,
      sound: 'default',
      title: messageTitle,
      body: messageBody,
      data: { orderId: orderId, status: after.status },
      priority: 'high',
      mutableContent: true,
      channelId: 'orders',
      _displayInForeground: true,
    };

    try {
      console.log(`Envoi push pour ${orderId} : ${after.status}`);
      await axios.post('https://exp.host/--/api/v2/push/send', payload);
      return console.log(`Notification envoyée !`);
    } catch (error) {
      console.error(`Erreur notification:`, error);
      return null;
    }
  });
