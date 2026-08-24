const fs = require('fs');
let code = fs.readFileSync('components/GlobalBanners.tsx', 'utf8');
code = code.replace(/Theme.fonts.heading/g, 'Theme.fonts.title || "BebasNeue_400Regular"');
fs.writeFileSync('components/GlobalBanners.tsx', code);
