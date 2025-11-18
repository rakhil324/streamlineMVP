# Streamline AI Chrome Extension

Chrome extension that autofills Greenhouse job application forms using profile data from your resume.

## Setup Instructions

1. **Load the extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

2. **Make sure the web app is running:**
   - The extension connects to `http://localhost:3000`
   - Make sure your Next.js dev server is running
   - Log in to the web app in a browser tab first (to establish session)

3. **Use the extension:**
   - Go to any Greenhouse job application page (e.g., `boards.greenhouse.io/*`)
   - You'll see a floating "🚀 Autofill with Streamline" button
   - Click it to automatically fill form fields with your profile data

## How It Works

1. **Profile Data Extraction:**
   - Extension calls `/api/user/profile` endpoint
   - API extracts data from your uploaded resume
   - Returns structured profile data (name, email, phone, education, experience, etc.)

2. **Form Field Detection:**
   - Content script scans the page for form fields
   - Matches field labels/names to profile data using keyword matching
   - Supports text inputs, textareas, and dropdowns

3. **Autofill:**
   - Fills matching fields with profile data
   - Shows notification with results
   - Handles different field types appropriately

## Field Matching

The extension matches fields using these patterns:
- **Name fields**: "first name", "last name", "full name", "name"
- **Contact**: "email", "phone", "location", "address"
- **Education**: "school", "university", "degree", "graduation date", "gpa"
- **Experience**: "company", "title", "position", "employer"

## Development

- `manifest.json` - Extension configuration
- `background.js` - Service worker for API calls and data caching
- `content.js` - Script injected into Greenhouse pages (form detection and autofill)
- `popup.html/js` - Extension popup UI for testing connection

## Notes

- Currently works with localhost:3000 (update manifest for production)
- Requires user to be logged into web app (session-based auth)
- Profile data is cached for 1 hour
- Only fills fields that match known patterns

