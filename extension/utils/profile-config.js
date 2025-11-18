/**
 * Profile Configuration
 * 
 * This file contains the profile data configuration.
 * 
 * CURRENT: Hardcoded profile data for demo/testing
 * FUTURE: Replace with database API call
 * 
 * To switch to database:
 * 1. Replace getProfileData() to fetch from API
 * 2. Keep the same return structure
 * 3. Update syncProfile() in popup.js to use this
 */

export const PROFILE_CONFIG = {
  // Set to 'hardcoded' or 'database'
  source: 'hardcoded',
  
  // API endpoint for database (when source is 'database')
  apiEndpoint: 'http://localhost:3000/api/profile',
  
  // Hardcoded profile data (used when source is 'hardcoded')
  hardcodedProfile: {
    id: '1',
    firstName: 'Hriday',
    lastName: 'Sainathuni',
    name: 'Hriday Sainathuni',
    email: 'sainathunih@gmail.com',
    phone: '+15713513185',
    location: 'Ashburn, VA, USA',
    education: [
      {
        school: 'University of Virginia',
        degree: "Bachelor's, Computer Science",
        years: '2024 – 2027',
      },
    ],
    experience: [
      {
        title: 'Software Engineer',
        company: 'Tech Corp',
        duration: '2022 – Present',
      },
      {
        title: 'Junior Developer',
        company: 'Startup Inc',
        duration: '2020 – 2022',
      },
    ],
    resume: chrome.runtime.getURL('Updated_Hriday_Sainathuni_Resume_2025.pdf'), // Local extension resume
    resumeText: null,
    resumeUrl: chrome.runtime.getURL('Updated_Hriday_Sainathuni_Resume_2025.pdf'), // Alternative resume URL
    authenticated: true,
  },
};

/**
 * Get profile data based on configuration
 * @returns {Promise<Object>} Profile data object
 */
export async function getProfileData() {
  if (PROFILE_CONFIG.source === 'hardcoded') {
    // Return hardcoded profile immediately
    return Promise.resolve({
      ...PROFILE_CONFIG.hardcodedProfile,
      source: 'hardcoded',
    });
  } else {
    // Fetch from database/API
    try {
      const response = await fetch(PROFILE_CONFIG.apiEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return {
        ...(result.profile || result),
        source: 'database',
      };
    } catch (error) {
      console.error('Failed to fetch profile from database, using hardcoded:', error);
      // Fallback to hardcoded on error
      return {
        ...PROFILE_CONFIG.hardcodedProfile,
        source: 'hardcoded',
        error: error.message,
      };
    }
  }
}

/**
 * Update profile configuration
 * @param {Object} config - Configuration object
 */
export function updateProfileConfig(config) {
  Object.assign(PROFILE_CONFIG, config);
}

