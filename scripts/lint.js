import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const jsFiles = [
  path.join(root, 'server.js'),
  path.join(root, 'build.js'),
  path.join(root, 'scripts', 'lint.js'),
  path.join(root, 'sw.js'),
];

function collectJs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJs(full);
    else if (entry.name.endsWith('.js')) jsFiles.push(full);
  }
}

collectJs(path.join(root, 'js'));

for (const file of jsFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing required JS file: ${file}`);
    process.exit(1);
  }
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

const requiredStatic = [
  'index.html',
  'css/styles.css',
  'manifest.webmanifest',
];
for (const rel of requiredStatic) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`Missing required static file: ${rel}`);
    process.exit(1);
  }
}

JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf-8'));

// Verify ordered <script defer src="./js/..."> scripts load and render cleanly without modules (supports file://)
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
const scriptMatches = [...indexHtml.matchAll(/<script\s+defer\s+src="([^"]+)"/g)].map((m) => m[1]);
if (scriptMatches.length === 0) {
  console.error('Expected classic defer scripts in index.html');
  process.exit(1);
}

const makeEl = () => ({
  innerHTML: '',
  textContent: '',
  value: '',
  style: {},
  dataset: {},
  classList: { toggle: () => {}, add: () => {}, remove: () => {} },
  addEventListener: () => {},
  querySelector: () => makeEl(),
  querySelectorAll: () => [],
});

const storage = new Map();
const sandbox = {
  console,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  Map,
  Set,
  JSON,
  Error,
  Promise,
  Blob,
  URL,
  setTimeout,
  clearTimeout,
  navigator: { userAgent: 'node', onLine: true },
  location: { protocol: 'file:' },
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  },
  document: {
    getElementById: () => makeEl(),
    createElement: () => makeEl(),
  },
  scrollTo: () => {},
  addEventListener: () => {},
};
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);
for (const relSrc of scriptMatches) {
  const full = path.resolve(root, relSrc);
  const code = fs.readFileSync(full, 'utf-8');
  vm.runInContext(code, ctx, { filename: relSrc });
}

console.log(`Lint passed: verified ${jsFiles.length} JavaScript files and ${scriptMatches.length} ordered browser scripts.`);
