// filename: crusade-participants-gas-script.js
// Google Apps Script for Crusade Participants Sheet
// Deploy this as a web app to handle participant registrations and lookups

// Configuration - UPDATE THESE VALUES
const SPREADSHEET_ID = '17jJO939FWthVaLCO091CQzx0hAmtNn8zE5zlqBf10JQ';
const SHEET_NAME = 'Participants';

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
    
    // Validate required fields
    if (!data.crusadeName || !data.crusadeForceKey || !data.forceName || !data.userName) {
      throw new Error('Missing required fields: crusadeName, crusadeForceKey, forceName, and userName are required');
    }
    
    console.log('Registering participant:', data.crusadeName, 'with force key:', data.crusadeForceKey);
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating participants sheet');
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      // Add headers
      const headers = ['Crusade Name', 'Crusade Force Key', 'Force Name', 'User Name', 'Timestamp'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
    }
    
    // Check if this combination already exists
    const data_range = sheet.getDataRange();
    const values = data_range.getValues();
    
    const existingEntry = values.find((row, index) => {
      if (index === 0) return false; // Skip header
      return row[0] === data.crusadeName && row[1] === data.crusadeForceKey;
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
      data.crusadeName,
      data.crusadeForceKey,
      data.forceName,
      data.userName,
      timestamp
    ];
    
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
    
    // Format timestamp column
    sheet.getRange(lastRow + 1, 5).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    console.log('Participant registered successfully');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Force registered for crusade successfully'
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
        return getForcesForCrusade(e.parameter.crusade);
      case 'crusades-for-force':
        return getCrusadesForForce(e.parameter.forceKey);
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

function getForcesForCrusade(crusadeName) {
  console.log('getForcesForCrusade called with:', crusadeName);
  
  if (!crusadeName) {
    throw new Error('Crusade name is required');
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
  
  // Filter for this crusade
  const forceKeys = data.slice(1)
    .filter(row => row[0] && row[0].toString().toLowerCase().trim() === crusadeName.toLowerCase().trim())
    .map(row => ({
      crusadeForceKey: row[1],
      forceName: row[2],
      userName: row[3],
      timestamp: row[4]
    }));
  
  console.log(`Found ${forceKeys.length} forces for crusade "${crusadeName}"`);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      forces: forceKeys
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getCrusadesForForce(forceKey) {
  console.log('getCrusadesForForce called with:', forceKey);
  
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
  
  // Filter for this force key
  const crusades = data.slice(1)
    .filter(row => row[1] && row[1].toString().trim() === forceKey.toString().trim())
    .map(row => ({
      crusadeName: row[0],
      timestamp: row[4]
    }));
  
  console.log(`Found ${crusades.length} crusades for force key "${forceKey}"`);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      crusades: crusades
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
    
    // Test getting forces for a specific crusade
    // const crusadeForces = getForcesForCrusade('Test Crusade');
    // console.log('Crusade forces result:', JSON.parse(crusadeForces.getContent()));
    
  } catch (error) {
    console.error('Test error:', error);
  }
}