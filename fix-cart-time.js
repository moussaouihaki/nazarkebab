const fs = require('fs');
const file = 'app/cart.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "placeOrder(user?.id, selectedTime);",
  `
    let finalRequestedTime = selectedTime;
    if (selectedDate && selectedDate.toDateString() !== new Date().toDateString()) {
       const dateStr = selectedDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
       finalRequestedTime = \`\${dateStr} à \${selectedTime}\`;
    }
    placeOrder(user?.id, finalRequestedTime);
  `
);

fs.writeFileSync(file, code);
