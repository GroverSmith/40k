#!/usr/bin/env node
// filename: mfm/embed-mfm-data.js
// Script to embed MFM data into unit-add.html to avoid CORS issues

const fs = require('fs');
const path = require('path');

function embedMFMData() {
    try {
        // Read the MFM JSON data
        const mfmDataPath = path.join(__dirname, 'mfm-3_2.json');
        const mfmData = fs.readFileSync(mfmDataPath, 'utf8');
        
        // Read the unit-add.html file
        const unitAddPath = path.join(__dirname, '..', 'units', 'unit-add.html');
        const unitAddHtml = fs.readFileSync(unitAddPath, 'utf8');
        
        // Create the embedded script
        const embeddedScript = `
    <!-- Embedded MFM Data -->
    <script>
        window.EMBEDDED_MFM_DATA = ${mfmData};
    </script>`;
        
        // Insert the script before the closing </body> tag
        const updatedHtml = unitAddHtml.replace('</body>', `${embeddedScript}\n</body>`);
        
        // Write the updated HTML file
        fs.writeFileSync(unitAddPath, updatedHtml);
        
        console.log('✅ MFM data embedded successfully into unit-add.html');
        console.log('📁 Updated file:', unitAddPath);
        
    } catch (error) {
        console.error('❌ Error embedding MFM data:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    embedMFMData();
}

module.exports = { embedMFMData };
