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

// Helper function to normalize headers for consistency
function normalizeHeaders(headers) {
  return headers.map(header => {
    // Normalize score fields to uppercase 'Score'
    if (header === 'Player 1 score') return 'Player 1 Score';
    if (header === 'Player 2 score') return 'Player 2 Score';
    return header;
  });
}

// Helper function to convert array data to objects with normalized headers
function convertToObjects(data) {
  if (!data || data.length <= 1) return [];

  const headers = normalizeHeaders(data[0]);
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

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
  const headers = normalizeHeaders(allData[0]);
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
    userKey,                       // user_key - Column 1
    data.crusade_key || '',        // crusade_key - Column 2
    data.victor_force_key || '',   // victor_force_key - Column 3
    data.battle_size || '',        // battle_size - Column 4
    data.force_key_1 || '',        // force_key_1 - Column 5
    data.force_key_2 || '',        // force_key_2 - Column 6
    data.date_played || '',        // date_played - Column 7
    data.player_1 || '',           // player_1 - Column 8
    data.force_1 || '',            // force_1 - Column 9
    data.army_1 || '',             // army_1 - Column 10
    data.player_2 || '',           // player_2 - Column 11
    data.force_2 || '',            // force_2 - Column 12
    data.army_2 || '',             // army_2 - Column 13
    data.victor || '',             // victor - Column 14
    data.player_1_score || '',     // player_1_score - Column 15
    data.player_2_score || '',     // player_2_score - Column 16
    data.battle_name || '',        // battle_name - Column 17
    data.summary_notes || '',      // summary_notes - Column 18
    timestamp,                     // timestamp - Column 19
    ''                             // deleted_timestamp - Column 20 (keep empty)
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
  const headers = normalizeHeaders(allData[0]);
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
        'user_key',
        'crusade_key',
        'victor_force_key',
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
      sheet.setColumnWidth(1, 150); // Key
      sheet.setColumnWidth(2, 150); // Timestamp
      sheet.setColumnWidth(3, 150); // Battle Size
      sheet.setColumnWidth(4, 150); // Force 1 Key
      sheet.setColumnWidth(5, 150); // Force 2 Key
      sheet.setColumnWidth(6, 100); // Date Played
      sheet.setColumnWidth(7, 120); // Player 1
      sheet.setColumnWidth(8, 150); // Force 1
      sheet.setColumnWidth(9, 150); // Army 1
      sheet.setColumnWidth(10, 120); // Player 2
      sheet.setColumnWidth(11, 150); // Force 2
      sheet.setColumnWidth(12, 150); // Army 2
      sheet.setColumnWidth(13, 100); // Victor
      sheet.setColumnWidth(14, 80); // Player 1 Score
      sheet.setColumnWidth(15, 80); // Player 2 Score
      sheet.setColumnWidth(16, 200); // Battle Name
      sheet.setColumnWidth(17, 300); // Summary Notes
      sheet.setColumnWidth(18, 200); // Crusade Key
      sheet.setColumnWidth(19, 150); // Victor Force Key
      sheet.setColumnWidth(20, 150); // Deleted Timestamp
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

    // Prepare row data
    const rowData = [
      battleKey,                    // Column 0: Key
      timestamp,                    // Column 1: Timestamp
      data.battleSize || '',        // Column 2: Battle Size
      data.force1Key || '',         // Column 3: Force 1 Key
      data.force2Key || '',         // Column 4: Force 2 Key
      data.datePlayed || '',        // Column 5: Date Played
      data.player1 || '',           // Column 6: Player 1
      data.force1 || '',            // Column 7: Force 1
      data.army1 || '',             // Column 8: Army 1
      data.player2 || '',           // Column 9: Player 2
      data.force2 || '',            // Column 10: Force 2
      data.army2 || '',             // Column 11: Army 2
      victor,                       // Column 12: Victor
      data.player1Score || '',      // Column 13: Player 1 Score
      data.player2Score || '',      // Column 14: Player 2 Score
      data.battleName || '',        // Column 15: Battle Name
      data.summaryNotes || '',      // Column 16: Summary Notes
      data.crusadeKey || '',        // Column 17: Crusade Key
      victorForceKey,               // Column 18: Victor Force Key
      ''                            // Column 19: Deleted Timestamp
    ];

    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;

    sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);

    // Format the new row
    sheet.getRange(newRowNumber, 1).setFontWeight('bold'); // Key
    sheet.getRange(newRowNumber, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss'); // Timestamp
    sheet.getRange(newRowNumber, 6).setNumberFormat('yyyy-mm-dd'); // Date Played

    // Format score columns as numbers
    if (data.player1Score) {
      sheet.getRange(newRowNumber, 14).setNumberFormat('#,##0');
    }
    if (data.player2Score) {
      sheet.getRange(newRowNumber, 15).setNumberFormat('#,##0');
    }

    // Set text wrapping for notes
    sheet.getRange(newRowNumber, 17).setWrap(true);

    console.log('Battle report saved successfully');

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

function doGet(e) {
  try {
    const action = e.parameter.action || 'list';

    switch(action) {
      case 'list':
        return getBattlesList(e.parameter);
      case 'get':
        return getBattleByKey(e.parameter.key);
      case 'force-battles':
        return getBattlesForForce(e.parameter.forceKey);
      case 'crusade-battles':
        return getBattlesForCrusade(e.parameter.crusadeKey);
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
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        battles: [],
        count: 0
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  // Filter out deleted rows
  const activeData = filterActiveRows(data);

  // Convert to objects with normalized headers
  const battles = convertToObjects(activeData);

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      battles: battles,
      count: battles.length
    }))
    .setMimeType(ContentService.MimeType.JSON);
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
  const headers = normalizeHeaders(data[0]);

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

function getBattlesForCrusade(crusadeKey) {
  if (!crusadeKey) {
    throw new Error('Crusade key is required');
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        battles: [],
        count: 0
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  // Filter out deleted rows first
  const activeData = filterActiveRows(data);

  // Convert to objects with normalized headers (no filtering - done client-side)
  const allBattles = convertToObjects(activeData);

  console.log(`Found ${allBattles.length} active battles`);

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      battles: allBattles,
      count: allBattles.length
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getBattlesForForce(forceKey) {
  if (!forceKey) {
    throw new Error('Force key is required');
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        battles: [],
        count: 0
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  // Filter out deleted rows first
  const activeData = filterActiveRows(data);

  // Convert to objects with normalized headers (no filtering - done client-side)
  const allBattles = convertToObjects(activeData);

  console.log(`Found ${allBattles.length} active battles`);

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      battles: allBattles,
      count: allBattles.length
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
        battles: [],
        count: 0
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  // Filter out deleted rows
  const activeData = filterActiveRows(data);

  // Convert to objects with normalized headers
  const allBattles = convertToObjects(activeData);

  // Sort by timestamp (most recent first) and limit
  const battles = allBattles
    .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
    .slice(0, parseInt(limit));

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      battles: battles,
      count: battles.length,
      totalCount: allBattles.length
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