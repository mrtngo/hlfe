/**
 * PWA Icon Generator for Rayo
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

// SVG template for the Rayo lightning bolt icon
function createIconSVG(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.1 : size * 0.15;
  const innerSize = size - (padding * 2);
  const scale = innerSize / 100;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="${size * 0.02}" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="${size}" height="${size}" fill="#000000" rx="${isMaskable ? 0 : size * 0.2}"/>

      <!-- Lightning bolt -->
      <g transform="translate(${padding}, ${padding}) scale(${scale})">
        <path
          d="M55 10L25 52H45L38 90L75 42H52L55 10Z"
          stroke="#FACC15"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
          filter="url(#glow)"
        />
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
