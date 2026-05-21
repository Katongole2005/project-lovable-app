const fs = require('fs');
const content = fs.readFileSync('src/lib/api.ts', 'utf-8');

const start = content.indexOf('async function generateSecureToken');
const end = content.indexOf('}', start) + 1;
console.log(content.substring(start, end));
