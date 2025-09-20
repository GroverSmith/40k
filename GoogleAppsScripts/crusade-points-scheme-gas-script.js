// filename: crusade-points-scheme-gas-script.js
// Google Apps Script for Crusade Points Scheme Sheet Access (Read-Only)
// Deploy this as a web app to handle crusade points scheme data requests

const SPREADSHEET_ID = '1BDaX-eM2U-l-YACHnWrm_kuLDrdKEpPX_hoMZjELq_Y';
const SHEET_NAME = 'crusade_points_scheme';

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
        return getCrusadePointsSchemeList();
      case 'get-by-crusade':
        return getCrusadePointsSchemeByCrusade(e.parameter.crusade_key);
      case 'get-by-phase':
        return getCrusadePointsSchemeByPhase(e.parameter.crusade_key, e.parameter.phase_key);
      case 'get-by-event':
        return getCrusadePointsSchemeByEvent(e.parameter.crusade_key, e.parameter.phase_key, e.parameter.event_type);
      default:
        return getCrusadePointsSchemeList();
    }
        
  } catch (error) {
    console.error('Error in crusade-points-scheme doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all active crusade points scheme entries
function getCrusadePointsSchemeList() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points scheme sheet not found');
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
    console.error('Error getting crusade points scheme list:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all points scheme entries for a specific crusade
function getCrusadePointsSchemeByCrusade(crusadeKey) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points scheme sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const crusadeKeyIndex = headers.indexOf('crusade_key');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    const schemeEntries = [];
    
    // Find all rows with the matching crusade_key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[crusadeKeyIndex] === crusadeKey && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const entryData = {};
        headers.forEach((header, index) => {
          entryData[header] = row[index] || '';
        });
        schemeEntries.push(entryData);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: schemeEntries,
        count: schemeEntries.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points scheme by crusade:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all points scheme entries for a specific crusade and phase
function getCrusadePointsSchemeByPhase(crusadeKey, phaseKey) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points scheme sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const crusadeKeyIndex = headers.indexOf('crusade_key');
    const phaseKeyIndex = headers.indexOf('phase_key');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    const schemeEntries = [];
    
    // Find all rows with the matching crusade_key and phase_key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[crusadeKeyIndex] === crusadeKey && 
          row[phaseKeyIndex] === phaseKey && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const entryData = {};
        headers.forEach((header, index) => {
          entryData[header] = row[index] || '';
        });
        schemeEntries.push(entryData);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: schemeEntries,
        count: schemeEntries.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points scheme by phase:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get a specific points scheme entry by crusade, phase, and event type
function getCrusadePointsSchemeByEvent(crusadeKey, phaseKey, eventType) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points scheme sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const crusadeKeyIndex = headers.indexOf('crusade_key');
    const phaseKeyIndex = headers.indexOf('phase_key');
    const eventTypeIndex = headers.indexOf('event_type');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    // Find the row with the matching composite key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[crusadeKeyIndex] === crusadeKey && 
          row[phaseKeyIndex] === phaseKey && 
          row[eventTypeIndex] === eventType && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const entryData = {};
        headers.forEach((header, index) => {
          entryData[header] = row[index] || '';
        });
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            data: entryData
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Points scheme entry not found'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points scheme by event:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
