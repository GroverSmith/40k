// filename: users-gas-script.js
// Google Apps Script for Users Sheet Management
// Deploy this as a web app to handle user creation and retrieval

const SPREADSHEET_ID = '15q9EIPz2PswXwNsZ0aJAb9mgT0qy_NXUUQqELEdx3W4';
const SHEET_NAME = 'Users';

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
      
      // Add headers
      const headers = ['Timestamp', 'Name', 'Discord Handle', 'Email', 'Notes', 'Self Rating', 'Years Experience', 'Games Per Year'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
      
      // Set column widths
      sheet.setColumnWidth(1, 150); // Timestamp
      sheet.setColumnWidth(2, 150); // Name
      sheet.setColumnWidth(3, 150); // Discord Handle
      sheet.setColumnWidth(4, 200); // Email
      sheet.setColumnWidth(5, 300); // Notes
      sheet.setColumnWidth(6, 100); // Self Rating
      sheet.setColumnWidth(7, 120); // Years Experience
      sheet.setColumnWidth(8, 120); // Games Per Year
    }
    
    // Check if user already exists
    const data_range = sheet.getDataRange();
    const values = data_range.getValues();
    
    const existingUser = values.find((row, index) => {
      if (index === 0) return false; // Skip header
      return row[1] && row[1].toString().toLowerCase().trim() === data.name.toLowerCase().trim();
    });
    
    if (existingUser) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'A user with this name already exists'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Add new user
    const timestamp = new Date();
    const newRow = [
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
    
    // Format timestamp column
    sheet.getRange(lastRow + 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    console.log('User created successfully:', data.name);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'User created successfully',
        user: {
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
      // Return empty array if no sheet exists yet
      return ContentService
        .createTextOutput(JSON.stringify([['Timestamp', 'Name', 'Discord Handle', 'Email', 'Notes', 'Self Rating', 'Years Experience', 'Games Per Year']]))
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

function getUserByName(userName) {
  try {
    console.log('getUserByName called with:', userName);
    
    if (!userName) {
      throw new Error('User name is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Users sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find the user by name (Name is now in column 1, index 1)
    const userRow = data.find((row, index) => {
      if (index === 0) return false; // Skip header row
      
      const rowUserName = row[1]; // Name column
      if (!rowUserName) return false;
      
      // Case-insensitive comparison with trimming
      return rowUserName.toString().toLowerCase().trim() === userName.toLowerCase().trim();
    });
    
    if (!userRow) {
      throw new Error(`User "${userName}" not found`);
    }
    
    // Convert to object
    const user = {};
    headers.forEach((header, index) => {
      user[header] = userRow[index];
    });
    
    console.log('getUserByName - Found user:', user);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: user
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
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