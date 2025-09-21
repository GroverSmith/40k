// filename: battle-gas-script.js
// Google Apps Script for Battle History Sheet - Standardized API responses
// Deploy this as a web app to handle battle report submissions and retrieval

const SPREADSHEET_ID = '1ybyOYvN_7hHJ2lT5iK3wMOuY3grlUwGTooxbttgmJyk';
const SHEET_NAME = 'battles';

// Helper function to filter out deleted rows
function filterActiveRows(data) {
  if (!data || data.length <= 1) return data;

  const headers = data[0];
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');

  // If no deleted_timestamp column, return all data
  if (deletedTimestampIndex === -1) return data;

  // Filter to only include rows where deleted_timestamp is empty
  const activeRows = [headers].concat(
    data.slice(1).filter(row => !row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')
  );

  return activeRows;
}

// Legacy functions removed - now using standardized object format

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate unique battle key using UUID
function generateBattleKey() {
  return generateUUID();
}

// Edit function - updates an existing battle record
function editBattle(battleKey, userKey, data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const battleKeyIndex = headers.indexOf('battle_key');
  const userKeyIndex = headers.indexOf('user_key');
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find the row to update (must match both battle_key and user_key)
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[battleKeyIndex] === battleKey && row[userKeyIndex] === userKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Battle not found or access denied');
  }
  
  // Prepare updated row data
  const timestamp = new Date();
  const updatedRowData = [
    battleKey,                     // battle_key (Primary Key) - Column 0
    userKey,                       // user_key_1 - Column 1
    data.user_key_2 || '',         // user_key_2 - Column 2
    data.crusade_key || '',        // crusade_key - Column 3
    data.victor_force_key || '',   // victor_force_key - Column 4
    data.battle_type || 'Primary Battle', // battle_type - Column 5
    data.battle_size || '',        // battle_size - Column 6
    data.force_key_1 || '',        // force_key_1 - Column 7
    data.force_key_2 || '',        // force_key_2 - Column 8
    data.date_played || '',        // date_played - Column 9
    data.player_1 || '',           // player_1 - Column 10
    data.force_1 || '',            // force_1 - Column 11
    data.army_1 || '',             // army_1 - Column 12
    data.player_2 || '',           // player_2 - Column 13
    data.force_2 || '',            // force_2 - Column 14
    data.army_2 || '',             // army_2 - Column 15
    data.victor || '',             // victor - Column 16
    data.player_1_score || '',     // player_1_score - Column 17
    data.player_2_score || '',     // player_2_score - Column 18
    data.battle_name || '',        // battle_name - Column 19
    data.summary_notes || '',      // summary_notes - Column 20
    data.force_1_pov || '',        // force_1_pov - Column 21
    data.force_2_pov || '',        // force_2_pov - Column 22
    timestamp,                     // timestamp - Column 23
    ''                             // deleted_timestamp - Column 24 (keep empty)
  ];
  
  // Update the row
  sheet.getRange(rowIndex, 1, 1, updatedRowData.length).setValues([updatedRowData]);
  sheet.getRange(rowIndex, 20).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  
  return { success: true, message: 'Battle updated successfully' };
}

// Delete function - soft deletes a battle record
function deleteBattle(battleKey, userKey) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const battleKeyIndex = headers.indexOf('battle_key');
  const userKeyIndex = headers.indexOf('user_key');
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find the row to delete (must match both battle_key and user_key)
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[battleKeyIndex] === battleKey && row[userKeyIndex] === userKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Battle not found or access denied');
  }
  
  // Set deleted timestamp
  const deletedTimestamp = new Date();
  sheet.getRange(rowIndex, deletedTimestampIndex + 1).setValue(deletedTimestamp);
  sheet.getRange(rowIndex, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  
  return { success: true, message: 'Battle deleted successfully' };
}

function doPost(e) {
  try {
    console.log('doPost called for battle report');
    console.log('Parameters:', e.parameter);

    let data;

    if (e.parameter) {
      data = e.parameter;
    } else if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonError) {
        throw new Error('Invalid data format');
      }
    } else {
      throw new Error('No data received');
    }

    // Handle different operations
    if (data.operation === 'edit') {
      if (!data.battle_key || !data.user_key) {
        throw new Error('battle_key and user_key are required for edit operation');
      }
      const result = editBattle(data.battle_key, data.user_key, data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'delete') {
      if (!data.battle_key || !data.user_key) {
        throw new Error('battle_key and user_key are required for delete operation');
      }
      const result = deleteBattle(data.battle_key, data.user_key);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default operation is create
    // Validate required fields
    const required = ['force1Key', 'force2Key', 'datePlayed', 'player1', 'player2'];
    const missing = required.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error('Missing required fields: ' + missing.join(', '));
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating Battle History sheet');
      sheet = spreadsheet.insertSheet(SHEET_NAME);

      const headers = [
        'battle_key',
        'user_key_1',
        'user_key_2',
        'crusade_key',
        'victor_force_key',
        'battle_type',
        'battle_size',
        'force_key_1',
        'force_key_2',
        'date_played',
        'player_1',
        'force_1',
        'army_1',
        'player_2',
        'force_2',
        'army_2',
        'victor',
        'player_1_score',
        'player_2_score',
        'battle_name',
        'summary_notes',
        'force_1_pov',
        'force_2_pov',
        'timestamp',
        'deleted_timestamp'
      ];

      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');

      // Set column widths
      sheet.setColumnWidth(1, 150); // battle_key
      sheet.setColumnWidth(2, 150); // user_key_1
      sheet.setColumnWidth(3, 150); // user_key_2
      sheet.setColumnWidth(4, 150); // crusade_key
      sheet.setColumnWidth(5, 150); // victor_force_key
      sheet.setColumnWidth(6, 120); // battle_type
      sheet.setColumnWidth(7, 100); // battle_size
      sheet.setColumnWidth(8, 150); // force_key_1
      sheet.setColumnWidth(9, 150); // force_key_2
      sheet.setColumnWidth(10, 100); // date_played
      sheet.setColumnWidth(11, 120); // player_1
      sheet.setColumnWidth(12, 150); // force_1
      sheet.setColumnWidth(13, 150); // army_1
      sheet.setColumnWidth(14, 120); // player_2
      sheet.setColumnWidth(15, 150); // force_2
      sheet.setColumnWidth(16, 150); // army_2
      sheet.setColumnWidth(17, 100); // victor
      sheet.setColumnWidth(18, 80); // player_1_score
      sheet.setColumnWidth(19, 80); // player_2_score
      sheet.setColumnWidth(20, 200); // battle_name
      sheet.setColumnWidth(21, 300); // summary_notes
      sheet.setColumnWidth(22, 300); // force_1_pov
      sheet.setColumnWidth(23, 300); // force_2_pov
      sheet.setColumnWidth(24, 150); // timestamp
      sheet.setColumnWidth(25, 150); // deleted_timestamp
    }

    // Generate unique key
    const battleKey = generateBattleKey();
    console.log('Generated battle key:', battleKey);

    // Parse timestamp
    const timestamp = new Date();

    // Determine victor and victor force key
    let victor = data.victor || '';
    let victorForceKey = '';

    if (!victor && data.player1Score && data.player2Score) {
      const p1Score = parseInt(data.player1Score);
      const p2Score = parseInt(data.player2Score);
      if (p1Score > p2Score) {
        victor = data.player1;
        victorForceKey = data.force1Key;
      } else if (p2Score > p1Score) {
        victor = data.player2;
        victorForceKey = data.force2Key;
      } else {
        victor = 'Draw';
        victorForceKey = 'Draw';
      }
    } else if (victor === data.player1) {
      victorForceKey = data.force1Key;
    } else if (victor === data.player2) {
      victorForceKey = data.force2Key;
    } else if (victor === 'Draw') {
      victorForceKey = 'Draw';
    }


    // Prepare row data - must match header row order exactly
    const rowData = [
      battleKey,                    // Column 0: battle_key
      data.user_key_1 || '',        // Column 1: user_key_1
      data.user_key_2 || '',        // Column 2: user_key_2
      data.crusadeKey || '',        // Column 3: crusade_key
      victorForceKey,               // Column 4: victor_force_key
      data.battleType || 'Primary Battle', // Column 5: battle_type
      data.battleSize || '',        // Column 6: battle_size
      data.force1Key || '',         // Column 7: force_key_1
      data.force2Key || '',         // Column 8: force_key_2
      data.datePlayed || '',        // Column 9: date_played
      data.player1 || '',           // Column 10: player_1
      data.force1 || '',            // Column 11: force_1
      data.army1 || '',             // Column 12: army_1
      data.player2 || '',           // Column 13: player_2
      data.force2 || '',            // Column 14: force_2
      data.army2 || '',             // Column 15: army_2
      victor,                       // Column 16: victor
      data.player1Score || '',      // Column 17: player_1_score
      data.player2Score || '',      // Column 18: player_2_score
      data.battleName || '',        // Column 19: battle_name
      data.summaryNotes || '',      // Column 20: summary_notes
      timestamp,                    // Column 21: timestamp
      ''                            // Column 22: deleted_timestamp
    ];

    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;

    sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);

    // Format the new row
    sheet.getRange(newRowNumber, 1).setFontWeight('bold'); // battle_key
    sheet.getRange(newRowNumber, 10).setNumberFormat('yyyy-mm-dd'); // date_played
    sheet.getRange(newRowNumber, 22).setNumberFormat('yyyy-mm-dd hh:mm:ss'); // timestamp

    // Format score columns as numbers
    if (data.player1Score) {
      sheet.getRange(newRowNumber, 18).setNumberFormat('#,##0'); // player_1_score
    }
    if (data.player2Score) {
      sheet.getRange(newRowNumber, 19).setNumberFormat('#,##0'); // player_2_score
    }

    // Set text wrapping for notes column
    sheet.getRange(newRowNumber, 21).setWrap(true); // summary_notes

    console.log('Battle report saved successfully');

    // Note: Points log entries are now created by the battle form using the proper crusade points scheme
    // The gas script no longer creates points log entries to avoid duplication

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Battle report submitted successfully',
        key: battleKey,
        timestamp: timestamp.toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error processing battle report:', error);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Note: Points log entry creation has been moved to the battle form (battle-add.js)
// to use the proper crusade points scheme and avoid duplication

function doGet(e) {
  try {
    const action = e.parameter.action || 'list';

    switch(action) {
      case 'list':
        return getBattlesList(e.parameter);
      case 'get':
        return getBattleByKey(e.parameter.key);
      case 'recent':
        return getRecentBattles(e.parameter.limit);
      case 'delete':
        return softDeleteBattle(e.parameter.key);
      default:
        return getBattlesList(e.parameter);
    }

  } catch (error) {
    console.error('Error handling GET request:', error);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// UPDATED: Always return JSON with consistent structure
function getBattlesList(params = {}) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      // Return empty standardized format if sheet doesn't exist
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          count: 0,
          totalCount: 0,
          data: [],
          hasMore: false
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();

    // Filter out deleted rows
    const activeData = filterActiveRows(data);

    const headers = activeData[0];
    let rows = activeData.slice(1);
    
    console.log('getBattlesList - Total active rows found:', rows.length);
    console.log('getBattlesList - Headers:', headers);

    // Convert to objects with consistent field names
    const battles = rows.map((row) => {
      const obj = { 
        id: row[0], // Use the key as ID
        key: row[0], // Also include as 'key' for clarity
        Key: row[0]  // Include uppercase for compatibility
      };
      
      headers.forEach((header, headerIndex) => {
        obj[header] = row[headerIndex];
      });
      
      return obj;
    });

    console.log('getBattlesList - Returning battles with keys:', battles.map(battle => ({ 
      key: battle.key, 
      victor: battle['Victor'] || battle.victor,
      date: battle['Date Played'] || battle.date_played
    })));

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        count: battles.length,
        totalCount: battles.length,
        data: battles,
        hasMore: false
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting battles list:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getBattleByKey(battleKey) {
  if (!battleKey) {
    throw new Error('Battle key is required');
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error('Battle History sheet not found');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Check if row is deleted
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');

  // Find by key (column 0)
  const battleRow = data.find((row, index) => {
    if (index === 0) return false;
    // Check if not deleted
    if (deletedTimestampIndex !== -1 && row[deletedTimestampIndex]) return false;
    return row[0] === battleKey;
  });

  if (!battleRow) {
    throw new Error('Battle report not found or deleted');
  }

  // Convert to object with normalized headers
  const battle = {};
  headers.forEach((header, index) => {
    battle[header] = battleRow[index];
  });

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: battle
    }))
    .setMimeType(ContentService.MimeType.JSON);
}



function getRecentBattles(limit = 10) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        count: 0,
        totalCount: 0,
        data: [],
        hasMore: false
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  // Filter out deleted rows
  const activeData = filterActiveRows(data);

  // Convert to objects with normalized headers
  // Convert to objects with consistent field names
  const headers = activeData[0];
  let rows = activeData.slice(1);
  
  const allBattles = rows.map((row) => {
    const obj = { 
      id: row[0], // Use the key as ID
      key: row[0], // Also include as 'key' for clarity
      Key: row[0]  // Include uppercase for compatibility
    };
    
    headers.forEach((header, headerIndex) => {
      obj[header] = row[headerIndex];
    });
    
    return obj;
  });

  // Sort by timestamp (most recent first) and limit
  const battles = allBattles
    .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
    .slice(0, parseInt(limit));

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      count: battles.length,
      totalCount: allBattles.length,
      data: battles,
      hasMore: false
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Soft delete function
function softDeleteBattle(battleKey) {
  try {
    if (!battleKey) {
      throw new Error('Battle key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Battle History sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find deleted_timestamp column index
    let deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    // If column doesn't exist, throw error instead of adding it
    if (deletedTimestampIndex === -1) {
      throw new Error('deleted_timestamp column not found in sheet structure');
    }
    
    // Find the row with the matching key
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === battleKey) { // Key is in column 0
        // Set the Deleted Timestamp value
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(new Date());
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
        
        console.log('Soft deleted battle:', battleKey);
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'Battle soft deleted successfully',
            key: battleKey
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    throw new Error('Battle not found');
    
  } catch (error) {
    console.error('Error soft deleting battle:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}