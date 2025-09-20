// filename: crusade-points-categories-gas-script.js
// Google Apps Script for Crusade Points Categories Sheet Access (Read-Only)
// Deploy this as a web app to handle crusade points categories data requests

const SPREADSHEET_ID = '1nGDVVUwF4Hg2Ke62JaxJBzIX3Tgxvp40v9VTif1hSw0';
const SHEET_NAME = 'crusade_points_categories';

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
        return getCrusadePointsCategoriesList();
      case 'get-by-crusade':
        return getCrusadePointsCategoriesByCrusade(e.parameter.crusade_key);
      case 'get-by-phase':
        return getCrusadePointsCategoriesByPhase(e.parameter.crusade_key, e.parameter.phase_key);
      case 'get-by-category':
        return getCrusadePointsCategoriesByCategory(e.parameter.crusade_key, e.parameter.phase_key, e.parameter.category);
      default:
        return getCrusadePointsCategoriesList();
    }
        
  } catch (error) {
    console.error('Error in crusade-points-categories doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all active crusade points categories entries
function getCrusadePointsCategoriesList() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points categories sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const filteredData = filterActiveRows(data);
    
    // Convert to objects with consistent field names
    const headers = filteredData[0];
    const rows = filteredData.slice(1);
    
    const categories = rows.map((row) => {
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
        data: categories,
        count: categories.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points categories list:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all categories entries for a specific crusade
function getCrusadePointsCategoriesByCrusade(crusadeKey) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points categories sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const crusadeKeyIndex = headers.indexOf('crusade_key');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    const categoryEntries = [];
    
    // Find all rows with the matching crusade_key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[crusadeKeyIndex] === crusadeKey && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const categoryData = {};
        headers.forEach((header, index) => {
          categoryData[header] = row[index] || '';
        });
        categoryEntries.push(categoryData);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: categoryEntries,
        count: categoryEntries.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points categories by crusade:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all categories entries for a specific crusade and phase
function getCrusadePointsCategoriesByPhase(crusadeKey, phaseKey) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points categories sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const crusadeKeyIndex = headers.indexOf('crusade_key');
    const phaseKeyIndex = headers.indexOf('phase_key');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    const categoryEntries = [];
    
    // Find all rows with the matching crusade_key and phase_key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[crusadeKeyIndex] === crusadeKey && 
          row[phaseKeyIndex] === phaseKey && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const categoryData = {};
        headers.forEach((header, index) => {
          categoryData[header] = row[index] || '';
        });
        categoryEntries.push(categoryData);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: categoryEntries,
        count: categoryEntries.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points categories by phase:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get a specific category entry by crusade, phase, and category
function getCrusadePointsCategoriesByCategory(crusadeKey, phaseKey, category) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusade points categories sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const crusadeKeyIndex = headers.indexOf('crusade_key');
    const phaseKeyIndex = headers.indexOf('phase_key');
    const categoryIndex = headers.indexOf('category');
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    // Find the row with the matching composite key
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[crusadeKeyIndex] === crusadeKey && 
          row[phaseKeyIndex] === phaseKey && 
          row[categoryIndex] === category && 
          (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
        // Convert row to object
        const categoryData = {};
        headers.forEach((header, index) => {
          categoryData[header] = row[index] || '';
        });
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            data: categoryData
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Points category entry not found'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade points categories by category:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
