// Popup script for Chrome extension

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update active tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${targetTab}-tab`) {
          content.classList.add('active');
        }
      });
    });
  });

  // Autofill button
  const autofillBtn = document.getElementById('autofillBtn');
  if (autofillBtn) {
    autofillBtn.addEventListener('click', async () => {
      // Disable button and show loading state
      autofillBtn.disabled = true;
      const originalText = autofillBtn.querySelector('span').textContent;
      autofillBtn.querySelector('span').textContent = 'Filling...';
      
      try {
        // Get the active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          throw new Error('No active tab found');
        }
        
        // Send message to content script to trigger autofill
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'autofill' });
        
        if (response && response.success) {
          console.log('Autofill triggered successfully');
          // Show success feedback
          autofillBtn.querySelector('span').textContent = 'Filled!';
          setTimeout(() => {
            autofillBtn.querySelector('span').textContent = originalText;
            autofillBtn.disabled = false;
          }, 2000);
        } else {
          throw new Error(response?.error || 'Failed to autofill');
        }
      } catch (error) {
        console.error('Autofill error:', error);
        autofillBtn.querySelector('span').textContent = 'Error - Try Again';
        setTimeout(() => {
          autofillBtn.querySelector('span').textContent = originalText;
          autofillBtn.disabled = false;
        }, 2000);
      }
    });
  }

  // Close button
  const closeBtn = document.getElementById('closeBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.close();
    });
  }

  // Settings button
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      // Open settings page or dashboard
      chrome.runtime.openOptionsPage();
    });
  }

  // Profile field copying
  const profileFields = document.querySelectorAll('.profile-field');
  profileFields.forEach(field => {
    field.addEventListener('click', () => {
      const fieldValue = field.querySelector('.field-value');
      if (fieldValue) {
        const textToCopy = fieldValue.textContent.trim();
        navigator.clipboard.writeText(textToCopy).then(() => {
          // Visual feedback
          const originalBg = field.style.backgroundColor;
          field.style.backgroundColor = '#d1fae5';
          setTimeout(() => {
            field.style.backgroundColor = originalBg;
          }, 500);
        }).catch(err => {
          console.error('Failed to copy:', err);
        });
      }
    });
  });

  // Sync profile button
  const syncProfileBtn = document.getElementById('syncProfileBtn');
  if (syncProfileBtn) {
    syncProfileBtn.addEventListener('click', async () => {
      // Show loading state
      syncProfileBtn.disabled = true;
      const originalTitle = syncProfileBtn.title;
      syncProfileBtn.title = 'Syncing...';
      
      try {
        // Fetch profile from API
        await loadProfileData();
        syncProfileBtn.title = 'Synced!';
        setTimeout(() => {
          syncProfileBtn.title = originalTitle;
          syncProfileBtn.disabled = false;
        }, 2000);
      } catch (error) {
        console.error('Error syncing profile:', error);
        syncProfileBtn.title = 'Error - Try Again';
        setTimeout(() => {
          syncProfileBtn.title = originalTitle;
          syncProfileBtn.disabled = false;
        }, 2000);
      }
    });
  }

  // Open dashboard button
  const openDashboardBtn = document.getElementById('openDashboardBtn');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000' });
    });
  }

  // Action cards
  const actionCards = document.querySelectorAll('.action-card');
  actionCards.forEach(card => {
    card.addEventListener('click', () => {
      const cardText = card.querySelector('p').textContent;
      if (cardText.includes('matches')) {
        chrome.tabs.create({ url: 'http://localhost:3000/matches' });
      } else if (cardText.includes('jobs')) {
        chrome.tabs.create({ url: 'http://localhost:3000/jobs' });
      }
    });
  });

  // Load profile data on startup
  loadProfileData();
});

async function loadProfileData() {
  try {
    // Try to fetch profile from API via background script
    const response = await chrome.runtime.sendMessage({ action: 'fetchProfile' });
    
    if (response && response.success && response.profile) {
      const profile = response.profile;
      
      // Extract name and initials
      const fullName = profile.fullName || profile.name || '';
      const initials = fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'U';
      
      // Update profile fields with fetched data
      updateProfileFields({
        name: fullName,
        initials: initials,
        location: profile.location || '',
        email: profile.email || '',
        phone: profile.phone || '',
        education: profile.education?.school || profile.education || ''
      });
      
      // Cache the profile
      chrome.storage.local.set({ profile: response.profile });
    } else {
      // Fallback to cached or default data
      chrome.storage.local.get(['profile'], (result) => {
        if (result.profile) {
          const profile = result.profile;
          const fullName = profile.fullName || profile.name || 'User';
          const initials = fullName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2) || 'U';
          
          updateProfileFields({
            name: fullName,
            initials: initials,
            location: profile.location || '',
            email: profile.email || '',
            phone: profile.phone || '',
            education: profile.education?.school || profile.education || ''
          });
        } else {
          // Set default profile data as last resort
          const defaultProfile = {
            name: 'User',
            initials: 'U',
            location: '',
            email: '',
            phone: '',
            education: ''
          };
          updateProfileFields(defaultProfile);
        }
      });
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    // Fallback to cached data
    chrome.storage.local.get(['profile'], (result) => {
      if (result.profile) {
        const profile = result.profile;
        const fullName = profile.fullName || profile.name || 'User';
        const initials = fullName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2) || 'U';
        
        updateProfileFields({
          name: fullName,
          initials: initials,
          location: profile.location || '',
          email: profile.email || '',
          phone: profile.phone || '',
          education: profile.education?.school || profile.education || ''
        });
      }
    });
  }
}

function updateProfileFields(profile) {
  // Update avatar
  const avatar = document.querySelector('.avatar-large');
  if (avatar && profile.initials) {
    avatar.textContent = profile.initials;
  }

  // Update name
  const nameElement = document.querySelector('.profile-name');
  if (nameElement && profile.name) {
    nameElement.textContent = profile.name;
  }

  // Update fields
  const fields = {
    'Location': profile.location,
    'Email': profile.email,
    'Phone': profile.phone,
    'Education': profile.education
  };

  document.querySelectorAll('.profile-field').forEach(field => {
    const label = field.querySelector('.field-label').textContent;
    const valueElement = field.querySelector('.field-value');
    if (fields[label] && valueElement) {
      valueElement.textContent = fields[label];
    }
  });
}

