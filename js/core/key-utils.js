// filename: key-utils.js
// Utility functions for creating consistent, robust keys from multiple columns
// 40k Crusade Campaign Tracker

const KeyUtils = {
    /**
     * Create a human-readable key from multiple values
     * Uses pipe separation for readability: "Force Name|Player Name|2024-01-01T12:00:00.000Z"
     * 
     * @param {Object} keyData - Object with field names as keys and values
     * @returns {string} - Pipe-separated key
     */
    createKey(keyData) {
        // Sort fields alphabetically for consistency
        const sortedFields = Object.keys(keyData).sort();
        
        // Create pipe-separated format
        const keyParts = sortedFields.map(field => {
            return this.normalizeValue(keyData[field]);
        });
        
        return keyParts.join('|');
    },
    
    /**
     * Parse a key back to its original components
     * @param {string} key - Pipe-separated key
     * @param {Array} fieldNames - Array of field names in the same order as the key was created
     * @returns {Object} - Object with field names and values
     */
    parseKey(key, fieldNames) {
        try {
            const parts = key.split('|');
            const keyData = {};
            
            fieldNames.forEach((fieldName, index) => {
                if (index < parts.length) {
                    keyData[fieldName] = parts[index];
                }
            });
            
            return keyData;
        } catch (error) {
            console.error('Error parsing key:', error);
            return null;
        }
    },
    
    /**
     * Normalize a value for consistent key generation
     * @param {any} value - Value to normalize
     * @returns {string} - Normalized string value
     */
    normalizeValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        if (value instanceof Date) {
            // Use ISO string for dates to ensure consistency
            return value.toISOString();
        }
        
        // Convert to string and trim whitespace
        // Also escape pipes to prevent key corruption
        return String(value).trim().replace(/\|/g, '&#124;');
    },
    
    /**
     * Create a key specifically for Crusade Forces
     * @param {string} forceName - Name of the force
     * @param {string} userName - Name of the user/player
     * @param {Date|string} timestamp - Timestamp when force was created
     * @returns {string} - Pipe-separated key: "forceName|userName|timestamp"
     */
    createForceKey(forceName, userName, timestamp) {
        // Always use the same field order for force keys
        return this.createKey({
            forceName: forceName,
            timestamp: timestamp,  // Put timestamp second for easier reading
            userName: userName
        });
    },
    
    /**
     * Parse a force key back to its components
     * @param {string} key - Force key to parse
     * @returns {Object} - Object with forceName, userName, timestamp
     */
    parseForceKey(key) {
        return this.parseKey(key, ['forceName', 'timestamp', 'userName']);
    },
    
    /**
     * Create a key specifically for Crusades
     * @param {string} crusadeName - Name of the crusade
     * @param {Date|string} startDate - Start date of the crusade (optional)
     * @returns {string} - Pipe-separated key
     */
    createCrusadeKey(crusadeName, startDate = null) {
        if (startDate) {
            return this.createKey({
                crusadeName: crusadeName,
                startDate: startDate
            });
        } else {
            return this.normalizeValue(crusadeName);
        }
    },
    
    /**
     * Create a key for Crusade Participants
     * @param {string} crusadeName - Name of the crusade
     * @param {string} forceKey - Key of the participating force
     * @returns {string} - Pipe-separated key
     */
    createParticipantKey(crusadeName, forceKey) {
        return this.createKey({
            crusadeName: crusadeName,
            forceKey: forceKey
        });
    },
    
    /**
     * Extract force name from a force key
     * @param {string} forceKey - The force key
     * @returns {string} - Force name
     */
    getForceNameFromKey(forceKey) {
        const parsed = this.parseForceKey(forceKey);
        return parsed ? parsed.forceName : 'Unknown Force';
    },
    
    /**
     * Extract user name from a force key
     * @param {string} forceKey - The force key
     * @returns {string} - User name
     */
    getUserNameFromKey(forceKey) {
        const parsed = this.parseForceKey(forceKey);
        return parsed ? parsed.userName : 'Unknown User';
    },
    
    /**
     * Get a display name for a force key
     * @param {string} forceKey - The force key
     * @returns {string} - Display format: "Force Name (User Name)"
     */
    getForceDisplayName(forceKey) {
        const parsed = this.parseForceKey(forceKey);
        if (parsed && parsed.forceName && parsed.userName) {
            return `${parsed.forceName} (${parsed.userName})`;
        }
        return forceKey; // Fallback to showing the key itself
    },
    
    /**
     * Validate that a key follows the expected format
     * @param {string} key - Key to validate
     * @param {number} expectedParts - Expected number of pipe-separated parts
     * @returns {boolean} - True if key is valid
     */
    isValidKey(key, expectedParts = null) {
        if (!key || typeof key !== 'string') {
            return false;
        }
        
        if (expectedParts !== null) {
            const parts = key.split('|');
            return parts.length === expectedParts;
        }
        
        return true;
    },
    
    /**
     * Create a short version of a key for compact display
     * @param {string} key - Full key
     * @param {number} maxLength - Maximum length (default 50)
     * @returns {string} - Shortened key with ellipsis if needed
     */
    getShortKey(key, maxLength = 50) {
        if (!key || key.length <= maxLength) {
            return key;
        }
        
        return key.substring(0, maxLength - 3) + '...';
    }
};

// Make globally available
window.KeyUtils = KeyUtils;

// Export for use in modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyUtils;
}

console.log('KeyUtils loaded - human-readable key system available');