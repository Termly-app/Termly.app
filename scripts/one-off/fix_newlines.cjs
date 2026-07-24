const fs = require('fs');
['academicsStore.js', 'staffStore.js', 'studentStore.js', 'financeStore.js'].forEach(file => {
  const path = 'src/data/' + file;
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(/\\n\\n/g, '\n\n'); // Replace literal \n\n with actual double newline
    fs.writeFileSync(path, content);
  }
});
console.log('Fixed literal newlines');
