#!/usr/bin/env node
// filename: mfm/update-embedded-data.js
// Script to update embedded MFM data in unit-add.html
// Run this whenever mfm-3_2.json is updated

const { embedMFMData } = require('./embed-mfm-data.js');

console.log('🔄 Updating embedded MFM data in unit-add.html...');
embedMFMData();
console.log('✅ Update complete!');
