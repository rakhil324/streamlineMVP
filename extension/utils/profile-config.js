/**
 * Profile Configuration
 * 
 * This file contains the profile data configuration.
 * Fetches profile data from the database API.
 */

export const PROFILE_CONFIG = {
  // Set to 'database' to fetch from API
  source: 'database',
  
  // API endpoint for database
  apiEndpoint: 'http://localhost:3000/api/profile',
  
  // Fallback hardcoded profile data (used when API fails)
  fallbackProfile: {
    id: '1',
    firstName: 'Demo',
    lastName: 'User',
    name: 'Demo User',
    email: 'demo@streamline.ai',
    phone: '+1 555-123-4567',
    location: 'San Francisco, CA',
    education: [],
    experience: [],
    skills: [],
    resume: null,
    resumeText: null,
    authenticated: false,
  },
};

/**
 * Transform database profile to extension format
 * @param {Object} dbProfile - Profile from database API
 * @returns {Object} Profile in extension format
 */
function transformDatabaseProfile(dbProfile) {
  if (!dbProfile) return null;
  
  // Build location string from address
  let location = '';
  if (dbProfile.address) {
    const parts = [];
    if (dbProfile.address.city) parts.push(dbProfile.address.city);
    if (dbProfile.address.state) parts.push(dbProfile.address.state);
    if (dbProfile.address.country && dbProfile.address.country !== 'United States') {
      parts.push(dbProfile.address.country);
    }
    location = parts.join(', ');
  }
  
  // Transform education array
  const education = (dbProfile.education || []).map(edu => {
    const gradDate = edu.graduationDate ? new Date(edu.graduationDate) : null;
    const startDate = edu.startDate ? new Date(edu.startDate) : null;
    
    return {
      school: edu.school || '',
      degree: edu.degree || '',
      field: edu.fieldOfStudy || '',
      years: gradDate ? `${edu.current ? 'Expected ' : ''}${gradDate.getFullYear()}` : '',
      gpa: edu.gpa || '',
      current: edu.current || false,
      // Raw date components for form filling
      graduationYear: gradDate ? gradDate.getFullYear().toString() : '',
      graduationMonth: gradDate ? (gradDate.getMonth() + 1).toString() : '', // 1-12
      graduationMonthName: gradDate ? gradDate.toLocaleString('en-US', { month: 'long' }) : '', // "January", etc.
      startYear: startDate ? startDate.getFullYear().toString() : '',
      startMonth: startDate ? (startDate.getMonth() + 1).toString() : '',
      startMonthName: startDate ? startDate.toLocaleString('en-US', { month: 'long' }) : '',
    };
  });
  
  // Transform experience array
  const experience = (dbProfile.experience || []).map(exp => ({
    title: exp.title || '',
    company: exp.company || '',
    location: exp.location || '',
    duration: formatDuration(exp.startDate, exp.endDate, exp.current),
    description: exp.description || '',
    current: exp.current || false,
  }));
  
  // Preserve full address structure for autofill
  const fullAddress = dbProfile.address || {
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
  };
  
  return {
    id: dbProfile.id || '1',
    firstName: dbProfile.firstName || '',
    lastName: dbProfile.lastName || '',
    name: `${dbProfile.firstName || ''} ${dbProfile.lastName || ''}`.trim(),
    email: dbProfile.email || '',
    phone: dbProfile.phone || '',
    location: location,
    address: fullAddress,
    // Individual address fields for easy autofill access
    street: fullAddress.street || '',
    city: fullAddress.city || '',
    state: fullAddress.state || '',
    zip: fullAddress.zip || '',
    country: fullAddress.country || 'United States',
    
    // Work Authorization
    workAuthorization: dbProfile.workAuthorization || {
      authorizedToWork: true,
      requiresSponsorship: false,
    },
    
    // Education & Experience
    education: education,
    experience: experience,
    
    // Skills
    skills: dbProfile.skills || [],
    languages: dbProfile.languages || [],
    certifications: dbProfile.certifications || [],
    
    // Job Preferences
    preferredTitles: dbProfile.preferredTitles || [],
    preferredLocations: dbProfile.preferredLocations || [],
    preferredJobTypes: dbProfile.preferredJobTypes || [],
    salaryExpectation: dbProfile.salaryExpectation || null,
    availability: dbProfile.availability || '',
    
    // Links
    linkedIn: dbProfile.linkedIn || '',
    portfolio: dbProfile.portfolio || '',
    
    // Resume data from database
    resume: dbProfile.resume || dbProfile.resumeUrl || dbProfile.resumeFile || null,
    resumeText: dbProfile.resumeText || dbProfile.parsedResume || null,
    resumeFileName: dbProfile.resumeFileName || dbProfile.resume?.fileName || null,
    
    // Meta
    authenticated: true,
    onboardingCompleted: dbProfile.onboardingCompleted || false,
    source: 'database',
  };
}

/**
 * Format duration string from dates
 */
function formatDuration(startDate, endDate, current) {
  if (!startDate) return '';
  
  const start = new Date(startDate);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  
  if (current) {
    return `${startStr} – Present`;
  }
  
  if (endDate) {
    const end = new Date(endDate);
    const endStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }
  
  return startStr;
}

/**
 * Get profile data from database API
 * @returns {Promise<Object>} Profile data object
 */
export async function getProfileData() {
  try {
    console.log('Fetching profile from database API...');
    
    const response = await fetch(PROFILE_CONFIG.apiEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('Not authenticated, using fallback profile');
        return {
          ...PROFILE_CONFIG.fallbackProfile,
          source: 'fallback',
          authenticated: false,
        };
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('API response:', result);
    
    if (result.profileData) {
      const transformed = transformDatabaseProfile(result.profileData);
      console.log('Transformed profile:', transformed);
      return transformed;
    } else {
      console.log('No profile data in response, using fallback');
      return {
        ...PROFILE_CONFIG.fallbackProfile,
        source: 'fallback',
        authenticated: false,
      };
    }
  } catch (error) {
    console.error('Failed to fetch profile from database:', error);
    // Fallback to default profile on error
    return {
      ...PROFILE_CONFIG.fallbackProfile,
      source: 'fallback',
      error: error.message,
      authenticated: false,
    };
  }
}

/**
 * Update profile configuration
 * @param {Object} config - Configuration object
 */
export function updateProfileConfig(config) {
  Object.assign(PROFILE_CONFIG, config);
}
