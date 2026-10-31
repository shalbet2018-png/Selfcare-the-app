// Finishes the GitHub Pages web build so it can be added to an iPhone or Android home screen:
// app icon, install manifest, and a 404 page that loads the app for links like /bookings.
// Usage: node scripts/pages-extras.js <web build folder> <base path, e.g. /Selfcare-the-app>
const fs = require('node:fs');
const path = require('node:path');

const [dir, rawBase = ''] = process.argv.slice(2);
if (!dir) throw new Error('Usage: node scripts/pages-extras.js <dir> <base>');
const base = rawBase.replace(/\/$/, '');

fs.copyFileSync(path.join(__dirname, '..', 'assets/images/icon.png'), path.join(dir, 'app-icon.png'));

const manifest = {
  name: 'Selfcare',
  short_name: 'Selfcare',
  description: 'Book hair, lashes, nails, spa and more. At the shop or at home.',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  background_color: '#F4EEF0',
  theme_color: '#F4EEF0',
  icons: [{ src: `${base}/app-icon.png`, sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
};
fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

const indexPath = path.join(dir, 'index.html');
const tags = [
  `<link rel="manifest" href="${base}/manifest.webmanifest">`,
  `<link rel="apple-touch-icon" href="${base}/app-icon.png">`,
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Selfcare">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
].join('\n    ');
const html = fs.readFileSync(indexPath, 'utf8').replace('</head>', `    ${tags}\n  </head>`);
fs.writeFileSync(indexPath, html);

// GitHub Pages serves 404.html for unknown paths; the app's router then shows the right screen.
fs.copyFileSync(indexPath, path.join(dir, '404.html'));
fs.writeFileSync(path.join(dir, '.nojekyll'), '');
console.log(`Pages extras added for base "${base || '/'}"`);
