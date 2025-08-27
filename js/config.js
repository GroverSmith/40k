// filename: config.js
// Centralized Configuration for 40k Crusade Campaign Tracker
// Updated with composite key definitions

const CrusadeConfig = {
    // Google Sheets Configuration
    sheets: {
        // Main Forces sheet (simplified structure)
        forces: {
            url: 'https://script.google.com/macros/s/AKfycbw9gjWBeUEyKDpyB-TLOMrs5cmjrNV6EoaEV87LXfv-MfdquKVYGHCRLePsdOk9PIsz/exec',
            sheetId: '13n56kfJPSMoeV9VyiTXYajWT1LuBmnpj2oSwcek_osg',
            sheetName: 'Forces'
        },        
        
        // Crusades sheet (for campaign/crusade information)
        crusades: {
            url: 'https://script.google.com/macros/s/AKfycbyYInudtrcqZvk4BYepzUxEGSLRPkIUuQknOtUOL-I0Rl4LVDGqyD0QMso3ds_Cu_BqZw/exec',
            sheetId: '1Nzjg5YsL4i63r1cXVzVtF6AW3a2YseUCL_gV6tv9JmU',
            sheetName: 'Crusades'
        },
        
        // Army Lists sheet (for army list submissions and retrieval)
        armyLists: {
            url: 'https://script.google.com/macros/s/AKfycbxjF1xuneyqEQCcPM6iGQ9CZHyAyUeH8834gUnX6c-wgSQbghhj2kYAeDcETs0K5KQ/exec',
            sheetId: '1f_tnBT7tNLc4HtJpcOclg829vg0hahYayXcuIBcPrXE',
            sheetName: 'Army Lists'
        },
        
        // Crusade Participants sheet (mapping forces to crusades)
        crusadeParticipants: {
            url: 'https://script.google.com/macros/s/AKfycbx79dYbG5yCDKa-kz0iKPlJowWekbJkhmJRNIJ5b0HjcVfV1JXrJqqeIejxDpHoWzsIZg/exec',
            sheetId: '17jJO939FWthVaLCO091CQzx0hAmtNn8zE5zlqBf10JQ',
            sheetName: 'Participants'
        },
        
        // Users sheet (for user management)
        users: {
            url: 'https://script.google.com/macros/s/AKfycbzbIx-wGm2hxFzLClVPWTwA6YeFfJvQaPkr6A5IQJom6jqYab-4DHJ_JeBgVDDgG0s/exec', 
            sheetId: '15q9EIPz2PswXwNsZ0aJAb9mgT0qy_NXUUQqELEdx3W4',
            sheetName: 'Users'
        },
        
        
        battleHistory: {
            url: https://script.google.com/macros/s/AKfycbyO76bOvui0w5SgGfDQEpBw1nt9PGZXDNnlzTY_l84-PkMWOm-Y86A2hjC05x-Fn2D_/exec,
            sheetId: '1ybyOYvN_7hHJ2lT5iK3wMOuY3grlUwGTooxbttgmJyk',
            sheetName: 'Battle History'
        },
        
        charactersUnits: {
            url: null,
            sheetId: null,
            sheetName: 'Characters and Units'
        },
        
        stories: {
            url: null,
            sheetId: null,
            sheetName: 'Stories'
        },
        
        forceLogs: {
            url: null,
            sheetId: null,
            sheetName: 'Force Logs'
        }
    },
    
    // Key Definitions for Relational Structure
    keyDefinitions: {
        forces: {
            primaryKey: {
                columns: ['forceName', 'userName'],
                separator: '_',
                formatter: (data) => {
                    // Remove spaces and special characters, limit length for readability
                    const forcePart = data.forceName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
                    const userPart = data.userName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
                    return `${forcePart}_${userPart}`;
                }
            },
            keyColumn: 0,  // Key will be in column A (index 0)
            headers: ['Key', 'User Name', 'Force Name', 'Faction', 'Detachment', 'Notes', 'Timestamp']
        },
        
        armyLists: {
            primaryKey: {
                columns: ['forceKey', 'armyName', 'sequence'],
                separator: '_',
                formatter: (data) => {
                    // Use force key as base, add army name and sequence
                    const armyPart = data.armyName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
                    const seq = String(data.sequence || 1).padStart(2, '0');
                    return `${data.forceKey}_${armyPart}_${seq}`;
                }
            },
            foreignKeys: {
                forceKey: 'forces'  // References forces table
            },
            keyColumn: 0,
            headers: ['Key', 'Force Key', 'Timestamp', 'User Name', 'Force Name', 'Army Name', 
                     'Faction', 'Detachment', 'MFM Version', 'Points Value', 'Notes', 'Army List Text']
        },
        
        users: {
            primaryKey: {
                columns: ['name'],
                formatter: (data) => {
                    // Simple user key - just cleaned name
                    return data.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
                }
            },
            keyColumn: 0,
            headers: ['Key', 'Timestamp', 'Name', 'Discord Handle', 'Email', 'Notes', 
                     'Self Rating', 'Years Experience', 'Games Per Year']
        },
        
        crusades: {
            primaryKey: {
                columns: ['crusadeName'],
                formatter: (data) => {
                    // Simple crusade key - just cleaned name
                    return data.crusadeName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
                }
            },
            keyColumn: 0,
            headers: ['Key', 'State', 'Crusade Name', 'Crusade Type', 'Start Date', 'End Date', 
                     'Introduction', 'Rules Block 1', 'Rules Block 2', 'Rules Block 3', 
                     'Narrative Block 1', 'Narrative Block 2']
        },
        
        crusadeParticipants: {
            primaryKey: {
                columns: ['crusadeKey', 'forceKey'],
                separator: '_',
                formatter: (data) => {
                    // Composite key of crusade and force
                    return `${data.crusadeKey}_${data.forceKey}`;
                }
            },
            foreignKeys: {
                crusadeKey: 'crusades',
                forceKey: 'forces'
            },
            keyColumn: 0,
            headers: ['Key', 'Crusade Key', 'Force Key', 'Crusade Name', 'Force Name', 
                     'User Name', 'Timestamp']
        }
    },
    
    // Key Generation Helper Functions
    generateKey(sheetType, data) {
        const keyDef = this.keyDefinitions[sheetType];
        if (!keyDef || !keyDef.primaryKey) {
            throw new Error(`No key definition found for sheet type: ${sheetType}`);
        }
        
        return keyDef.primaryKey.formatter(data);
    },
    
    // Check if a key exists (would need to be called from GAS)
    validateKeyUniqueness(sheet, key, keyColumn = 0) {
        // This is pseudo-code for the GAS side
        // Would need to be implemented in the Google Apps Script
        return `
            const existingKeys = sheet.getRange(2, ${keyColumn + 1}, sheet.getLastRow() - 1, 1).getValues().flat();
            return !existingKeys.includes(key);
        `;
    },
    
    // Get the next sequence number for composite keys (for GAS)
    getNextSequence(sheet, baseKey, keyColumn = 0) {
        // This is pseudo-code for the GAS side
        return `
            const existingKeys = sheet.getRange(2, ${keyColumn + 1}, sheet.getLastRow() - 1, 1).getValues().flat();
            const matchingKeys = existingKeys.filter(k => k && k.startsWith(baseKey));
            if (matchingKeys.length === 0) return 1;
            
            const sequences = matchingKeys.map(k => {
                const parts = k.split('_');
                const seq = parseInt(parts[parts.length - 1]);
                return isNaN(seq) ? 0 : seq;
            });
            
            return Math.max(...sequences) + 1;
        `;
    },
    
    // Application Configuration
    app: {
        name: '40k Crusade Campaign Tracker',
        version: '2.0.0', // Bumped for key system implementation
        
        // Cache settings
        cache: {
            defaultMinutes: 1440, // 24 hours
            forcePageMinutes: 60,  // 1 hour for force pages
            armyListMinutes: 30    // 30 minutes for army lists
        },
        
        // Form validation settings
        validation: {
            armyList: {
                maxCharacters: 50000,
                minCharacters: 50,
                maxPointsValue: 5000
            },
            userName: {
                minLength: 2,
                maxLength: 100
            },
            forceName: {
                minLength: 3,
                maxLength: 100
            }
        },
        
        // UI Settings
        ui: {
            maxRowsPerPage: 50,
            defaultMaxHeight: '400px',
            animationDuration: 300
        }
    },
    
    // URL Patterns and Routes
    routes: {
        // Main pages
        home: 'index.html',
        forceDetails: 'forces/force-details.html',
        crusadeDetails: 'crusades/crusade-details.html',
        addArmyList: 'army-lists/add-army-list.html',
        
        // Dynamic patterns - now using keys instead of names
        forceDetailsPattern: 'forces/force-details.html?key={key}',
        crusadeDetailsPattern: 'crusades/crusade-details.html?key={key}',
        armyListViewPattern: 'army-lists/view-army-list.html?key={key}',
        
        // External links
        addForceForm: 'forces/add-force.html'
    },
    
    // 40k Game Data
    gameData: {
        factions: [
            'Adepta Sororitas',
            'Adeptus Custodes',
            'Adeptus Mechanicus',
            'Aeldari',
            'Agents of the Imperium',
            'Astra Militarum',
            'Blood Angels',
            'Chaos Daemons',
            'Chaos Knights',
            'Chaos Space Marines',
            'Dark Angels',
            'Death Guard',
            'Drukhari',
            'Genestealer Cults',
            'Grey Knights',
            'Imperial Knights',
            'Leagues of Votann',
            'Necrons',
            'Orks',
            'Space Marines',
            'Space Wolves',
            'T\'au Empire',
            'Thousand Sons',
            'Tyranids',
            'World Eaters'
        ],
        
        detachmentTypes: [
            'Patrol Detachment',
            'Battalion Detachment',
            'Brigade Detachment',
            'Vanguard Detachment',
            'Spearhead Detachment',
            'Outrider Detachment',
            'Supreme Command Detachment',
            'Fortification Network',
            'Auxiliary Support Detachment'
        ],
        
        mfmVersions: [
            '2024.1',
            '2024.2',
            '2023.3',
            '2023.2',
            '2023.1'
        ]
    },
    
    // Environment Detection
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    },
    
    // Helper Methods
    getSheetUrl(sheetName) {
        const sheet = this.sheets[sheetName];
        if (!sheet || !sheet.url) {
            console.warn(`Sheet configuration not found or URL missing for: ${sheetName}`);
            return null;
        }
        return sheet.url;
    },
    
    // Updated URL builders to use keys
    buildForceUrl(forceKey, basePath = '') {
        const encodedKey = encodeURIComponent(forceKey);
        if (basePath) {
            return `${basePath}${this.routes.forceDetailsPattern.replace('{key}', encodedKey)}`;
        }
        return this.routes.forceDetailsPattern.replace('{key}', encodedKey);
    },
    
    buildCrusadeUrl(crusadeKey, basePath = '') {
        const encodedKey = encodeURIComponent(crusadeKey);
        if (basePath) {
            return `${basePath}${this.routes.crusadeDetailsPattern.replace('{key}', encodedKey)}`;
        }
        return this.routes.crusadeDetailsPattern.replace('{key}', encodedKey);
    },
    
    buildArmyListUrl(armyListKey, basePath = '') {
        const encodedKey = encodeURIComponent(armyListKey);
        if (basePath) {
            return `${basePath}${this.routes.armyListViewPattern.replace('{key}', encodedKey)}`;
        }
        return this.routes.armyListViewPattern.replace('{key}', encodedKey);
    },
    
    // Build URLs from different directories
    buildForceUrlFromRoot(forceKey) {
        return this.buildForceUrl(forceKey, '');
    },
    
    buildForceUrlFromSubdir(forceKey) {
        return this.buildForceUrl(forceKey, '../');
    },
    
    buildCrusadeUrlFromRoot(crusadeKey) {
        return this.buildCrusadeUrl(crusadeKey, '');
    },
    
    buildCrusadeUrlFromSubdir(crusadeKey) {
        return this.buildCrusadeUrl(crusadeKey, '../');
    },
    
    // Debug method
    debugConfig() {
        console.log('CrusadeConfig debug:');
        console.log('- Version:', this.app.version);
        console.log('- Key definitions:', this.keyDefinitions);
        console.log('- Sheets:', this.sheets);
        console.log('- Routes:', this.routes);
    },
    
    // Get configuration for specific use cases
    getFormConfig() {
        return {
            maxCharacters: this.app.validation.armyList.maxCharacters,
            minCharacters: this.app.validation.armyList.minCharacters,
            factions: this.gameData.factions,
            detachments: this.gameData.detachmentTypes,
            mfmVersions: this.gameData.mfmVersions
        };
    },
    
    getCacheConfig(type = 'default') {
        if (!this.app.cache) {
            console.warn('Cache configuration not found, using default value');
            return 1440;
        }
        
        let cacheKey;
        switch(type) {
            case 'forcePage':
                cacheKey = 'forcePageMinutes';
                break;
            case 'armyList':
                cacheKey = 'armyListMinutes';
                break;
            case 'default':
            default:
                cacheKey = 'defaultMinutes';
                break;
        }
        
        return this.app.cache[cacheKey] || 1440;
    }
};

// Make it globally available
window.CrusadeConfig = CrusadeConfig;

// Export for use in modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrusadeConfig;
}

console.log('CrusadeConfig loaded:', CrusadeConfig.app.name, 'v' + CrusadeConfig.app.version);
console.log('Key system initialized for relational data management');