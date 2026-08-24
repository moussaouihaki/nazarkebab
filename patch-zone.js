const fs = require('fs');
const file = 'store/useDeliveryZoneStore.ts';
let code = fs.readFileSync(file, 'utf8');

// The auto-repair should only happen if the user is an admin, or we just remove it since it was a one-time fix.
// Let's just remove the auto-repair block completely.
code = code.replace(
  /        \/\/ AUTO-REPAIR: Si des zones Porrentruy[\s\S]*?Le snapshot se relancera automatiquement\n        \}/,
  ""
);
code = code.replace(
  /        \/\/ Si aucune zone du tout, injecter les défauts[\s\S]*?return;\n        \}/,
  ""
);

fs.writeFileSync(file, code);
