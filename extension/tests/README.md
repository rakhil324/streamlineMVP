# Automated Testing Guide

## Overview
This directory contains automated tests for the Simplify Apply Chrome extension.

## Running Tests

### Method 1: Browser Console (Recommended)
1. Load the extension in Chrome
2. Open the extension popup
3. Open browser DevTools (F12 or right-click → Inspect)
4. Go to the Console tab
5. Run: `await runAllTests()`

### Method 2: Background Script Console
1. Load the extension in Chrome
2. Go to `chrome://extensions/`
3. Find "Simplify Apply" extension
4. Click "service worker" or "background page" link
5. In the console, you can run individual test functions

## Test Coverage

The automated tests cover:

1. **Profile Configuration** ✅
   - Profile exists in storage
   - Profile has required fields (firstName, lastName, email)
   - Profile has contact info (email, phone, location)

2. **Tab Switching** ✅
   - All tab buttons exist
   - All tab contents exist
   - Clicking tabs switches correctly
   - Active states update properly

3. **Profile Sync** ✅
   - Sync button exists
   - Profile syncs to storage
   - Profile displays in UI after sync

4. **Autofill Button** ✅
   - Autofill button exists
   - Button enabled when profile exists
   - Button disabled when no profile

5. **Keywords Score** ✅
   - Calculate button exists
   - Score badge exists
   - Score text exists
   - Button is clickable

6. **Profile Display** ✅
   - Profile fields container exists
   - Profile name element exists
   - Avatar element exists
   - Copyable fields exist

7. **Message Passing** ✅
   - Messages pass between popup and background
   - Profile data returned via messages

## Test Results

After running tests, you'll see:
- ✅ Passed tests
- ❌ Failed tests with error messages
- Summary statistics (total, passed, failed, success rate)

## Troubleshooting

### Tests Fail to Run
- Make sure extension is loaded
- Check browser console for errors
- Verify popup.html includes the test script

### Profile Tests Fail
- Check that profile-config.js exists
- Verify hardcoded profile data is valid
- Check browser storage (chrome.storage.local)

### Tab Switching Tests Fail
- Verify popup.html has all tab buttons
- Check that tab-content divs exist
- Ensure initTabs() is called on load

## Adding New Tests

To add a new test:

1. Create a new test function:
```javascript
async function testNewFeature() {
  console.log('\n=== Test X: New Feature ===');
  // Your test code here
  logTest('Feature works', true/false, 'Optional message');
}
```

2. Add it to `runAllTests()`:
```javascript
await testNewFeature();
await sleep(500);
```

3. Use helper functions:
- `logTest(name, passed, message)` - Log test result
- `sleep(ms)` - Wait for async operations

## Future Enhancements

- [ ] Add visual regression tests
- [ ] Add performance benchmarks
- [ ] Add integration tests with content scripts
- [ ] Add tests for ATS-specific features (Workday, Greenhouse, Lever)
- [ ] Add CI/CD integration

