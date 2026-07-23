const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../src/data');
const storeContent = fs.readFileSync(path.join(dataDir, 'store.js'), 'utf8');

const domainFiles = [
  'coreStore.js',
  'financeStore.js',
  'studentStore.js',
  'academicsStore.js',
  'staffStore.js',
  'authStore.js',
  'libraryStore.js',
  'smsStore.js',
  'offlineStore.js'
];

const domainExports = {};
domainFiles.forEach(f => {
  const c = fs.readFileSync(path.join(dataDir, f), 'utf8');
  const matches = c.matchAll(/^export (?:async )?function ([A-Za-z0-9_]+)/gm);
  for (const m of matches) {
    domainExports[m[1]] = f;
  }
});

const storeExports = [];
const matches = storeContent.matchAll(/^export (?:async )?function ([A-Za-z0-9_]+)/gm);
for (const m of matches) {
  storeExports.push(m[1]);
}

console.log(`Total functions exported in store.js: ${storeExports.length}`);
console.log(`Total functions covered by domain files: ${Object.keys(domainExports).length}`);

const unmapped = storeExports.filter(fn => !domainExports[fn]);
console.log(`Functions in store.js NOT YET in any domain file (${unmapped.length}):`);
console.log(unmapped.join('\n'));
