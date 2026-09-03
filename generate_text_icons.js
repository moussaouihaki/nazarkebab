const fs = require('fs');
const { createCanvas, registerFont } = require('canvas');

// Register fonts
try {
  registerFont('./node_modules/@expo-google-fonts/bebas-neue/400Regular/BebasNeue_400Regular.ttf', { family: 'BebasNeue' });
  registerFont('./node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf', { family: 'InterBold' });
} catch (e) {}

function generateAppIcon(width, height, outputFilePath) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background: Deep Dark Luxury Slate
    ctx.fillStyle = '#0B132B';
    ctx.fillRect(0, 0, width, height);

    // Subtle emerald radial glow
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width * 0.7);
    gradient.addColorStop(0, '#1C2541');
    gradient.addColorStop(0.8, '#0B132B');
    gradient.addColorStop(1, '#050814');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // POKÉ (White)
    const fontSizePoke = width * 0.32;
    ctx.font = `${fontSizePoke}px "BebasNeue", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
    ctx.fillText('POKÉ', width / 2, height / 2 - (fontSizePoke * 0.22));

    // MOONS (Emerald Green #10B981)
    const fontSizeMoons = width * 0.11;
    ctx.font = `bold ${fontSizeMoons}px "InterBold", sans-serif`;
    ctx.fillStyle = '#10B981';
    ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fillText('M O O N S', width / 2, height / 2 + (fontSizePoke * 0.38));

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputFilePath, buffer);
    console.log(`Generated icon: ${outputFilePath}`);
}

function generateSplashIcon(width, height, outputFilePath) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Clean transparent for seamless #0B132B background
    ctx.clearRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // POKÉ (White)
    const fontSizePoke = width * 0.24;
    ctx.font = `${fontSizePoke}px "BebasNeue", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('POKÉ', width / 2, height / 2 - (fontSizePoke * 0.25));

    // MOONS (Vibrant Emerald)
    const fontSizeMoons = width * 0.085;
    ctx.font = `bold ${fontSizeMoons}px "InterBold", sans-serif`;
    ctx.fillStyle = '#10B981';
    ctx.fillText('M O O N S', width / 2, height / 2 + (fontSizePoke * 0.35));

    // Subtitle
    const fontSizeSub = width * 0.030;
    ctx.font = `bold ${fontSizeSub}px "InterBold", sans-serif`;
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('POKÉ BOWLS • LA CHAUX-DE-FONDS', width / 2, height / 2 + (fontSizePoke * 0.70));

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputFilePath, buffer);
    console.log(`Generated splash: ${outputFilePath}`);
}

try {
    generateAppIcon(1024, 1024, './assets/icon.png');
    generateAppIcon(1024, 1024, './assets/adaptive-icon.png');
    generateAppIcon(1024, 1024, './assets/android-icon-foreground.png');
    generateAppIcon(512, 512, './assets/favicon.png');
    generateAppIcon(512, 512, './assets/images/favicon.png');
    generateAppIcon(512, 512, './assets/images/logo.png');

    generateSplashIcon(1280, 1280, './assets/splash-icon.png');
    generateSplashIcon(1280, 1280, './assets/images/splash-icon.png');
    console.log("All Pokémoons icons and splash screens successfully generated!");
} catch(e) {
    console.error("Error generating icons:", e);
}
