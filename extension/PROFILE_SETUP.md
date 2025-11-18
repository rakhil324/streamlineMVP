# Profile Configuration Guide

## Current Setup: Hardcoded Profile

The extension currently uses a **hardcoded profile** for testing and development. This ensures autofill works immediately without requiring database setup.

## Profile Location

The profile is configured in: `extension/utils/profile-config.js`

## Current Profile Data

```javascript
{
  id: '1',
  firstName: 'Hriday',
  lastName: 'Sainathuni',
  name: 'Hriday Sainathuni',
  email: 'sainathunih@gmail.com',
  phone: '+15713513185',
  location: 'Ashburn, VA, USA',
  education: [...],
  experience: [...],
  resume: null,
  resumeText: null,
  authenticated: true,
}
```

## Switching to Database

To switch from hardcoded to database:

### Step 1: Update Configuration

In `extension/utils/profile-config.js`, change:

```javascript
export const PROFILE_CONFIG = {
  source: 'hardcoded',  // Change to 'database'
  apiEndpoint: 'http://localhost:3000/api/profile',
  // ...
};
```

### Step 2: Verify API Endpoint

Ensure your API endpoint returns data in this format:

```json
{
  "success": true,
  "profile": {
    "id": "1",
    "firstName": "...",
    "lastName": "...",
    "email": "...",
    "phone": "...",
    "location": "...",
    "education": [...],
    "experience": [...],
    "resume": null,
    "resumeText": null
  }
}
```

### Step 3: Test

1. Reload extension
2. Click "Sync" button
3. Verify profile loads from database
4. Check browser console for any errors

## Modifying Profile Data

### Hardcoded Profile

Edit `PROFILE_CONFIG.hardcodedProfile` in `profile-config.js`:

```javascript
hardcodedProfile: {
  firstName: 'Your Name',
  lastName: 'Your Last Name',
  email: 'your@email.com',
  // ... update other fields
}
```

### Database Profile

Update your database/API to return the new profile data.

## Profile Fields

Required fields for autofill:
- `firstName` - First name
- `lastName` - Last name  
- `email` - Email address
- `phone` - Phone number
- `location` - Location/address

Optional fields:
- `education` - Array of education entries
- `experience` - Array of work experience entries
- `resume` - Resume file/data
- `resumeText` - Extracted resume text

## Testing Profile

1. Open extension popup
2. Go to "Profile" tab
3. Click "Sync" button
4. Verify profile displays correctly
5. Check that autofill button is enabled (if required fields exist)

## Troubleshooting

### Profile Not Loading
- Check browser console for errors
- Verify `profile-config.js` is imported correctly
- Check that profile data structure matches expected format

### Autofill Not Working
- Ensure profile has required fields (email, phone, location)
- Check that profile is stored in chrome.storage.local
- Verify autofill button is enabled (not disabled/grayed out)

### Sync Not Working
- Check network tab for API errors (if using database)
- Verify API endpoint is correct
- Check CORS settings if calling external API

