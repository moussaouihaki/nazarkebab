const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const https = require('https');

initializeApp();

exports.pushNotifications = onDocumentUpdated({
  document: 'orders/{orderId}',
  region: 'europe-west1'
}, async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const orderId = event.params.orderId;

    if (before.status === after.status) return null;

    const pushToken = after.pushToken;
    if (!pushToken) return null;

    const messages = {
      confirmed: "Commande validée !",
      preparing: "En préparation...",
      ready: "C'est prêt !",
      delivered: "Livré !",
      cancelled: "Annulée"
    };

    const messageBody = messages[after.status];
    if (!messageBody) return null;

    const payload = JSON.stringify({
      to: pushToken,
      title: "Pokémoons",
      body: messageBody,
      data: { orderId: orderId },
      priority: 'high',
      channelId: 'orders'
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'exp.host',
        path: '/--/api/v2/push/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
        },
      };

      const req = https.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve());
      });

      req.on('error', (e) => reject(e));
      req.write(payload);
      req.end();
    });
});
