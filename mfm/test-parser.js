console.log('Test script is running...');
console.log('Arguments:', process.argv);

const fs = require('fs');
const path = require('path');

console.log('Current directory:', __dirname);
console.log('Files in directory:', fs.readdirSync(__dirname));

if (process.argv.length < 3) {
    console.log('Usage: node test-parser.js <file>');
    process.exit(1);
}

const filename = process.argv[2];
console.log('Looking for file:', filename);

if (fs.existsSync(filename)) {
    console.log('File exists!');
    const content = fs.readFileSync(filename, 'utf8');
    console.log('File size:', content.length, 'characters');
    console.log('First 100 characters:', content.substring(0, 100));
} else {
    console.log('File does not exist!');
}
