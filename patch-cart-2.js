const fs = require('fs');
const file = 'app/cart.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "placeOrder(user?.id, finalRequestedTime);",
  "placeOrder(user?.id, finalRequestedTime, loyaltyDiscount);"
);

fs.writeFileSync(file, code);
