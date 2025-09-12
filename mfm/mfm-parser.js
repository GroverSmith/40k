// filename: mfm/mfm-parser.js
// Script to parse RAW_MFM_3_2_AUG25.txt and extract units with points costs
// 40k Crusade Campaign Tracker

class MFMParser {
    constructor() {
        this.units = [];
        this.enhancements = [];
        this.currentFaction = null;
        this.currentDetachment = null;
        this.isForgeWorld = false;
        this.isEnhancementSection = false;
    }

    /**
     * Parse the MFM file content
     * @param {string} content - The raw text content of the MFM file
     * @returns {Array} Array of parsed units with their details
     */
    parse(content) {
        const lines = content.split('\n');
        this.units = [];
        this.enhancements = [];
        this.currentFaction = null;
        this.currentDetachment = null;
        this.isForgeWorld = false;
        this.isEnhancementSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (this.isFactionHeader(line)) {
                this.currentFaction = this.extractFactionName(line);
                this.currentDetachment = null;
                this.isForgeWorld = false;
                this.isEnhancementSection = false;
                continue;
            }

            if (this.isForgeWorldSection(line)) {
                this.isForgeWorld = true;
                this.isEnhancementSection = false;
                continue;
            }

            if (this.isEnhancementSectionHeader(line)) {
                this.isEnhancementSection = true;
                continue;
            }

            if (this.isDetachmentHeader(line)) {
                this.currentDetachment = line;
                continue;
            }

            if (this.isEnhancementEntry(line)) {
                const enhancement = this.parseEnhancementEntry(line, i, lines);
                if (enhancement) {
                    this.enhancements.push(enhancement);
                }
            } else if (this.isUnitEntry(line)) {
                const unit = this.parseUnitEntry(line, i, lines);
                if (unit) {
                    this.units.push(unit);
                }
            }
        }

        return {
            units: this.units,
            enhancements: this.enhancements
        };
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
     * Check if line is a DETACHMENT ENHANCEMENTS header
     */
    isEnhancementSectionHeader(line) {
        return line.includes('DETACHMENT ENHANCEMENTS');
    }

    /**
     * Check if line is a detachment header
     */
    isDetachmentHeader(line) {
        return (line.length > 0 && !line.includes('pts') && !line.includes('models') && 
                !this.isFactionHeader(line) && !this.isForgeWorldSection(line) &&
                !this.isEnhancementSectionHeader(line) &&
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
            const sameLineMatch = line.match(/^(.+?)\s+(\d+)\s+models?\s+\.+\s+(\d+)\s+pts$/);
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
     * Check if line contains an enhancement entry with points
     */
    isEnhancementEntry(line) {
        // Check if we're in an enhancement section and the line has points
        if (!this.isEnhancementSection) {
            return false;
        }
        
        // Check for enhancement name with points (dots pattern)
        const enhancementMatch = line.match(/^(.+?)[\.\s]+\s*(\d+)\s+pts$/);
        return enhancementMatch !== null;
    }

    /**
     * Parse an enhancement entry line and extract enhancement information
     */
    parseEnhancementEntry(line, lineIndex, allLines) {
        const enhancementMatch = line.match(/^(.+?)[\.\s]+\s*(\d+)\s+pts$/);
        if (!enhancementMatch) {
            return null;
        }

        const enhancementName = enhancementMatch[1].trim();
        const points = parseInt(enhancementMatch[2]);

        return {
            faction: this.currentFaction,
            detachment: this.currentDetachment,
            enhancementName: enhancementName,
            points: points,
            isForgeWorld: this.isForgeWorld,
            lineNumber: lineIndex + 1
        };
    }

    /**
     * Export parsed data to JSON
     */
    exportToJSON() {
        return JSON.stringify({
            units: this.units,
            enhancements: this.enhancements
        }, null, 2);
    }

    /**
     * Export parsed data to CSV format
     */
    exportToCSV() {
        const headers = ['Type', 'Faction', 'Detachment', 'Name', 'Model Count', 'Points', 'Forge World', 'Line Number'];
        const csvRows = [headers.join(',')];

        // Add units
        this.units.forEach(unit => {
            const row = [
                'Unit',
                `"${unit.faction || ''}"`,
                `"${unit.detachment || ''}"`,
                `"${unit.unitName}"`,
                unit.modelCount,
                unit.points,
                unit.isForgeWorld ? 'Yes' : 'No',
                unit.lineNumber
            ];
            csvRows.push(row.join(','));
        });

        // Add enhancements
        this.enhancements.forEach(enhancement => {
            const row = [
                'Enhancement',
                `"${enhancement.faction || ''}"`,
                `"${enhancement.detachment || ''}"`,
                `"${enhancement.enhancementName}"`,
                '', // No model count for enhancements
                enhancement.points,
                enhancement.isForgeWorld ? 'Yes' : 'No',
                enhancement.lineNumber
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    /**
     * Get statistics about the parsed data
     */
    getStats() {
        const stats = {
            totalUnits: this.units.length,
            totalEnhancements: this.enhancements.length,
            factions: {},
            totalPoints: 0,
            forgeWorldUnits: 0,
            forgeWorldEnhancements: 0
        };

        this.units.forEach(unit => {
            // Count by faction
            if (!stats.factions[unit.faction]) {
                stats.factions[unit.faction] = { units: 0, enhancements: 0 };
            }
            stats.factions[unit.faction].units++;

            // Sum total points
            stats.totalPoints += unit.points;

            // Count Forge World units
            if (unit.isForgeWorld) {
                stats.forgeWorldUnits++;
            }
        });

        this.enhancements.forEach(enhancement => {
            // Count by faction
            if (!stats.factions[enhancement.faction]) {
                stats.factions[enhancement.faction] = { units: 0, enhancements: 0 };
            }
            stats.factions[enhancement.faction].enhancements++;

            // Sum total points
            stats.totalPoints += enhancement.points;

            // Count Forge World enhancements
            if (enhancement.isForgeWorld) {
                stats.forgeWorldEnhancements++;
            }
        });

        return stats;
    }

    /**
     * Filter units by faction
     */
    filterByFaction(factionName) {
        return this.units.filter(unit => 
            unit.faction && unit.faction.toLowerCase().includes(factionName.toLowerCase())
        );
    }

    /**
     * Search units by name
     */
    searchUnits(searchTerm) {
        return this.units.filter(unit => 
            unit.unitName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
}


// Node.js usage function
function parseMFMFileNode(filePath) {
    const fs = require('fs');
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parser = new MFMParser();
        const units = parser.parse(content);
        
        console.log('Parsed units:', units.length);
        console.log('Statistics:', parser.getStats());
        
        return {
            units: units,
            json: parser.exportToJSON(),
            csv: parser.exportToCSV(),
            stats: parser.getStats()
        };
        
    } catch (error) {
        console.error('Error parsing MFM file:', error);
        throw error;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MFMParser, parseMFMFileNode };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.MFMParser = MFMParser;
}
