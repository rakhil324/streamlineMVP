/**
 * Popup Script
 * Handles popup UI interactions and communication with background script
 */

import { StorageManager } from '../utils/storage.js';
import { APIClient } from '../utils/api-client.js';
import { getProfileData as getProfileFromConfig, PROFILE_CONFIG } from '../utils/profile-config.js';

const storageManager = new StorageManager();
const apiClient = new APIClient();

// Note: Functions are assigned to window at the bottom of the file
// after they're defined. For now, we'll use event listeners as the primary method.

// Listen for messages from content script (set up once globally)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FORMS_DETECTED') {
    handleFormsDetected(message.data);
    // Auto-show autofill button when forms are detected
    showApplicationFormUI();
    setTimeout(() => {
      updateAutofillButtonState();
    }, 300);
    // Send response immediately
    sendResponse({ success: true });
    return false; // Don't keep channel open
  }
  return false; // Don't keep channel open for other messages
});

// Initialize popup - handle both DOMContentLoaded and already loaded cases
async function initializePopup() {
  console.log('Initializing popup...');
  initTabs();
  initButtons();
  
  // Load hardcoded profile immediately and save to storage
  try {
    const hardcodedProfile = await getProfileFromConfig();
    console.log('Got hardcoded profile in init:', hardcodedProfile);
    
    if (hardcodedProfile) {
      // Display profile immediately
      displayProfileData(hardcodedProfile);
      
      // Save to storage for autofill
      chrome.runtime.sendMessage({
        type: 'SYNC_PROFILE',
        data: { profile: hardcodedProfile }
      }, (response) => {
        if (response && response.success) {
          console.log('Profile saved to storage for autofill');
        } else {
          console.warn('Failed to save profile to storage:', response);
        }
      });
      
      // Also try loading from storage (in case it was already there)
      loadProfileData().catch(err => {
        console.warn('Error in loadProfileData, but we have hardcoded profile:', err);
      });
    }
  } catch (error) {
    console.error('Error loading hardcoded profile:', error);
    // Fallback to loadProfileData
    loadProfileData().catch(err => {
      console.error('Error in loadProfileData fallback:', err);
    });
  }
  
  // Check current tab and initialize other features
  checkCurrentTab();
  
  // Force enable autofill button if we have hardcoded profile
  setTimeout(async () => {
    try {
      const profile = await getProfileFromConfig();
      if (profile && (profile.email || profile.phone || profile.location)) {
        console.log('Force enabling autofill button with hardcoded profile');
        const button = document.getElementById('autofillBtn') || document.getElementById('tailorBtn');
        if (button) {
          button.disabled = false;
          button.style.opacity = '1';
          button.style.cursor = 'pointer';
          button.style.pointerEvents = 'auto';
          button.title = 'Autofill Application';
          
          const readySection = document.getElementById('autofill-ready');
          if (readySection) {
            const p = readySection.querySelector('p');
            if (p) {
              p.textContent = 'Click below to automatically fill out this application form.';
              p.style.color = '';
            }
          }
        }
      }
    } catch (err) {
      console.error('Error force enabling button:', err);
    }
  }, 300);
  
  // Update autofill button state multiple times to ensure it works
  setTimeout(() => {
    console.log('Updating autofill button state (first attempt)');
    updateAutofillButtonState();
  }, 500);
  
  setTimeout(() => {
    console.log('Updating autofill button state (second attempt)');
    updateAutofillButtonState();
  }, 1500);
  
  setTimeout(() => {
    console.log('Updating autofill button state (third attempt)');
    updateAutofillButtonState();
  }, 2500);
  
  // Add view resume button handler
  const viewResumeBtn = document.getElementById('viewResumeBtn');
  if (viewResumeBtn) {
    viewResumeBtn.addEventListener('click', viewResume);
  }
  
  // Restore active tab from saved state
  chrome.storage.local.get(['popupState'], (result) => {
    if (result.popupState && result.popupState.activeTab) {
      setTimeout(() => {
        const tab = document.querySelector(`[data-tab="${result.popupState.activeTab}"]`);
        if (tab) {
          tab.click();
        }
      }, 200);
    }
  });
  
  
  // Add event listeners for buttons (both from HTML and dynamically created)
  const syncBtn = document.getElementById('syncProfileBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', syncProfile);
  }
  
  const dashboardBtn = document.getElementById('openDashboardBtn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', openDashboard);
  }
  
  // Also handle any dynamically created buttons
  const dashboardButtons = document.querySelectorAll('[id*="dashboard"]');
  dashboardButtons.forEach(btn => {
    if (!btn.hasAttribute('data-listener-added')) {
      btn.addEventListener('click', openDashboard);
      btn.setAttribute('data-listener-added', 'true');
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    initializePopup();
  });
} else {
  // DOM is already loaded
  console.log('DOM already loaded, initializing immediately...');
  initializePopup();
}

// Also try to load profile immediately as fallback
(async () => {
  try {
    const profile = await getProfileFromConfig();
    if (profile) {
      console.log('✅ Loaded hardcoded profile immediately:', profile);
      
      // Save to storage immediately
      chrome.runtime.sendMessage({
        type: 'SYNC_PROFILE',
        data: { profile }
      }, (response) => {
        if (response && response.success) {
          console.log('✅ Profile saved to storage from IIFE');
        } else {
          console.warn('⚠️ Failed to save profile to storage:', response);
        }
      });
      
      // Check if profile fields container exists and display
      setTimeout(() => {
        const profileFields = document.getElementById('profile-fields');
        if (profileFields && !profileFields.innerHTML.trim()) {
          console.log('✅ Displaying profile in IIFE');
          displayProfileData(profile);
        }
        
        // Also ensure autofill button is enabled
        const autofillBtn = document.getElementById('autofillBtn') || document.getElementById('tailorBtn');
        if (autofillBtn && profile.email) {
          autofillBtn.disabled = false;
          autofillBtn.style.opacity = '1';
          autofillBtn.style.cursor = 'pointer';
          autofillBtn.style.pointerEvents = 'auto';
          console.log('✅ Autofill button enabled from IIFE');
        }
      }, 200);
    } else {
      console.error('❌ No profile returned from getProfileFromConfig');
    }
  } catch (err) {
    console.error('❌ Error loading profile immediately:', err);
  }
})();

// Test function to verify profile is working (run in console: await testProfile())
window.testProfile = async function() {
  console.log('🧪 Testing profile...');
  try {
    const profile = await getProfileFromConfig();
    console.log('Profile:', profile);
    console.log('Has email:', !!profile?.email);
    console.log('Has phone:', !!profile?.phone);
    console.log('Has location:', !!profile?.location);
    
    const profileData = await chrome.storage.local.get('profileData');
    console.log('Profile in storage:', profileData.profileData);
    
    const button = document.getElementById('autofillBtn') || document.getElementById('tailorBtn');
    console.log('Autofill button:', button);
    console.log('Button disabled:', button?.disabled);
    console.log('Button opacity:', button?.style.opacity);
    
    return { profile, inStorage: profileData.profileData, button: { disabled: button?.disabled, opacity: button?.style.opacity } };
  } catch (err) {
    console.error('Test error:', err);
    return { error: err.message };
  }
};

/**
 * Initialize tab switching
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    // Skip if listener already added
    if (button.hasAttribute('data-tab-listener')) {
      return;
    }
    
    button.setAttribute('data-tab-listener', 'true');
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const tabName = button.dataset.tab;
      if (!tabName) return;

      // Update buttons - query fresh to avoid stale references
      const allTabButtons = document.querySelectorAll('.tab-button');
      allTabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Save active tab to storage
      chrome.storage.local.set({ popupState: { activeTab: tabName } });

      // Update contents
      tabContents.forEach(content => content.classList.remove('active'));
      const targetTab = document.getElementById(`${tabName}-tab`);
      if (targetTab) {
        targetTab.classList.add('active');
      }
      
      // When switching to autofill tab, update button state
      if (tabName === 'autofill') {
        setTimeout(() => {
          updateAutofillButtonState();
        }, 100);
      }
    });
  });
}

/**
 * Initialize button handlers
 */
function initButtons() {
  // Close button
  document.getElementById('closeBtn')?.addEventListener('click', () => {
    window.close();
  });

  // Settings button
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Tailor/Autofill button is handled dynamically:
  // - showApplicationFormUI() sets up autofill button with event listener
  // - showJobDescriptionUI() sets up tailor button
  // No need to set up listener here as button state changes dynamically
}

/**
 * Check current tab to see if we're on a supported ATS site
 */
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) return;

    const url = tab.url.toLowerCase();
    const hostname = new URL(tab.url).hostname.toLowerCase();
    const isSupported = 
      hostname.includes('workday.com') ||
      hostname.includes('myworkdayjobs.com') ||
      hostname.includes('greenhouse.io') ||
      hostname.includes('lever.co') ||
      hostname.includes('jobs.lever.co');

    if (isSupported) {
      // Check if we're on job description page or application form page
      const isApplicationPage = url.includes('/apply') || url.includes('/application') || 
                                url.includes('applymanually') || url.includes('form');
      
      if (isApplicationPage) {
        // Show autofill button for application form
        showApplicationFormUI();
        // Update button state after a short delay to ensure DOM is ready
        setTimeout(() => {
          updateAutofillButtonState();
        }, 300);
      } else {
        // Show tailor button for job description page
        showJobDescriptionUI();
      }
    } else {
      // Show unsupported message
      showUnsupportedMessage();
    }

    // Message listener is set up globally at the top of the file
    // No need to set up here to avoid duplicate listeners

  } catch (error) {
    console.error('Error checking current tab:', error);
  }
}

/**
 * Show UI for job description page (tailor button)
 */
function showJobDescriptionUI() {
  const readySection = document.getElementById('autofill-ready');
  if (readySection) {
    let button = document.getElementById('autofillBtn') || document.getElementById('tailorBtn');
    if (button) {
      // Change back to tailorBtn if it was autofillBtn
      if (button.id === 'autofillBtn') {
        button.id = 'tailorBtn';
      }
      
      button.style.display = 'flex';
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      button.style.pointerEvents = 'auto';
      button.disabled = false;
      
      // Check if we're on Greenhouse - if so, trigger autofill instead of tailor
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const isGreenhouse = tabs[0]?.url && tabs[0].url.toLowerCase().includes('greenhouse.io');
        
        if (isGreenhouse) {
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span>Autofill</span>
          `;
        } else {
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Tailor Resume for This Job</span>
          `;
        }
        
        // Remove old listeners by cloning
        const newBtn = button.cloneNode(true);
        button.parentNode.replaceChild(newBtn, button);
        
        // Add new event listener
        newBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!newBtn.disabled) {
            if (isGreenhouse) {
              handleAutofillApplication();
            } else {
              handleTailorApplication();
            }
          }
        });
      });
    }
    
    // Update text based on site type
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const isGreenhouse = tabs[0]?.url && tabs[0].url.toLowerCase().includes('greenhouse.io');
      const h3 = readySection.querySelector('h3');
      const p = readySection.querySelector('p');
      
      if (isGreenhouse) {
        if (h3) h3.textContent = 'Ready to autofill?';
        if (p) p.textContent = 'Click below to automatically fill out this application form.';
      } else {
        if (h3) h3.textContent = 'Ready to tailor your resume?';
        if (p) p.textContent = 'We can customize your resume to match this job description.';
      }
    });
  }
  document.getElementById('autofill-ready').classList.remove('hidden');
}

/**
 * Show UI for application form page (autofill button)
 */
function showApplicationFormUI() {
  const readySection = document.getElementById('autofill-ready');
  if (readySection) {
    let button = document.getElementById('autofillBtn') || document.getElementById('tailorBtn');
    if (button) {
      // If it's still tailorBtn, change it to autofillBtn
      if (button.id === 'tailorBtn') {
        button.id = 'autofillBtn';
      }
      
      button.style.display = 'flex';
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <span>Autofill Application</span>
      `;
      
      // Remove old listeners by cloning
      const newBtn = button.cloneNode(true);
      button.parentNode.replaceChild(newBtn, button);
      button = newBtn;
      
      // Enable button by default (we have hardcoded profile)
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      button.style.pointerEvents = 'auto';
      button.title = 'Autofill Application';
      
      // Add new event listener
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!newBtn.disabled && newBtn.style.opacity !== '0.5') {
          handleAutofillApplication();
        }
      });
    }
    
    const h3 = readySection.querySelector('h3');
    const p = readySection.querySelector('p');
    if (h3) h3.textContent = 'Ready to autofill?';
    if (p) p.textContent = 'Click below to automatically fill out this application form.';
  }
  document.getElementById('autofill-ready').classList.remove('hidden');
  
  // Ensure button is enabled with hardcoded profile
  (async () => {
    try {
      const profile = await getProfileFromConfig();
      if (profile && (profile.email || profile.phone || profile.location)) {
        const button = document.getElementById('autofillBtn');
        if (button) {
          button.disabled = false;
          button.style.opacity = '1';
          button.style.cursor = 'pointer';
          button.style.pointerEvents = 'auto';
          button.title = 'Autofill Application';
          console.log('Autofill button enabled in showApplicationFormUI');
        }
      }
    } catch (err) {
      console.error('Error enabling button in showApplicationFormUI:', err);
    }
  })();
  
  // Check profile sync status and update button state (but don't disable if we have hardcoded profile)
  setTimeout(() => {
    updateAutofillButtonState();
  }, 150);
}

/**
 * Update autofill button state based on profile sync status
 */
async function updateAutofillButtonState() {
  try {
    // Only check button state if we're on the autofill tab and it's an application form page
    const autofillTab = document.getElementById('autofill-tab');
    if (!autofillTab || !autofillTab.classList.contains('active')) {
      return;
    }
    
    const button = document.getElementById('autofillBtn') || document.getElementById('tailorBtn');
    if (!button) {
      // Wait a bit and try again in case button hasn't loaded yet
      setTimeout(() => updateAutofillButtonState(), 200);
      return;
    }
    
    // Check if this is the autofill button
    const isAutofillButton = button.id === 'autofillBtn' || button.textContent.includes('Autofill');
    
    if (!isAutofillButton) {
      // This is not the autofill button, don't update
      return;
    }

    // Check if profile is available - try hardcoded profile first, then storage
    let profile = null;
    try {
      // First try hardcoded profile
      profile = await getProfileFromConfig();
      console.log('updateAutofillButtonState - got hardcoded profile:', profile);
      
      if (profile && (profile.email || profile.phone || profile.location)) {
        console.log('Hardcoded profile has required fields, enabling button');
        // Hardcoded profile has required fields - enable button
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.style.pointerEvents = 'auto';
        button.title = 'Autofill Application';
        
        const readySection = document.getElementById('autofill-ready');
        if (readySection) {
          const p = readySection.querySelector('p');
          if (p) {
            p.textContent = 'Click below to automatically fill out this application form.';
            p.style.color = '';
          }
        }
        
        // Also save to storage for autofill functionality
        chrome.runtime.sendMessage({
          type: 'SYNC_PROFILE',
          data: { profile }
        }, (response) => {
          if (response && response.success) {
            console.log('Profile saved to storage from updateAutofillButtonState');
          }
        });
        
        return; // Profile found, exit early
      } else {
        console.warn('Hardcoded profile missing required fields:', profile);
      }
    } catch (error) {
      console.error('Error getting hardcoded profile:', error);
    }

    // Fallback: check storage
    chrome.runtime.sendMessage({ type: 'REQUEST_PROFILE_DATA' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking profile:', chrome.runtime.lastError);
        // Still try to use hardcoded profile
        getProfileFromConfig().then(hardcodedProfile => {
          if (hardcodedProfile && (hardcodedProfile.email || hardcodedProfile.phone || hardcodedProfile.location)) {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
            button.title = 'Autofill Application';
          } else {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.style.pointerEvents = 'none';
            button.title = 'Please sync your profile first';
          }
        });
        return;
      }

      const profile = response?.success ? response.data : null;
      const hasProfile = profile && (profile.email || profile.phone || profile.location);

      if (!hasProfile) {
        // Try hardcoded profile as last resort
        getProfileFromConfig().then(hardcodedProfile => {
          if (hardcodedProfile && (hardcodedProfile.email || hardcodedProfile.phone || hardcodedProfile.location)) {
            // Enable button with hardcoded profile
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
            button.title = 'Autofill Application';
            
            const readySection = document.getElementById('autofill-ready');
            if (readySection) {
              const p = readySection.querySelector('p');
              if (p) {
                p.textContent = 'Click below to automatically fill out this application form.';
                p.style.color = '';
              }
            }
          } else {
            // No profile available - disable button
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.style.pointerEvents = 'none';
            button.title = 'Please sync your profile first';
            
            const readySection = document.getElementById('autofill-ready');
            if (readySection) {
              const p = readySection.querySelector('p');
              if (p) {
                p.innerHTML = 'Please sync your profile from the Profile tab first to enable autofill.';
                p.style.color = '#6b7280';
              }
            }
          }
        });
      } else {
        // Profile synced - enable button
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.style.pointerEvents = 'auto';
        button.title = 'Autofill Application';
        
        const readySection = document.getElementById('autofill-ready');
        if (readySection) {
          const p = readySection.querySelector('p');
          if (p && !p.innerHTML.includes('sync your profile')) {
            p.textContent = 'Click below to automatically fill out this application form.';
            p.style.color = '';
          }
        }
      }
    });
  } catch (error) {
    console.error('Error updating autofill button state:', error);
    // On error, try to enable with hardcoded profile
    try {
      const profile = await getProfileFromConfig();
      if (profile && (profile.email || profile.phone || profile.location)) {
        const button = document.getElementById('autofillBtn');
        if (button) {
          button.disabled = false;
          button.style.opacity = '1';
          button.style.cursor = 'pointer';
          button.style.pointerEvents = 'auto';
        }
      }
    } catch (e) {
      console.error('Error in error handler:', e);
    }
  }
}

/**
 * Handle forms detected message
 */
function handleFormsDetected(data) {
  console.log('Forms detected:', data);
  // You can update UI here to show detected form count
}

/**
 * Show unsupported site message
 */
function showUnsupportedMessage() {
  const readySection = document.getElementById('autofill-ready');
  if (readySection) {
    readySection.innerHTML = `
      <div class="status-icon" style="background: #f59e0b;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3>This site is not yet supported</h3>
      <p>Simplify Apply currently works on:</p>
      <ul style="text-align: left; margin: 16px 0; padding-left: 24px;">
        <li>Workday</li>
        <li>Greenhouse</li>
        <li>Lever</li>
      </ul>
      <p class="subtitle">We're working on adding support for more ATS platforms!</p>
    `;
  }
}

/**
 * Load profile data
 * @returns {Promise} Promise that resolves when profile is loaded
 */
async function loadProfileData() {
  console.log('loadProfileData called');
  
  // First, try to get hardcoded profile immediately
  try {
    const hardcodedProfile = await getProfileFromConfig();
    if (hardcodedProfile) {
      console.log('Got hardcoded profile:', hardcodedProfile);
      displayProfileData(hardcodedProfile);
      
      // Also try to save to storage in background
      try {
        chrome.runtime.sendMessage({
          type: 'SYNC_PROFILE',
          data: { profile: hardcodedProfile }
        }, (response) => {
          if (response && response.success) {
            console.log('Profile saved to storage');
          }
        });
      } catch (msgError) {
        console.warn('Could not save to storage:', msgError);
      }
      
      return hardcodedProfile;
    }
  } catch (error) {
    console.error('Error getting hardcoded profile:', error);
  }
  
  // Fallback: try to get from storage
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'REQUEST_PROFILE_DATA' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Chrome runtime error, using hardcoded:', chrome.runtime.lastError);
          getProfileFromConfig().then(profile => {
            if (profile) {
              displayProfileData(profile);
              resolve(profile);
            } else {
              showSyncProfileMessage();
              resolve(null);
            }
          });
          return;
        }
        
        if (response && response.success && response.data) {
          console.log('Profile data from storage:', response.data);
          displayProfileData(response.data);
          resolve(response.data);
        } else {
          console.warn('No profile in storage, using hardcoded');
          getProfileFromConfig().then(profile => {
            if (profile) {
              displayProfileData(profile);
              resolve(profile);
            } else {
              showSyncProfileMessage();
              resolve(null);
            }
          });
        }
      });
    } catch (error) {
      console.error('Error in loadProfileData:', error);
      getProfileFromConfig().then(profile => {
        if (profile) {
          displayProfileData(profile);
          resolve(profile);
        } else {
          showSyncProfileMessage();
          resolve(null);
        }
      });
    }
  });
}

/**
 * Sync profile from backend (uses profile-config.js)
 * Currently uses hardcoded profile, easily switchable to database
 */
async function syncProfile() {
  try {
    const button = document.querySelector('#syncProfileBtn') || 
                   document.querySelector('[data-sync-profile]');
    
    if (button) {
      button.disabled = true;
      const isIconButton = button.classList.contains('icon-button');
      
      if (isIconButton) {
        button.title = 'Syncing...';
        button.style.opacity = '0.5';
      } else {
        button.textContent = 'Syncing...';
      }
    }

    // Get profile from config (hardcoded or database based on PROFILE_CONFIG.source)
    const profile = await getProfileFromConfig();

    if (!profile) {
      throw new Error('No profile data available');
    }

    // Store profile in extension storage via background script
    chrome.runtime.sendMessage({
      type: 'SYNC_PROFILE',
      data: { profile }
    }, (response) => {
      // Reset button state
      if (button) {
        button.disabled = false;
        if (isIconButton) {
          button.style.opacity = '1';
          button.title = 'Sync from Dashboard';
        } else {
          button.textContent = 'Sync from Dashboard';
        }
      }

      if (response && response.success) {
        // Show success message
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #10b981;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 1000;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        toast.textContent = `Profile synced successfully! (${profile.source || 'hardcoded'})`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        // Reload profile data in UI
        loadProfileData();
      } else {
        throw new Error(response?.error || 'Failed to sync profile');
      }
    });

  } catch (error) {
    console.error('Error in syncProfile:', error);
    
    // Reset button state
    const button = document.querySelector('#syncProfileBtn') || 
                   document.querySelector('[data-sync-profile]');
    if (button) {
      button.disabled = false;
      if (button.classList.contains('icon-button')) {
        button.style.opacity = '1';
        button.title = 'Sync from Dashboard';
      } else {
        button.textContent = 'Sync from Dashboard';
      }
    }

    // Show error message
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ef4444;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    toast.textContent = `Failed to sync: ${error.message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

/**
 * Display profile data in UI
 */
function displayProfileData(profile) {
  console.log('Displaying profile data:', profile); // Debug log
  
  if (!profile) {
    console.warn('No profile data to display');
    showSyncProfileMessage();
    return;
  }

  const profileFieldsContainer = document.getElementById('profile-fields');
  if (!profileFieldsContainer) {
    console.warn('Profile fields container not found');
    return;
  }

  // Update avatar and name
  const avatar = document.querySelector('.avatar-large');
  const nameEl = document.querySelector('.profile-name');
  
  if (avatar) {
    const initials = (profile.firstName && profile.lastName)
      ? (profile.firstName[0] + profile.lastName[0]).toUpperCase()
      : (profile.firstName ? profile.firstName[0] : 'U').toUpperCase();
    avatar.textContent = initials;
  }
  
  if (nameEl) {
    const fullName = (profile.firstName && profile.lastName)
      ? `${profile.firstName} ${profile.lastName}`
      : profile.name || profile.firstName || 'User';
    nameEl.textContent = fullName;
  }

  // Build fields HTML - only include fields that have values
  let fieldsHTML = '';
  
  // Source indicator
  const sourceLabel = profile.source === 'database' ? '🔗 From Database' : 
                      profile.source === 'fallback' ? '⚠️ Demo Profile' : '📋 Local Profile';
  fieldsHTML += `
    <div style="font-size: 11px; color: #6b7280; margin-bottom: 12px; padding: 4px 8px; background: #f3f4f6; border-radius: 4px; display: inline-block;">
      ${sourceLabel}
    </div>
  `;
  
  // Location
  if (profile.location) {
    const locationEscaped = profile.location.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    fieldsHTML += `
      <div class="profile-field copyable-field" data-copy-value="${locationEscaped}">
        <p class="profile-field-label">Location</p>
        <p class="profile-field-value">${profile.location}</p>
      </div>
    `;
  }
  
  // Email
  if (profile.email) {
    const emailEscaped = profile.email.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    fieldsHTML += `
      <div class="profile-field copyable-field" data-copy-value="${emailEscaped}">
        <p class="profile-field-label">Email</p>
        <p class="profile-field-value">${profile.email}</p>
      </div>
    `;
  }
  
  // Phone
  if (profile.phone) {
    const phoneEscaped = profile.phone.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    fieldsHTML += `
      <div class="profile-field copyable-field" data-copy-value="${phoneEscaped}">
        <p class="profile-field-label">Phone</p>
        <p class="profile-field-value">${profile.phone}</p>
      </div>
    `;
  }
  
  // LinkedIn
  if (profile.linkedIn) {
    fieldsHTML += `
      <div class="profile-field copyable-field" data-copy-value="${profile.linkedIn}">
        <p class="profile-field-label">LinkedIn</p>
        <p class="profile-field-value" style="color: #0077b5;">${profile.linkedIn}</p>
      </div>
    `;
  }

  // Work Authorization
  if (profile.workAuthorization) {
    const authStatus = profile.workAuthorization.authorizedToWork ? '✓ Authorized to work' : '✗ Not authorized';
    const sponsorStatus = profile.workAuthorization.requiresSponsorship ? 'Requires sponsorship' : 'No sponsorship needed';
    fieldsHTML += `
      <div class="profile-field" style="background: ${profile.workAuthorization.authorizedToWork ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; padding: 8px;">
        <p class="profile-field-label">Work Authorization</p>
        <p class="profile-field-value" style="font-size: 13px;">${authStatus}</p>
        <p class="profile-field-label" style="font-size: 11px;">${sponsorStatus}</p>
      </div>
    `;
  }

  // If no basic fields, show message
  if (!profile.email && !profile.phone && !profile.location) {
    fieldsHTML += '<p style="color: #6b7280; font-size: 14px; margin: 16px 0;">No profile information available. Please complete your profile in the dashboard.</p>';
  }

  // Add skills section
  if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) {
    const skillsHTML = profile.skills.map(skill => 
      `<span style="display: inline-block; padding: 4px 10px; margin: 2px; background: #e0e7ff; color: #3730a3; border-radius: 12px; font-size: 12px;">${skill}</span>`
    ).join('');
    
    fieldsHTML += `
      <h4 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin-top: 16px; margin-bottom: 8px;">Skills</h4>
      <div style="margin-bottom: 12px;">${skillsHTML}</div>
    `;
  }

  // Add education section
  if (profile.education && Array.isArray(profile.education) && profile.education.length > 0) {
    const educationHTML = profile.education.map(edu => {
      const school = edu.school || edu.name || '';
      const degree = edu.degree || '';
      const field = edu.field || edu.fieldOfStudy || '';
      const years = edu.years || edu.duration || '';
      const gpa = edu.gpa || '';
      const eduJson = JSON.stringify(edu).replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `
        <div class="profile-field copyable-field" data-copy-value="${eduJson}">
          <p class="profile-field-value">${school}</p>
          <p class="profile-field-label">${degree}${field ? ` in ${field}` : ''}</p>
          ${years ? `<p class="profile-field-label" style="font-size: 11px;">${years}</p>` : ''}
          ${gpa ? `<p class="profile-field-label" style="font-size: 11px;">GPA: ${gpa}</p>` : ''}
        </div>
      `;
    }).join('');
    
    fieldsHTML += `
      <h4 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin-top: 16px; margin-bottom: 12px;">Education</h4>
      ${educationHTML}
    `;
  }

  // Add experience section
  if (profile.experience && Array.isArray(profile.experience) && profile.experience.length > 0) {
    const experienceHTML = profile.experience.map(exp => {
      const title = exp.title || exp.position || '';
      const company = exp.company || exp.employer || '';
      const location = exp.location || '';
      const duration = exp.duration || exp.period || '';
      const expJson = JSON.stringify(exp).replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `
        <div class="profile-field copyable-field" data-copy-value="${expJson}">
          <p class="profile-field-value">${title}</p>
          <p class="profile-field-label">${company}${location ? ` • ${location}` : ''}</p>
          ${duration ? `<p class="profile-field-label" style="font-size: 11px;">${duration}</p>` : ''}
        </div>
      `;
    }).join('');
    
    fieldsHTML += `
      <h4 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin-top: 16px; margin-bottom: 12px;">Experience</h4>
      ${experienceHTML}
    `;
  }

  // Add job preferences section
  if ((profile.preferredTitles && profile.preferredTitles.length > 0) || 
      (profile.preferredLocations && profile.preferredLocations.length > 0) ||
      profile.availability) {
    fieldsHTML += `<h4 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin-top: 16px; margin-bottom: 8px;">Job Preferences</h4>`;
    
    if (profile.preferredTitles && profile.preferredTitles.length > 0) {
      const titlesHTML = profile.preferredTitles.map(t => 
        `<span style="display: inline-block; padding: 3px 8px; margin: 2px; background: #dbeafe; color: #1e40af; border-radius: 8px; font-size: 11px;">${t}</span>`
      ).join('');
      fieldsHTML += `<div style="margin-bottom: 8px;"><span style="font-size: 11px; color: #6b7280;">Roles: </span>${titlesHTML}</div>`;
    }
    
    if (profile.preferredLocations && profile.preferredLocations.length > 0) {
      const locsHTML = profile.preferredLocations.map(l => 
        `<span style="display: inline-block; padding: 3px 8px; margin: 2px; background: #f3f4f6; color: #374151; border-radius: 8px; font-size: 11px;">${l}</span>`
      ).join('');
      fieldsHTML += `<div style="margin-bottom: 8px;"><span style="font-size: 11px; color: #6b7280;">Locations: </span>${locsHTML}</div>`;
    }
    
    if (profile.availability) {
      fieldsHTML += `<div style="font-size: 12px; color: #374151;">Availability: ${profile.availability}</div>`;
    }
  }

  // Add resume status
  if (profile.resume || profile.resumeText) {
    fieldsHTML += `
      <div style="margin-top: 16px; padding: 12px; background: #f0f9ff; border-radius: 8px;">
        <p style="font-size: 14px; color: #0369a1; margin: 0;">
          ✓ Resume available
        </p>
      </div>
    `;
  } else if (!profile.authenticated || profile.source === 'fallback') {
    fieldsHTML += `
      <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px;">
        <p style="font-size: 13px; color: #92400e; margin: 0 0 8px 0;">
          💡 ${profile.source === 'fallback' ? 'Not logged in.' : 'Using demo profile.'} Log in to sync your profile.
        </p>
        <button class="secondary-button" id="loginToSyncBtn" style="width: 100%; margin-top: 8px; font-size: 12px;">
          Log In to Dashboard
        </button>
      </div>
    `;
  }

  profileFieldsContainer.innerHTML = fieldsHTML;
  
  // Add event delegation for copyable fields
  const profileFields = profileFieldsContainer.querySelectorAll('.copyable-field');
  profileFields.forEach(field => {
    field.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const copyValue = field.getAttribute('data-copy-value');
      if (copyValue) {
        // Unescape HTML entities
        const unescapedValue = copyValue
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&');
        copyToClipboard(unescapedValue);
        
        // Show visual feedback
        const originalText = field.querySelector('.profile-field-value')?.textContent || '';
        if (field.querySelector('.profile-field-value')) {
          const valueEl = field.querySelector('.profile-field-value');
          const originalText = valueEl.textContent;
          valueEl.textContent = 'Copied!';
          valueEl.style.color = '#10b981';
          setTimeout(() => {
            valueEl.textContent = originalText;
            valueEl.style.color = '';
          }, 1000);
        }
      }
    });
  });
  
  // Add event listener for login button if it exists
  setTimeout(() => {
    const loginBtn = document.getElementById('loginToSyncBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Open force login page - popup will close (Chrome behavior)
        chrome.tabs.create({ url: 'http://localhost:3000/force-login' }).catch(err => {
          console.error('Error opening login page:', err);
          // Fallback: try to update current tab
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.update(tabs[0].id, { url: 'http://localhost:3000/force-login' });
            }
          });
        });
      });
    }
  }, 100);
}

/**
 * Show sync profile message
 */
function showSyncProfileMessage() {
  const profileFieldsContainer = document.getElementById('profile-fields');
  if (profileFieldsContainer) {
    profileFieldsContainer.innerHTML = `
      <div class="instruction-banner">
        <p>Your profile is not synced yet. Log in or create an account to sync your profile from the dashboard.</p>
        <button class="primary-button" style="margin-top: 12px; width: 100%;" id="loginBtn">
          Log In
        </button>
        <button class="secondary-button" style="margin-top: 8px; width: 100%;" id="registerBtn">
          Create Account
        </button>
        <button class="secondary-button" style="margin-top: 8px; width: 100%;" id="syncProfileBtnInline">
          Sync (Use Demo Profile)
        </button>
      </div>
    `;
    
    // Add event listeners to the dynamically created buttons
    setTimeout(() => {
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
          e.preventDefault();
          // Open force login page - popup will close (Chrome behavior)
          chrome.tabs.create({ url: 'http://localhost:3000/force-login' });
        });
      }
      
      const registerBtn = document.getElementById('registerBtn');
      if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
          e.preventDefault();
          // Open in new tab - popup will close (Chrome behavior)
          chrome.tabs.create({ url: 'http://localhost:3000/signup' });
        });
      }
      
      const syncBtn = document.getElementById('syncProfileBtnInline');
      if (syncBtn) {
        syncBtn.addEventListener('click', syncProfile);
      }
    }, 0);
  }
}

/**
 * Handle tailor application (for job description pages)
 */
async function handleTailorApplication() {
  try {
    const button = document.getElementById('tailorBtn');
    if (!button) return;

    button.disabled = true;
    button.innerHTML = `
      <div style="width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span>Tailoring Resume...</span>
    `;

    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs.length > 0 ? tabs[0] : null;
    
    if (!tab || !tab.id || typeof tab.id !== 'number') {
      throw new Error('No active tab found or invalid tab ID');
    }

    console.log('Extracting job description from tab:', tab.id, tab.url);

    // Extract job description from page
    const jobInfo = await extractJobDescription(tab.id);
    
    if (!jobInfo || !jobInfo.jobDescription) {
      throw new Error('Unable to extract job description from this page');
    }

    // Request resume tailoring from background
    chrome.runtime.sendMessage({
      type: 'TAILOR_RESUME',
      data: {
        jobDescription: jobInfo.jobDescription,
        jobTitle: jobInfo.jobTitle || 'Position',
        companyName: jobInfo.companyName || 'Company',
      },
    }, (response) => {
      button.disabled = false;
      if (response && response.success) {
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Resume Tailored!</span>
        `;
        button.style.background = '#10b981';
        
        // Show success message
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #10b981;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 1000;
        `;
        toast.textContent = 'Resume tailored successfully! It will be used when you autofill.';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      } else {
        throw new Error(response?.error || 'Failed to tailor resume');
      }
    });

  } catch (error) {
    console.error('Error tailoring application:', error);
    alert(`Failed to tailor resume: ${error.message}\n\nMake sure:\n1. You have a resume uploaded in your profile\n2. The dashboard is running\n3. You are logged in`);
    
    const button = document.getElementById('tailorBtn');
    if (button) {
      button.disabled = false;
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>Tailor Resume for This Job</span>
      `;
    }
  }
}

/**
 * Handle autofill application (for application form pages)
 */
async function handleAutofillApplication() {
  try {
    const button = document.getElementById('autofillBtn') || document.getElementById('tailorBtn');
    if (!button) return;

    button.disabled = true;
    button.innerHTML = `
      <div style="width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span>Filling Form...</span>
    `;

    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs.length > 0 ? tabs[0] : null;
    
    if (!tab || !tab.id || typeof tab.id !== 'number') {
      throw new Error('No active tab found or invalid tab ID');
    }

    console.log('Requesting autofill for tab:', tab.id, tab.url);

    // Request autofill from background script
    chrome.runtime.sendMessage({
      type: 'AUTOFILL_REQUEST',
      data: {
        tabId: tab.id,
        tailorRequest: false, // Just autofill, don't tailor
      },
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message to background:', chrome.runtime.lastError);
        button.disabled = false;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
          </svg>
          <span>Autofill Application</span>
        `;
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #ef4444;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 1000;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        toast.textContent = `Error: ${chrome.runtime.lastError.message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
        return;
      }
      
      button.disabled = false;
      console.log('Autofill response:', response);
      
      if (response && response.success) {
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Form Filled!</span>
        `;
        button.style.background = '#10b981';
        
        // Show success message
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #10b981;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 1000;
        `;
        toast.textContent = 'Application form filled successfully!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      } else {
        const errorMsg = response?.error || 'Failed to autofill';
        console.error('Autofill failed:', errorMsg);
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
          </svg>
          <span>Autofill Application</span>
        `;
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #ef4444;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 1000;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        toast.textContent = `Autofill failed: ${errorMsg}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      }
    });

  } catch (error) {
    console.error('Error autofilling application:', error);
    // Show toast instead of alert
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ef4444;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    toast.textContent = `Failed to autofill: ${error.message}. Please ensure your profile is synced.`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
    
    const button = document.getElementById('autofillBtn') || document.getElementById('tailorBtn');
    if (button) {
      button.disabled = false;
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <span>Autofill Application</span>
      `;
    }
  }
}

/**
 * Extract job description from current page
 */
async function extractJobDescription(tabId) {
  try {
    if (!tabId || typeof tabId !== 'number') {
      console.warn('Invalid tabId for extractJobDescription:', tabId);
      return { jobDescription: '', jobTitle: '', companyName: '' };
    }
    
    // Verify tab exists and is accessible
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab || !tab.url) {
        console.warn('Tab not accessible:', tabId);
        return { jobDescription: '', jobTitle: '', companyName: '' };
      }
    } catch (tabError) {
      console.error('Error getting tab:', tabError);
      return { jobDescription: '', jobTitle: '', companyName: '' };
    }
    
    const results = await new Promise((resolve, reject) => {
      try {
        chrome.tabs.sendMessage(tabId, {
          type: 'EXTRACT_JOB_DESCRIPTION',
        }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script might not be loaded, that's okay
            console.warn('Could not send message to content script:', chrome.runtime.lastError.message);
            resolve({ jobDescription: '', jobTitle: '', companyName: '' });
          } else {
            resolve(response || { jobDescription: '', jobTitle: '', companyName: '' });
          }
        });
      } catch (sendError) {
        console.error('Error in sendMessage:', sendError);
        resolve({ jobDescription: '', jobTitle: '', companyName: '' });
      }
    });
    
    return results || { jobDescription: '', jobTitle: '', companyName: '' };
  } catch (error) {
    console.error('Error extracting job description:', error);
    return { jobDescription: '', jobTitle: '', companyName: '' };
  }
}

// Demo functions removed - extension now uses actual autofill functionality

/**
 * Copy to clipboard
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show feedback
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000;
    `;
    toast.textContent = 'Copied to clipboard!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  });
}

/**
 * Open dashboard
 */
async function openDashboard() {
  try {
    await chrome.tabs.create({ url: 'http://localhost:3000' });
  } catch (error) {
    console.error('Error opening dashboard:', error);
    // Fallback: try opening in current tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        await chrome.tabs.update(tab.id, { url: 'http://localhost:3000' });
      }
    } catch (e) {
      // Show toast instead of alert
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f59e0b;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
      `;
      toast.textContent = 'Unable to open dashboard. Please visit http://localhost:3000 manually.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    }
  }
}

/**
 * View resume functionality
 */
async function viewResume() {
  try {
    // Get profile data
    const profileResponse = await chrome.runtime.sendMessage({ type: 'REQUEST_PROFILE_DATA' });
    const profile = profileResponse?.data;

    if (!profile || !profile.resume) {
      alert('No resume found. Please upload a resume in your profile first.');
      return;
    }

    // If resume is a file URL or blob, open it
    if (profile.resume instanceof File || profile.resume instanceof Blob) {
      const url = URL.createObjectURL(profile.resume);
      chrome.tabs.create({ url: url });
    } else if (typeof profile.resume === 'string') {
      // If it's a URL or base64, open it
      chrome.tabs.create({ url: profile.resume });
    } else if (profile.resumeText) {
      // If only text is available, show in new tab with formatted display
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Resume - ${profile.firstName || 'User'}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
              pre { white-space: pre-wrap; background: #f5f5f5; padding: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <h1>Resume</h1>
            <pre>${profile.resumeText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          </body>
        </html>
      `;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      chrome.tabs.create({ url: url });
    } else {
      alert('Resume not available in viewable format.');
    }
  } catch (error) {
    console.error('Error viewing resume:', error);
    alert('Failed to view resume. Please try again.');
  }
}


// Assign functions to window for inline onclick handlers in HTML
// These must be assigned after functions are defined
window.copyToClipboard = copyToClipboard;
window.openDashboard = openDashboard;
window.syncProfile = syncProfile;
window.viewResume = viewResume;

// Helper function to open login page (force login for syncing)
window.openLoginPage = function() {
  // Open force login page - popup will close (Chrome behavior)
  chrome.tabs.create({ url: 'http://localhost:3000/force-login' });
};

