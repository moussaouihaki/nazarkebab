const Jimp = require('jimp');

async function processIcons() {
  try {
    const transparentLogo = await Jimp.read('/Users/hakim/.gemini/antigravity/scratch/nazar-kebab/assets/logo_transparent.png');
    
    // 1. App Icon (1024x1024, no transparency, #FDF7E5 cream background or #EBE0C5?) 
    // The original wood background was gray/brown. Let's use a nice cream/paper background for contrast, or dark?
    // Let's use #FDF9F1 (Very light cream) as background for the icon so the dark red pops out.
    const icon = await new Jimp(1024, 1024, '#F5EDE1');
    
    const scaleFactor = 800 / Math.max(transparentLogo.bitmap.width, transparentLogo.bitmap.height);
    const resizedLogo = transparentLogo.clone().scale(scaleFactor);
    
    // center it
    const x = (1024 - resizedLogo.bitmap.width) / 2;
    const y = (1024 - resizedLogo.bitmap.height) / 2;
    icon.composite(resizedLogo, x, y);
    await icon.writeAsync('/Users/hakim/.gemini/antigravity/scratch/nazar-kebab/assets/icon.png');
    
    // 2. Adaptive Icon (Android) - Same as above
    await icon.writeAsync('/Users/hakim/.gemini/antigravity/scratch/nazar-kebab/assets/adaptive-icon.png');
    
    // 3. Splash Screen (Transparent or solid)
    const splash = await new Jimp(1280, 1280, 0x00000000); // transparent splash, or matches App's background
    // wait app.json splash bg is #121212 (Dark). But the logo is dark red! Dark red on #121212 might not pop well?
    // I should change splash bg to #F5EDE1 in app.json and use transparent splash-icon.
    const splashLogo = resizedLogo.clone();
    splash.composite(splashLogo, (1280 - splashLogo.bitmap.width)/2, (1280 - splashLogo.bitmap.height)/2);
    await splash.writeAsync('/Users/hakim/.gemini/antigravity/scratch/nazar-kebab/assets/splash-icon.png');

    console.log("App Icons and Splash generated!");
  } catch (err) {
    console.error(err);
  }
}

processIcons();
