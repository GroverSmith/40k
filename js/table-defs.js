// filename: table-defs.js
// Table Definitions for 40k Crusade Campaign Tracker
// Contains all sheet configurations with their key definitions and column structures

const TableDefs = {
    // Main Forces sheet (simplified structure)
    forces: {
        url: 'https://script.google.com/macros/s/AKfycbw9gjWBeUEyKDpyB-TLOMrs5cmjrNV6EoaEV87LXfv-MfdquKVYGHCRLePsdOk9PIsz/exec',
        sheetId: '13n56kfJPSMoeV9VyiTXYajWT1LuBmnpj2oSwcek_osg',
        sheetName: 'Forces',
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
        columns: ['Key', 'User Name', 'Force Name', 'Faction', 'Detachment', 'Notes', 'Timestamp']
    },        
    
    // Crusades sheet (for campaign/crusade information)
    crusades: {
        url: 'https://script.google.com/macros/s/AKfycbyYInudtrcqZvk4BYepzUxEGSLRPkIUuQknOtUOL-I0Rl4LVDGqyD0QMso3ds_Cu_BqZw/exec',
        sheetId: '1Nzjg5YsL4i63r1cXVzVtF6AW3a2YseUCL_gV6tv9JmU',
        sheetName: 'Crusades',
        primaryKey: {
            columns: ['crusadeName'],
            formatter: (data) => {
                // Simple crusade key - just cleaned name
                return data.crusadeName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
            }
        },
        keyColumn: 0,
        columns: ['Key', 'State', 'Crusade Name', 'Crusade Type', 'Start Date', 'End Date', 
                 'Introduction', 'Rules Block 1', 'Rules Block 2', 'Rules Block 3', 
                 'Narrative Block 1', 'Narrative Block 2']
    },
    
    // Army Lists sheet (for army list submissions and retrieval)
    armyLists: {
        url: 'https://script.google.com/macros/s/AKfycbxjF1xuneyqEQCcPM6iGQ9CZHyAyUeH8834gUnX6c-wgSQbghhj2kYAeDcETs0K5KQ/exec',
        sheetId: '1f_tnBT7tNLc4HtJpcOclg829vg0hahYayXcuIBcPrXE',
        sheetName: 'Army Lists',
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
        columns: ['Key', 'Force Key', 'Timestamp', 'User Name', 'Force Name', 'Army Name', 
                 'Faction', 'Detachment', 'MFM Version', 'Points Value', 'Notes', 'Army List Text']
    },
    
    // Crusade Participants sheet (mapping forces to crusades)
    crusadeParticipants: {
        url: 'https://script.google.com/macros/s/AKfycbx79dYbG5yCDKa-kz0iKPlJowWekbJkhmJRNIJ5b0HjcVfV1JXrJqqeIejxDpHoWzsIZg/exec',
        sheetId: '17jJO939FWthVaLCO091CQzx0hAmtNn8zE5zlqBf10JQ',
        sheetName: 'Participants',
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
        columns: ['Key', 'Crusade Key', 'Force Key', 'Crusade Name', 'Force Name', 
                 'User Name', 'Timestamp']
    },
    
    // Users sheet (for user management)
    users: {
        url: 'https://script.google.com/macros/s/AKfycbzbIx-wGm2hxFzLClVPWTwA6YeFfJvQaPkr6A5IQJom6jqYab-4DHJ_JeBgVDDgG0s/exec', 
        sheetId: '15q9EIPz2PswXwNsZ0aJAb9mgT0qy_NXUUQqELEdx3W4',
        sheetName: 'Users',
        primaryKey: {
            columns: ['name'],
            formatter: (data) => {
                // Simple user key - just cleaned name
                return data.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
            }
        },
        keyColumn: 0,
        columns: ['Key', 'Timestamp', 'Name', 'Discord Handle', 'Email', 'Notes', 
                 'Self Rating', 'Years Experience', 'Games Per Year']
    },
    
    
    battleHistory: {
        url: 'https://script.google.com/macros/s/AKfycbyO76bOvui0w5SgGfDQEpBw1nt9PGZXDNnlzTY_l84-PkMWOm-Y86A2hjC05x-Fn2D_/exec',
        sheetId: '1ybyOYvN_7hHJ2lT5iK3wMOuY3grlUwGTooxbttgmJyk',
        sheetName: 'Battle History'
    },
    
    units: {
        url: 'https://script.google.com/macros/s/AKfycbz7xVqEw5qHx9r_fHTmIe8D5tSjL6b_LPxTqP3wzGH5KNMUI_ATXnSlzBQX0DzYyuBNXw/exec',
        sheetId: '1u23pjxHFD5Z0bv8Tw_erlEo50f71gYtGCKSe0ukhtfA',
        sheetName: 'Units'
    },
    
    stories: {
        url: 'https://script.google.com/macros/s/AKfycbza1Ir9QjydYpiUA3C4YXcJdeXd15gZ5HVuSk_mLnyMoyNmcUhQ82c49gHP5qSEp5Xp/exec',
        sheetId: '1Abqj7jWKzeupZMBF48GgSWG-u1kpPKsQfXHrzIw2uwQ',
        sheetName: 'Stories',
        primaryKey: {
            columns: ['userKey', 'title', 'timestamp'],
            separator: '_',
            formatter: (data) => {
                // Use user key as base, add title and timestamp
                const titlePart = data.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
                const timestamp = new Date().getTime();
                const random = Math.random().toString(36).substring(2, 6);
                return `${data.userKey}_${titlePart}_${timestamp}_${random}`;
            }
        },
        foreignKeys: {
            userKey: 'users',
            forceKey: 'forces',
            crusadeKey: 'crusades'
        },
        keyColumn: 0,
        columns: ['Key', 'Timestamp', 'User Key', 'Force Key', 'Crusade Key', 
                 'Story Type', 'Title', 'Imperial Date', 'Story Text 1', 
                 'Story Text 2', 'Story Text 3', 'Text Link', 'Image 1', 
                 'Image 2', 'Image 3', 'Audio Link', 'Deleted Timestamp']
    },

    storyForces: {
        url: 'https://script.google.com/macros/s/AKfycbx1KvSAWcliHW0xTxq4kP9cJn2yeW9Oh72nHb7c7q8ThdRWx5ZS6lA_8hyW-yqufqw/exec',
        sheetId: '16IHkhSjjHZoxGFS96VK4Rzpf4xOwU8620R-MNKnxy-0',
        sheetName: 'Story_Forces',
        columns: ['Story Key', 'Force Key', 'Timestamp', 'Deleted Timestamp'],
    },

    storyUnits: {
        url: '',
        sheetId: '1YbPSfXMJro_x9d1W18RyZ4MQyfhoOwjgtDR0RhSju1E',
        sheetName: 'Story_Units',
        columns: ['Story Key', 'Unit Key', 'Timestamp', 'Deleted Timestamp']
    },
    
    forceLogs: {
        url: null,
        sheetId: null,
        sheetName: 'Force Logs'
    },

    // Key Generation Helper Function
    generateKey(sheetType, data) {
        const sheet = this[sheetType];
        if (!sheet || !sheet.primaryKey) {
            throw new Error(`No key definition found for sheet type: ${sheetType}`);
        }
        
        return sheet.primaryKey.formatter(data);
    }
};

// Make it globally available
window.TableDefs = TableDefs;

// Export for use in modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableDefs;
}

console.log('TableDefs loaded with', Object.keys(TableDefs).length, 'table definitions');
