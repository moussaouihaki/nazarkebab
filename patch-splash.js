const fs = require('fs');
let code = fs.readFileSync('app/_layout.tsx', 'utf8');

const badSplash = `    if (loaded || error) {
      try {
        SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Splash hide error:', e);
      }
    }`;

const goodSplash = `    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }`;

code = code.replace(badSplash, goodSplash);

fs.writeFileSync('app/_layout.tsx', code);
