// filename: units-gas-script.js
// Google Apps Script for Units Sheet
// Deploy this as a web app to handle unit/character submissions and retrieval

const SPREADSHEET_ID = '1u23pjxHFD5Z0bv8Tw_erlEo50f71gYtGCKSe0ukhtfA';
const SHEET_NAME = 'units';

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

// Clean function to remove non-alphanumeric characters and truncate
function clean(text, maxLength = 30) {
  if (!text) return '';
  return String(text).replace(/[^a-zA-Z0-9]/g, '').substring(0, maxLength);
}

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate unique unit key using UUID
function generateUnitKey() {
  return generateUUID();
}

// Edit function - updates an existing unit record
function editUnit(unitKey, userKey, data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const unitKeyIndex = headers.indexOf('unit_key');
  const userKeyIndex = headers.indexOf('user_key');
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find the row to update (must match both unit_key and user_key)
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[unitKeyIndex] === unitKey && row[userKeyIndex] === userKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Unit not found or access denied');
  }
  
  // Prepare updated row data
  const timestamp = new Date();
  const updatedRowData = [
    unitKey,                       // unit_key (Primary Key) - Column 0
    userKey,                       // user_key - Column 1
    data.force_key || '',          // force_key - Column 2
    data.data_sheet || '',         // data_sheet - Column 3
    data.unit_name || '',          // unit_name - Column 4
    data.unit_type || '',          // unit_type - Column 5
    data.mfm_version || '',        // mfm_version - Column 6
    data.points || '',             // points - Column 7
    data.crusade_points || '',     // crusade_points - Column 8
    data.wargear || '',            // wargear - Column 9
    data.enhancements || '',       // enhancements - Column 10
    data.relics || '',             // relics - Column 11
    data.battle_traits || '',      // battle_traits - Column 12
    data.battle_scars || '',       // battle_scars - Column 13
    data.battle_count || '',       // battle_count - Column 14
    data.xp || '',                 // xp - Column 15
    data.rank || '',               // rank - Column 16
    data.kill_count || '',         // kill_count - Column 17
    data.times_killed || '',       // times_killed - Column 18
    data.description || '',        // description - Column 19
    data.notable_history || '',    // notable_history - Column 20
    data.notes || '',              // notes - Column 21
    timestamp,                     // timestamp - Column 22
    ''                             // deleted_timestamp - Column 23 (keep empty)
  ];
  
  // Update the row
  sheet.getRange(rowIndex, 1, 1, updatedRowData.length).setValues([updatedRowData]);
  sheet.getRange(rowIndex, 23).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  
  return { success: true, message: 'Unit updated successfully' };
}

// Delete function - soft deletes a unit record
function deleteUnit(unitKey, userKey) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const unitKeyIndex = headers.indexOf('unit_key');
  const userKeyIndex = headers.indexOf('user_key');
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find the row to delete (must match both unit_key and user_key)
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[unitKeyIndex] === unitKey && row[userKeyIndex] === userKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Unit not found or access denied');
  }
  
  // Set deleted timestamp
  const deletedTimestamp = new Date();
  sheet.getRange(rowIndex, deletedTimestampIndex + 1).setValue(deletedTimestamp);
  sheet.getRange(rowIndex, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  
  // Trigger cascade deletion in xref tables
  try {
    // Delete from story units
    const storyUnitsUrl = 'https://script.google.com/macros/s/AKfycbz7xVqEw5qHx9r_fHTmIe8D5tSjL6b_LPxTqP3wzGH5KNMUI_ATXnSlzBQX0DzYyuBNXw/exec';
    UrlFetchApp.fetch(storyUnitsUrl, {
      method: 'POST',
      payload: JSON.stringify({
        operation: 'cascade_delete',
        parent_table: 'units',
        parent_key: unitKey
      }),
      contentType: 'application/json'
    });
  } catch (cascadeError) {
    console.error('Cascade deletion error:', cascadeError);
    // Don't fail the main deletion if cascade fails
  }
  
  return { success: true, message: 'Unit deleted successfully' };
}

function doPost(e) {
  try {
    console.log('doPost called for unit submission');
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
      if (!data.unit_key || !data.user_key) {
        throw new Error('unit_key and user_key are required for edit operation');
      }
      const result = editUnit(data.unit_key, data.user_key, data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'delete') {
      if (!data.unit_key || !data.user_key) {
        throw new Error('unit_key and user_key are required for delete operation');
      }
      const result = deleteUnit(data.unit_key, data.user_key);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default operation is create
    // Validate required fields (check for empty strings too)
    const required = ['forceKey', 'name', 'dataSheet'];
    const missing = required.filter(field => !data[field] || data[field].trim() === '');
    if (missing.length > 0) {
      throw new Error('Missing required fields: ' + missing.join(', '));
    }
    
    // Extract userKey from forceKey if not provided
    // Force key format is "ForceName_UserName" so we take everything after the last underscore
    let userKey = data.userKey;
    if (!userKey || userKey.trim() === '') {
      const forceKeyParts = data.forceKey.split('_');
      if (forceKeyParts.length >= 2) {
        // Take everything after the last underscore as the user key
        userKey = forceKeyParts[forceKeyParts.length - 1];
        console.log('Extracted userKey from forceKey:', userKey);
      } else if (data.userName) {
        // Fallback: generate from userName if can't extract from forceKey
        userKey = clean(data.userName, 30);
        console.log('Generated userKey from userName:', userKey);
      } else {
        throw new Error('Unable to determine userKey - forceKey format invalid and userName not provided');
      }
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating Units sheet');
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      const headers = [
        'unit_key',
        'user_key',
        'force_key',
        'data_sheet',
        'unit_name',
        'unit_type',
        'mfm_version',
        'points',
        'crusade_points',
        'wargear',
        'enhancements',
        'relics',
        'battle_traits',
        'battle_scars',
        'battle_count',
        'xp',
        'rank',
        'kill_count',
        'times_killed',
        'description',
        'notable_history',
        'notes',
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
      sheet.setColumnWidth(1, 200); // Key
      sheet.setColumnWidth(2, 150); // User Key
      sheet.setColumnWidth(3, 150); // Force Key
      sheet.setColumnWidth(4, 150); // Name Xref Key
      sheet.setColumnWidth(5, 150); // Data Sheet
      sheet.setColumnWidth(6, 200); // Name
      sheet.setColumnWidth(7, 100); // Type
      sheet.setColumnWidth(8, 100); // MFM Version
      sheet.setColumnWidth(9, 80);  // Points
      sheet.setColumnWidth(10, 80); // Crusade Points
      sheet.setColumnWidth(11, 200); // Wargear
      sheet.setColumnWidth(12, 200); // Enhancements
      sheet.setColumnWidth(13, 200); // Relics
      sheet.setColumnWidth(14, 200); // Battle Traits
      sheet.setColumnWidth(15, 200); // Battle Scars
      sheet.setColumnWidth(16, 80);  // Battle Count
      sheet.setColumnWidth(17, 80);  // XP
      sheet.setColumnWidth(18, 120); // Rank
      sheet.setColumnWidth(19, 80);  // Kill Count
      sheet.setColumnWidth(20, 80);  // Times Killed
      sheet.setColumnWidth(21, 300); // Description
      sheet.setColumnWidth(22, 300); // Notable History
      sheet.setColumnWidth(23, 300); // Notes
      sheet.setColumnWidth(24, 150); // Deleted Timestamp
    }
    
    // Generate unique key
    const unitKey = generateUnitKey(data.forceKey, data.name);
    console.log('Generated unit key:', unitKey);
    
    
    // Determine rank based on XP if not provided
    let rank = data.rank || '';
    if (!rank && data.xp !== undefined) {
      const xp = parseInt(data.xp) || 0;
      if (xp >= 51) rank = 'Legendary';
      else if (xp >= 31) rank = 'Heroic';
      else if (xp >= 16) rank = 'Veteran';
      else if (xp >= 6) rank = 'Blooded';
      else rank = 'Battle-ready';
    }
    
    // Prepare row data
    const rowData = [
      unitKey,                        // unit_key
      userKey || '',                  // user_key
      data.forceKey || '',            // force_key
      data.dataSheet || '',           // data_sheet
      data.name || '',                // unit_name
      data.type || '',                // unit_type
      data.mfmVersion || '',          // mfm_version
      data.points || 0,               // points
      data.crusadePoints || 0,        // crusade_points
      data.wargear || '',             // wargear
      data.enhancements || '',        // enhancements
      data.relics || '',              // relics
      data.battleTraits || '',        // battle_traits
      data.battleScars || '',         // battle_scars
      data.battleCount || 0,          // battle_count
      data.xp || 0,                   // xp
      rank,                           // rank
      data.killCount || 0,            // kill_count
      data.timesKilled || 0,          // times_killed
      data.description || '',         // description
      data.notableHistory || '',      // notable_history
      data.notes || '',               // notes
      new Date(),                     // timestamp
      ''                              // deleted_timestamp (empty for new records)
    ];
    
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    
    sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);
    
    // Format numeric columns
    sheet.getRange(newRowNumber, 9).setNumberFormat('#,##0'); // Points
    sheet.getRange(newRowNumber, 10).setNumberFormat('#,##0'); // Crusade Points
    sheet.getRange(newRowNumber, 16).setNumberFormat('#,##0'); // Battle Count
    sheet.getRange(newRowNumber, 17).setNumberFormat('#,##0'); // XP
    sheet.getRange(newRowNumber, 19).setNumberFormat('#,##0'); // Kill Count
    sheet.getRange(newRowNumber, 20).setNumberFormat('#,##0'); // Times Killed
    
    // Set text wrapping for long text fields
    sheet.getRange(newRowNumber, 11, 1, 5).setWrap(true); // Wargear through Battle Scars
    sheet.getRange(newRowNumber, 21, 1, 3).setWrap(true); // Description through Notes
    
    console.log('Unit saved successfully');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Unit submitted successfully',
        key: unitKey
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error processing unit submission:', error);
    
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
        return getUnitsList(e.parameter);
      case 'get':
        return getUnitByKey(e.parameter.key);
      case 'delete':
        return softDeleteUnit(e.parameter.key);
      default:
        return getUnitsList(e.parameter);
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

function getUnitsList(params = {}) {
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
    
    console.log('getUnitsList - Total active rows found:', rows.length);
    console.log('getUnitsList - Headers:', headers);
    
    // Convert to objects with consistent field names
    const units = rows.map((row) => {
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
    
    console.log('getUnitsList - Returning units with keys:', units.map(unit => ({ 
      name: unit['Name'] || unit.name, 
      key: unit.key, 
      force: unit['Force Key'] || unit.force_key
    })));
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        count: units.length,
        totalCount: units.length,
        data: units,
        hasMore: false
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting units list:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getUnitByKey(unitKey) {
  if (!unitKey) {
    throw new Error('Unit key is required');
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Units sheet not found');
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Check if row is deleted
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find by key (column 0)
  const unitRow = data.find((row, index) => {
    if (index === 0) return false;
    // Check if not deleted
    if (deletedTimestampIndex !== -1 && row[deletedTimestampIndex]) return false;
    return row[0] === unitKey;
  });
  
  if (!unitRow) {
    throw new Error('Unit not found or deleted');
  }
  
  // Convert to object
  const unit = {};
  headers.forEach((header, index) => {
    unit[header] = unitRow[index];
  });
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: unit
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


// Soft delete function
function softDeleteUnit(unitKey) {
  try {
    if (!unitKey) {
      throw new Error('Unit key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Units sheet not found');
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
      if (data[i][0] === unitKey) { // Key is in column 0
        // Set the Deleted Timestamp value
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(new Date());
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
        
        console.log('Soft deleted unit:', unitKey);
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'Unit soft deleted successfully',
            key: unitKey
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    throw new Error('Unit not found');
    
  } catch (error) {
    console.error('Error soft deleting unit:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
// Test function removed - no longer needed