const fs = require('fs');
const path = require('path');
const { renderAsync } = require('@resvg/resvg-js');

/**
 * Generate iOS App Icon set from SVG source.
 * iOS requires specific sizes for different contexts.
 */
async function generateIOSIcons() {
  const svgPath = path.join(__dirname, '../public/assets/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // iOS icon sizes required by Xcode
  const sizes = [
    { size: 20, scales: [1, 2, 3] },
    { size: 29, scales: [1, 2, 3] },
    { size: 40, scales: [1, 2, 3] },
    { size: 60, scales: [2, 3] },
    { size: 76, scales: [1, 2] },
    { size: 83.5, scales: [2] },
    { size: 1024, scales: [1] }  // App Store
  ];

  const outDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');
  
  // Create output directory if it exists (it will after cap add ios)
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const images = [];

  for (const { size, scales } of sizes) {
    for (const scale of scales) {
      const px = Math.round(size * scale);
      const filename = `icon-${size}@${scale}x.png`;
      
      console.log(`  Rendering ${filename} (${px}x${px}px)...`);
      const result = await renderAsync(svgBuffer, { fitTo: { mode: 'width', value: px } });
      fs.writeFileSync(path.join(outDir, filename), result.asPng());

      images.push({
        size: `${size}x${size}`,
        idiom: size === 76 || size === 83.5 ? 'ipad' : (size === 1024 ? 'ios-marketing' : 'iphone'),
        filename,
        scale: `${scale}x`
      });
    }
  }

  // Write Contents.json for Xcode
  const contents = {
    images,
    info: { version: 1, author: 'xcode' }
  };

  fs.writeFileSync(path.join(outDir, 'Contents.json'), JSON.stringify(contents, null, 2));
  console.log('✅ iOS App Icon set generated!');
}

generateIOSIcons().catch(console.error);
