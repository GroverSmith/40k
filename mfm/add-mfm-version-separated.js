// Script to add new MFM versions to the separated data system
// Usage: node add-mfm-version-separated.js <version> <date> <json-file>

const fs = require('fs');
const path = require('path');

function addMFMVersionSeparated(version, date, jsonFilePath) {
    try {
        console.log(`Adding MFM version ${version} (${date}) to separated system...`);
        
        // Validate inputs
        if (!version || !date || !jsonFilePath) {
            throw new Error('Usage: node add-mfm-version-separated.js <version> <date> <json-file>');
        }
        
        if (!fs.existsSync(jsonFilePath)) {
            throw new Error(`JSON file not found: ${jsonFilePath}`);
        }
        
        // Read and parse JSON
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const data = JSON.parse(jsonData);
        
        // Create units data structure
        const unitsData = {
            metadata: {
                version: data.metadata.version,
                date: data.metadata.date,
                totalUnits: data.metadata.totalUnits,
                factionCount: data.metadata.factionCount,
                type: "units"
            },
            factions: {}
        };
        
        // Create detachments data structure  
        const detachmentsData = {
            metadata: {
                version: data.metadata.version,
                date: data.metadata.date,
                totalEnhancements: data.metadata.totalEnhancements,
                factionCount: data.metadata.factionCount,
                type: "detachments"
            },
            factions: {}
        };
        
        // Separate the data
        Object.keys(data.factions).forEach(factionKey => {
            const faction = data.factions[factionKey];
            
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
        
        // Create JavaScript files
        const versionKey = version.replace('.', '_');
        
        // Units JS file
        const unitsJsFile = path.join(__dirname, `mfm-units-${versionKey}.js`);
        const unitsJsContent = `// MFM ${version} Units Data - Embedded for GitHub Pages
// Generated from ${path.basename(jsonFilePath)}

window.MFM_UNITS_${versionKey} = ${JSON.stringify(unitsData, null, 2)};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MFM_UNITS_${versionKey};
}`;
        fs.writeFileSync(unitsJsFile, unitsJsContent, 'utf8');
        console.log(`✅ Created units file: ${path.basename(unitsJsFile)}`);
        
        // Detachments JS file
        const detachmentsJsFile = path.join(__dirname, `mfm-detachments-${versionKey}.js`);
        const detachmentsJsContent = `// MFM ${version} Detachments Data - Embedded for GitHub Pages
// Generated from ${path.basename(jsonFilePath)}

window.MFM_DETACHMENTS_${versionKey} = ${JSON.stringify(detachmentsData, null, 2)};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MFM_DETACHMENTS_${versionKey};
}`;
        fs.writeFileSync(detachmentsJsFile, detachmentsJsContent, 'utf8');
        console.log(`✅ Created detachments file: ${path.basename(detachmentsJsFile)}`);
        
        // Update bundle files
        updateBundleFile('mfm-units-bundle.js', version, date, 'UNITS');
        updateBundleFile('mfm-detachments-bundle.js', version, date, 'DETACHMENTS');
        
        console.log(`🎉 Successfully added MFM version ${version} to separated system!`);
        console.log(`📝 Don't forget to commit the new files to your repository.`);
        
    } catch (error) {
        console.error(`❌ Error adding MFM version:`, error.message);
        process.exit(1);
    }
}

function updateBundleFile(bundleFileName, version, date, dataType) {
    const bundlePath = path.join(__dirname, bundleFileName);
    let bundleContent = fs.readFileSync(bundlePath, 'utf8');
    
    // Add version to the versions object
    const versionEntry = `        "${version}": {
            metadata: {
                version: "${version}",
                date: "${date}",
                displayName: "MFM ${version} (${date})"
            },
            data: null // Will be loaded from embedded data
        },`;
    
    // Find the insertion point (before the closing brace of versions object)
    const versionsEndIndex = bundleContent.lastIndexOf('    },');
    if (versionsEndIndex !== -1) {
        bundleContent = bundleContent.slice(0, versionsEndIndex) + 
                       versionEntry + '\n' + 
                       bundleContent.slice(versionsEndIndex);
        
        fs.writeFileSync(bundlePath, bundleContent, 'utf8');
        console.log(`✅ Updated ${bundleFileName}`);
    }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
    console.log('Usage: node add-mfm-version-separated.js <version> <date> <json-file>');
    console.log('Example: node add-mfm-version-separated.js 3.4 Oct25 mfm-3_4-Oct25.json');
    process.exit(1);
}

const [version, date, jsonFile] = args;
addMFMVersionSeparated(version, date, jsonFile);
