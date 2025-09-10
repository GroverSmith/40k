// filename: table-defs.js
// Table Definitions for 40k Crusade Campaign Tracker
// Contains all sheet configurations with their URLs and sheet information

const TableDefs = {

    users: {
        url: 'https://script.google.com/macros/s/AKfycbzbIx-wGm2hxFzLClVPWTwA6YeFfJvQaPkr6A5IQJom6jqYab-4DHJ_JeBgVDDgG0s/exec', 
        sheetId: '15q9EIPz2PswXwNsZ0aJAb9mgT0qy_NXUUQqELEdx3W4',
        sheetName: 'users',
        primaryKey: 'user_key',
        columns: [
            'user_key', 'name', 'discord_handle', 'email', 'notes', 
            'composite_rating', 'self_rating', 'years_experience', 'games_per_year', 
            'timestamp', 'deleted_timestamp'
        ]
    },
    
    crusades: {
        url: 'https://script.google.com/macros/s/AKfycbyYInudtrcqZvk4BYepzUxEGSLRPkIUuQknOtUOL-I0Rl4LVDGqyD0QMso3ds_Cu_BqZw/exec',
        sheetId: '1Nzjg5YsL4i63r1cXVzVtF6AW3a2YseUCL_gV6tv9JmU',
        sheetName: 'crusades',
        primaryKey: 'crusade_key',
        columns: [
            'crusade_key', 'state', 'crusade_name', 'crusade_type', 'start_date', 'end_date',
            'introduction', 'rules_block_1', 'rules_block_2', 'rules_block_3',
            'narrative_block_1', 'narrative_block_2', 'deleted_timestamp'
        ]
    },
    
    forces: {
        url: 'https://script.google.com/macros/s/AKfycbw9gjWBeUEyKDpyB-TLOMrs5cmjrNV6EoaEV87LXfv-MfdquKVYGHCRLePsdOk9PIsz/exec',
        sheetId: '13n56kfJPSMoeV9VyiTXYajWT1LuBmnpj2oSwcek_osg',
        sheetName: 'forces',
        primaryKey: 'force_key',
        columns: [
            'force_key', 'user_key', 'user_name', 'force_name', 'faction', 
            'detachment', 'notes', 'timestamp', 'deleted_timestamp'
        ]
    },  
    
    armies: {
        url: 'https://script.google.com/macros/s/AKfycbxjF1xuneyqEQCcPM6iGQ9CZHyAyUeH8834gUnX6c-wgSQbghhj2kYAeDcETs0K5KQ/exec',
        sheetId: '1f_tnBT7tNLc4HtJpcOclg829vg0hahYayXcuIBcPrXE',
        sheetName: 'armies',
        primaryKey: 'army_key',
        columns: [
            'army_key', 'force_key', 'user_key', 'user_name', 'force_name', 'army_name',
            'faction', 'detachment', 'mfm_version', 'points_value', 'notes', 
            'army_list_text', 'timestamp', 'deleted_timestamp'
        ]
    },
    
    // Crusade Participants sheet (mapping forces to crusades)
    xref_crusade_participants: {
        url: 'https://script.google.com/macros/s/AKfycbx79dYbG5yCDKa-kz0iKPlJowWekbJkhmJRNIJ5b0HjcVfV1JXrJqqeIejxDpHoWzsIZg/exec',
        sheetId: '17jJO939FWthVaLCO091CQzx0hAmtNn8zE5zlqBf10JQ',
        sheetName: 'xref_crusade_participants',
        primaryKey: 'crusade_key', // Single field for simple lookups
        compositeKey: ['crusade_key', 'force_key'], // Composite key for uniqueness
        columns: [
            'crusade_key', 'force_key', 'user_key', 'crusade_name', 'force_name', 
            'user_name', 'timestamp', 'deleted_timestamp'
        ]
    },        
    
    battle_history: {
        url: 'https://script.google.com/macros/s/AKfycbyO76bOvui0w5SgGfDQEpBw1nt9PGZXDNnlzTY_l84-PkMWOm-Y86A2hjC05x-Fn2D_/exec',
        sheetId: '1ybyOYvN_7hHJ2lT5iK3wMOuY3grlUwGTooxbttgmJyk',
        sheetName: 'battles',
        primaryKey: 'battle_key',
        columns: [
            'battle_key', 'user_key_1', 'user_key_2', 'crusade_key', 'victor_force_key', 'battle_size',
            'force_key_1', 'force_key_2', 'date_played', 'player_1', 'force_1', 'army_1',
            'player_2', 'force_2', 'army_2', 'victor', 'player_1_score', 'player_2_score',
            'battle_name', 'summary_notes', 'timestamp', 'deleted_timestamp'
        ]
    },
    
    units: {
        url: 'https://script.google.com/macros/s/AKfycbz7xVqEw5qHx9r_fHTmIe8D5tSjL6b_LPxTqP3wzGH5KNMUI_ATXnSlzBQX0DzYyuBNXw/exec',
        sheetId: '1u23pjxHFD5Z0bv8Tw_erlEo50f71gYtGCKSe0ukhtfA',
        sheetName: 'units',
        primaryKey: 'unit_key',
        columns: [
            'unit_key', 'user_key', 'force_key', 'data_sheet', 'unit_name', 'unit_type',
            'mfm_version', 'points', 'crusade_points', 'wargear', 'enhancements', 'relics',
            'battle_traits', 'battle_scars', 'battle_count', 'xp', 'rank', 'kill_count',
            'times_killed', 'description', 'notable_history', 'notes', 'timestamp', 'deleted_timestamp'
        ]
    },
    
    stories: {
        url: 'https://script.google.com/macros/s/AKfycbza1Ir9QjydYpiUA3C4YXcJdeXd15gZ5HVuSk_mLnyMoyNmcUhQ82c49gHP5qSEp5Xp/exec',
        sheetId: '1Abqj7jWKzeupZMBF48GgSWG-u1kpPKsQfXHrzIw2uwQ',
        sheetName: 'stories',
        primaryKey: 'story_key',
        columns: [
            'story_key', 'user_key', 'author_name', 'crusade_key', 'battle_key', 'story_type', 'title', 'imperial_date',
            'story_text_1', 'story_text_2', 'story_text_3', 'text_link', 'image_1', 'image_2',
            'image_3', 'audio_link', 'timestamp', 'deleted_timestamp'
        ]
    },

    xref_story_forces: {
        url: 'https://script.google.com/macros/s/AKfycbx1KvSAWcliHW0xTxq4kP9cJn2yeW9Oh72nHb7c7q8ThdRWx5ZS6lA_8hyW-yqufqw/exec',
        sheetId: '16IHkhSjjHZoxGFS96VK4Rzpf4xOwU8620R-MNKnxy-0',
        sheetName: 'xref_story_forces',
        primaryKey: 'story_key', // Single field for simple lookups
        compositeKey: ['story_key', 'force_key'], // Composite key for uniqueness
        columns: [
            'story_key', 'force_key', 'timestamp', 'deleted_timestamp'
        ]
    },

    xref_story_armies: {
        url: 'https://script.google.com/macros/s/AKfycbxoq8MfSkxpVjVQhuFx8jiSRtEvuoRtU-k95Wrl_8SLw-KgeNsVs7Vp9EwjT4L2T2nX/exec',
        sheetId: '1YJWI_EiRj2O1mbujWnhh5coUDD2kehA5YUMOFOvEX9Q',
        sheetName: 'xref_story_armies',
        primaryKey: 'story_key', // Single field for simple lookups
        compositeKey: ['story_key', 'army_key'], // Composite key for uniqueness
        columns: [
            'story_key', 'army_key', 'timestamp', 'deleted_timestamp'
        ]
    },

    xref_story_units: {
        url: 'https://script.google.com/macros/s/AKfycbzHfmILYbrf83JjdZkqaCHi5xfUif1oQo0EXGX9SztblPg0FXmXNiVxPYyE9E9ii2eE/exec',
        sheetId: '1YbPSfXMJro_x9d1W18RyZ4MQyfhoOwjgtDR0RhSju1E',
        sheetName: 'xref_story_units',
        primaryKey: 'story_key', // Single field for simple lookups
        compositeKey: ['story_key', 'unit_key'], // Composite key for uniqueness
        columns: [
            'story_key', 'unit_key', 'timestamp', 'deleted_timestamp'
        ]
    }
};

// Utility functions for column mapping
TableDefs.getColumns = function(sheetName) {
    const sheet = this[sheetName];
    return sheet ? sheet.columns : null;
};

TableDefs.getPrimaryKey = function(sheetName) {
    const sheet = this[sheetName];
    return sheet ? sheet.primaryKey : null;
};

TableDefs.getCompositeKey = function(sheetName) {
    const sheet = this[sheetName];
    return sheet ? sheet.compositeKey : null;
};

TableDefs.getColumnIndex = function(sheetName, columnName) {
    const columns = this.getColumns(sheetName);
    return columns ? columns.indexOf(columnName) : -1;
};

TableDefs.getColumnName = function(sheetName, index) {
    const columns = this.getColumns(sheetName);
    return columns && index >= 0 && index < columns.length ? columns[index] : null;
};

TableDefs.mapRowToObject = function(sheetName, row) {
    const columns = this.getColumns(sheetName);
    if (!columns || !Array.isArray(row)) return null;
    
    const obj = {};
    columns.forEach((columnName, index) => {
        obj[columnName] = row[index] || '';
    });
    return obj;
};

TableDefs.mapObjectToRow = function(sheetName, obj) {
    const columns = this.getColumns(sheetName);
    if (!columns) return null;
    
    return columns.map(columnName => obj[columnName] || '');
};

// Make it globally available
window.TableDefs = TableDefs;

console.log('TableDefs loaded with', Object.keys(TableDefs).length, 'table definitions');