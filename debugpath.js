const path = require('path');
const fs = require('fs');

console.log('cwd:', process.cwd());
console.log('__dirname:', __dirname);

// Test various paths
const tests = [
  'materials.json',
  path.join(process.cwd(), 'materials.json'),
  '/c/material-selection-system/materials.json',
  '/C/material-selection-system/materials.json',
  'C:\\\\material-selection-system\\\\materials.json',
];

tests.forEach((p, i) => {
  try {
    const data = fs.readFileSync(p, 'utf8');
    console.log('Test ' + (i+1) + ' OK (' + p + '): length=' + data.length);
  } catch(e) {
    console.log('Test ' + (i+1) + ' FAIL (' + p + '): ' + e.message);
  }
});