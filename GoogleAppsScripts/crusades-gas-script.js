// filename: crusades-gas-script.js
// Google Apps Script for Crusades Sheet Access with Key System
// Deploy this as a web app to handle crusade data requests

const SPREADSHEET_ID = '1Nzjg5YsL4i63r1cXVzVtF6AW3a2YseUCL_gV6tv9JmU'; 
const SHEET_NAME = 'Crusades';

// Key generation function
function generateCrusadeKey(crusadeName) {
  // Simple crusade key - just cleaned name
  return crusadeName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
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
    
    // Check if we need to add a key column (if first column isn't "Key")
    if (data[0][0] !== 'Key') {
      console.log('Adding Key column to existing Crusades sheet');
      
      // Insert a new column at the beginning
      sheet.insertColumnBefore(1);
      
      // Add "Key" header
      sheet.getRange(1, 1).setValue('Key');
      sheet.getRange(1, 1).setFontWeight('bold');
      sheet.getRange(1, 1).setBackground('#4ecdc4');
      sheet.getRange(1, 1).setFontColor('#ffffff');
      
      // Generate keys for existing rows
      for (let i = 1; i < data.length; i++) {
        const crusadeName = data[i][1]; // Crusade Name is now in column 2
        if (crusadeName) {
          const key = generateCrusadeKey(crusadeName);
          sheet.getRange(i + 1, 1).setValue(key);
          sheet.getRange(i + 1, 1).setFontWeight('bold');
        }
      }
      
      // Set column width
      sheet.setColumnWidth(1, 200);
      
      // Refresh data after adding keys
      const updatedData = sheet.getDataRange().getValues();
      
      console.log('getCrusadesList - Total rows with keys:', updatedData.length);
      console.log('getCrusadesList - Headers:', updatedData[0]);
      
      return ContentService
        .createTextOutput(JSON.stringify(updatedData))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    console.log('getCrusadesList - Total rows found:', data.length);
    console.log('getCrusadesList - Headers:', data[0]);
    
    // Return the raw data array format (like the other sheets)
    // This will be compatible with the existing GoogleSheetsEmbed component
    return ContentService
      .createTextOutput(JSON.stringify(data))
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
    
    console.log('getCrusadeByKey - Headers:', headers);
    console.log('getCrusadeByKey - Looking for crusade key:', crusadeKey);
    
    // Find the crusade by key (Key should be in column 0)
    const crusadeRow = data.find((row, index) => {
      if (index === 0) return false; // Skip header row
      return row[0] === crusadeKey; // Key column
    });
    
    if (!crusadeRow) {
      // Show available keys for debugging
      const availableKeys = data.slice(1)
        .map(row => row[0])
        .filter(key => key)
        .slice(0, 10); // Limit to first 10 for logging
      
      console.log('Available crusade keys:', availableKeys);
      throw new Error(`Crusade with key "${crusadeKey}" not found. Available keys: ${availableKeys.join(', ')}`);
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
    
    // Check if crusade already exists
    if (sheet.getLastRow() > 1) {
      const existingKeys = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
      
      if (existingKeys.includes(crusadeKey)) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'A crusade with this name already exists'
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Prepare row data (adjust based on your actual crusade fields)
    const newRow = [
      crusadeKey,                           // Key
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
      data.narrativeBlock2 || ''           // Narrative Block 2
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
    
    // Test getting a specific crusade (you'll need to update this with an actual crusade key)
    // const singleCrusade = getCrusadeByKey('SummerCampaign2024');
    // console.log('Single crusade result:', JSON.parse(singleCrusade.getContent()));
    
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