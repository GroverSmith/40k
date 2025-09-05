// filename: table-defs.js
// Table Definitions for 40k Crusade Campaign Tracker
// Contains all sheet configurations with their key definitions and column structures

const TableDefs = {
    // Main Forces sheet (simplified structure)
    forces: {
        url: 'https://script.google.com/macros/s/AKfycbw9gjWBeUEyKDpyB-TLOMrs5cmjrNV6EoaEV87LXfv-MfdquKVYGHCRLePsdOk9PIsz/exec',
        sheetId: '13n56kfJPSMoeV9VyiTXYajWT1LuBmnpj2oSwcek_osg',
        sheetName: 'forces',
        primaryKey: {
            columns: ['force_name', 'user_name'],
            separator: '_',
            formatter: (data) => {
                // Remove spaces and special characters, limit length for readability
                const forcePart = data.force_name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
                const userPart = data.user_name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
                return `${forcePart}_${userPart}`;
            }
        },
        foreignKeys: {
            user_key: 'users'  // References users table
        },
        keyColumn: 0,  // Key will be in column A (index 0)
        columns: ['key', 'user_key', 'user_name', 'force_name', 'faction', 'detachment', 'notes', 'timestamp', 'deleted_timestamp']
    },        
    
    // Crusades sheet (for campaign/crusade information)
    crusades: {
        url: 'https://script.google.com/macros/s/AKfycbyYInudtrcqZvk4BYepzUxEGSLRPkIUuQknOtUOL-I0Rl4LVDGqyD0QMso3ds_Cu_BqZw/exec',
        sheetId: '1Nzjg5YsL4i63r1cXVzVtF6AW3a2YseUCL_gV6tv9JmU',
        sheetName: 'crusades',
        primaryKey: {
            columns: ['crusade_name'],
            formatter: (data) => {
                // Simple crusade key - just cleaned name
                return data.crusade_name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
            }
        },
        keyColumn: 0,
        columns: ['key', 'state', 'crusade_name', 'crusade_type', 'start_date', 'end_date', 
                 'introduction', 'rules_block_1', 'rules_block_2', 'rules_block_3', 
                 'narrative_block_1', 'narrative_block_2']
    },
    
    // Army Lists sheet (for army list submissions and retrieval)
    army_lists: {
        url: 'https://script.google.com/macros/s/AKfycbxjF1xuneyqEQCcPM6iGQ9CZHyAyUeH8834gUnX6c-wgSQbghhj2kYAeDcETs0K5KQ/exec',
        sheetId: '1f_tnBT7tNLc4HtJpcOclg829vg0hahYayXcuIBcPrXE',
        sheetName: 'army_lists',
        primaryKey: {
            columns: ['force_key', 'army_name', 'sequence'],
            separator: '_',
            formatter: (data) => {
                // Use force key as base, add army name and sequence
                const armyPart = data.army_name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
                const seq = String(data.sequence || 1).padStart(2, '0');
                return `${data.force_key}_${armyPart}_${seq}`;
            }
        },
        foreignKeys: {
            force_key: 'forces'  // References forces table
        },
        keyColumn: 0,
        columns: ['key', 'force_key', 'timestamp', 'user_name', 'force_name', 'army_name', 
                 'faction', 'detachment', 'mfm_version', 'points_value', 'notes', 'army_list_text']
    },
    
    // Crusade Participants sheet (mapping forces to crusades)
    crusade_participants: {
        url: 'https://script.google.com/macros/s/AKfycbx79dYbG5yCDKa-kz0iKPlJowWekbJkhmJRNIJ5b0HjcVfV1JXrJqqeIejxDpHoWzsIZg/exec',
        sheetId: '17jJO939FWthVaLCO091CQzx0hAmtNn8zE5zlqBf10JQ',
        sheetName: 'crusade_participants',
        primaryKey: {
            columns: ['crusade_key', 'force_key'],
            separator: '_',
            formatter: (data) => {
                // Composite key of crusade and force
                return `${data.crusade_key}_${data.force_key}`;
            }
        },
        foreignKeys: {
            crusade_key: 'crusades',
            force_key: 'forces'
        },
        keyColumn: 0,
        columns: ['key', 'crusade_key', 'force_key', 'crusade_name', 'force_name', 
                 'user_name', 'timestamp']
    },
    
    // Users sheet (for user management)
    users: {
        url: 'https://script.google.com/macros/s/AKfycbzbIx-wGm2hxFzLClVPWTwA6YeFfJvQaPkr6A5IQJom6jqYab-4DHJ_JeBgVDDgG0s/exec', 
        sheetId: '15q9EIPz2PswXwNsZ0aJAb9mgT0qy_NXUUQqELEdx3W4',
        sheetName: 'users',
        primaryKey: {
            columns: ['name'],
            formatter: (data) => {
                // Simple user key - just cleaned name
                return data.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
            }
        },
        keyColumn: 0,
        columns: ['key', 'timestamp', 'name', 'discord_handle', 'email', 'notes', 
                 'self_rating', 'years_experience', 'games_per_year']
    },
    
    
    battle_history: {
        url: 'https://script.google.com/macros/s/AKfycbyO76bOvui0w5SgGfDQEpBw1nt9PGZXDNnlzTY_l84-PkMWOm-Y86A2hjC05x-Fn2D_/exec',
        sheetId: '1ybyOYvN_7hHJ2lT5iK3wMOuY3grlUwGTooxbttgmJyk',
        sheetName: 'battle_history'
    },
    
    units: {
        url: 'https://script.google.com/macros/s/AKfycbz7xVqEw5qHx9r_fHTmIe8D5tSjL6b_LPxTqP3wzGH5KNMUI_ATXnSlzBQX0DzYyuBNXw/exec',
        sheetId: '1u23pjxHFD5Z0bv8Tw_erlEo50f71gYtGCKSe0ukhtfA',
        sheetName: 'units'
    },
    
    stories: {
        url: 'https://script.google.com/macros/s/AKfycbza1Ir9QjydYpiUA3C4YXcJdeXd15gZ5HVuSk_mLnyMoyNmcUhQ82c49gHP5qSEp5Xp/exec',
        sheetId: '1Abqj7jWKzeupZMBF48GgSWG-u1kpPKsQfXHrzIw2uwQ',
        sheetName: 'stories',
        primaryKey: {
            columns: ['user_key', 'title', 'timestamp'],
            separator: '_',
            formatter: (data) => {
                // Use user key as base, add title and timestamp
                const titlePart = data.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
                const timestamp = new Date().getTime();
                const random = Math.random().toString(36).substring(2, 6);
                return `${data.user_key}_${titlePart}_${timestamp}_${random}`;
            }
        },
        foreignKeys: {
            user_key: 'users',
            force_key: 'forces',
            crusade_key: 'crusades'
        },
        keyColumn: 0,
        columns: ['key', 'timestamp', 'user_key', 'force_key', 'crusade_key', 
                 'story_type', 'title', 'imperial_date', 'story_text_1', 
                 'story_text_2', 'story_text_3', 'text_link', 'image_1', 
                 'image_2', 'image_3', 'audio_link', 'deleted_timestamp']
    },

    story_forces: {
        url: 'https://script.google.com/macros/s/AKfycbx1KvSAWcliHW0xTxq4kP9cJn2yeW9Oh72nHb7c7q8ThdRWx5ZS6lA_8hyW-yqufqw/exec',
        sheetId: '16IHkhSjjHZoxGFS96VK4Rzpf4xOwU8620R-MNKnxy-0',
        sheetName: 'story_forces',
        columns: ['story_key', 'force_key', 'timestamp', 'deleted_timestamp'],
    },

    story_units: {
        url: '',
        sheetId: '1YbPSfXMJro_x9d1W18RyZ4MQyfhoOwjgtDR0RhSju1E',
        sheetName: 'story_units',
        columns: ['story_key', 'unit_key', 'timestamp', 'deleted_timestamp']
    },
    
    force_logs: {
        url: null,
        sheetId: null,
        sheetName: 'force_logs'
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
