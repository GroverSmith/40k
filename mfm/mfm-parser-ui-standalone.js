// filename: mfm/mfm-parser-ui-standalone.js
// Standalone UI-optimized MFM parser (includes base parser functionality)
// 40k Crusade Campaign Tracker

class MFMParserUIStandalone {
    constructor() {
        this.units = [];
        this.currentFaction = null;
        this.currentDetachment = null;
        this.isForgeWorld = false;
    }

    /**
     * Parse the MFM file content
     * @param {string} content - The raw text content of the MFM file
     * @returns {Array} Array of parsed units with their details
     */
    parse(content) {
        const lines = content.split('\n');
        this.units = [];
        this.currentFaction = null;
        this.currentDetachment = null;
        this.isForgeWorld = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (this.isFactionHeader(line)) {
                this.currentFaction = this.extractFactionName(line);
                this.currentDetachment = null;
                this.isForgeWorld = false;
                continue;
            }

            if (this.isForgeWorldSection(line)) {
                this.isForgeWorld = true;
                continue;
            }

            if (this.isDetachmentHeader(line)) {
                this.currentDetachment = line;
                continue;
            }

            if (this.isUnitEntry(line)) {
                const unit = this.parseUnitEntry(line, i, lines);
                if (unit) {
                    this.units.push(unit);
                }
            }
        }

        return this.units;
    }

    /**
     * Check if a line is a faction header (e.g., "CODEX: ADEPTA SORORITAS")
     */
    isFactionHeader(line) {
        return line.startsWith('CODEX:') || line.startsWith('INDEX:');
    }

    /**
     * Extract faction name from header line
     */
    extractFactionName(line) {
        return line.replace(/^(CODEX:|INDEX:)\s*/, '').trim();
    }

    /**
     * Check if line indicates Forge World section
     */
    isForgeWorldSection(line) {
        return line.includes('FORGE WORLD POINTS VALUES');
    }

    /**
     * Check if line is a detachment header
     */
    isDetachmentHeader(line) {
        return line.includes('DETACHMENT ENHANCEMENTS') || 
               (line.length > 0 && !line.includes('pts') && !line.includes('models') && 
                !this.isFactionHeader(line) && !this.isForgeWorldSection(line) &&
                !line.match(/^\d+$/)); // Not just a page number
    }

    /**
     * Check if line contains a unit entry with points
     */
    isUnitEntry(line) {
        // Check for points with models on the same line (with or without leading spaces)
        if (line.includes('pts') && (line.includes('models') || line.includes('model'))) {
            return true;
        }
        
        // Check for unit name with points on the same line
        const sameLineMatch = line.match(/^\s*(.+?)\s+(\d+)\s+models?\s+[\.\s]+\s*(\d+)\s+pts$/);
        if (sameLineMatch) {
            return true;
        }
        
        return false;
    }

    /**
     * Parse a unit entry line and extract unit information
     */
    parseUnitEntry(line, lineIndex, allLines) {
        let modelCount, points, unitName;

        // Check if unit name and points are on the same line (with or without leading spaces)
        const sameLineMatch = line.match(/^\s*(.+?)\s+(\d+)\s+models?\s+[\.\s]+\s*(\d+)\s+pts$/);
        if (sameLineMatch) {
            unitName = sameLineMatch[1].trim();
            modelCount = parseInt(sameLineMatch[2]);
            points = parseInt(sameLineMatch[3]);
        } else {
            // Extract model count and points from points-only line (with or without leading spaces)
            // The dots can vary in number, so we'll match any number of dots or spaces
            const modelMatch = line.match(/^\s*(\d+)\s+models?\s+[\.\s]+\s*(\d+)\s+pts/);
            if (!modelMatch) {
                return null;
            }

            modelCount = parseInt(modelMatch[1]);
            points = parseInt(modelMatch[2]);

            // Look backwards to find the unit name
            unitName = this.findUnitName(lineIndex, allLines);
            
            if (!unitName) {
                return null;
            }
        }

        return {
            faction: this.currentFaction,
            detachment: this.currentDetachment,
            unitName: unitName,
            modelCount: modelCount,
            points: points,
            isForgeWorld: this.isForgeWorld,
            lineNumber: lineIndex + 1
        };
    }

    /**
     * Find the unit name by looking backwards from the points line
     */
    findUnitName(lineIndex, allLines) {
        // Look backwards up to 5 lines to find the unit name
        for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 5); i--) {
            const line = allLines[i].trim();
            
            // Skip empty lines, page numbers, and other non-unit lines
            if (line === '' || 
                line.match(/^\d+$/) || 
                line.includes('pts') || 
                line.includes('models') ||
                line.includes('DETACHMENT') ||
                line.includes('FORGE WORLD') ||
                line.startsWith('CODEX:') ||
                line.startsWith('INDEX:')) {
                continue;
            }

            // Check if this line contains a unit name with points on the same line
            const sameLineMatch = line.match(/^\s*(.+?)\s+(\d+)\s+models?\s+[\.\s]+\s*(\d+)\s+pts$/);
            if (sameLineMatch) {
                return sameLineMatch[1].trim();
            }

            // Check if this line is just a unit name (no points)
            // It should not contain numbers, models, pts, or other indicators
            if (!line.match(/\d/) && 
                !line.includes('models') && 
                !line.includes('pts') &&
                !line.includes('DETACHMENT') &&
                !line.includes('FORGE WORLD') &&
                !line.startsWith('CODEX:') &&
                !line.startsWith('INDEX:')) {
                return line;
            }
        }

        return null;
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

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MFMParserUIStandalone };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.MFMParserUIStandalone = MFMParserUIStandalone;
}
