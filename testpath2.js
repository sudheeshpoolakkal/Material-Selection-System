const fs = require('fs');
const path = require('path');

console.log('cwd:', process.cwd());
console.log('__dirname:', __dirname);

// The path that worked in debugpath.js Test 5
const testPath = 'C:\\\\material-selection-system\\\\materials.json';
console.log('testPath:', testPath);
console.log('existsSync:', fs.existsSync(testPath));

try {
  const data = fs.readFileSync(testPath, 'utf8');
  console.log('readFileSync OK, length:', data.length);
} catch(e) {
  console.log('readFileSync error:', e.message);
}