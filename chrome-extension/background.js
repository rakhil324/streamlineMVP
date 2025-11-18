// Background service worker for Chrome extension

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchProfile') {
    fetchProfileData()
      .then(profile => sendResponse({ success: true, profile }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'fetchResumeFile') {
    fetchResumeFile()
      .then(file => {
        // Convert File to transferable format
        file.arrayBuffer().then(buffer => {
          sendResponse({ 
            success: true, 
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            buffer: Array.from(new Uint8Array(buffer))
          });
        });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'fetchCoverLetterFile') {
    fetchCoverLetterFile()
      .then(file => {
        // Convert File to transferable format
        file.arrayBuffer().then(buffer => {
          sendResponse({ 
            success: true, 
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            buffer: Array.from(new Uint8Array(buffer))
          });
        });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'fetchResumeData') {
    fetchResumeData()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'fetchCoverLetterData') {
    fetchCoverLetterData()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'tailorResume') {
    tailorResume(request.resumeData, request.jobInfo)
      .then(result => sendResponse({ success: true, pdf: result.pdf }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'tailorCoverLetter') {
    tailorCoverLetter(request.resumeData, request.coverLetterData, request.jobInfo)
      .then(result => sendResponse({ success: true, pdf: result.pdf }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'generateAnswer') {
    generateAnswer(request.question, request.jobDescription, request.jobTitle, request.companyName)
      .then(answer => sendResponse({ success: true, answer }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Fetch resume file from API
async function fetchResumeFile() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }
    
    const response = await fetch('http://localhost:3000/api/user/documents/resume/file', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in to the web app at http://localhost:3000 first.');
      } else if (response.status === 404) {
        throw new Error('No resume found in your profile. Please upload a resume first.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch resume file');
    }
    
    const blob = await response.blob();
    const fileName = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'resume.txt';
    
    // Create a File object from the blob
    const file = new File([blob], fileName, { type: blob.type || 'text/plain' });
    
    return file;
  } catch (error) {
    console.error('Error fetching resume file:', error);
    throw error;
  }
}

// Fetch cover letter file from API
async function fetchCoverLetterFile() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }
    
    const response = await fetch('http://localhost:3000/api/user/documents/cover-letter/file', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in to the web app at http://localhost:3000 first.');
      } else if (response.status === 404) {
        throw new Error('No cover letter found in your profile. Please upload a cover letter first.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch cover letter file');
    }
    
    const blob = await response.blob();
    const fileName = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'cover-letter.txt';
    
    // Create a File object from the blob
    const file = new File([blob], fileName, { type: blob.type || 'text/plain' });
    
    return file;
  } catch (error) {
    console.error('Error fetching cover letter file:', error);
    throw error;
  }
}

// Fetch resume data (full data needed for tailoring)
async function fetchResumeData() {
  try {
    const response = await fetch('http://localhost:3000/api/user/documents?full=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in to the web app at http://localhost:3000 first.');
      } else if (response.status === 404) {
        throw new Error('No resume found in your profile.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch resume data');
    }
    
    const data = await response.json();
    return data.resume;
  } catch (error) {
    console.error('Error fetching resume data:', error);
    throw error;
  }
}

// Fetch cover letter data (full data needed for tailoring)
async function fetchCoverLetterData() {
  try {
    const response = await fetch('http://localhost:3000/api/user/documents?full=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in to the web app at http://localhost:3000 first.');
      } else if (response.status === 404) {
        throw new Error('No cover letter found in your profile.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch cover letter data');
    }
    
    const data = await response.json();
    return data.coverLetter;
  } catch (error) {
    console.error('Error fetching cover letter data:', error);
    throw error;
  }
}

// Tailor resume using API
async function tailorResume(resumeData, jobInfo) {
  try {
    const response = await fetch('http://localhost:3000/api/tailor/resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        sanitizedResume: resumeData.sanitizedText,
        jobDescription: jobInfo.jobDescription,
        jobTitle: jobInfo.jobTitle || 'Position',
        companyName: jobInfo.companyName || 'Company',
        encryptedOriginal: resumeData.encryptedOriginal,
        encryptionKey: resumeData.encryptionKey,
        removedData: resumeData.removedData,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to tailor resume');
    }
    
    const data = await response.json();
    return { pdf: data.pdf };
  } catch (error) {
    console.error('Error tailoring resume:', error);
    throw error;
  }
}

// Tailor cover letter using API
async function tailorCoverLetter(resumeData, coverLetterData, jobInfo) {
  try {
    const response = await fetch('http://localhost:3000/api/tailor/cover-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        sanitizedResume: resumeData.sanitizedText,
        jobDescription: jobInfo.jobDescription,
        jobTitle: jobInfo.jobTitle || 'Position',
        companyName: jobInfo.companyName || 'Company',
        coverLetterTemplate: coverLetterData.content,
        encryptedOriginal: resumeData.encryptedOriginal,
        encryptionKey: resumeData.encryptionKey,
        removedData: resumeData.removedData,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to tailor cover letter');
    }
    
    const data = await response.json();
    return { pdf: data.pdf };
  } catch (error) {
    console.error('Error tailoring cover letter:', error);
    throw error;
  }
}

// Generate answer for application question
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

// Fetch profile data from API
async function fetchProfileData() {
  try {
    // Check if we have cached data (less than 1 hour old)
    const result = await chrome.storage.local.get(['profileData', 'profileDataTimestamp']);
    
    if (result.profileData && result.profileDataTimestamp) {
      const cacheAge = Date.now() - result.profileDataTimestamp;
      if (cacheAge < 3600000) { // 1 hour
        return result.profileData;
      }
    }
    
    // Get the active tab to access cookies
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }
    
    // Fetch from API - use cookies from the extension's context
    // Note: In production, you'd need to handle CORS and cookie sharing properly
    const response = await fetch('http://localhost:3000/api/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in to the web app at http://localhost:3000 first.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch profile data');
    }
    
    const data = await response.json();
    
    // Cache the profile data
    await chrome.storage.local.set({
      profileData: data.profile,
      profileDataTimestamp: Date.now(),
    });
    
    return data.profile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}

