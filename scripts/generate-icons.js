/**
 * PWA Icon Generator for Delos
 * Draws the Delos sun mark (matches DelosSun in components/V2Kit.tsx) in
 * Apollonian gold on the Delos dark surface.
 * Run with: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

const GOLD = '#E3B34C';
const SURFACE = '#0A0C0E';

// Delos sun mark — mirrors DelosSun() in components/V2Kit.tsx (24x24 space:
// a filled core at r=4.6 plus 12 alternating-length rays).
function delosSunPaths() {
  let rays = '';
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    const long = k % 2 === 0;
    const r1 = 6.4;
    const r2 = long ? 11.2 : 9.2;
    rays += `<line x1="${(12 + Math.cos(a) * r1).toFixed(2)}" y1="${(12 + Math.sin(a) * r1).toFixed(2)}" x2="${(12 + Math.cos(a) * r2).toFixed(2)}" y2="${(12 + Math.sin(a) * r2).toFixed(2)}" stroke="${GOLD}" stroke-width="${long ? 1.9 : 1.4}" stroke-linecap="round"/>`;
  }
  return `<circle cx="12" cy="12" r="4.6" fill="${GOLD}"/>${rays}`;
}

// SVG template for the Delos sun icon
function createIconSVG(size, isMaskable = false) {
  // The sun's rays reach the edge of the 24-unit box, so leave a little more
  // breathing room than a solid glyph would need.
  const padding = isMaskable ? size * 0.18 : size * 0.2;
  const innerSize = size - padding * 2;
  const scale = innerSize / 24;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="${size * 0.015}" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="${size}" height="${size}" fill="${SURFACE}" rx="${isMaskable ? 0 : size * 0.2}"/>

      <!-- Delos sun -->
      <g transform="translate(${padding}, ${padding}) scale(${scale})" filter="url(#glow)">
        ${delosSunPaths()}
      </g>
    </svg>
  `;
}

// Icon sizes to generate
const sizes = [
  { size: 32, name: 'icon-32x32.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

const maskableSizes = [
  { size: 192, name: 'icon-maskable-192x192.png' },
  { size: 512, name: 'icon-maskable-512x512.png' },
];

async function generateIcons() {
  console.log('Generating PWA icons...\n');

  // Generate regular icons
  for (const { size, name } of sizes) {
    const svg = createIconSVG(size, false);
    const outputPath = path.join(ICONS_DIR, name);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✓ Created ${name}`);
  }

  // Generate maskable icons
  for (const { size, name } of maskableSizes) {
    const svg = createIconSVG(size, true);
    const outputPath = path.join(ICONS_DIR, name);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✓ Created ${name} (maskable)`);
  }

  // Create favicon.ico (just copy the 32x32)
  fs.copyFileSync(
    path.join(ICONS_DIR, 'icon-32x32.png'),
    path.join(__dirname, '../public/favicon.ico')
  );
  console.log(`✓ Created favicon.ico`);

  console.log('\n✅ All icons generated successfully!');
  console.log(`📁 Icons saved to: ${ICONS_DIR}`);
}

generateIcons().catch(console.error);
