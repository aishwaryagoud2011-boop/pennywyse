import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'dist');

const frontendEntries = [
  'index.html',
  'css',
  'js',
  'manifest.webmanifest',
  'sw.js',
  'icon.svg',
  'apple-touch-icon.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-maskable-512x512.png',
  'favicon.ico',
];

if (!fs.existsSync(path.join(rootDir, 'index.html'))) {
  console.error('Error: index.html not found in project root.');
  process.exit(1);
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const entry of frontendEntries) {
  const src = path.join(rootDir, entry);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(distDir, entry), { recursive: true });
  }
}

const assetsSrc = path.join(rootDir, 'public', 'assets');
if (fs.existsSync(assetsSrc)) {
  fs.cpSync(assetsSrc, path.join(distDir, 'assets'), { recursive: true });
}

console.log('Built plain HTML/CSS/JS webapp into dist/');
