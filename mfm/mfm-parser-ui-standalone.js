// filename: mfm/mfm-parser-ui-standalone.js
// Standalone UI-optimized MFM parser (includes base parser functionality)
// 40k Crusade Campaign Tracker

class MFMParserUIStandalone {
    constructor() {
        this.units = [];
        this.enhancements = [];
        this.currentFaction = null;
        this.currentDetachment = null;
        this.isForgeWorld = false;
        this.isEnhancementSection = false;
        this.isImperialAgents = false;
        this.imperialAgentsSubsection = null; // 'AGENTS_OF_THE_IMPERIUM' or 'EVERY_MODEL_HAS_IMPERIUM'
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
        this.isImperialAgents = false;
        this.imperialAgentsSubsection = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (this.isFactionHeader(line)) {
                if (this.isImperialAgentsSection(line)) {
                    this.isImperialAgents = true;
                    this.imperialAgentsSubsection = null;
                    this.currentFaction = null; // Will be set when we hit a subsection
                    this.currentDetachment = null;
                    this.isForgeWorld = false;
                    this.isEnhancementSection = false;
                } else {
                    this.isImperialAgents = false;
                    this.imperialAgentsSubsection = null;
                    
                    // Check if this is a CODEX SUPPLEMENT: with faction name on next line
                    if (line === 'CODEX SUPPLEMENT:' && i + 1 < lines.length) {
                        const nextLine = lines[i + 1].trim();
                        if (nextLine && !nextLine.includes(':') && !nextLine.includes('pts')) {
                            // Next line contains the faction name
                            this.currentFaction = nextLine;
                            i++; // Skip the next line since we've processed it
                        } else {
                            this.currentFaction = this.extractFactionName(line);
                        }
                    } else {
                        this.currentFaction = this.extractFactionName(line);
                    }
                    
                    this.currentDetachment = null;
                    this.isForgeWorld = false;
                    this.isEnhancementSection = false;
                }
                continue;
            }

            if (this.isImperialAgents && this.isAgentsOfTheImperiumSubsection(line)) {
                this.imperialAgentsSubsection = 'AGENTS_OF_THE_IMPERIUM';
                this.currentFaction = 'IMPERIAL AGENTS';
                this.currentDetachment = null;
                this.isForgeWorld = false;
                this.isEnhancementSection = false;
                continue;
            }

            if (this.isImperialAgents && this.isEveryModelHasImperiumSubsection(line)) {
                // Check if the next line completes the subsection
                if (i + 1 < lines.length && this.isImperiumKeywordLine(lines[i + 1].trim())) {
                    this.imperialAgentsSubsection = 'EVERY_MODEL_HAS_IMPERIUM';
                    this.currentFaction = 'IMPERIAL AGENTS (ALLIES)';
                    this.currentDetachment = null;
                    this.isForgeWorld = false;
                    this.isEnhancementSection = false;
                    i++; // Skip the next line since we've processed it
                    continue;
                }
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
        return line.startsWith('CODEX:') || line.startsWith('INDEX:') || line.startsWith('CODEX SUPPLEMENT:');
    }

    /**
     * Check if line indicates the start of Imperial Agents section
     */
    isImperialAgentsSection(line) {
        return line.includes('CODEX: IMPERIAL AGENTS');
    }

    /**
     * Check if line indicates the "AGENTS OF THE IMPERIUM" subsection
     */
    isAgentsOfTheImperiumSubsection(line) {
        return line.includes('AGENTS OF THE IMPERIUM');
    }

    /**
     * Check if line indicates the "EVERY MODEL HAS IMPERIUM KEYWORD" subsection
     */
    isEveryModelHasImperiumSubsection(line) {
        return line.includes('EVERY MODEL HAS');
    }

    /**
     * Check if the next line completes the "EVERY MODEL HAS IMPERIUM KEYWORD" subsection
     */
    isImperiumKeywordLine(line) {
        return line.includes('IMPERIUM KEYWORD');
    }

    /**
     * Extract faction name from header line
     */
    extractFactionName(line) {
        return line.replace(/^(CODEX:|INDEX:|CODEX SUPPLEMENT:)\s*/, '').trim();
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
        
        // Check for unit name with points on the same line (with or without point adjustments)
        const sameLineMatch = line.match(/^\s*(.+?)\s+(\d+)\s+models?\s+[\.\s]+\s*(?:\([+-]\d+\)\s+)?(\d+)\s+pts$/);
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

        // Check if unit name and points are on the same line (with or without leading spaces and point adjustments)
        const sameLineMatch = line.match(/^\s*(.+?)\s+(\d+)\s+models?\s+[\.\s]+\s*(?:\([+-]\d+\)\s+)?(\d+)\s+pts$/);
        if (sameLineMatch) {
            unitName = sameLineMatch[1].trim();
            modelCount = parseInt(sameLineMatch[2]);
            points = parseInt(sameLineMatch[3]);
        } else {
            // Extract model count and points from points-only line (with or without leading spaces and point adjustments)
            // The dots can vary in number, so we'll match any number of dots or spaces
            const modelMatch = line.match(/^\s*(\d+)\s+models?\s+[\.\s]+\s*(?:\([+-]\d+\)\s+)?(\d+)\s+pts/);
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

        // Create version-specific field name
        const pointsFieldName = `mfm_${this.currentVersion.replace('.', '_')}_points`;
        
        return {
            faction: this.currentFaction,
            detachment: this.currentDetachment,
            unitName: unitName,
            modelCount: modelCount,
            [pointsFieldName]: points,
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

            // Check if this line contains a unit name with points on the same line (with or without point adjustments)
            const sameLineMatch = line.match(/^\s*(.+?)\s+(\d+)\s+models?\s+[\.\s]+\s*(?:\([+-]\d+\)\s+)?(\d+)\s+pts$/);
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
        
        // Don't match unit entries (which contain "models")
        if (line.includes('models')) {
            return false;
        }
        
        // Check for enhancement name with points (dots pattern, with or without point adjustments)
        const enhancementMatch = line.match(/^(.+?)[\.\s]+\s*(?:\([+-]\d+\)\s+)?(\d+)\s+pts$/);
        return enhancementMatch !== null;
    }

    /**
     * Parse an enhancement entry line and extract enhancement information
     */
    parseEnhancementEntry(line, lineIndex, allLines) {
        const enhancementMatch = line.match(/^(.+?)[\.\s]+\s*(?:\([+-]\d+\)\s+)?(\d+)\s+pts$/);
        if (!enhancementMatch) {
            return null;
        }

        const enhancementName = enhancementMatch[1].trim();
        const points = parseInt(enhancementMatch[2]);

        // Create version-specific field name
        const pointsFieldName = `mfm_${this.currentVersion.replace('.', '_')}_points`;
        
        return {
            faction: this.currentFaction,
            detachment: this.currentDetachment,
            enhancementName: enhancementName,
            [pointsFieldName]: points,
            lineNumber: lineIndex + 1
        };
    }

    /**
     * Parse MFM content and return UI-optimized structure
     * @param {string} content - The raw text content of the MFM file
     * @param {string} version - MFM version (e.g., "3.2")
     * @param {string} date - MFM date (e.g., "AUG25")
     * @returns {Object} UI-optimized data structure
     */
    parseForUI(content, version = "3.2", date = "AUG25") {
        // Store version for use in enhancement parsing
        this.currentVersion = version;
        
        // First parse using the base parser
        const parsedData = this.parse(content);
        
        // Transform into UI-optimized structure
        return this.transformToUIStructure(parsedData.units, parsedData.enhancements, version, date);
    }

    /**
     * Transform flat unit array into hierarchical UI structure
     */
    transformToUIStructure(units, enhancements, version, date) {
        const result = {
            metadata: {
                version: version,
                date: date,
                totalUnits: units.length,
                totalEnhancements: enhancements.length,
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
                units: {},
                detachments: []
            };

            // Process each unit (with variants)
            Object.keys(unitGroups).forEach(unitName => {
                const unitVariants = unitGroups[unitName];
                
                result.factions[factionKey].units[unitName] = {
                    name: unitName,
                    variants: unitVariants.map(unit => {
                        const variant = { modelCount: unit.modelCount };
                        // Copy all version-specific points fields
                        Object.keys(unit).forEach(key => {
                            if (key.includes('points')) {
                                variant[key] = unit[key];
                            }
                        });
                        // Only include isForgeWorld if it's true
                        if (unit.isForgeWorld) {
                            variant.isForgeWorld = true;
                        }
                        return variant;
                    }).sort((a, b) => a.modelCount - b.modelCount) // Sort by model count
                };
            });

            // Update global stats
            result.metadata.totalPoints += factionStats.totalPoints;
            result.metadata.forgeWorldUnits += factionStats.forgeWorldUnits;
        });

        // Process enhancements
        const enhancementGroups = {};
        enhancements.forEach(enhancement => {
            if (!enhancementGroups[enhancement.faction]) {
                enhancementGroups[enhancement.faction] = [];
            }
            enhancementGroups[enhancement.faction].push(enhancement);
        });

        // Add enhancements to factions
        Object.keys(enhancementGroups).forEach(factionKey => {
            const factionEnhancements = enhancementGroups[factionKey];
            
            if (!result.factions[factionKey]) {
                result.factions[factionKey] = {
                    name: this.formatFactionName(factionKey),
                    unitCount: 0,
                    totalPoints: 0,
                    forgeWorldUnits: 0,
                    units: {},
                    detachments: [],
                    enhancements: {}
                };
            } else {
                if (!result.factions[factionKey].enhancements) {
                    result.factions[factionKey].enhancements = {};
                }
                if (!result.factions[factionKey].detachments) {
                    result.factions[factionKey].detachments = [];
                }
            }

            // Group enhancements by detachment
            const detachmentGroups = {};
            factionEnhancements.forEach(enhancement => {
                if (!detachmentGroups[enhancement.detachment]) {
                    detachmentGroups[enhancement.detachment] = [];
                }
                detachmentGroups[enhancement.detachment].push(enhancement);
            });

            // Add enhancements to faction
            Object.keys(detachmentGroups).forEach(detachmentKey => {
                const detachmentEnhancements = detachmentGroups[detachmentKey];
                
                result.factions[factionKey].enhancements[detachmentKey] = {
                    name: detachmentKey,
                    enhancements: detachmentEnhancements.map(enhancement => {
                        const enhancementObj = { name: enhancement.enhancementName };
                        // Copy all version-specific points fields
                        Object.keys(enhancement).forEach(key => {
                            if (key.includes('points')) {
                                enhancementObj[key] = enhancement[key];
                            }
                        });
                        return enhancementObj;
                    }).sort((a, b) => {
                        // Sort by the first points field found
                        const aPoints = Object.values(a).find(val => typeof val === 'number');
                        const bPoints = Object.values(b).find(val => typeof val === 'number');
                        return (aPoints || 0) - (bPoints || 0);
                    })
                };

                // Add detachment to detachments array
                result.factions[factionKey].detachments.push({
                    name: detachmentKey,
                    enhancementCount: detachmentEnhancements.length,
                    enhancements: detachmentEnhancements.map(enhancement => {
                        const enhancementObj = { name: enhancement.enhancementName };
                        // Copy all version-specific points fields
                        Object.keys(enhancement).forEach(key => {
                            if (key.includes('points')) {
                                enhancementObj[key] = enhancement[key];
                            }
                        });
                        return enhancementObj;
                    }).sort((a, b) => {
                        // Sort by the first points field found
                        const aPoints = Object.values(a).find(val => typeof val === 'number');
                        const bPoints = Object.values(b).find(val => typeof val === 'number');
                        return (aPoints || 0) - (bPoints || 0);
                    })
                });
            });

            // Update global enhancement stats
            factionEnhancements.forEach(enhancement => {
                // Add the first points field found (should be the version-specific one)
                const points = Object.values(enhancement).find(val => typeof val === 'number' && val > 0);
                if (points) {
                    result.metadata.totalPoints += points;
                }
            });
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
            // Add the first points field found (should be the version-specific one)
            const points = Object.values(unit).find(val => typeof val === 'number' && val > 0);
            if (points) {
                stats.totalPoints += points;
            }
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
        // Handle special cases first
        if (factionKey === 'IMPERIAL AGENTS') {
            return 'Imperial Agents';
        }
        if (factionKey === 'IMPERIAL AGENTS (ALLIES)') {
            return 'Imperial Agents (Allies)';
        }
        
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
