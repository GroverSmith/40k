// filename: js/core/points-converter.js
// PDF Points Data Converter Utility
// 40k Crusade Campaign Tracker

const PointsConverter = {
    /**
     * Convert raw text data from PDF into structured format
     * This is a helper utility to process copied text from the PDF
     */
    
    /**
     * Parse raw text data into structured points data
     * @param {string} rawText - Raw text from the MFM file
     * @returns {Object} Structured points data
     */
    parseRawText(rawText) {
        const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const result = {};
        let currentFaction = null;
        let currentUnitName = null;
        let inEnhancementsSection = false;
        let currentDetachment = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip lines that are only numbers
            if (this.isNumberOnly(line)) {
                continue;
            }
            
            // Check if this is a faction header (CODEX: or INDEX: format)
            if (this.isFactionHeader(line)) {
                currentFaction = this.cleanFactionName(line);
                result[currentFaction] = {
                    units: [],
                    enhancements: []
                };
                inEnhancementsSection = false;
                currentUnitName = null;
                continue;
            }
            
            // Check if this is an enhancements section header
            if (this.isEnhancementsSectionHeader(line)) {
                inEnhancementsSection = true;
                currentUnitName = null;
                currentDetachment = null;
                continue;
            }
            
            // Check if this is a unit line (contains model count and points)
            if (this.isUnitLine(line) && !inEnhancementsSection && currentUnitName) {
                const unitData = this.parseUnitLine(line, currentUnitName);
                if (unitData && currentFaction) {
                    result[currentFaction].units.push(unitData);
                }
            } 
            // Check if this is an enhancement line
            else if (this.isEnhancementLine(line) && inEnhancementsSection) {
                const enhancementData = this.parseEnhancementLine(line, currentDetachment);
                if (enhancementData && currentFaction) {
                    result[currentFaction].enhancements.push(enhancementData);
                }
            }
            // Check if this is a detachment name (enhancement line without points)
            else if (this.isDetachmentName(line) && inEnhancementsSection) {
                currentDetachment = line;
            }
            // This is a unit name line (doesn't contain "model")
            else if (!this.isUnitLine(line) && !this.isEnhancementLine(line) && !this.isDetachmentName(line) && !inEnhancementsSection && currentFaction) {
                currentUnitName = line;
            }
        }
        
        return result;
    },
    
    /**
     * Check if a line is a faction header
     */
    isFactionHeader(line) {
        // Look for "CODEX:" or "INDEX:" pattern
        return line.toUpperCase().startsWith('CODEX:') || line.toUpperCase().startsWith('INDEX:');
    },
    
    /**
     * Check if a line is an enhancements section header
     */
    isEnhancementsSectionHeader(line) {
        const enhancementHeaders = [
            'DETACHMENT ENHANCEMENTS',
            'ENHANCEMENTS',
            'WARLORD TRAITS',
            'RELIC ENHANCEMENTS'
        ];
        
        return enhancementHeaders.some(header => 
            line.toUpperCase().includes(header.toUpperCase())
        );
    },
    
    /**
     * Check if a line contains unit data
     */
    isUnitLine(line) {
        // Look for patterns like "X models Y pts" (simplified format from text file)
        const modelCountPattern = /\d+\s+models?\s+\d+\s*pts?$/i;
        const singleModelPattern = /1\s+model\s+\d+\s*pts?$/i;
        
        return modelCountPattern.test(line) || singleModelPattern.test(line);
    },
    
    /**
     * Check if a line contains enhancement data
     */
    isEnhancementLine(line) {
        // Look for enhancement name followed by points (simplified format from text file)
        const enhancementPattern = /^[A-Za-z\s]+\s+\d+\s*pts?$/i;
        return enhancementPattern.test(line) && !this.isUnitLine(line);
    },
    
    /**
     * Check if a line is a detachment name (enhancement line without points)
     */
    isDetachmentName(line) {
        // Look for lines that are just text without points, in enhancements section
        const detachmentPattern = /^[A-Za-z\s]+$/;
        return detachmentPattern.test(line) && !this.isUnitLine(line) && !this.isEnhancementLine(line);
    },
    
    /**
     * Clean faction name
     */
    cleanFactionName(line) {
        // Remove "CODEX:" or "INDEX:" prefix and clean up
        return line.replace(/^(CODEX|INDEX):\s*/i, '').trim();
    },
    
    
    /**
     * Parse a unit line into structured data
     */
    parseUnitLine(line, unitName) {
        // Extract points value
        const pointsMatch = line.match(/(\d+)\s*pts?$/i);
        if (!pointsMatch) return null;
        
        const points = parseInt(pointsMatch[1]);
        
        // Extract model count
        const modelMatch = line.match(/(\d+)\s+models?/i);
        const modelCount = modelMatch ? parseInt(modelMatch[1]) : 1;
        
        // Use the provided unit name
        const name = unitName;
        
        return {
            name: name,
            points: points,
            modelCount: modelCount
        };
    },
    
    /**
     * Parse an enhancement line into structured data
     */
    parseEnhancementLine(line, currentDetachment) {
        const pointsMatch = line.match(/(\d+)\s*pts?$/i);
        if (!pointsMatch) return null;
        
        const points = parseInt(pointsMatch[1]);
        const name = line.replace(/\s+\d+\s*pts?$/i, '').trim();
        
        return {
            name: name,
            points: points,
            detachment: currentDetachment || null
        };
    },
    
    /**
     * Check if a line contains only a number
     */
    isNumberOnly(line) {
        return /^\d+$/.test(line.trim());
    },
    
    
    /**
     * Generate JavaScript code for the points data
     */
    generateJavaScriptCode(data) {
        return `// Auto-generated points data from PDF
const pointsData = ${JSON.stringify(data, null, 2)};

// To use this data:
// PointsData.data = pointsData;`;
    },
    
    /**
     * Generate a CSV export of the points data
     */
    generateCSV(data) {
        let csv = 'Faction,Type,Name,ModelCount,Points,Detachment\n';
        
        for (const [faction, factionData] of Object.entries(data)) {
            // Add units
            factionData.units.forEach(unit => {
                csv += `"${faction}","Unit","${unit.name}",${unit.modelCount},${unit.points},""\n`;
            });
            
            // Add enhancements
            factionData.enhancements.forEach(enhancement => {
                csv += `"${faction}","Enhancement","${enhancement.name}",1,${enhancement.points},"${enhancement.detachment || ''}"\n`;
            });
        }
        
        return csv;
    },
    
    /**
     * Interactive converter for manual data entry
     */
    createInteractiveConverter() {
        const converterHTML = `
            <div id="points-converter" style="padding: 20px; font-family: Arial, sans-serif;">
                <h2>Warhammer 40k Points Data Converter</h2>
                <p>Paste the raw text from the PDF below:</p>
                <textarea id="raw-text-input" style="width: 100%; height: 300px; margin: 10px 0;"></textarea>
                <br>
                <button onclick="convertPointsData()">Convert to Structured Data</button>
                <button onclick="downloadCSV()">Download as CSV</button>
                <button onclick="downloadJS()">Download as JavaScript</button>
                <div id="conversion-result" style="margin-top: 20px;"></div>
            </div>
        `;
        
        return converterHTML;
    }
};

// Helper functions for the interactive converter
window.convertPointsData = function() {
    const rawText = document.getElementById('raw-text-input').value;
    const result = PointsConverter.parseRawText(rawText);
    const resultDiv = document.getElementById('conversion-result');
    
    resultDiv.innerHTML = `
        <h3>Conversion Result:</h3>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto; max-height: 400px;">
${JSON.stringify(result, null, 2)}
        </pre>
    `;
    
    // Store result globally for download functions
    window.lastConversionResult = result;
};

window.downloadCSV = function() {
    if (!window.lastConversionResult) {
        alert('Please convert data first');
        return;
    }
    
    const csv = PointsConverter.generateCSV(window.lastConversionResult);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'warhammer-40k-points.csv';
    a.click();
    URL.revokeObjectURL(url);
};

window.downloadJS = function() {
    if (!window.lastConversionResult) {
        alert('Please convert data first');
        return;
    }
    
    const js = PointsConverter.generateJavaScriptCode(window.lastConversionResult);
    const blob = new Blob([js], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'warhammer-40k-points.js';
    a.click();
    URL.revokeObjectURL(url);
};

// Make it globally available
window.PointsConverter = PointsConverter;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointsConverter;
}

console.log('PointsConverter loaded - PDF to structured data conversion utility ready');
