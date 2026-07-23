const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../src/data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js') && f !== 'seedData.js');

const fnMap = {};

files.forEach(file => {
  const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
  const matches = content.matchAll(/^export (?:async )?function ([A-Za-z0-9_]+)/gm);
  for (const m of matches) {
    const fnName = m[1];
    if (!fnMap[fnName]) fnMap[fnName] = [];
    fnMap[fnName].push(file);
  }
});

console.log('=== DUPLICATE EXPORTED FUNCTIONS ACROSS STORE FILES ===');
let count = 0;
Object.keys(fnMap).sort().forEach(fn => {
  if (fnMap[fn].length > 1) {
    count++;
    console.log(`${count}. ${fn}: ${fnMap[fn].join(', ')}`);
  }
});
console.log(`Total duplicated functions: ${count}`);
