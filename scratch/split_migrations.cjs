const fs = require('fs');
const path = require('path');

const srcFile = 'C:/Users/STD USER/.gemini/antigravity/brain/1051777c-3b72-48fb-8068-b31f31735204/supabase_all_migrations.sql';
const outDir = 'C:/Users/STD USER/.gemini/antigravity/brain/1051777c-3b72-48fb-8068-b31f31735204/migrations_split';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const content = fs.readFileSync(srcFile, 'utf8');

// The file is divided by:
// -- ============================================================
// -- 001_FOUNDATION.SQL
// -- ============================================================

const sections = content.split(/-- ={60,}/);

let fileIndex = 1;
let mdLinks = [];

for (let i = 1; i < sections.length; i += 2) { // The header content is usually between boundaries
  const headerContent = sections[i];
  const bodyContent = sections[i+1] || '';
  
  if (!headerContent || !headerContent.trim()) continue;

  const match = headerContent.match(/-- (\d{3}_[A-Z_]+)\.SQL/i) || headerContent.match(/-- (.*?)\.SQL/i);
  let fileName = match ? match[1].toLowerCase() + '.sql' : `part_${fileIndex}.sql`;
  
  // Format the file
  const fullContent = `-- ============================================================` + 
                      headerContent + 
                      `-- ============================================================` + 
                      bodyContent;
                      
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, fullContent.trim() + '\n');
  
  mdLinks.push(`- **[${fileName.replace('.sql', '').toUpperCase().replace(/_/g, ' ')}](file:///${outPath.replace(/\\/g, '/')})**`);
  fileIndex++;
}

console.log(mdLinks.join('\\n'));
