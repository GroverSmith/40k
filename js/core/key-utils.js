// filename: js/core/key-utils.js
// Consolidated key generation utilities
// 40k Crusade Campaign Tracker

const KeyUtils = {
    /**
     * Generate force key from force name and user name
     */
    generateForceKey(forceName, userName) {
        const forcePart = this.sanitizeForKey(forceName, 20);
        const userPart = this.sanitizeForKey(userName, 15);
        return `${forcePart}_${userPart}`;
    },

    /**
     * Generate crusade key from crusade name
     */
    generateCrusadeKey(crusadeName) {
        return this.sanitizeForKey(crusadeName, 30);
    },

    /**
     * Generate army list key
     */
    generateArmyListKey(forceKey, armyName, sequence = 1) {
        const armyPart = this.sanitizeForKey(armyName, 15);
        const seqStr = String(sequence).padStart(2, '0');
        return `${forceKey}_${armyPart}_${seqStr}`;
    },

    /**
     * Generate unit key
     */
    generateUnitKey(forceKey, unitName) {
        const unitPart = this.sanitizeForKey(unitName, 20);
        const timestamp = Date.now();
        return `${forceKey}_${unitPart}_${timestamp}`;
    },

    /**
     * Generate story key
     */
    generateStoryKey(userKey, title) {
        const titlePart = this.sanitizeForKey(title, 20);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 6);
        return `${userKey}_${titlePart}_${timestamp}_${random}`;
    },

    /**
     * Generate battle key
     */
    generateBattleKey() {
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
        const suffix = Math.random().toString(36).substring(2, 6);
        return `${timestamp}_${suffix}`;
    },

    /**
     * Generate user key from name
     */
    generateUserKey(userName) {
        return this.sanitizeForKey(userName, 30);
    },

    /**
     * Extract user key from force key
     */
    extractUserKeyFromForceKey(forceKey) {
        if (!forceKey || !forceKey.includes('_')) return '';
        const parts = forceKey.split('_');
        return parts[parts.length - 1];
    },

    /**
     * Extract force name from force key
     */
    extractForceNameFromKey(forceKey) {
        if (!forceKey || !forceKey.includes('_')) return '';
        const parts = forceKey.split('_');
        return parts[0];
    },

    /**
     * Sanitize string for use in keys
     */
    sanitizeForKey(str, maxLength = 30) {
        if (!str) return '';
        return str
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, maxLength);
    },

    /**
     * Validate key format
     */
    isValidKey(key, type = 'generic') {
        if (!key || typeof key !== 'string') return false;

        switch (type) {
            case 'force':
                return /^[a-zA-Z0-9]+_[a-zA-Z0-9]+$/.test(key);
            case 'crusade':
                return /^[a-zA-Z0-9]+$/.test(key);
            case 'army':
                return /^[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9]+_\d+$/.test(key);
            case 'unit':
                return /^[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9]+_\d+$/.test(key);
            case 'battle':
                return /^\d{14}_[a-z0-9]+$/.test(key);
            default:
                return /^[a-zA-Z0-9_]+$/.test(key);
        }
    },

    /**
     * Parse composite key into components
     */
    parseKey(key) {
        if (!key) return null;

        const parts = key.split('_');

        // Try to identify key type and parse accordingly
        if (parts.length === 2 && /^\d{14}$/.test(parts[0])) {
            // Battle key
            return {
                type: 'battle',
                timestamp: parts[0],
                suffix: parts[1]
            };
        } else if (parts.length === 2) {
            // Force key
            return {
                type: 'force',
                forceName: parts[0],
                userName: parts[1]
            };
        } else if (parts.length === 4 && /^\d+$/.test(parts[3])) {
            // Army list or unit key
            return {
                type: 'composite',
                forceKey: `${parts[0]}_${parts[1]}`,
                entityName: parts[2],
                sequence: parts[3]
            };
        }

        return {
            type: 'unknown',
            raw: key,
            parts: parts
        };
    }
};

// Make globally available
window.KeyUtils = KeyUtils;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyUtils;
}