const fs = require('fs');
let code = fs.readFileSync('store/useAuthStore.ts', 'utf8');

// Add import
if (!code.includes("import { useCartStore }")) {
  code = code.replace(
    "import { useNotificationStore } from './useNotificationStore';",
    "import { useNotificationStore } from './useNotificationStore';\nimport { useCartStore } from './useCartStore';"
  );
}

// Add to logout
code = code.replace(
  "useNotificationStore.getState().clearAll();",
  "useNotificationStore.getState().clearAll();\n      useCartStore.getState().clearCart();"
);

// Add to deleteAccount
code = code.replace(
  "useNotificationStore.getState().addNotification('Succès', 'Votre compte a été supprimé');",
  "useNotificationStore.getState().addNotification('Succès', 'Votre compte a été supprimé');\n      useCartStore.getState().clearCart();"
);

fs.writeFileSync('store/useAuthStore.ts', code);
