// filename: config.js
// Centralized Configuration for 40k Crusade Campaign Tracker
// Update all your URLs and IDs here instead of scattered throughout the codebase

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
        
        // Placeholder for future sheets
        battleHistory: {
            url: null, // Add when you create battle history tracking
            sheetId: '1ybyOYvN_7hHJ2lT5iK3wMOuY3grlUwGTooxbttgmJyk',
            sheetName: 'Battle History'
        },
        
        charactersUnits: {
            url: null, // Add when you create character/unit tracking
            sheetId: null,
            sheetName: 'Characters and Units'
        },
        
        stories: {
            url: null, // Add when you create stories tracking
            sheetId: null,
            sheetName: 'Stories'
        },
        
        forceLogs: {
            url: null, // Add when you create force logs tracking
            sheetId: null,
            sheetName: 'Force Logs'
        }
    },
    
    // Application Configuration
    app: {
        name: '40k Crusade Campaign Tracker',
        version: '1.0.0',
        
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
        
        // Dynamic patterns
        forceDetailsPattern: 'forces/force-details.html?force={force}',
        crusadeDetailsPattern: 'crusades/crusade-details.html?crusade={crusade}',
        
        // External links
        addForceForm: 'https://docs.google.com/forms/d/e/1FAIpQLSf0CasoHdP0VuxvBaEbmAxc2Tsi0AeA1saHBa1EMfC4do4EOw/viewform?usp=dialog'
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
    
    buildForceUrl(forceName, basePath = '') {
        const encodedName = encodeURIComponent(forceName);
        if (basePath) {
            return `${basePath}${this.routes.forceDetailsPattern.replace('{force}', encodedName)}`;
        }
        return this.routes.forceDetailsPattern.replace('{force}', encodedName);
    },
    
    buildCrusadeUrl(crusadeName, basePath = '') {
        const encodedName = encodeURIComponent(crusadeName);
        if (basePath) {
            return `${basePath}${this.routes.crusadeDetailsPattern.replace('{crusade}', encodedName)}`;
        }
        return this.routes.crusadeDetailsPattern.replace('{crusade}', encodedName);
    },
    
    // Build force URL from different directories
    buildForceUrlFromRoot(forceName) {
        return this.buildForceUrl(forceName, '');
    },
    
    buildForceUrlFromSubdir(forceName) {
        return this.buildForceUrl(forceName, '../');
    },
    
    // Build crusade URL from different directories
    buildCrusadeUrlFromRoot(crusadeName) {
        return this.buildCrusadeUrl(crusadeName, '');
    },
    
    buildCrusadeUrlFromSubdir(crusadeName) {
        return this.buildCrusadeUrl(crusadeName, '../');
    },
    
    // Debug method to check config integrity
    debugConfig() {
        console.log('CrusadeConfig debug:');
        console.log('- Cache object:', this.cache);
        console.log('- Sheets object:', this.sheets);
        console.log('- Routes object:', this.routes);
        console.log('- App object:', this.app);
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
        // Ensure cache object exists
        if (!this.app.cache) {
            console.warn('Cache configuration not found, using default value');
            return 1440; // 24 hours default
        }
        
        // Handle the mapping from type to cache property
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
        
        const cacheValue = this.app.cache[cacheKey];
        if (cacheValue === undefined) {
            console.warn(`Cache key '${cacheKey}' not found, using default`);
            return this.app.cache.defaultMinutes || 1440;
        }
        
        return cacheValue;
    }
};

// Make it globally available
window.CrusadeConfig = CrusadeConfig;

// Export for use in modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrusadeConfig;
}

console.log('CrusadeConfig loaded:', CrusadeConfig.app.name, 'v' + CrusadeConfig.app.version);