const fs = require('fs');

const storeFiles = {
  'academicsStore': 'src/data/academicsStore.js',
  'coreStore': 'src/data/coreStore.js',
  'staffStore': 'src/data/staffStore.js',
  'financeStore': 'src/data/financeStore.js',
  'studentStore': 'src/data/studentStore.js',
  'store': 'src/data/store.js',
};

// Get exports from each store file
const storeExports = {};
for (const [name, path] of Object.entries(storeFiles)) {
  try {
    const src = fs.readFileSync(path, 'utf8');
    const fns = new Set();
    // Match: export function, export async function, export var, export const, export { X } from
    for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) fns.add(m[1]);
    for (const m of src.matchAll(/export\s+(?:var|const|let)\s+(\w+)/g)) fns.add(m[1]);
    for (const m of src.matchAll(/export\s+\{([^}]+)\}/g)) {
      for (const n of m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim())) {
        if (n) fns.add(n);
      }
    }
    storeExports[name] = fns;
  } catch (e) { storeExports[name] = new Set(); }
}

// Find all files that import from any store
const allFiles = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + f.name;
    if (f.isDirectory() && !f.name.includes('node_modules') && !f.name.includes('.git')) walk(p);
    else if (f.name.endsWith('.jsx') || f.name.endsWith('.js')) allFiles.push(p);
  }
}
walk('src');

let hasErrors = false;
for (const f of allFiles) {
  const c = fs.readFileSync(f, 'utf8');
  for (const line of c.split('\n')) {
    if (!line.includes('import')) continue;
    for (const [storeName, storePath] of Object.entries(storeFiles)) {
      if (f === storePath) continue; // skip self-imports
      if (!line.includes(storeName)) continue;
      const names = line.match(/\{([^}]+)\}/);
      if (!names) continue;
      for (const n of names[1].split(',').map(s => s.trim())) {
        if (n && !storeExports[storeName].has(n)) {
          console.log('MISSING: ' + f + ' imports "' + n + '" from ' + storeName);
          hasErrors = true;
        }
      }
    }
  }
}
if (!hasErrors) console.log('All imports OK!');
