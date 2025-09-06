// filename: js/core/points-data.js
// Warhammer 40k Points Data Manager
// 40k Crusade Campaign Tracker

const PointsData = {
    // Points data structure organized by faction
    data: {
        // Example structure - you'll need to populate this with actual data from the PDF
        "Space Marines": {
            units: [
                {
                    name: "Captain",
                    points: 80,
                    category: "HQ",
                    wargear: [
                        { name: "Bolt Pistol", points: 0 },
                        { name: "Chainsword", points: 0 },
                        { name: "Power Sword", points: 5 }
                    ]
                },
                {
                    name: "Tactical Squad",
                    points: 140,
                    category: "Troops",
                    wargear: [
                        { name: "Boltgun", points: 0 },
                        { name: "Plasma Gun", points: 10 }
                    ]
                }
            ],
            enhancements: [
                { name: "Artificer Armour", points: 20 },
                { name: "Digital Weapons", points: 15 }
            ]
        },
        "Chaos Space Marines": {
            units: [
                {
                    name: "Chaos Lord",
                    points: 75,
                    category: "HQ",
                    wargear: [
                        { name: "Bolt Pistol", points: 0 },
                        { name: "Chainsword", points: 0 }
                    ]
                }
            ],
            enhancements: [
                { name: "Daemon Weapon", points: 25 }
            ]
        }
        // Add more factions as needed
    },

    /**
     * Get all factions
     */
    getFactions() {
        return Object.keys(this.data);
    },

    /**
     * Get units for a specific faction
     */
    getUnits(faction) {
        return this.data[faction]?.units || [];
    },

    /**
     * Get enhancements for a specific faction
     */
    getEnhancements(faction) {
        return this.data[faction]?.enhancements || [];
    },

    /**
     * Search for a unit by name across all factions
     */
    findUnit(unitName) {
        for (const [faction, factionData] of Object.entries(this.data)) {
            const unit = factionData.units.find(u => 
                u.name.toLowerCase().includes(unitName.toLowerCase())
            );
            if (unit) {
                return { ...unit, faction };
            }
        }
        return null;
    },


    /**
     * Calculate total points for a unit
     */
    calculateUnitPoints(unit, modelCount = null) {
        const actualModelCount = modelCount || unit.modelCount || 1;
        return unit.points;
    },

    /**
     * Get all units sorted by points cost
     */
    getAllUnitsSortedByPoints() {
        const allUnits = [];
        
        for (const [faction, factionData] of Object.entries(this.data)) {
            factionData.units.forEach(unit => {
                allUnits.push({ ...unit, faction });
            });
        }
        
        return allUnits.sort((a, b) => a.points - b.points);
    },

    /**
     * Search for units within a points range
     */
    getUnitsInPointsRange(minPoints, maxPoints, faction = null) {
        const units = faction ? this.getUnits(faction) : this.getAllUnitsSortedByPoints();
        return units.filter(unit => unit.points >= minPoints && unit.points <= maxPoints);
    },

    /**
     * Get points summary for a faction
     */
    getFactionSummary(faction) {
        const factionData = this.data[faction];
        if (!factionData) return null;

        const units = factionData.units;
        const enhancements = factionData.enhancements;

        return {
            faction,
            totalUnits: units.length,
            totalEnhancements: enhancements.length,
            minUnitPoints: units.length > 0 ? Math.min(...units.map(u => u.points)) : 0,
            maxUnitPoints: units.length > 0 ? Math.max(...units.map(u => u.points)) : 0,
            averageUnitPoints: units.length > 0 ? Math.round(units.reduce((sum, u) => sum + u.points, 0) / units.length) : 0,
            totalModels: units.reduce((sum, u) => sum + (u.modelCount || 1), 0)
        };
    },

    /**
     * Export data as JSON
     */
    exportAsJSON() {
        return JSON.stringify(this.data, null, 2);
    },

    /**
     * Import data from JSON
     */
    importFromJSON(jsonString) {
        try {
            this.data = JSON.parse(jsonString);
            return true;
        } catch (error) {
            console.error('Error importing points data:', error);
            return false;
        }
    },

    /**
     * Add a new unit to a faction
     */
    addUnit(faction, unit) {
        if (!this.data[faction]) {
            this.data[faction] = { units: [], enhancements: [] };
        }
        this.data[faction].units.push(unit);
    },

    /**
     * Add a new enhancement to a faction
     */
    addEnhancement(faction, enhancement) {
        if (!this.data[faction]) {
            this.data[faction] = { units: [], enhancements: [] };
        }
        this.data[faction].enhancements.push(enhancement);
    },

    /**
     * Update unit points
     */
    updateUnitPoints(faction, unitName, newPoints) {
        const factionData = this.data[faction];
        if (!factionData) return false;

        const unit = factionData.units.find(u => u.name === unitName);
        if (unit) {
            unit.points = newPoints;
            return true;
        }
        return false;
    }
};

// Make it globally available
window.PointsData = PointsData;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointsData;
}

console.log('PointsData loaded - Warhammer 40k points management system ready');
