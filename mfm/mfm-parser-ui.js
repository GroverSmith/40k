// filename: mfm/mfm-parser-ui.js
// UI-optimized MFM parser that outputs hierarchical data structure for dropdowns
// 40k Crusade Campaign Tracker

// Import the base parser (Node.js only)
let MFMParser;
if (typeof require !== 'undefined') {
    const { MFMParser: BaseMFMParser } = require('./mfm-parser.js');
    MFMParser = BaseMFMParser;
} else {
    // Browser environment - assume MFMParser is already loaded globally
    MFMParser = window.MFMParser;
}

class MFMParserUI extends MFMParser {
    constructor() {
        super();
    }

    /**
     * Parse MFM content and return UI-optimized structure
     * @param {string} content - The raw text content of the MFM file
     * @param {string} version - MFM version (e.g., "3.2")
     * @param {string} date - MFM date (e.g., "AUG25")
     * @returns {Object} UI-optimized data structure
     */
    parseForUI(content, version = "3.2", date = "AUG25") {
        // First parse using the base parser
        const units = this.parse(content);
        
        // Transform into UI-optimized structure
        return this.transformToUIStructure(units, version, date);
    }

    /**
     * Transform flat unit array into hierarchical UI structure
     */
    transformToUIStructure(units, version, date) {
        const result = {
            metadata: {
                version: version,
                date: date,
                totalUnits: units.length,
                totalPoints: 0,
                forgeWorldUnits: 0,
                factionCount: 0
            },
            factions: {}
        };

        // Group units by faction
        const factionGroups = {};
        units.forEach(unit => {
            if (!factionGroups[unit.faction]) {
                factionGroups[unit.faction] = [];
            }
            factionGroups[unit.faction].push(unit);
        });

        // Process each faction
        Object.keys(factionGroups).forEach(factionKey => {
            const factionUnits = factionGroups[factionKey];
            
            // Calculate faction stats
            const factionStats = this.calculateFactionStats(factionUnits);
            
            // Group units by name (to handle variants)
            const unitGroups = {};
            factionUnits.forEach(unit => {
                if (!unitGroups[unit.unitName]) {
                    unitGroups[unit.unitName] = [];
                }
                unitGroups[unit.unitName].push(unit);
            });

            // Build faction structure
            result.factions[factionKey] = {
                name: this.formatFactionName(factionKey),
                unitCount: factionStats.unitCount,
                totalPoints: factionStats.totalPoints,
                forgeWorldUnits: factionStats.forgeWorldUnits,
                units: {}
            };

            // Process each unit (with variants)
            Object.keys(unitGroups).forEach(unitName => {
                const unitVariants = unitGroups[unitName];
                
                result.factions[factionKey].units[unitName] = {
                    name: unitName,
                    variants: unitVariants.map(unit => ({
                        modelCount: unit.modelCount,
                        points: unit.points,
                        isForgeWorld: unit.isForgeWorld,
                        lineNumber: unit.lineNumber
                    })).sort((a, b) => a.modelCount - b.modelCount) // Sort by model count
                };
            });

            // Update global stats
            result.metadata.totalPoints += factionStats.totalPoints;
            result.metadata.forgeWorldUnits += factionStats.forgeWorldUnits;
        });

        result.metadata.factionCount = Object.keys(result.factions).length;
        
        return result;
    }

    /**
     * Calculate statistics for a faction
     */
    calculateFactionStats(units) {
        const stats = {
            unitCount: units.length,
            totalPoints: 0,
            forgeWorldUnits: 0
        };

        units.forEach(unit => {
            stats.totalPoints += unit.points;
            if (unit.isForgeWorld) {
                stats.forgeWorldUnits++;
            }
        });

        return stats;
    }

    /**
     * Format faction name for display
     */
    formatFactionName(factionKey) {
        // Convert "SPACE MARINES" to "Space Marines"
        return factionKey
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Get available MFM versions from directory
     * @param {Array} fileList - Array of MFM files
     * @returns {Array} Array of version objects
     */
    static getAvailableVersions(fileList) {
        const versions = [];
        
        fileList.forEach(fileName => {
            // Extract version from filename like "RAW_MFM_3_2_AUG25.txt"
            const match = fileName.match(/RAW_MFM_(\d+)_(\d+)_(\w+)\.txt/);
            if (match) {
                versions.push({
                    fileName: fileName,
                    version: `${match[1]}.${match[2]}`,
                    date: match[3],
                    displayName: `MFM ${match[1]}.${match[2]} (${match[3]})`
                });
            }
        });

        // Sort by version (newest first)
        return versions.sort((a, b) => {
            const [aMajor, aMinor] = a.version.split('.').map(Number);
            const [bMajor, bMinor] = b.version.split('.').map(Number);
            
            if (aMajor !== bMajor) return bMajor - aMajor;
            return bMinor - aMinor;
        });
    }

    /**
     * Export UI structure to JSON
     */
    exportUIStructure(content, version, date) {
        const uiData = this.parseForUI(content, version, date);
        return JSON.stringify(uiData, null, 2);
    }

    /**
     * Get faction list for dropdown
     */
    getFactionList(uiData) {
        return Object.keys(uiData.factions).map(factionKey => ({
            key: factionKey,
            name: uiData.factions[factionKey].name,
            unitCount: uiData.factions[factionKey].unitCount,
            totalPoints: uiData.factions[factionKey].totalPoints
        })).sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Get unit list for a faction
     */
    getUnitList(uiData, factionKey) {
        if (!uiData.factions[factionKey]) {
            return [];
        }

        return Object.keys(uiData.factions[factionKey].units).map(unitName => {
            const unit = uiData.factions[factionKey].units[unitName];
            return {
                name: unitName,
                variantCount: unit.variants.length,
                minPoints: Math.min(...unit.variants.map(v => v.points)),
                maxPoints: Math.max(...unit.variants.map(v => v.points)),
                variants: unit.variants
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MFMParserUI };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.MFMParserUI = MFMParserUI;
}
