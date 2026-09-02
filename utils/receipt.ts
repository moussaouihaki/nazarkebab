import { splitOptions } from './optionsOrder';

export function generateReceiptHTML(order: any, settings: any, isPaid: boolean) {
  const isDelivery = order?.deliveryType === 'delivery';
  const orderTotal = Number(order?.total) || 0;
  const subTotal = order?.subTotal !== undefined ? Number(order.subTotal) : (orderTotal / 1.026);
  const taxAmount = order?.taxAmount !== undefined ? Number(order.taxAmount) : (orderTotal - subTotal);

  // Helper pour afficher les options d'un article (ex: Poke sur mesure) — dans le bon ordre
  const renderOptions = (item: any) => {
    if (!item?.selectedOptions || Object.keys(item.selectedOptions).length === 0) return '';
    let optionsHtml = '<div class="options-list" style="margin-top: 4px; padding-left: 10px; font-family: monospace;">';

    try {
      const { food, extras } = splitOptions(item.selectedOptions);

      if (Array.isArray(food)) {
        food.forEach(f => {
          if (Array.isArray(f.choices) && f.choices.length > 0) {
            optionsHtml += `
              <div class="option-row" style="margin-top: 6px;">
                <span style="font-weight: bold; border: 1px solid #000; padding: 1px 4px; border-radius: 3px; font-size: 0.85em;">${f.sec}</span>
                <div style="margin-left: 10px; margin-top: 2px;">${f.choices.join(', ')}</div>
              </div>
            `;
          }
        });
      }

      if (Array.isArray(extras)) {
        extras.forEach(e => {
          if (Array.isArray(e.choices) && e.choices.length > 0) {
            optionsHtml += `
              <div class="option-row" style="margin-top: 8px;">
                <span style="font-size: 1.1em; font-weight: bold; background: #eee; padding: 2px 6px; border: 1px solid #000; text-transform: uppercase;">[+] ${e.choices.join(', ')}</span>
              </div>
            `;
          }
        });
      }
    } catch (e) {
      console.warn('Erreur options ticket:', e);
    }
    optionsHtml += '</div>';
    return optionsHtml;
  };

  const storeName = (settings?.name || 'POKÉMOONS').toUpperCase();
  const storeAddress = settings?.address || 'Place du Marché 6, 2300 La Chaux-de-Fonds';
  const storePhone = settings?.phone || '032 913 22 22';
  const orderDate = order?.createdAt ? new Date(order.createdAt).toLocaleString('fr-CH') : new Date().toLocaleString('fr-CH');
  const itemsList = Array.isArray(order?.items) ? order.items : [];

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Courier', monospace; padding: 10px; width: 300px; margin: auto; color: #000; font-size: 12px; }
          .center { text-align: center; }
          .divider { border-bottom: 2px dashed #000; margin: 12px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; padding: 4px 0; }
          .qty { width: 30px; font-weight: bold; }
          .price { text-align: right; white-space: nowrap; }
          .total { font-weight: bold; font-size: 1.4em; border-top: 2px solid #000; }
          .status-box { border: 2px solid #000; padding: 8px; margin: 12px 0; font-weight: bold; font-size: 1.3em; text-align: center; text-transform: uppercase; }
          .options-list { font-size: 0.85em; padding-left: 10px; font-style: italic; color: #333; margin-top: 2px; }
          .option-row { margin-bottom: 2px; }
          .client-info { border: 1px solid #000; padding: 8px; margin-bottom: 10px; }
          h1 { margin: 0 0 5px 0; font-size: 1.8em; }
          h2 { margin: 0 0 5px 0; font-size: 1.2em; }
          p { margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>${storeName}</h1>
          <p>${storeAddress}</p>
          <p>Tél: ${storePhone}</p>
          ${settings?.tva ? `<p>N° IDE/TVA: ${settings.tva}</p>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="center">
          <h2>${isPaid ? 'TICKET DE CAISSE' : 'BON DE COMMANDE'}</h2>
          <p style="font-size:1.2em; font-weight:bold;">Commande N° ${order?.id || 'TEST'}</p>
          <p>${orderDate}</p>
        </div>

        <div class="status-box" style="background: #000; color: #FFF;">
           ${isDelivery ? 'LIVRAISON 🛵' : "À L'EMPORTER 🛍️"}
        </div>

        ${order?.requestedTime ? `<div class="status-box">POUR: ${order.requestedTime}</div>` : ''}

        <div class="client-info">
          <p><strong>Client:</strong> ${order?.customerName || 'Non spécifié'}</p>
          <p><strong>Tél:</strong> ${order?.customerPhone || 'Non spécifié'}</p>
          ${isDelivery ? `<p><strong>Adresse:</strong> ${order?.customerAddress || ''}</p>` : ''}
          ${order?.note ? `<p style="margin-top:5px; border-top:1px dashed #000; padding-top:5px;"><strong>Note:</strong> ${order.note}</p>` : ''}
        </div>

        <div class="divider"></div>
        
        <table>
          ${itemsList.map((item: any) => `
            <tr>
              <td class="qty">${item.quantity || 1}x</td>
              <td>
                <strong>${item.name || 'Article'}</strong>
                ${renderOptions(item)}
                ${item.note ? `<div style="font-size:0.85em; margin-top:2px;"><em>Note: ${item.note}</em></div>` : ''}
              </td>
              <td class="price">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
            </tr>
          `).join('')}
          ${isDelivery && (order?.deliveryFee > 0) ? `
            <tr>
              <td class="qty">1x</td>
              <td>Frais de livraison</td>
              <td class="price">${Number(order.deliveryFee).toFixed(2)}</td>
            </tr>
          ` : ''}
        </table>

        <div class="divider"></div>
        
        <table style="margin-top: 10px;">
          <tr><td>Total HT:</td><td class="price">${subTotal.toFixed(2)}</td></tr>
          <tr><td>TVA incl. (2.6%):</td><td class="price">${taxAmount.toFixed(2)}</td></tr>
          <tr class="total"><td style="padding-top: 8px;">TOTAL TTC:</td><td class="price" style="padding-top: 8px;">${orderTotal.toFixed(2)} CHF</td></tr>
        </table>
        
        <div class="status-box">
           ÉTAT: ${isPaid ? 'PAYÉ ✅' : 'À PAYER ❌'}
        </div>
        
        <div class="center" style="margin-top: 15px;">
          <p>Merci de votre visite !</p>
          <p>www.pokemoons.ch</p>
        </div>
      </body>
    </html>
  `;
}
