// filename: units-gas-script.js
// Google Apps Script for Units Sheet
// Deploy this as a web app to handle unit/character submissions and retrieval

const SPREADSHEET_ID = '1u23pjxHFD5Z0bv8Tw_erlEo50f71gYtGCKSe0ukhtfA';
const SHEET_NAME = 'Units';

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
    
    // Validate required fields
    const required = ['userKey', 'forceKey', 'name', 'dataSheet', 'type'];
    const missing = required.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error('Missing required fields: ' + missing.join(', '));
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
        'Notes'
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
    }
    
    // Generate unique key
    const unitKey = generateUnitKey(data.forceKey, data.name);
    console.log('Generated unit key:', unitKey);
    
    // Create Name Xref Key for easier lookups (force_unitname without timestamp)
    const nameXrefKey = `${data.forceKey}_${data.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30)}`;
    
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
      data.userKey || '',             // User Key
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
      data.notes || ''                // Notes
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
}Type.JSON);
      
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
  
  return ContentService
    .createTextOutput(JSON.stringify(data))
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
  
  // Find by key (column 0)
  const unitRow = data.find((row, index) => {
    if (index === 0) return false;
    return row[0] === unitKey;
  });
  
  if (!unitRow) {
    throw new Error('Unit not found');
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
  const headers = data[0];
  
  // Filter units by force key (column 2)
  const units = data.slice(1)
    .filter(row => row[2] === forceKey)
    .map(row => {
      const unit = {};
      headers.forEach((header, index) => {
        unit[header] = row[index];
      });
      return unit;
    });
  
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
  const headers = data[0];
  
  // Filter units by user key (column 1)
  const units = data.slice(1)
    .filter(row => row[1] === userKey)
    .map(row => {
      const unit = {};
      headers.forEach((header, index) => {
        unit[header] = row[index];
      });
      return unit;
    });
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      units: units
    }))
    .setMimeType(ContentService.MimeType.JSON);
}