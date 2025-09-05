// filename: stories-gas-script.js
// Google Apps Script for Stories Sheet
// Deploy this as a web app to handle story submissions and retrieval
// Updated to include Deleted Timestamp column for soft deletion

const SPREADSHEET_ID = '1Abqj7jWKzeupZMBF48GgSWG-u1kpPKsQfXHrzIw2uwQ';
const SHEET_NAME = 'Stories';

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

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate unique story key using UUID
function generateStoryKey() {
  return generateUUID();
}

function doPost(e) {
  try {
    console.log('doPost called for story submission');
    console.log('Parameters:', e.parameter);
    
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
    
    // Validate required fields
    const required = ['userKey', 'title', 'storyType'];
    const missing = required.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error('Missing required fields: ' + missing.join(', '));
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating Stories sheet');
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      const headers = [
        'Key',
        'Timestamp',
        'User Key',
        'Force Key',
        'Crusade Key',
        'Story Type',
        'Title',
        'Imperial Date',
        'Story Text 1',
        'Story Text 2',
        'Story Text 3',
        'Text Link',
        'Image 1',
        'Image 2',
        'Image 3',
        'Audio Link',
        'Deleted Timestamp'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
      
      // Set column widths
      sheet.setColumnWidth(1, 250); // Key
      sheet.setColumnWidth(2, 150); // Timestamp
      sheet.setColumnWidth(3, 150); // User Key
      sheet.setColumnWidth(4, 150); // Force Key
      sheet.setColumnWidth(5, 150); // Crusade Key
      sheet.setColumnWidth(6, 120); // Story Type
      sheet.setColumnWidth(7, 300); // Title
      sheet.setColumnWidth(8, 150); // Imperial Date
      sheet.setColumnWidth(9, 500); // Story Text 1
      sheet.setColumnWidth(10, 500); // Story Text 2
      sheet.setColumnWidth(11, 500); // Story Text 3
      sheet.setColumnWidth(12, 200); // Text Link
      sheet.setColumnWidth(13, 200); // Image 1
      sheet.setColumnWidth(14, 200); // Image 2
      sheet.setColumnWidth(15, 200); // Image 3
      sheet.setColumnWidth(16, 200); // Audio Link
      sheet.setColumnWidth(17, 150); // Deleted Timestamp
    }
    
    // Generate unique key
    const storyKey = generateStoryKey(data.userKey, data.title);
    console.log('Generated story key:', storyKey);
    
    // Parse timestamp
    const timestamp = new Date();
    
    // Prepare row data
    const rowData = [
      storyKey,                     // Key
      timestamp,                    // Timestamp
      data.userKey || '',           // User Key
      data.forceKey || '',          // Force Key
      data.crusadeKey || '',        // Crusade Key
      data.storyType || '',         // Story Type
      data.title || '',             // Title
      data.imperialDate || '',      // Imperial Date
      data.storyText1 || '',        // Story Text 1
      data.storyText2 || '',        // Story Text 2
      data.storyText3 || '',        // Story Text 3
      data.textLink || '',          // Text Link
      data.image1 || '',            // Image 1
      data.image2 || '',            // Image 2
      data.image3 || '',            // Image 3
      data.audioLink || '',         // Audio Link
      ''                            // Deleted Timestamp (empty for new records)
    ];
    
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    
    sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);
    
    // Format the new row
    sheet.getRange(newRowNumber, 1).setFontWeight('bold'); // Key
    sheet.getRange(newRowNumber, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss'); // Timestamp
    
    // Set text wrapping for story text columns
    sheet.getRange(newRowNumber, 9, 1, 3).setWrap(true); // Story Text 1-3
    
    console.log('Story saved successfully');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Story submitted successfully',
        key: storyKey,
        timestamp: timestamp.toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error processing story submission:', error);
    
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
        return getStoriesList(e.parameter);
      case 'get':
        return getStoryByKey(e.parameter.key);
      case 'user-stories':
        return getStoriesForUser(e.parameter.userKey);
      case 'force-stories':
        return getStoriesForForce(e.parameter.forceKey);
      case 'crusade-stories':
        return getStoriesForCrusade(e.parameter.crusadeKey);
      case 'recent':
        return getRecentStories(e.parameter.limit);
      case 'delete':
        return softDeleteStory(e.parameter.key);
      default:
        return getStoriesList(e.parameter);
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

function getStoriesList(params = {}) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows
  const activeData = filterActiveRows(data);
  
  // Filter by story type if specified
  let filteredData = activeData;
  if (params.storyType) {
    const headers = activeData[0];
    const storyTypeIndex = headers.indexOf('Story Type');
    filteredData = [headers].concat(
      activeData.slice(1).filter(row => row[storyTypeIndex] === params.storyType)
    );
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(filteredData))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStoryByKey(storyKey) {
  if (!storyKey) {
    throw new Error('Story key is required');
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Stories sheet not found');
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Check if row is deleted
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find by key (column 0)
  const storyRow = data.find((row, index) => {
    if (index === 0) return false;
    // Check if not deleted
    if (deletedTimestampIndex !== -1 && row[deletedTimestampIndex]) return false;
    return row[0] === storyKey;
  });
  
  if (!storyRow) {
    throw new Error('Story not found or deleted');
  }
  
  // Convert to object
  const story = {};
  headers.forEach((header, index) => {
    story[header] = storyRow[index];
  });
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: story
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStoriesForUser(userKey) {
  if (!userKey) {
    throw new Error('User key is required');
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        stories: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows first
  const activeData = filterActiveRows(data);
  
  const headers = activeData[0];
  
  // Filter stories by user key (column 2)
  const stories = activeData.slice(1)
    .filter(row => row[2] === userKey)
    .map(row => {
      const story = {};
      headers.forEach((header, index) => {
        story[header] = row[index];
      });
      return story;
    });
  
  console.log(`Found ${stories.length} active stories for user key "${userKey}"`);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      stories: stories
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStoriesForForce(forceKey) {
  if (!forceKey) {
    throw new Error('Force key is required');
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        stories: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows first
  const activeData = filterActiveRows(data);
  
  const headers = activeData[0];
  
  // Filter stories by force key (column 3)
  const stories = activeData.slice(1)
    .filter(row => row[3] === forceKey)
    .map(row => {
      const story = {};
      headers.forEach((header, index) => {
        story[header] = row[index];
      });
      return story;
    });
  
  console.log(`Found ${stories.length} active stories for force key "${forceKey}"`);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      stories: stories
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStoriesForCrusade(crusadeKey) {
  if (!crusadeKey) {
    throw new Error('Crusade key is required');
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        stories: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows first
  const activeData = filterActiveRows(data);
  
  const headers = activeData[0];
  
  // Filter stories by crusade key (column 4)
  const stories = activeData.slice(1)
    .filter(row => row[4] === crusadeKey)
    .map(row => {
      const story = {};
      headers.forEach((header, index) => {
        story[header] = row[index];
      });
      return story;
    });
  
  console.log(`Found ${stories.length} active stories for crusade key "${crusadeKey}"`);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      stories: stories
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRecentStories(limit = 10) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        stories: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows
  const activeData = filterActiveRows(data);
  
  const headers = activeData[0];
  const maxRows = Math.min(parseInt(limit), activeData.length - 1);
  
  // Get the most recent stories (assuming they're at the bottom)
  const recentRows = activeData.slice(Math.max(1, activeData.length - maxRows));
  
  const stories = recentRows.map(row => {
    const story = {};
    headers.forEach((header, index) => {
      story[header] = row[index];
    });
    return story;
  }).reverse(); // Most recent first
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      stories: stories
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Soft delete function
function softDeleteStory(storyKey) {
  try {
    if (!storyKey) {
      throw new Error('Story key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Stories sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find Deleted Timestamp column index
    let deletedTimestampIndex = headers.indexOf('Deleted Timestamp');
    
    // If column doesn't exist, add it
    if (deletedTimestampIndex === -1) {
      sheet.insertColumnAfter(headers.length);
      sheet.getRange(1, headers.length + 1).setValue('Deleted Timestamp');
      sheet.getRange(1, headers.length + 1).setFontWeight('bold');
      sheet.getRange(1, headers.length + 1).setBackground('#4ecdc4');
      sheet.getRange(1, headers.length + 1).setFontColor('#ffffff');
      deletedTimestampIndex = headers.length;
    }
    
    // Find the row with the matching key
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === storyKey) { // Key is in column 0
        // Set the Deleted Timestamp value
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(new Date());
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
        
        console.log('Soft deleted story:', storyKey);
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'Story soft deleted successfully',
            key: storyKey
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    throw new Error('Story not found');
    
  } catch (error) {
    console.error('Error soft deleting story:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function testStoriesScript() {
  console.log('=== Testing Stories Script ===');
  
  try {
    // Test key generation
    const testKey = generateStoryKey('TestUser', 'The Battle of Terra');
    console.log('Test story key:', testKey);
    
    // Test getting all stories
    const allStories = getStoriesList({});
    console.log('All stories result:', JSON.parse(allStories.getContent()));
    
  } catch (error) {
    console.error('Test error:', error);
  }
}