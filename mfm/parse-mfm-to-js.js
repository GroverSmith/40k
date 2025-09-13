// Direct MFM Parser - Goes from raw text to separated JavaScript files
// This replaces the JSON intermediate step and uses correct naming

const fs = require('fs');
const path = require('path');

class MFMParser {
    constructor() {
        this.reset();
    }

    reset() {
        this.units = [];
        this.detachments = [];
        this.currentFaction = null;
        this.currentDetachment = null;
        this.isForgeWorld = false;
        this.isDetachmentSection = false;
        this.currentUnitName = null;
        this.currentUnitVariants = [];
    }

    /**
     * Parse raw MFM text and create separated JavaScript files
     */
    async parseAndCreateFiles(rawTextFile, version, date) {
        try {
            console.log(`🔄 Parsing MFM ${version} from ${rawTextFile}...`);
            
            // Read the raw text file
            const content = fs.readFileSync(rawTextFile, 'utf8');
            console.log(`📖 Read ${content.length} characters from file`);
            
            // Parse the content
            const result = this.parse(content);
            console.log(`📊 Parsed ${result.units.length} units and ${result.detachments.length} enhancements`);
            
            // Create separated data structures
            const unitsData = this.createUnitsData(result, version, date);
            const detachmentsData = this.createDetachmentsData(result, version, date);
            
            // Create JavaScript files
            await this.createJavaScriptFiles(unitsData, detachmentsData, version);
            
            console.log(`✅ Successfully created separated files for MFM ${version}`);
            
        } catch (error) {
            console.error(`❌ Error parsing MFM ${version}:`, error.message);
            throw error;
        }
    }

    /**
     * Parse the raw text content
     */
    parse(content) {
        this.reset();
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            if (this.isFactionHeader(trimmedLine)) {
                this.handleFactionHeader(trimmedLine);
            } else if (this.isForgeWorldSection(trimmedLine)) {
                this.isForgeWorld = true;
            } else if (this.isDetachmentEnhancementsSection(trimmedLine)) {
                this.isDetachmentSection = true;
            } else if (this.isDetachmentName(trimmedLine) && this.isDetachmentSection) {
                this.currentDetachment = trimmedLine;
            } else if (this.isEnhancementLine(trimmedLine) && this.isDetachmentSection && this.currentDetachment) {
                this.parseEnhancement(trimmedLine);
            } else if (this.isUnitNameLine(line) && !this.isDetachmentSection) {
                this.parseUnitName(line);
            } else if (this.isUnitLine(trimmedLine) && !this.isDetachmentSection) {
                this.parseUnit(trimmedLine);
            }
        }

        // Save the last unit if it exists
        if (this.currentUnitName && this.currentUnitVariants.length > 0) {
            this.units.push({
                faction: this.currentFaction,
                unitName: this.currentUnitName,
                variants: [...this.currentUnitVariants],
                isForgeWorld: this.isForgeWorld
            });
        }

        return {
            units: this.units,
            detachments: this.detachments
        };
    }

    handleFactionHeader(line) {
        this.currentFaction = line.replace(/^(CODEX:|INDEX:)\s*/, '').trim();
        this.currentDetachment = null;
        this.isForgeWorld = false;
        this.isDetachmentSection = false;
    }

    isFactionHeader(line) {
        return line.startsWith('CODEX:') || line.startsWith('INDEX:');
    }

    isForgeWorldSection(line) {
        return line.includes('FORGE WORLD');
    }

    isDetachmentEnhancementsSection(line) {
        return line.includes('DETACHMENT ENHANCEMENTS');
    }

    isDetachmentName(line) {
        return this.isDetachmentSection && 
               line.length > 0 && 
               !line.includes('pts') && 
               !line.includes('DETACHMENT ENHANCEMENTS');
    }

    isEnhancementLine(line) {
        return this.isDetachmentSection && 
               line.includes('pts') && 
               line.includes('...');
    }

    isUnitNameLine(line) {
        return !this.isDetachmentSection && 
               line.length > 0 && 
               !line.includes('pts') && 
               !line.includes('models') &&
               !line.includes('CODEX:') &&
               !line.includes('INDEX:') &&
               !line.includes('FORGE WORLD') &&
               !line.includes('DETACHMENT ENHANCEMENTS') &&
               line.startsWith(' '); // Unit names start with a space
    }

    isUnitLine(line) {
        return !this.isDetachmentSection && 
               line.includes('pts') && 
               line.includes('models');
    }

    parseUnitName(line) {
        // Save any previous unit with its variants
        if (this.currentUnitName && this.currentUnitVariants.length > 0) {
            this.units.push({
                faction: this.currentFaction,
                unitName: this.currentUnitName,
                variants: [...this.currentUnitVariants],
                isForgeWorld: this.isForgeWorld
            });
        }
        
        // Start new unit
        this.currentUnitName = line.trim();
        this.currentUnitVariants = [];
    }

    parseUnit(line) {
        if (!this.currentFaction || !this.currentUnitName) return;

        // Extract model count and points
        const match = line.match(/(\d+)\s+models?\s*\.+\s*(\d+)\s+pts/);
        if (match) {
            const modelCount = parseInt(match[1]);
            const points = parseInt(match[2]);
            
            this.currentUnitVariants.push({
                modelCount: modelCount,
                points: points
            });
        }
    }

    parseEnhancement(line) {
        if (!this.currentFaction || !this.currentDetachment) return;

        // Extract enhancement name and points
        const match = line.match(/^(.+?)\s*\.+\s*(\d+)\s+pts$/);
        if (match) {
            const enhancementName = match[1].trim();
            const points = parseInt(match[2]);
            
            this.detachments.push({
                faction: this.currentFaction,
                detachmentName: this.currentDetachment,
                enhancementName: enhancementName,
                points: points
            });
        }
    }

    createUnitsData(result, version, date) {
        const factions = {};
        
        result.units.forEach(unit => {
            if (!factions[unit.faction]) {
                factions[unit.faction] = {
                    name: unit.faction,
                    unitCount: 0,
                    totalPoints: 0,
                    forgeWorldUnits: 0,
                    units: {}
                };
            }
            
            const faction = factions[unit.faction];
            faction.units[unit.unitName] = {
                name: unit.unitName,
                variants: unit.variants
            };
            
            faction.unitCount++;
            const unitTotalPoints = unit.variants.reduce((sum, variant) => sum + variant.points, 0);
            faction.totalPoints += unitTotalPoints;
            if (unit.isForgeWorld) {
                faction.forgeWorldUnits++;
            }
        });
        
        return {
            metadata: {
                version: version,
                date: date,
                totalUnits: result.units.length,
                factionCount: Object.keys(factions).length,
                type: "units"
            },
            factions: factions
        };
    }

    createDetachmentsData(result, version, date) {
        const factions = {};
        
        result.detachments.forEach(detachment => {
            if (!factions[detachment.faction]) {
                factions[detachment.faction] = {
                    name: detachment.faction,
                    detachmentCount: 0,
                    detachments: {}
                };
            }
            
            const faction = factions[detachment.faction];
            
            if (!faction.detachments[detachment.detachmentName]) {
                faction.detachments[detachment.detachmentName] = {
                    name: detachment.detachmentName,
                    enhancements: []
                };
                faction.detachmentCount++;
            }
            
            faction.detachments[detachment.detachmentName].enhancements.push({
                name: detachment.enhancementName,
                points: detachment.points
            });
        });
        
        return {
            metadata: {
                version: version,
                date: date,
                totalEnhancements: result.detachments.length,
                factionCount: Object.keys(factions).length,
                type: "detachments"
            },
            factions: factions
        };
    }

    async createJavaScriptFiles(unitsData, detachmentsData, version) {
        const versionKey = version.replace('.', '_');
        
        // Create units JavaScript file
        const unitsJsFile = path.join(__dirname, `mfm-units-${versionKey}.js`);
        const unitsJsContent = `// MFM ${version} Units Data - Generated directly from raw text
// Generated on ${new Date().toISOString()}

window.MFM_UNITS_${versionKey} = ${JSON.stringify(unitsData, null, 2)};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MFM_UNITS_${versionKey};
}`;
        fs.writeFileSync(unitsJsFile, unitsJsContent, 'utf8');
        console.log(`✅ Created units file: ${path.basename(unitsJsFile)} (${(fs.statSync(unitsJsFile).size / 1024).toFixed(2)} KB)`);
        
        // Create detachments JavaScript file
        const detachmentsJsFile = path.join(__dirname, `mfm-detachments-${versionKey}.js`);
        const detachmentsJsContent = `// MFM ${version} Detachments Data - Generated directly from raw text
// Generated on ${new Date().toISOString()}

window.MFM_DETACHMENTS_${versionKey} = ${JSON.stringify(detachmentsData, null, 2)};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MFM_DETACHMENTS_${versionKey};
}`;
        fs.writeFileSync(detachmentsJsFile, detachmentsJsContent, 'utf8');
        console.log(`✅ Created detachments file: ${path.basename(detachmentsJsFile)} (${(fs.statSync(detachmentsJsFile).size / 1024).toFixed(2)} KB)`);
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log('Usage: node parse-mfm-to-js.js <version> <date> <raw-text-file>');
        console.log('Example: node parse-mfm-to-js.js 3.4 Oct25 RAW_MFM_3_4_Oct25.txt');
        process.exit(1);
    }
    
    const [version, date, rawTextFile] = args;
    const parser = new MFMParser();
    
    parser.parseAndCreateFiles(rawTextFile, version, date)
        .then(() => {
            console.log('🎉 Direct parsing complete!');
        })
        .catch(error => {
            console.error('❌ Parsing failed:', error.message);
            process.exit(1);
        });
}

module.exports = MFMParser;
