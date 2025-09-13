// Create separated MFM files with corrected naming structure
// This script takes the existing JSON and creates the separated files with proper naming

const fs = require('fs');
const path = require('path');

function createSeparatedFiles() {
    try {
        console.log('Creating separated MFM files with corrected naming...');
        
        // Read the existing JSON files
        const mfm32Json = JSON.parse(fs.readFileSync('mfm-3_2-Aug25.json', 'utf8'));
        const mfm33Json = JSON.parse(fs.readFileSync('mfm-3_3-Sep25.json', 'utf8'));
        
        // Process each version
        processVersion(mfm32Json, '3.2', 'Aug25');
        processVersion(mfm33Json, '3.3', 'Sep25');
        
        console.log('✅ Successfully created separated files with corrected naming!');
        
    } catch (error) {
        console.error('❌ Error creating separated files:', error.message);
        throw error;
    }
}

function processVersion(mfmData, version, date) {
    console.log(`Processing MFM ${version}...`);
    
    // Create units data
    const unitsData = {
        metadata: {
            version: version,
            date: date,
            totalUnits: mfmData.metadata.totalUnits,
            factionCount: mfmData.metadata.factionCount,
            type: "units"
        },
        factions: {}
    };
    
    // Create detachments data with corrected naming
    const detachmentsData = {
        metadata: {
            version: version,
            date: date,
            totalEnhancements: mfmData.metadata.totalEnhancements,
            factionCount: mfmData.metadata.factionCount,
            type: "detachments"
        },
        factions: {}
    };
    
    // Process each faction
    Object.keys(mfmData.factions).forEach(factionKey => {
        const faction = mfmData.factions[factionKey];
        
        // Units data (unchanged)
        unitsData.factions[factionKey] = {
            name: faction.name,
            unitCount: faction.unitCount,
            totalPoints: faction.totalPoints,
            forgeWorldUnits: faction.forgeWorldUnits,
            units: faction.units
        };
        
        // Detachments data with corrected naming
        detachmentsData.factions[factionKey] = {
            name: faction.name,
            detachmentCount: 0, // Will be calculated
            detachments: {} // Changed from "enhancements" to "detachments"
        };
        
        // Process enhancements and group them by detachment
        if (faction.enhancements) {
            const detachmentGroups = {};
            
            // Group enhancements by detachment name
            Object.keys(faction.enhancements).forEach(enhancementKey => {
                const enhancement = faction.enhancements[enhancementKey];
                
                if (!detachmentGroups[enhancementKey]) {
                    detachmentGroups[enhancementKey] = {
                        name: enhancementKey,
                        enhancements: []
                    };
                }
                
                detachmentGroups[enhancementKey].enhancements = enhancement.enhancements;
            });
            
            detachmentsData.factions[factionKey].detachments = detachmentGroups;
            detachmentsData.factions[factionKey].detachmentCount = Object.keys(detachmentGroups).length;
        }
    });
    
    // Create JavaScript files
    const versionKey = version.replace('.', '_');
    
    // Units file
    const unitsJsFile = `mfm-units-${versionKey}.js`;
    const unitsJsContent = `// MFM ${version} Units Data - Generated with corrected structure
// Generated on ${new Date().toISOString()}

window.MFM_UNITS_${versionKey} = ${JSON.stringify(unitsData, null, 2)};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MFM_UNITS_${versionKey};
}`;
    fs.writeFileSync(unitsJsFile, unitsJsContent, 'utf8');
    console.log(`✅ Created units file: ${unitsJsFile} (${(fs.statSync(unitsJsFile).size / 1024).toFixed(2)} KB)`);
    
    // Detachments file
    const detachmentsJsFile = `mfm-detachments-${versionKey}.js`;
    const detachmentsJsContent = `// MFM ${version} Detachments Data - Generated with corrected structure
// Generated on ${new Date().toISOString()}

window.MFM_DETACHMENTS_${versionKey} = ${JSON.stringify(detachmentsData, null, 2)};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MFM_DETACHMENTS_${versionKey};
}`;
    fs.writeFileSync(detachmentsJsFile, detachmentsJsContent, 'utf8');
    console.log(`✅ Created detachments file: ${detachmentsJsFile} (${(fs.statSync(detachmentsJsFile).size / 1024).toFixed(2)} KB)`);
}

// Run the script
createSeparatedFiles();
