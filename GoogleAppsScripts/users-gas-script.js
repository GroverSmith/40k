// filename: users-gas-script.js
// Google Apps Script for Users Sheet Management with Key System
// Deploy this as a web app to handle user creation and retrieval

const SPREADSHEET_ID = '15q9EIPz2PswXwNsZ0aJAb9mgT0qy_NXUUQqELEdx3W4';
const SHEET_NAME = 'Users';

// Key generation function
function generateUserKey(name) {
  // Simple user key - just cleaned name
  return name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
}

function doPost(e) {
  try {
    console.log('doPost called for user creation');
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
    if (!data.name) {
      throw new Error('Name is required');
    }
    
    console.log('Creating user:', data.name);
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating users sheet');
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      // Add headers with Key column first
      const headers = ['Key', 'Timestamp', 'Name', 'Discord Handle', 'Email', 'Notes', 'Self Rating', 'Years Experience', 'Games Per Year'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
      
      // Set column widths
      sheet.setColumnWidth(1, 180); // Key
      sheet.setColumnWidth(2, 150); // Timestamp
      sheet.setColumnWidth(3, 150); // Name
      sheet.setColumnWidth(4, 150); // Discord Handle
      sheet.setColumnWidth(5, 200); // Email
      sheet.setColumnWidth(6, 300); // Notes
      sheet.setColumnWidth(7, 100); // Self Rating
      sheet.setColumnWidth(8, 120); // Years Experience
      sheet.setColumnWidth(9, 120); // Games Per Year
    }
    
    // Generate user key
    const userKey = generateUserKey(data.name);
    console.log('Generated user key:', userKey);
    
    // Check if user key already exists
    if (sheet.getLastRow() > 1) {
      const existingKeys = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
      
      if (existingKeys.includes(userKey)) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'A user with this name already exists'
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Add new user
    const timestamp = new Date();
    const newRow = [
      userKey,                             // Key
      timestamp,                           // Timestamp
      data.name.trim(),                    // Name
      data.discordHandle || '',            // Discord Handle
      data.email || '',                    // Email
      data.notes || '',                    // Notes
      data.selfRating || '',               // Self Rating
      data.yearsExperience || '',          // Years Experience
      data.gamesPerYear || ''              // Games Per Year
    ];
    
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
    
    // Format key column
    sheet.getRange(lastRow + 1, 1).setFontWeight('bold');
    // Format timestamp column
    sheet.getRange(lastRow + 1, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    console.log('User created successfully with key:', userKey);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'User created successfully',
        key: userKey,
        user: {
          key: userKey,
          name: data.name,
          discordHandle: data.discordHandle || '',
          email: data.email || '',
          notes: data.notes || '',
          selfRating: data.selfRating || '',
          yearsExperience: data.yearsExperience || '',
          gamesPerYear: data.gamesPerYear || '',
          timestamp: timestamp.toISOString()
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error creating user:', error);
    
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
        return getUsersList();
      case 'get':
        return getUserByKey(e.parameter.key);
      case 'get-by-name':
        return getUserByName(e.parameter.name);
      default:
        return getUsersList();
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

function getUsersList() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      // Return empty array with headers if no sheet exists yet
      return ContentService
        .createTextOutput(JSON.stringify([['Key', 'Timestamp', 'Name', 'Discord Handle', 'Email', 'Notes', 'Self Rating', 'Years Experience', 'Games Per Year']]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    
    console.log('getUsersList - Total rows found:', data.length);
    
    // Return raw data for compatibility with existing sheets system
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting users list:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getUserByKey(userKey) {
  try {
    console.log('getUserByKey called with:', userKey);
    
    if (!userKey) {
      throw new Error('User key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Users sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find the user by key (Key is column 0)
    const userRow = data.find((row, index) => {
      if (index === 0) return false; // Skip header row
      return row[0] === userKey;
    });
    
    if (!userRow) {
      throw new Error(`User with key "${userKey}" not found`);
    }
    
    // Convert to object
    const user = {};
    headers.forEach((header, index) => {
      user[header] = userRow[index];
    });
    
    console.log('getUserByKey - Found user:', user);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: user
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting user by key:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getUserByName(userName) {
  try {
    console.log('getUserByName called with:', userName);
    
    if (!userName) {
      throw new Error('User name is required');
    }
    
    // Generate the key from the name and use key-based lookup
    const userKey = generateUserKey(userName);
    return getUserByKey(userKey);
    
  } catch (error) {
    console.error('Error getting user by name:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test functions
function testUsersScript() {
  console.log('=== Testing Users Script ===');
  
  try {
    // Test getting all users
    const allUsers = getUsersList();
    console.log('All users result:', JSON.parse(allUsers.getContent()));
    
    // Test key generation
    const testKey = generateUserKey('John Smith');
    console.log('Test user key:', testKey);
    
    // Test creating a user (commented out to avoid creating test data)
    // const testUser = {
    //   name: 'Test User',
    //   discordHandle: 'testuser#1234',
    //   email: 'test@example.com',
    //   notes: 'Test user for development',
    //   selfRating: '3',
    //   yearsExperience: '5',
    //   gamesPerYear: '12'
    // };
    // const createResult = doPost({ parameter: testUser });
    // console.log('Create user result:', JSON.parse(createResult.getContent()));
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

function debugUsersSheet() {
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