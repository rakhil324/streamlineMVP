/**
 * Automated Tests for Simplify Apply Extension
 * 
 * Run these tests to verify all features are working
 * 
 * Usage:
 * 1. Load extension in Chrome
 * 2. Open popup
 * 3. Open browser console (F12)
 * 4. Run: await runAllTests()
 */

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  total: 0,
};

/**
 * Test helper functions
 */
function logTest(name, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed.push({ name, message });
    console.log(`✅ PASS: ${name}${message ? ' - ' + message : ''}`);
  } else {
    testResults.failed.push({ name, message });
    console.error(`❌ FAIL: ${name}${message ? ' - ' + message : ''}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Profile Configuration
 */
async function testProfileConfig() {
  console.log('\n=== Test 1: Profile Configuration ===');
  
  try {
    // Import profile config (this would need to be available in test context)
    // For now, test that profile data exists in storage
    const profileData = await chrome.storage.local.get('profileData');
    
    if (profileData.profileData && profileData.profileData.data) {
      const profile = profileData.profileData.data;
      logTest('Profile exists in storage', true);
      logTest('Profile has required fields', 
        !!(profile.firstName && profile.lastName && profile.email), 
        `Missing: ${!profile.firstName ? 'firstName ' : ''}${!profile.lastName ? 'lastName ' : ''}${!profile.email ? 'email' : ''}`
      );
      logTest('Profile has contact info', 
        !!(profile.email && profile.phone && profile.location),
        `Has: email=${!!profile.email}, phone=${!!profile.phone}, location=${!!profile.location}`
      );
    } else {
      logTest('Profile exists in storage', false, 'No profile data found');
    }
  } catch (error) {
    logTest('Profile Configuration', false, error.message);
  }
}

/**
 * Test 2: Tab Switching
 */
async function testTabSwitching() {
  console.log('\n=== Test 2: Tab Switching ===');
  
  try {
    // Get all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    logTest('Tab buttons exist', tabButtons.length === 3, `Found ${tabButtons.length} buttons`);
    logTest('Tab contents exist', tabContents.length === 3, `Found ${tabContents.length} contents`);
    
    // Test clicking each tab
    for (const button of tabButtons) {
      const tabName = button.dataset.tab;
      if (tabName) {
        button.click();
        await sleep(100);
        
        const isActive = button.classList.contains('active');
        const content = document.getElementById(`${tabName}-tab`);
        const contentActive = content && content.classList.contains('active');
        
        logTest(`Tab "${tabName}" switches correctly`, 
          isActive && contentActive,
          `Button active: ${isActive}, Content active: ${contentActive}`
        );
      }
    }
  } catch (error) {
    logTest('Tab Switching', false, error.message);
  }
}

/**
 * Test 3: Profile Sync
 */
async function testProfileSync() {
  console.log('\n=== Test 3: Profile Sync ===');
  
  try {
    const syncBtn = document.getElementById('syncProfileBtn');
    
    if (!syncBtn) {
      logTest('Sync button exists', false, 'Button not found');
      return;
    }
    
    logTest('Sync button exists', true);
    
    // Click sync button
    syncBtn.click();
    await sleep(2000); // Wait for sync to complete
    
    // Check if profile was synced
    const profileData = await chrome.storage.local.get('profileData');
    logTest('Profile synced to storage', 
      !!(profileData.profileData && profileData.profileData.data),
      profileData.profileData ? 'Profile found' : 'No profile in storage'
    );
    
    // Check if profile is displayed
    const profileFields = document.getElementById('profile-fields');
    logTest('Profile displayed in UI', 
      !!(profileFields && profileFields.innerHTML.trim().length > 0),
      profileFields ? 'Fields container has content' : 'No profile fields container'
    );
  } catch (error) {
    logTest('Profile Sync', false, error.message);
  }
}

/**
 * Test 4: Autofill Button State
 */
async function testAutofillButton() {
  console.log('\n=== Test 4: Autofill Button ===');
  
  try {
    // Switch to autofill tab
    const autofillTab = document.querySelector('[data-tab="autofill"]');
    if (autofillTab) {
      autofillTab.click();
      await sleep(200);
    }
    
    const autofillBtn = document.getElementById('autofillBtn') || document.getElementById('tailorBtn');
    
    logTest('Autofill button exists', !!autofillBtn, autofillBtn ? 'Button found' : 'Button not found');
    
    if (autofillBtn) {
      const isDisabled = autofillBtn.disabled;
      const opacity = autofillBtn.style.opacity;
      
      // Check profile data to see if button should be enabled
      const profileData = await chrome.storage.local.get('profileData');
      const hasProfile = !!(profileData.profileData && profileData.profileData.data);
      
      if (hasProfile) {
        const profile = profileData.profileData.data;
        const hasRequiredFields = !!(profile.email || profile.phone || profile.location);
        
        logTest('Autofill button enabled when profile exists', 
          !isDisabled && opacity !== '0.5',
          `Disabled: ${isDisabled}, Opacity: ${opacity}, Has required fields: ${hasRequiredFields}`
        );
      } else {
        logTest('Autofill button disabled when no profile', 
          isDisabled || opacity === '0.5',
          `Disabled: ${isDisabled}, Opacity: ${opacity}`
        );
      }
    }
  } catch (error) {
    logTest('Autofill Button', false, error.message);
  }
}

/**
 * Test 5: Keywords Score
 */
async function testKeywordsScore() {
  console.log('\n=== Test 5: Keywords Score ===');
  
  try {
    // Switch to keywords tab
    const keywordsTab = document.querySelector('[data-tab="keywords"]');
    if (keywordsTab) {
      keywordsTab.click();
      await sleep(200);
    }
    
    const calcBtn = document.getElementById('calculateKeywordsBtn');
    const scoreBadge = document.getElementById('keywordsScoreBadge');
    const scoreText = document.getElementById('keywordsScoreText');
    
    logTest('Calculate button exists', !!calcBtn);
    logTest('Score badge exists', !!scoreBadge);
    logTest('Score text exists', !!scoreText);
    
    if (calcBtn) {
      // Check if button is clickable
      logTest('Calculate button is clickable', !calcBtn.disabled);
    }
  } catch (error) {
    logTest('Keywords Score', false, error.message);
  }
}

/**
 * Test 6: Profile Display
 */
async function testProfileDisplay() {
  console.log('\n=== Test 6: Profile Display ===');
  
  try {
    // Switch to profile tab
    const profileTab = document.querySelector('[data-tab="profile"]');
    if (profileTab) {
      profileTab.click();
      await sleep(200);
    }
    
    const profileFields = document.getElementById('profile-fields');
    const profileName = document.querySelector('.profile-name');
    const avatar = document.querySelector('.avatar-large');
    
    logTest('Profile fields container exists', !!profileFields);
    logTest('Profile name element exists', !!profileName);
    logTest('Avatar element exists', !!avatar);
    
    if (profileFields) {
      const hasContent = profileFields.innerHTML.trim().length > 0;
      logTest('Profile fields have content', hasContent, 
        hasContent ? 'Fields displayed' : 'No fields displayed'
      );
    }
    
    // Check for copyable fields
    const copyableFields = document.querySelectorAll('.copyable-field');
    logTest('Copyable fields exist', copyableFields.length > 0, 
      `Found ${copyableFields.length} copyable fields`
    );
  } catch (error) {
    logTest('Profile Display', false, error.message);
  }
}

/**
 * Test 7: Message Passing
 */
async function testMessagePassing() {
  console.log('\n=== Test 7: Message Passing ===');
  
  try {
    // Test sending message to background
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'REQUEST_PROFILE_DATA' }, (response) => {
        resolve(response);
      });
    });
    
    logTest('Message passing works', !!(response && response.success), 
      response ? `Response received: ${response.success}` : 'No response'
    );
    
    if (response && response.data) {
      logTest('Profile data returned via message', true, 
        `Profile has ${Object.keys(response.data).length} fields`
      );
    }
  } catch (error) {
    logTest('Message Passing', false, error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Automated Tests for Simplify Apply Extension\n');
  console.log('='.repeat(60));
  
  testResults.passed = [];
  testResults.failed = [];
  testResults.total = 0;
  
  // Run all tests
  await testProfileConfig();
  await sleep(500);
  
  await testTabSwitching();
  await sleep(500);
  
  await testProfileSync();
  await sleep(500);
  
  await testAutofillButton();
  await sleep(500);
  
  await testKeywordsScore();
  await sleep(500);
  
  await testProfileDisplay();
  await sleep(500);
  
  await testMessagePassing();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`Success Rate: ${((testResults.passed.length / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.failed.forEach(test => {
      console.log(`  - ${test.name}: ${test.message || 'No details'}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  return {
    total: testResults.total,
    passed: testResults.passed.length,
    failed: testResults.failed.length,
    results: testResults
  };
}

// Make function available globally
if (typeof window !== 'undefined') {
  window.runAllTests = runAllTests;
  window.testResults = testResults;
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testResults };
}

