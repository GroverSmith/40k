// filename: crusade-points-log-gas-script.js
// Google Apps Script for Crusade Points Log Sheet
// Deploy this as a web app to handle crusade points log creation and retrieval

const SPREADSHEET_ID = '1rDWiFBa-L7iiRGvQ4BUJfOhojtuBehSpgUrV2BJ1h1Q';
const SHEET_NAME = 'crusade_points_log';

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

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate unique event key using UUID
function generateEventKey() {
  return generateUUID();
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'list';
    
    switch(action) {
      case 'list':
        return getCrusadePointsLogList();
      case 'get':
        return getCrusadePointsLogByKey(e.parameter.key);
      case 'get-by-crusade':
        return getCrusadePointsLogByCrusade(e.parameter.crusade_key);
      case 'get-by-force':
        return getCrusadePointsLogByForce(e.parameter.force_key);
      case 'get-by-phase':
        return getCrusadePointsLogByPhase(e.parameter.crusade_key, e.parameter.phase_key);
      default:
        return getCrusadePointsLogList();
    }
        
  } catch (error) {
    console.error('Error in crusade-points-log doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    console.log('doPost called - raw data:', e.postData ? e.postData.contents : 'No postData');
    console.log('Parameters:', e.parameter);
    
    let data;
    
    // The form submission comes as URL-encoded parameters
    if (e.parameter) {
      data = e.parameter;
      console.log('Using form parameters:', data);
    } else if (e.postData && e.postData.contents) {
      try {
        // Try to parse as JSON (fallback)
        data = JSON.parse(e.postData.contents);
        console.log('Parsed JSON data:', data);
      } catch (jsonError) {
        console.error('Not JSON data:', jsonError.message);
        throw new Error('No valid data received');
      }
    } else {
      throw new Error('No data received in request');
    }

    // Handle log entry creation
    if (data.operation === 'create') {
      const result = createCrusadePointsLogEntry(data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default operation is create log entry
    console.log('Processing crusade points log entry with data:', data);
    
    if (!data.crusade_key || !data.force_key || data.points === undefined || !data.event) {
      console.error('Validation failed - required fields missing:', {
        crusade_key: data.crusade_key,
        force_key: data.force_key,
        points: data.points,
        event: data.event
      });
      throw new Error('crusade_key, force_key, points, and event are required');
    }
    
    console.log('Validation passed, creating log entry for crusade:', data.crusade_key, 'force:', data.force_key);

    const result = createCrusadePointsLogEntry(data);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in crusade-points-log doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Create a new crusade points log entry
function createCrusadePointsLogEntry(data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  // Create sheet if it doesn't exist
  if (!sheet) {
    console.log('Creating crusade points log sheet');
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    
    const headers = [
      'event_key', 'crusade_key', 'phase_key', 'force_key', 'points', 
      'event', 'notes', 'timestamp', 'deleted_timestamp'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
  }

  const timestamp = new Date();
  const eventKey = generateEventKey();
  
  // Prepare row data
  const rowData = [
    eventKey,                           // event_key (Primary Key) - Column 0
    data.crusade_key || '',             // crusade_key - Column 1
    data.phase_key || '',               // phase_key - Column 2
    data.force_key || '',               // force_key - Column 3
    data.points || 0,                   // points - Column 4
    data.event || '',                   // event - Column 5
    data.notes || '',                   // notes - Column 6
    timestamp,                          // timestamp - Column 7
    ''                                  // deleted_timestamp - Column 8 (keep empty)
  ];

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
  sheet.getRange(lastRow + 1, 8).setNumberFormat('yyyy-mm-dd hh:mm:ss'); // Timestamp

  console.log('Successfully created crusade points log entry with key:', eventKey);
  
  return { 
    success: true, 
    message: 'Crusade points log entry created successfully',
    key: eventKey
  };
}

// Get all active crusade points log entries
function getCrusadePointsLogList() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points log sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const filteredData = filterActiveRows(data);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: filteredData,
        count: filteredData.length - 1 // Subtract header row
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points log list:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get a specific crusade points log entry by key
function getCrusadePointsLogByKey(eventKey) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points log sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const eventKeyIndex = headers.indexOf('event_key');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    // Find the row with the matching event_key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[eventKeyIndex] === eventKey && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const logData = {};
        headers.forEach((header, index) => {
          logData[header] = row[index] || '';
        });
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            data: logData
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Crusade points log entry not found'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points log entry by key:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all log entries for a specific crusade
function getCrusadePointsLogByCrusade(crusadeKey) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points log sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const crusadeKeyIndex = headers.indexOf('crusade_key');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    const logEntries = [];
    
    // Find all rows with the matching crusade_key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[crusadeKeyIndex] === crusadeKey && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const logData = {};
        headers.forEach((header, index) => {
          logData[header] = row[index] || '';
        });
        logEntries.push(logData);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: logEntries,
        count: logEntries.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points log by crusade:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all log entries for a specific force
function getCrusadePointsLogByForce(forceKey) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points log sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const forceKeyIndex = headers.indexOf('force_key');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    const logEntries = [];
    
    // Find all rows with the matching force_key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[forceKeyIndex] === forceKey && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const logData = {};
        headers.forEach((header, index) => {
          logData[header] = row[index] || '';
        });
        logEntries.push(logData);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: logEntries,
        count: logEntries.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points log by force:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all log entries for a specific crusade and phase
function getCrusadePointsLogByPhase(crusadeKey, phaseKey) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points log sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const crusadeKeyIndex = headers.indexOf('crusade_key');
    const phaseKeyIndex = headers.indexOf('phase_key');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    const logEntries = [];
    
    // Find all rows with the matching crusade_key and phase_key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[crusadeKeyIndex] === crusadeKey && 
          row[phaseKeyIndex] === phaseKey && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const logData = {};
        headers.forEach((header, index) => {
          logData[header] = row[index] || '';
        });
        logEntries.push(logData);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: logEntries,
        count: logEntries.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points log by phase:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
