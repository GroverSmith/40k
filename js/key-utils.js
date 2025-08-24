// filename: key-utils.js
// Utility functions for creating consistent, robust keys from multiple columns
// 40k Crusade Campaign Tracker

const KeyUtils = {
    /**
     * Create a robust key from multiple values
     * Uses base64 encoding of a structured format to ensure uniqueness and handle special characters
     * Format: "field1:value1|field2:value2|field3:value3"
     * 
     * @param {Object} keyData - Object with field names as keys and values
     * @returns {string} - Base64 encoded key
     */
    createKey(keyData) {
        // Sort fields alphabetically for consistency
        const sortedFields = Object.keys(keyData).sort();
        
        // Create structured format
        const keyParts = sortedFields.map(field => {
            const value = this.normalizeValue(keyData[field]);
            return `${field}:${value}`;
        });
        
        const keyString = keyParts.join('|');
        
        // Base64 encode to handle special characters and make it URL-safe
        const encodedKey = btoa(unescape(encodeURIComponent(keyString)))
            .replace(/\+/g, '-')    // Make URL-safe
            .replace(/\//g, '_')    // Make URL-safe
            .replace(/=/g, '');     // Remove padding
        
        return encodedKey;
    },
    
    /**
     * Decode a key back to its original components
     * @param {string} key - Base64 encoded key
     * @returns {Object} - Object with field names and values
     */
    decodeKey(key) {
        try {
            // Restore base64 padding and characters
            let paddedKey = key.replace(/-/g, '+').replace(/_/g, '/');
            while (paddedKey.length % 4) {
                paddedKey += '=';
            }
            
            // Decode from base64
            const keyString = decodeURIComponent(escape(atob(paddedKey)));
            
            // Parse the structured format
            const keyData = {};
            const parts = keyString.split('|');
            
            parts.forEach(part => {
                const [field, ...valueParts] = part.split(':');
                keyData[field] = valueParts.join(':'); // Rejoin in case value had colons
            });
            
            return keyData;
        } catch (error) {
            console.error('Error decoding key:', error);
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
        return String(value).trim();
    },
    
    /**
     * Create a key specifically for Crusade Forces
     * @param {string} forceName - Name of the force
     * @param {string} userName - Name of the user/player
     * @param {Date|string} timestamp - Timestamp when force was created
     * @returns {string} - Encoded key
     */
    createForceKey(forceName, userName, timestamp) {
        return this.createKey({
            forceName: forceName,
            userName: userName,
            timestamp: timestamp
        });
    },
    
    /**
     * Create a key specifically for Crusades
     * @param {string} crusadeName - Name of the crusade
     * @param {Date|string} startDate - Start date of the crusade (optional)
     * @returns {string} - Encoded key
     */
    createCrusadeKey(crusadeName, startDate = null) {
        const keyData = { crusadeName: crusadeName };
        if (startDate) {
            keyData.startDate = startDate;
        }
        return this.createKey(keyData);
    },
    
    /**
     * Create a key for Crusade Participants
     * @param {string} crusadeName - Name of the crusade
     * @param {string} forceKey - Key of the participating force
     * @returns {string} - Encoded key
     */
    createParticipantKey(crusadeName, forceKey) {
        return this.createKey({
            crusadeName: crusadeName,
            forceKey: forceKey
        });
    },
    
    /**
     * Validate that a key can be properly decoded
     * @param {string} key - Key to validate
     * @returns {boolean} - True if key is valid
     */
    isValidKey(key) {
        const decoded = this.decodeKey(key);
        return decoded !== null;
    },
    
    /**
     * Generate a short hash for display purposes (not for uniqueness)
     * @param {string} key - Full key
     * @returns {string} - Short 8-character hash
     */
    getShortHash(key) {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36).substring(0, 8).toUpperCase();
    }
};

// Make globally available
window.KeyUtils = KeyUtils;

// Export for use in modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyUtils;
}

console.log('KeyUtils loaded - robust key encoding system available');