// filename: crusade-participants-gas-script.js
// Google Apps Script for Crusade Participants Sheet (Junction Table)
// Deploy this as a web app to handle participant registrations and lookups
// This is a junction table - no primary key needed, the combination of crusadeKey + forceKey is unique
// Updated to include Deleted Timestamp column for soft deletion

const SPREADSHEET_ID = '17jJO939FWthVaLCO091CQzx0hAmtNn8zE5zlqBf10JQ';
const SHEET_NAME = 'xref_crusade_participants';

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

// Key generation helpers (must match the format from other sheets)
function generateCrusadeKey(crusadeName) {
  return clean(crusadeName, 30);
}

function generateForceKey(forceName, userKey) {
  const forcePart = clean(forceName);
  return `${forcePart}_${userKey}`;
}

function doPost(e) {
  try {
    console.log('doPost called for participant registration');
    console.log('Parameters:', e.parameter);
    
    let data;
    
    // Handle form data
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
    
    // We now expect to receive either keys directly OR names to generate keys from
    let crusadeKey, forceKey;
    
    if (data.crusadeKey && data.forceKey) {
      // Keys provided directly
      crusadeKey = data.crusadeKey;
      forceKey = data.forceKey;
    } else if (data.crusadeName && data.forceName && data.userName) {
      // Generate keys from names
      crusadeKey = generateCrusadeKey(data.crusadeName);
      forceKey = generateForceKey(data.forceName, data.userName);
    } else {
      throw new Error('Must provide either (crusadeKey + forceKey) OR (crusadeName + forceName + userName)');
    }
    
    console.log('Registering participant - Crusade Key:', crusadeKey, 'Force Key:', forceKey);
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating participants sheet');
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      // Headers - no primary key column needed for junction table
      const headers = ['Crusade Key', 'Force Key', 'Crusade Name', 'Force Name', 'User Name', 'Timestamp', 'Deleted Timestamp'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
      
      // Set column widths
      sheet.setColumnWidth(1, 200); // Crusade Key
      sheet.setColumnWidth(2, 200); // Force Key
      sheet.setColumnWidth(3, 180); // Crusade Name
      sheet.setColumnWidth(4, 180); // Force Name
      sheet.setColumnWidth(5, 150); // User Name
      sheet.setColumnWidth(6, 150); // Timestamp
      sheet.setColumnWidth(7, 150); // Deleted Timestamp
    }
    
    // Check if this combination already exists (and is not deleted)
    const data_range = sheet.getDataRange();
    const values = data_range.getValues();
    const headers = values[0];
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    const existingEntry = values.find((row, index) => {
      if (index === 0) return false; // Skip header
      // Check if same crusade and force key
      if (row[0] === crusadeKey && row[1] === forceKey) {
        // Check if it's deleted
        if (deletedTimestampIndex !== -1 && row[deletedTimestampIndex]) {
          return false; // It's deleted, so we can recreate it
        }
        return true; // It exists and is not deleted
      }
      return false;
    });
    
    if (existingEntry) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'This force is already registered for this crusade'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Add new registration
    const timestamp = new Date();
    const newRow = [
      crusadeKey,                          // Crusade Key (FK)
      forceKey,                            // Force Key (FK)
      data.crusadeName || '',              // Crusade Name (for human readability)
      data.forceName || '',                // Force Name (for human readability)
      data.userName || '',                 // User Name (for human readability)
      timestamp,                           // Timestamp
      ''                                   // Deleted Timestamp (empty for new records)
    ];
    
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
    
    // Format key columns as bold
    sheet.getRange(lastRow + 1, 1, 1, 2).setFontWeight('bold');
    // Format timestamp column
    sheet.getRange(lastRow + 1, 6).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    console.log('Participant registered successfully');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Force registered for crusade successfully',
        crusadeKey: crusadeKey,
        forceKey: forceKey
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error registering participant:', error);
    
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
        return getParticipantsList(e.parameter);
      case 'forces-for-crusade':
        return getForcesForCrusade(e.parameter.crusadeKey || e.parameter.crusade);
      case 'crusades-for-force':
        return getCrusadesForForce(e.parameter.forceKey);
      case 'check-registration':
        return checkRegistration(e.parameter.crusadeKey, e.parameter.forceKey);
      case 'delete':
        return softDeleteParticipant(e.parameter.crusadeKey, e.parameter.forceKey);
      default:
        return getParticipantsList(e.parameter);
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

function getParticipantsList(params = {}) {
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
  
  // Return raw data for compatibility with existing sheets system
  return ContentService
    .createTextOutput(JSON.stringify(activeData))
    .setMimeType(ContentService.MimeType.JSON);
}

function getForcesForCrusade(crusadeKeyOrName) {
  console.log('getForcesForCrusade called with:', crusadeKeyOrName);
  
  if (!crusadeKeyOrName) {
    throw new Error('Crusade key or name is required');
  }
  
  // Determine if we received a key or a name
  let crusadeKey;
  if (crusadeKeyOrName.includes(' ') || crusadeKeyOrName.includes('-')) {
    // Likely a name, generate key
    crusadeKey = generateCrusadeKey(crusadeKeyOrName);
    console.log('Generated crusade key from name:', crusadeKey);
  } else {
    // Likely already a key
    crusadeKey = crusadeKeyOrName;
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        forces: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows first
  const activeData = filterActiveRows(data);
  
  const headers = activeData[0];
  
  // Filter for this crusade (Crusade Key is column 0)
  const participants = activeData.slice(1)
  .filter(row => row[0] === crusadeKey)
  .map(row => ({
    'Crusade Key': row[0],
    'Force Key': row[1],
    'Crusade Name': row[2],
    'Force Name': row[3], 
    'User Name': row[4], 
    'Timestamp': row[5] 
  }));
  
  console.log(`Found ${participants.length} active forces for crusade key "${crusadeKey}"`);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      forces: participants
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getCrusadesForForce(forceKey) {
  console.log('getCrusadesForForce called with force key:', forceKey);
  
  if (!forceKey) {
    throw new Error('Force key is required');
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        crusades: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows first
  const activeData = filterActiveRows(data);
  
  // Filter for this force key (Force Key is column 1)
  const crusades = activeData.slice(1)
    .filter(row => row[1] === forceKey)
    .map(row => ({
      crusadeKey: row[0],
      forceKey: row[1],
      crusadeName: row[2],
      forceName: row[3],
      userName: row[4],
      timestamp: row[5]
    }));
  
  console.log(`Found ${crusades.length} active crusades for force key "${forceKey}"`);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      crusades: crusades
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkRegistration(crusadeKey, forceKey) {
  console.log('Checking registration for crusade:', crusadeKey, 'force:', forceKey);
  
  if (!crusadeKey || !forceKey) {
    throw new Error('Both crusade key and force key are required');
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        registered: false
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  const registration = data.find((row, index) => {
    if (index === 0) return false; // Skip header
    // Check if not deleted
    if (deletedTimestampIndex !== -1 && row[deletedTimestampIndex]) return false;
    return row[0] === crusadeKey && row[1] === forceKey;
  });
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      registered: !!registration,
      registration: registration ? {
        crusadeKey: registration[0],
        forceKey: registration[1],
        crusadeName: registration[2],
        forceName: registration[3],
        userName: registration[4],
        timestamp: registration[5]
      } : null
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Soft delete function (requires both keys since this is a junction table)
function softDeleteParticipant(crusadeKey, forceKey) {
  try {
    if (!crusadeKey || !forceKey) {
      throw new Error('Both crusade key and force key are required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Participants sheet not found');
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
    
    // Find the row with the matching keys
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === crusadeKey && data[i][1] === forceKey) {
        // Set the Deleted Timestamp value
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(new Date());
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
        
        console.log('Soft deleted participant:', crusadeKey, forceKey);
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'Participant soft deleted successfully',
            crusadeKey: crusadeKey,
            forceKey: forceKey
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    throw new Error('Participant registration not found');
    
  } catch (error) {
    console.error('Error soft deleting participant:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test functions
function testParticipantsScript() {
  console.log('=== Testing Participants Script ===');
  
  try {
    // Test getting all participants
    const allParticipants = getParticipantsList({});
    console.log('All participants result:', JSON.parse(allParticipants.getContent()));
    
    // Test key generation
    const testCrusadeKey = generateCrusadeKey('Summer Campaign 2024');
    const testForceKey = generateForceKey('Ultramarines 2nd Company', 'John Smith');
    console.log('Test crusade key:', testCrusadeKey);
    console.log('Test force key:', testForceKey);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}