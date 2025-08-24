// filename: crusades-gas-script.js
// Google Apps Script for Crusades Sheet Access
// Deploy this as a web app to handle crusade data requests

// Configuration - UPDATE THESE VALUES
const SPREADSHEET_ID = '1Nzjg5YsL4i63r1cXVzVtF6AW3a2YseUCL_gV6tv9JmU'; // Your Crusades spreadsheet ID
const SHEET_NAME = 'Crusades'; // Update this to your actual sheet name (might be 'Crusades' or 'Sheet1')

function doGet(e) {
  try {
    const action = e.parameter.action || 'list';
    
    switch(action) {
      case 'list':
        return getCrusadesList();
      case 'get':
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

function getCrusadeByName(crusadeName) {
  try {
    console.log('getCrusadeByName called with name:', crusadeName);
    
    if (!crusadeName) {
      throw new Error('Crusade name is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found in spreadsheet`);
    }
    
    // Get all data
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    console.log('getCrusadeByName - Headers:', headers);
    console.log('getCrusadeByName - Looking for crusade:', crusadeName);
    
    // Find the crusade by name (Crusade Name should be in column 1, index 1)
    const crusadeRow = data.find((row, index) => {
      if (index === 0) return false; // Skip header row
      
      const rowCrusadeName = row[1]; // Crusade Name column
      if (!rowCrusadeName) return false;
      
      // Case-insensitive comparison with trimming
      const matches = rowCrusadeName.toString().toLowerCase().trim() === 
                     decodeURIComponent(crusadeName).toLowerCase().trim();
      
      console.log(`Comparing "${rowCrusadeName}" with "${crusadeName}": ${matches}`);
      return matches;
    });
    
    if (!crusadeRow) {
      // Show available crusades for debugging
      const availableCrusades = data.slice(1)
        .map(row => row[1])
        .filter(name => name)
        .slice(0, 10); // Limit to first 10 for logging
      
      console.log('Available crusades:', availableCrusades);
      throw new Error(`Crusade "${decodeURIComponent(crusadeName)}" not found. Available crusades: ${availableCrusades.join(', ')}`);
    }
    
    // Convert to object
    const crusade = {};
    headers.forEach((header, index) => {
      crusade[header] = crusadeRow[index];
    });
    
    console.log('getCrusadeByName - Found crusade:', crusade);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: crusade
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
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

// Test function to verify the script works
function testCrusadesScript() {
  console.log('=== Testing Crusades Script ===');
  
  try {
    // Test getting all crusades
    const allCrusades = getCrusadesList();
    console.log('All crusades result:', JSON.parse(allCrusades.getContent()));
    
    // Test getting a specific crusade (you'll need to update this with an actual crusade name)
    // const singleCrusade = getCrusadeByName('Your Crusade Name Here');
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