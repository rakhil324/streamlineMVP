# Simplify Apply - Chrome Extension

A standalone Chrome extension that helps students apply to jobs faster by detecting and autofilling job application forms on Workday, Greenhouse, and Lever ATS platforms.

## Features

- ✅ **Automatic Form Detection** - Detects application forms on supported ATS sites
- ✅ **Smart Autofill** - Automatically fills form fields with your saved profile data
- ✅ **AI-Powered Tailoring** - Tailors resumes and cover letters for specific jobs (requires backend)
- ✅ **Secure Storage** - Encrypts all sensitive data using AES-GCM encryption
- ✅ **Works Offline** - Core autofill works without backend connection
- ✅ **Keywords Score** - Analyzes keyword match between resume and job description

## Supported Platforms

- **Workday** - `*.workday.com`, `*.myworkdayjobs.com`
- **Greenhouse** - `*.greenhouse.io`
- **Lever** - `*.lever.co`, `*.jobs.lever.co`

## Installation

### Quick Start - Generate Icons First! ⚠️

**Before loading the extension, you MUST create the icon files:**

#### Option 1: Using HTML Generator (Easiest - Recommended)
1. Open `create-icons.html` in your browser
2. Icons will be generated automatically
3. Right-click each icon and "Save image as..."
4. Save them in the `icons/` folder with these exact names:
   - `icon16.png` (16x16)
   - `icon32.png` (32x32)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)

#### Option 2: Using Python Script
```bash
# Requires Pillow: pip install Pillow
python generate-icons.py
```

#### Option 3: Using ImageMagick (Linux/Mac)
```bash
chmod +x generate-icons.sh
./generate-icons.sh
```

**After creating icons, continue with the steps below.**

### From Source (Development)

1. **Clone or download this extension folder**

2. **Create Extension Icons** (REQUIRED - see Quick Start above)
   - Create `icons/` folder in the extension directory if it doesn't exist
   - Generate icon files using one of the methods above
   - Icon files: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

3. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension/` folder

5. **Configure API Endpoint** (Optional - for AI features)
   - Edit `utils/api-client.js`
   - Update `API_BASE_URL` to your backend URL (default: `http://localhost:3000/api`)

## Usage

### First Time Setup

1. **Set Up Profile** (Option 1 - Recommended)
   - Visit the Simplify dashboard at `http://localhost:3000`
   - Complete your profile
   - The extension will sync your profile automatically

2. **Set Up Profile** (Option 2 - Manual)
   - Click the extension icon
   - Go to "Profile" tab
   - Enter your information (stored locally and encrypted)

### Using Autofill

1. **Navigate to a Job Application**
   - Visit a job posting on Workday, Greenhouse, or Lever
   - Open the application form

2. **Open Extension Popup**
   - Click the Simplify icon in Chrome toolbar
   - You should see "We support autofill on this website!"

3. **Tailor & Fill**
   - Click "Tailor Application" button
   - The extension will:
     - Detect all form fields
     - Request field mapping from backend (or use cached)
     - Fill fields with your profile data
     - Optionally tailor resume/cover letter using AI (if backend available)

4. **Review & Submit**
   - Review all filled fields
   - Make any necessary edits
   - Submit the application normally

## Architecture

### Components

- **Content Scripts** (`content-scripts/`)
  - `form-detector.js` - Generic form detection
  - `ats-detector.js` - ATS-specific patterns
  - `workday.js` - Workday-specific handler
  - `greenhouse.js` - Greenhouse-specific handler
  - `lever.js` - Lever-specific handler

- **Background Service Worker** (`background.js`)
  - Coordinates between content scripts and popup
  - Manages communication with backend API
  - Handles field mapping and caching

- **Popup UI** (`popup/`)
  - `popup.html` - Extension popup interface
  - `popup.css` - Styling
  - `popup.js` - UI logic and interactions

- **Utilities** (`utils/`)
  - `storage.js` - IndexedDB and Chrome Storage management
  - `encryption.js` - AES-GCM encryption
  - `api-client.js` - Backend API communication

### Data Flow

1. **Form Detection**
   ```
   Content Script → Background → Backend API (mapping)
   ```

2. **Autofill**
   ```
   Popup → Background → Storage → Content Script → DOM
   ```

3. **Application Logging**
   ```
   Content Script → Background → Backend API → Database
   ```

## Security

- **Encryption**: All sensitive data (profile, resumes) encrypted with AES-GCM
- **Local Storage**: Data stored in IndexedDB and Chrome Storage (encrypted)
- **API Keys**: Never exposed to content scripts or popup
- **HTTPS Only**: All backend communication over HTTPS
- **No PII in Logs**: PII is sanitized before being sent to backend

## Development

### File Structure

```
extension/
├── manifest.json           # Extension manifest
├── background.js          # Service worker
├── content-scripts/
│   ├── form-detector.js   # Generic form detection
│   ├── ats-detector.js    # ATS patterns
│   ├── workday.js         # Workday handler
│   ├── greenhouse.js      # Greenhouse handler
│   └── lever.js           # Lever handler
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Styles
│   └── popup.js           # Popup logic
├── utils/
│   ├── storage.js         # Storage management
│   ├── encryption.js      # Encryption utilities
│   └── api-client.js      # API client
├── icons/                 # Extension icons (create these)
└── README.md             # This file
```

### Testing

1. **Test on Workday**
   - Visit any Workday job posting
   - Open extension popup
   - Verify form detection

2. **Test on Greenhouse**
   - Visit any Greenhouse job application
   - Test autofill functionality

3. **Test on Lever**
   - Visit any Lever job application
   - Verify field mapping

### Debugging

- **Content Scripts**: Use DevTools on the web page
- **Background**: Go to `chrome://extensions/` → Click "service worker" link
- **Popup**: Right-click popup → Inspect

## Configuration

### Environment Variables

Update `utils/api-client.js`:

```javascript
const API_BASE_URL = 'https://your-backend-url.com/api';
```

### OAuth Configuration

Update `manifest.json`:

```json
"oauth2": {
  "client_id": "YOUR_GOOGLE_OAUTH_CLIENT_ID",
  "scopes": [...]
}
```

## Troubleshooting

### Extension Not Loading

- Check `manifest.json` for syntax errors
- Ensure all referenced files exist
- Check Chrome extension error page

### Autofill Not Working

- Verify you're on a supported ATS site
- Check browser console for errors
- Ensure profile data is synced

### Backend Connection Issues

- Verify `API_BASE_URL` is correct
- Check backend is running (for AI features)
- Core autofill works offline, AI features require backend

## Privacy

- All data stored locally and encrypted
- No data sent to third parties
- Backend API only receives sanitized data (no PII)
- Users can clear all data at any time

## License

MIT

## Support

For issues or questions, please open an issue on the repository.

