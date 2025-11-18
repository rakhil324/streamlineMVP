// Popup script for Chrome extension

document.addEventListener('DOMContentLoaded', () => {
  const testBtn = document.getElementById('testBtn');
  const statusDiv = document.getElementById('status');
  
  // Test connection and fetch profile
  testBtn.addEventListener('click', () => {
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    showStatus('Testing connection...', 'info');
    
    chrome.runtime.sendMessage(
      { action: 'fetchProfile' },
      (response) => {
        testBtn.disabled = false;
        testBtn.textContent = 'Test Connection';
        
        if (response.success) {
          const profile = response.profile;
          showStatus(`Connected! Found profile for ${profile.fullName || profile.email}`, 'success');
        } else {
          showStatus('Error: ' + response.error, 'error');
        }
      }
    );
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 5000);
  }
});

