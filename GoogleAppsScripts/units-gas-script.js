// filename: units-gas-script.js
// Google Apps Script for Units Sheet
// Deploy this as a web app to handle unit/character submissions and retrieval
// Updated to include Deleted Timestamp column for soft deletion

const SPREADSHEET_ID = '1u23pjxHFD5Z0bv8Tw_erlEo50f71gYtGCKSe0ukhtfA';
const SHEET_NAME = 'Units';

// Helper function to filter out deleted rows
function filterActiveRows(data) {
  if (!data || data.length <= 1) return data;
  
  const headers = data[0];
  const deletedTimestampIndex = headers.indexOf('Deleted Timestamp');
  
  // If no Deleted Timestamp column, return all data
  if (deletedTimestampIndex === -1) return data;
  
  // Filter to only include rows where Deleted Timestamp is empty
  const activeRows = [headers].concat(
    data.slice(1).filter(row => !row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')
  );
  
  return activeRows;
}

// Generate unique unit key using force key, unit name, and timestamp
function generateUnitKey(forceKey, unitName) {
  const unitPart = unitName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  const timestamp = new Date().getTime();
  return `${forceKey}_${unitPart}_${timestamp}`;
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
    
    // Validate required fields (check for empty strings too)
    const required = ['forceKey', 'name', 'dataSheet', 'type'];
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
        userKey = data.userName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
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
        'Key',
        'User Key',
        'Force Key',
        'Name Xref Key',
        'Data Sheet',
        'Name',
        'Type',
        'MFM Version',
        'Points',
        'Crusade Points',
        'Wargear',
        'Enhancements',
        'Relics',
        'Battle Traits',
        'Battle Scars',
        'Battle Count',
        'XP',
        'Rank',
        'Kill Count',
        'Times Killed',
        'Description',
        'Notable History',
        'Notes',
        'Deleted Timestamp'  // New column
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
    
    // Create Name Xref Key for easier lookups (userKey_unitName without timestamp)
    // This uses userKey instead of forceKey to be consistent across different forces
    const nameXrefKey = `${userKey}_${data.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30)}`;
    console.log('Generated name xref key:', nameXrefKey);
    
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
      unitKey,                        // Key
      userKey || '',                  // User Key (using the generated or provided userKey)
      data.forceKey || '',            // Force Key
      nameXrefKey,                    // Name Xref Key
      data.dataSheet || '',           // Data Sheet
      data.name || '',                // Name
      data.type || '',                // Type (Character, Squad, Vehicle, etc.)
      data.mfmVersion || '',          // MFM Version
      data.points || 0,               // Points
      data.crusadePoints || 0,        // Crusade Points
      data.wargear || '',             // Wargear (comma-separated)
      data.enhancements || '',        // Enhancements (comma-separated)
      data.relics || '',              // Relics (comma-separated)
      data.battleTraits || '',        // Battle Traits (comma-separated)
      data.battleScars || '',         // Battle Scars (comma-separated)
      data.battleCount || 0,          // Battle Count
      data.xp || 0,                   // XP
      rank,                           // Rank
      data.killCount || 0,            // Kill Count
      data.timesKilled || 0,          // Times Killed
      data.description || '',         // Description
      data.notableHistory || '',      // Notable History
      data.notes || '',               // Notes
      ''                              // Deleted Timestamp (empty for new records)
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
        key: unitKey,
        nameXrefKey: nameXrefKey
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
      case 'force-units':
        return getUnitsForForce(e.parameter.forceKey);
      case 'user-units':
        return getUnitsForUser(e.parameter.userKey);
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
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows
  const activeData = filterActiveRows(data);
  
  return ContentService
    .createTextOutput(JSON.stringify(activeData))
    .setMimeType(ContentService.MimeType.JSON);
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
  const deletedTimestampIndex = headers.indexOf('Deleted Timestamp');
  
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

function getUnitsForForce(forceKey) {
  if (!forceKey) {
    throw new Error('Force key is required');
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        units: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows first
  const activeData = filterActiveRows(data);
  
  const headers = activeData[0];
  
  // Filter units by force key (column 2)
  const units = activeData.slice(1)
    .filter(row => row[2] === forceKey)
    .map(row => {
      const unit = {};
      headers.forEach((header, index) => {
        unit[header] = row[index];
      });
      return unit;
    });
  
  console.log(`Found ${units.length} active units for force key "${forceKey}"`);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      units: units
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getUnitsForUser(userKey) {
  if (!userKey) {
    throw new Error('User key is required');
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        units: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows first
  const activeData = filterActiveRows(data);
  
  const headers = activeData[0];
  
  // Filter units by user key (column 1)
  const units = activeData.slice(1)
    .filter(row => row[1] === userKey)
    .map(row => {
      const unit = {};
      headers.forEach((header, index) => {
        unit[header] = row[index];
      });
      return unit;
    });
  
  console.log(`Found ${units.length} active units for user key "${userKey}"`);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      units: units
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
    
    // Find Deleted Timestamp column index
    let deletedTimestampIndex = headers.indexOf('Deleted Timestamp');
    
    // If column doesn't exist, add it
    if (deletedTimestampIndex === -1) {
      sheet.insertColumnAfter(headers.length);
      sheet.getRange(1, headers.length + 1).setValue('Deleted Timestamp');
      sheet.getRange(1, headers.length + 1).setFontWeight('bold');
      sheet.getRange(1, headers.length + 1).setBackground('#4ecdc4');
      sheet.getRange(1, headers.length + 1).setFontColor('#ffffff');
      deletedTimestampIndex = headers.length;
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
function testUnitsScript() {
  console.log('=== Testing Units Script ===');
  
  try {
    // Test key generation
    const testKey = generateUnitKey('TestForce_User', 'Captain Aurelius');
    console.log('Test unit key:', testKey);
    
    // Test getting all units
    const allUnits = getUnitsList({});
    console.log('All units result:', JSON.parse(allUnits.getContent()));
    
  } catch (error) {
    console.error('Test error:', error);
  }
}