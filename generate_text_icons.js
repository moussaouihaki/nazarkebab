const fs = require('fs');
const { createCanvas, registerFont } = require('canvas');

// Register fonts
registerFont('./node_modules/@expo-google-fonts/bebas-neue/400Regular/BebasNeue_400Regular.ttf', { family: 'BebasNeue' });
registerFont('./node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf', { family: 'InterBold' });

function generateIcon(width, height, outputFilePath) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background (Dark Theme)
    ctx.fillStyle = '#040404'; // Deep Black
    ctx.fillRect(0, 0, width, height);

    // Inner glow / subtle surface
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/1.5);
    gradient.addColorStop(0, '#1A1A1A');
    gradient.addColorStop(1, '#040404');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // NAZAR (White)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Scale font based on width
    const fontSizeNazar = width * 0.35; // 35% of width
    ctx.font = `${fontSizeNazar}px "BebasNeue"`;
    ctx.fillStyle = '#F5F5F5';
    // Add subtle text shadow
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    
    // Draw NAZAR slightly above center
    ctx.fillText('NAZAR', width / 2, height / 2 - (fontSizeNazar * 0.15));

    // KEBAB (Red/Primary)
    const fontSizeKebab = width * 0.10;
    ctx.font = `${fontSizeKebab}px "InterBold"`;
    ctx.fillStyle = '#FF2A2A'; // Theme.colors.success/primary
    ctx.letterSpacing = '10px'; // canvas doesn't support letterSpacing directly, we'll draw text normally but add space
    
    // Draw KEBAB below NAZAR
    const kebabY = height / 2 + (fontSizeNazar * 0.45);
    
    // Simulate letter spacing
    const text = 'K E B A B'; // Trick for spacing
    ctx.fillText(text, width / 2, kebabY);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputFilePath, buffer);
    console.log(`Generated ${outputFilePath}`);
}

try {
    generateIcon(1024, 1024, './assets/icon.png');
    generateIcon(1024, 1024, './assets/adaptive-icon.png');
    generateIcon(1280, 1280, './assets/splash-icon.png');
    console.log("All text-based icons generated successfully!");
} catch(e) {
    console.error("Error generating icons:", e);
}
