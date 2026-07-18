const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../prisma/migrations/20260718023018_add_order_invoice_fields/migration.sql');
const buf = fs.readFileSync(filePath);

console.log('File size:', buf.length);
console.log('First 10 bytes:', buf.subarray(0, 10));

let isUtf16Le = false;
if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
  isUtf16Le = true;
  console.log('UTF-16LE BOM detected!');
}

let str = '';
if (isUtf16Le) {
  str = buf.toString('utf16le');
} else {
  str = buf.toString('utf8');
  // Check for null bytes which might indicate utf16 without BOM
  if (str.includes('\u0000')) {
    console.log('Null bytes detected, assuming UTF-16LE without BOM');
    str = buf.toString('utf16le');
  }
}

console.log('Decoded content length:', str.length);
console.log('Decoded content prefix:', str.substring(0, 50));

// Rewrite as pure utf8 without BOM
const newStr = str.replace(/^\uFEFF/, '');
fs.writeFileSync(filePath, newStr, 'utf8');
console.log('Rewrote file as pure UTF-8');
