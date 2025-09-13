// Script to separate MFM data into units and detachments (enhancements)
// This will create separate files for better organization

const fs = require('fs');
const path = require('path');

function separateMFMData(inputFile, version) {
    try {
        console.log(`Separating MFM ${version} data from ${inputFile}...`);
        
        // Read the full MFM data
        const fullData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        
        // Create units data structure
        const unitsData = {
            metadata: {
                version: fullData.metadata.version,
                date: fullData.metadata.date,
                totalUnits: fullData.metadata.totalUnits,
                factionCount: fullData.metadata.factionCount,
                type: "units"
            },
            factions: {}
        };
        
        // Create detachments data structure  
        const detachmentsData = {
            metadata: {
                version: fullData.metadata.version,
                date: fullData.metadata.date,
                totalEnhancements: fullData.metadata.totalEnhancements,
                factionCount: fullData.metadata.factionCount,
                type: "detachments"
            },
            factions: {}
        };
        
        // Separate the data
        Object.keys(fullData.factions).forEach(factionKey => {
            const faction = fullData.factions[factionKey];
            
            // Units data
            unitsData.factions[factionKey] = {
                name: faction.name,
                unitCount: faction.unitCount,
                totalPoints: faction.totalPoints,
                forgeWorldUnits: faction.forgeWorldUnits,
                units: faction.units
            };
            
            // Detachments data (enhancements)
            detachmentsData.factions[factionKey] = {
                name: faction.name,
                detachmentCount: faction.detachmentCount || 0,
                enhancements: faction.enhancements || {}
            };
        });
        
        // Write units file
        const unitsFile = path.join(__dirname, `mfm-units-${version.replace('.', '_')}.json`);
        fs.writeFileSync(unitsFile, JSON.stringify(unitsData, null, 2), 'utf8');
        console.log(`✅ Created units file: ${path.basename(unitsFile)} (${(fs.statSync(unitsFile).size / 1024).toFixed(2)} KB)`);
        
        // Write detachments file
        const detachmentsFile = path.join(__dirname, `mfm-detachments-${version.replace('.', '_')}.json`);
        fs.writeFileSync(detachmentsFile, JSON.stringify(detachmentsData, null, 2), 'utf8');
        console.log(`✅ Created detachments file: ${path.basename(detachmentsFile)} (${(fs.statSync(detachmentsFile).size / 1024).toFixed(2)} KB)`);
        
        return { unitsFile, detachmentsFile };
        
    } catch (error) {
        console.error(`❌ Error separating MFM data:`, error.message);
        throw error;
    }
}

function convertToJavaScript(jsonFile, outputFile, dataType, version) {
    try {
        console.log(`Converting ${dataType} data to JavaScript...`);
        
        const jsonData = fs.readFileSync(jsonFile, 'utf8');
        const data = JSON.parse(jsonData);
        
        const jsContent = `// MFM ${version} ${dataType} Data - Embedded for GitHub Pages
// Generated from ${path.basename(jsonFile)}

window.MFM_${dataType.toUpperCase()}_${version.replace('.', '_')} = ${JSON.stringify(data, null, 2)};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MFM_${dataType.toUpperCase()}_${version.replace('.', '_')};
}`;

        fs.writeFileSync(outputFile, jsContent, 'utf8');
        console.log(`✅ Created ${dataType} JS file: ${path.basename(outputFile)} (${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB)`);
        
    } catch (error) {
        console.error(`❌ Error converting ${dataType} data:`, error.message);
        throw error;
    }
}

// Process all MFM versions
const versions = [
    { version: '3.2', inputFile: 'mfm-3_2-Aug25.json' },
    { version: '3.3', inputFile: 'mfm-3_3-Sep25.json' }
];

console.log('🔄 Separating MFM data into units and detachments...\n');

versions.forEach(({ version, inputFile }) => {
    const inputPath = path.join(__dirname, inputFile);
    
    if (fs.existsSync(inputPath)) {
        try {
            // Separate the data
            const { unitsFile, detachmentsFile } = separateMFMData(inputPath, version);
            
            // Convert to JavaScript
            const unitsJsFile = path.join(__dirname, `mfm-units-${version.replace('.', '_')}.js`);
            const detachmentsJsFile = path.join(__dirname, `mfm-detachments-${version.replace('.', '_')}.js`);
            
            convertToJavaScript(unitsFile, unitsJsFile, 'units', version);
            convertToJavaScript(detachmentsFile, detachmentsJsFile, 'detachments', version);
            
            console.log(`✅ Successfully processed MFM ${version}\n`);
            
        } catch (error) {
            console.error(`❌ Failed to process MFM ${version}:`, error.message);
        }
    } else {
        console.log(`⚠️  File not found: ${inputFile}`);
    }
});

console.log('🎉 MFM data separation complete!');
console.log('\n📁 Created files:');
console.log('   Units: mfm-units-3_2.js, mfm-units-3_3.js');
console.log('   Detachments: mfm-detachments-3_2.js, mfm-detachments-3_3.js');
console.log('\n📝 Next steps:');
console.log('1. Update unit modules to import units data');
console.log('2. Update force/army modules to import detachments data');
console.log('3. Remove old combined files from units directory');
