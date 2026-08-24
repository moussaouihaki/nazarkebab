const fs = require('fs');
const file = 'store/useCartStore.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add loyaltyDiscount to Order interface
code = code.replace(
  "requestedTime: string;",
  "requestedTime: string;\n  loyaltyDiscount?: number;"
);

// 2. Update placeOrder signature
code = code.replace(
  "placeOrder: (userId?: string, requestedTime?: string) => Promise<Order>;",
  "placeOrder: (userId?: string, requestedTime?: string, loyaltyDiscount?: number) => Promise<Order>;"
);

// 3. Update placeOrder logic
const placeOrderStart = `placeOrder: async (userId?: string, requestedTime: string = 'ASAP') => {
    const state = get();
    const orderId = generateOrderId();
    const grandTotal = state.total + state.deliveryFee;
    const taxRate = 0.026;
    const subTotal = grandTotal / (1 + taxRate);
    const taxAmount = grandTotal - subTotal;`;

const newPlaceOrderStart = `placeOrder: async (userId?: string, requestedTime: string = 'ASAP', loyaltyDiscount: number = 0) => {
    const state = get();
    const orderId = generateOrderId();
    const grandTotal = Math.max(0, state.total + state.deliveryFee - loyaltyDiscount);
    const taxRate = 0.026;
    const subTotal = grandTotal / (1 + taxRate);
    const taxAmount = grandTotal - subTotal;`;

code = code.replace(placeOrderStart, newPlaceOrderStart);

// 4. Update orderData object in placeOrder
const orderDataStr = `      taxAmount,
      requestedTime,
      userId: userId || useAuthStore.getState().user?.id || null,`;

const newOrderDataStr = `      taxAmount,
      requestedTime,
      loyaltyDiscount,
      userId: userId || useAuthStore.getState().user?.id || null,`;

code = code.replace(orderDataStr, newOrderDataStr);

// 5. Update cancelOrder to restore points
const cancelOrderStr = `  cancelOrder: async (orderId) => {
    await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled', updatedAt: Timestamp.now() });
  },`;

const newCancelOrderStr = `  cancelOrder: async (orderId) => {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        if (orderData.loyaltyDiscount && orderData.loyaltyDiscount > 0 && orderData.userId) {
          const userDoc = await getDoc(doc(db, 'users', orderData.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentPoints = userData.loyaltyPoints || 0;
            // Restore 10 points
            await updateDoc(doc(db, 'users', orderData.userId), { 
              loyaltyPoints: currentPoints + 10 
            });
          }
        }
      }
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled', updatedAt: Timestamp.now() });
    } catch (err) {
      console.error('Error cancelling order:', err);
    }
  },`;

code = code.replace(cancelOrderStr, newCancelOrderStr);

fs.writeFileSync(file, code);
