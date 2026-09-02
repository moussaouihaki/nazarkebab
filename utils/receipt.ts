import { splitOptions } from './optionsOrder';

export function generateReceiptHTML(order: any, settings: any, isPaid: boolean) {
  const isDelivery = order?.deliveryType === 'delivery';
  const orderTotal = Number(order?.total) || 0;
  const subTotal = order?.subTotal !== undefined ? Number(order.subTotal) : (orderTotal / 1.026);
  const taxAmount = order?.taxAmount !== undefined ? Number(order.taxAmount) : (orderTotal - subTotal);

  // Helper pour afficher les options d'un article (ex: Poke sur mesure) — dans le bon ordre
  const renderOptions = (item: any) => {
    if (!item?.selectedOptions || Object.keys(item.selectedOptions).length === 0) return '';
    let optionsHtml = '<div class="options-list" style="margin-top: 6px; padding-left: 6px;">';

    try {
      const { food, extras } = splitOptions(item.selectedOptions);

      if (Array.isArray(food)) {
        food.forEach(f => {
          if (Array.isArray(f.choices) && f.choices.length > 0) {
            optionsHtml += `
              <div class="option-row" style="margin-top: 6px; font-size: 15px;">
                <span style="font-weight: 900; border: 1.5px solid #000; padding: 2px 6px; border-radius: 4px; font-size: 13px; text-transform: uppercase;">${f.sec}</span>
                <div style="margin-left: 8px; margin-top: 3px; font-weight: bold; font-size: 15px; color: #000;">${f.choices.join(', ')}</div>
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
                <span style="font-size: 15px; font-weight: 900; background: #000; color: #fff; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">[+] ${e.choices.join(', ')}</span>
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
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif, monospace; 
            padding: 8px; 
            width: 100%; 
            max-width: 280px; 
            margin: auto; 
            color: #000; 
            font-size: 13px; 
            font-weight: 600;
            line-height: 1.3;
          }
          .center { text-align: center; }
          .divider { border-bottom: 1.5px dashed #000; margin: 10px 0; }
          .thick-divider { border-bottom: 2px solid #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; padding: 4px 0; font-size: 13px; }
          .qty { width: 32px; font-weight: 900; font-size: 14px; color: #000; }
          .item-name { font-size: 13px; font-weight: 900; color: #000; }
          .price { text-align: right; white-space: nowrap; font-weight: 900; font-size: 13px; }
          .total { font-weight: 900; font-size: 1.3em; border-top: 2px solid #000; }
          .status-box { 
            border: 2px solid #000; 
            padding: 6px 8px; 
            margin: 8px 0; 
            font-weight: 900; 
            font-size: 15px; 
            text-align: center; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
          }
          .client-box { 
            border: 1.5px solid #000; 
            padding: 8px 10px; 
            margin: 10px 0; 
            border-radius: 4px;
            background: #fafafa;
          }
          .client-title { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #555; margin-bottom: 4px; }
          .client-name { font-size: 16px; font-weight: 900; color: #000; margin-bottom: 2px; }
          .client-phone { font-size: 14px; font-weight: 900; color: #000; margin-bottom: 3px; }
          .client-addr { font-size: 13px; font-weight: 900; color: #000; line-height: 1.25; }
          .client-note { margin-top: 6px; border-top: 1.5px dashed #000; padding-top: 6px; font-size: 12px; font-weight: 900; color: #000; }
          h1 { margin: 0 0 2px 0; font-size: 17px; font-weight: 900; }
          h2 { margin: 0 0 2px 0; font-size: 14px; font-weight: 900; }
          p { margin: 2px 0; }
        </style>
      </head>
      <body>
        <!-- EN-TÊTE DU RESTAURANT -->
        <div class="center">
          <h1>${storeName}</h1>
          <p style="font-size: 11px; font-weight: bold;">${storeAddress}</p>
          <p style="font-size: 12px; font-weight: 900;">Tél: ${storePhone}</p>
          ${settings?.tva ? `<p style="font-size: 10px;">N° IDE/TVA: ${settings.tva}</p>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <!-- COMMANDE & DATE -->
        <div class="center">
          <h2>${isPaid ? 'TICKET DE CAISSE' : 'BON DE COMMANDE'}</h2>
          <p style="font-size: 19px; font-weight: 900; margin: 2px 0;">COMMANDE N° ${order?.id || 'TEST'}</p>
          <p style="font-size: 11px; font-weight: bold;">${orderDate}</p>
        </div>

        <!-- STATUT LIVRAISON / TAKEAWAY -->
        <div class="status-box" style="background: #000; color: #FFF;">
           ${isDelivery ? 'LIVRAISON 🛵' : "À L'EMPORTER 🛍️"}
        </div>

        ${order?.requestedTime ? `
          <div class="status-box" style="background: #eee; font-size: 15px;">
            POUR : ${order.requestedTime === 'ASAP' ? 'DÈS QUE POSSIBLE (AU PLUS VITE) ⚡' : order.requestedTime}
          </div>
        ` : ''}

        <!-- COORDONNÉES CLIENT (NET & LISIBLE) -->
        <div class="client-box">
          <div class="client-title">CLIENT</div>
          <div class="client-name">👤 ${order?.customerName || 'Client'}</div>
          <div class="client-phone">📞 ${order?.customerPhone || 'Non renseigné'}</div>
          ${isDelivery ? `
            <div class="client-addr">📍 ${order?.customerAddress || 'Adresse non spécifiée'}</div>
          ` : ''}
          ${order?.note ? `
            <div class="client-note">⚠️ NOTE : ${order.note}</div>
          ` : ''}
        </div>

        <div class="thick-divider"></div>
        
        <!-- LISTE DES ARTICLES -->
        <table>
          ${itemsList.map((item: any) => `
            <tr style="border-bottom: 1px dashed #ddd;">
              <td class="qty">${item.quantity || 1}x</td>
              <td>
                <div class="item-name">${item.name || 'Article'}</div>
                ${renderOptions(item)}
                ${item.note ? `<div style="font-size: 11px; margin-top: 3px; font-weight: bold; background: #eee; padding: 2px 4px;">Note: ${item.note}</div>` : ''}
              </td>
              <td class="price">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
            </tr>
          `).join('')}
          ${isDelivery && (order?.deliveryFee > 0) ? `
            <tr>
              <td class="qty">1x</td>
              <td><div class="item-name">Frais de livraison</div></td>
              <td class="price">${Number(order.deliveryFee).toFixed(2)}</td>
            </tr>
          ` : ''}
        </table>

        <div class="thick-divider"></div>
        
        <!-- TOTAUX & TVA -->
        <table style="margin-top: 4px;">
          <tr><td style="font-weight: bold; font-size: 12px;">Total HT :</td><td class="price" style="font-size: 12px;">${subTotal.toFixed(2)} CHF</td></tr>
          <tr><td style="font-weight: bold; font-size: 12px;">TVA incl. (2.6%) :</td><td class="price" style="font-size: 12px;">${taxAmount.toFixed(2)} CHF</td></tr>
          <tr class="total">
            <td style="padding-top: 6px; font-size: 16px; font-weight: 900;">TOTAL TTC :</td>
            <td class="price" style="padding-top: 6px; font-size: 17px; font-weight: 900;">${orderTotal.toFixed(2)} CHF</td>
          </tr>
        </table>
        
        <!-- PAIEMENT -->
        <div class="status-box" style="margin-top: 10px; font-size: 14px; background: ${isPaid ? '#e8f5e9' : '#ffebee'}; border-color: ${isPaid ? '#2e7d32' : '#c62828'};">
           RÈGLEMENT : ${isPaid ? 'PAYÉ PAR CARTE ✅' : 'À ENCAISSER EN CASH ❌'}
        </div>
        
        <div class="center" style="margin-top: 14px; font-size: 12px; font-weight: bold;">
          <p>Merci de votre commande !</p>
          <p>www.pokemoons.ch</p>
        </div>
      </body>
    </html>
  `;
}
