// filename: crusade-participants-gas-script.js
// Google Apps Script for Crusade Participants Sheet (Junction Table)
// Deploy this as a web app to handle participant registrations and lookups
// This is a junction table - no primary key needed, the combination of crusadeKey + forceKey is unique

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

// Cascade delete function - soft deletes all xref records when a parent record is deleted
function cascadeDeleteByParent(parentTable, parentKey) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    console.log('Crusade participants sheet not found');
    return { success: true, message: 'No xref records to clean up' };
  }
  
  const allData = sheet.getDataRange().getValues();
  if (allData.length <= 1) {
    return { success: true, message: 'No xref records to clean up' };
  }
  
  const headers = allData[0];
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Determine which column to check based on parent table
  let parentKeyColumn = -1;
  if (parentTable === 'crusades') {
    parentKeyColumn = headers.indexOf('crusade_key');
  } else if (parentTable === 'forces') {
    parentKeyColumn = headers.indexOf('force_key');
  } else if (parentTable === 'users') {
    parentKeyColumn = headers.indexOf('user_key');
  }
  
  if (parentKeyColumn === -1) {
    console.log(`Unknown parent table: ${parentTable}`);
    return { success: true, message: 'Unknown parent table' };
  }
  
  let deletedCount = 0;
  const deletedTimestamp = new Date();
  
  // Find and soft-delete all matching records
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[parentKeyColumn] === parentKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      // Soft delete this record
      sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(deletedTimestamp);
      sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
      deletedCount++;
    }
  }
  
  console.log(`Cascade deleted ${deletedCount} xref records for ${parentTable}:${parentKey}`);
  return { success: true, message: `Cascade deleted ${deletedCount} xref records` };
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
    
    // Handle cascade delete operation
    if (data.operation === 'cascade_delete') {
      const result = cascadeDeleteByParent(data.parent_table, data.parent_key);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
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
      const headers = ['crusade_key', 'force_key', 'user_key', 'crusade_name', 'force_name', 'user_name', 'timestamp', 'deleted_timestamp'];
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
    
    // Find deleted_timestamp column index
    let deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    // If column doesn't exist, throw error instead of adding it
    if (deletedTimestampIndex === -1) {
      throw new Error('deleted_timestamp column not found in sheet structure');
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