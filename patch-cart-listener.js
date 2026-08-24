const fs = require('fs');
let code = fs.readFileSync('store/useCartStore.ts', 'utf8');

const badQuery = `    } else if (specificOrderId) {
      q = query(collection(db, 'orders'), where('__name__', '==', specificOrderId));
    } else { return () => {}; }

    let isFirstLoad = true;

    return onSnapshot(q, (snapshot) => {`;

const goodQuery = `    } else if (specificOrderId) {
      // Use doc() directly to bypass "list" permission issues for guests
      return onSnapshot(doc(db, 'orders', specificOrderId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const orderId = docSnap.id;
          
          set({ activeOrder: { ...data, id: orderId } as Order });
          
          const currentOrders = get().orders;
          const exists = currentOrders.some(o => o.id === orderId);
          if (!exists) {
            set({ orders: [ { ...data, id: orderId } as Order, ...currentOrders ] });
          } else {
            set({ orders: currentOrders.map(o => o.id === orderId ? { ...data, id: orderId } as Order : o) });
          }
        }
      });
    } else { return () => {}; }

    let isFirstLoad = true;

    return onSnapshot(q, (snapshot) => {`;

code = code.replace(badQuery, goodQuery);
fs.writeFileSync('store/useCartStore.ts', code);
