const Jimp = require('jimp');

async function processLogo() {
  const imagePath = '/Users/hakim/.gemini/antigravity/brain/9a8937cc-793c-4724-be1b-8cd6d3dfef14/media__1774127512813.png';
  const outputPath = '/Users/hakim/.gemini/antigravity/scratch/nazar-kebab/assets/logo_transparent.png';
  
  try {
    const img = await Jimp.read(imagePath);
    console.log(`Loaded image ${img.bitmap.width}x${img.bitmap.height}`);
    
    // Remove Gemini logo (bottom right, 80x80px should be enough)
    const geminiW = 100;
    const geminiH = 100;
    img.scan(img.bitmap.width - geminiW, img.bitmap.height - geminiH, geminiW, geminiH, function (x, y, idx) {
      this.bitmap.data[idx + 3] = 0; // Alpha = 0 (Transparent)
    });

    // We want to keep ONLY the dark red drawing.
    // The background is grayish/white.
    // Loop through all pixels. Since the dark red drawing is dark, we can use a brightness threshold.
    // However, some antialiasing might need soft alpha.
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
        // Red, green, blue values
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        const a = this.bitmap.data[idx + 3];

        if (a === 0) return; // already erased (Gemini star)

        // Calculate luminosity (perceived brightness)
        const luminance = 0.299*r + 0.587*g + 0.114*b;
        
        // The background is around 150-255 luminance
        // The logo (dark red) is around 30-100.
        // Let's do a smooth gradient alpha based on luminance to preserve anti-aliasing.
        const L_DARK = 90;   // below this, 100% opaque
        const L_LIGHT = 140; // above this, 100% transparent

        if (luminance > L_LIGHT) {
          this.bitmap.data[idx + 3] = 0;
        } else if (luminance < L_DARK) {
          // Keep it, but force the color to pure Nazar Red if it's too desaturated?
          // Actually, let's keep the original color.
          this.bitmap.data[idx + 3] = 255;
        } else {
          // Smooth transition (anti-aliasing)
          const ratio = (L_LIGHT - luminance) / (L_LIGHT - L_DARK);
          this.bitmap.data[idx + 3] = Math.max(0, Math.min(255, ratio * 255));
        }
    });

    // Let's explicitly crop out any empty transparent padding (autoCrop)
    img.autocrop();

    await img.writeAsync(outputPath);
    console.log('Saved transparent logo successfully!');
  } catch (error) {
    console.error('Error processing logo:', error);
  }
}

processLogo();
