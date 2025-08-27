// filename: crusade-participants-gas-script.js
// Google Apps Script for Crusade Participants Sheet (Junction Table)
// Deploy this as a web app to handle participant registrations and lookups
// This is a junction table - no primary key needed, the combination of crusadeKey + forceKey is unique

const SPREADSHEET_ID = '17jJO939FWthVaLCO091CQzx0hAmtNn8zE5zlqBf10JQ';
const SHEET_NAME = 'Participants';

// Key generation helpers (must match the format from other sheets)
function generateCrusadeKey(crusadeName) {
  return crusadeName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
}

function generateForceKey(forceName, userName) {
  const forcePart = forceName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  const userPart = userName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
  return `${forcePart}_${userPart}`;
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
      const headers = ['Crusade Key', 'Force Key', 'Crusade Name', 'Force Name', 'User Name', 'Timestamp'];
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
    }
    
    // Check if this combination already exists
    const data_range = sheet.getDataRange();
    const values = data_range.getValues();
    
    const existingEntry = values.find((row, index) => {
      if (index === 0) return false; // Skip header
      return row[0] === crusadeKey && row[1] === forceKey;
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
      timestamp                            // Timestamp
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
  
  // Return raw data for compatibility with existing sheets system
  return ContentService
    .createTextOutput(JSON.stringify(data))
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
  const headers = data[0];
  
  // Filter for this crusade (Crusade Key is column 0)
  const participants = data.slice(1)
  .filter(row => row[0] === crusadeKey)
  .map(row => ({
    'Crusade Key': row[0],
    'Force Key': row[1],
    'Crusade Name': row[2],
    'Force Name': row[3], 
    'User Name': row[4], 
    'Timestamp': row[5] 
  }));
  
  console.log(`Found ${participants.length} forces for crusade key "${crusadeKey}"`);
  
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
  
  // Filter for this force key (Force Key is column 1)
  const crusades = data.slice(1)
    .filter(row => row[1] === forceKey)
    .map(row => ({
      crusadeKey: row[0],
      forceKey: row[1],
      crusadeName: row[2],
      forceName: row[3],
      userName: row[4],
      timestamp: row[5]
    }));
  
  console.log(`Found ${crusades.length} crusades for force key "${forceKey}"`);
  
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
  
  const registration = data.find((row, index) => {
    if (index === 0) return false; // Skip header
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
    
    // Test getting forces for a specific crusade
    // const crusadeForces = getForcesForCrusade('SummerCampaign2024');
    // console.log('Crusade forces result:', JSON.parse(crusadeForces.getContent()));
    
  } catch (error) {
    console.error('Test error:', error);
  }
}