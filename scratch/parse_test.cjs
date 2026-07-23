const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');

const files = ['coreStore.js', 'academicsStore.js', 'financeStore.js', 'studentStore.js', 'authStore.js', 'staffStore.js', 'smsStore.js'];

files.forEach(f => {
  const file = path.join(__dirname, '../src/data', f);
  const content = fs.readFileSync(file, 'utf8');
  try {
    babel.parse(content, { sourceType: 'module', plugins: ['jsx'] });
    console.log(`[PASS] ${f}`);
  } catch (err) {
    console.error(`[FAIL] ${f}: ${err.message} at line ${err.loc?.line}:${err.loc?.column}`);
  }
});
