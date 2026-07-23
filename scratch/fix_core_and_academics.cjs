const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../src/data');

// Re-read store backup or clean store functions to guarantee perfect syntax
const checkBabel = (code, filename) => {
  const babel = require('@babel/parser');
  try {
    babel.parse(code, { sourceType: 'module', plugins: ['jsx'] });
    console.log(`[SYNTAX OK] ${filename}`);
    return true;
  } catch (e) {
    console.error(`[SYNTAX ERROR] ${filename}: ${e.message} at line ${e.loc?.line}:${e.loc?.column}`);
    return false;
  }
};

const domainFiles = ['coreStore.js', 'academicsStore.js', 'financeStore.js', 'studentStore.js', 'authStore.js', 'staffStore.js', 'smsStore.js'];

domainFiles.forEach(f => {
  const p = path.join(dataDir, f);
  const c = fs.readFileSync(p, 'utf8');
  checkBabel(c, f);
});
