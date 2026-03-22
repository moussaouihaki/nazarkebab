// api/push.js (Vercel Serverless Function)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { to, title, body, data } = req.body;

  if (!to || !title || !body) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const message = {
    to,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erreur API Push Proxy:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi de la notification' });
  }
}
