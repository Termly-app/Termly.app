const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');

const dataDir = path.join(__dirname, '../src/data');

// Function to fix and validate a store file
function cleanFile(fileName) {
  const filePath = path.join(dataDir, fileName);
  let code = fs.readFileSync(filePath, 'utf8');

  try {
    babel.parse(code, { sourceType: 'module', plugins: ['jsx'] });
    console.log(`[OK] ${fileName} syntax is already valid!`);
    return;
  } catch (err) {
    console.log(`[REPAIRING] ${fileName} failed at ${err.loc?.line}:${err.loc?.column} - ${err.message}`);
  }

  // Remove lines around broken token if needed
  const lines = code.split('\n');
  const errLineIdx = (babel.parse(code, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true }).errors[0]?.loc?.line || 0) - 1;

  if (errLineIdx > 0 && errLineIdx < lines.length) {
    console.log(`Error line ${errLineIdx + 1}: ${lines[errLineIdx]}`);
  }
}

cleanFile('coreStore.js');
cleanFile('academicsStore.js');
