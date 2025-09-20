// filename: crusade-phases-gas-script.js
// Google Apps Script for Crusade Phases Sheet Access (Read-Only)
// Deploy this as a web app to handle crusade phases data requests

const SPREADSHEET_ID = '1_WI7SgeQriXzLKZqFkH4Voo_t4setUPIGkXBx-XVQCI';
const SHEET_NAME = 'crusade_phases';

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

function doGet(e) {
  try {
    const action = e.parameter.action || 'list';
    
    switch(action) {
      case 'list':
        return getCrusadePhasesList();
      case 'get':
        return getCrusadePhaseByKey(e.parameter.key);
      case 'get-by-crusade':
        return getCrusadePhasesByCrusade(e.parameter.crusade_key);
      default:
        return getCrusadePhasesList();
    }
        
  } catch (error) {
    console.error('Error in crusade-phases doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all active crusade phases
function getCrusadePhasesList() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade phases sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const filteredData = filterActiveRows(data);
    
    // Convert to objects with consistent field names
    const headers = filteredData[0];
    const rows = filteredData.slice(1);
    
    const phases = rows.map((row) => {
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
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: phases,
        count: phases.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade phases list:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get a specific crusade phase by key
function getCrusadePhaseByKey(phaseKey) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade phases sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const phaseKeyIndex = headers.indexOf('phase_key');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    // Find the row with the matching phase_key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[phaseKeyIndex] === phaseKey && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const phaseData = {};
        headers.forEach((header, index) => {
          phaseData[header] = row[index] || '';
        });
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            data: phaseData
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Crusade phase not found'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade phase by key:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all phases for a specific crusade
function getCrusadePhasesByCrusade(crusadeKey) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade phases sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const crusadeKeyIndex = headers.indexOf('crusade_key');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    const phases = [];
    
    // Find all rows with the matching crusade_key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[crusadeKeyIndex] === crusadeKey && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const phaseData = {};
        headers.forEach((header, index) => {
          phaseData[header] = row[index] || '';
        });
        phases.push(phaseData);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: phases,
        count: phases.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade phases by crusade:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
