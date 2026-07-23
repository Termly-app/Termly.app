const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const dataDir = path.join(srcDir, 'data');

const storeFiles = [
  'coreStore.js',
  'financeStore.js',
  'studentStore.js',
  'academicsStore.js',
  'staffStore.js',
  'authStore.js',
  'libraryStore.js',
  'smsStore.js',
  'offlineStore.js',
  'seedData.js'
];

const exportMap = {};

// 1. Build the export map
storeFiles.forEach(file => {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all exported functions and variables
  const exportRegex = /export\s+(?:async\s+)?(?:function|const|let|var)\s+([a-zA-Z0-9_]+)/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    const name = match[1];
    exportMap[name] = file.replace('.js', '');
  }
});

// Also manually add some explicit exports from offlineStore if not caught
exportMap['db'] = 'offlineStore';
exportMap['queueChange'] = 'offlineStore';
exportMap['getPendingSync'] = 'offlineStore';
exportMap['getPendingSyncCount'] = 'offlineStore';
exportMap['getFailedSyncCount'] = 'offlineStore';
exportMap['updateSyncStatus'] = 'offlineStore';
exportMap['syncTypes'] = 'offlineStore';
exportMap['supabase'] = '../lib/supabase'; // Note this special case
exportMap['initStore'] = 'coreStore';
exportMap['sendSchoolInvite'] = 'coreStore';
exportMap['getSchemaStatus'] = 'coreStore';
exportMap['runSchemaMigration'] = 'coreStore';

// SeedData exports
const seedExports = ['students', 'seedUsers', 'seedTeachers', 'CBC_STRUCTURE', 'ALL_GRADES', 'CLASSES', 'CBC_LEVELS', 'JSS_RUBRIC_8', 'PRIMARY_RUBRIC_4', 'CBC_CORE_COMPETENCIES', 'TERM_FEE', 'STREAMS', 'getLevelForGrade', 'getSubjectsForGrade', 'generateMarks', 'generateFees', 'generateAttendance', 'generateCBC', 'generateCoreCompetencies', 'generateSubjectAssignments'];
seedExports.forEach(s => exportMap[s] = 'seedData');

console.log(`Found ${Object.keys(exportMap).length} exports across domain stores.`);

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      if (fullPath === path.join(dataDir, 'store.js')) return; // skip the facade itself
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      // Match imports like: import { X, Y } from '../data/store';
      const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
      const replacements = [];
      
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const importList = match[1];
        const modulePath = match[2];
        
        // Check if it's importing from store.js
        if (modulePath.endsWith('store') || modulePath.endsWith('store.js') || modulePath.endsWith('data/store')) {
          if (modulePath.includes('coreStore') || modulePath.includes('authStore')) continue; // already specific
          if (!modulePath.includes('store')) continue;
          
          const names = importList.split(',').map(s => s.trim()).filter(s => s);
          const groupedImports = {};
          let missingImports = [];
          
          names.forEach(name => {
            // handle aliasing e.g., "func as newFunc"
            let actualName = name;
            let alias = null;
            if (name.includes(' as ')) {
              [actualName, alias] = name.split(' as ').map(s => s.trim());
            }
            
            const sourceModule = exportMap[actualName];
            if (sourceModule) {
              if (!groupedImports[sourceModule]) groupedImports[sourceModule] = [];
              groupedImports[sourceModule].push(name);
            } else {
              missingImports.push(name);
            }
          });
          
          let newImportStatements = [];
          
          // Determine relative path based on the current file path
          // If the old import was '../data/store', new is '../data/coreStore'
          const baseImportPath = modulePath.replace(/\/store(\.js)?$/, '');
          
          for (const [mod, imports] of Object.entries(groupedImports)) {
            // If the module is '../lib/supabase', we need to adjust relative path carefully
            let newPath = '';
            if (mod === '../lib/supabase') {
               // Let's resolve relative to current file
               const dirOfFile = path.dirname(fullPath);
               const absLibPath = path.join(srcDir, 'lib', 'supabase');
               let relPath = path.relative(dirOfFile, absLibPath).replace(/\\/g, '/');
               if (!relPath.startsWith('.')) relPath = './' + relPath;
               newPath = relPath;
            } else {
               newPath = `${baseImportPath}/${mod}`;
            }
            
            newImportStatements.push(`import { ${imports.join(', ')} } from '${newPath}';`);
          }
          
          if (missingImports.length > 0) {
            console.warn(`[WARNING] In ${file}: Couldn't find source for exports: ${missingImports.join(', ')}`);
            // Put them back as they were, pointing to the store (or error)
            newImportStatements.push(`import { ${missingImports.join(', ')} } from '${modulePath}';`);
          }
          
          replacements.push({
            old: fullMatch,
            new: newImportStatements.join('\n')
          });
        }
      }
      
      replacements.forEach(rep => {
        content = content.replace(rep.old, rep.new);
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated imports in ${fullPath.replace(srcDir, '')}`);
      }
    }
  });
}

processDirectory(srcDir);
console.log('Done.');
