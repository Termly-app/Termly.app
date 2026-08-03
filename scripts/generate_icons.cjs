const fs = require('fs');
const path = require('path');
const { renderAsync } = require('@resvg/resvg-js');

async function generate() {
  const svgPath = path.join(__dirname, '../public/assets/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Rendering 512x512 PNG...');
  const res512 = await renderAsync(svgBuffer, { fitTo: { mode: 'width', value: 512 } });
  fs.writeFileSync(path.join(__dirname, '../public/assets/pwa-512x512.png'), res512.asPng());
  fs.writeFileSync(path.join(__dirname, '../public/assets/pwa-maskable-512x512.png'), res512.asPng());
  fs.writeFileSync(path.join(__dirname, '../public/assets/apple-touch-icon.png'), res512.asPng());

  console.log('Rendering 192x192 PNG...');
  const res192 = await renderAsync(svgBuffer, { fitTo: { mode: 'width', value: 192 } });
  fs.writeFileSync(path.join(__dirname, '../public/assets/pwa-192x192.png'), res192.asPng());

  console.log('✅ Generated all 3D PNG display icons successfully!');
}

generate().catch(console.error);
