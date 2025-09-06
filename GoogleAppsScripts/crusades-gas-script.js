// filename: crusades-gas-script.js
// Google Apps Script for Crusades Sheet Access with Key System
// Deploy this as a web app to handle crusade data requests

const SPREADSHEET_ID = '1Nzjg5YsL4i63r1cXVzVtF6AW3a2YseUCL_gV6tv9JmU'; 
const SHEET_NAME = 'crusades';

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

// Key generation function
function generateCrusadeKey(crusadeName) {
  // Simple crusade key - just cleaned name
  return clean(crusadeName, 30);
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'list';
    
    switch(action) {
      case 'list':
        return getCrusadesList();
      case 'get':
        return getCrusadeByKey(e.parameter.key);
      case 'get-by-name':
        return getCrusadeByName(e.parameter.name);
      case 'delete':
        return softDeleteCrusade(e.parameter.key);
      default:
        return getCrusadesList();
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

function getCrusadesList() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found in spreadsheet`);
    }
    
    // Get all data
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      throw new Error('No data found in sheet');
    }
    
    // Get headers from existing data
    const headers = data[0];
    
    // Filter out deleted rows
    const activeData = filterActiveRows(data);
    
    console.log('getCrusadesList - Total active rows:', activeData.length);
    console.log('getCrusadesList - Headers:', activeData[0]);
    
    // Return the raw data array format (like the other sheets)
    // This will be compatible with the existing GoogleSheetsEmbed component
    return ContentService
      .createTextOutput(JSON.stringify(activeData))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusades list:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getCrusadeByKey(crusadeKey) {
  try {
    console.log('getCrusadeByKey called with key:', crusadeKey);
    
    if (!crusadeKey) {
      throw new Error('Crusade key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found in spreadsheet`);
    }
    
    // Get all data
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Check if row is deleted
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    console.log('getCrusadeByKey - Headers:', headers);
    console.log('getCrusadeByKey - Looking for crusade key:', crusadeKey);
    
    // Find the crusade by key - look for crusade_key column dynamically
    const keyColumnIndex = headers.indexOf('crusade_key');
    if (keyColumnIndex === -1) {
      throw new Error('crusade_key column not found in sheet structure');
    }
    
    const crusadeRow = data.find((row, index) => {
      if (index === 0) return false; // Skip header row
      // Check if not deleted
      if (deletedTimestampIndex !== -1 && row[deletedTimestampIndex]) return false;
      return row[keyColumnIndex] === crusadeKey; // Use dynamic key column index
    });
    
    if (!crusadeRow) {
      // Show available keys for debugging
      const availableKeys = data.slice(1)
        .filter(row => !row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')
        .map(row => row[keyColumnIndex])
        .filter(key => key)
        .slice(0, 10); // Limit to first 10 for logging
      
      console.log('Available crusade keys:', availableKeys);
      throw new Error(`Crusade with key "${crusadeKey}" not found or deleted. Available keys: ${availableKeys.join(', ')}`);
    }
    
    // Convert to object
    const crusade = {};
    headers.forEach((header, index) => {
      crusade[header] = crusadeRow[index];
    });
    
    console.log('getCrusadeByKey - Found crusade:', crusade);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: crusade
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting crusade by key:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getCrusadeByName(crusadeName) {
  try {
    console.log('getCrusadeByName called with name:', crusadeName);
    
    if (!crusadeName) {
      throw new Error('Crusade name is required');
    }
    
    // Generate the key from the name and use key-based lookup
    const crusadeKey = generateCrusadeKey(crusadeName);
    console.log('Generated crusade key:', crusadeKey);
    
    return getCrusadeByKey(crusadeKey);
    
  } catch (error) {
    console.error('Error getting crusade by name:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// POST handler for creating/updating crusades
function doPost(e) {
  try {
    console.log('doPost called for crusade creation/update');
    
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
    
    // Validate required field
    if (!data.crusadeName) {
      throw new Error('Crusade name is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusades sheet not found');
    }
    
    // Generate crusade key
    const crusadeKey = generateCrusadeKey(data.crusadeName);
    console.log('Generated crusade key:', crusadeKey);
    
    // Check if crusade already exists (and is not deleted)
    if (sheet.getLastRow() > 1) {
      const allData = sheet.getDataRange().getValues();
      const headers = allData[0];
      const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
      
      const keyColumnIndex = headers.indexOf('crusade_key');
      if (keyColumnIndex !== -1) {
        for (let i = 1; i < allData.length; i++) {
          if (allData[i][keyColumnIndex] === crusadeKey) {
            // Check if it's deleted
            if (deletedTimestampIndex !== -1 && allData[i][deletedTimestampIndex]) {
              console.log('Crusade key exists but is deleted, allowing recreation');
            } else {
              return ContentService
                .createTextOutput(JSON.stringify({
                  success: false,
                  error: 'A crusade with this name already exists'
                }))
                .setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      }
    }
    
    // Prepare row data (adjust based on your actual crusade fields)
    const newRow = [
      crusadeKey,                           // crusade_key
      data.state || 'Planning',             // State
      data.crusadeName,                     // Crusade Name
      data.crusadeType || '',               // Crusade Type
      data.startDate || '',                 // Start Date
      data.endDate || '',                   // End Date
      data.introduction || '',              // Introduction
      data.rulesBlock1 || '',              // Rules Block 1
      data.rulesBlock2 || '',              // Rules Block 2
      data.rulesBlock3 || '',              // Rules Block 3
      data.narrativeBlock1 || '',          // Narrative Block 1
      data.narrativeBlock2 || '',          // Narrative Block 2
      ''                                    // Deleted Timestamp (empty for new records)
    ];
    
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
    
    // Format key column
    sheet.getRange(lastRow + 1, 1).setFontWeight('bold');
    
    console.log('Crusade created/updated successfully with key:', crusadeKey);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Crusade saved successfully',
        key: crusadeKey
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doPost:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Soft delete function
function softDeleteCrusade(crusadeKey) {
  try {
    if (!crusadeKey) {
      throw new Error('Crusade key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Crusades sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find Deleted Timestamp column index
    let deletedTimestampIndex = headers.indexOf('Deleted Timestamp');
    
    // If column doesn't exist, throw error instead of adding it
    if (deletedTimestampIndex === -1) {
      throw new Error('Deleted Timestamp column not found in sheet structure');
    }
    
    // Find the row with the matching key
    const keyColumnIndex = headers.indexOf('crusade_key');
    if (keyColumnIndex === -1) {
      throw new Error('crusade_key column not found in sheet structure');
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][keyColumnIndex] === crusadeKey) { // Use dynamic key column index
        // Set the Deleted Timestamp value
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(new Date());
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
        
        console.log('Soft deleted crusade:', crusadeKey);
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'Crusade soft deleted successfully',
            key: crusadeKey
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    throw new Error('Crusade not found');
    
  } catch (error) {
    console.error('Error soft deleting crusade:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function to verify the script works
function testCrusadesScript() {
  console.log('=== Testing Crusades Script ===');
  
  try {
    // Test getting all crusades
    const allCrusades = getCrusadesList();
    console.log('All crusades result:', JSON.parse(allCrusades.getContent()));
    
    // Test key generation
    const testKey = generateCrusadeKey('Summer Campaign 2024');
    console.log('Test crusade key:', testKey);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Utility function to check sheet structure
function debugSheetStructure() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Spreadsheet name:', spreadsheet.getName());
    
    const sheets = spreadsheet.getSheets();
    console.log('Available sheets:');
    sheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.getName()} (${sheet.getLastRow()} rows, ${sheet.getLastColumn()} columns)`);
    });
    
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (sheet) {
      console.log(`Using sheet: ${SHEET_NAME}`);
      const data = sheet.getDataRange().getValues();
      console.log('Headers:', data[0]);
      console.log(`Sample data (first 3 rows):`, data.slice(0, 3));
    } else {
      console.log(`Sheet "${SHEET_NAME}" not found!`);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}