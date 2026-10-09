const fs = require('fs');
const path = require('path');

console.log('cwd:', process.cwd());
console.log('__dirname:', __dirname);

// Test 1: /C absolute path (WSL style)
try {
  const data = fs.readFileSync('/C/material-selection-system/materials.json', 'utf8');
  console.log('Test 1 - /C path OK, length:', data.length);
} catch(e) {
  console.log('Test 1 - /C path error:', e.message);
}

// Test 2: c/ path
try {
  const data = fs.readFileSync('/c/material-selection-system/materials.json', 'utf8');
  console.log('Test 2 - /c path OK, length:', data.length);
} catch(e) {
  console.log('Test 2 - /c path error:', e.message);
}

// Test 3: process.cwd() + relative
try {
  const data = fs.readFileSync(path.join(process.cwd(), 'materials.json'), 'utf8');
  console.log('Test 3 - cwd+relative OK, length:', data.length);
} catch(e) {
  console.log('Test 3 - cwd+relative error:', e.message);
}

// Test 4: __dirname relative
try {
  const data = fs.readFileSync(path.join(__dirname, 'materials.json'), 'utf8');
  console.log('Test 4 - __dirname+relative OK, length:', data.length);
} catch(e) {
  console.log('Test 4 - __dirname+relative error:', e.message);
}