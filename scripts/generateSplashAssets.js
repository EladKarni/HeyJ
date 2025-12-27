#!/usr/bin/env node

/**
 * Generate HeyJ Splash Screen Assets
 *
 * This script generates all splash screen assets for iOS and Android:
 * - Main splash screen (1284x2778) with logo and text
 * - Android splash logos in 5 densities (transparent background, logo only)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Brand colors
const ORANGE = '#fa7a3c';
const WHITE = '#ffffff';

// HeyJ logo SVG path from HeyJLogo.tsx
const LOGO_PATH = 'M136.062 75.761 C 131.833 76.832,128.060 79.126,124.326 82.894 L 120.851 86.400 118.726 86.407 C 104.854 86.452,93.752 98.905,98.786 108.772 C 101.731 114.545,92.836 117.734,89.517 112.095 C 87.542 108.739,87.877 104.842,90.457 101.165 C 92.343 98.476,92.294 98.100,90.157 98.863 C 80.738 102.228,79.955 114.820,88.714 122.064 C 91.545 124.405,90.234 125.573,84.600 125.725 C 72.244 126.060,68.058 135.787,75.444 147.000 C 78.660 151.883,78.552 155.500,75.127 157.588 C 69.531 161.000,64.081 154.450,66.236 146.900 C 66.641 145.481,65.475 145.781,63.984 147.480 C 58.743 153.448,60.581 163.443,67.570 166.985 C 71.047 168.747,71.079 169.471,67.791 172.007 C 54.391 182.345,60.260 203.961,76.775 205.093 C 81.949 205.448,83.038 207.080,79.264 208.825 C 74.363 211.092,72.922 211.928,71.122 213.546 C 64.248 219.727,65.963 230.894,74.138 233.183 C 78.043 234.276,79.408 233.077,77.840 229.929 C 75.483 225.200,77.561 220.360,82.976 217.968 C 91.699 214.115,100.088 220.759,91.764 224.929 C 89.311 226.157,87.394 228.238,86.824 230.289 C 85.531 234.946,90.060 240.360,95.274 240.391 C 98.907 240.413,99.930 242.176,97.500 244.225 C 94.437 246.808,90.354 247.174,86.607 245.204 C 83.331 243.480,81.884 244.807,82.654 248.827 C 84.464 258.273,95.069 261.763,103.799 255.786 C 108.536 252.543,109.236 253.644,107.115 261.000 C 104.491 270.102,97.469 278.207,88.100 282.950 C 84.979 284.530,85.097 285.750,88.618 288.302 C 112.799 305.828,147.255 315.016,177.667 312.047 C 188.918 310.948,190.223 309.649,183.590 306.151 C 166.153 296.957,162.488 276.744,175.851 263.466 C 181.944 257.411,189.469 256.061,204.000 258.417 C 224.498 261.740,230.927 257.793,227.603 243.925 C 226.287 238.438,226.755 234.264,229.079 230.752 C 230.464 228.659,230.178 228.276,226.335 227.070 C 220.332 225.188,212.538 219.458,212.865 217.166 C 213.018 216.092,217.634 214.588,227.000 212.561 C 234.406 210.958,234.994 210.290,233.398 205.293 C 231.365 198.926,232.175 196.769,236.978 195.762 C 246.128 193.844,247.294 188.923,240.390 181.365 C 234.420 174.829,234.000 173.363,234.431 160.600 C 234.679 153.235,233.591 152.002,226.840 151.998 C 220.194 151.993,218.962 151.098,218.581 145.992 C 217.696 134.142,214.197 125.732,206.632 117.267 C 204.056 114.385,204.011 113.812,206.199 111.724 C 210.629 107.496,219.219 110.574,220.216 116.747 C 220.812 120.434,221.376 120.689,223.652 118.300 C 230.694 110.907,228.280 97.033,218.685 89.762 C 212.807 85.308,203.841 82.824,196.011 83.480 L 193.168 83.719 189.284 81.064 C 179.968 74.696,169.105 73.325,158.535 77.182 C 155.532 78.278,153.469 78.146,149.200 76.583 C 145.579 75.258,139.538 74.880,136.062 75.761 M85.274 133.562 C 88.817 134.945,89.500 139.352,86.489 141.398 C 84.085 143.032,81.104 142.381,79.741 139.924 C 77.796 136.419,81.547 132.106,85.274 133.562 M297.517 146.795 C 291.370 148.648,291.193 153.903,297.062 160.264 C 321.050 186.268,321.280 225.486,297.589 250.200 C 292.172 255.851,291.447 258.153,293.897 261.931 C 297.565 267.589,303.450 266.014,312.949 256.831 C 342.804 227.968,340.598 176.690,308.396 150.997 C 303.366 146.984,300.528 145.888,297.517 146.795 M226.275 159.914 C 227.756 160.856,228.856 181.192,227.487 182.327 C 224.818 184.542,223.122 182.044,221.970 174.200 C 220.802 166.252,222.669 167.072,206.511 167.416 C 191.299 167.741,191.200 167.726,191.200 165.167 C 191.200 162.989,192.247 162.648,202.052 161.639 C 206.973 161.132,213.070 160.487,215.600 160.205 C 220.946 159.609,225.596 159.483,226.275 159.914 M276.808 167.501 C 272.826 169.501,272.367 174.188,275.779 178.012 C 289.326 193.195,289.523 216.920,276.230 232.400 C 270.368 239.226,275.534 247.911,283.146 244.028 C 296.233 237.351,305.148 213.482,301.265 195.518 C 297.596 178.549,284.555 163.609,276.808 167.501 M74.986 183.624 C 75.766 187.490,77.906 190.291,81.500 192.148 C 84.228 193.559,82.647 196.003,79.011 195.996 C 71.382 195.981,67.283 187.786,72.264 182.505 C 73.934 180.734,74.445 180.944,74.986 183.624 M257.696 185.198 C 254.192 187.335,253.861 190.726,256.817 194.217 C 262.780 201.259,262.742 211.215,256.727 217.447 C 254.086 220.184,254.263 223.509,257.160 225.572 C 265.580 231.567,277.145 213.453,273.838 199.450 C 271.483 189.479,262.983 181.974,257.696 185.198';

/**
 * Create an SVG with the HeyJ logo
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} backgroundColor - Background color (hex or 'transparent')
 * @param {string} logoColor - Logo fill color (hex)
 * @param {boolean} includeText - Whether to include "HeyJ" text
 * @param {number} logoSize - Size of the logo
 * @returns {string} SVG markup
 */
function createSVG(width, height, backgroundColor, logoColor, includeText = false, logoSize = 200) {
  const logoScale = logoSize / 400; // Original viewBox is 400x400
  const logoX = (width - logoSize) / 2;
  const textY = height / 2 + logoSize / 2 + 60;

  const bgRect = backgroundColor === 'transparent'
    ? ''
    : `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  const textElement = includeText
    ? `<text x="${width / 2}" y="${textY}" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="bold" fill="${logoColor}" text-anchor="middle">HeyJ</text>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${bgRect}
  <g transform="translate(${logoX}, ${(height - logoSize) / 2 - (includeText ? 40 : 0)}) scale(${logoScale})">
    <g id="svgg">
      <path
        d="${LOGO_PATH}"
        stroke="none"
        fill="${logoColor}"
        fill-rule="evenodd"
      />
    </g>
  </g>
  ${textElement}
</svg>`;
}

/**
 * Generate the main splash screen (1284x2778)
 */
async function generateMainSplash() {
  console.log('Generating main splash screen...');

  const svg = createSVG(1284, 2778, ORANGE, WHITE, true, 240);
  const outputPath = path.join(__dirname, '..', 'assets', 'splash.png');

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated: ${outputPath}`);
}

/**
 * Generate Android splash logos in multiple densities
 */
async function generateAndroidLogos() {
  console.log('Generating Android splash logos...');

  const densities = [
    { name: 'mdpi', size: 288 },
    { name: 'hdpi', size: 432 },
    { name: 'xhdpi', size: 576 },
    { name: 'xxhdpi', size: 864 },
    { name: 'xxxhdpi', size: 1152 }
  ];

  for (const density of densities) {
    const logoSize = density.size * 0.6; // 60% of canvas for padding
    const svg = createSVG(density.size, density.size, 'transparent', WHITE, false, logoSize);
    const outputPath = path.join(
      __dirname,
      '..',
      'android',
      'app',
      'src',
      'main',
      'res',
      `drawable-${density.name}`,
      'splashscreen_logo.png'
    );

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated: ${outputPath} (${density.size}x${density.size})`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🎨 HeyJ Splash Screen Asset Generator\n');

    await generateMainSplash();
    await generateAndroidLogos();

    console.log('\n✅ All splash screen assets generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Update app.json backgroundColor values');
    console.log('2. Update Android colors.xml');
    console.log('3. Update LoadingScreen component colors');
    console.log('4. Run: expo prebuild --clean (if using prebuild)');
  } catch (error) {
    console.error('❌ Error generating assets:', error);
    process.exit(1);
  }
}

main();
