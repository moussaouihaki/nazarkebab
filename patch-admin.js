const fs = require('fs');
const file = 'app/admin.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update order rendering to show loyalty discount if it exists
// First, in the modal
code = code.replace(
  `              <View style={styles.orderTotalRow}>
                <Text style={styles.orderTotalLabel}>TOTAL</Text>
                <Text style={styles.orderTotalValue}>{activeOrder.total.toFixed(2)} CHF</Text>
              </View>`,
  `              {!!activeOrder.loyaltyDiscount && (
                <View style={[styles.orderTotalRow, { marginTop: 4, marginBottom: 4 }]}>
                  <Text style={[styles.orderTotalLabel, { color: Theme.colors.success }]}>Réduction Fidélité</Text>
                  <Text style={[styles.orderTotalValue, { color: Theme.colors.success }]}>-{activeOrder.loyaltyDiscount.toFixed(2)} CHF</Text>
                </View>
              )}
              <View style={styles.orderTotalRow}>
                <Text style={styles.orderTotalLabel}>TOTAL</Text>
                <Text style={styles.orderTotalValue}>{activeOrder.total.toFixed(2)} CHF</Text>
              </View>`
);

// Second, in the list item card
code = code.replace(
  `          <Text style={styles.cardTotal}>{item.total.toFixed(2)} CHF</Text>`,
  `          {!!item.loyaltyDiscount && (
            <Text style={{ fontFamily: Theme.fonts.bodyBold, color: Theme.colors.success, fontSize: 12 }}>
              Fidélité: -{item.loyaltyDiscount.toFixed(2)} CHF
            </Text>
          )}
          <Text style={styles.cardTotal}>{item.total.toFixed(2)} CHF</Text>`
);

fs.writeFileSync(file, code);
