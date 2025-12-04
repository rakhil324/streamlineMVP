/**
 * Background Service Worker
 * Coordinates actions between content scripts, popup, and backend API
 */

import { StorageManager } from './utils/storage.js';
import { APIClient } from './utils/api-client.js';
import { getProfileData as getProfileFromConfig } from './utils/profile-config.js';

const storageManager = new StorageManager();
const apiClient = new APIClient();

// Extension installation/update handler
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Simplify Apply extension installed');
    // Initialize with hardcoded profile
    try {
      const profile = await getProfileFromConfig();
      if (profile) {
        await storageManager.setProfileData(profile);
        console.log('Initialized with hardcoded profile');
      }
    } catch (error) {
      console.error('Failed to initialize profile:', error);
    }
    // Initialize default storage
    chrome.storage.local.set({
      isAuthenticated: false,
      mappings: {},
      lastSync: Date.now(),
    });
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message asynchronously
  handleMessage(message, sender, sendResponse).catch(error => {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  });
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case 'DETECT_FORMS':
        await handleFormDetection(sender.tab?.id, message.data);
        sendResponse({ success: true });
        return;

      case 'REQUEST_PROFILE_DATA':
        // Try to get from storage first, fallback to hardcoded profile
        let profileData = await storageManager.getProfileData();
        if (!profileData) {
          // If no profile in storage, use hardcoded profile from config
          profileData = await getProfileFromConfig();
          // Save it to storage for future use
          if (profileData) {
            await storageManager.setProfileData(profileData);
          }
        }
        sendResponse({ success: true, data: profileData });
        return;

      case 'REQUEST_MAPPING':
        const mapping = await handleMappingRequest(message.data);
        sendResponse({ success: true, data: mapping });
        return;

      case 'AUTOFILL_REQUEST':
        const autofillTabId = message.data?.tabId || sender.tab?.id;
        console.log('AUTOFILL_REQUEST received, tabId:', autofillTabId, 'sender.tab:', sender.tab);
        if (!autofillTabId || typeof autofillTabId !== 'number') {
          console.error('Invalid tabId in AUTOFILL_REQUEST:', autofillTabId);
          sendResponse({ success: false, error: 'No valid tab ID provided' });
          return;
        }
        handleAutofillRequest(autofillTabId, message.data).then(result => {
          console.log('Autofill request completed:', result);
          sendResponse(result || { success: true });
        }).catch(error => {
          console.error('Autofill request error:', error);
          sendResponse({ success: false, error: error.message || 'Unknown error' });
        });
        return true; // Keep channel open for async

      case 'LOG_APPLICATION':
        await handleApplicationLog(message.data);
        sendResponse({ success: true });
        return;
      
      case 'generateAnswer':
        // Generate AI answer for essay questions
        generateAnswer(message.question, message.jobDescription, message.jobTitle, message.companyName)
          .then(answer => sendResponse({ success: true, answer }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async
      
      case 'saveJob':
        // Save job to application tracker
        saveJob(message.jobInfo)
          .then(job => sendResponse({ success: true, job }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async

      case 'SYNC_PROFILE':
        handleProfileSync(message.data).then(syncResult => {
          console.log('Profile sync successful:', syncResult);
          sendResponse({ success: true, data: syncResult });
        }).catch(error => {
          console.error('Profile sync error:', error);
          // Still return demo profile on error
          const demoProfile = {
            id: '1',
            firstName: 'Hriday',
            lastName: 'Sainathuni',
            email: 'sainathunih@gmail.com',
            phone: '+15713513185',
            location: 'Ashburn, VA, USA',
            name: 'Hriday Sainathuni',
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
            resume: null,
            resumeText: null,
            authenticated: false,
          };
          sendResponse({ 
            success: true, 
            data: demoProfile,
            error: error.message 
          });
        });
        return; // Keep channel open for async

      case 'CHECK_AUTH':
        checkAuthentication().then(isAuthenticated => {
          sendResponse({ success: true, authenticated: isAuthenticated });
        }).catch(error => {
          sendResponse({ success: false, authenticated: false, error: error.message });
        });
        return; // Keep channel open for async

      case 'FETCH_FILE':
        handleFetchFile(message.data).then(result => {
          sendResponse(result);
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep channel open for async

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
        return;
    }
  } catch (error) {
    console.error('Background error:', error);
    sendResponse({ success: false, error: error.message });
    return;
  }
}

/**
 * Handle form detection from content script
 */
async function handleFormDetection(tabId, data) {
  const { atsType, fields } = data;
  console.log(`Form detected on ${atsType}`, fields);

  // Store detected fields for the tab
  await chrome.storage.local.set({
    [`tab_${tabId}_fields`]: fields,
    [`tab_${tabId}_ats`]: atsType,
  });

  // Notify popup if open
  try {
    chrome.runtime.sendMessage({
      type: 'FORMS_DETECTED',
      data: { atsType, fieldCount: fields.length },
    });
  } catch (e) {
    // Popup might not be open
  }
}

/**
 * Handle mapping request from content script
 */
async function handleMappingRequest(data) {
  const { atsType, fields } = data;

  // Check local cache first
  const cached = await chrome.storage.local.get(`mapping_${atsType}`);
  if (cached[`mapping_${atsType}`]) {
    return cached[`mapping_${atsType}`];
  }

  // Fetch from backend API
  try {
    const mapping = await apiClient.getMapping(atsType, fields);
    
    // Cache the mapping
    await chrome.storage.local.set({
      [`mapping_${atsType}`]: mapping,
    });

    return mapping;
  } catch (error) {
    console.error('Failed to fetch mapping:', error);
    // Return fallback mapping based on field patterns
    return generateFallbackMapping(fields);
  }
}

/**
 * Handle autofill request
 */
async function handleAutofillRequest(tabId, data) {
  const { tailorRequest, selectedResumeId } = data;

  // If a tailored resume is selected, fetch it
  let tailoredResumeData = null;
  if (selectedResumeId) {
    try {
      console.log('Fetching tailored resume:', selectedResumeId);
      const response = await fetch(`http://localhost:3000/api/tailored-resumes/${selectedResumeId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const resumeData = await response.json();
        tailoredResumeData = resumeData.resume;
        console.log('Fetched tailored resume:', tailoredResumeData?.fileName);
      } else {
        console.error('Failed to fetch tailored resume:', response.status);
      }
    } catch (error) {
      console.error('Error fetching tailored resume:', error);
    }
  }

  // Get profile data - try storage first, then hardcoded profile
  let profileData = await storageManager.getProfileData();
  console.log('Profile data from storage:', {
    hasData: !!profileData,
    hasExperience: !!profileData?.experience,
    experienceCount: profileData?.experience?.length || 0,
    hasEducation: !!profileData?.education,
    educationCount: profileData?.education?.length || 0,
    hasResume: !!profileData?.resume
  });
  
  // If no profile in storage or missing required fields, use hardcoded profile
  if (!profileData || (!profileData.email && !profileData.phone && !profileData.location)) {
    console.log('No profile in storage, using hardcoded profile for autofill');
    try {
      profileData = await getProfileFromConfig();
      console.log('Hardcoded profile retrieved:', {
        hasData: !!profileData,
        hasExperience: !!profileData?.experience,
        experienceCount: profileData?.experience?.length || 0,
        hasEducation: !!profileData?.education,
        educationCount: profileData?.education?.length || 0,
        hasResume: !!profileData?.resume
      });
      // Save it to storage for future use
      if (profileData) {
        await storageManager.setProfileData(profileData);
      }
    } catch (error) {
      console.error('Error getting hardcoded profile:', error);
    }
  }
  
  // Final check - if still no profile, return error
  if (!profileData || (!profileData.email && !profileData.phone && !profileData.location)) {
    return {
      success: false,
      error: 'Profile data not available. Please sync your profile first.'
    };
  }

  // Check if we have a tailored resume for this job
  const tailored = await chrome.storage.local.get(['tailoredResume', 'tailoredResumeTimestamp']);
  if (tailored.tailoredResume && tailored.tailoredResumeTimestamp) {
    // Check if tailored resume is recent (within 1 hour)
    const age = Date.now() - tailored.tailoredResumeTimestamp;
    if (age < 3600000) { // 1 hour
      // Use tailored resume data
      profileData = {
        ...profileData,
        resume: tailored.tailoredResume.resume || profileData.resume,
        resumeText: tailored.tailoredResume.resumeText || profileData.resumeText,
      };
    }
  }

  // Prepare autofill data with proper field mappings
  // Handle resume - prefer resumeUrl, then resume
  let resumeData = profileData.resume || profileData.resumeUrl || null;
  
  // Build location string from address if not already set
  let locationStr = profileData.location || '';
  if (!locationStr && profileData.address) {
    const parts = [];
    if (profileData.address.city) parts.push(profileData.address.city);
    if (profileData.address.state) parts.push(profileData.address.state);
    locationStr = parts.join(', ');
  }
  
  const autofillData = {
    // Personal Info
    firstName: profileData.firstName || profileData.name?.split(' ')[0] || '',
    lastName: profileData.lastName || profileData.name?.split(' ').slice(1).join(' ') || '',
    email: profileData.email || '',
    phone: profileData.phone || '',
    location: locationStr,
    
    // Address components (for detailed forms)
    address: profileData.address || {},
    street: profileData.address?.street || '',
    city: profileData.address?.city || '',
    state: profileData.address?.state || '',
    zip: profileData.address?.zip || '',
    country: profileData.address?.country || 'United States',
    
    // Work Authorization
    workAuthorization: profileData.workAuthorization || { authorizedToWork: true, requiresSponsorship: false },
    authorizedToWork: profileData.workAuthorization?.authorizedToWork ?? true,
    requiresSponsorship: profileData.workAuthorization?.requiresSponsorship ?? false,
    
    // Experience & Education
    experience: profileData.experience || [],
    education: profileData.education || [],
    
    // Skills
    skills: profileData.skills || [],
    languages: profileData.languages || [],
    certifications: profileData.certifications || [],
    
    // Job Preferences
    preferredTitles: profileData.preferredTitles || [],
    preferredLocations: profileData.preferredLocations || [],
    preferredJobTypes: profileData.preferredJobTypes || [],
    salaryExpectation: profileData.salaryExpectation || null,
    availability: profileData.availability || '',
    
    // Links
    linkedIn: profileData.linkedIn || '',
    portfolio: profileData.portfolio || '',
    
    // Documents
    resume: resumeData,
    resumeText: profileData.resumeText || null,
    coverLetter: profileData.coverLetter || null,
    
    // Tailored resume data (if selected)
    tailoredResume: tailoredResumeData,
  };
  
  console.log('Prepared autofill data:', {
    ...autofillData,
    experienceCount: autofillData.experience?.length || 0,
    educationCount: autofillData.education?.length || 0,
    hasResume: !!autofillData.resume,
    resumeType: typeof autofillData.resume,
    resumeValue: typeof autofillData.resume === 'string' ? autofillData.resume.substring(0, 50) : 'not a string'
  });

  console.log('Sending autofill data to tab:', tabId, typeof tabId, autofillData);

  // Validate and convert tabId to integer
  let validTabId;
  if (typeof tabId === 'number') {
    validTabId = Math.floor(tabId);
  } else if (typeof tabId === 'string') {
    validTabId = parseInt(tabId, 10);
  } else {
    console.error('Invalid tabId type:', typeof tabId, tabId);
    return {
      success: false,
      error: 'Invalid tab ID type'
    };
  }

  if (!validTabId || isNaN(validTabId) || validTabId <= 0) {
    console.error('Invalid tabId value:', validTabId);
    return {
      success: false,
      error: 'Invalid tab ID value'
    };
  }

  console.log('Validated tabId:', validTabId);

  // Get tab URL to determine which content script to use
  let tab;
  try {
    tab = await chrome.tabs.get(validTabId);
    if (!tab || !tab.url) {
      console.error('Tab not accessible:', tab);
      return {
        success: false,
        error: 'Tab not accessible'
      };
    }
    console.log('Tab retrieved successfully:', tab.id, tab.url);
  } catch (tabError) {
    console.error('Error getting tab:', tabError);
    return {
      success: false,
      error: `Tab not found: ${tabError.message}`
    };
  }

  const url = tab.url || '';
  const hostname = new URL(url).hostname.toLowerCase();
  
  let scriptFile = 'content-scripts/form-detector.js';
  if (hostname.includes('workday.com') || hostname.includes('myworkdayjobs.com')) {
    scriptFile = 'content-scripts/workday.js';
  } else if (hostname.includes('greenhouse.io')) {
    scriptFile = 'content-scripts/greenhouse.js';
  } else if (hostname.includes('lever.co')) {
    scriptFile = 'content-scripts/lever.js';
  }

  console.log('Using content script:', scriptFile, 'for hostname:', hostname);

  // Use storage to pass data to content script (bypasses message passing issues)
  try {
    console.log('Setting autofill data in storage for tab:', validTabId);
    
    // Store autofill data with a unique key for this tab
    const autofillKey = `autofill_${validTabId}_${Date.now()}`;
    await chrome.storage.local.set({
      [autofillKey]: autofillData,
      [`autofill_active_${validTabId}`]: autofillKey
    });
    
    console.log('Autofill data stored, key:', autofillKey);
    
    // Inject a simple script that triggers autofill via the content script
    // This script runs in the page context and can access the content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: validTabId },
        func: (key) => {
          // Dispatch a custom event that the content script can listen to
          const event = new CustomEvent('simplifyAutofill', { 
            detail: { storageKey: key },
            bubbles: true 
          });
          document.dispatchEvent(event);
          console.log('Dispatched autofill event with key:', key);
        },
        args: [autofillKey],
        world: 'MAIN',
      });
    } catch (injectError) {
      console.warn('Could not inject trigger script, trying direct storage access:', injectError);
    }
    
    // Wait for autofill to complete - poll for result with generous timeout
    let autofillResult = null;
    const maxWaitTime = 30000; // 30 seconds max wait for complex forms
    const checkInterval = 300; // Check every 300ms
    let waited = 0;
    
    while (waited < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
      
      const result = await chrome.storage.local.get([`autofill_result_${autofillKey}`]);
      if (result[`autofill_result_${autofillKey}`]) {
        autofillResult = result[`autofill_result_${autofillKey}`];
        console.log(`Autofill completed after ${waited}ms:`, autofillResult);
        break;
      }
    }
    
    // If no result after timeout, indicate it's still running
    if (!autofillResult) {
      console.log('Autofill timed out after', maxWaitTime, 'ms');
      autofillResult = { success: true, filledCount: 0, timedOut: true, message: 'Autofill may still be running. Please verify fields.' };
    }
    
    // Clean up
    await chrome.storage.local.remove([autofillKey, `autofill_active_${validTabId}`, `autofill_result_${autofillKey}`]);
    
    console.log('Autofill result:', autofillResult);
    
    return { 
      success: true, 
      response: autofillResult,
      filledCount: autofillResult.filledCount || 0
    };
  } catch (error) {
    console.error('Error in autofill process:', error);
    return {
      success: false,
      error: `Failed to autofill: ${error.message}. Please refresh the page and try again.`
    };
  }
}

/**
 * Handle application log submission
 */
async function handleApplicationLog(data) {
  try {
    await apiClient.logApplication(data);
  } catch (error) {
    console.error('Failed to log application:', error);
    // Store locally for later sync
    const pending = await chrome.storage.local.get('pending_logs') || { pending_logs: [] };
    pending.pending_logs.push({ ...data, timestamp: Date.now() });
    await chrome.storage.local.set({ pending_logs: pending.pending_logs });
  }
}

/**
 * Handle profile sync from backend
 */
async function handleProfileSync(data) {
  try {
    // If profile data is provided directly, use it
    if (data && data.profile) {
      const profile = data.profile;
      
      // Ensure all profile fields are present
      const profileWithAuth = {
        ...profile,
        id: profile.id || '1',
        firstName: profile.firstName || profile.name?.split(' ')[0] || '',
        lastName: profile.lastName || profile.name?.split(' ').slice(1).join(' ') || '',
        name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        education: profile.education || [],
        experience: profile.experience || [],
        resume: profile.resume || null,
        resumeText: profile.resumeText || null,
        authenticated: profile.authenticated || false,
      };
      
      console.log('Saving profile to storage:', profileWithAuth);
      await storageManager.setProfileData(profileWithAuth);
      await chrome.storage.local.set({
        lastSync: Date.now(),
        isAuthenticated: profile.authenticated || false,
      });
      return profileWithAuth;
    }
    
    // Try to sync from backend API if force flag is set
    if (data && data.force) {
      try {
        // API will return demo user's profile if not authenticated
        const response = await apiClient.syncProfile();
        const profile = response.profile || response;
        
        if (profile) {
          // Ensure all profile fields are present
          const profileWithAuth = {
            ...profile,
            id: profile.id || '1',
            firstName: profile.firstName || profile.name?.split(' ')[0] || '',
            lastName: profile.lastName || profile.name?.split(' ').slice(1).join(' ') || '',
            name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
            email: profile.email || '',
            phone: profile.phone || '',
            location: profile.location || '',
            education: profile.education || [],
            experience: profile.experience || [],
            resume: profile.resume || null,
            resumeText: profile.resumeText || null,
            authenticated: response.authenticated || false,
          };
          
          console.log('Saving profile to storage:', profileWithAuth);
          await storageManager.setProfileData(profileWithAuth);
          await chrome.storage.local.set({
            lastSync: Date.now(),
            isAuthenticated: response.authenticated || false,
          });
          return profileWithAuth;
        }
      } catch (apiError) {
        console.error('API sync failed:', apiError);
        
        // If API completely fails, use demo profile data as fallback
        const demoProfile = {
          id: '1',
          firstName: 'Hriday',
          lastName: 'Sainathuni',
          email: 'sainathunih@gmail.com',
          phone: '+15713513185',
          location: 'Ashburn, VA, USA',
          name: 'Hriday Sainathuni',
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
          resume: null,
          resumeText: null,
        };
        
        // Add authenticated status
        const demoProfileWithAuth = {
          ...demoProfile,
          authenticated: false,
        };
        await storageManager.setProfileData(demoProfileWithAuth);
        await chrome.storage.local.set({
          lastSync: Date.now(),
          isAuthenticated: false,
        });
        
        return demoProfileWithAuth;
      }
    }
    
    // If data provided directly, use it
    if (data && !data.force) {
      await storageManager.setProfileData(data);
      await chrome.storage.local.set({
        lastSync: Date.now(),
      });
      return data;
    }
    
    // Return existing profile if no sync data
    return await storageManager.getProfileData();
  } catch (error) {
    console.error('Error syncing profile:', error);
    // Return existing profile on error, or demo profile if none exists
    const existing = await storageManager.getProfileData();
    return existing || {
      id: '1',
      firstName: 'Hriday',
      lastName: 'Sainathuni',
      email: 'sainathunih@gmail.com',
      phone: '+15713513185',
      location: 'Ashburn, VA, USA',
      name: 'Hriday Sainathuni',
    };
  }
}

/**
 * Check authentication status
 */
async function checkAuthentication() {
  const result = await chrome.storage.local.get(['isAuthenticated', 'authToken']);
  return result.isAuthenticated === true && result.authToken;
}

/**
 * Handle file fetch request (to avoid CORS issues in content scripts)
 */
async function handleFetchFile(data) {
  try {
    const { url } = data;
    if (!url) {
      return { success: false, error: 'No URL provided' };
    }

    console.log('Fetching file from URL:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow for large files
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, chunk);
    }
    const base64 = btoa(binaryString);
    
    return {
      success: true,
      data: base64,
      mimeType: blob.type || 'application/pdf',
      size: blob.size
    };
  } catch (error) {
    console.error('Error fetching file:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle resume tailoring request
 */
async function handleTailorResume(data) {
  try {
    const { jobDescription, jobTitle, companyName } = data;
    
    if (!jobDescription) {
      return { success: false, error: 'Job description is required' };
    }

    // Get profile to access resume
    const profile = await storageManager.getProfileData();
    if (!profile || !profile.resumeText) {
      return { success: false, error: 'Resume not found. Please upload a resume first.' };
    }

    // Call API to tailor resume
    try {
      const tailoredResume = await apiClient.tailorResume(jobDescription, jobTitle, companyName, profile.resumeText);
      
      // Store tailored resume temporarily for this session
      await chrome.storage.local.set({
        tailoredResume: tailoredResume,
        tailoredResumeJob: { jobTitle, companyName, jobDescription },
        tailoredResumeTimestamp: Date.now(),
      });

      return { success: true, data: tailoredResume };
    } catch (apiError) {
      console.error('API tailoring failed:', apiError);
      return { success: false, error: apiError.message || 'Failed to tailor resume via API' };
    }
  } catch (error) {
    console.error('Error in handleTailorResume:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate fallback mapping based on field patterns
 */
function generateFallbackMapping(fields) {
  const mapping = {};
  
  fields.forEach(field => {
    const fieldLower = field.name?.toLowerCase() || '';
    const fieldId = field.id?.toLowerCase() || '';
    const fieldLabel = field.label?.toLowerCase() || '';

    // Common field name patterns
    if (fieldLower.includes('email') || fieldId.includes('email') || fieldLabel.includes('email')) {
      mapping[field.id] = 'email';
    } else if (fieldLower.includes('firstname') || fieldLower.includes('first_name') || fieldLabel.includes('first name')) {
      mapping[field.id] = 'firstName';
    } else if (fieldLower.includes('lastname') || fieldLower.includes('last_name') || fieldLabel.includes('last name')) {
      mapping[field.id] = 'lastName';
    } else if (fieldLower.includes('phone') || fieldLabel.includes('phone')) {
      mapping[field.id] = 'phone';
    } else if (fieldLower.includes('location') || fieldLabel.includes('location') || fieldLabel.includes('city')) {
      mapping[field.id] = 'location';
    } else if (fieldLower.includes('resume') || fieldLower.includes('cv') || fieldLabel.includes('resume')) {
      mapping[field.id] = 'resume';
    } else if (fieldLower.includes('cover') || fieldLabel.includes('cover letter')) {
      mapping[field.id] = 'coverLetter';
    }
  });

  return mapping;
}

// Periodically sync pending logs
// Note: chrome.alarms API requires "alarms" permission in manifest
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'syncPendingLogs') {
      const pending = await chrome.storage.local.get('pending_logs');
      if (pending.pending_logs && pending.pending_logs.length > 0) {
        for (const log of pending.pending_logs) {
          try {
            await apiClient.logApplication(log);
          } catch (e) {
            console.error('Failed to sync log:', e);
            break; // Stop on first error
          }
        }
        // Clear synced logs
        await chrome.storage.local.set({ pending_logs: [] });
      }
    }
  });

  // Create alarm for periodic sync (every 5 minutes)
  chrome.alarms.create('syncPendingLogs', { periodInMinutes: 5 });
} else {
  console.warn('chrome.alarms API not available. Periodic sync disabled.');
}

/**
 * Generate AI answer for essay questions
 */
async function generateAnswer(question, jobDescription, jobTitle, companyName) {
  try {
    const response = await fetch('http://localhost:3000/api/tailor/answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        question,
        jobDescription,
        jobTitle,
        companyName,
      }),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in to the web app at http://localhost:3000 first.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate answer');
    }
    
    const data = await response.json();
    return data.answer;
  } catch (error) {
    console.error('Error generating answer:', error);
    throw error;
  }
}

/**
 * Save job to application tracker
 */
async function saveJob(jobInfo) {
  try {
    const { title, company, location, description, jobUrl } = jobInfo;
    
    if (!title || !company) {
      throw new Error('Title and company are required');
    }
    
    // Get current tab URL if jobUrl not provided
    let currentUrl = jobUrl;
    if (!currentUrl) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].url) {
        currentUrl = tabs[0].url;
      }
    }
    
    const response = await fetch('http://localhost:3000/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        title,
        company,
        location: location || '',
        description: description ? description.substring(0, 5000) : '', // Allow up to 5000 chars
        jobUrl: currentUrl || '',
      }),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in to the web app at http://localhost:3000 first.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save job');
    }
    
    const data = await response.json();
    return data.job;
  } catch (error) {
    console.error('Error saving job:', error);
    throw error;
  }
}

